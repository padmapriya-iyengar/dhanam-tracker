function allocateOpenCyclePayment(currentPayments, previousPurchases, previousPayments) {
  const previousOutstanding = Math.max(Number(previousPurchases || 0) - Number(previousPayments || 0), 0);
  const appliedToCurrent = Math.max(Number(currentPayments || 0) - previousOutstanding, 0);
  return { previousOutstanding, appliedToCurrent };
}

function allocateOpenCycleEvents(previousOutstanding, purchases, payments) {
  let previousRemaining = Math.max(Number(previousOutstanding || 0), 0);
  let currentOutstanding = 0;
  let appliedToCurrent = 0;
  const events = [
    ...purchases.map((row) => ({ type: 'purchase', date: new Date(row.date), amount: Number(row.amount || 0) })),
    ...payments.map((row) => ({ type: 'payment', date: new Date(row.date), amount: Number(row.amount || 0) })),
  ].sort((a, b) => (a.date - b.date) || (a.type === 'purchase' ? -1 : 1));

  events.forEach((event) => {
    if (event.type === 'purchase') {
      currentOutstanding += event.amount;
      return;
    }
    const appliedToPrevious = Math.min(previousRemaining, event.amount);
    previousRemaining -= appliedToPrevious;
    const availableForCurrent = event.amount - appliedToPrevious;
    const currentReduction = Math.min(currentOutstanding, availableForCurrent);
    currentOutstanding -= currentReduction;
    appliedToCurrent += currentReduction;
  });
  return { previousRemaining, currentOutstanding, appliedToCurrent };
}

module.exports = { allocateOpenCycleEvents, allocateOpenCyclePayment };
