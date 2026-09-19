# Wotton-under-Edge Firework Display 2026 — v20

V20 is cumulative over v19 and fixes the preview/ticket-presentation issues found during testing.

Key changes:

- the three travel cards now actively capture **Walk**, **Bus from Wotton**, **Bus from Charfield** or **Park**;
- paid and Blue Badge parking are represented by one **Parking** travel card; selecting it explicitly does **not** reserve parking and directs the purchaser to choose the number/type of spaces in the ticket list;
- Blue Badge wording now states that a valid Blue Badge must be displayed in the vehicle;
- admission-wave counters are forced back to ticket wording, so they cannot inherit the parking wording;
- the pre-school ticket has a static “Everyone attending needs a ticket” header and never exposes overall event capacity;
- preview/test mode now uses the real customer-facing Super Saver, Advance, Standard, pre-school and parking releases rather than the obsolete Test Wave releases;
- the paid price bands remain progressively revealed by the front end while all of those releases can remain on sale in Tito;
- the v19 server-side caching, post-purchase write validation/rate limiting, `wfd_responses` metadata and Tito-email warning are retained.

Tito remains the system of record for checkout, payment, confirmation emails, ticket QR codes, ticket capacity and gate check-in.
