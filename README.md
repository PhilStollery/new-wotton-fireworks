# Wotton-under-Edge Firework Display 2026 — Tito integration v27

## Post-event website mode (9 November 2026)

The Netlify build now defaults to the thank-you homepage in `post-event.html`.
`scripts/build.mjs` publishes it as `dist/index.html`, while the original 2026
sales homepage remains in `index.html` for the archive and future adaptation.
The post-event page has no Tito checkout, availability polling or ticketing
JavaScript. Older `/go/...` links still resolve to the homepage, and `/tickets`
and `/visit` redirect there; terms and privacy pages remain available.

For a controlled legacy sales preview only, use `FIREWORKS_SITE_MODE=sales`
when building. Do not use that mode for another event without updating the
dates, booking content and Tito configuration. The live and test Tito secrets,
Netlify functions and scheduled-price automation are unchanged by this switch.


V27 is a cumulative hotfix over v26.

It fixes the page freeze introduced in v26. The cause was a self-triggering `MutationObserver` / `queueMicrotask` loop in the presentation patch: the patch changed the DOM, the observer immediately scheduled another microtask, and the browser could be starved of rendering and input time.

V27:

- restores presentation work to `requestAnimationFrame`;
- temporarily disconnects the presentation observer while that same presentation pass changes the DOM;
- reconnects it immediately afterwards so genuine Tito/widget updates are still observed;
- retains the v26 acknowledgement warning, FAQ changes, capacity handling and other presentation changes.

No Tito configuration or Netlify environment-variable changes are required.

## Production-readiness hardening

The working changes after v27 add bounded API input validation, availability retry/backoff and shared-capacity checks, persistent correction notices, reliable post-purchase flushing, regression tests, and a static production build. See [production-readiness notes](docs/production-readiness.md) for commands and launch blockers. The live IDs remain unconfigured; successful preview operation is not a production sign-off.
