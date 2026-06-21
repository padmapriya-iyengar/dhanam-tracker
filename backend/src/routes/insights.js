const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Member = require('../models/Member');

router.post('/', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
      return res.status(400).json({ error: 'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your .env file.' });
    }

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const [members, expenseByCategory, monthlyTrend, incomeData, topExpenses] = await Promise.all([
      Member.find({ userId: req.user._id, isActive: true }),
      Expense.aggregate([
        { $match: { userId: req.user._id, date: { $gte: threeMonthsAgo } } },
        { $group: { _id: '$categoryId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $project: { _id: 0, name: '$category.name', total: 1, count: 1 } },
        { $sort: { total: -1 } },
      ]),
      Expense.aggregate([
        { $match: { userId: req.user._id, date: { $gte: threeMonthsAgo } } },
        { $group: { _id: { month: '$month', year: '$year' }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Income.aggregate([
        { $match: { userId: req.user._id, date: { $gte: threeMonthsAgo } } },
        { $group: { _id: { month: '$month', year: '$year' }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Expense.aggregate([
        { $match: { userId: req.user._id, date: { $gte: threeMonthsAgo } } },
        { $sort: { amount: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $lookup: { from: 'members', localField: 'memberId', foreignField: '_id', as: 'member' } },
        { $unwind: '$member' },
        { $project: { amount: 1, description: 1, date: 1, 'category.name': 1, 'member.name': 1 } },
      ]),
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatMonth = (m, y) => `${monthNames[m - 1]} ${y}`;

    const totalIncome = incomeData.reduce((s, m) => s + m.total, 0);
    const totalExpense = expenseByCategory.reduce((s, c) => s + c.total, 0);
    const avgMonthlyIncome = totalIncome / 3;
    const avgMonthlyExpense = totalExpense / 3;
    const currency = req.user.currency || 'AED';
    const locale = currency === 'INR' ? 'en-IN' : 'en-AE';
    const currencyName = currency === 'INR' ? 'Indian Rupee (INR)' : 'UAE Dirham (AED)';
    const money = (amount) => `${currency} ${Number(amount || 0).toLocaleString(locale, { maximumFractionDigits: 0 })}`;

    const financialSummary = `
## Household Financial Summary (Last 3 Months)

**Family Members:** ${members.map((m) => m.name).join(' and ')}

**Income:**
${incomeData.map((m) => `- ${formatMonth(m._id.month, m._id.year)}: ${money(m.total)}`).join('\n')}
- Average Monthly Income: ${money(avgMonthlyIncome)}

**Expenses by Category:**
${expenseByCategory.map((c) => `- ${c.name}: ${money(c.total)} (${c.count} transactions)`).join('\n')}

**Monthly Expense Trend:**
${monthlyTrend.map((m) => `- ${formatMonth(m._id.month, m._id.year)}: ${money(m.total)}`).join('\n')}
- Average Monthly Expense: ${money(avgMonthlyExpense)}

**Net Savings (3 months):** ${money(totalIncome - totalExpense)}
**Average Savings Rate:** ${totalIncome > 0 ? ((((totalIncome - totalExpense) / totalIncome) * 100)).toFixed(1) : 0}%

**Top Individual Expenses:**
${topExpenses.map((e) => `- ${money(e.amount)} on ${e.category.name}${e.description ? ` (${e.description})` : ''} by ${e.member.name}`).join('\n')}
`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are a friendly personal finance advisor. Analyze this financial data and provide clear, actionable insights in a warm, encouraging tone. Use ${currencyName} in your analysis. Be specific with amounts and percentages.

${financialSummary}

Please provide:
1. **Overall Financial Health** - A brief assessment (2-3 sentences)
2. **Top 3 Spending Insights** - Where money is going and what's notable
3. **Savings Opportunities** - 3 specific areas where they can cut back, with estimated savings
4. **Positive Patterns** - What they're doing well
5. **Action Plan** - 3 concrete steps for next month

Keep each section concise. Use bullet points. Be specific, practical, and encouraging.`,
        },
      ],
    });

    res.json({
      insights: message.content[0].text,
      summary: { totalIncome, totalExpense, savings: totalIncome - totalExpense, avgMonthlyIncome, avgMonthlyExpense },
      generatedAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
