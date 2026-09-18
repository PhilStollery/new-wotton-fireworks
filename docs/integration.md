# 2026 Tito and Netlify integration

## Architecture

Tito remains responsible for booking, payment, confirmation emails, ticket QR codes and gate check-in.

The public website adds a thin presentation and workflow layer:

- embedded Tito Widget V2;
- source attribution and beneficiary messaging;
- shared availability counters for each admission price band;
- local quantity boundaries so a price band cannot be over-selected deliberately;
- progressive reveal of later admission price bands;
- parking groups after admission when they are supplied by the availability endpoint;
- optional post-checkout choices saved back to the completed Tito registration.

No custom group QR, gate app or transactional email system is used.

## Checkout handoff

Tito owns the checkout router. Pressing Continue can add a `tito` query parameter containing the current registration path. That is expected.

The selector suspends its own mutation work while Tito checkout is active. On `registration:finished` it removes only the public URL parameter, leaves Tito's completed-order panel untouched, and waits until the purchaser closes that panel before changing the ticket section.

## Post-checkout journey

After the completed-order panel is dismissed, the ticket selector is hidden and the post-checkout panel is shown.

The panel is intentionally non-blocking. Every answer is optional and saves immediately.

### Recruitment invitation

The invitation is prominent, not an afterthought.

- **Climbing / bouldering:** the next Round Table climbing social is already booked in. Places are limited, so the customer can register interest and the club can confirm a place if there is room.
- **Four-club meet-and-greet:** Friday 13 November 2026 at 8pm, Beermongery.Inc, 40 Long St, Wotton-under-Edge. The invitation names Wotton Round Table, Ladies Circle, 41 Club and Tangent. The customer's yes/no response acts as an RSVP against their fireworks booking.

### Other choices

Three separate choices are stored:

- cancellation: `donate` or `refund`;
- next year's fireworks: `yes` or `no`;
- other Round Table/community events: `yes` or `no`.

The two marketing permissions are kept separate.

### Storage

`POST /api/post-purchase-preference`

The browser supplies the completed registration slug/reference, stage and allowed value. The server verifies the registration through the Tito Admin API and writes:

- `wfd_preferences`
- `wfd_preferences_updated_at`
- `wfd_preferences_source`

Each stored answer also includes a timestamp and wording version.

The browser serialises saves so two rapid answers cannot race and overwrite each other.

## Test ticket discovery

Deploy Preview test mode discovers Activities named:

- `Test Wave One`
- `Test Wave Two`

and uses the releases attached to those Activities.

## Netlify secrets

Only:

- `TITO_API_TOKEN_TEST`
- `TITO_API_TOKEN_LIVE`

## Before launch

1. Complete a small test-mode purchase through the Deploy Preview.
2. Confirm the Tito checkout and completed-order panel work normally.
3. Close the completed-order panel and confirm the Wotton post-checkout panel appears.
4. Test both recruitment responses and all three quick-choice questions.
5. Check the completed Tito registration metadata to confirm the values were saved.
6. Click **Book more tickets** and confirm a fresh selector is usable.
7. Test a second order in the same browser session.
8. Test the price-band boundary and next-band reveal again.
9. Add the final live Activities/releases and parking groups.
10. Enable price automation only after production configuration has been separately tested.
