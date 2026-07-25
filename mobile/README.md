# Dhanam mobile

React Native/Expo mobile client for Dhanam Tracker.

## Available features

- Secure login, session restoration, demo mode, and logout
- Native dashboard with monthly navigation and pull-to-refresh
- Expense, income, transfer, and recurring-expense creation
- Unified activity history, editing, deletion, expense recoveries, and recurring generation
- Account transaction overview
- Savings account, credit-card, member, and user management
- Categories and sub-categories
- Card budgets, statement reconciliation, and statement entry
- Opening balances and category goals
- Monthly reports, category breakdown, and 12-month trend
- AI insights, the read-only Dhanam assistant, and bank-message import with editable review
- Responsive five-tab mobile navigation
- Persisted Light, Dark, and System appearance modes under More → Appearance

### Importing a bank message

Configure `OPENAI_API_KEY` in `backend/.env` and restart the backend. Optionally set
`OPENAI_MESSAGE_MODEL`; otherwise `OPENAI_MODEL` is used. Open **More → Import bank
message**, paste the full notification, analyze it, review the editable draft, and confirm.
Pending reminders and unknown messages are not saved. A foreign-currency alert must be
converted and confirmed in the user's base currency before creation.
Confirmed expense categories and subcategories are remembered per user. Relevant past
choices are supplied to later analyses, while the original bank message is not retained.

## Windows browser preview

Run the existing MongoDB and backend first:

```powershell
cd ..\backend
npm start
```

In another terminal:

```powershell
cd mobile
Copy-Item .env.example .env
npm run web
```

Open the URL printed by Expo. The browser preview uses the same React Native components as Android and is intended for quick Windows UI testing.

Demo credentials:

```text
demo@example.com
demo
```

The browser build is a React Native Web preview. Use an Android emulator or physical Android device to validate native behavior, safe areas, the software keyboard, secure storage, and back navigation.

## Android emulator

Start an Android Virtual Device in Android Studio, then use:

```powershell
cd mobile
$env:EXPO_PUBLIC_API_URL='http://10.0.2.2:5000/api'
npm run android
```

`10.0.2.2` is the Android emulator alias for the Windows host machine.

## Physical Android phone

SDK 57 should be tested with a Dhanam development build rather than the public Expo Go app. Install EAS CLI once, sign in, and build the private APK:

```powershell
npm install --global eas-cli
eas login
eas build --platform android --profile development
```

When the build finishes, open the installation link or scan its QR code on the Android phone and install the APK. This is a private development build and is not released to Google Play.

Connect the phone and computer to the same network. Replace the example with the computer's IPv4 address, then start the development server:

```powershell
$env:EXPO_PUBLIC_API_URL='http://192.168.1.25:5000/api'
npm run start:dev-client
```

Open the installed Dhanam development app and select the local development server. Windows Firewall must allow the backend port. For testing outside the local network, point `EXPO_PUBLIC_API_URL` at a staging HTTPS deployment.

## Quality checks

```powershell
npm run typecheck
npm run export:web
```

## Manual smoke-test checklist

1. Sign in and restart the app to verify session restoration.
2. Move between all five bottom tabs.
3. Add an expense, income, transfer, and recurring expense.
4. Pull down on Activity and verify the new records.
5. Record a recovery against an expense.
6. Generate an expense from a recurring rule.
7. Open More and test accounts, savings, cards, categories, members, budgets, balances, goals, and reconciliation.
8. Change the dashboard and report month.
9. Generate AI insights and ask the assistant a question when `OPENAI_API_KEY` is configured in the backend.
10. Sign out and confirm the login screen returns.
