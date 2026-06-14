# TOTP Enrollment Flow

Capture Tracking GPS uses **Traccar native TOTP** (`totpKey` on the user record). Secrets are stored server-side in the Traccar database — never in `localStorage`.

## Enrollment (Settings → Security)

1. Open **Settings → Security**.
2. Click **Enable two-factor authentication**.
3. Frontend calls `POST /api/users/totp` → Traccar returns a Base32 secret.
4. QR code is rendered (`otpauth://` URI via `qrcode`).
5. Scan with Google Authenticator, Authy, or any TOTP app.
6. Enter the 6-digit code from the app.
7. Client validates locally with `otpauth`, then saves via `PUT /api/users/{id}` with `totpKey`.
8. Success banner confirms enrollment; `totpKey` is persisted on the Traccar user.

## Login with TOTP

1. Enter email + password on `/login`.
2. If Traccar responds `401` with `WWW-Authenticate: TOTP`, the UI shows a TOTP code field.
3. Submit password login again with `code` (Traccar session API).
4. On success, session cookie is issued and user is redirected to `/dashboard`.

## Verification

```bash
cd gps-tracker-pro
npm test -- tests/unit/totp.test.js
npm run test:e2e   # RBAC + route guards
```

Manual smoke:

```bash
# After enrollment, login should require TOTP when totpKey is set
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/api/session \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'email=YOUR_EMAIL&password=YOUR_PASSWORD'   # expect 401 + WWW-Authenticate: TOTP
```

## Key files

| File | Role |
|------|------|
| `src/components/settings/TotpEnrollmentPanel.jsx` | QR enrollment UI |
| `src/utils/totp.js` | OTP generation / verification (`otpauth`) |
| `src/pages/Login.jsx` | Two-step login (password → TOTP) |
| `src/services/api.js` | `ApiError.totpRequired` detection |
| `src/context/AuthContext.jsx` | Login + `updateProfile({ totpKey })` |
