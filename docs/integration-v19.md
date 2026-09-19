# V19 integration notes

## Price bands

All Tito releases may be on sale. The website mounts all configured releases but only shows the current paid admission band. Production uses the configured Super Saver and Advance Activities plus the overall event-capacity Activity for Standard availability. Date cut-offs are also applied by the availability endpoint.

For defence in depth, Super Saver and Advance should still have their intended end dates configured in Tito so a purchaser cannot obtain an expired cheaper ticket by bypassing the website.

## Pre-school admission

The free pre-school release is mounted as an always-visible group. V19 restyles its normal group counter as a static reminder that every attendee needs a ticket and moves the pre-school row ahead of the paid admission bands. It still uses the overall admission capacity in production.

## Parking

General paid parking uses the configured general-parking Activity. When it reaches zero, the website explicitly directs customers to walk or use the free bus from Wotton-under-Edge or Charfield. Blue Badge parking remains a separate release and is presented as separately reserved.

## Travel response

The existing four travel cards gain small optional choice buttons:

- `walk`
- `bus_wotton`
- `bus_charfield`
- `park`

The selection is stored locally while shopping and is written to the completed Tito registration after checkout.

## Post-purchase metadata

New responses are written to:

- `wfd_responses`
- `wfd_responses_updated_at`
- `wfd_responses_source`

Earlier `wfd_preferences`, `climbing` and `meet_and_greet` test metadata is left untouched. V19 does not destructively migrate old registrations.

## Load protection

`/api/ticket-availability` uses a short in-memory cache plus Netlify durable CDN caching. The existing 10-second browser loop is intercepted before the core ticket script loads and reduced to 30 seconds, with hidden tabs skipped. The old timestamp cache-buster is stripped.

The availability endpoint keeps a last-known-good result for up to five minutes if Tito has a transient API failure. Tito API calls also have an 8-second timeout.

## Production configuration

V19 does not overwrite `netlify/functions/_lib/integration-config-2026.mjs`, so any IDs/slugs already entered are preserved. Before production, confirm the live block contains:

- overall event-capacity Activity ID;
- Super Saver Activity ID;
- Advance Activity ID;
- overall parking Activity ID;
- general-parking Activity ID;
- Super Saver release slugs;
- Advance release slugs;
- Standard release slugs;
- pre-school release slug;
- paid parking release slug;
- Blue Badge parking release slug.

`/api/integration-health` will report these under `missing.liveTicketing` after `config.mjs` is replaced.
