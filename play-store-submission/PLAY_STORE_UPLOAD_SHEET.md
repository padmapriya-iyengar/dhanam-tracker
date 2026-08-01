# Dhanam — Google Play upload sheet

## App identity

- App name: `Dhanam`
- Package name: `com.dhanam.tracker`
- Default language: English (United States)
- App type: App
- Pricing: Free
- Category: Finance
- Developer/contact email: `j.kiran809@gmail.com`
- Website: `https://joshikiran.com/dhanam-tracker/`
- Privacy policy: `https://joshikiran.com/dhanam-tracker/privacy/`
- Account deletion: `https://joshikiran.com/dhanam-tracker/delete-account/`

## Store listing copy

### Short description

Private family finance tracker for expenses, income, savings and shared budgets.

### Full description

Dhanam helps individuals and families understand and manage their finances from one private, organized place.

Record income, expenses, transfers, savings accounts and credit-card activity. View monthly summaries, spending patterns, savings progress and account balances without relying on scattered notes or spreadsheets.

Share one household securely with your partner or family. Each person signs in with their own account while viewing and contributing to the same household financial data.

Key features:

• Track income, expenses and recoveries  
• Manage current and savings-account balances  
• Monitor credit-card purchases, statements and outstanding amounts  
• Record transfers without counting them as income or expenses  
• Organize transactions using categories and household members  
• Review monthly spending, savings and recent activity  
• Set category goals and monitor recurring expenses  
• Share household finances using Owner, Admin and Contributor roles  
• Sign in using email or Google  
• Protect access with app-lock and privacy controls  
• Use a demonstration account before adding personal information

Dhanam is designed for personal financial organization and budgeting. It does not provide banking services, payment processing, lending, investment trading or professional financial advice.

Your financial records are transmitted securely to the configured Dhanam service. You remain in control of your account and can request account deletion from within the application.

## Upload-ready common visual assets

- App icon: `dhanam-play-icon-512.png` — 512×512 PNG, under 1,024 KB
- Feature graphic: `dhanam-feature-graphic-1024x500.png` — 1024×500 PNG, no alpha
- Feature graphic alt text: `Dhanam family finance tracker with a wallet and growth arrow, for income, expenses and savings.`
- Promotional video: leave blank for the first release

## Phone screenshots still required

Capture the actual Play-installed app at 1080×1920 portrait. Remove real names, emails, notifications and financial information. Upload at least two; four are recommended in this order:

1. `01-monthly-snapshot.png` — Monthly snapshot, savings and spend pulse
2. `02-accounts.png` — Current accounts, savings and card outstanding
3. `03-capture-expense.png` — Add expense workflow using sample data
4. `04-shared-household.png` — Household collaborators and roles using test identities

Suggested screenshot alt text:

1. `Monthly income, net expenses, savings and spending summary in Dhanam.`
2. `Current accounts, savings balances and credit-card outstanding amounts.`
3. `Form for recording and categorizing a household expense.`
4. `Shared household collaborator list with owner and administrator roles.`

## App access

- Restricted access: Yes, some or all functionality requires authentication.
- Reviewer instructions:

  `Launch Dhanam and select “Open demo” on the login screen. The demo contains sample financial data and does not require credentials. Google and email login are also available but are not required for review.`

## Declarations

- Ads: No
- Target audience: 18 and over
- News app: No
- Government app: No
- Health app: No
- Financial functionality: Personal finance management, budgeting, expense tracking and savings tracking only
- Not offered: payments, money transfer, banking, lending, credit decisions, insurance sales, investment trading or cryptocurrency services

## Content rating answers

Answer `No` for violence, sexual content, profanity, controlled substances, gambling and user-to-user public communication. The app contains user-entered financial information but no public social content.

## Data safety working answers

- Does the app collect or share required user-data types? Yes
- Is data encrypted in transit? Yes
- Can users request deletion? Yes
- Account creation methods: email/password and Google authentication

Data collected for app functionality/account management:

- Personal info: name and email address
- Financial info: income, expenses, balances, savings, card activity and budgets entered by the user
- App activity: interactions needed to synchronize records and operate features
- User IDs: internal account, session and household identifiers
- Other user-generated content: transaction descriptions and messages deliberately submitted to capture or AI-assisted features

Data is not used for advertising or sold. Infrastructure, authentication, email delivery and AI vendors process data only to provide requested functionality. Confirm the final `shared` answers against the production contracts and retention settings for each provider before submission; Google may treat service-provider processing differently from third-party sharing.

## Internal testing

- Tester accounts: `j.kiran809@gmail.com`, `padmapriya.iyengar@gmail.com`
- Opt-in URL: `https://play.google.com/apps/testing/com.dhanam.tracker`
- Release notes: `Initial internal test of Dhanam family finance tracker.`

## Release checks

- Backend health: `https://joshikiran.com/dhanam-tracker/api/health`
- Production API: `https://joshikiran.com/dhanam-tracker/api`
- Increment `android.versionCode` before every new AAB upload.
- Test Google login using a Play-installed build after registering the Play app-signing SHA-1.
- Verify both Gmail accounts see Padmapriya’s Household and the same totals.
- Verify account deletion, privacy links, app lock, screenshot protection and logout.
