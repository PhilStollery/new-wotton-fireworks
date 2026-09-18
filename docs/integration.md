# 2026 Tito and Netlify integration

## Architecture

Tito remains the system of record for booking, payment, confirmation emails, attendee QR codes and gate check-in.

The website adds only the pieces Tito does not provide cleanly for this event:

- shared price-band availability across several ticket types;
- a clearer guard when a customer selects more tickets than remain at the current price;
- source tracking and beneficiary messaging for `/go/...` links;
- later, controlled Super Saver to Advance to Standard price-band switching.

There is no custom group QR, custom gate application, custom confirmation email or attendee-assignment workflow.

## Customer ticket flow

The tested Tito setup allows one purchaser to book several tickets without assigning each ticket to a separate attendee during checkout. Tito sends one confirmation email containing all ticket QR codes for the booking.

Each ticket still has its own QR code. Gate staff use Tito's own check-in app, so members of a group can be scanned together from one phone or arrive separately.

## Netlify secrets

Only two Tito API tokens are required:

- `TITO_API_TOKEN_TEST`
- `TITO_API_TOKEN_LIVE`

The code selects the test token for Deploy Previews, branch deploys and local development. It selects the live token only when Netlify reports the actual `production` context.

All non-secret configuration is committed in:

`netlify/functions/_lib/integration-config-2026.mjs`

That includes the Tito account/event names, test Activity names, live release/Activity configuration and feature switches.

## Test ticket discovery

The Deploy Preview does not need test Activity IDs or test release slugs configured manually. The server uses the test API token to find Activities named:

- `Test Wave One`
- `Test Wave Two`

It then reads the releases attached to those Activities from Tito and supplies their slugs to the embedded widget automatically.

If those Activity names are changed in Tito, update them in `integration-config-2026.mjs`.

## Price-band automation

`priceAutomationEnabled` is deliberately false initially. The scheduled reconciler runs every ten minutes on Netlify production but does nothing until that Git-tracked switch is set to true.

Tito Activities remain the hard capacity control. The reconciler never raises their capacities. It only changes which paid release band is available when the allocation or time cut-off requires the next band.

## Before launch

1. Complete controlled test-mode purchases through the Deploy Preview.
2. Verify shared Activity availability and the website quantity guard near the end of a test allocation.
3. Test the Wave One to Wave Two handover.
4. Fill the live Activity IDs and release slugs in `integration-config-2026.mjs`.
5. Test production configuration without enabling price automation.
6. Enable `priceAutomationEnabled` only after the transition logic has been proven.

Tito's standard confirmation emails and Tito check-in app remain in use throughout.
