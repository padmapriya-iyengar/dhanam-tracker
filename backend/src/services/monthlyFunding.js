const Expense = require('../models/Expense');
const ExpenseRecovery = require('../models/ExpenseRecovery');
const Income = require('../models/Income');
const Transfer = require('../models/Transfer');
const CreditCard = require('../models/CreditCard');
const Subscription = require('../models/Subscription');
const { allocateOpenCycleEvents } = require('./cardPaymentAllocation');
require('../models/Member');

const amount = (rows) => rows.reduce((total, row) => total + Number(row.amount || 0), 0);
const outstandingCardDue = (rows) => rows.reduce((total, row) => total + Number(row.remaining || 0), 0);
const paymentsForStatement = (rows, cardId, cycleEnd, through) => amount(rows.filter((row) => {
  const paidAt = new Date(row.date);
  return String(row.toCreditCardId) === String(cardId) && paidAt > cycleEnd && paidAt <= through;
}));
const paymentsForEstimatedStatement = (rows, cardId, cycleStart, through) => amount(rows.filter((row) => {
  const paidAt = new Date(row.date);
  return String(row.toCreditCardId) === String(cardId) && paidAt >= cycleStart && paidAt <= through;
}));
const allocatePaymentsToStatements = (statements, payments, cutoff) => {
  const rows = statements.map((row) => ({ ...row }));
  payments
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((payment) => {
      const paidAt = new Date(payment.date);
      const target = rows.find((row) => row.remaining > 0
        && paidAt <= cutoff
        && paidAt >= row.cycleStart
        && paidAt <= row.dueDate);
      if (!target) return;
      target.paid += Number(payment.amount || 0);
      target.remaining = Math.max(target.amount - target.paid, 0);
    });
  return rows;
};
const sameStatementCycle = (row, cycleStart, cycleEnd) => (
  Math.abs(new Date(row.cycleStart).getTime() - cycleStart.getTime()) < 60_000
  && Math.abs(new Date(row.cycleEnd).getTime() - cycleEnd.getTime()) < 60_000
);
const isCycleClosed = (cycleEnd, cutoff) => cycleEnd <= cutoff;
const projectedCardBill = (purchases, paid) => Math.max(Number(purchases || 0) - Number(paid || 0), 0);
const debitItemsForMethods = (expenses, recoveries, methods) => {
  const recoveryByExpense = recoveries.reduce((map, row) => {
    const key = String(row.expenseId);
    map.set(key, (map.get(key) || 0) + Number(row.amount || 0));
    return map;
  }, new Map());
  return expenses.filter((row) => methods.includes(row.paymentMethod)).map((row) => ({
    id: `expense-${row._id}`,
    expenseId: row._id,
    description: row.description || 'Expense',
    date: row.date,
    member: row.memberId?.name || '',
    account: row.savingsAccountId?.name || '',
    grossAmount: Number(row.amount || 0),
    recoveries: recoveryByExpense.get(String(row._id)) || 0,
    amount: Math.max(Number(row.amount || 0) - (recoveryByExpense.get(String(row._id)) || 0), 0),
  }));
};
const cardPaymentDebitItems = (transfers, accountType) => transfers
  .filter((row) => row.fromAccountType === accountType)
  .map((row) => ({
    id: `card-payment-${row._id}`,
    transferId: row._id,
    description: row.description || `Payment to ${row.toCreditCardId?.name || 'credit card'}`,
    date: row.date,
    member: row.fromMemberId?.name || '',
    account: row.fromSavingsAccountId?.name || '',
    card: row.toCreditCardId?.name || '',
    grossAmount: Number(row.amount || 0),
    recoveries: 0,
    amount: Number(row.amount || 0),
    type: 'card_payment',
  }));
const transferAccountName = (row, side) => {
  const type = row[`${side}AccountType`];
  if (type === 'current') return row[`${side}MemberId`]?.name || 'Account';
  if (type === 'savings') return row[`${side}SavingsAccountId`]?.name || 'Savings';
  if (type === 'credit_card') return row[`${side}CreditCardId`]?.name || 'Credit card';
  return 'Account';
};
const recurringSource = (rule) => {
  if (rule.paymentMethod === 'credit_card') return { id: String(rule.creditCardId?._id || rule.creditCardId || 'unassigned-card'), name: rule.creditCardId?.name || 'Credit card', type: 'Credit card' };
  if (rule.paymentMethod === 'savings') return { id: String(rule.savingsAccountId?._id || rule.savingsAccountId || 'unassigned-savings'), name: rule.savingsAccountId?.name || 'Savings account', type: 'Savings account' };
  if (rule.paymentMethod === 'current_account') return { id: String(rule.memberId?._id || rule.memberId || 'household'), name: `${rule.memberId?.name || 'Household'} Account`, type: 'Account' };
  const label = String(rule.paymentMethod || 'other').replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  return { id: `${rule.memberId?._id || rule.memberId || 'household'}-${rule.paymentMethod}`, name: label, type: label };
};
const groupPendingRecurringItems = (items) => {
  const groups = new Map();
  items.forEach((item) => {
    const key = `${item.memberId || 'household'}:${item.sourceId}:${item.paymentMethod}`;
    if (!groups.has(key)) groups.set(key, { key, member: item.member, source: item.source, sourceType: item.sourceType, amount: 0, items: [] });
    const group = groups.get(key);
    group.items.push(item);
    group.amount += Number(item.amount || 0);
  });
  return [...groups.values()]
    .map((group) => ({ ...group, items: group.items.sort((a, b) => (a.dayOfMonth - b.dayOfMonth) || a.name.localeCompare(b.name)), nextDueDay: Math.min(...group.items.map((item) => item.dayOfMonth)) }))
    .sort((a, b) => (a.nextDueDay - b.nextDueDay) || a.member.localeCompare(b.member) || a.source.localeCompare(b.source));
};
const salaryFundedRecurringItems = (items) => items.filter((item) => item.paymentMethod !== 'credit_card');
const monthMatch = (monthField, yearField, fallbackMonth, fallbackYear, month, year) => ({
  $or: [
    { [monthField]: month, [yearField]: year },
    { [monthField]: { $exists: false }, [fallbackMonth]: month, [fallbackYear]: year },
    { [monthField]: null, [fallbackMonth]: month, [fallbackYear]: year },
  ],
});
const atDay = (year, zeroMonth, day) => new Date(year, zeroMonth, Math.min(day, new Date(year, zeroMonth + 1, 0).getDate()), 23, 59, 59, 999);
const cycleStartForEnd = (cycleEnd, startDay, endDay) => {
  const startMonthOffset = startDay <= endDay ? 0 : -1;
  const cycleStart = atDay(cycleEnd.getFullYear(), cycleEnd.getMonth() + startMonthOffset, startDay);
  cycleStart.setHours(0, 0, 0, 0);
  return cycleStart;
};
const dueDateForCycle = (cycleEnd, dueDay = 5) => {
  const monthOffset = dueDay <= cycleEnd.getDate() ? 1 : 0;
  return atDay(cycleEnd.getFullYear(), cycleEnd.getMonth() + monthOffset, dueDay);
};

function upcomingCycle(card, anchor) {
  const endDay = card.cycleEndDay || card.statementDay || 14;
  const startDay = card.cycleStartDay || (endDay === 31 ? 1 : endDay + 1);
  const endMonthOffset = anchor.getDate() <= endDay ? 0 : 1;
  const cycleEnd = atDay(anchor.getFullYear(), anchor.getMonth() + endMonthOffset, endDay);
  const startMonthOffset = startDay <= endDay ? 0 : -1;
  const cycleStart = atDay(cycleEnd.getFullYear(), cycleEnd.getMonth() + startMonthOffset, startDay);
  cycleStart.setHours(0, 0, 0, 0);
  return { cycleStart, cycleEnd };
}

async function monthlyFunding(userId, month, year, memberId = null) {
  const member = memberId ? { memberId } : {};
  const previous = new Date(year, month - 2, 1);
  const now = new Date();
  const selectedIsCurrent = now.getMonth() + 1 === month && now.getFullYear() === year;
  const paymentCutoff = selectedIsCurrent ? now : atDay(year, month - 1, new Date(year, month, 0).getDate());
  const incomeFundingMatch = {
    $or: [
      { fundingOverride: true, fundingMonth: month, fundingYear: year },
      { fundingOverride: { $ne: true }, source: /^salary$/i, month: previous.getMonth() + 1, year: previous.getFullYear() },
      { fundingOverride: { $ne: true }, source: { $not: /^salary$/i }, month, year },
    ],
  };
  const [incomes, directExpenses, expenseTransfers, cards, cardPayments, monthlyCardPayments, recurringRules, generatedRecurring] = await Promise.all([
    Income.find({ userId, ...member, ...incomeFundingMatch }).populate('memberId', 'name').lean(),
    Expense.find({ userId, ...member, paymentMethod: { $ne: 'credit_card' }, ...monthMatch('planningMonth', 'planningYear', 'month', 'year', month, year) }).populate('memberId', 'name').populate('savingsAccountId', 'name').lean(),
    Transfer.find({ userId, budgetTreatment: 'monthly_expense', ...monthMatch('planningMonth', 'planningYear', 'month', 'year', month, year) })
      .populate('fromMemberId', 'name').populate('fromSavingsAccountId', 'name').populate('fromCreditCardId', 'name')
      .populate('toMemberId', 'name').populate('toSavingsAccountId', 'name').populate('toCreditCardId', 'name').lean(),
    CreditCard.find({ userId, isActive: true, ...member }).lean(),
    Transfer.find({ userId, toAccountType: 'credit_card', date: { $lte: now } }).lean(),
    Transfer.find({ userId, toAccountType: 'credit_card', date: { $lte: paymentCutoff }, ...monthMatch('planningMonth', 'planningYear', 'month', 'year', month, year) })
      .populate('fromMemberId', 'name').populate('fromSavingsAccountId', 'name').populate('toCreditCardId', 'name').lean(),
    Subscription.find({ userId, isActive: true, ...member }).populate('memberId', 'name').populate('creditCardId', 'name bankName lastFourDigits').populate('savingsAccountId', 'name bankName').lean(),
    Expense.find({ userId, ...member, subscriptionId: { $ne: null }, month, year }).select('subscriptionId').lean(),
  ]);

  const recoveries = directExpenses.length ? await ExpenseRecovery.find({ expenseId: { $in: directExpenses.map((row) => row._id) }, budgetTreatment: 'reduce_expense' }).lean() : [];
  const salaryItems = incomes.filter((row) => /^salary$/i.test(row.source || '')).map((row) => ({ incomeId: row._id, source: row.source, description: row.description || 'Salary', date: row.date, member: row.memberId?.name || '', amount: Number(row.amount || 0) }));
  const incomeAvailable = amount(salaryItems);
  const currentDebitItems = [
    ...debitItemsForMethods(directExpenses, recoveries, ['current_account', 'debit_card', 'upi', 'netbanking', 'card']),
    ...cardPaymentDebitItems(monthlyCardPayments, 'current'),
  ];
  const savingsDebitItems = [
    ...debitItemsForMethods(directExpenses, recoveries, ['savings']),
    ...cardPaymentDebitItems(monthlyCardPayments, 'savings'),
  ];
  const currentAccountDebits = amount(currentDebitItems);
  const savingsDebits = amount(savingsDebitItems);
  const accountExpenses = currentAccountDebits + savingsDebits;
  const transferExpenseItems = expenseTransfers
    .map((row) => ({
      transferId: row._id,
      description: row.description || 'Expense transfer',
      notes: row.notes || '',
      date: row.date,
      planningMonth: row.planningMonth || row.month,
      planningYear: row.planningYear || row.year,
      from: transferAccountName(row, 'from'),
      to: transferAccountName(row, 'to'),
      amount: Number(row.amount || 0),
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const transferExpenses = amount(transferExpenseItems);
  const generatedSubscriptionIds = new Set(generatedRecurring.map((row) => String(row.subscriptionId)));
  const pendingRecurringItems = recurringRules
    .filter((rule) => !generatedSubscriptionIds.has(String(rule._id)))
    .map((rule) => {
      const source = recurringSource(rule);
      return { subscriptionId: rule._id, name: rule.name, memberId: rule.memberId?._id || rule.memberId, member: rule.memberId?.name || 'Household', sourceId: source.id, source: source.name, sourceType: source.type, amount: Number(rule.amount || 0), dayOfMonth: rule.dayOfMonth, paymentMethod: rule.paymentMethod };
    })
    .sort((a, b) => (a.dayOfMonth - b.dayOfMonth) || a.name.localeCompare(b.name));
  const pendingRecurringGroups = groupPendingRecurringItems(pendingRecurringItems);
  const pendingRecurring = amount(pendingRecurringItems);
  const pendingSalaryRecurringItems = salaryFundedRecurringItems(pendingRecurringItems);
  const pendingSalaryRecurring = amount(pendingSalaryRecurringItems);
  const cardDues = [];
  const upcomingCardBills = [];
  const cycleAnchor = selectedIsCurrent ? now : new Date(year, month, 0, 12, 0, 0);

  for (const card of cards) {
    let selectedCycle = upcomingCycle(card, cycleAnchor);
    if (!isCycleClosed(selectedCycle.cycleEnd, paymentCutoff)) {
      selectedCycle = upcomingCycle(card, new Date(selectedCycle.cycleStart.getTime() - 1));
    }
    const closesInSelectedMonth = selectedCycle.cycleEnd.getMonth() + 1 === month
      && selectedCycle.cycleEnd.getFullYear() === year;
    if (closesInSelectedMonth && isCycleClosed(selectedCycle.cycleEnd, paymentCutoff)) {
      // The preceding cycle is used only to consume credits that belong to it;
      // only the cycle closing in the selected month is returned to the UI.
      const precedingCycle = upcomingCycle(card, new Date(selectedCycle.cycleStart.getTime() - 1));
      const allocationCycles = [precedingCycle, selectedCycle];
      const cycleRows = [];
      for (const cycle of allocationCycles) {
        const purchases = await Expense.find({ userId, creditCardId: card._id, paymentMethod: 'credit_card', date: { $gte: cycle.cycleStart, $lte: cycle.cycleEnd } }).lean();
        const dueAmount = amount(purchases);
        cycleRows.push({
          creditCardId: card._id,
          name: card.name,
          dueDate: dueDateForCycle(cycle.cycleEnd, card.paymentDueDay || 5),
          cycleStart: cycle.cycleStart,
          cycleEnd: cycle.cycleEnd,
          amount: dueAmount,
          paid: 0,
          remaining: dueAmount,
        });
      }
      const allocatedRows = allocatePaymentsToStatements(
        cycleRows,
        cardPayments.filter((row) => String(row.toCreditCardId) === String(card._id)),
        now
      );
      const selectedRow = allocatedRows[1];
      if (selectedRow.amount || selectedRow.paid) cardDues.push(selectedRow);
    }

    const upcoming = upcomingCycle(card, cycleAnchor);
    const upcomingPurchases = await Expense.find({ userId, creditCardId: card._id, paymentMethod: 'credit_card', date: { $gte: upcoming.cycleStart, $lte: upcoming.cycleEnd } }).lean();
    const purchases = amount(upcomingPurchases);
    upcomingCardBills.push({ creditCardId: card._id, name: card.name, cycleStart: upcoming.cycleStart, cycleEnd: upcoming.cycleEnd, amount: purchases, purchases, paid: 0, remaining: purchases, transactionCount: upcomingPurchases.length });
  }

  const cardsDue = outstandingCardDue(cardDues);
  const upcomingCardBill = upcomingCardBills.reduce((total, row) => total + row.amount, 0);
  const plannedOutflow = accountExpenses + transferExpenses + cardsDue + pendingSalaryRecurring;
  const balance = incomeAvailable - plannedOutflow;
  return { incomeAvailable, salaryFunding: incomeAvailable, salaryItems, accountExpenses, currentAccountDebits, currentDebitItems, savingsDebits, savingsDebitItems, transferExpenses, transferExpenseItems, pendingRecurring, pendingRecurringItems, pendingRecurringGroups, pendingSalaryRecurring, pendingSalaryRecurringItems, cardsDue, upcomingCardBill, upcomingCardBills, plannedOutflow, salaryRemaining: Math.max(balance, 0), savingsRequired: Math.max(-balance, 0), cardDues };
}

module.exports = monthlyFunding;
module.exports.outstandingCardDue = outstandingCardDue;
module.exports.paymentsForStatement = paymentsForStatement;
module.exports.paymentsForEstimatedStatement = paymentsForEstimatedStatement;
module.exports.allocatePaymentsToStatements = allocatePaymentsToStatements;
module.exports.sameStatementCycle = sameStatementCycle;
module.exports.cycleStartForEnd = cycleStartForEnd;
module.exports.dueDateForCycle = dueDateForCycle;
module.exports.isCycleClosed = isCycleClosed;
module.exports.projectedCardBill = projectedCardBill;
module.exports.debitItemsForMethods = debitItemsForMethods;
module.exports.cardPaymentDebitItems = cardPaymentDebitItems;
module.exports.groupPendingRecurringItems = groupPendingRecurringItems;
module.exports.salaryFundedRecurringItems = salaryFundedRecurringItems;
