# Play Store release checklist

## Required before building

- Host the backend behind HTTPS and set `EXPO_PUBLIC_API_URL=https://.../api` in the EAS production environment.
- Set backend `NODE_ENV=production`, a random `AUTH_SECRET` of at least 32 characters, `MONGODB_URI`, HTTPS-only `CORS_ORIGIN`, and `TRUST_PROXY=1` when behind one proxy.
- Keep `ENABLE_BOOTSTRAP_USERS=false` in production. Create the initial admin deliberately; never use the development default credentials.
- Back up MongoDB, set `DEFAULT_USER_EMAIL` to the owner of legacy category goals, and run `npm run migrate:security` once when upgrading an existing database.
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

Verify login, logout cleanup, account deletion, offline drafts, biometric/PIN lock, screenshot blocking, deep links, text sharing, and session revocation on a physical release build. Promote through internal, closed, and production tracks only after backend monitoring and restore procedures are ready.

Every update must increment `android.versionCode`. Expo SDK 57 targets Android API 36.
