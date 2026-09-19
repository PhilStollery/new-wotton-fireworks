# Integration notes — v22

## Price bands

All customer-facing admission releases may be on sale in Tito from the outset. The embedded widget mounts Super Saver, Advance and Standard together, while the website shows the cheapest currently usable paid band.

In preview/test mode, v22 identifies the real customer-facing releases and prefers Tito Activity allocation counts for Super Saver and Advance. This avoids summing release-level ticket counts, which was producing incorrect Advance figures in v20.

Standard has no artificial public capacity counter. It is mounted but hidden until it becomes the current available paid band.

## Pre-school

The free pre-school release is kept outside the paid waves. Its header is a static reminder that every attendee needs a ticket. It never displays overall event capacity.

## Parking

General parking and Blue Badge parking are separate ticket groups. V22 uses their Tito Activity capacity where a matching Activity can be identified. If a safe numerical capacity cannot be established, the site shows neutral booking guidance and lets Tito remain authoritative instead of declaring parking sold out.

When general parking is genuinely sold out, the page directs visitors to walk or use the free Wotton-under-Edge / Charfield buses. Blue Badge parking is stated separately and requires a valid Blue Badge to be displayed in the vehicle.

## Travel planning

The Walk / Bus / Driving cards collect a likely travel method for demand planning only:

- walk
- bus_wotton
- bus_charfield
- park

The customer is explicitly told that this is not a reservation or commitment and that they do not need to contact the organisers if their plans later change. Choosing Driving does not reserve a space; parking tickets must still be selected in the ticket widget. The card also warns that Wotton Road will be closed to non-ticket holders and that New Road must not be used for event access or parking.

The travel response is stored with the completed booking under `wfd_responses.travel`.

## Load behaviour

The availability endpoint retains the short in-function cache plus Netlify durable CDN caching. Browser refreshes remain reduced to 30 seconds while the tab is visible. Tito API requests have an 8-second timeout and the last recent successful availability payload can be used if a refresh fails.
