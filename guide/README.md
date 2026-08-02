# Dhanam Tracker static guide

This folder is a dependency-free static website.

## Publish

Copy the complete `guide` directory to the web server so these URLs resolve without authentication:

- `https://joshikiran.com/dhanam-tracker/guide/`
- `https://joshikiran.com/dhanam-tracker/guide/delete-account.html`
- `https://joshikiran.com/dhanam-tracker/guide/privacy.html`

For an Apache deployment whose document root already contains `dhanam-tracker`, copy this directory to:

```text
<document-root>/dhanam-tracker/guide/
```

No build command is required.

## Add screenshots

Capture privacy-safe screenshots from the web app and Android APK, convert them to WebP, and place them in `screenshots/` using the filenames in the Screenshot replacement checklist. The guide automatically displays a screenshot when the corresponding file exists; until then it displays a labelled capture slot.

Recommended dimensions:

- Desktop web: 1440 × 900
- Android: 1080 × 1920

Never publish real email addresses, balances, card digits, notification text, personal notes, tokens, or passwords.
