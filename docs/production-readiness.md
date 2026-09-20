# Production-readiness changes — 19 September 2026

Based on upstream `2026` commit `810374cfda3be5f81fb031a1f319f5b411ec7f73` (v27).

## Reproduce checks

Use Node 24 and pnpm. Run `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, then `pnpm build`.
The test suite uses synthetic Tito responses and never writes to Tito. Tests use Node's in-process test runner because child-process test isolation is unavailable in the audit environment.

The build publishes an explicit static-file allowlist to `dist`; Netlify separately bundles `netlify/functions`. Rebuilding first clears only this repository's `dist` directory. Tests, dependency folders, backend source and documentation are excluded from the public static output.

## Runtime configuration

`CONTEXT=production` selects `TITO_API_TOKEN_LIVE`; all other contexts select `TITO_API_TOKEN_TEST`. These are server-only secrets. Never place them in public JS, a committed `.env` file, or the report. All activity IDs and release slugs in `_lib/integration-config-2026.mjs` must be confirmed before production. They remain unchanged by this audit.

The committed live IDs are currently blank. Production availability fails closed with HTTP 503 until these are configured. The preview's successful ticket selector does not establish production readiness. `priceAutomationEnabled` remains false; the scheduled reconciliation function is retained because it is referenced by deployment configuration. Do not enable it merely to launch frontend wave selection.

## Verification boundaries

Automated tests cover request validation, required booking proof, metadata preservation, shared capacity, preschool capacity, wave progression, availability deduplication/backoff, persistent correction warnings, background capacity reductions, initial failure recovery, hidden-tab polling, and immediate post-purchase exit. Browser testing covers the deployed preview and local static production build. Local availability uses a recorded public test-mode fixture; write endpoints are blocked by the verification server.

Native Netlify rate limiting, global CDN behaviour, real completed-payment callbacks, full multi-browser testing, Core Web Vitals, and a complete historical secret scan require follow-up in the actual deployment environment. No Tito setting was edited and no paid order was completed.

Reference documentation: [Netlify rate limits](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/), [Netlify durable caching](https://docs.netlify.com/build/caching/caching-overview/), [Tito widget test/development plugins](https://ti.to/docs/api/widget).
