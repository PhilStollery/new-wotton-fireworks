# Wotton-under-Edge Firework Display 2026 — Tito integration v26

V26 is cumulative over v25 and fixes the latest selector/section review without changing Tito checkout itself.

Key changes:

- Legacy v10/v11 counter wording is now suppressed at CSS level and replaced in a microtask, so old copy such as “Availability is shared…” / “left at this price” should no longer flash during quantity changes.
- Automatic quantity corrections remain visible until the customer presses **OK** rather than disappearing on a timer.
- Pre-school selections are included in the browser-side use of the overall `# Event Capacity`, so they immediately reduce the remaining admission capacity shown to later bands.
- The FAQ kicker now says **FAQ**.
- The FAQ list is restored as one rounded panel, with white right/down disclosure triangles on the left instead of overlapping +/- controls.
- The excessive vertical gap between Tickets and Plan your visit is reduced.
- The **Need an update?** area is restored to the full-width Round Table yellow treatment instead of a dark inset panel.

All v25 availability behaviour is retained: Super Saver and Advance use their Tito Activity capacities; Standard uses remaining overall Event Capacity; paid and Blue Badge parking share the single 150-space Parking Capacity Activity.

Tito remains responsible for checkout, payment, confirmation emails, QR codes, reservations/holds and gate check-in.
