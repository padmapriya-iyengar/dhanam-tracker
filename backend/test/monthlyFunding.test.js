const test = require('node:test');
const assert = require('node:assert/strict');
const { cardPaymentDebitItems, cycleStartForEnd, debitItemsForMethods, groupPendingRecurringItems, isCycleClosed, outstandingCardDue, paymentsForStatement, projectedCardBill, salaryFundedRecurringItems, sameStatementCycle } = require('../src/services/monthlyFunding');

test('card payments reduce cards due to the unpaid remainder', () => {
  const cards = [
    { amount: 2361.45, paid: 2361, remaining: 0.45 },
    { amount: 1000, paid: 250, remaining: 750 },
  ];

  assert.equal(outstandingCardDue(cards), 750.45);
});

test('fully paid cards contribute nothing to cards due', () => {
  const cards = [
    { amount: 2361.45, paid: 2361.45, remaining: 0 },
    { amount: 500, paid: 600, remaining: 0 },
  ];

  assert.equal(outstandingCardDue(cards), 0);
});

test('payments are applied after the statement cycle closes, independent of planning month', () => {
  const cardId = 'fab-card';
  const payments = [
    { toCreditCardId: cardId, amount: 100, date: '2026-07-30T12:00:00.000Z', planningMonth: 7 },
    { toCreditCardId: cardId, amount: 2361, date: '2026-08-02T12:00:00.000Z', planningMonth: 9 },
    { toCreditCardId: 'another-card', amount: 500, date: '2026-08-03T12:00:00.000Z', planningMonth: 8 },
    { toCreditCardId: cardId, amount: 25, date: '2026-09-01T12:00:00.000Z', planningMonth: 8 },
  ];

  assert.equal(
    paymentsForStatement(payments, cardId, new Date('2026-07-31T19:59:59.999Z'), new Date('2026-08-31T19:59:59.999Z')),
    2361
  );
});

test('an estimated statement includes payments made during its cycle', () => {
  const payments = [
    { toCreditCardId: 'cbd-card', amount: 81, date: '2026-07-22T00:00:00.000Z' },
    { toCreditCardId: 'cbd-card', amount: 81, date: '2026-06-21T00:00:00.000Z' },
  ];

  assert.equal(
    paymentsForStatement(payments, 'cbd-card', new Date('2026-07-05T19:59:59.999Z'), new Date('2026-08-31T19:59:59.999Z')),
    81
  );
});

test('a stale overlapping statement is not used for a configured cycle', () => {
  const expectedStart = new Date('2026-06-05T20:00:00.000Z');
  const expectedEnd = new Date('2026-07-05T19:59:59.999Z');

  assert.equal(sameStatementCycle({ cycleStart: expectedStart, cycleEnd: expectedEnd }, expectedStart, expectedEnd), true);
  assert.equal(sameStatementCycle({ cycleStart: '2026-06-06T20:00:00.000Z', cycleEnd: '2026-07-06T19:59:59.999Z' }, expectedStart, expectedEnd), false);
});

test('a day 1 to day 31 card cycle starts in the same month as it ends', () => {
  const cycleEnd = new Date(2026, 6, 31, 23, 59, 59, 999);
  const cycleStart = cycleStartForEnd(cycleEnd, 1, 31);

  assert.equal(cycleStart.getFullYear(), 2026);
  assert.equal(cycleStart.getMonth(), 6);
  assert.equal(cycleStart.getDate(), 1);
});

test('a wrapping day 6 to day 5 cycle starts in the previous month', () => {
  const cycleEnd = new Date(2026, 7, 5, 23, 59, 59, 999);
  const cycleStart = cycleStartForEnd(cycleEnd, 6, 5);

  assert.equal(cycleStart.getMonth(), 6);
  assert.equal(cycleStart.getDate(), 6);
});

test('an open statement cycle is excluded as of today', () => {
  const today = new Date('2026-08-02T12:00:00.000Z');

  assert.equal(isCycleClosed(new Date('2026-07-31T19:59:59.999Z'), today), true);
  assert.equal(isCycleClosed(new Date('2026-08-05T19:59:59.999Z'), today), false);
});

test('payments within an open cycle reduce its projected upcoming bill', () => {
  assert.equal(projectedCardBill(81, 81), 0);
  assert.equal(projectedCardBill(680, 100), 580);
  assert.equal(projectedCardBill(50, 75), 0);
});

test('salary debit breakdown separates account and savings expenses after recoveries', () => {
  const expenses = [
    { _id: 'current', paymentMethod: 'current_account', amount: 500, description: 'Account debit' },
    { _id: 'savings', paymentMethod: 'savings', amount: 300, description: 'Savings debit' },
    { _id: 'cash', paymentMethod: 'cash', amount: 100, description: 'Cash debit' },
  ];
  const recoveries = [{ expenseId: 'current', amount: 50 }];

  assert.equal(debitItemsForMethods(expenses, recoveries, ['current_account']).reduce((sum, row) => sum + row.amount, 0), 450);
  assert.equal(debitItemsForMethods(expenses, recoveries, ['savings']).reduce((sum, row) => sum + row.amount, 0), 300);
});

test('credit-card payment transfers are salary debits from their source account', () => {
  const transfers = [
    { _id: 'p1', amount: 2361.45, date: new Date('2026-08-01'), fromAccountType: 'current', description: 'FAB bill', fromMemberId: { name: 'Kiran' }, toCreditCardId: { name: 'FAB' } },
    { _id: 'p2', amount: 400, date: new Date('2026-08-02'), fromAccountType: 'savings', fromSavingsAccountId: { name: 'Savings' }, toCreditCardId: { name: 'CBD' } },
  ];
  const current = cardPaymentDebitItems(transfers, 'current');
  const savings = cardPaymentDebitItems(transfers, 'savings');

  assert.equal(current.length, 1);
  assert.equal(current[0].amount, 2361.45);
  assert.equal(current[0].card, 'FAB');
  assert.equal(savings.length, 1);
  assert.equal(savings[0].amount, 400);
});

test('pending recurring items are grouped by person and payment source', () => {
  const groups = groupPendingRecurringItems([
    { subscriptionId: '1', name: 'Codex', memberId: 'kiran', member: 'Kiran', sourceId: 'card-1', source: 'Noon', sourceType: 'Credit card', paymentMethod: 'credit_card', dayOfMonth: 15, amount: 401 },
    { subscriptionId: '2', name: 'Noon One', memberId: 'kiran', member: 'Kiran', sourceId: 'card-1', source: 'Noon', sourceType: 'Credit card', paymentMethod: 'credit_card', dayOfMonth: 6, amount: 15 },
    { subscriptionId: '3', name: 'Mortgage', memberId: 'padma', member: 'Padmapriya', sourceId: 'padma', source: 'Padmapriya Account', sourceType: 'Account', paymentMethod: 'current_account', dayOfMonth: 5, amount: 7711 },
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].source, 'Padmapriya Account');
  assert.equal(groups[1].source, 'Noon');
  assert.equal(groups[1].amount, 416);
  assert.deepEqual(groups[1].items.map((item) => item.dayOfMonth), [6, 15]);
});

test('credit-card recurring commitments do not reduce salary left to use', () => {
  const items = [
    { name: 'Mortgage', paymentMethod: 'current_account', amount: 7711 },
    { name: 'Savings plan', paymentMethod: 'savings', amount: 500 },
    { name: 'Spotify', paymentMethod: 'credit_card', amount: 24 },
  ];

  assert.deepEqual(salaryFundedRecurringItems(items).map((item) => item.name), ['Mortgage', 'Savings plan']);
});
