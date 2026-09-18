# Wotton-under-Edge Firework Display 2026

Working 2026 website and Tito integration for Wotton-under-Edge & District Round Table 974.

## Ticketing approach

Tito handles:

- checkout and payment;
- the order record;
- the purchaser's confirmation email;
- all ticket QR codes;
- attendee check-in through the Tito app.

The tested multi-ticket setup sends one confirmation email containing all of the booking's QR codes and does not require the purchaser to assign every ticket during checkout.

The website handles:

- the embedded Tito booking panel;
- shared price-band availability;
- protection against selecting more tickets than remain at the current price;
- source tracking and beneficiary messaging;
- later, the Super Saver to Advance to Standard transition logic.

There is no custom group QR, gate application or transactional email service.

## Configuration

Ordinary configuration lives in:

`netlify/functions/_lib/integration-config-2026.mjs`

The only Netlify secrets required for Tito are:

- `TITO_API_TOKEN_TEST`
- `TITO_API_TOKEN_LIVE`

Deploy Previews and branch deploys use the test token. Only Netlify's actual production context can select the live token.

The test integration discovers `Test Wave One` and `Test Wave Two` by Activity name and automatically reads their attached releases from Tito, so test Activity IDs and release slugs do not need to be copied into Netlify.

## Public contact details

- Email: `help@wotton-firework-display.co.uk`
- Facebook: `https://www.facebook.com/wotton.fireworks`

## Entrance

All attendees use the Wotton Community Sports Centre entrance on Wotton Road, whether arriving on foot, by car or on the event bus. Other site accesses are emergency-only.

## Further integration notes

See `docs/integration.md`.
