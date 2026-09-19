# Wotton-under-Edge Firework Display 2026 — Tito integration v23

V23 is cumulative over v22 and is the current test package.

It keeps Tito responsible for checkout, payment, ticket emails, QR codes and gate check-in, while the site handles presentation and live availability.

Key changes in v23:

- Shared Activity remaining counts now drive Super Saver, Advance and Standard counters.
- Browser selections reduce those counters locally; selection beyond a band's remaining capacity is carried into the same ticket type in the next band.
- General parking starts from 120 spaces within the 150-space Parking Activity. Blue Badge bookings above the protected 30-space reserve reduce the general allocation.
- Pre-school has a simple non-numeric "Everyone attending needs a ticket" header.
- Paid-band headers show the band name plus remaining availability and closing date, rather than generic "left at this price" wording.
- Admission release descriptions are visually suppressed in the selector so the band/deadline information is not duplicated.
- Blue Badge eligibility wording is kept with the Blue Badge ticket row, not in the group header.
- A new Prices section presents all customer ticket releases, prices, allocations and closing dates before the Tickets section.
- Tickets are presented as three panels: Book for Wotton-under-Edge; Decide how you'll get there; Get your tickets.
- Travel planning remains optional planning data only. It is not a commitment and customers do not need to report later changes.
- Travel option labels remain Walking / Bus from Wotton / Bus from Charfield / Driving after selection.
- Previous child-accompaniment wording has been removed from the public site and terms.
- Visible dates use ordinals.

No new Netlify secrets are required.
