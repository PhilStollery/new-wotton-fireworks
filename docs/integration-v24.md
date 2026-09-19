# Wotton Fireworks 2026 integration notes — v24

## Source of truth

Tito owns checkout, payment, reservations/holds, confirmation emails, ticket QR
codes and check-in. The website supplies presentation, source attribution,
optional post-purchase responses and a view of shared Activity availability.

## Admission Activities

The commercial allocations are:

- Super Saver: 300
- Advance: 700
- Standard: 2,500

All attendee tickets also belong to the 3,500-person Event Capacity Activity.
The Standard public limit is derived as 3,500 - 300 - 700. The Standard Activity
should also be set to 2,500 in Tito before launch.

All price-band releases can remain on sale in Tito. The site shows the cheapest
usable band and progressively reveals the next band when the current Activity
has no browser headroom. Overflow is transferred to the same ticket type in the
next band rather than leaving an invalid over-capacity value behind.

## Parking

Paid and Blue Badge parking use one shared 150-space `# Parking Capacity`
Activity. There is no separate general parking pool and no protected Blue Badge
reserve. A valid Blue Badge must be displayed for a Blue Badge parking booking.

## Prices

The public price comparison uses ticket families as rows and Super Saver,
Advance and Standard as columns. The allocation/deadline information is in the
column headings, with pre-school and parking listed separately beneath.

## Travel preference

Walking / Bus from Wotton / Bus from Charfield / Driving is optional planning
information. It does not reserve transport or parking and the customer does not
need to report a later change of plan. Parking is only reserved by selecting a
parking ticket in Tito.

## Load protection

Availability responses are cached/coalesced server-side and browser refreshes
are slowed while hidden. Post-purchase writes require the registration reference
and are rate-limited.
