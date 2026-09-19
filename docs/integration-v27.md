# Integration notes — v27 hotfix

V27 is an urgent stability hotfix over v26.

V26 changed the presentation scheduler from `requestAnimationFrame` to `queueMicrotask` while a `MutationObserver` was watching the whole page. The presentation pass itself changes DOM nodes, which immediately triggered the observer again. Because the next pass was queued as another microtask, the browser could remain in a self-triggering microtask loop and never return to rendering or input handling.

V27 restores frame-based scheduling and disconnects the presentation observer while the presentation pass applies its own DOM changes. The observer is reconnected immediately afterwards, so later Tito/widget changes are still detected without the patch observing itself.

No ticket-capacity, spillover, travel, Tito checkout, post-purchase or visual rules from v26 are intentionally changed by this hotfix.
