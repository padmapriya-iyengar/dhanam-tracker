const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Member = require('../models/Member');

async function generateOpenAIInsights({ prompt, apiKey, model }) {
  const requestBody = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_completion_tokens: 4000,
  };

  if (model.startsWith('gpt-5')) {
    requestBody.reasoning_effort = 'minimal';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || `OpenAI request failed with status ${response.status}`;
    throw new Error(message);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    const finishReason = payload.choices?.[0]?.finish_reason;
    const detail = finishReason ? ` Finish reason: ${finishReason}.` : '';
    throw new Error(`OpenAI returned an empty insights response.${detail}`);
  }
  return text;
}

router.post('/', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return res.status(400).json({ error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your backend .env file.' });
    }
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

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

    const prompt = `You are a friendly personal finance advisor. Analyze this financial data and provide clear, actionable insights in a warm, encouraging tone. Use ${currencyName} in your analysis. Be specific with amounts and percentages.

${financialSummary}

Return ONLY Markdown using this exact structure and headings:

## Overall Financial Health
- 2 to 3 bullets.
- Start each bullet with a short bold label, then a practical explanation.

## Spending Insights
- Exactly 3 bullets about where money is going and what is notable.
- Include concrete amounts or percentages where useful.

## Savings Opportunities
- Exactly 3 bullets.
- Each bullet must include an estimated AED/INR saving or reduction range.

## Positive Patterns
- 2 to 3 bullets about what is going well.

## Action Plan
- Exactly 3 bullets for next month.
- Each bullet should be a concrete action, not a generic suggestion.

Keep every bullet concise. Do not use long paragraphs. Do not add any sections outside the requested headings.`;

    const insights = await generateOpenAIInsights({ prompt, apiKey, model });

    res.json({
      insights,
      summary: { totalIncome, totalExpense, savings: totalIncome - totalExpense, avgMonthlyIncome, avgMonthlyExpense },
      generatedAt: new Date(),
      model,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
