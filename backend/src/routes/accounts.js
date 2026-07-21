const express = require('express');
const router = express.Router();
const Balance = require('../models/Balance');
const Member = require('../models/Member');
const SavingsAccount = require('../models/SavingsAccount');
const CreditCard = require('../models/CreditCard');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Transfer = require('../models/Transfer');

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
      ...savings.map((account) => ({ key: keyFor('savings', account._id), id: account._id, type: 'savings', accountType: account.accountType, name: account.name, bankName: account.bankName, owner: account.memberId?.name, color: account.color, openingBalance: account.openingBalance || 0 })),
      ...cards.map((card) => ({ key: keyFor('credit_card', card._id), id: card._id, type: 'credit_card', name: card.name, bankName: card.bankName, owner: card.memberId?.name, color: card.color, lastFourDigits: card.lastFourDigits, openingBalance: 0 })),
    ]);
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

    const records = [
      ...incomes.map((item) => ({
        id: item._id, type: 'income', direction: 'in', date: item.date, createdAt: item.createdAt, amount: item.amount, signedAmount: item.amount,
        title: item.source, description: item.description || '', owner: item.memberId?.name || '',
        account: item.savingsAccountId?.name || `${item.memberId?.name || ''} Current Account`, paymentMethod: 'Income', notes: '',
      })),
      ...expenses.map((item) => ({
        id: item._id, type: 'expense', direction: 'out', date: item.date, createdAt: item.createdAt, amount: item.amount, signedAmount: -item.amount,
        title: item.categoryId?.name || 'Uncategorized', description: item.description || '', owner: item.memberId?.name || '',
        account: item.creditCardId?.name || item.savingsAccountId?.name || `${item.memberId?.name || ''} Current Account`,
        category: item.subCategoryId?.name ? `${item.categoryId?.name} / ${item.subCategoryId.name}` : item.categoryId?.name,
        categoryColor: item.categoryId?.color, paymentMethod: item.paymentMethod, notes: item.notes || '',
      })),
      ...transfers.map((item) => {
        const from = transferAccount(item, 'from');
        const to = transferAccount(item, 'to');
        const isIncoming = selectedKey && to.key === selectedKey;
        const isOutgoing = selectedKey && from.key === selectedKey;
        return {
          id: item._id, type: 'transfer', direction: isIncoming ? 'in' : isOutgoing ? 'out' : 'transfer', date: item.date, createdAt: item.createdAt, amount: item.amount,
          signedAmount: isIncoming ? item.amount : isOutgoing ? -item.amount : 0,
          title: 'Transfer', description: item.description || '', owner: '',
          account: `${accountLabel(from.type, from.value)} → ${accountLabel(to.type, to.value)}`,
          fromAccount: accountLabel(from.type, from.value), toAccount: accountLabel(to.type, to.value),
          fromAccountType: from.type, toAccountType: to.type, paymentMethod: 'Transfer', notes: item.notes || '',
        };
      }),
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

    const visibleRecords = records
      .filter((record) => !req.query.startDate || new Date(record.date) >= new Date(`${req.query.startDate}T00:00:00.000`))
      .sort((a, b) => new Date(b.date) - new Date(a.date)
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

    res.json({
      records: visibleRecords.slice((page - 1) * limit, page * limit), total: visibleRecords.length, page, pages: Math.ceil(visibleRecords.length / limit),
      summary: {
        scope: isCardSelection ? 'credit_card' : 'cash',
        cash: { totalIn: cashIn, totalOut: cashOut, net: cashIn - cashOut },
        creditCards: { purchases: cardPurchases, payments: cardPayments, outstandingMovement: cardPurchases - cardPayments },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
