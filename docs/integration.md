# 2026 Tito / Netlify integration scaffold

This code is deliberately **disabled by default**. Adding it to a branch does not turn on Tito automation, custom email, post-purchase preferences or gate check-in.

## Architecture

- The public site embeds **Tito Widget v2 inline** so checkout remains on the fireworks website and the `registration.finished` browser callback is available.
- Tito remains the transaction and attendance system of record.
- `registration.finished` webhooks are verified with Tito's current HMAC-SHA256 `Tito-Signature` mechanism using the event security token and the **raw JSON request body**.
- The server uses the stable Tito Admin API v3 with a secret token held only in Netlify environment variables.
- Group QR tokens are authenticated/encrypted server-side with AES-256-GCM. They contain the Tito registration slug/reference inside encrypted data rather than putting readable personal information in the QR.
- The gate interface writes check-ins/reversals back through Tito's Check-in API; it does not maintain a second attendance counter.
- Post-purchase choices are recorded against the Tito registration's metadata with a timestamp and wording version, so there is no separate customer database in this scaffold.

## Functions

- `integration-health` — reports feature flags and missing environment variable names, never their values.
- `tito-webhook` — verifies Tito webhooks; on `registration.finished`, optionally sends the custom group confirmation and asks the pricing reconciler to run.
- `tito-reconcile` — scheduled every 10 minutes in production; repairs the Super Saver → Advance → Standard state based on the manifest's local Europe/London times and Tito Activity counts.
- `order-session` — exchanges a finished widget registration slug/reference for an opaque order token after verifying it against Tito.
- `order-view` / `order-preferences` — powers the post-purchase journey and stores each choice separately in Tito registration metadata.
- `group-qr` — renders the group QR PNG for confirmation emails.
- `gate-order` / `gate-checkin` / `gate-search` — authenticated staff endpoints for group/partial check-in, reversal and fallback lookup.
- `meet-and-greet-book` — disabled scaffold for the separate follow-up booking. Do not enable until the follow-up event/release has been created and the API flow tested.

## Safe enablement order

1. Create/configure the 2026 Tito event, releases, Activities and check-in list exactly as set out in the manifest.
2. Put a **test-mode Tito Admin API token** and the remaining IDs/slugs into Netlify Deploy Preview/branch environment variables.
3. Keep `FIREWORKS_AUTOMATION_ENABLED=false`, `CUSTOM_CONFIRMATION_ENABLED=false`, `POST_PURCHASE_ENABLED=false` and `MEET_AND_GREET_ENABLED=false` initially.
4. Set the front-end widget to the 2026 event in Tito test mode and complete controlled test registrations.
5. Verify `/api/integration-health` shows no missing values for the component under test.
6. Test webhook signature verification, reconciliation in dry/manual conditions, post-purchase saving, QR generation, full/partial check-in, reversal, duplicate scans and manual search.
7. Only after the custom confirmation has passed end-to-end testing should Tito's standard registration email be switched off and `CUSTOM_CONFIRMATION_ENABLED=true` be used.
8. Use a **live-mode Tito API token** for production only after the test-mode flow has passed and the event configuration has been checked against the manifest.

## Environment/secrets

Copy `.env.example` only as a checklist. Do not commit real values. Put secrets into Netlify environment variables. `TITO_API_TOKEN`, `TITO_WEBHOOK_SECURITY_TOKEN`, `GROUP_QR_SECRET`, `GATE_STAFF_KEY` and any email delivery token must never appear in source control or browser JavaScript.

## Email delivery adapter

The manifest has not selected a transactional email provider. The scaffold therefore uses a provider-neutral adapter: when custom confirmations are enabled it POSTs `{from,to,subject,text,html}` to `EMAIL_DELIVERY_URL`, optionally with `Authorization: Bearer EMAIL_DELIVERY_TOKEN`. Connect that endpoint only after the delivery service has been selected and tested.

## Group QR / gate access

The customer QR opens `/gate?token=...`. The token alone does **not** allow check-in. The gate page also requires the staff access code, which is checked server-side against `GATE_STAFF_KEY`. For the first live year, use a long randomly generated key and restrict it to event staff devices. A stronger staff identity/SSO layer can replace this later without changing the order token format.

## Price-band reconciliation

Tito Activities remain the hard capacity enforcement. The reconciler never attempts to raise capacities. It only changes release availability when the current paid allocation has reached its hard Activity ceiling early, or when the manifest's date cut-offs require the next band. All date comparisons are evaluated in `Europe/London` via Luxon so the October clock change is handled correctly.

The scheduler runs only on Netlify's published production deploy. Deploy Previews/branch deploys do not run scheduled functions automatically; invoke it manually while testing.

## Still requires live-system testing

The scaffold is code-complete enough to branch and test, but the following are intentionally not claimed as proven until there is a real 2026 Tito event and Netlify deploy:

- exact release and Activity IDs/slugs;
- Widget test/live behaviour with the final event;
- early sell-out transitions against real Activity allocation counts;
- the chosen transactional email provider;
- one-email/group-QR rendering in real mail clients;
- check-in list behaviour with controlled live/test registrations;
- the separate meet-and-greet booking flow.
