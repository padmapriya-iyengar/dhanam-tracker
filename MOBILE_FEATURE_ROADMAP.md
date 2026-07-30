# Dhanam Mobile — Product Feature Roadmap

## Product direction

Dhanam Mobile will be a separate, native-first personal and family finance application. It will use the same finance data and backend concepts as the web application, but it will not reproduce the web application's sidebar, wide tables, dense dashboards, collapsible report panels, or administrative workflows screen-for-screen.

The web application remains the best place for deep analysis and bulk administration. Mobile should excel at:

1. Capturing a transaction in seconds.
2. Showing what needs attention today.
3. Answering "where did my money go?" quickly.
4. Handling bank messages, card bills, recoveries, and recurring payments while they are fresh.
5. Working reliably with intermittent connectivity.
6. Using native capabilities such as notifications, share-to-app, camera, biometrics, and widgets.

## Capability inventory found in the web application

The web application currently contains these business areas:

- Authentication, session restoration, demo access, users, currency, and theme.
- Monthly dashboard with income, expense, savings, accounting reality, card budgets, category goals, and account balances.
- Expense CRUD, filters, payment sources, recoveries, and pagination.
- Income CRUD, member/source/account assignment, filters, and totals.
- Transfers among current accounts, savings accounts, and credit cards.
- Recurring expenses and generation of monthly expense records.
- Savings/current/fixed-deposit/investment account management.
- Credit-card management, monthly budgets, statement cycles, monthly trends, and reconciliation.
- Unified account ledger and category comparison across selected months.
- Category/subcategory, member, and user administration.
- Reports: summary, category/subcategory breakdowns, daily spend, comparisons, and 12-month trends.
- AI-generated insights and a finance chat assistant.
- Bank-message analysis, editable review, confirmation, and category-learning feedback.
- Opening balances and category spending goals.

All of these domain capabilities are considered below, but several are intentionally redesigned or deferred on mobile.

---

## Proposed mobile information architecture

### Primary bottom navigation

Use five stable destinations:

1. **Home** — today/month overview, attention items, budgets, recent activity.
2. **Activity** — unified transaction timeline with search and filters.
3. **Add** — a prominent central action that opens the quick-capture sheet.
4. **Plan** — budgets, recurring payments, goals, and cash-flow planning.
5. **Profile** — accounts, cards, household, preferences, security, and support.

Reports and AI are reached from Home and Plan as contextual features, not permanent top-level tabs. Expenses and income should not be separate tabs because users usually search and review them as one financial timeline.

### Navigation principles

- Push into record details instead of opening web-style modals.
- Use bottom sheets for small choices and full-screen flows for multi-step entry.
- Preserve the user's last filter and selected account locally.
- Support deep links to a transaction, card statement, recurring item, budget, or notification.
- Keep the primary add action reachable with one thumb from every main tab.

---

## Epic 1 — App foundation, identity, and security

### 1.1 Native app shell

- Native splash screen, launcher icon, adaptive Android icon, and iOS app icon.
- Safe-area-aware layouts, keyboard avoidance, gesture navigation, and hardware-back handling.
- Light, dark, and system themes using accessible color contrast.
- Text-size scaling and screen-reader labels.
- Consistent native loading, empty, error, offline, and retry states.
- Haptic feedback for successful saves, destructive confirmations, and quick actions.

### 1.2 Authentication

- Email/password login.
- Demo login clearly marked as non-private sample data.
- Secure token storage in Keychain/Keystore rather than ordinary local storage.
- Restore session on app launch and refresh invalid sessions gracefully.
- Logout from Profile and automatic return to login when authentication expires.
- Show the active user's name, currency, and data mode.

### 1.3 Mobile security additions

- Optional biometric/PIN app lock after login.
- Configurable lock timeout: immediately, 1 minute, 5 minutes, or never.
- Hide monetary values in the app switcher and when the user taps a privacy toggle.
- Optional screenshot blocking on sensitive Android screens.
- Device/session list and remote session revocation when backend support is added.
- Clear cached financial data on logout.

### 1.4 Onboarding

- Short product introduction focused on capture, planning, and alerts.
- Select base currency and locale.
- Create the first household member.
- Add a current/savings account and optionally a credit card.
- Choose notification preferences.
- Offer message import or a manual first transaction.
- Progressively skip optional steps and allow completion later.

---

## Epic 2 — Mobile Home

Home should answer three questions: "How am I doing?", "What changed?", and "What needs action?"

### 2.1 Header and month control

- Greeting, user avatar, privacy toggle, and notification inbox.
- Swipe or tap to change month.
- Jump back to the current month.
- Pull to refresh with last-updated time.

### 2.2 Monthly snapshot

- Income, net expense after recoveries, and net savings.
- Savings rate and comparison with the previous month.
- Clear explanation that credit-card payments are transfers and are not counted twice as expenses.
- Tap any metric to open the appropriately filtered Activity view.

### 2.3 Spend pulse

- Current spend versus the expected pace for the day of the month.
- "Safe to spend" estimate based on income, recurring commitments, and goals.
- Top three spending categories.
- Category goal progress with warning states at configurable thresholds.
- Tap through to full budget/category detail.

### 2.4 Account snapshot

- Combined cash balance.
- Savings/investment balances.
- Total credit-card outstanding.
- Horizontal account carousel showing balance and recent movement.
- Tap an account to open its native ledger.

### 2.5 Attention feed

- Credit-card statement due soon.
- Card budget approaching or exceeding its limit.
- Recurring expense due or not yet recorded.
- Imported bank message waiting for review.
- Unusually large or duplicate-looking transaction.
- Category goal crossed.
- Account data not refreshed recently.
- Each card has one direct action: review, record, reconcile, snooze, or dismiss.

### 2.6 Recent activity

- Five most recent transactions across expense, income, transfer, recovery, and recurring-generated records.
- Clear type icon, account, member, date, and signed amount.
- Swipe action for edit where safe; detail screen for all other actions.
- "View all" opens the unified Activity timeline.

### 2.7 Home customization

- Reorder or hide secondary cards.
- Choose whether values show household totals or a preferred member.
- Remember collapsed states locally.
- Provide sensible defaults so customization is optional.

---

## Epic 3 — Quick capture and transaction entry

### 3.1 Universal Add sheet

Opening Add shows large actions:

- Expense
- Income
- Transfer
- Import bank message
- Recovery

Below those, show recent/frequent actions such as "Groceries from current account" or "Salary to Mashreq."

### 3.2 Quick expense

- Amount-first numeric entry with currency.
- Default date/time to now.
- Merchant/description input.
- Member selection with last-used default.
- Category and optional subcategory.
- Payment source: current account, savings account, credit card, cash, or other.
- Notes.
- Toggle whether the expense affects current balance where business rules require it.
- Inline validation when a card/account is required.
- Save-and-close and save-and-add-another actions.
- Optimistic save with visible sync status.

### 3.3 Smart expense assistance

- Suggest category from description, merchant history, and prior message-import feedback.
- Suggest payment source from recent usage.
- Show recent categories and favorites before the full category list.
- Warn about a probable duplicate based on amount, merchant, date, and account.
- Allow creation from a home-screen shortcut or long-press app icon.

### 3.4 Income entry

- Amount, date, member, source, description, and destination account.
- Recent income sources as quick chips.
- Optional repeat-last-income action.
- Editing and deletion from the detail screen.

### 3.5 Transfer entry

- Source account and destination account.
- Support current/member account, savings account, and credit card.
- Prevent selecting the same source and destination.
- Amount, date, description, and notes.
- Clearly label credit-card payments as transfers.
- Show predicted balances after the transfer before confirmation.

### 3.6 Expense recovery

- Start from an expense detail screen or Add sheet.
- Amount defaults to remaining recoverable value.
- Date, source/member, and note/reason.
- Prevent recovery above the outstanding recoverable amount unless explicitly supported.
- Display gross expense, recovered amount, and net expense.
- List and allow deletion of individual recovery entries.

### 3.7 Drafts and offline capture

- Save incomplete records as local drafts.
- Queue supported creates/updates while offline.
- Show pending, synced, and failed states.
- Retry automatically and provide a manual retry.
- Detect edit conflicts and ask the user which version to keep.

---

## Epic 4 — Bank message and native sharing import

This is a high-value mobile feature and should be more capable than the web paste box.

### 4.1 Input methods

- Paste a bank SMS/notification manually.
- Share selected text into Dhanam from Messages or another app.
- Share a notification screenshot for OCR when supported.
- Android notification listener as a later, explicit opt-in feature.
- Never ingest messages silently without clear permission and controls.

### 4.2 Analysis and review

- Analyze text into expense, income, transfer, pending reminder, or unknown.
- Extract amount, currency, date, merchant/description, last four digits, and possible account/card.
- Convert foreign currency only after showing the rate/source and requiring confirmation.
- Present an editable native review screen.
- Highlight uncertain fields rather than silently guessing.
- Detect potential duplicates before save.
- Do not save the original message after confirmation unless the user opts in.

### 4.3 Learning feedback

- Remember confirmed merchant-to-category and subcategory choices per user.
- Let the user correct record type, account, category, and description.
- Send only the structured correction needed for learning.
- Provide a settings screen to clear learned mappings.

### 4.4 Import inbox

- Pending analyses and failed imports.
- Status: needs review, duplicate suspected, unsupported, saved, or dismissed.
- Batch dismiss; one-at-a-time confirmation for financial records.

---

## Epic 5 — Unified Activity

### 5.1 Timeline

- One chronological list for expenses, income, transfers, recoveries, and recurring-generated expenses.
- Group by Today, Yesterday, and date.
- Distinct icons and signed amount colors without relying on color alone.
- Show description, category/type, account/card, member, and sync state.
- Infinite scrolling rather than web pagination controls.
- Pull to refresh.

### 5.2 Search and filters

- Search description, merchant, source, notes, account/card, and amount.
- Quick chips: All, Expenses, Income, Transfers, Recoveries.
- Month/date range.
- Member.
- Category and subcategory.
- Account/card/payment method.
- Amount range.
- Recurring-only and imported-only filters.
- Save frequently used filter presets.
- Display the active-filter count and one-tap reset.

### 5.3 Transaction details

- Full structured record.
- Related account/card and category links.
- Gross/net recovery breakdown.
- Recurring rule link when generated from a subscription.
- Created/updated metadata where useful.
- Edit, duplicate, add recovery, and delete actions.
- Destructive actions require confirmation and provide a short undo window when feasible.

### 5.4 Mobile batch behavior

- Multi-select for category change or deletion is deferred until a real mobile use case is established.
- Bulk import and bulk administrative edits remain web-first.

---

## Epic 6 — Accounts and balances

### 6.1 Account list

- Current/member accounts, savings/current/fixed-deposit/investment accounts, and credit cards in one visual list.
- Total assets, cash, card liability, and net position.
- Group or filter by member and account type.
- Hide inactive accounts by default.

### 6.2 Account detail and ledger

- Current balance and selected-period cash movement.
- Money in, money out, and net movement.
- For cards: purchases, payments, and outstanding movement.
- Unified ledger of income, expenses, and transfers.
- Date range and transaction-type filters.
- Running balance when backend calculation supports it.
- Tap a ledger item for transaction detail.

### 6.3 Savings/account management

- Create and edit name, bank, last four digits, account type, member, opening balance, color, and notes.
- Show calculated balance separately from opening balance.
- Archive instead of hard-delete when transactions are attached.
- Transfer into/out of the account.
- Balance refresh and "as of" date.

### 6.4 Opening balances

- Guided setup per member/current account.
- Explain how opening balances affect calculated balances.
- Show last update date.
- Prevent accidental replacement with a clear confirmation and before/after preview.

### 6.5 Category comparison

- From an account detail screen, compare category/subcategory spending for selected months.
- Use a mobile-friendly ranked list first and chart second.
- Limit the initial view to two or three months; deeper multi-month analysis remains better on web.

---

## Epic 7 — Credit cards

### 7.1 Card management

- Add/edit bank, card name, member, last four digits, statement cycle, statement day, due day, color, and active state.
- Mask sensitive identifiers.
- Card detail with current cycle label, purchases, payments, and outstanding.

### 7.2 Card budget

- Set a monthly budget per card.
- Month picker.
- Spent, recovered, net spend, remaining balance, and percentage consumed.
- Threshold states and notifications at 50%, 80%, 100%, and a custom value.
- Household total across all cards.

### 7.3 Statements and reconciliation

- Select card and statement cycle.
- Enter bank statement opening balance, purchases/debits, payments/credits, fees, and closing balance according to the existing reconciliation model.
- Compare statement values with recorded activity.
- Clearly show difference and reconciliation status.
- Save/update statement numbers.
- Link to filtered card ledger to investigate a difference.
- Mark a statement reconciled and retain history.

### 7.4 Due-date experience

- Upcoming statement and payment due dates on Home.
- Local/push reminders at configurable intervals.
- One-tap "Record payment" opens a transfer prefilled from the chosen account to the card.
- Snooze and mark-paid behavior.

### 7.5 Trends

- Monthly card spend by card.
- Choose 3, 6, or 12 months.
- Ranked list plus compact chart.
- Deep comparative tables remain web-first.

---

## Epic 8 — Planning

### 8.1 Category goals

- Monthly spending target per category.
- Current net spend, remaining amount, and progress.
- Inline target edit.
- At-risk and exceeded states.
- Tap through to category transactions.
- Optional carry-over is a future backend feature, not assumed from the web app.

### 8.2 Recurring expenses

- Create/edit name, member, amount, category/subcategory, day of month, payment source, description, notes, and active state.
- Upcoming calendar/list ordered by due date.
- States: upcoming, due today, overdue/unrecorded, generated this month, paused.
- Generate one expense with editable prefilled details.
- Generate all due items only after a review list; never silently create records.
- Pause/resume and delete/archive.
- Reminder notifications before and on due date.

### 8.3 Monthly plan

- Planned recurring commitments.
- Category goals.
- Expected income based on an explicit user-entered plan or historical suggestion.
- Remaining discretionary amount.
- Actual-versus-plan progress throughout the month.
- This requires additional backend planning fields and is a mobile product extension, not existing web parity.

### 8.4 Subscription intelligence, later

- Detect likely recurring merchants from transaction history.
- Suggest creating a recurring rule.
- Flag amount changes.
- Require user confirmation for every suggested rule.

---

## Epic 9 — Reports and insights

### 9.1 Mobile monthly report

- Month/date-range selector.
- Total income, net expenses, savings, and savings rate.
- Previous-period comparison.
- Category ranking with amount and percentage.
- Daily spend sparkline.
- 12-month income/expense/savings trend.
- Tap chart/list elements to open filtered Activity.

### 9.2 Custom category report

- Select categories and subcategories.
- Choose date range and members.
- Summary total and ranked subcategory breakdown.
- Save report preset locally.
- Exporting complex tabular reports remains web-first initially.

### 9.3 AI insights

- Generate insights for the selected month.
- Cards for anomalies, trends, savings opportunities, budget risks, and positive progress.
- Each insight states which figures/time period it used.
- Deep link to supporting transactions.
- Refresh explicitly; do not incur AI cost on every app open.
- Graceful unavailable state when AI is not configured.

### 9.4 Finance assistant

- Full-screen conversation, not a floating web chat bubble.
- Suggested questions based on available data.
- Read-only answers in the first version.
- Clearly distinguish calculated facts from model suggestions.
- Link cited totals/categories to in-app filtered views.
- Conversation history can remain local initially.
- The assistant must never create, edit, or delete financial records without a separate preview and explicit confirmation.

### 9.5 Sharing

- Share a concise monthly summary as text or a generated image.
- Privacy preview before sharing.
- Export CSV/PDF can be deferred to web or implemented later through backend export endpoints.

---

## Epic 10 — Household and configuration

### 10.1 Members

- List household members with color/avatar.
- Create, edit, archive, and choose the default member.
- Show member-level monthly income, expense, and account summary.
- Warn before deleting a member referenced by transactions.

### 10.2 Categories and subcategories

- Browse categories with color and nested subcategories.
- Create/edit name, description, and color.
- Add/edit/archive subcategories.
- Reorder favorites for quick entry.
- Warn about transaction dependencies before destructive changes.
- Full taxonomy cleanup and bulk merging remain web-first until backend support exists.

### 10.3 Users

- Owner/admin-only user list.
- Create/edit name, email, password, color, currency, and active settings supported by the backend.
- Hide user administration for demo accounts.
- User management belongs under Profile and should not compete with everyday finance tasks.
- Roles and invitations require additional backend authorization work before being exposed.

### 10.4 Preferences

- Currency and regional number/date formats.
- Light/dark/system appearance.
- Default member, account, and quick-add behavior.
- Notification schedule and thresholds.
- Privacy mode and biometric lock.
- Clear AI/message category-learning history.
- Data refresh, cache size, app version, API environment, and diagnostics.

---

## Epic 11 — Notifications and native surfaces

### 11.1 Notification inbox

- Persistent in-app list of actionable alerts.
- Card payment due.
- Recurring expense due.
- Budget/category limit warning.
- Import ready for review.
- Sync failure.
- Insight available only when explicitly scheduled/allowed.

### 11.2 Notification controls

- Global opt-in plus per-alert-type settings.
- Quiet hours.
- Advance intervals for recurring and card reminders.
- Deep link directly to the relevant item.
- No sensitive amount in lock-screen text unless the user opts in.

### 11.3 Widgets and shortcuts, later

- Home-screen widget: month spend, remaining goal, and quick add.
- App-icon shortcuts: Add expense, Import message, Record transfer.
- Android quick-settings tile or iOS control only if usage justifies it.

### 11.4 Camera and attachments, later

- Photograph a receipt and attach it to an expense.
- OCR merchant, amount, and date as suggestions.
- Secure upload/storage, retention rules, and deletion must be designed before implementation.

---

## Epic 12 — Reliability, quality, and observability

### 12.1 Data synchronization

- Central query/cache layer rather than every screen independently loading common data.
- Cache members, categories, accounts, and recent activity.
- Background refresh on app foreground.
- Mutation queue with idempotency keys to avoid duplicate financial records.
- Clear conflict behavior.
- Server remains the source of truth.

### 12.2 Error handling

- Human-readable validation errors next to the relevant field.
- Offline banner without blocking cached reads.
- Retryable full-screen state only when no cached content exists.
- Global handling for expired sessions and server maintenance.
- Never discard a completed form after a failed save.

### 12.3 Performance

- First useful cached screen shown quickly after unlock.
- Paginated/infinite activity lists.
- Memoized charts and virtualized lists.
- Avoid loading all reports, cards, and transactions at startup.
- Compress images before future receipt uploads.

### 12.4 Accessibility

- Screen-reader names and values for every chart and amount.
- Dynamic text sizing.
- Minimum touch targets.
- Do not encode income/expense or budget status by color alone.
- Reduced-motion support.
- Logical focus order and keyboard handling.

### 12.5 Testing

- Unit tests for currency/date formatting, balance rules, transfer validation, recoveries, and offline queue logic.
- Component tests for forms and validation.
- API contract tests against backend response shapes.
- End-to-end tests: login, add each transaction type, import review, recovery, recurring generation, card payment, and reconciliation.
- Manual testing on small and large Android devices and at least one supported iPhone size.
- Test light/dark mode, font scaling, offline/online transitions, expired session, and slow network.

### 12.6 Product analytics and diagnostics

- Privacy-conscious events for feature usage and failures, never raw financial descriptions or amounts.
- Crash reporting with sensitive payload scrubbing.
- In-app diagnostics export containing app/API versions and sync errors only.

---

## What should stay web-first

The following should not be copied into the initial mobile application:

- Wide, multi-column tables.
- Dense multi-series report dashboards.
- Large multi-month category comparison grids.
- Bulk category/user/transaction administration.
- Data migration and repair utilities.
- Complex CSV/PDF export configuration.
- Any workflow whose primary value depends on keyboard-heavy entry or side-by-side comparison.

Mobile may link users to the web experience for these tasks until a genuinely useful native workflow is designed.

## Backend work required for a strong mobile application

The existing backend supports most core CRUD and reporting flows. These additions should be planned:

- Refresh-token/session revocation model suitable for mobile.
- Idempotency keys for transaction mutations.
- Sync metadata (`updatedAt`, deletion/archive markers, cursor-based changes endpoint).
- Archive behavior for accounts, categories, members, and recurring items with dependencies.
- Notification preferences, device push tokens, and scheduled notification jobs.
- Notification inbox/read/snooze state.
- Saved mobile preferences and default member/account.
- Duplicate-transaction scoring endpoint.
- Monthly plan/expected-income fields.
- Receipt attachment storage and signed access, only when that feature begins.
- Optional role/permission model before expanding user administration.
- Export/share endpoints when mobile report export is prioritized.

## Recommended implementation sequence

### Phase 0 — Product and technical reset

- Replace parity-oriented navigation with Home, Activity, Add, Plan, and Profile.
- Establish design tokens, native components, query/cache layer, secure storage, error handling, and analytics boundaries.
- Define API contracts and offline/idempotency strategy.
- Keep existing mobile code only where it fits the new architecture.

**Exit condition:** stable shell, authentication, theme, cached reference data, and navigation on Android and iOS.

### Phase 1 — Everyday money tracking (MVP)

- Mobile Home snapshot and recent activity.
- Universal Add sheet.
- Expense, income, and transfer entry.
- Unified Activity with search/basic filters and record details.
- Edit/delete and expense recovery.
- Account list and simple account ledger.
- Offline drafts and failed-save recovery.

**Exit condition:** a user can manage daily transactions entirely from the phone without needing the web app.

### Phase 2 — Bills, cards, and planning

- Recurring expense list, reminders, and reviewed generation.
- Card detail, monthly budget, due dates, and prefilled payment transfer.
- Category goals.
- Opening balances and improved account details.
- Notification inbox and preference controls.

**Exit condition:** the app reliably tells the user what needs financial attention and provides a direct action.

### Phase 3 — Mobile-native intelligence

- Share-to-Dhanam bank message import.
- Editable analysis review, duplicate warning, and learning feedback.
- AI monthly insights with supporting-data links.
- Read-only full-screen finance assistant.
- Biometric lock and enhanced privacy controls.

**Exit condition:** mobile capture is faster than manual web entry while remaining reviewable and safe.

### Phase 4 — Deep finance workflows

- Credit-card statement reconciliation and history.
- Rich reports and custom category reports.
- Account category comparison.
- Monthly plan and recurring detection.
- Shareable summaries.

**Exit condition:** common analysis and reconciliation tasks are useful on mobile without imitating desktop layouts.

### Phase 5 — Optional native expansion

- Widgets and app shortcuts.
- Receipt camera/OCR and attachments.
- More advanced background import where platform permissions and privacy permit.
- Role-based household collaboration.

## First implementation slice recommended

Start with **Phase 0 plus the Activity/Add vertical slice**, in this order:

1. Finalize bottom navigation and mobile design primitives.
2. Introduce a shared query/cache and mutation layer.
3. Build the unified Activity timeline using expenses, income, and transfers.
4. Build a reusable transaction detail screen.
5. Build amount-first expense capture.
6. Add income and transfer capture using shared primitives.
7. Add optimistic/offline states and idempotent saving.
8. Connect Home's recent activity and summary cards to those flows.

This slice proves the mobile architecture around the most frequent user behavior before investing in reports or administration.

## Definition of done for every feature

A feature is complete only when:

- It has loading, empty, error, offline, and retry behavior.
- It works in light and dark mode.
- It supports small screens, safe areas, software keyboards, and back gestures.
- It has accessible labels, touch targets, and scalable text.
- Financial mutations cannot be duplicated by repeated taps or retries.
- Destructive actions are confirmed and dependency failures are explained.
- It refreshes affected summaries and lists after mutation.
- It has proportionate unit/component/API-contract coverage.
- It has been smoke-tested on a physical Android device; iOS-specific behavior is tested before iOS release.
- It does not expose tokens, raw bank messages, descriptions, or amounts in logs/analytics.

