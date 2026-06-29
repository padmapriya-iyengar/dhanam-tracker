const Balance = require('./models/Balance');
const Category = require('./models/Category');
const CreditCard = require('./models/CreditCard');
const CreditCardStatement = require('./models/CreditCardStatement');
const Expense = require('./models/Expense');
const Income = require('./models/Income');
const Member = require('./models/Member');
const SavingsAccount = require('./models/SavingsAccount');
const SubCategory = require('./models/SubCategory');
const Subscription = require('./models/Subscription');
const Transfer = require('./models/Transfer');
const { ensureDemoUser } = require('./middleware/currentUser');

const demoCategories = [
  { name: 'Food & Dining', color: '#f97316', icon: 'utensils', subs: ['Groceries', 'Restaurant'] },
  { name: 'Transportation', color: '#3b82f6', icon: 'car', subs: ['Fuel', 'Metro / Bus'] },
  { name: 'Housing', color: '#8b5cf6', icon: 'home', subs: ['Rent', 'DEWA'] },
  { name: 'Entertainment', color: '#f59e0b', icon: 'film', subs: ['Movies & OTT', 'Travel & Vacation'] },
  { name: 'Shopping', color: '#ec4899', icon: 'shopping-bag', subs: ['Online Shopping', 'Household Items'] },
  { name: 'Health & Medical', color: '#ef4444', icon: 'heart', subs: ['Medicines', 'Gym / Fitness'] },
];

function monthsAgo(offset, day) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - offset, day, 12, 0, 0);
}

function statementDate(monthOffset, day, endOfDay = false) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, day);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
}

async function ensureCategory({ name, color, icon, subs }) {
  const category = await Category.findOneAndUpdate(
    { name },
    { $setOnInsert: { name, color, icon, description: `${name} demo category` } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const subCategories = {};
  for (const subName of subs) {
    const sub = await SubCategory.findOneAndUpdate(
      { name: subName, categoryId: category._id },
      { $setOnInsert: { name: subName, categoryId: category._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    subCategories[subName] = sub;
  }

  return { category, subCategories };
}

async function createExpense(userId, member, categoryInfo, subName, amount, description, date, paymentMethod = 'current_account', extra = {}) {
  const docDate = new Date(date);
  return Expense.create({
    userId,
    memberId: member._id,
    amount,
    categoryId: categoryInfo.category._id,
    subCategoryId: categoryInfo.subCategories[subName]?._id || null,
    description,
    date: docDate,
    month: docDate.getMonth() + 1,
    year: docDate.getFullYear(),
    paymentMethod,
    ...extra,
  });
}

async function createIncome(userId, member, amount, source, description, date, savingsAccountId = null) {
  const docDate = new Date(date);
  return Income.create({
    userId,
    memberId: member._id,
    amount,
    source,
    description,
    date: docDate,
    month: docDate.getMonth() + 1,
    year: docDate.getFullYear(),
    savingsAccountId,
  });
}

async function seedDemoData() {
  const user = await ensureDemoUser();
  const userId = user._id;

  await Promise.all([
    Balance.deleteMany({ userId }),
    CreditCard.deleteMany({ userId }),
    CreditCardStatement.deleteMany({ userId }),
    Expense.deleteMany({ userId }),
    Income.deleteMany({ userId }),
    Member.deleteMany({ userId }),
    SavingsAccount.deleteMany({ userId }),
    Subscription.deleteMany({ userId }),
    Transfer.deleteMany({ userId }),
  ]);

  const categories = {};
  for (const data of demoCategories) {
    categories[data.name] = await ensureCategory(data);
  }

  const [alex, maya] = await Member.create([
    { userId, name: 'Alex', role: 'self', color: '#10b981' },
    { userId, name: 'Maya', role: 'other', color: '#0ea5e9' },
  ]);

  const [mainAccount, travelFund] = await SavingsAccount.create([
    {
      userId,
      name: 'Main Savings',
      bankName: 'Demo Bank',
      accountType: 'savings',
      openingBalance: 45200,
      balance: 45200,
      memberId: alex._id,
      color: '#10b981',
      notes: 'Demo balance',
    },
    {
      userId,
      name: 'Travel Fund',
      bankName: 'Demo Bank',
      accountType: 'savings',
      openingBalance: 9800,
      balance: 9800,
      memberId: maya._id,
      color: '#0ea5e9',
      notes: 'Demo savings goal',
    },
  ]);

  const [visa, rewards] = await CreditCard.create([
    {
      userId,
      name: 'Everyday Visa',
      bankName: 'Demo Bank',
      memberId: alex._id,
      lastFourDigits: '4242',
      cycleStartDay: 15,
      cycleEndDay: 14,
      statementDay: 14,
      paymentDueDay: 5,
      color: '#6366f1',
    },
    {
      userId,
      name: 'Rewards Card',
      bankName: 'Sample Finance',
      memberId: maya._id,
      lastFourDigits: '9876',
      cycleStartDay: 21,
      cycleEndDay: 20,
      statementDay: 20,
      paymentDueDay: 10,
      color: '#ec4899',
    },
  ]);

  await Balance.create([
    { userId, memberId: alex._id, openingBalance: 12000, notes: 'Demo opening balance' },
    { userId, memberId: maya._id, openingBalance: 8500, notes: 'Demo opening balance' },
  ]);

  await Promise.all([
    createIncome(userId, alex, 18000, 'Salary', 'Monthly salary', monthsAgo(0, 1), mainAccount._id),
    createIncome(userId, maya, 12500, 'Consulting', 'Project retainer', monthsAgo(0, 3), travelFund._id),
    createIncome(userId, alex, 18000, 'Salary', 'Monthly salary', monthsAgo(1, 1), mainAccount._id),
    createIncome(userId, maya, 11800, 'Consulting', 'Project retainer', monthsAgo(1, 4), travelFund._id),
    createIncome(userId, alex, 18000, 'Salary', 'Monthly salary', monthsAgo(2, 1), mainAccount._id),

    createExpense(userId, alex, categories['Housing'], 'Rent', 7200, 'Apartment rent', monthsAgo(0, 2), 'current_account'),
    createExpense(userId, maya, categories['Food & Dining'], 'Groceries', 620, 'Weekly groceries', monthsAgo(0, 6), 'current_account', { savingsAccountId: travelFund._id }),
    createExpense(userId, alex, categories['Transportation'], 'Fuel', 260, 'Fuel refill', monthsAgo(0, 8), 'credit_card', { creditCardId: visa._id }),
    createExpense(userId, maya, categories['Entertainment'], 'Movies & OTT', 89, 'Streaming subscription', monthsAgo(0, 10), 'credit_card', { creditCardId: rewards._id }),
    createExpense(userId, alex, categories['Shopping'], 'Online Shopping', 420, 'Home essentials', monthsAgo(0, 12), 'credit_card', { creditCardId: visa._id }),
    createExpense(userId, maya, categories['Health & Medical'], 'Gym / Fitness', 300, 'Gym membership', monthsAgo(0, 14), 'current_account'),
    createExpense(userId, alex, categories['Food & Dining'], 'Restaurant', 340, 'Dinner with friends', monthsAgo(0, 18), 'credit_card', { creditCardId: visa._id }),

    createExpense(userId, alex, categories['Housing'], 'DEWA', 780, 'Utilities', monthsAgo(1, 5), 'current_account'),
    createExpense(userId, maya, categories['Food & Dining'], 'Groceries', 580, 'Groceries', monthsAgo(1, 9), 'current_account'),
    createExpense(userId, alex, categories['Transportation'], 'Metro / Bus', 140, 'Metro card top-up', monthsAgo(1, 13), 'current_account'),
    createExpense(userId, maya, categories['Entertainment'], 'Travel & Vacation', 1600, 'Weekend staycation', monthsAgo(1, 20), 'credit_card', { creditCardId: rewards._id }),

    createExpense(userId, alex, categories['Housing'], 'Rent', 7200, 'Apartment rent', monthsAgo(2, 2), 'current_account'),
    createExpense(userId, maya, categories['Shopping'], 'Household Items', 510, 'Kitchen supplies', monthsAgo(2, 11), 'credit_card', { creditCardId: rewards._id }),
    createExpense(userId, alex, categories['Food & Dining'], 'Restaurant', 275, 'Team lunch', monthsAgo(2, 17), 'credit_card', { creditCardId: visa._id }),
  ]);

  await CreditCardStatement.create([
    {
      userId,
      creditCardId: visa._id,
      cycleStart: statementDate(-1, 15),
      cycleEnd: statementDate(0, 14, true),
      openingBalance: 0,
      fees: 0,
      interest: 0,
      refunds: 0,
      statementAmount: 1020,
      notes: 'Demo statement cycle',
    },
    {
      userId,
      creditCardId: rewards._id,
      cycleStart: statementDate(-1, 21),
      cycleEnd: statementDate(0, 20, true),
      openingBalance: 0,
      fees: 0,
      interest: 0,
      refunds: 50,
      statementAmount: 39,
      notes: 'Demo statement with refund',
    },
  ]);

  const transferDates = [monthsAgo(0, 22), monthsAgo(1, 24), monthsAgo(2, 25)];
  await Transfer.create([
    {
      userId,
      amount: 900,
      date: transferDates[0],
      month: transferDates[0].getMonth() + 1,
      year: transferDates[0].getFullYear(),
      fromAccountType: 'savings',
      fromSavingsAccountId: mainAccount._id,
      toAccountType: 'credit_card',
      toCreditCardId: visa._id,
      description: 'Credit card payment',
    },
    {
      userId,
      amount: 500,
      date: monthsAgo(0, 23),
      month: monthsAgo(0, 23).getMonth() + 1,
      year: monthsAgo(0, 23).getFullYear(),
      fromAccountType: 'current',
      fromMemberId: alex._id,
      toAccountType: 'credit_card',
      toCreditCardId: visa._id,
      description: 'Credit card payment from current account',
    },
    {
      userId,
      amount: 750,
      date: monthsAgo(0, 24),
      month: monthsAgo(0, 24).getMonth() + 1,
      year: monthsAgo(0, 24).getFullYear(),
      fromAccountType: 'current',
      fromMemberId: alex._id,
      toAccountType: 'current',
      toMemberId: maya._id,
      description: 'Current account transfer',
    },
    {
      userId,
      amount: 1200,
      date: transferDates[1],
      month: transferDates[1].getMonth() + 1,
      year: transferDates[1].getFullYear(),
      fromAccountType: 'savings',
      fromSavingsAccountId: travelFund._id,
      toAccountType: 'credit_card',
      toCreditCardId: rewards._id,
      description: 'Credit card payment',
    },
    {
      userId,
      amount: 3000,
      date: transferDates[2],
      month: transferDates[2].getMonth() + 1,
      year: transferDates[2].getFullYear(),
      fromAccountType: 'savings',
      fromSavingsAccountId: mainAccount._id,
      toAccountType: 'savings',
      toSavingsAccountId: travelFund._id,
      description: 'Travel fund top-up',
    },
  ]);

  return user;
}

module.exports = seedDemoData;
