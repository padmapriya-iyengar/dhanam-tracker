const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Member = require('../models/Member');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const CreditCard = require('../models/CreditCard');
const SavingsAccount = require('../models/SavingsAccount');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const MessageCategoryLearning = require('../models/MessageCategoryLearning');

const CLASSIFICATIONS = new Set(['expense', 'income', 'transfer', 'refund', 'reminder', 'unknown']);
const STATUSES = new Set(['completed', 'pending', 'unknown']);
const objectId = (value) => mongoose.isValidObjectId(value) ? String(value) : null;
const cleanText = (value, max = 160) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const normalizeMerchant = (value) => cleanText(value, 180)
  .toLowerCase()
  .replace(/\b(aed|usd|inr|transaction|debit|credit|payment|purchase|card|account|acct|a\/c)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const termsFor = (...values) => [...new Set(values
  .flatMap((value) => normalizeMerchant(value).split(' '))
  .filter((term) => term.length >= 3 && !/^\d+$/.test(term))
  .slice(0, 16))];

function relevantLearnings(message, learnings, allowedCategoryIds, allowedSubCategoryIds) {
  const messageTerms = new Set(termsFor(message));
  return learnings
    .filter((item) => allowedCategoryIds.has(String(item.categoryId)))
    .map((item) => ({
      item,
      score: (item.matchTerms || []).reduce((sum, term) => sum + (messageTerms.has(term) ? 1 : 0), 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.confirmationCount - a.item.confirmationCount)
    .slice(0, 12)
    .map(({ item }) => ({
      merchant: item.merchantLabel,
      descriptionHint: item.descriptionHint,
      categoryId: String(item.categoryId),
      subCategoryId: allowedSubCategoryIds.has(String(item.subCategoryId)) ? String(item.subCategoryId) : null,
      confirmations: item.confirmationCount,
    }));
}

function extractJson(text) {
  const cleaned = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The AI did not return a usable transaction draft.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callOpenAIJson({ apiKey, model, messages, maxCompletionTokens = 1800 }) {
  const requestBody = {
    model,
    messages,
    response_format: { type: 'json_object' },
    max_completion_tokens: maxCompletionTokens,
  };
  if (model.startsWith('gpt-5')) requestBody.reasoning_effort = 'minimal';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI request failed (${response.status}).`);
  return extractJson(payload.choices?.[0]?.message?.content);
}

function allowedId(value, ids) {
  const normalized = objectId(value);
  return normalized && ids.has(normalized) ? normalized : null;
}

function normalizeResult(raw, context) {
  const classification = CLASSIFICATIONS.has(raw.classification) ? raw.classification : 'unknown';
  const status = STATUSES.has(raw.status) ? raw.status : 'unknown';
  const amount = Number(raw.amount);
  const confidence = Math.max(0, Math.min(1, Number(raw.confidence) || 0));
  const dateValue = raw.transactionDate || raw.date;
  const parsedDate = dateValue ? new Date(dateValue) : null;
  const explicitCalendarDate = typeof dateValue === 'string' ? dateValue.match(/^\d{4}-\d{2}-\d{2}/)?.[0] : null;
  const transactionDate = explicitCalendarDate || (parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : null);

  const accountType = ['current', 'savings', 'credit_card'].includes(raw.accountType) ? raw.accountType : null;
  let accountId = null;
  if (accountType === 'current') accountId = allowedId(raw.accountId, context.memberIds);
  if (accountType === 'savings') accountId = allowedId(raw.accountId, context.savingsIds);
  if (accountType === 'credit_card') accountId = allowedId(raw.accountId, context.cardIds);

  const categoryId = allowedId(raw.categoryId, context.categoryIds);
  let subCategoryId = allowedId(raw.subCategoryId, context.subCategoryIds);
  if (subCategoryId && context.subCategoryParents.get(subCategoryId) !== categoryId) subCategoryId = null;
  let memberId = allowedId(raw.memberId, context.memberIds);
  const selectedAccount = context.accounts.find((item) => item.type === accountType && item.id === accountId);
  if (!memberId && selectedAccount?.memberId) memberId = selectedAccount.memberId;

  const warnings = Array.isArray(raw.warnings) ? raw.warnings.map((item) => cleanText(item, 220)).filter(Boolean).slice(0, 6) : [];
  if (!Number.isFinite(amount) || amount <= 0) warnings.push('A valid transaction amount was not found.');
  if (!transactionDate) warnings.push('The transaction date could not be determined.');
  if (!accountId && ['expense', 'income', 'refund'].includes(classification)) warnings.push('No Dhanam account could be matched confidently.');
  if (classification === 'expense' && !categoryId) warnings.push('Please choose an expense category.');
  if (status !== 'completed') warnings.push('This message does not clearly describe a completed transaction.');
  const currency = cleanText(raw.currency, 3).toUpperCase() || context.currency;
  if (currency !== context.currency) warnings.push(`The message amount is in ${currency}; confirm the amount before recording it in ${context.currency}.`);

  return {
    classification,
    status,
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency,
    transactionDate,
    merchant: cleanText(raw.merchant || raw.source),
    description: cleanText(raw.description || raw.merchant || raw.source, 240),
    memberId,
    accountType,
    accountId,
    categoryId,
    subCategoryId,
    confidence,
    reasoning: cleanText(raw.reasoning, 400),
    warnings: [...new Set(warnings)],
  };
}

async function findDuplicates(userId, draft) {
  if (!draft.amount || !draft.transactionDate || !['expense', 'income', 'refund'].includes(draft.classification)) return [];
  const date = new Date(draft.transactionDate);
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  const model = draft.classification === 'expense' ? Expense : Income;
  const filter = { userId, amount: draft.amount, date: { $gte: start, $lte: end } };
  if (draft.memberId) filter.memberId = draft.memberId;
  if (draft.classification === 'expense') {
    if (draft.accountType === 'credit_card') filter.creditCardId = draft.accountId;
    if (draft.accountType === 'savings') filter.savingsAccountId = draft.accountId;
  } else if (draft.accountType === 'savings') {
    filter.savingsAccountId = draft.accountId;
  }
  const matches = await model.find(filter).limit(5).lean();
  return matches.map((item) => ({
    id: String(item._id),
    type: draft.classification === 'expense' ? 'expense' : 'income',
    amount: item.amount,
    date: item.date,
    description: item.description || item.source || '',
  }));
}

router.post('/analyze', async (req, res) => {
  try {
    const message = cleanText(req.body.message, 4000);
    if (message.length < 8) return res.status(400).json({ error: 'Paste a complete bank or card message to analyze.' });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return res.status(400).json({ error: 'OpenAI API key is not configured on the backend.' });
    }

    const [members, categories, subCategories, cards, savings, learnings] = await Promise.all([
      Member.find({ userId: req.user._id, isActive: true }).lean(),
      Category.find({ isActive: true }).lean(),
      SubCategory.find({ isActive: true }).lean(),
      CreditCard.find({ userId: req.user._id, isActive: true }).lean(),
      SavingsAccount.find({ userId: req.user._id }).lean(),
      MessageCategoryLearning.find({ userId: req.user._id }).sort({ lastConfirmedAt: -1 }).limit(250).lean(),
    ]);
    const accounts = [
      ...members.map((item) => ({ type: 'current', id: String(item._id), name: `${item.name} Current Account`, memberId: String(item._id) })),
      ...savings.map((item) => ({ type: 'savings', id: String(item._id), name: item.name, bankName: item.bankName || '', lastFourDigits: item.lastFourDigits || '', memberId: String(item.memberId) })),
      ...cards.map((item) => ({ type: 'credit_card', id: String(item._id), name: item.name, bankName: item.bankName, lastFourDigits: item.lastFourDigits || '', memberId: String(item.memberId) })),
    ];
    const categoryOptions = categories.map((item) => ({
      id: String(item._id), name: item.name,
      subcategories: subCategories.filter((sub) => String(sub.categoryId) === String(item._id)).map((sub) => ({ id: String(sub._id), name: sub.name })),
    }));
    const categoryIds = new Set(categories.map((item) => String(item._id)));
    const subCategoryIds = new Set(subCategories.map((item) => String(item._id)));
    const learnedExamples = relevantLearnings(message, learnings, categoryIds, subCategoryIds);
    const model = process.env.OPENAI_MESSAGE_MODEL || process.env.OPENAI_MODEL || 'gpt-5-mini';
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.APP_TIMEZONE || 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const prompt = `You extract financial facts from a pasted bank/SMS notification for Dhanam.
This is semantic extraction, not template matching. Never invent an ID. Select IDs only from the supplied options.
Classify as expense, income, transfer, refund, reminder, or unknown.
status is completed only when the text says money was actually debited, credited, spent, received, or transferred. "due", "will be recovered", OTP, available balance and marketing messages are not completed transactions.
The transaction amount is not an available limit or balance. For foreign currency, retain the transaction currency and amount; never use an account balance as a conversion.
Use ISO 8601 for transactionDate. Today is ${today}; timezone is ${process.env.APP_TIMEZONE || 'Asia/Dubai'}.
For current accounts, accountId is the member ID. Choose a category only for an expense/refund when appropriate.
For completed expenses, actively select the most specific suitable category and subcategory from the supplied list. Use Miscellaneous/Other only when no merchant purpose or transaction meaning supports any more specific option. Merchant meaning (for example Spotify as streaming or RTA as transport) is more important than generic bank wording.
Past confirmed choices are user-specific examples. Prefer them when the merchant or purpose is similar, but still interpret the current message rather than blindly copying an unrelated example.
Return JSON only with keys: classification, status, amount, currency, transactionDate, merchant, description, memberId, accountType, accountId, categoryId, subCategoryId, confidence, reasoning, warnings.

Members: ${JSON.stringify(members.map((item) => ({ id: String(item._id), name: item.name, role: item.role })))}
Accounts: ${JSON.stringify(accounts)}
Categories: ${JSON.stringify(categoryOptions)}
Relevant past confirmed category choices: ${JSON.stringify(learnedExamples)}
User base currency: ${req.user.currency || 'AED'}

Message:
${message}`;
    const rawDraft = await callOpenAIJson({
      apiKey,
      model,
      messages: [
        { role: 'system', content: 'Return one strict JSON object and no markdown.' },
        { role: 'user', content: prompt },
      ],
    });
    const context = {
      currency: req.user.currency || 'AED',
      accounts,
      memberIds: new Set(members.map((item) => String(item._id))),
      savingsIds: new Set(savings.map((item) => String(item._id))),
      cardIds: new Set(cards.map((item) => String(item._id))),
      categoryIds,
      subCategoryIds,
      subCategoryParents: new Map(subCategories.map((item) => [String(item._id), String(item.categoryId)])),
    };
    const draft = normalizeResult(rawDraft, context);
    const learnedMatch = learnings
      .filter((item) => normalizeMerchant(item.merchantLabel) === normalizeMerchant(draft.merchant))
      .filter((item) => categoryIds.has(String(item.categoryId)))
      .sort((a, b) => b.confirmationCount - a.confirmationCount)[0];
    if (draft.classification === 'expense' && learnedMatch) {
      draft.categoryId = String(learnedMatch.categoryId);
      draft.subCategoryId = subCategoryIds.has(String(learnedMatch.subCategoryId)) ? String(learnedMatch.subCategoryId) : null;
      draft.reasoning = `${draft.reasoning}${draft.reasoning ? ' ' : ''}Category follows your previously confirmed choice for this merchant.`;
    }
    const selectedCategory = categories.find((item) => String(item._id) === draft.categoryId);
    const selectedSubCategory = subCategories.find((item) => String(item._id) === draft.subCategoryId);
    const selectedCatchAll = /misc|other/i.test(selectedCategory?.name || '') || /misc|other/i.test(selectedSubCategory?.name || '');
    if (draft.classification === 'expense' && !learnedMatch && selectedCatchAll && draft.merchant) {
      try {
        const specificCategories = categoryOptions
          .filter((item) => !/misc|other/i.test(item.name))
          .map((item) => ({ ...item, subcategories: item.subcategories.filter((sub) => !/misc|other/i.test(sub.name)) }));
        const specificCategoryIds = new Set(specificCategories.map((item) => item.id));
        const specificSubCategoryIds = new Set(specificCategories.flatMap((item) => item.subcategories.map((sub) => sub.id)));
        const reconsidered = await callOpenAIJson({
          apiKey,
          model,
          maxCompletionTokens: 600,
          messages: [
            {
              role: 'system',
              content: 'Select the most semantically appropriate specific category for an expense. Return JSON only.',
            },
            {
              role: 'user',
              content: `The first categorization used a catch-all category. Reconsider it using merchant purpose and the specific choices below.
Return categoryId, subCategoryId, confidence, and reasoning. Use null only when no choice is defensible.
Merchant: ${draft.merchant}
Description: ${draft.description}
Original message: ${message}
Specific categories: ${JSON.stringify(specificCategories)}`,
            },
          ],
        });
        const reconsideredCategoryId = allowedId(reconsidered.categoryId, specificCategoryIds);
        const reconsideredSubCategoryId = allowedId(reconsidered.subCategoryId, specificSubCategoryIds);
        const reconsideredConfidence = Number(reconsidered.confidence) || 0;
        const validSubcategory = !reconsideredSubCategoryId
          || context.subCategoryParents.get(reconsideredSubCategoryId) === reconsideredCategoryId;
        if (reconsideredCategoryId && validSubcategory && reconsideredConfidence >= 0.5) {
          draft.categoryId = reconsideredCategoryId;
          draft.subCategoryId = reconsideredSubCategoryId;
          draft.reasoning = cleanText(reconsidered.reasoning, 400) || draft.reasoning;
        }
      } catch (refinementError) {
        console.warn('Message category refinement skipped:', refinementError.message);
      }
    }
    const duplicates = await findDuplicates(req.user._id, draft);
    res.json({ draft, duplicates, options: { members: members.map(({ _id, name }) => ({ id: String(_id), name })), accounts, categories: categoryOptions } });
  } catch (err) {
    console.error('Message import analysis failed:', err.message);
    res.status(400).json({ error: err.message });
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const merchantLabel = cleanText(req.body.merchant || req.body.description, 160);
    const merchantKey = normalizeMerchant(merchantLabel);
    if (merchantKey.length < 2) return res.status(400).json({ error: 'A merchant or description is required for category learning.' });
    const categoryId = objectId(req.body.categoryId);
    const subCategoryId = objectId(req.body.subCategoryId);
    const category = categoryId ? await Category.findOne({ _id: categoryId, isActive: true }).lean() : null;
    if (!category) return res.status(400).json({ error: 'Choose a valid category before saving feedback.' });
    let validSubCategoryId = null;
    if (subCategoryId) {
      const sub = await SubCategory.findOne({ _id: subCategoryId, categoryId, isActive: true }).lean();
      if (sub) validSubCategoryId = subCategoryId;
    }
    const descriptionHint = cleanText(req.body.description, 180);
    const matchTerms = termsFor(merchantLabel, descriptionHint);
    const existing = await MessageCategoryLearning.findOne({ userId: req.user._id, merchantKey });
    const sameChoice = existing
      && String(existing.categoryId) === categoryId
      && String(existing.subCategoryId || '') === String(validSubCategoryId || '');
    const confirmationCount = sameChoice ? existing.confirmationCount + 1 : 1;
    const learning = await MessageCategoryLearning.findOneAndUpdate(
      { userId: req.user._id, merchantKey },
      {
        $set: {
          merchantLabel,
          descriptionHint,
          matchTerms,
          categoryId,
          subCategoryId: validSubCategoryId,
          lastConfirmedAt: new Date(),
          confirmationCount,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ learned: true, confirmationCount: learning.confirmationCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
