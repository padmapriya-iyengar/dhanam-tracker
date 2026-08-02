const Expense = require('../models/Expense');
const ExpenseRecovery = require('../models/ExpenseRecovery');
const Income = require('../models/Income');
const Transfer = require('../models/Transfer');
const CreditCard = require('../models/CreditCard');
const CreditCardStatement = require('../models/CreditCardStatement');
const Subscription = require('../models/Subscription');
require('../models/Member');

const amount = (rows) => rows.reduce((total, row) => total + Number(row.amount || 0), 0);
const monthMatch = (monthField, yearField, fallbackMonth, fallbackYear, month, year) => ({
  $or: [
    { [monthField]: month, [yearField]: year },
    { [monthField]: { $exists: false }, [fallbackMonth]: month, [fallbackYear]: year },
    { [monthField]: null, [fallbackMonth]: month, [fallbackYear]: year },
  ],
});
const atDay = (year, zeroMonth, day) => new Date(year, zeroMonth, Math.min(day, new Date(year, zeroMonth + 1, 0).getDate()), 23, 59, 59, 999);

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
  const incomeFundingMatch = {
    $or: [
      { fundingOverride: true, fundingMonth: month, fundingYear: year },
      { fundingOverride: { $ne: true }, source: /^salary$/i, month: previous.getMonth() + 1, year: previous.getFullYear() },
      { fundingOverride: { $ne: true }, source: { $not: /^salary$/i }, month, year },
    ],
  };
  const [incomes, directExpenses, expenseTransfers, cards, statements, cardPayments, recurringRules, generatedRecurring] = await Promise.all([
    Income.find({ userId, ...member, ...incomeFundingMatch }).lean(),
    Expense.find({ userId, ...member, paymentMethod: { $ne: 'credit_card' }, ...monthMatch('planningMonth', 'planningYear', 'month', 'year', month, year) }).lean(),
    Transfer.find({ userId, budgetTreatment: 'monthly_expense', ...monthMatch('planningMonth', 'planningYear', 'month', 'year', month, year) }).lean(),
    CreditCard.find({ userId, isActive: true, ...member }).lean(),
    CreditCardStatement.find({ userId }).lean(),
    Transfer.find({ userId, toAccountType: 'credit_card', ...monthMatch('planningMonth', 'planningYear', 'month', 'year', month, year) }).lean(),
    Subscription.find({ userId, isActive: true, ...member }).populate('memberId', 'name').lean(),
    Expense.find({ userId, ...member, subscriptionId: { $ne: null }, month, year }).select('subscriptionId').lean(),
  ]);

  const recoveries = directExpenses.length ? await ExpenseRecovery.find({ expenseId: { $in: directExpenses.map((row) => row._id) }, budgetTreatment: 'reduce_expense' }).lean() : [];
  const incomeAvailable = amount(incomes);
  const accountExpenses = Math.max(amount(directExpenses) - amount(recoveries), 0);
  const transferExpenses = amount(expenseTransfers);
  const generatedSubscriptionIds = new Set(generatedRecurring.map((row) => String(row.subscriptionId)));
  const pendingRecurringItems = recurringRules
    .filter((rule) => !generatedSubscriptionIds.has(String(rule._id)))
    .map((rule) => ({ subscriptionId: rule._id, name: rule.name, member: rule.memberId?.name || '', amount: Number(rule.amount || 0), dayOfMonth: rule.dayOfMonth, paymentMethod: rule.paymentMethod }));
  const pendingRecurring = amount(pendingRecurringItems);
  const cardDues = [];
  const upcomingCardBills = [];
  const now = new Date();
  const selectedIsCurrent = now.getMonth() + 1 === month && now.getFullYear() === year;
  const cycleAnchor = selectedIsCurrent ? now : new Date(year, month, 0, 12, 0, 0);

  for (const card of cards) {
    const dueDate = atDay(year, month - 1, card.paymentDueDay || 5);
    const saved = statements
      .filter((row) => String(row.creditCardId) === String(card._id))
      .filter((row) => {
        const cycleEnd = new Date(row.cycleEnd);
        const statementDate = row.statementDate ? new Date(row.statementDate) : atDay(cycleEnd.getFullYear(), cycleEnd.getMonth(), card.statementDay || cycleEnd.getDate());
        const dueDay = card.paymentDueDay || 5;
        const date = row.dueDate ? new Date(row.dueDate) : atDay(statementDate.getFullYear(), statementDate.getMonth() + (dueDay > statementDate.getDate() ? 0 : 1), dueDay);
        return date && date.getMonth() + 1 === month && date.getFullYear() === year;
      })
      .sort((a, b) => new Date(b.cycleEnd) - new Date(a.cycleEnd))[0];
    let cycleEnd; let cycleStart; let dueAmount; let estimated = false;
    if (saved) {
      cycleEnd = new Date(saved.cycleEnd); cycleStart = new Date(saved.cycleStart); dueAmount = Number(saved.statementAmount || 0);
    } else {
      const endDay = card.cycleEndDay || card.statementDay || 14;
      const endMonthOffset = endDay <= dueDate.getDate() ? 0 : -1;
      cycleEnd = atDay(year, month - 1 + endMonthOffset, endDay);
      const startDay = card.cycleStartDay || (endDay === 31 ? 1 : endDay + 1);
      cycleStart = atDay(cycleEnd.getFullYear(), cycleEnd.getMonth() - 1, startDay);
      cycleStart.setHours(0, 0, 0, 0);
      const purchases = await Expense.find({ userId, creditCardId: card._id, paymentMethod: 'credit_card', date: { $gte: cycleStart, $lte: cycleEnd } }).lean();
      dueAmount = amount(purchases); estimated = true;
    }
    const paid = amount(cardPayments.filter((row) => String(row.toCreditCardId) === String(card._id)));
    if (dueAmount || paid) cardDues.push({ creditCardId: card._id, name: card.name, dueDate, cycleStart, cycleEnd, amount: dueAmount, paid, remaining: Math.max(dueAmount - paid, 0), estimated });

    const upcoming = upcomingCycle(card, cycleAnchor);
    const upcomingPurchases = await Expense.find({ userId, creditCardId: card._id, paymentMethod: 'credit_card', date: { $gte: upcoming.cycleStart, $lte: upcoming.cycleEnd } }).lean();
    upcomingCardBills.push({ creditCardId: card._id, name: card.name, cycleStart: upcoming.cycleStart, cycleEnd: upcoming.cycleEnd, amount: amount(upcomingPurchases), transactionCount: upcomingPurchases.length });
  }

  const cardsDue = cardDues.reduce((total, row) => total + row.amount, 0);
  const upcomingCardBill = upcomingCardBills.reduce((total, row) => total + row.amount, 0);
  const plannedOutflow = accountExpenses + transferExpenses + cardsDue + pendingRecurring;
  const balance = incomeAvailable - plannedOutflow;
  return { incomeAvailable, accountExpenses, transferExpenses, pendingRecurring, pendingRecurringItems, cardsDue, upcomingCardBill, upcomingCardBills, plannedOutflow, salaryRemaining: Math.max(balance, 0), savingsRequired: Math.max(-balance, 0), cardDues };
}

module.exports = monthlyFunding;
