# V23 Tito / Netlify integration notes

## Availability model

Tito Activities are authoritative. The browser does not invent sold counts.

- Super Saver: remaining = Tito Activity capacity - allocation count.
- Advance: remaining = Tito Activity capacity - allocation count.
- Standard: remaining = overall event Activity capacity - allocation count.
- Pre-school: independent free release, presented without an event-capacity counter.
- Parking: one overall 150-space Parking Activity. The public general allocation is 120 spaces. The first 30 Blue Badge bookings are protected; Blue Badge use above 30 reduces the 120 general spaces.

The Tito widget mounts all customer-facing releases. The site initially shows the cheapest available paid band. When browser selections consume the current band's remaining Activity capacity, the next band is revealed. An attempted excess is moved into the corresponding ticket position in the next band; this can cascade into Standard.

Tito remains the final authority at checkout and retains its own reservation/hold behaviour.

## Prices section

The Prices section is generated from the same availability response used by the selector. Release `display_price`, Tito position, shared Activity capacity and closing dates are used so the public table stays aligned with Tito.

## Travel planning

The existing travel cards collect one optional planning value:

- `walk`
- `bus_wotton`
- `bus_charfield`
- `park`

The customer is explicitly told that this is only to estimate demand, is not a commitment or reservation, and does not need updating if their plans later change. Parking is reserved only by selecting a parking ticket.

The value is stored after a completed booking in `wfd_responses.travel`.

## Load protection

- Browser availability refresh: 30 seconds while visible.
- Hidden tabs do not poll.
- Netlify durable CDN caching collapses availability traffic.
- Function process cache coalesces concurrent refreshes on a warm instance.
- Tito Admin calls have an 8-second timeout and can fall back briefly to a last-known-good payload.

## Post-purchase

The preference write requires registration slug and order reference, is rate-limited, and merges into `wfd_responses`. The completed-order panel warns customers that confirmation/ticket emails are sent by Tito.
