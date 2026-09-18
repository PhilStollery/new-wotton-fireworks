# Wotton-under-Edge Firework Display - 2026 working version

This folder is arranged as a branch-ready overlay for `PhilStollery/new-wotton-fireworks`.

## Files changed/added

- `index.html` - 2026 public-facing site.
- `css/fireworks-2026.css` - 2026 layout and Round Table brand styling.
- `js/event-data-2026.js` - single source for repeated operational information (travel, visit guide and FAQs).
- `js/fireworks-2026.js` - renders shared content, embedded ticket widget and attribution handling.
- `images/2026/*` - web-optimised event photography plus approved Round Table / RT974 brand assets.
- `terms.html` - 2026 ticket terms.
- `privacy.html` - 2026 event privacy notice.
- `_redirects` - primary-domain redirect plus campaign/QR short routes and clean legal URLs.
- `netlify.toml` - existing cache-control configuration.

## Public UX

The intended journey is:

1. Confirm this is **Wotton-under-Edge, Gloucestershire (GL12)**.
2. Understand what is at the event and the actual evening programme.
3. Buy tickets in the **embedded booking panel on the page**.
4. Choose walking / bus / paid parking / Blue Badge parking while booking.
5. Continue straight into **Plan your visit** below the booking section.
6. Use FAQ for secondary questions.

There is no public-facing separation between the website and the ticketing platform. Do not tell customers that prices "come from Ti.to" or send them away to a separate ticketing page unless the embedded widget needs a fallback. The embedded widget is the only detailed public ticket/price list, so prices and live availability are not duplicated elsewhere on the site.

## Keeping ticketing and the website consistent

Use Ti.to as the transaction/system-of-record layer for ticket names, prices, availability, parking products and checkout data.

Use the 2026 Tito Setup & Automation Manifest plus `js/event-data-2026.js` as the customer-facing content reference for the website. The public wording in the embedded booking flow, confirmations and website should remain aligned with the manifest rather than being maintained as competing versions.

The website is the primary public event guide. Confirmation messages should point people back to `https://wotton-firework-display.co.uk/#visit` for current travel, access and event-night information.

Never expose the Ti.to Admin API token in browser JavaScript or in the repository. Any future validation/sync against Ti.to should run through a server-side Netlify function with credentials held as environment variables.

## Embedded ticket widget

`js/event-data-2026.js` currently has:

```js
ticketMode: "preview",
titoEvent: ""
```

When the 2026 event is ready for public sales, set `titoEvent` to `wotton-firework-display/2026` and switch `ticketMode` to `"tickets"`.

The widget preserves `utm_*` query parameters in order metadata and passes the URL `source` parameter into Ti.to source tracking.

### Parking options

Alongside admission tickets the booking flow needs:

- Paid parking - £10 per vehicle.
- Blue Badge parking - free, but reservable so an accessible space is protected.

General parking is **not deliberately restricted as a sales tactic**. The number of spaces is constrained by the physical site. Public wording should say this plainly.

## Confirmed 2026 programme

- 17:00 - gates, food, stalls and fairground open.
- 17:30 - warm-up act.
- 18:00 - lower-level quieter firework display, approximately five minutes.
- 18:30 - headline act.
- 19:00 - bonfire lighting.
- 19:30 - high-level main firework display, approximately twelve minutes.

Everyone enters through the **Wotton Community Sports Centre entrance on Wotton Road**, whether arriving on foot, by car or by the event bus. Other site accesses are emergency-only.

## FAQ/weather wording

Rain on its own is unlikely to cancel the event. The intended public position is: if the site remains safe and the fireworks can be launched and the bonfire lit safely, the event goes ahead. If conditions require a change, the website and Wotton Round Table Facebook page carry the update.

Cancellation wording should lead with the refund: if the event is cancelled before it takes place and there is no replacement date, affected admission and paid event parking are offered a refund. The separate post-purchase donation choice can then explain that many event costs have already been spent/committed by the point a cancellation decision is made. Donation remains optional and the customer is reminded of their recorded choice before it is finalised.

## Brand and logo use

- Keep the approved RT974 horizontal logo prominent in the header and footer.
- The official **Round Table TableGrey roundel** from the 2024 brand assets is used as a small decorative motif on light information cards. The Do More roundel is not used on the website.
- Do not crop, recolour, distort, tint or apply effects to the logo artwork.
- Maintain clear space and avoid covering important image subjects.
- Avoid identifiable children in public website photography unless the image is specifically cleared for that use.
- Prefer silhouettes, wide crowd shots, fireworks, bonfire, finished food and adult volunteers.

## Fonts

The website uses **Open Sans throughout**, including headings, subheads, navigation and body copy. The heavier Open Sans weights provide the bold display treatment while remaining easier to read on screen. Open Sans is loaded from Google Fonts; no Eurostile font files are required in the deployable folder.

## Drone/video hero

The site is ready for an optional hero video but does not currently ship one. When a suitable drone clip is identified:

1. Edit it to roughly 8-15 seconds, muted and loopable.
2. Export a lightweight MP4 (ideally under ~5 MB for the hero).
3. Add it as `images/2026/hero-drone.mp4`.
4. Set `heroVideo: "images/2026/hero-drone.mp4"` in `js/event-data-2026.js`.

The still hero remains as the poster/fallback, and the video is suppressed for people who prefer reduced motion.

## Still to confirm before launch

Do not invent these. Confirm them with the event team and update the manifest / `js/event-data-2026.js` as appropriate:

- Bus stops, service frequency, first/last buses and return arrangements.
- Detailed parking arrival/marshalling instructions beyond the single public entrance.
- Accessibility details beyond parking and the known outdoor ground conditions (for example toilets and any specific routes/facilities).
- Any additional 2026 operational restrictions not already in the manifest.
- Final implementation/testing of the embedded widget, group QR/check-in flow and post-purchase preference journey.

## 2026 admission pricing to configure in Ti.to

Internal setup reference only:

- Super Saver - first **300 paid tickets**, ends no later than 17:00 on 5 October.
- Advance - next **700 paid tickets**, ends no later than 17:00 on 26 October.
- Standard - thereafter to capacity.
- Not yet in school (has not started Reception) - free throughout, but every attendee still needs a ticket.

Do not expose the 300/700 allocation mechanics as website explanatory copy. Public messaging may say that the first 1,000 paid admission tickets are discounted.


## Netlify/Tito integration scaffold

The working folder now also contains a disabled-by-default serverless scaffold under `netlify/functions/`, plus `after-booking.html`, `gate.html`, `.env.example`, `package.json` and `docs/integration.md`.

The key safety rule is that adding these files to a branch does **not** activate any write automation. `FIREWORKS_AUTOMATION_ENABLED`, `POST_PURCHASE_ENABLED`, `CUSTOM_CONFIRMATION_ENABLED` and `MEET_AND_GREET_ENABLED` all default to false when the corresponding Netlify environment variable is absent. Real credentials belong in Netlify environment variables, never in Git/Drive source files.

The public ticket widget uses Tito Widget v2 with the `inline` plugin so the booking stays on the page and the documented `on:registration:finished` callback can hand a completed booking into the post-purchase journey. UTM parameters are stored in Tito registration metadata; the Tito `source` comes from the historic source code in the landing URL and defaults to `Direct`.

The webhook endpoint verifies Tito's current HMAC-SHA256 `Tito-Signature` against the raw request body before doing anything. The 10-minute reconciler uses Tito Activities as the hard allocation control and only changes which paid release band is available; it never raises the Activity capacities. Local transition times are evaluated in `Europe/London` so the October clock change is handled correctly.

See `docs/integration.md` for the exact enablement/testing sequence and `.env.example` for the full configuration checklist.
