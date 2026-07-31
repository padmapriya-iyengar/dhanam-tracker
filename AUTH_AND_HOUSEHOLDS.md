# Authentication and shared households

Dhanam separates a person's sign-in identity from the financial household they are viewing. Each person signs in with their own email/password or Google identity. The `X-Household-Id` API header selects an active membership, and existing financial records remain attached to the household's data owner so migration does not duplicate or lose historical data.

## Roles

- **Owner:** invite/remove collaborators, change roles, and transfer ownership.
- **Admin:** invite/remove collaborators and manage household data.
- **Contributor:** view and contribute to the same household data.

An owner with active collaborators cannot delete their account until ownership is transferred. Ownership transfer changes administrative control without moving or deleting financial records.

## Existing-data rollout

1. Stop writes or put the API in maintenance mode.
2. Run `npm run backup:data` from `backend` and copy the timestamped backup off the server.
3. Run `npm run migrate:security` and `npm run migrate:households`.
4. Deploy the backend, then the mobile app.
5. The existing user opens **Profile → Household & categories → Collaborators**, invites the second person's exact Google/email address, and shares the invitation link securely.
6. The invitee signs up from that link. They should not use an independently created personal household if the intention is to join existing data.

The migration is idempotent. It creates one owner household for each legacy user that has no active membership and links it to that user's existing financial records.

## Production configuration

Backend production startup intentionally fails if authentication-critical configuration is absent: `AUTH_SECRET`, `MONGODB_URI`, `CORS_ORIGIN`, `PUBLIC_APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, or `GOOGLE_CLIENT_IDS`.

Set `PUBLIC_APP_URL` to the deployed web app root (for example, `https://example.com/dhanam-tracker`). Email links use query-string actions so verification, reset, and invitation links work on static hosts without special route rewrites. The web build also requires `VITE_GOOGLE_WEB_CLIENT_ID` when Google sign-in is enabled.

Google account auto-merging by email is deliberately disabled. If an email/password account already exists, the signed-in user must link Google from Security settings. Invitation tokens are hashed at rest, expire after seven days, and only work for the invited email address.
