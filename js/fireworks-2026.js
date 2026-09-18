(() => {
  const data = window.FIREWORKS_EVENT;
  if (!data) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const ATTRIBUTION_KEY = 'wottonFireworksAttribution2026';
  const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const POST_PURCHASE_API = '/api/post-purchase-preference';
  const POST_PURCHASE_STORAGE_KEY = 'wfdPendingPostPurchase2026';
  const POST_PURCHASE_STORAGE_TTL_MS = 24 * 60 * 60 * 1000;


  const sourceTracks = {
    bluecoat: {
      source: 'BlueCoat',
      beneficiary: 'Blue Coat School PTA',
      metadata: { source_route: 'bluecoat', utm_source: 'bluecoat_pta', utm_medium: 'qr', utm_campaign: 'fireworks_2026' }
    },
    british: {
      source: 'British',
      beneficiary: 'The British School PTA',
      metadata: { source_route: 'british', utm_source: 'british_school_pta', utm_medium: 'qr', utm_campaign: 'fireworks_2026' }
    },
    charfield: {
      source: 'Charfield',
      beneficiary: 'Friends of Charfield Primary School',
      metadata: { source_route: 'charfield', utm_source: 'charfield_school', utm_medium: 'qr', utm_campaign: 'fireworks_2026' }
    },
    kingswood: {
      source: 'Kingswood',
      beneficiary: 'Kingswood School Association',
      metadata: { source_route: 'kingswood', utm_source: 'kingswood_primary', utm_medium: 'qr', utm_campaign: 'fireworks_2026' }
    },
    'north-nibley': {
      source: 'Nibley',
      beneficiary: 'Friends of North Nibley School',
      metadata: { source_route: 'north-nibley', utm_source: 'north_nibley_school', utm_medium: 'qr', utm_campaign: 'fireworks_2026' }
    },
    nibley: {
      source: 'Nibley',
      beneficiary: 'Friends of North Nibley School',
      metadata: { source_route: 'nibley', utm_source: 'north_nibley_school', utm_medium: 'qr', utm_campaign: 'fireworks_2026' }
    },
    hockey: {
      source: 'Hockey',
      beneficiary: 'Wotton-under-Edge Hockey Club',
      metadata: { source_route: 'hockey', utm_source: 'wotton_hockey', utm_medium: 'qr', utm_campaign: 'fireworks_2026' }
    },
    rovers: {
      source: 'Rovers',
      beneficiary: 'Wotton Rovers FC',
      metadata: { source_route: 'rovers', utm_source: 'wotton_rovers', utm_medium: 'qr', utm_campaign: 'fireworks_2026' }
    },
    rugby: {
      source: 'Rugby',
      beneficiary: 'Wotton Rugby Football Club',
      metadata: { source_route: 'rugby', utm_source: 'wotton_rugby', utm_medium: 'qr', utm_campaign: 'fireworks_2026' }
    },
    klb: { source: 'KLB', metadata: { source_route: 'klb', utm_source: 'klb_friends', utm_medium: 'qr', utm_campaign: 'fireworks_2026' } },
    wd: { source: 'WD', metadata: { source_route: 'wd', utm_source: 'wotton_directory', utm_medium: 'qr', utm_campaign: 'fireworks_2026' } },
    gate: { source: 'Gate', metadata: { source_route: 'gate', utm_source: 'gate', utm_medium: 'assisted_online', utm_campaign: 'fireworks_2026' } },
    poster: { source: 'Direct', metadata: { source_route: 'poster', utm_source: 'poster', utm_medium: 'qr', utm_campaign: 'fireworks_2026', utm_content: 'general' } },
    flyer: { source: 'Direct', metadata: { source_route: 'flyer', utm_source: 'flyer', utm_medium: 'qr', utm_campaign: 'fireworks_2026', utm_content: 'general' } },
    facebook: { source: 'Direct', metadata: { source_route: 'facebook', utm_source: 'facebook', utm_medium: 'organic_social', utm_campaign: 'fireworks_2026', utm_content: 'general' } },
    'facebook-launch': { source: 'Direct', metadata: { source_route: 'facebook-launch', utm_source: 'facebook', utm_medium: 'organic_social', utm_campaign: 'fireworks_2026', utm_content: 'launch' } }
  };

  let storedAttribution = null;
  let availabilityState = null;
  let registrationInProgress = false;
  let titoLifecycleReady = false;
  let quantityGuardCleanup = null;
  let availabilityTimer = null;
  let lastRequestedQuantity = 0;
  let visibleWaveKeys = [];
  let titoUiObserver = null;
  let titoUiScheduled = false;
  let stickySelectionWarning = false;
  let finishedWidgetResetPending = false;
  let finishedRegistration = null;
  let finishedOverlaySeen = false;
  let finishedResetScheduled = false;
  let postPurchaseRegistration = null;
  let postPurchaseAnswers = {};
  let postPurchaseError = '';
  let postPurchaseSaveTimer = null;
  let postPurchaseSaveInFlight = false;
  let postPurchasePendingAnswers = {};
  let postPurchaseSaveStates = {};
  let postPurchaseModalOverlay = null;

  function fillSharedFields() {
    const values = {
      eventName: data.eventName,
      dateDisplay: data.dateDisplay,
      placeDisplay: data.placeDisplay,
      placeShort: data.placeShort,
      venueDisplay: data.venueDisplay,
      entranceDisplay: data.entranceDisplay,
      salesOpenDisplay: data.salesOpenDisplay
    };
    Object.entries(values).forEach(([key, value]) => {
      $$(`[data-event-field="${key}"]`).forEach((el) => { el.textContent = value; });
    });
  }

  function renderHighlights() {
    const root = $('#highlight-list');
    if (!root || !Array.isArray(data.highlights)) return;
    root.innerHTML = data.highlights.map((item) => `<span>${item}</span>`).join('');
  }

  function renderProgramme() {
    const root = $('#programme-list');
    if (!root || !Array.isArray(data.programme)) return;
    root.innerHTML = data.programme.map((item) => `
      <li><time>${item.time}</time><div><strong>${item.title}</strong><span>${item.copy}</span></div></li>
    `).join('');
  }

  function renderTravel() {
    const root = $('#travel-choices');
    if (!root) return;
    root.innerHTML = data.travel.map((item) => `
      <article class="travel-choice">
        <span class="travel-label">${item.eyebrow}</span>
        <div class="travel-choice-head"><h3>${item.title}</h3><strong>${item.price}</strong></div>
        <p>${item.copy}</p>
      </article>
    `).join('');
  }

  function renderVisit() {
    const root = $('#visit-grid');
    if (!root) return;
    root.innerHTML = data.visit.map((item) => `<article class="visit-card"><h3>${item.title}</h3><p>${item.copy}</p></article>`).join('');
  }

  function renderFaqs() {
    const root = $('#faq-list');
    if (!root) return;
    root.innerHTML = data.faqs.map((item, index) => `
      <details${index === 0 ? ' open' : ''}><summary>${item.q}</summary><p>${item.a}</p></details>
    `).join('');
  }

  function routeAttribution() {
    const match = window.location.pathname.replace(/\/+$/, '').match(/^\/go\/([^/]+)$/i);
    if (!match) return null;
    const slug = decodeURIComponent(match[1]).toLowerCase();
    const track = sourceTracks[slug];
    return track ? { route: slug, ...track } : null;
  }

  function queryAttribution() {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    if (!source) return null;
    return { source };
  }

  function saveAttribution(value) {
    if (!value?.source) return value;
    const record = {
      ...value,
      savedAt: Date.now(),
      expiresAt: Date.now() + ATTRIBUTION_TTL_MS
    };
    try { localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(record)); }
    catch { /* localStorage may be unavailable; the current page still works */ }
    return record;
  }

  function loadStoredAttribution() {
    try {
      const record = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || 'null');
      if (!record?.source || !record.expiresAt || record.expiresAt < Date.now()) {
        localStorage.removeItem(ATTRIBUTION_KEY);
        return null;
      }
      return record;
    } catch {
      return null;
    }
  }

  function attribution() {
    const routed = routeAttribution();
    if (routed) return saveAttribution(routed);

    const queried = queryAttribution();
    if (queried) return saveAttribution(queried);

    return loadStoredAttribution() || { source: data.defaultSource || 'Direct' };
  }

  function renderSourceSupport(attrs) {
    const root = $('#source-support');
    if (!root) return;

    if (!attrs?.beneficiary) {
      root.hidden = true;
      root.replaceChildren();
      return;
    }

    root.innerHTML = `
      <span class="support-mark" aria-hidden="true">♥</span>
      <div>
        <strong>Your tickets are supporting ${attrs.beneficiary}</strong>
        <p>All profits from Wotton Firework Display go back into the local community. Because you came through a link from ${attrs.beneficiary}, a portion of the proceeds from your booking will also be donated specifically to them. Thank you for supporting your community.</p>
      </div>
    `;
    root.hidden = false;
  }

  function showSelectionWarning(title, copy) {
    const root = $('#ticket-selection-warning');
    if (!root) return;
    root.innerHTML = `<strong>${title}</strong><p>${copy}</p>`;
    root.hidden = false;
  }

  function clearSelectionWarning() {
    const root = $('#ticket-selection-warning');
    if (!root) return;
    root.hidden = true;
    root.replaceChildren();
  }

  function renderAvailability(wave, selected = 0, nextWave = null) {
    const root = $('#ticket-availability');
    if (!root) return;

    if (!wave) {
      root.classList.add('is-empty');
      root.innerHTML = '<strong>These tickets are currently sold out.</strong><span>The booking panel will update if more tickets become available.</span>';
      root.hidden = false;
      return;
    }

    const availableAtLoad = Math.max(0, Number(wave.remaining || 0));
    const selectedCount = Math.max(0, Number(selected || 0));
    const left = Math.max(availableAtLoad - selectedCount, 0);
    const overBy = Math.max(selectedCount - availableAtLoad, 0);

    root.classList.toggle('is-empty', left === 0);
    root.classList.toggle('is-over', overBy > 0);

    if (overBy > 0) {
      root.innerHTML = `<strong>No tickets left at this price</strong><span>Your selection is ${overBy} ${overBy === 1 ? 'ticket' : 'tickets'} over the available allocation. See the message below.</span>`;
    } else if (left === 0) {
      const nextCopy = nextWave
        ? ' Add any extra tickets using the next price shown below.'
        : ' You have selected the remaining allocation.';
      root.innerHTML = `<strong>No tickets left at this price</strong><span>You have selected all ${availableAtLoad} available at this price.${nextCopy}</span>`;
    } else {
      const noun = left === 1 ? 'ticket' : 'tickets';
      const selectionCopy = selectedCount > 0 ? `${selectedCount} selected. ` : '';
      root.innerHTML = `<strong>${left} ${noun} left at this price</strong><span>${selectionCopy}Availability is shared across the ticket types below.</span>`;
    }

    root.hidden = false;
  }

  function ticketPlaceholder(title, copy) {
    const mount = $('#tito-mount');
    if (!mount) return;
    mount.innerHTML = `
      <div class="ticket-integration-state">
        <strong>${title}</strong>
        <p>${copy}</p>
      </div>
    `;
  }

  async function fetchAvailability() {
    const response = await fetch(`/api/ticket-availability?_=${Date.now()}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'Ticket availability is unavailable.');
    return result;
  }

  function ensureTitoScript(testMode) {
    if (document.querySelector('script[data-tito-widget]')) return;
    const script = document.createElement('script');
    const plugins = ['inline'];
    if (testMode) plugins.push('test_mode');
    script.src = `https://js.tito.io/v2/with/${plugins.join(',')}`;
    script.async = true;
    script.dataset.titoWidget = 'true';
    document.head.appendChild(script);
  }

  function registrationQuantity(registration) {
    if (Array.isArray(registration?.line_items)) {
      const total = registration.line_items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
      if (total) return total;
    }
    if (Array.isArray(registration?.tickets)) return registration.tickets.length;
    if (Number.isFinite(Number(registration?.tickets_count))) return Number(registration.tickets_count);
    return 0;
  }

  function markTitoUi() {
    const eventPath = availabilityState?.event ? `https://ti.to/${availabilityState.event}`.replace(/\/+$/, '') : '';
    if (!eventPath) return;

    // Keep checkout DOM handling deliberately tiny. The only thing we change
    // inside Tito is the finished-order "Share this event" row, because the
    // public destination we want customers to use is this website.
    $$('input').forEach((input) => {
      const value = String(input.value || '').replace(/\/+$/, '');
      if (value !== eventPath) return;
      let node = input;
      for (let i = 0; i < 6 && node; i += 1, node = node.parentElement) {
        if (/share this event/i.test(String(node.textContent || ''))) {
          node.classList.add('wfd-tito-share-row');
          node.hidden = true;
          break;
        }
      }
    });
  }

  function scheduleTitoUiMark() {
    if (titoUiScheduled) return;
    titoUiScheduled = true;
    window.requestAnimationFrame(() => {
      titoUiScheduled = false;
      markTitoUi();
    });
  }

  function setupTitoUiObserver() {
    if (titoUiObserver) return;
    titoUiObserver = new MutationObserver(() => {
      // Keep this observer passive during checkout. Once Tito has confirmed the
      // order, it is also allowed to hide Tito's finished-order overlay because
      // our own continuation modal has already taken over.
      scheduleTitoUiMark();
      window.requestAnimationFrame(() => {
        handoffFinishedTitoFromDom();
        if (postPurchaseRegistration || finishedRegistration) suppressFinishedTitoOverlay();
      });
    });
    titoUiObserver.observe(document.body, { childList: true, subtree: true });
    scheduleTitoUiMark();
  }

  function setupTitoLifecycle() {
    if (titoLifecycleReady) return;
    titoLifecycleReady = true;

    window.tito = window.tito || function() { (window.tito.q = window.tito.q || []).push(arguments); };

    window.tito('on:registration:started', (registration) => {
      registrationInProgress = true;
      quantityGuardCleanup?.suspend?.();
      const actual = registrationQuantity(registration);
      if (lastRequestedQuantity && actual && actual < lastRequestedQuantity) {
        stickySelectionWarning = true;
        showSelectionWarning(
          'Ticket availability has just changed',
          `You selected ${lastRequestedQuantity} tickets, but only ${actual} could be reserved. Please review your order carefully before continuing.`
        );
        $('#ticket-selection-warning')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    window.tito('on:registration:finished', (registration) => {
      registrationInProgress = false;
      stickySelectionWarning = false;
      clearSelectionWarning();

      // Tito has now completed the order. Move straight into our continuation
      // modal rather than asking the customer to close Tito's confirmation first.
      // Tito's finished overlay remains underneath for a moment, then is hidden
      // once its finished-state DOM appears.
      finishedRegistration = registration || null;
      finishedWidgetResetPending = false;
      finishedOverlaySeen = false;
      postPurchaseAnswers = {};
      postPurchaseSaveStates = {};
      postPurchasePendingAnswers = {};
      if (postPurchaseSaveTimer) {
        window.clearTimeout(postPurchaseSaveTimer);
        postPurchaseSaveTimer = null;
      }
      postPurchaseError = '';
      clearTitoCheckoutRoute();

      const snapshot = postPurchaseSnapshot(finishedRegistration);
      beginPostPurchaseHandoff(snapshot);

      // Tito can render its finished DOM a fraction after the callback. Recheck
      // a few times so our modal always wins the visual handoff.
      [0, 40, 120, 300, 700].forEach((delay) => {
        window.setTimeout(() => {
          scheduleTitoUiMark();
          suppressFinishedTitoOverlay();
        }, delay);
      });

      // Refresh availability in the background so "Book more tickets" starts from
      // current figures without replacing the confirmation/follow-up modal.
      window.setTimeout(async () => {
        try {
          availabilityState = await fetchAvailability();
        } catch (error) {
          console.warn('WFD post-checkout availability refresh failed:', error.message);
        }
      }, 500);

      window.dispatchEvent(new CustomEvent('wfd:registration-finished', { detail: finishedRegistration }));
    });
  }

  function isVisible(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }

  function numericValue(el) {
    const raw = Number(el?.value);
    if (!Number.isFinite(raw) || raw < 0 || raw > 500) return 0;
    return Math.floor(raw);
  }

  function titoCheckoutRouteActive() {
    try {
      return new URL(window.location.href).searchParams.has('tito');
    } catch {
      return false;
    }
  }

  function clearTitoCheckoutRoute() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('tito')) return;
      url.searchParams.delete('tito');
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(window.history.state, '', next);
    } catch {
      // A failed cosmetic URL cleanup must never interfere with a completed order.
    }
  }

  function titoCheckoutOverlayVisible() {
    return $$('.tito-overlay').some(isVisible);
  }

  function finishedTitoOverlays() {
    const successPattern = /successfully placed your order|view receipt|print all tickets|order reference|booking complete/i;
    return $$('.tito-overlay').filter((overlay) => (
      Boolean($('.tito-registration-finished', overlay)) ||
      successPattern.test(String(overlay.textContent || ''))
    ));
  }

  function registrationSlugFromTitoRoute() {
    try {
      const route = new URL(window.location.href).searchParams.get('tito') || '';
      const match = route.match(/\/registrations\/([^/?#]+)/i);
      return match ? decodeURIComponent(match[1]) : '';
    } catch {
      return '';
    }
  }

  function finishedSnapshotFromDom() {
    const finished = $('.tito-overlay .tito-registration-finished');
    if (!finished) return null;

    const slug = String(finishedRegistration?.slug || registrationSlugFromTitoRoute() || '');
    if (!slug) return null;

    const text = String(finished.textContent || '');
    const referenceMatch = text.match(/(?:order\s*(?:ref(?:erence)?|#)?|booking\s*(?:ref(?:erence)?|#)?)[\s:]*([A-Z0-9-]{3,})/i);
    const receiptLink = $('.tito-receipt-link[href]', finished) || $('a[href*="receipt"]', finished);

    return {
      slug,
      reference: String(finishedRegistration?.reference || referenceMatch?.[1] || ''),
      receiptUrl: safeTitoUrl(finishedRegistration?.receipt_url || finishedRegistration?.receiptUrl || receiptLink?.href || ''),
      registrationUrl: safeTitoUrl(finishedRegistration?.registration_url || finishedRegistration?.registrationUrl || ''),
      savedAt: Date.now()
    };
  }

  function beginPostPurchaseHandoff(snapshot) {
    if (!snapshot?.slug) return false;
    if (postPurchaseRegistration?.slug === snapshot.slug && postPurchaseModalOverlay?.isConnected) {
      const merged = {
        ...postPurchaseRegistration,
        ...snapshot,
        reference: snapshot.reference || postPurchaseRegistration.reference || '',
        receiptUrl: snapshot.receiptUrl || postPurchaseRegistration.receiptUrl || '',
        registrationUrl: snapshot.registrationUrl || postPurchaseRegistration.registrationUrl || ''
      };
      postPurchaseRegistration = merged;
      rememberPostPurchase(merged);
      renderPostPurchaseFollowup(merged);
      suppressFinishedTitoOverlay();
      return true;
    }

    clearTitoCheckoutRoute();
    rememberPostPurchase(snapshot);
    renderPostPurchaseFollowup(snapshot);
    suppressFinishedTitoOverlay();
    return true;
  }

  function handoffFinishedTitoFromDom() {
    if (postPurchaseRegistration?.slug && postPurchaseModalOverlay?.isConnected) return true;
    const snapshot = finishedSnapshotFromDom();
    if (!snapshot) return false;
    return beginPostPurchaseHandoff(snapshot);
  }

  function suppressFinishedTitoOverlay() {
    let found = false;
    finishedTitoOverlays().forEach((overlay) => {
      overlay.classList.add('wfd-finished-tito-hidden');
      overlay.setAttribute('aria-hidden', 'true');
      found = true;
    });
    return found;
  }

  function disposeFinishedTitoOverlay() {
    const overlays = [...new Set([
      ...finishedTitoOverlays(),
      ...$$('.tito-overlay.wfd-finished-tito-hidden')
    ])];

    overlays.forEach((overlay) => {
      const close = $('.tito-close-x', overlay);
      if (close && typeof close.click === 'function') {
        try { close.click(); } catch { /* completed-order fallback below */ }
      }
      // The order is already finished. If Tito leaves the overlay behind after
      // the close action, removing that finished DOM is safe and prevents it
      // blocking a later booking.
      window.setTimeout(() => {
        if (overlay.isConnected) overlay.remove();
      }, 60);
    });
  }

  function ensurePostPurchaseOverlay() {
    if (postPurchaseModalOverlay?.isConnected) {
      return $('.wfd-post-purchase-modal-content', postPurchaseModalOverlay);
    }

    const overlay = document.createElement('div');
    overlay.id = 'wfd-post-purchase-overlay';
    overlay.className = 'wfd-post-purchase-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'wfd-post-purchase-title');
    overlay.innerHTML = `
      <div class="wfd-post-purchase-modal">
        <div class="wfd-post-purchase-modal-content"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    postPurchaseModalOverlay = overlay;
    return $('.wfd-post-purchase-modal-content', overlay);
  }

  function setPostPurchaseMode(active) {
    const shell = $('.ticket-selector-shell');
    const legacyRoot = $('#post-purchase-followup');
    const ticketBox = $('.ticket-box');

    if (shell) shell.hidden = Boolean(active);
    if (legacyRoot) legacyRoot.hidden = true;
    ticketBox?.classList.toggle('showing-post-purchase', Boolean(active));
    document.body.classList.toggle('wfd-post-purchase-modal-open', Boolean(active));

    if (active) {
      ensurePostPurchaseOverlay();
    } else if (postPurchaseModalOverlay) {
      postPurchaseModalOverlay.remove();
      postPurchaseModalOverlay = null;
    }
  }

  function postChoice(stage, title, body, positiveLabel, positiveValue, negativeLabel, negativeValue) {
    const selected = postPurchaseAnswers[stage] || '';
    const positiveSelected = selected === positiveValue;
    const negativeSelected = selected === negativeValue;
    const saveState = postPurchaseSaveStates[stage] || (selected ? 'saved' : '');
    const statusText = saveState === 'saving' ? 'Saving…'
      : saveState === 'error' ? 'Not saved'
      : selected ? 'Saved' : '';

    return `
      <section class="post-purchase-choice-card" data-post-stage="${stage}">
        <h4>${title}</h4>
        <p>${body}</p>
        <div class="post-purchase-choice-actions">
          <button type="button" class="post-purchase-choice${positiveSelected ? ' is-selected' : ''}" data-post-choice data-stage="${stage}" data-value="${positiveValue}" aria-pressed="${positiveSelected ? 'true' : 'false'}">${positiveLabel}</button>
          <button type="button" class="post-purchase-choice post-purchase-choice-secondary${negativeSelected ? ' is-selected' : ''}" data-post-choice data-stage="${stage}" data-value="${negativeValue}" aria-pressed="${negativeSelected ? 'true' : 'false'}">${negativeLabel}</button>
          <span class="post-purchase-saved" data-post-save-state="${stage}" aria-live="polite">${statusText}</span>
        </div>
      </section>
    `;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function safeTitoUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' && url.hostname === 'ti.to' ? url.href : '';
    } catch {
      return '';
    }
  }

  function postPurchaseSnapshot(registration = finishedRegistration) {
    return {
      slug: String(registration?.slug || ''),
      reference: String(registration?.reference || ''),
      receiptUrl: safeTitoUrl(registration?.receipt_url || registration?.receiptUrl || ''),
      registrationUrl: safeTitoUrl(registration?.registration_url || registration?.registrationUrl || ''),
      savedAt: Date.now()
    };
  }

  function rememberPostPurchase(snapshot = postPurchaseRegistration) {
    if (!snapshot?.slug) return;
    try {
      localStorage.setItem(POST_PURCHASE_STORAGE_KEY, JSON.stringify({
        ...snapshot,
        savedAt: Number(snapshot.savedAt || Date.now()),
        answers: { ...postPurchaseAnswers }
      }));
    } catch {
      // The immediate post-checkout journey still works without localStorage.
    }
  }

  function loadPendingPostPurchase() {
    try {
      const stored = JSON.parse(localStorage.getItem(POST_PURCHASE_STORAGE_KEY) || 'null');
      if (!stored?.slug || !stored.savedAt) return null;
      if (Date.now() - Number(stored.savedAt) > POST_PURCHASE_STORAGE_TTL_MS) {
        localStorage.removeItem(POST_PURCHASE_STORAGE_KEY);
        return null;
      }
      postPurchaseAnswers = stored.answers && typeof stored.answers === 'object' ? { ...stored.answers } : {};
      return stored;
    } catch {
      return null;
    }
  }

  function clearPendingPostPurchase() {
    try { localStorage.removeItem(POST_PURCHASE_STORAGE_KEY); }
    catch { /* optional storage */ }
  }

  function updatePostPurchaseChoiceUi(stage) {
    const root = postPurchaseModalOverlay || document;
    const card = $(`[data-post-stage="${CSS.escape(stage)}"]`, root);
    if (!card) return;

    const selected = postPurchaseAnswers[stage] || '';
    $$('[data-post-choice]', card).forEach((button) => {
      const isSelected = button.dataset.value === selected;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });

    const status = $(`[data-post-save-state="${CSS.escape(stage)}"]`, card);
    if (status) {
      const saveState = postPurchaseSaveStates[stage] || (selected ? 'saved' : '');
      status.textContent = saveState === 'saving' ? 'Saving…'
        : saveState === 'error' ? 'Not saved'
        : selected ? 'Saved' : '';
    }
  }

  async function savePostPurchaseAnswers(answers) {
    const snapshot = postPurchaseRegistration;
    if (!snapshot?.slug) throw new Error('Booking details are not available.');

    const response = await fetch(POST_PURCHASE_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        registrationSlug: snapshot.slug,
        reference: snapshot.reference,
        answers
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'We could not save that choice.');
    return result;
  }

  async function flushPostPurchaseChoices() {
    if (postPurchaseSaveInFlight) return;
    const entries = Object.entries(postPurchasePendingAnswers);
    if (!entries.length) return;

    postPurchasePendingAnswers = {};
    postPurchaseSaveInFlight = true;
    const batch = Object.fromEntries(entries);

    try {
      await savePostPurchaseAnswers(batch);
      Object.entries(batch).forEach(([stage, value]) => {
        if (postPurchaseAnswers[stage] === value) {
          postPurchaseSaveStates[stage] = 'saved';
          updatePostPurchaseChoiceUi(stage);
        }
      });
      postPurchaseError = '';
    } catch (error) {
      Object.entries(batch).forEach(([stage, value]) => {
        if (postPurchaseAnswers[stage] === value) {
          postPurchaseSaveStates[stage] = 'error';
          updatePostPurchaseChoiceUi(stage);
        } else {
          postPurchasePendingAnswers[stage] = postPurchaseAnswers[stage];
        }
      });
      postPurchaseError = error.message || 'We could not save one or more choices. Please try again.';
    } finally {
      postPurchaseSaveInFlight = false;
      if (Object.keys(postPurchasePendingAnswers).length) {
        window.setTimeout(() => flushPostPurchaseChoices(), 0);
      }
    }
  }

  function queuePostPurchaseChoice(stage, value) {
    postPurchaseError = '';
    postPurchaseAnswers[stage] = value;
    postPurchaseSaveStates[stage] = 'saving';
    postPurchasePendingAnswers[stage] = value;
    rememberPostPurchase(postPurchaseRegistration);
    updatePostPurchaseChoiceUi(stage);

    if (postPurchaseSaveTimer) window.clearTimeout(postPurchaseSaveTimer);
    postPurchaseSaveTimer = window.setTimeout(() => {
      postPurchaseSaveTimer = null;
      flushPostPurchaseChoices();
    }, 160);
  }

  async function resetAfterPostPurchase({ scrollToTickets = false } = {}) {
    clearPendingPostPurchase();
    disposeFinishedTitoOverlay();
    finishedRegistration = null;
    postPurchaseRegistration = null;
    postPurchaseAnswers = {};
    postPurchaseSaveStates = {};
    postPurchasePendingAnswers = {};
    if (postPurchaseSaveTimer) {
      window.clearTimeout(postPurchaseSaveTimer);
      postPurchaseSaveTimer = null;
    }
    setPostPurchaseMode(false);

    ticketPlaceholder('Refreshing ticket availability…', 'Just a moment while we check the latest allocation.');
    try {
      availabilityState = await fetchAvailability();
      renderAvailability(availabilityState.currentWave);
      if (availabilityState?.currentWave) createTitoWidget(availabilityState);
      else ticketPlaceholder('No tickets are available right now.', 'The booking panel will update if more tickets become available.');

      if (!availabilityTimer) {
        availabilityTimer = window.setInterval(() => {
          refreshAvailability({ allowWaveSwitch: !registrationInProgress });
        }, 10000);
      }
    } catch (error) {
      ticketPlaceholder('Ticket availability could not be refreshed.', error.message);
    }

    if (scrollToTickets) $('#tickets')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function showTicketSelectorAgain() {
    await resetAfterPostPurchase({ scrollToTickets: true });
  }

  function leavePostPurchaseForVisit(event) {
    event?.preventDefault?.();
    resetAfterPostPurchase({ scrollToTickets: false }).finally(() => {
      const visit = $('#visit');
      if (visit) visit.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.location.hash = 'visit';
    });
  }

  function renderPostPurchaseFollowup(snapshot) {
    if (!snapshot?.slug) {
      setPostPurchaseMode(false);
      if (availabilityState?.currentWave) createTitoWidget(availabilityState);
      return;
    }

    postPurchaseRegistration = snapshot;
    setPostPurchaseMode(true);
    suppressFinishedTitoOverlay();
    const root = ensurePostPurchaseOverlay();
    if (!root) return;

    const reference = String(snapshot.reference || '');
    const referenceHtml = reference ? `<strong>${escapeHtml(reference)}</strong>` : '';
    const bookingCompleteCopy = reference
      ? `Booking ${referenceHtml} is complete.`
      : 'Your booking is complete.';
    const optionalCopy = reference
      ? `These are optional and save immediately against booking ${referenceHtml}.`
      : 'These are optional and save immediately against this booking.';

    root.innerHTML = `
      <div class="post-purchase-card">
        <div class="post-purchase-success" role="status">
          <span class="post-purchase-success-mark" aria-hidden="true">✓</span>
          <div>
            <p class="kicker kicker-dark">Booking confirmed</p>
            <h3 id="wfd-post-purchase-title">You're booked for Wotton Fireworks</h3>
            <p>${bookingCompleteCopy} Your confirmation email contains all of your ticket QR codes.</p>
            ${snapshot.receiptUrl ? `<p><a class="text-link" href="${escapeHtml(snapshot.receiptUrl)}" target="_blank" rel="noopener">View your receipt</a></p>` : ''}
          </div>
        </div>

        <div class="post-purchase-heading">
          <p class="kicker kicker-dark">Before you go</p>
          <h3>One invitation and three quick choices</h3>
          <p>${optionalCopy}</p>
        </div>

        <div class="post-purchase-invite">
          <div class="post-purchase-invite-copy">
            <span class="post-purchase-eyebrow">Round Table is more than fireworks</span>
            <h4>Meet people. Make friends. Try something new.</h4>
            <p>Round Table is about meeting people, making friends, trying new things and doing something useful for the local community. Round Table itself is for men, but the wider Round Table Family has groups for adult men and women of all ages, so there is a place for everyone to get involved, make friends and become part of something local.</p>
          </div>

          <div class="post-purchase-invite-prompt">
            ${postChoice(
              'round_table_invite',
              'Fancy an exclusive invite?',
              'Our next events include bouldering and an informal meet-and-greet with Wotton Round Table, Ladies Circle, 41 Club and Tangent at Beermongery.Inc on Friday 13 November at 8pm. If you are curious, we would love to invite you along so you can meet some people and see what the Round Table Family is actually like. No speeches, no pressure and no obligation to join.',
              'I want my invite',
              'yes',
              'No thanks',
              'no'
            )}
          </div>
        </div>

        <div class="post-purchase-questions">
          <div class="post-purchase-questions-heading">
            <h4>Three quick choices</h4>
            <p>You can change an answer simply by choosing the other option.</p>
          </div>

          ${postChoice(
            'cancellation',
            'If the display had to be cancelled, could you help us carry the cost?',
            'By the time a cancellation decision is made, a lot of the event cost may already have been spent or committed. If you choose to donate your ticket money if that happens, we can hold less back each year as a contingency, put more of the money we raise back into our community, and make the future of the display more secure.',
            'Donate my ticket money',
            'donate',
            'Refund me as normal',
            'refund'
          )}
          ${postChoice(
            'next_year',
            'Same again next year?',
            'Use the email address from this booking to tell me when tickets for the 2027 Wotton Firework Display go on sale.',
            'Tell me when 2027 tickets go on sale',
            'yes',
            'No thanks',
            'no'
          )}
          ${postChoice(
            'other_events',
            'More good things to do locally?',
            'Use the email address from this booking to tell me about other Round Table and community events worth coming to.',
            'Keep me posted',
            'yes',
            'No thanks',
            'no'
          )}
        </div>

        ${postPurchaseError ? `<p class="post-purchase-error" role="alert">${postPurchaseError}</p>` : ''}

        <div class="post-purchase-footer">
          <p>Your answers are stored with this fireworks booking. There is no extra form to submit.</p>
          <div class="post-purchase-footer-actions">
            <a class="button button-dark" href="#visit" id="post-purchase-plan-visit">Plan your visit</a>
            <button type="button" class="button button-outline" id="post-purchase-book-more">Book more tickets</button>
          </div>
        </div>
      </div>
    `;

    $$('[data-post-choice]', root).forEach((button) => {
      button.addEventListener('click', () => {
        queuePostPurchaseChoice(button.dataset.stage, button.dataset.value);
      });
    });
    $('#post-purchase-plan-visit', root)?.addEventListener('click', leavePostPurchaseForVisit);
    $('#post-purchase-book-more', root)?.addEventListener('click', showTicketSelectorAgain);
  }

  async function resetSelectorAfterFinishedCheckout() {
    // Retained as a no-op compatibility hook. V14 transitions immediately to the
    // post-purchase panel from registration:finished instead of waiting for the
    // customer to close Tito's confirmation overlay.
  }

  function ticketQuantityControls(mount) {
    return $$('input[type="number"], select', mount).filter((el) => {
      if (el.tagName === 'SELECT') {
        const numericOptions = [...el.options].filter((option) => option.value !== '' && Number.isFinite(Number(option.value)));
        return numericOptions.length >= 2;
      }
      return true;
    });
  }

  function continueButtons(mount) {
    return $$('button, input[type="submit"], a[role="button"]', mount).filter((el) => {
      const label = String(el.textContent || el.value || '').trim().toLowerCase();
      return /continue|checkout|book|register|next/.test(label);
    });
  }

  function setGuarded(button, guarded) {
    // Do not change Tito's native disabled state. Tito owns the checkout form and
    // its internal cart. We only add a visual/accessibility marker and intercept
    // Continue while the selected quantity exceeds the current price-band cap.
    button.classList.toggle('wfd-capacity-blocked', Boolean(guarded));
    if (guarded) {
      if (!button.hasAttribute('aria-disabled')) {
        button.dataset.wfdAddedAriaDisabled = 'true';
        button.setAttribute('aria-disabled', 'true');
      }
    } else if (button.dataset.wfdAddedAriaDisabled === 'true') {
      button.removeAttribute('aria-disabled');
      delete button.dataset.wfdAddedAriaDisabled;
    }
  }

  function nextAvailableWave(state, waveKey) {
    const waves = Array.isArray(state?.waves) ? state.waves : [];
    const index = waves.findIndex((wave) => wave.key === waveKey);
    if (index < 0) return null;
    return waves.slice(index + 1).find((wave) => !wave.soldOut && Number(wave.remaining || 0) > 0) || null;
  }

  function selectionGroups(state) {
    const waves = Array.isArray(state?.waves) ? state.waves : [];
    const parking = Array.isArray(state?.parkingGroups) ? state.parkingGroups : [];

    return [
      ...waves.map((wave, index) => ({
        ...wave,
        key: wave.key || `admission-${index + 1}`,
        kind: 'admission',
        groupIndex: index
      })),
      ...parking.map((group, index) => ({
        ...group,
        key: group.key || `parking-${index + 1}`,
        kind: 'parking',
        groupIndex: waves.length + index
      }))
    ];
  }

  function releaseCatalog(state) {
    const items = [];
    selectionGroups(state).forEach((group) => {
      const details = Array.isArray(group.releaseDetails) && group.releaseDetails.length
        ? group.releaseDetails
        : (group.releases || []).map((slug) => ({ slug, title: slug }));

      details.forEach((release, releaseIndex) => {
        items.push({
          ...release,
          groupKey: group.key,
          groupKind: group.kind,
          groupIndex: group.groupIndex,
          waveKey: group.kind === 'admission' ? group.key : null,
          releaseIndex,
          title: String(release.title || release.slug || 'Ticket'),
          slug: String(release.slug || ''),
          id: release.id == null ? '' : String(release.id)
        });
      });
    });
    return items;
  }

  function normaliseText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function attributeText(node) {
    if (!node?.attributes) return '';
    return [...node.attributes].map((attribute) => String(attribute.value || '')).join(' ').toLowerCase();
  }

  function orderedCatalog(state) {
    return releaseCatalog(state).sort((a, b) => {
      const pa = Number(a.position);
      const pb = Number(b.position);
      if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) return pa - pb;
      if (a.groupIndex !== b.groupIndex) return a.groupIndex - b.groupIndex;
      return a.releaseIndex - b.releaseIndex;
    });
  }

  function mapReleaseControls(mount, state) {
    const controls = ticketQuantityControls(mount);
    const catalog = orderedCatalog(state);
    const mappings = [];
    const used = new Set();

    controls.forEach((control, controlIndex) => {
      let node = control;
      let matched = null;
      let row = null;

      // Prefer Tito's release identity when it is exposed in the inline HTML.
      while (node && node !== mount) {
        const attrs = attributeText(node);
        const identityMatches = catalog.filter((release) => {
          const slug = release.slug.toLowerCase();
          const id = release.id.toLowerCase();
          return (slug && attrs.includes(slug)) || (id && attrs.split(/\s+/).some((token) => token === id || token.endsWith(`-${id}`) || token.endsWith(`_${id}`)));
        });
        if (identityMatches.length === 1) {
          matched = identityMatches[0];
          row = node;
          break;
        }
        node = node.parentElement;
      }

      // Fallback to a unique ticket title in the smallest useful ancestor.
      if (!matched) {
        node = control;
        while (node && node !== mount) {
          const text = normaliseText(node.textContent);
          const titleMatches = catalog.filter((release) => {
            const title = normaliseText(release.title);
            return title && text.includes(title);
          });
          if (titleMatches.length === 1) {
            matched = titleMatches[0];
            row = node;
            break;
          }
          node = node.parentElement;
        }
      }

      // Last resort: Tito normally renders releases in event position order.
      if (!matched) matched = catalog[controlIndex] || null;
      if (!matched || used.has(matched.slug)) return;
      used.add(matched.slug);

      let candidate = row || control.parentElement;
      while (candidate && candidate !== mount) {
        const quantityCount = ticketQuantityControls(candidate).length;
        const text = normaliseText(candidate.textContent);
        if (quantityCount === 1 && text.includes(normaliseText(matched.title))) {
          row = candidate;
          break;
        }
        candidate = candidate.parentElement;
      }

      mappings.push({ control, row: row || control.parentElement, release: matched });
    });

    return mappings;
  }

  function groupIsVisible(group) {
    return group.kind === 'parking' || visibleWaveKeys.includes(group.key);
  }

  function applyGroupVisibility(mappings, state) {
    const groups = new Map(selectionGroups(state).map((group) => [group.key, group]));
    mappings.forEach(({ row, release }) => {
      if (!row) return;
      const group = groups.get(release.groupKey);
      row.classList.add('wfd-release-row');
      row.dataset.wfdGroup = release.groupKey;
      row.dataset.wfdGroupKind = release.groupKind;
      row.dataset.wfdRelease = release.slug;
      row.hidden = group ? !groupIsVisible(group) : false;
    });
  }

  function groupCounter(mount, group) {
    return $(`.wfd-group-counter[data-wfd-group-counter="${CSS.escape(group.key)}"]`, mount);
  }

  function firstRowInDocument(rows) {
    return rows.filter(Boolean).sort((a, b) => {
      if (a === b) return 0;
      const pos = a.compareDocumentPosition(b);
      return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    })[0] || null;
  }

  function ensureGroupCounter(mount, group, mappings) {
    const groupMappings = mappings.filter(({ release }) => release.groupKey === group.key);
    const firstRow = firstRowInDocument([...new Set(groupMappings.map(({ row }) => row))]);
    if (!firstRow) return null;

    let counter = groupCounter(mount, group);
    if (!counter) {
      counter = document.createElement('div');
      counter.className = 'wfd-group-counter';
      counter.dataset.wfdGroupCounter = group.key;
      counter.dataset.wfdGroupKind = group.kind;
      counter.setAttribute('role', 'status');
      counter.setAttribute('aria-live', 'polite');
      firstRow.before(counter);
    } else if (counter.nextElementSibling !== firstRow) {
      firstRow.before(counter);
    }

    counter.hidden = !groupIsVisible(group);
    return counter;
  }

  function renderGroupCounter(counter, group, total, nextGroup = null, availabilityRefresh = false) {
    if (!counter) return;

    const available = Math.max(0, Number(group.remaining || 0));
    const selected = Math.max(0, Number(total || 0));
    const left = Math.max(available - selected, 0);
    const excess = Math.max(selected - available, 0);
    const isParking = group.kind === 'parking';
    const singular = isParking ? 'space' : 'ticket';
    const plural = isParking ? 'spaces' : 'tickets';
    const noun = left === 1 ? singular : plural;

    counter.classList.toggle('is-empty', left === 0 && excess === 0);
    counter.classList.toggle('is-over', excess > 0);

    let html = '';
    if (excess > 0) {
      const removeNoun = excess === 1 ? singular : plural;
      const nextCopy = nextGroup ? ' Then use the next price below for anything extra.' : '';
      html = `<strong>Only ${available} ${available === 1 ? singular : plural} ${availabilityRefresh ? 'now ' : ''}available at this price</strong><span>You have ${selected} selected. Reduce this price by ${excess} ${removeNoun}.${nextCopy}</span>`;
    } else if (left === 0) {
      const nextCopy = nextGroup
        ? 'Use the next price below for any additional tickets.'
        : (isParking ? 'You have selected the remaining spaces.' : 'You have selected the remaining allocation.');
      html = `<strong>No ${plural} left at this price</strong><span>${nextCopy}</span>`;
    } else {
      const selectedCopy = selected > 0 ? `${selected} selected. ` : '';
      const sharedCopy = isParking
        ? `${selectedCopy}Availability is shared across the parking options below.`
        : `${selectedCopy}Availability is shared across the ticket types below.`;
      html = `<strong>${left} ${noun} left at this price</strong><span>${sharedCopy}</span>`;
    }

    if (counter.innerHTML !== html) counter.innerHTML = html;
    counter.hidden = !groupIsVisible(group);
  }

  function buttonIntent(button) {
    if (!button) return null;
    const label = normaliseText([
      button.textContent,
      button.getAttribute?.('aria-label'),
      button.getAttribute?.('title'),
      button.getAttribute?.('data-action'),
      button.className,
      button.value
    ].filter(Boolean).join(' '));

    if (label === '+' || /(^|\s)(add|plus|increase|increment)(\s|$)/.test(label)) return 'increment';
    if (label === '-' || /(^|\s)(remove|minus|decrease|decrement)(\s|$)/.test(label)) return 'decrement';
    return null;
  }

  function markQuantityButtons(mapping) {
    if (!mapping?.row) return;
    $$('button, a, [role="button"]', mapping.row).forEach((button) => {
      const intent = buttonIntent(button);
      if (!intent) return;
      button.dataset.wfdQuantityAction = intent;
      button.classList.toggle('wfd-quantity-plus', intent === 'increment');
      button.classList.toggle('wfd-quantity-minus', intent === 'decrement');
    });
  }

  function installQuantityGuard(state) {
    if (quantityGuardCleanup) quantityGuardCleanup();

    const mount = $('#tito-mount');
    if (!mount) return;

    let currentState = state;
    let latestSelectedTotal = 0;
    let clickCheckTimer = null;
    let evalScheduled = false;
    let checkoutHandoffUntil = 0;

    const suspendForCheckout = () => {
      // Tito reserves the selected tickets and changes the page URL to its own
      // ?tito=/.../registrations/... route before displaying checkout. During
      // that handoff we must not inspect or mutate Tito's selector DOM.
      checkoutHandoffUntil = Date.now() + 5000;
    };

    const selectorSuspended = () => (
      registrationInProgress ||
      finishedWidgetResetPending ||
      titoCheckoutRouteActive() ||
      Date.now() < checkoutHandoffUntil
    );

    const groups = () => selectionGroups(currentState);
    const groupByKey = (key) => groups().find((group) => group.key === key) || null;

    const revealWave = (wave) => {
      if (!wave || visibleWaveKeys.includes(wave.key)) return false;
      visibleWaveKeys.push(wave.key);
      return true;
    };

    const groupMappingsFor = (mappings, groupKey) => mappings.filter(({ release }) => release.groupKey === groupKey);

    const setLocalMaximums = (groupMappings, available) => {
      const total = groupMappings.reduce((sum, { control }) => sum + numericValue(control), 0);
      const headroom = Math.max(available - total, 0);

      groupMappings.forEach((mapping) => {
        const current = numericValue(mapping.control);
        const effectiveMax = current + headroom;
        mapping.control.dataset.wfdSharedMax = String(effectiveMax);
        mapping.control.setAttribute('aria-valuemax', String(effectiveMax));
        markQuantityButtons(mapping);

        $$('[data-wfd-quantity-action="increment"]', mapping.row).forEach((button) => {
          button.classList.toggle('wfd-quantity-maxed', current >= effectiveMax);
          button.setAttribute('aria-disabled', current >= effectiveMax ? 'true' : 'false');
        });
      });

      return { total, headroom };
    };

    const evaluate = (availabilityRefresh = false) => {
      if (selectorSuspended()) return;
      const mappings = mapReleaseControls(mount, currentState);
      if (!mappings.length) return;

      let counterReady = false;
      groups().forEach((group) => {
        const groupMappings = groupMappingsFor(mappings, group.key);
        if (!groupMappings.length) return;

        const available = Math.max(0, Number(group.remaining || 0));
        const { total } = setLocalMaximums(groupMappings, available);
        const left = Math.max(available - total, 0);
        const next = group.kind === 'admission' ? nextAvailableWave(currentState, group.key) : null;

        if (group.kind === 'admission' && left === 0 && total >= available && next) {
          revealWave(next);
        }

        applyGroupVisibility(mappings, currentState);
        const counter = ensureGroupCounter(mount, group, mappings);
        if (counter) counterReady = true;
        renderGroupCounter(counter, group, total, next, availabilityRefresh);
      });

      applyGroupVisibility(mappings, currentState);
      groups().forEach((group) => {
        const counter = groupCounter(mount, group);
        if (counter) counter.hidden = !groupIsVisible(group);
      });

      if (counterReady) {
        const initialCounter = $('#ticket-availability');
        if (initialCounter) initialCounter.hidden = true;
      }

      // Normal quantity limits are explained in the counters themselves. The
      // separate warning is reserved for exceptional Tito checkout changes.
      if (!registrationInProgress) clearSelectionWarning();

      latestSelectedTotal = mappings.reduce((sum, { control }) => sum + numericValue(control), 0);
      lastRequestedQuantity = latestSelectedTotal;
    };

    const scheduleEvaluate = () => {
      if (selectorSuspended()) return;
      if (!evalScheduled) {
        evalScheduled = true;
        queueMicrotask(() => {
          evalScheduled = false;
          evaluate(false);
        });
      }
      window.requestAnimationFrame(() => evaluate(false));
      if (clickCheckTimer) window.clearTimeout(clickCheckTimer);
      clickCheckTimer = window.setTimeout(() => evaluate(false), 35);
    };

    const enforceControlLimit = (control) => {
      const mappings = mapReleaseControls(mount, currentState);
      const mapping = mappings.find((item) => item.control === control);
      if (!mapping) return false;

      const group = groupByKey(mapping.release.groupKey);
      if (!group) return false;
      const groupMappings = groupMappingsFor(mappings, group.key);
      const available = Math.max(0, Number(group.remaining || 0));
      const total = groupMappings.reduce((sum, item) => sum + numericValue(item.control), 0);
      if (total <= available) return false;

      const excess = total - available;
      const current = numericValue(control);
      control.value = String(Math.max(0, current - excess));

      if (group.kind === 'admission') {
        const next = nextAvailableWave(currentState, group.key);
        if (next) revealWave(next);
      }
      return true;
    };

    const onInput = (event) => {
      if (selectorSuspended()) return;
      if (!mount.contains(event.target)) return;
      const mappings = mapReleaseControls(mount, currentState);
      if (!mappings.some(({ control }) => control === event.target)) return;

      // This listener runs in capture phase. If somebody types or spins beyond
      // the shared allocation, clamp the value before Tito's own input handler
      // sees it. No synthetic input/change events are dispatched back to Tito.
      enforceControlLimit(event.target);
      evaluate(false);
    };
    mount.addEventListener('input', onInput, true);
    mount.addEventListener('change', onInput, true);

    const mappingForButton = (button, mappings) => mappings.find(({ row }) => row && row.contains(button)) || null;

    const onClick = (event) => {
      const button = event.target?.closest?.('button, a, [role="button"]');
      if (!button || !mount.contains(button)) return;

      // Tito owns Continue completely. The inline widget first reserves the
      // selected tickets and moves its internal router to a ?tito= registration
      // URL, then displays the checkout overlay. Stop all selector-side DOM work
      // before Tito begins that transition.
      if (continueButtons(mount).includes(button)) {
        suspendForCheckout();
        if (clickCheckTimer) {
          window.clearTimeout(clickCheckTimer);
          clickCheckTimer = null;
        }
        return;
      }

      if (selectorSuspended()) return;

      const intent = buttonIntent(button);
      if (intent === 'increment') {
        const mappings = mapReleaseControls(mount, currentState);
        const mapping = mappingForButton(button, mappings);
        if (mapping) {
          const max = Number(mapping.control.dataset.wfdSharedMax);
          const current = numericValue(mapping.control);
          if (Number.isFinite(max) && current >= max) {
            const group = groupByKey(mapping.release.groupKey);
            if (group?.kind === 'admission') {
              const next = nextAvailableWave(currentState, group.key);
              if (next) revealWave(next);
            }
            evaluate(false);
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            return;
          }
        }
      }

      scheduleEvaluate();
    };
    mount.addEventListener('click', onClick, true);

    const onKeydown = (event) => {
      if (selectorSuspended()) return;
      if (event.key !== 'ArrowUp') return;
      const control = event.target;
      if (!control || control.tagName !== 'INPUT' || control.type !== 'number') return;
      const max = Number(control.dataset.wfdSharedMax);
      if (!Number.isFinite(max) || numericValue(control) < max) return;

      const mappings = mapReleaseControls(mount, currentState);
      const mapping = mappings.find((item) => item.control === control);
      const group = mapping ? groupByKey(mapping.release.groupKey) : null;
      if (group?.kind === 'admission') {
        const next = nextAvailableWave(currentState, group.key);
        if (next) revealWave(next);
      }
      evaluate(false);
      event.preventDefault();
    };
    mount.addEventListener('keydown', onKeydown, true);

    // Watch for Tito rendering ticket rows. Counter changes are ignored so our
    // own DOM updates cannot create an observer loop.
    const observer = new MutationObserver((mutations) => {
      if (selectorSuspended()) return;
      const meaningful = mutations.some((mutation) => {
        const target = mutation.target?.nodeType === Node.ELEMENT_NODE ? mutation.target : mutation.target?.parentElement;
        return !target?.closest?.('.wfd-group-counter');
      });
      if (meaningful) window.requestAnimationFrame(() => evaluate(false));
    });
    observer.observe(mount, { childList: true, subtree: true });
    window.setTimeout(() => evaluate(false), 40);

    quantityGuardCleanup = () => {
      observer.disconnect();
      if (clickCheckTimer) window.clearTimeout(clickCheckTimer);
      mount.removeEventListener('input', onInput, true);
      mount.removeEventListener('change', onInput, true);
      mount.removeEventListener('click', onClick, true);
      mount.removeEventListener('keydown', onKeydown, true);
    };

    quantityGuardCleanup.updateAvailability = (nextState) => {
      currentState = nextState;
      const nextCurrent = currentState?.currentWave?.key || null;
      if (nextCurrent && !visibleWaveKeys.includes(nextCurrent)) visibleWaveKeys.push(nextCurrent);
      if (!selectorSuspended()) evaluate(true);
    };
    quantityGuardCleanup.suspend = suspendForCheckout;
    quantityGuardCleanup.selectedTotal = () => latestSelectedTotal;
  }

  function createTitoWidget(state) {
    const mount = $('#tito-mount');
    const wave = state?.currentWave;
    if (!mount || !wave) {
      ticketPlaceholder('No test tickets are available right now.', 'The page will update once the test allocation changes.');
      return;
    }

    // Mount every configured admission price band, plus any parking groups,
    // once. Later admission prices are hidden until the previous band reaches
    // zero. Parking groups are always placed after admission groups when the
    // availability endpoint supplies them.
    const catalog = releaseCatalog(state).filter((release) => release.slug);
    const releases = catalog.map((release) => release.slug);
    if (!releases.length) {
      ticketPlaceholder('Test tickets are not configured yet.', 'Check the test Activity names in integration-config-2026.mjs.');
      return;
    }

    visibleWaveKeys = [wave.key];
    setupTitoLifecycle();
    // The body observer is passive: it only suppresses Tito's finished-order share
    // row. It does not alter ticket quantities, checkout routing or payment state.
    setupTitoUiObserver();
    ensureTitoScript(Boolean(state.testMode));

    const widget = document.createElement('tito-widget');
    widget.setAttribute('event', state.event);
    widget.setAttribute('releases', releases.join(','));
    widget.setAttribute('source', storedAttribution?.source || data.defaultSource || 'Direct');
    if (storedAttribution?.metadata) {
      widget.setAttribute('prefill', JSON.stringify({ metadata: storedAttribution.metadata }));
    }
    mount.replaceChildren(widget);
    installQuantityGuard(state);
    stickySelectionWarning = false;
    clearSelectionWarning();
    scheduleTitoUiMark();
  }

  async function refreshAvailability({ allowWaveSwitch = false } = {}) {
    try {
      const next = await fetchAvailability();
      const previousKey = availabilityState?.currentWave?.key || null;
      const nextKey = next?.currentWave?.key || null;
      availabilityState = next;

      // Before Tito has rendered its rows, keep the single loading/availability
      // header useful. Once per-group counters exist they own the display.
      if (!$('#tito-mount .wfd-group-counter')) renderAvailability(next.currentWave);

      if (quantityGuardCleanup?.updateAvailability) {
        quantityGuardCleanup.updateAvailability(next);
      }

      // Do not rebuild or intercept the widget when Tito moves to a later price
      // band. All configured bands are already mounted; updateAvailability()
      // reveals the new current band and refreshes its counter in place.
      if (allowWaveSwitch && !registrationInProgress && previousKey !== nextKey) {
        scheduleTitoUiMark();
      }
    } catch (error) {
      console.warn('WFD ticket availability refresh failed:', error.message);
    }
  }

  async function renderTickets() {
    const mount = $('#tito-mount');
    if (!mount) return;

    storedAttribution = attribution();
    renderSourceSupport(storedAttribution);

    const pendingFollowup = loadPendingPostPurchase();
    if (pendingFollowup) {
      renderPostPurchaseFollowup(pendingFollowup);
      try { availabilityState = await fetchAvailability(); }
      catch (error) { console.warn('WFD pending follow-up availability refresh failed:', error.message); }
      return;
    }

    ticketPlaceholder('Connecting the test ticket allocation…', 'This deploy preview is using the live page design with controlled test tickets.');

    try {
      availabilityState = await fetchAvailability();
      renderAvailability(availabilityState.currentWave);
      createTitoWidget(availabilityState);

      if (!availabilityTimer) {
        availabilityTimer = window.setInterval(() => {
          refreshAvailability({ allowWaveSwitch: !registrationInProgress });
        }, 10000);
      }
    } catch (error) {
      ticketPlaceholder('Ticket testing is not connected yet.', error.message);
    }
  }

  function setupHeroVideo() {
    if (!data.heroVideo) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const video = $('#hero-video');
    const source = $('#hero-video-source');
    if (!video || !source) return;
    source.src = data.heroVideo.startsWith('/') ? data.heroVideo : `/${data.heroVideo}`;
    video.hidden = false;
    video.load();
    video.play().catch(() => {});
  }

  window.addEventListener('pagehide', () => {
    if (postPurchaseSaveTimer) {
      window.clearTimeout(postPurchaseSaveTimer);
      postPurchaseSaveTimer = null;
    }
    if (Object.keys(postPurchasePendingAnswers).length) flushPostPurchaseChoices();
  });

  fillSharedFields();
  renderHighlights();
  renderProgramme();
  renderTravel();
  renderVisit();
  renderFaqs();
  renderTickets();
  setupHeroVideo();
})();
