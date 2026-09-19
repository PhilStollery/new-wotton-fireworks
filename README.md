# Wotton-under-Edge Firework Display 2026 — Tito integration v25

V25 is cumulative over v24 and responds to the latest ticket-selector/visual review.

Key changes:

- Standard is no longer hard-capped at 2,500 in the website. It uses the remaining `# Event Capacity`, so comps and pre-school tickets correctly reduce later Standard availability.
- The renamed `Release 2 - Advance` Activity is recognised explicitly.
- Pre-school sits above Primary School Age in the price matrix, with its single price spanning all three paid release columns.
- Parking has its own compact two-column price table; the header carries the 150-space / closing-time information once.
- The selector now uses the dark site theme, with brighter programme contrast and readable highlight tags.
- Travel-choice controls align at the bottom of the cards.
- Quantity minus/input/plus controls are grouped and right-aligned.
- Automatic spillover notifies Tito after correcting both source and destination quantities, so the selector's Continue state is recalculated.
- Automatically corrected quantities flash to make the change visible; an uncorrected over-limit field receives a red highlight.
- The Blue Badge display requirement is inserted into the Blue Badge ticket description, not shown as a separate header/note.
- Old under-16 accompaniment text is removed from rendered Tito ticket descriptions.
- Pre-school descriptions no longer repeat “Free”; the price remains the single place that states it.

Tito remains responsible for checkout, payment, confirmation emails, QR codes, reservations/holds and gate check-in.
