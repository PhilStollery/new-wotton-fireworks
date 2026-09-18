# Wotton-under-Edge Firework Display 2026

Current development package: v13.

## Ticketing

Tito remains the system of record for checkout, payment, confirmation emails, ticket QR codes and gate check-in.

The website adds:

- the embedded Tito selector;
- live shared-capacity counters for each price band;
- local quantity limits and progressive reveal of later price bands;
- source tracking and beneficiary messaging;
- a post-checkout follow-up panel which stores optional choices against the completed Tito registration.

There is no custom confirmation email, group QR or gate application.

## Post-checkout follow-up

After Tito reports `registration:finished`:

1. the private `tito` checkout parameter is removed from the public URL;
2. Tito's completed-order panel remains visible;
3. when the purchaser dismisses that panel, the ticket selector is replaced by a Wotton follow-up panel;
4. each choice saves immediately to `registration.metadata.wfd_preferences`;
5. the purchaser can then plan their visit or reopen a fresh ticket selector to make another booking.

The follow-up includes:

- an invitation to the booked climbing / bouldering social, with limited places;
- an RSVP for the four-club meet-and-greet at Beermongery.Inc, 40 Long St, Wotton-under-Edge, Friday 13 November 2026 at 8pm;
- cancellation donation/refund preference;
- separate consent to hear when 2027 fireworks tickets go on sale;
- separate consent to hear about other Round Table/community events.

Meet-and-greet and climbing responses are recorded against the fireworks booking rather than creating another Tito ticket.

## Configuration

Ordinary configuration lives in:

`netlify/functions/_lib/integration-config-2026.mjs`

The only Netlify secrets required are:

- `TITO_API_TOKEN_TEST`
- `TITO_API_TOKEN_LIVE`

Deploy Previews and branch deploys use the test token. Only Netlify production can select the live token.

## Public contact details

- Email: `help@wotton-firework-display.co.uk`
- Facebook: `https://www.facebook.com/wotton.fireworks`

## Entrance

All attendees use the Wotton Community Sports Centre entrance on Wotton Road, whether arriving on foot, by car or on the event bus. Other site accesses are emergency-only.

See `docs/integration.md` for implementation and testing notes.
