# Wotton-under-Edge Firework Display 2026 — Tito integration v24

V24 is cumulative over v23 and is the current test package.

## Ticket Activities

The site now expects the simplified Tito Activity model:

- `# Event Capacity` — 3,500 attendees
- `# Parking Capacity` — 150 spaces shared by paid and Blue Badge parking
- `Release 1 - Super Saver` — 300 paid admission tickets
- the 700-ticket Activity attached to Advance releases — Advance allocation
- `Release 3 - Standard` — Standard allocation usage

The browser derives the Standard commercial allocation as 2,500 tickets
(3,500 - 300 - 700), so the public counter never exposes the overall event
capacity as the Standard allocation.

## Key v24 changes

- Restores a clear visible ticket name on every Tito ticket row.
- Quantity controls are right aligned.
- When a paid price band is full, an extra ticket is kept at the current band's
  limit and moved to the matching ticket type in the next band.
- Super Saver, Advance and Standard browser counters reduce as tickets are
  selected locally, starting from the current Activity values returned by Tito.
- Standard is capped/displayed as 2,500 tickets.
- Parking is one shared 150-space pool for paid and Blue Badge parking.
- A brief status message explains any automatic spill to the next price band.
- The Prices section is a compact matrix: one row per admission ticket type and
  three price columns for Super Saver / Advance / Standard. Band limits and
  closing dates sit in the column headings.
- Pre-school and parking tickets are shown separately beneath the price matrix.
- Removes the old internal-facing price-table note.
- Restores roundels to the top-right of panels/cards.
- Step 3 now uses the same dark panel treatment as Steps 1 and 2.
- All main content sections use the dark visual theme.
- Location and beneficiary/support panels are deliberately quieter.
- Child-accompaniment restrictions are absent from the current public copy.

Tito still owns checkout, payment, order holds, confirmation emails, ticket QR
codes and gate check-in.
