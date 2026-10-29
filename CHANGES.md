# Livinkey – security & app overhaul (what changed and what you must do)

## Do these first (cannot be done from code)
1. **Rotate every secret** you previously shared (DB password, JWT_SECRET, Gmail app password, Cloudinary, Twilio, Razorpay, Firebase service account). Make JWT_SECRET a random 48+ character string. Keep `backend/.env` OUT of git and out of zip files you share. The app folder also contained a *server* Firebase service-account JSON – it has been removed; revoke that key.
2. **Set real values** in `backend/.env`: `MERCHANT_UPI_ID` (currently the placeholder `your_merchant@upi`), `TWILIO_AUTH_TOKEN`, and (if using Razorpay) `RAZORPAY_WEBHOOK_SECRET`.
3. **Gateway webhooks** – point them to the new verified endpoints:
   - Razorpay → `https://api.livinkey.com/api/payments/webhook/razorpay` (events: payment.captured, order.paid, payment.failed; use the webhook secret above)
   - Cashfree → `https://api.livinkey.com/api/payments/webhook/cashfree`
   - Twilio → `https://api.livinkey.com/api/webhooks/twilio/whatsapp` and `/status` (Twilio must call exactly the PUBLIC_API_URL host)
4. **Mobile app**: run `flutter pub get` (new dependency `flutter_secure_storage`), then `flutter build appbundle`. Version bumped to 1.1.0+7.
5. Deploy backend + admin + website together (admin/app use the new download-token and error-code responses).

## Backend
- Shared auth core: session tokens only via `Authorization` header; `?token=` accepted only for 5‑minute, GET‑only *download* tokens (`POST /api/download-token/{admin|tenant|guest}`).
- `must_change_password` tokens can only call change‑password/validate (admin + tenant) – no more OTP bypass.
- Every request re-checks the account still exists/is active (60 s cache); DB hiccups return 503, never a false logout.
- Machine-readable auth error codes (`TOKEN_EXPIRED`, `TOKEN_INVALID`, `ACCOUNT_DISABLED`, …) so clients log out only when a session truly ended.
- Brute-force protection: per-account lockouts for login and OTP (5 wrong OTPs wipes the OTP), plus IP rate limits (API, auth, public, webhooks). Cryptographically secure OTPs and temporary passwords.
- Password policy (8+, letter+number) for admin, tenant, guest; no more account enumeration on OTP/forgot-password.
- Payments: Cashfree webhook signature (HMAC + timestamp) and Razorpay webhook-secret verification **before** any DB work; gateway amount must match the transaction; fixed Cashfree notify/return URLs.
- Twilio webhooks verify `X-Twilio-Signature`; raw payloads no longer stored.
- CORS restricted to livinkey.com / www / admin (+ `CORS_ORIGINS`); helmet; tokens redacted from logs.
- Uploads: images + PDF only, magic-byte verified; friendly size errors.
- Internal/SQL error text is never returned to clients; graceful shutdown; larger DB pool; startup config warnings.
- Emails: broken `/tenant-maintenance` & `/tenant-notifications` links (they pointed at the API host) and phone-only `phonepe://` buttons replaced with working links/instructions; fake `pay.upi.in` link removed. All URLs come from `utils/links.js`.

## Admin panel & website
- ~90 more user-text interpolations escaped (stored XSS), session no longer ends on a mere 403 or wrong "current password", downloads use short-lived tokens, Subresource Integrity on CDN assets, website moved off Bootstrap 5.3.0‑alpha3.

## Mobile app (tenant + guest)
- **Session**: token stored in the Android Keystore/iOS Keychain; user is signed out *only* when the server reports an expired/invalid/deactivated session (the 90‑day backend lifetime). Timeouts, offline, 5xx, 403 and wrong-password 401s never log out. GET requests auto-retry on flaky networks.
- **Logout**: one consistent, non-blocking logout everywhere (clears stack, works offline).
- **Realtime**: bill/home/maintenance/documents screens refresh silently on app resume, on push arrival, and (payments) every 40 s.
- **Payments**: itemised, labelled bill card (rent, electricity, maintenance, other charges + note, late fine, paid, balance, earlier dues, due date); UPI app chooser (PhonePe, Google Pay, Paytm, any UPI app); "Did your payment go through?" prompt on return; receipts/agreements open through short-lived links.
- Friendlier error text throughout, password rules match the server, text-scale clamping for all device sizes, smoother page transitions.
- Android: release minify/shrink + ProGuard rules, cleartext traffic off, backups off, signing falls back safely without key.properties. iOS: UPI schemes registered.

## Honest limits
- The app could not be compiled here (no Flutter SDK) – it was checked for syntax balance only. Run it, and test: login, forced password change, pay via UPI, receipt download, logout, airplane-mode behaviour.
- Backend was smoke-tested (auth, tokens, webhook rejection, CORS) but not against your live DB or gateways.
- I made targeted UX improvements, not a ground-up visual redesign of all 27k lines of app UI.
- Login/OTP lockouts are in-memory (fine for one server instance; use Redis if you scale out).
