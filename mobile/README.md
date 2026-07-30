# Dhanam Mobile

Fresh Expo/React Native application for Dhanam. The mobile product is intentionally separate from the web interface.

## Epic 1 implemented

- Native splash and launcher/adaptive icon configuration
- Safe-area and keyboard-aware screen primitives
- Light, dark, and system appearance
- Accessible scalable text, labels, touch targets, and reusable application states
- Network awareness and consistent offline/error/retry presentation
- Native haptic feedback
- Email/password and clearly labelled demo login
- Keychain/Keystore-backed authentication token
- Session restoration, expiry handling, logout, and cache clearing
- Optional biometric and PIN lock with configurable timeouts
- Privacy-value toggle, sensitive app-switcher shield, and optional screenshot blocking
- Signed-in device list and remote revocation
- Progressive onboarding for region, household member, account, optional card, and alert preferences

## Epic 2 implemented

- Greeting, avatar, privacy toggle, notification inbox, and member/household scope
- Tap and swipe month navigation with jump-to-current-month
- Pull-to-refresh, local Home cache, offline snapshot, and last-updated time
- Recovery-aware income, net expense, savings, savings rate, and previous-month comparison
- Spending pace, safe-to-spend estimate, top categories, and goal warnings
- Current-account, savings/investment, and card-liability summaries
- Horizontal account carousel linked to native ledgers
- Actionable card, budget, recurring, goal, duplicate, unusual-expense, and stale-account alerts
- Recent unified activity with transaction details and swipe-to-edit affordance
- Persisted section ordering, visibility, collapsed state, dismissed alerts, and snoozes

## Epic 3 implemented

- Universal Add surface with expense, income, transfer, message import, and recovery
- Recent/frequent expense actions and recent income-source shortcuts
- Amount-first expense entry with member, category, subcategory, payment source, notes, and balance behavior
- Merchant-history/category-learning suggestions and duplicate warnings
- Income repeat-last action and destination accounts
- Transfer validation, card-payment explanation, and predicted balances
- Recovery caps, gross/recovered/net presentation, history, and deletion
- Local drafts plus offline create queue with automatic and manual retry
- Edit/delete detail actions and optimistic-concurrency conflict choice
- Android long-press launcher shortcuts and `dhanam://add/*` deep links

## Epics 4–12 implemented

- Native bank-message sharing, editable analysis, uncertainty and duplicate review, a local import inbox, and learned merchant mappings
- A unified, infinitely scrolling Activity timeline with search, advanced filters, saved presets, details, edit, duplicate, recovery, delete, and undo
- Account and savings dashboards, native ledgers, balance-affecting filters, transfers, opening balances, and category comparison
- Credit-card creation, budgets, statement reconciliation, due-date guidance, payments as transfers, and trend views
- Category goals, recurring-expense management, monthly planning, reports, AI insights, and a read-only finance assistant
- Household members, categories, subcategories, users, regional preferences, notification controls, diagnostics, and scrubbed diagnostics sharing
- Session-expiry handling, idempotent mobile creates, offline queue visibility, conflict handling, archive-safe account management, and accessible native states

## Deliberately gated native services

Push delivery, widgets, notification-listener ingestion, screenshot OCR, receipt attachments, and device analytics require service credentials, explicit OS permissions, retention rules, or backend infrastructure. Their controls explain this boundary; Dhanam does not silently request or simulate these capabilities.

## Run

```powershell
Copy-Item .env.example .env
npm install
npm run android
```

Android emulator uses `http://10.0.2.2:5000/api` by default. Set `EXPO_PUBLIC_API_URL` for a physical device or staging API.

Demo credentials are built into the **Open demo** action. Demo data is explicitly marked as non-private sample data.

## Checks

```powershell
npm run typecheck
npm run export:web
```

Biometrics, Keychain/Keystore, screenshot blocking, app-switcher privacy, and hardware back behavior must be validated in a native development build rather than only React Native Web.
