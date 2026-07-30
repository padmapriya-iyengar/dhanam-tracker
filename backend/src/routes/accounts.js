const express = require('express');
const router = express.Router();
const Balance = require('../models/Balance');
const Member = require('../models/Member');
const SavingsAccount = require('../models/SavingsAccount');
const CreditCard = require('../models/CreditCard');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Transfer = require('../models/Transfer');
const ExpenseRecovery = require('../models/ExpenseRecovery');

const CURRENT_EXPENSE_METHODS = ['cash', 'card', 'current_account', 'debit_card', 'netbanking', 'upi', 'other'];

const keyFor = (type, id) => `${type}:${id}`;
const idOf = (value) => String(value?._id || value || '');

function dateFilter(startDate, endDate) {
  if (!startDate && !endDate) return undefined;
  const filter = {};
  if (startDate) filter.$gte = new Date(`${startDate}T00:00:00.000`);
  if (endDate) filter.$lte = new Date(`${endDate}T23:59:59.999`);
  return filter;
}

function transferAccount(transfer, side) {
  const type = transfer[`${side}AccountType`];
  const value = type === 'current'
    ? transfer[`${side}MemberId`]
    : type === 'savings'
      ? transfer[`${side}SavingsAccountId`]
      : transfer[`${side}CreditCardId`];
  return { key: keyFor(type, idOf(value)), type, value };
}

function accountLabel(type, value) {
  if (!value) return 'Unknown account';
  if (type === 'current') return `${value.name} Current Account`;
  if (type === 'credit_card') return `${value.name}${value.lastFourDigits ? ` •••• ${value.lastFourDigits}` : ''}`;
  return value.name;
}

router.get('/', async (req, res) => {
  try {
    const [members, savings, cards, balances] = await Promise.all([
      Member.find({ userId: req.user._id, isActive: true }).sort({ name: 1 }),
      SavingsAccount.find({ userId: req.user._id }).populate('memberId', 'name color').sort({ name: 1 }),
      CreditCard.find({ userId: req.user._id, isActive: true }).populate('memberId', 'name color').sort({ name: 1 }),
      Balance.find({ userId: req.user._id }),
    ]);
    const balanceMap = new Map(balances.map((balance) => [idOf(balance.memberId), balance.openingBalance || 0]));
    res.json([
      ...members.map((member) => ({ key: keyFor('current', member._id), id: member._id, type: 'current', name: `${member.name} Current Account`, owner: member.name, color: member.color, openingBalance: balanceMap.get(idOf(member._id)) || 0 })),
      ...savings.map((account) => ({ key: keyFor('savings', account._id), id: account._id, type: 'savings', accountType: account.accountType, name: account.name, bankName: account.bankName, lastFourDigits: account.lastFourDigits, owner: account.memberId?.name, color: account.color, openingBalance: account.openingBalance || 0 })),
      ...cards.map((card) => ({
        key: keyFor('credit_card', card._id), id: card._id, type: 'credit_card', name: card.name,
        bankName: card.bankName, owner: card.memberId?.name, color: card.color,
        lastFourDigits: card.lastFourDigits, cycleStartDay: card.cycleStartDay,
        cycleEndDay: card.cycleEndDay, statementDay: card.statementDay, openingBalance: 0,
      })),
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/category-comparison', async (req, res) => {
  try {
    const [accountType, accountId] = String(req.query.account || '').split(':');
    const months = String(req.query.months || '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
    if (!accountId || !['current', 'savings', 'credit_card'].includes(accountType)) {
      return res.status(400).json({ error: 'Select a current account, savings account, or credit card' });
    }
    if (!months.length) return res.status(400).json({ error: 'Add at least one month' });

    const monthParts = months.map((value) => {
      const [year, month] = value.split('-').map(Number);
      return { year, month };
    });
    const filter = { userId: req.user._id, $or: monthParts };
    if (accountType === 'current') {
      filter.memberId = accountId;
      filter.paymentMethod = { $in: CURRENT_EXPENSE_METHODS };
    } else if (accountType === 'savings') {
      filter.savingsAccountId = accountId;
      filter.paymentMethod = 'savings';
    } else {
      filter.creditCardId = accountId;
      filter.paymentMethod = 'credit_card';
    }

    const expenses = await Expense.find(filter)
      .populate('categoryId', 'name color icon')
      .populate('subCategoryId', 'name');
    const categoryMap = new Map();
    const totals = Object.fromEntries(months.map((month) => [month, 0]));
    expenses.forEach((expense) => {
      const monthKey = `${expense.year}-${String(expense.month).padStart(2, '0')}`;
      const categoryId = idOf(expense.categoryId) || 'uncategorized';
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: expense.categoryId?.name || 'Uncategorized',
          color: expense.categoryId?.color || '#94a3b8',
          values: Object.fromEntries(months.map((month) => [month, 0])),
          subcategories: new Map(),
        });
      }
      const category = categoryMap.get(categoryId);
      category.values[monthKey] += expense.amount;
      totals[monthKey] += expense.amount;
      const subcategoryId = idOf(expense.subCategoryId) || 'other';
      if (!category.subcategories.has(subcategoryId)) {
        category.subcategories.set(subcategoryId, {
          id: subcategoryId,
          name: expense.subCategoryId?.name || 'Other',
          values: Object.fromEntries(months.map((month) => [month, 0])),
        });
      }
      category.subcategories.get(subcategoryId).values[monthKey] += expense.amount;
    });

    const rows = [...categoryMap.values()]
      .map((category) => ({ ...category, subcategories: [...category.subcategories.values()].sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ months, rows, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const selectedKey = req.query.account || '';
    const selectedType = selectedKey.split(':')[0];
    const selectedId = selectedKey.split(':')[1];
    // For a selected account, include earlier records while calculating the running
    // balance, then trim them from the response. This keeps balances correct even
    // when the visible ledger has a start-date filter.
    const date = dateFilter(selectedId ? undefined : req.query.startDate, req.query.endDate);
    const base = { userId: req.user._id, ...(date ? { date } : {}) };

    const incomeFilter = { ...base };
    const expenseFilter = { ...base };
    const transferFilter = { ...base };
    if (selectedId) {
      if (selectedType === 'current') {
        incomeFilter.memberId = selectedId;
        incomeFilter.$or = [{ savingsAccountId: null }, { savingsAccountId: { $exists: false } }];
        expenseFilter.memberId = selectedId;
        expenseFilter.paymentMethod = { $in: CURRENT_EXPENSE_METHODS };
        transferFilter.$or = [{ fromAccountType: 'current', fromMemberId: selectedId }, { toAccountType: 'current', toMemberId: selectedId }];
      } else if (selectedType === 'savings') {
        incomeFilter.savingsAccountId = selectedId;
        expenseFilter.savingsAccountId = selectedId;
        expenseFilter.paymentMethod = 'savings';
        transferFilter.$or = [{ fromAccountType: 'savings', fromSavingsAccountId: selectedId }, { toAccountType: 'savings', toSavingsAccountId: selectedId }];
      } else if (selectedType === 'credit_card') {
        incomeFilter._id = null;
        expenseFilter.creditCardId = selectedId;
        expenseFilter.paymentMethod = 'credit_card';
        transferFilter.$or = [{ fromAccountType: 'credit_card', fromCreditCardId: selectedId }, { toAccountType: 'credit_card', toCreditCardId: selectedId }];
      }
    }

    const [incomes, expenses, transfers] = await Promise.all([
      Income.find(incomeFilter).populate('memberId', 'name color').populate('savingsAccountId', 'name bankName color'),
      Expense.find(expenseFilter).populate('memberId', 'name color').populate('categoryId', 'name color icon').populate('subCategoryId', 'name').populate('creditCardId', 'name bankName color lastFourDigits').populate('savingsAccountId', 'name bankName color'),
      Transfer.find(transferFilter)
        .populate('fromMemberId', 'name color').populate('fromSavingsAccountId', 'name bankName color').populate('fromCreditCardId', 'name bankName color lastFourDigits')
        .populate('toMemberId', 'name color').populate('toSavingsAccountId', 'name bankName color').populate('toCreditCardId', 'name bankName color lastFourDigits'),
    ]);
    const recoveries = selectedId ? [] : await ExpenseRecovery.find({
      userId: req.user._id,
      ...(date ? { date } : {}),
    }).populate({
      path: 'expenseId',
      populate: [
        { path: 'memberId', select: 'name color' },
        { path: 'categoryId', select: 'name color icon' },
        { path: 'creditCardId', select: 'name' },
        { path: 'savingsAccountId', select: 'name' },
      ],
    });
    const recoveryTotals = expenses.length ? await ExpenseRecovery.aggregate([
      { $match: { userId: req.user._id, expenseId: { $in: expenses.map((expense) => expense._id) }, budgetTreatment: 'reduce_expense' } },
      { $group: { _id: '$expenseId', amount: { $sum: '$amount' } } },
    ]) : [];
    const recoveryByExpense = new Map(recoveryTotals.map((entry) => [String(entry._id), entry.amount]));

    const records = [
      ...incomes.map((item) => ({
        id: item._id, type: 'income', direction: 'in', date: item.date, createdAt: item.createdAt, updatedAt: item.updatedAt, amount: item.amount, signedAmount: item.amount,
        title: item.source, description: item.description || '', owner: item.memberId?.name || '',
        memberId: idOf(item.memberId), accountId: idOf(item.savingsAccountId) || idOf(item.memberId),
        account: item.savingsAccountId?.name || `${item.memberId?.name || ''} Current Account`, paymentMethod: 'Income', notes: '', imported: !!item.imported,
      })),
      ...expenses.map((item) => ({
        recoveredAmount: Math.min(recoveryByExpense.get(String(item._id)) || 0, item.amount),
        netAmount: Math.max(item.amount - (recoveryByExpense.get(String(item._id)) || 0), 0),
        id: item._id, type: 'expense', direction: 'out', date: item.date, createdAt: item.createdAt, updatedAt: item.updatedAt, amount: item.amount, signedAmount: -item.amount,
        title: item.categoryId?.name || 'Uncategorized', description: item.description || '', owner: item.memberId?.name || '',
        memberId: idOf(item.memberId), categoryId: idOf(item.categoryId), subCategoryId: idOf(item.subCategoryId),
        accountId: idOf(item.creditCardId) || idOf(item.savingsAccountId) || idOf(item.memberId),
        account: item.creditCardId?.name || item.savingsAccountId?.name || `${item.memberId?.name || ''} Current Account`,
        category: item.subCategoryId?.name ? `${item.categoryId?.name} / ${item.subCategoryId.name}` : item.categoryId?.name,
        categoryColor: item.categoryId?.color, paymentMethod: item.paymentMethod, notes: item.notes || '',
        recurring: !!item.subscriptionId, subscriptionId: idOf(item.subscriptionId), imported: !!item.imported,
      })),
      ...transfers.map((item) => {
        const from = transferAccount(item, 'from');
        const to = transferAccount(item, 'to');
        const isIncoming = selectedKey && to.key === selectedKey;
        const isOutgoing = selectedKey && from.key === selectedKey;
        return {
          id: item._id, type: 'transfer', direction: isIncoming ? 'in' : isOutgoing ? 'out' : 'transfer', date: item.date, createdAt: item.createdAt, updatedAt: item.updatedAt, amount: item.amount,
          signedAmount: isIncoming ? item.amount : isOutgoing ? -item.amount : 0,
          title: 'Transfer', description: item.description || '', owner: '',
          account: `${accountLabel(from.type, from.value)} → ${accountLabel(to.type, to.value)}`,
          fromAccount: accountLabel(from.type, from.value), toAccount: accountLabel(to.type, to.value),
          fromAccountType: from.type, toAccountType: to.type, paymentMethod: 'Transfer', notes: item.notes || '', imported: !!item.imported,
        };
      }),
      ...recoveries.filter((item) => item.expenseId).map((item) => ({
        id: item._id, expenseId: item.expenseId._id, type: 'recovery', direction: 'in',
        date: item.date, createdAt: item.createdAt, updatedAt: item.updatedAt,
        amount: item.amount, signedAmount: item.amount, title: 'Expense recovery',
        description: item.notes || item.expenseId.description || 'Recovery',
        owner: item.expenseId.memberId?.name || '', memberId: idOf(item.expenseId.memberId),
        account: item.expenseId.creditCardId?.name || item.expenseId.savingsAccountId?.name || `${item.expenseId.memberId?.name || ''} Current Account`,
        category: item.expenseId.categoryId?.name || '', categoryId: idOf(item.expenseId.categoryId),
        paymentMethod: 'Recovery', notes: item.notes || '', recoverySource: item.source,
      })),
    ];

    if (selectedId) {
      let openingBalance = 0;
      if (selectedType === 'current') {
        openingBalance = (await Balance.findOne({ userId: req.user._id, memberId: selectedId }))?.openingBalance || 0;
      } else if (selectedType === 'savings') {
        openingBalance = (await SavingsAccount.findOne({ userId: req.user._id, _id: selectedId }))?.openingBalance || 0;
      }

      let runningBalance = openingBalance;
      records
        .sort((a, b) => new Date(a.date) - new Date(b.date)
          || new Date(a.createdAt) - new Date(b.createdAt)
          || String(a.id).localeCompare(String(b.id)))
        .forEach((record) => {
          record.balanceBefore = runningBalance;
          // A card balance is a liability: purchases increase it and payments reduce it.
          const effect = selectedType === 'credit_card' ? -record.signedAmount : record.signedAmount;
          runningBalance += effect;
          record.balanceAfter = runningBalance;
        });
    }

    const queryText = String(req.query.query || '').trim().toLowerCase();
    const typeFilter = String(req.query.type || 'all');
    const filteredRecords = records.filter((record) => {
      if (req.query.startDate && new Date(record.date) < new Date(`${req.query.startDate}T00:00:00.000`)) return false;
      if (req.query.endDate && new Date(record.date) > new Date(`${req.query.endDate}T23:59:59.999`)) return false;
      if (typeFilter !== 'all' && record.type !== typeFilter) return false;
      if (req.query.member && String(record.memberId) !== String(req.query.member) && !String(record.owner).toLowerCase().includes(String(req.query.member).toLowerCase())) return false;
      if (req.query.category && String(record.categoryId) !== String(req.query.category) && !String(record.category).toLowerCase().includes(String(req.query.category).toLowerCase())) return false;
      if (req.query.subcategory && String(record.subCategoryId) !== String(req.query.subcategory)) return false;
      if (req.query.account && String(record.accountId) !== String(req.query.account) && !String(record.account).toLowerCase().includes(String(req.query.account).toLowerCase())) return false;
      if (req.query.minAmount && record.amount < Number(req.query.minAmount)) return false;
      if (req.query.maxAmount && record.amount > Number(req.query.maxAmount)) return false;
      if (String(req.query.recurring) === 'true' && !record.recurring) return false;
      if (String(req.query.imported) === 'true' && !record.imported) return false;
      if (queryText) {
        const searchable = [record.description, record.title, record.notes, record.account, record.category, record.owner, record.amount].join(' ').toLowerCase();
        if (!searchable.includes(queryText)) return false;
      }
      return true;
    });
    const visibleRecords = filteredRecords.sort(req.query.sortBy === 'amount_desc'
      ? (a, b) => b.amount - a.amount
        || new Date(b.date) - new Date(a.date)
        || String(b.id).localeCompare(String(a.id))
      : (a, b) => new Date(b.date) - new Date(a.date)
        || new Date(b.createdAt) - new Date(a.createdAt)
        || String(b.id).localeCompare(String(a.id)));

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const isCardSelection = selectedType === 'credit_card';
    const isCashSelection = selectedType === 'current' || selectedType === 'savings';
    const cashIn = visibleRecords.reduce((sum, record) => {
      if (isCashSelection) return sum + (record.direction === 'in' ? record.amount : 0);
      if (record.type === 'income') return sum + record.amount;
      // Only transfers entering the real-account boundary count as external cash in.
      if (record.type === 'transfer' && record.toAccountType !== 'credit_card' && record.fromAccountType === 'credit_card') return sum + record.amount;
      return sum;
    }, 0);
    const cashOut = visibleRecords.reduce((sum, record) => {
      if (isCashSelection) return sum + (record.direction === 'out' ? record.amount : 0);
      if (record.type === 'expense' && record.paymentMethod !== 'credit_card') return sum + record.amount;
      // Payments to cards leave current/savings and are real cash out.
      if (record.type === 'transfer' && record.fromAccountType !== 'credit_card' && record.toAccountType === 'credit_card') return sum + record.amount;
      return sum;
    }, 0);
    const cardPurchases = visibleRecords
      .filter((record) => record.type === 'expense' && record.paymentMethod === 'credit_card')
      .reduce((sum, record) => sum + record.amount, 0);
    const cardPayments = visibleRecords
      .filter((record) => record.type === 'transfer' && record.toAccountType === 'credit_card')
      .reduce((sum, record) => sum + record.amount, 0);
    const activitySummary = visibleRecords.reduce((summary, record) => {
      summary.count += 1;
      if (record.type === 'expense') {
        summary.grossExpenses += record.amount;
        summary.recoveriesApplied += record.recoveredAmount || 0;
        summary.expenses += record.netAmount ?? record.amount;
      }
      else if (record.type === 'income') summary.income += record.amount;
      else if (record.type === 'recovery') summary.recoveries += record.amount;
      else if (record.type === 'transfer') summary.transfers += record.amount;
      return summary;
    }, { count: 0, income: 0, grossExpenses: 0, recoveriesApplied: 0, expenses: 0, recoveries: 0, transfers: 0 });
    activitySummary.net = activitySummary.income - activitySummary.expenses;

    res.json({
      records: visibleRecords.slice((page - 1) * limit, page * limit), total: visibleRecords.length, page, pages: Math.ceil(visibleRecords.length / limit),
      summary: {
        scope: isCardSelection ? 'credit_card' : 'cash',
        cash: { totalIn: cashIn, totalOut: cashOut, net: cashIn - cashOut },
        creditCards: { purchases: cardPurchases, payments: cardPayments, outstandingMovement: cardPurchases - cardPayments },
        activity: activitySummary,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
