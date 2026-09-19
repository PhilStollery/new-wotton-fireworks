# Wotton Fireworks 2026 — v20 integration notes

## Preview catalogue

The preview now deliberately uses the real customer-facing Tito releases rather
than the obsolete `Test Wave One` / `Test Wave Two` releases. Tito's widget is
still loaded with `test_mode`, so transactions made through a Deploy Preview are
test transactions.

Release grouping is resolved in this order:

1. configured live release slugs from `integration-config-2026.mjs`, when present;
2. otherwise release title/slug matching for `Super Saver`, `Advance`, `Standard`,
   pre-school, general parking and Blue Badge parking.

Legacy releases whose title/slug starts with `Test` or contains `Test Wave` are
excluded from the customer preview catalogue.

## Admission presentation

- Pre-school sits before the paid price bands and receives a static reminder:
  every attendee needs a ticket. No overall event-capacity number is displayed.
- Super Saver is the first paid band.
- Advance is progressively revealed when Super Saver is no longer usable.
- Standard is progressively revealed last and gets a static Standard header,
  rather than a misleading overall-capacity number.
- Ticket rows retain Tito's configured release position, so the age ordering set
  in Tito remains authoritative.

## Parking

The travel section uses one Parking card for both general and Blue Badge parking.
That card only records travel intent; it explicitly tells purchasers to select
the number/type of parking tickets in the Tito ticket list.

The ticket widget still presents general parking and Blue Badge parking separately
because their availability rules differ. General parking gets a clear sold-out
message directing customers to walk or use either free bus. Blue Badge parking
states that a valid Blue Badge must be displayed in the vehicle.

## Travel response values

- `walk`
- `bus_wotton`
- `bus_charfield`
- `park`

Travel is stored under `registration.metadata.wfd_responses.travel` after the
booking completes. Choosing Parking is not treated as a parking reservation.

## Load behaviour

The availability endpoint remains read-only and cached. Browsers refresh at most
every 30 seconds while visible; hidden tabs do not poll. Netlify's durable cache
collapses requests before they reach Tito. Tito itself remains authoritative for
actual ticket locks, capacities and checkout availability.
