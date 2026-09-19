# Wotton-under-Edge Firework Display 2026 — v19

V19 is a cumulative launch-preparation package. It deliberately leaves the established `js/fireworks-2026.js` checkout implementation untouched.

It adds:

- shared Netlify/Tito availability caching and reduced visible-tab polling;
- mandatory booking-reference verification and rate limiting for post-purchase writes;
- a clean `wfd_responses` metadata namespace;
- travel preference capture from the existing travel cards;
- a standalone pre-school ticket reminder;
- explicit general-parking sold-out messaging and separate Blue Badge messaging;
- support for Super Saver → Advance → Standard front-end reveal while all Tito releases can remain available;
- a post-purchase warning that confirmation/ticket emails come from Tito;
- removal of the under-16 accompaniment restriction from the public FAQ and ticket terms;
- a production availability implementation ready for the existing live Activity/release configuration fields.

Tito remains the system of record for checkout, payment, ticket QR codes, confirmation emails and gate check-in.
