# Dhanam Web — Enhancement Backlog

## Purpose

This document captures future enhancements for the Dhanam web application. It is separate from the mobile roadmap:

- **Web** is optimized for detailed analysis, planning, reconciliation, bulk operations, administration, exports, and keyboard-heavy workflows.
- **Mobile** is optimized for fast capture, daily review, alerts, and native device capabilities.
- Both clients should share the same financial rules and backend APIs without being identical interfaces.

The existing web application already supports the core domains: dashboard, expenses, income, transfers, recurring expenses, accounts, savings, credit cards, reconciliation, categories, members, users, reports, AI insights, finance chat, bank-message import, balances, and category goals.

---

## 1. Dashboard and financial command center

### 1.1 Customizable dashboard

- Let users reorder dashboard widgets by drag and drop.
- Allow widgets to be hidden, resized, or restored.
- Save dashboard layouts per user.
- Provide layout presets such as Overview, Budget Focus, Cards Focus, and Household.
- Add full-screen presentation mode for monthly finance reviews.
- Add a "reset to default layout" action.

### 1.2 Global date and scope controls

- Add a persistent global date selector used by dashboard widgets.
- Support month, quarter, year, year-to-date, and custom ranges.
- Filter by household member, account, category, and currency.
- Clearly show which widgets use the global filter and which have local filters.
- Save frequently used scopes.

### 1.3 Financial health summary

- Add assets, liabilities, and calculated net worth.
- Show cash-flow surplus/deficit.
- Show savings rate against a user-defined target.
- Show committed recurring costs versus discretionary spending.
- Show budget utilization and the number of goals at risk.
- Explain every metric through an accessible definition tooltip.

### 1.4 Attention center

- Add a consolidated attention panel for:
  - Cards due soon.
  - Unreconciled statements.
  - Categories over budget.
  - Recurring expenses not generated.
  - Failed or pending message imports.
  - Suspected duplicates.
  - Unusually large transactions.
- Allow dismiss, snooze, or direct resolution.
- Retain attention history for auditability.

### 1.5 Comparisons and forecasting

- Compare the selected period with the previous month, previous year, or a custom baseline.
- Add income, expense, and savings projections for the end of the month.
- Forecast category overspend from current spending velocity.
- Separate historical facts from projections visually.

---

## 2. Unified transaction workspace

### 2.1 Unified transaction ledger

- Add one workspace combining expenses, income, transfers, recoveries, and adjustments.
- Provide configurable table columns.
- Add sticky headers, column sorting, density controls, and frozen identifying columns.
- Open a transaction in a side panel without losing filters or scroll position.
- Support browser URLs for filtered views and individual records.

### 2.2 Advanced filtering and search

- Full-text search across descriptions, merchants, notes, sources, accounts, and card names.
- Filters for:
  - Transaction type.
  - Date range.
  - Amount range.
  - Member.
  - Category/subcategory.
  - Account/card.
  - Payment method.
  - Recurring-generated records.
  - Imported records.
  - Transactions with recoveries.
  - Transactions missing optional classification.
- Combine filters with AND/OR groups.
- Save, name, share, and set default filter views.
- Add filter chips and a visible result count.

### 2.3 Bulk operations

- Multi-select transactions across pages.
- Bulk category or subcategory reassignment.
- Bulk member, account, payment method, or tag change.
- Bulk archive/delete with dependency preview.
- Bulk mark reviewed.
- Export only selected rows.
- Show an operation summary and support undo where technically safe.

### 2.4 Transaction detail and audit history

- Add a dedicated transaction detail page or side panel.
- Show complete classification, account impact, recoveries, and linked recurring rule.
- Record an immutable change history: who changed what and when.
- Display before/after values.
- Allow authorized users to add internal notes.
- Link related records such as card payment transfer and statement reconciliation.

### 2.5 Split transactions

- Split one expense across multiple categories and subcategories.
- Support fixed amounts and percentages.
- Ensure split totals exactly match the original transaction.
- Attribute splits to different members or cost centers if enabled later.
- Display both parent transaction and split lines in reports without double counting.
- Allow split templates for common transactions.

### 2.6 Tags and custom labels

- Add user-defined tags independent of the category hierarchy.
- Filter and report by tags.
- Apply tags during manual entry, imports, and bulk operations.
- Support rules such as automatically tagging a merchant.

### 2.7 Duplicate management

- Detect likely duplicates using amount, date, merchant, member, and account.
- Show duplicate pairs/groups in a review queue.
- Let users keep both, merge metadata, or remove one.
- Prevent accidental duplicate saves through mutation idempotency.

---

## 3. Expense management

### 3.1 Faster desktop entry

- Add keyboard-first quick entry.
- Support tab-through forms and documented shortcuts.
- Provide recent merchant, category, member, and payment-source suggestions.
- Add "save and add another" and "duplicate transaction."
- Allow reusable expense templates.
- Keep a recoverable draft when navigating away.

### 3.2 Recovery improvements

- Show gross expense, total recovered, outstanding recoverable amount, and net expense.
- Add recovery source/type such as reimbursement, refund, shared expense, or insurance.
- Link recovery to a bank/account transaction when applicable.
- Support partial recoveries from multiple sources.
- Add recovery aging and outstanding-recovery reports.

### 3.3 Attachments and receipts

- Upload receipts, invoices, and supporting documents.
- Preview images and PDFs.
- Extract merchant, date, tax, and amount through OCR as suggestions.
- Define retention, access, storage limits, and secure deletion.
- Export attachments with an audit package.

### 3.4 Expense review workflow

- Add statuses such as unreviewed, reviewed, disputed, and reimbursable.
- Provide an inbox for transactions needing classification.
- Allow comments or review notes.
- Show review completeness by month.

---

## 4. Income and cash-flow planning

### 4.1 Income enhancements

- Add recurring income rules.
- Support expected versus received income.
- Track salary, bonus, interest, dividends, refund, and other source types.
- Allow income attachments such as payslips.
- Show income source concentration and trends.
- Flag missing expected income.

### 4.2 Cash-flow calendar

- Calendar view of expected income, recurring expenses, transfers, and card payments.
- Project daily account balances.
- Highlight possible negative-balance dates.
- Drag planned items to simulate timing changes without modifying actual records.
- Convert planned items to actual transactions through explicit confirmation.

### 4.3 Monthly planning

- Set expected income.
- Plan fixed commitments and category allocations.
- Calculate discretionary amount.
- Compare plan, actual, and forecast.
- Copy a plan from the previous month.
- Save reusable household plan templates.

---

## 5. Transfers and account integrity

### 5.1 Transfer improvements

- Add transfer detail views showing both sides of the movement.
- Prefill credit-card payment transfers from statement balances.
- Support scheduled/planned transfers.
- Detect transfers inferred from matching bank transactions.
- Add transfer status: planned, pending, completed, or failed.
- Prevent impossible same-account transfers.

### 5.2 Account reconciliation

- Add reconciliation for current and savings accounts, not only credit cards.
- Import or enter a bank closing balance.
- Compare expected and actual balances.
- Provide a discrepancy investigation workspace.
- Allow controlled adjustment entries with mandatory reason.
- Lock reconciled periods against accidental edits, with an authorized reopen action.

### 5.3 Running balances

- Add a running balance to account ledgers.
- Show opening balance, each transaction impact, and closing balance.
- Explain records excluded from balance calculations.
- Validate historical balance continuity.

---

## 6. Accounts, assets, and net worth

### 6.1 Expanded account types

- Improve support for current, savings, fixed deposit, investment, cash, loan, and other asset/liability accounts.
- Add institution, account number mask, interest rate, maturity date, and status where relevant.
- Archive closed accounts while retaining history.
- Prevent deletion when dependent transactions exist.

### 6.2 Net-worth tracking

- Track assets and liabilities over time.
- Add manual valuation entries for investments or other assets.
- Show net-worth trend and contribution by account.
- Separate cash-flow changes from valuation changes.
- Provide member-level and household-level views.

### 6.3 Goals and sinking funds

- Add savings goals with target amount and date.
- Link a goal to an account or track it virtually.
- Show required monthly contribution and progress.
- Support emergency fund, travel, education, and custom goals.
- Keep category spending budgets separate from savings goals.

---

## 7. Credit-card management

### 7.1 Statement workflow

- Add a statement list with draft, unreconciled, reconciled, and overdue states.
- Upload statement PDFs or CSV files.
- Parse statement lines into a review workspace.
- Match statement lines to recorded expenses and payments.
- Show unmatched, duplicated, and amount-mismatched items.
- Lock completed reconciliation with an audit trail.

### 7.2 Card payment planning

- Calculate expected payment from the reconciled statement.
- Add minimum due and total due fields.
- Show statement date, due date, days remaining, and payment status.
- Create a linked transfer for payment.
- Prevent the payment from being counted as a new expense.

### 7.3 Card analytics

- Compare card usage by month, member, and category.
- Show credit utilization when a credit limit is configured.
- Track annual fees, interest, late fees, rewards, and cashback.
- Estimate whether card rewards offset fees.
- Flag unexpected changes in statement totals.

### 7.4 Budget enhancements

- Support card-level and household-level budgets.
- Add threshold notifications.
- Allow budget copying between months.
- Add planned one-off purchases.
- Explain recoveries and refunds in budget calculations.

---

## 8. Recurring expenses and subscriptions

### 8.1 Recurring schedule improvements

- Add start date, end date, frequency, interval, and next due date.
- Support monthly, weekly, quarterly, yearly, and custom frequencies.
- Handle end-of-month dates safely.
- Pause, resume, archive, and skip one occurrence.
- Keep an occurrence history.

### 8.2 Generation workflow

- Preview all due recurring items before generation.
- Allow editing individual occurrences.
- Show already-generated and missing items.
- Make generation idempotent.
- Automatically link generated expense to its recurring rule.

### 8.3 Subscription intelligence

- Detect potential subscriptions from merchant patterns.
- Flag price increases and duplicate services.
- Show annualized cost.
- Add cancellation date and cancellation notes.
- Provide renewal reminders for annual subscriptions.

---

## 9. Categories, rules, and classification

### 9.1 Category administration

- Drag-and-drop category and subcategory ordering.
- Archive rather than delete categories with history.
- Merge categories and safely reassign all dependent records.
- Move subcategories between parent categories.
- Add icons alongside colors.
- Preview impact before category changes.

### 9.2 Classification rules

- Create rules using merchant/description text, amount range, account/card, or message sender.
- Rule actions can set category, subcategory, member, payment source, and tags.
- Prioritize rules and show conflicts.
- Preview which historical transactions would match.
- Optionally apply a rule retrospectively after review.
- Keep rule execution history.

### 9.3 Uncategorized review

- Dedicated queue for uncategorized or low-confidence transactions.
- Keyboard shortcuts for rapid classification.
- Show learned suggestions.
- Batch accept high-confidence suggestions.
- Track monthly classification completeness.

---

## 10. Reporting and analytics

### 10.1 Report builder

- Build reports using date, member, account, category, subcategory, tag, and transaction type.
- Select dimensions, metrics, grouping, sorting, and chart type.
- Save personal report definitions.
- Duplicate and edit saved reports.
- Pin reports to the dashboard.

### 10.2 Comparison reports

- Month-over-month, quarter-over-quarter, and year-over-year comparisons.
- Compare members, accounts, categories, and cards side by side.
- Show absolute and percentage variance.
- Drill down from any variance to source transactions.
- Handle zero-baseline percentage comparisons clearly.

### 10.3 Budget and variance reporting

- Planned versus actual versus forecast.
- Category and card budget variance.
- Recurring commitment analysis.
- Savings goal contribution variance.
- Highlight material deviations with configurable thresholds.

### 10.4 Household and member reports

- Income, expense, savings, and category mix per member.
- Shared versus individual spending where attribution exists.
- Contribution and consumption views without judgmental language.
- Member trend and comparison.

### 10.5 Merchant and payment analysis

- Top merchants and merchant trends.
- Payment-source mix.
- Cash versus current account versus card usage.
- Account/card-specific category mix.
- Recurring and one-off merchant segmentation.

### 10.6 Export and scheduled delivery

- Export reports as CSV, XLSX, and PDF.
- Preserve active filters and selected columns.
- Add print-friendly layouts.
- Schedule monthly report generation.
- Email delivery requires explicit configuration and secure recipient controls.
- Record export history without storing unnecessary financial copies.

### 10.7 Chart usability

- Accessible data tables for every chart.
- Download chart as image.
- Tooltips with exact values and definitions.
- Consistent colors across all reports.
- Drill-down by clicking chart segments.
- Graceful display when categories have very small values.

---

## 11. AI insights and assistant

### 11.1 Deeper AI insights

- Member-specific spending behavior.
- Month-over-month and year-over-year explanations.
- Category anomalies and trend changes.
- Savings target suggestions based on income and spending patterns.
- Recurring-cost and subscription analysis.
- Card budget and due-date risk.
- Positive progress, not only warnings.

### 11.2 Evidence and trust

- Every insight must state its date range and supporting metrics.
- Link insights to the exact filtered transactions or report.
- Separate deterministic calculations from model-generated interpretation.
- Show confidence/limitations where appropriate.
- Allow users to mark an insight useful, inaccurate, or irrelevant.

### 11.3 Assistant enhancements

- Retain optional conversation history per user.
- Suggested questions based on the current page and filters.
- Support report-building questions.
- Generate a preview before any requested data mutation.
- Require explicit confirmation for create/update/delete actions.
- Never let assistant-generated text bypass backend validation.

### 11.4 AI controls

- Per-user AI opt-in.
- Explain what structured data is sent.
- Never send passwords, tokens, raw attachments, or unnecessary personal data.
- Provide usage/cost controls and rate limits.
- Allow clearing message-category learning and assistant history.

---

## 12. Bank-message and data import

### 12.1 Import workspace

- Multi-message paste/import queue.
- Status columns: unanalyzed, needs review, duplicate suspected, ready, saved, dismissed, failed.
- Side-by-side original text and structured draft.
- Batch analysis but individual financial confirmation.
- Search and filter the queue.

### 12.2 File imports

- CSV import for expenses, income, transfers, and bank/card statements.
- Mapping wizard for source columns.
- Date, currency, and decimal-format configuration.
- Preview validation errors before import.
- Save import templates per bank.
- Idempotent import with duplicate detection.
- Download a result file containing accepted and rejected rows.

### 12.3 Foreign currency

- Preserve original amount and currency.
- Record conversion rate, converted amount, and rate date/source.
- Allow manual correction before confirmation.
- Report exchange-rate differences separately when needed.
- Expand supported currencies beyond AED and INR through backend changes.

---

## 13. Household, users, and permissions

### 13.1 Role-based access

- Define owner, administrator, editor, contributor, and viewer roles.
- Configure access by account/member where needed.
- Restrict user, export, delete, reconciliation, and settings operations.
- Enforce permissions in backend APIs, not only the interface.

### 13.2 Invitations and account lifecycle

- Invite users securely rather than setting their password manually.
- Email verification and password reset.
- Activate, suspend, and remove access.
- Show last login and active sessions.
- Allow a user to revoke other sessions.

### 13.3 Audit log

- Searchable log for authentication, user administration, transaction changes, reconciliation, imports, and exports.
- Record actor, timestamp, action, and affected entity.
- Do not place secrets or raw sensitive content in audit entries.
- Provide retention controls.

### 13.4 Member lifecycle

- Archive inactive household members without losing history.
- Reassign defaults and future recurring rules.
- Show dependency impact before archive/delete.
- Separate a financial member/profile from a login user.

---

## 14. Data quality and financial controls

### 14.1 Period close

- Mark a month reviewed and closed.
- Prevent ordinary edits to closed periods.
- Authorized reopen with mandatory reason.
- Checklist for uncategorized records, unreconciled accounts/cards, and missing recurring items.

### 14.2 Validation and consistency

- Centralize financial validation rules in the backend.
- Validate account/card requirements for every payment method.
- Prevent recovery beyond recoverable amount.
- Prevent double generation of recurring expenses.
- Detect orphaned references and invalid date/month/year combinations.
- Add controlled repair tools for administrators.

### 14.3 Data backup and restore

- User-initiated full data export.
- Document backup schedule and retention.
- Test restoration regularly.
- Provide a safe import/restore workflow with preview and confirmation.
- Never overwrite production data through an ordinary UI action.

---

## 15. User experience and productivity

### 15.1 Global command palette

- Keyboard shortcut to open navigation and actions.
- Search pages, accounts, members, categories, and transactions.
- Quick actions for add expense/income/transfer and open reports.
- Respect user permissions.

### 15.2 Keyboard shortcuts

- New record shortcuts.
- Save, cancel, next/previous record, focus search, and toggle filters.
- Display shortcuts in menus and a help dialog.
- Avoid conflicts with browser/system shortcuts.

### 15.3 Consistent record forms

- Shared components and validation for amount, date, member, account, category, and notes.
- Consistent add/edit flows across domains.
- Unsaved-change warnings.
- Field-level error messages.
- Draft restoration after recoverable errors.

### 15.4 Responsive web improvements

- Maintain a usable tablet experience without turning the web app into the mobile product.
- Replace overflowing tables with responsive column priority.
- Keep management and analysis workflows optimized for desktop widths.
- Improve focus management and modal/side-panel behavior.

### 15.5 Accessibility

- Full keyboard navigation.
- Visible focus states.
- Screen-reader labels and semantic headings.
- Text contrast and non-color status indicators.
- Accessible chart summaries and data tables.
- Zoom support without clipped controls.

### 15.6 Help and onboarding

- Contextual empty states with next actions.
- First-run setup checklist.
- Metric definitions and reconciliation guidance.
- Searchable help center.
- Release notes and "what changed" notices.

---

## 16. Platform, API, and engineering enhancements

These enhancements support both web and mobile.

### 16.1 API quality

- Version APIs.
- Publish request/response schemas.
- Standardize pagination, validation errors, filtering, and sorting.
- Add cursor pagination for large ledgers.
- Add idempotency keys for mutations.
- Add optimistic concurrency/version fields.
- Apply consistent authentication middleware to all user-owned resources.

### 16.2 Security

- Short-lived access tokens and refresh-token rotation.
- Secure cookies for web where the deployment architecture permits.
- Rate limiting and login-attempt protection.
- Password reset and stronger password policy.
- Security headers, strict CORS configuration, and request-size limits.
- Dependency and secret scanning.
- Encryption and backup policies appropriate for financial data.

### 16.3 Performance

- Server-side aggregation for large reports.
- Database indexes based on real query patterns.
- Lazy-load expensive dashboard/report sections.
- Cache stable reference data and selected aggregate responses.
- Avoid downloading full transaction sets for client-side filtering.
- Add report job processing for large exports.

### 16.4 Reliability and observability

- Structured server logs with sensitive-field redaction.
- Error and performance monitoring.
- Health/readiness endpoints.
- Background-job visibility and retry controls.
- Database migration versioning and safe rollback plans.
- Operational alerts for failed imports, report jobs, and notification jobs.

### 16.5 Testing

- Unit tests for accounting rules.
- Route/API integration tests.
- Frontend component tests for forms, filters, and reports.
- End-to-end coverage of major financial workflows.
- Accessibility checks in CI.
- Backup/restore and migration rehearsal.
- Regression fixtures for card reconciliation and recurring generation.

---

## Recommended priority

### Priority 0 — Financial correctness and foundation

- Centralized validation and accounting rules.
- Transaction detail and audit history.
- Idempotent mutations and recurring generation.
- Duplicate detection.
- Backend permission consistency.
- API contract tests.
- Secure session/password-reset foundation.

### Priority 1 — High-value web productivity

- Unified transaction workspace.
- Advanced filters and saved views.
- Bulk classification/editing.
- Split transactions.
- Category merge/archive and classification rules.
- CSV import with mapping and validation.
- Account running balances.

### Priority 2 — Planning and reconciliation

- Current/savings account reconciliation.
- Enhanced card statement matching.
- Cash-flow calendar.
- Expected income and monthly plans.
- Recurring schedule improvements.
- Period close workflow.

### Priority 3 — Reporting and intelligence

- Report builder and saved reports.
- Member, merchant, variance, and net-worth reports.
- Export/print/scheduled reports.
- Evidence-linked AI insights.
- Assistant report support with safe action previews.

### Priority 4 — Collaboration and expansion

- Roles, invitations, and granular permissions.
- User/session administration.
- Attachments and OCR.
- Assets, liabilities, savings goals, and valuation history.
- Advanced multi-currency accounting.

## Recommended first web enhancement slice

When web enhancements begin, start with a **transaction quality workspace**:

1. Create the unified transaction ledger.
2. Add a transaction detail side panel.
3. Add advanced filters and saved views.
4. Add audit history.
5. Add bulk category/member/account changes.
6. Add duplicate detection and review.
7. Add split expenses.
8. Add category classification rules.

This slice improves the highest-frequency administrative work and establishes reusable capabilities for imports, reconciliation, reports, and AI evidence links.

## Definition of done

Every enhancement should:

- Preserve correct accounting treatment and avoid double counting.
- Enforce security and ownership in backend APIs.
- Include loading, empty, error, and retry states.
- Handle dependency conflicts without silent data loss.
- Provide field-level validation and preserve unsaved user input after recoverable failures.
- Support keyboard navigation and accessible semantics.
- Work in light and dark themes.
- Refresh all affected aggregates after a mutation.
- Include proportionate unit, API, component, and end-to-end coverage.
- Avoid financial values, descriptions, raw messages, tokens, and passwords in analytics or logs.
- Include migration and rollback planning when stored data changes.

