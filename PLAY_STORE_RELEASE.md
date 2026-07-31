# Play Store release checklist

## Required before building

- The HTTPS backend is hosted at `https://joshikiran.com/dhanam-tracker/api`; keep this as `EXPO_PUBLIC_API_URL` in the EAS preview and production profiles.
- Set backend `NODE_ENV=production`, a random `AUTH_SECRET` of at least 32 characters, `MONGODB_URI`, HTTPS-only `CORS_ORIGIN`, and `TRUST_PROXY=1` when behind one proxy.
- Configure transactional email with `RESEND_API_KEY`, a verified `EMAIL_FROM`, and `PUBLIC_APP_URL`. The public URL must open the app (or redirect to its `dhanam://` deep links) for verification, password-reset, and household-invitation links.
- Create Google OAuth clients for Android and Web. Register Android package `com.dhanam.tracker` with the SHA-1 certificate from the Play App Signing page. Set `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` for mobile, `VITE_GOOGLE_WEB_CLIENT_ID` for the web build, and list every accepted client ID in backend `GOOGLE_CLIENT_IDS`. Add the production web origin to the Web OAuth client's authorized JavaScript origins.
- Keep `ENABLE_BOOTSTRAP_USERS=false` in production. Create the initial admin deliberately; never use the development default credentials.
- Back up MongoDB with `npm run backup:data`, retain the generated manifest with the backup, set `DEFAULT_USER_EMAIL` to the owner of legacy category goals, then run `npm run migrate:security` and `npm run migrate:households` once when upgrading an existing database.
- Host a public privacy policy and an account-deletion request page on HTTPS. The app also provides authenticated in-app deletion.

## Play Console declarations

- Complete Data safety for account identity, financial records, user-entered bank messages, app activity needed for sync, and any data sent to the configured AI service.
- Declare that data is encrypted in transit and that users can request deletion.
- Do not claim that all local financial data is encrypted: authentication credentials and the PIN hash use Android Keystore, while drafts/caches use app-private storage with Android backup and device transfer disabled.
- Complete Financial features, App access (provide review credentials), Content rating, Ads (none unless later added), Target audience, and the privacy-policy fields.
- Use Play App Signing and upload an Android App Bundle (`.aab`) to Internal testing first.

## Build and staged release

```powershell
cd mobile
eas build --platform android --profile production
```

Verify email signup/verification, Google signup/linking, password reset, household invitation/role/ownership transfer, shared data from two physical devices, logout cleanup, account deletion, offline drafts, biometric/PIN lock, screenshot blocking, deep links, text sharing, and session revocation on a physical release build. Promote through internal, closed, and production tracks only after backend monitoring and restore procedures are ready.

Every update must increment `android.versionCode`. Expo SDK 57 targets Android API 36.
