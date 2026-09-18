(() => {
  const data = window.FIREWORKS_EVENT;
  if (!data) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const ATTRIBUTION_KEY = 'wottonFireworksAttribution2026';
  const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

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
        <p>All profits from Wotton Firework Display go back into the local community. Because you came through a link from ${attrs.beneficiary}, a portion of the proceeds from your booking will also be donated specifically to them. Thank you for supporting local.</p>
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

  function renderAvailability(wave) {
    const root = $('#ticket-availability');
    if (!root) return;

    if (!wave) {
      root.innerHTML = '<strong>These test tickets are currently sold out.</strong><span>The booking panel will update when another ticket is available.</span>';
      root.hidden = false;
      return;
    }

    const count = Number(wave.remaining || 0);
    const noun = count === 1 ? 'ticket' : 'tickets';
    root.innerHTML = `<strong>${count} ${noun} left at this price</strong><span>Availability is shared across the ticket types shown below.</span>`;
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

  function setupTitoLifecycle() {
    if (titoLifecycleReady) return;
    titoLifecycleReady = true;

    window.tito = window.tito || function() { (window.tito.q = window.tito.q || []).push(arguments); };

    window.tito('on:registration:started', (registration) => {
      registrationInProgress = true;
      const actual = registrationQuantity(registration);
      if (lastRequestedQuantity && actual && actual < lastRequestedQuantity) {
        showSelectionWarning(
          'Ticket availability has just changed',
          `You selected ${lastRequestedQuantity} tickets, but only ${actual} could be reserved. Please review your order carefully before continuing.`
        );
        $('#ticket-selection-warning')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    window.tito('on:registration:finished', async (registration) => {
      registrationInProgress = false;
      clearSelectionWarning();
      window.setTimeout(() => refreshAvailability({ allowWaveSwitch: true }), 800);

      if (!data.postPurchaseEnabled || !registration?.slug) return;
      try {
        const response = await fetch('/api/order-session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ registrationSlug: registration.slug, reference: registration.reference })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.url) throw new Error(result.error || 'Post-purchase handover unavailable');
        window.location.assign(result.url);
      } catch (error) {
        console.warn('WFD post-purchase handover skipped:', error.message);
      }
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

  function ticketQuantityControls(mount) {
    return $$('input[type="number"], select', mount).filter((el) => {
      if (!isVisible(el) || el.disabled) return false;
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
    if (guarded) {
      button.dataset.wfdAvailabilityGuard = 'true';
      button.setAttribute('aria-disabled', 'true');
      if ('disabled' in button) button.disabled = true;
      else button.style.pointerEvents = 'none';
    } else if (button.dataset.wfdAvailabilityGuard === 'true') {
      delete button.dataset.wfdAvailabilityGuard;
      button.removeAttribute('aria-disabled');
      if ('disabled' in button) button.disabled = false;
      else button.style.pointerEvents = '';
    }
  }

  function installQuantityGuard(remaining) {
    if (quantityGuardCleanup) quantityGuardCleanup();

    const mount = $('#tito-mount');
    if (!mount || !Number.isFinite(Number(remaining))) return;

    let currentRemaining = Number(remaining);

    const evaluate = () => {
      const controls = ticketQuantityControls(mount);
      controls.forEach((control) => {
        if (control.tagName === 'INPUT') control.max = String(currentRemaining);
        if (control.tagName === 'SELECT') {
          [...control.options].forEach((option) => {
            const value = Number(option.value);
            if (Number.isFinite(value) && value > currentRemaining) option.disabled = true;
          });
        }
      });

      const selected = controls.reduce((sum, control) => sum + numericValue(control), 0);
      lastRequestedQuantity = selected;
      const tooMany = selected > currentRemaining;

      continueButtons(mount).forEach((button) => setGuarded(button, tooMany));

      if (tooMany) {
        const noun = currentRemaining === 1 ? 'ticket is' : 'tickets are';
        showSelectionWarning(
          `Only ${currentRemaining} ${noun} left at this price`,
          `You've selected ${selected} tickets. Please reduce your selection to ${currentRemaining} or fewer to continue.`
        );
      } else {
        clearSelectionWarning();
      }
    };

    const onInput = () => evaluate();
    mount.addEventListener('input', onInput, true);
    mount.addEventListener('change', onInput, true);

    const observer = new MutationObserver(() => evaluate());
    observer.observe(mount, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'disabled'] });
    window.setTimeout(evaluate, 150);

    quantityGuardCleanup = () => {
      observer.disconnect();
      mount.removeEventListener('input', onInput, true);
      mount.removeEventListener('change', onInput, true);
      continueButtons(mount).forEach((button) => setGuarded(button, false));
    };

    quantityGuardCleanup.updateRemaining = (next) => {
      currentRemaining = Number(next);
      evaluate();
    };
  }

  function createTitoWidget(state) {
    const mount = $('#tito-mount');
    const wave = state?.currentWave;
    if (!mount || !wave) {
      ticketPlaceholder('No test tickets are available right now.', 'The page will update once the test allocation changes.');
      return;
    }

    if (!Array.isArray(wave.releases) || !wave.releases.length) {
      ticketPlaceholder('Test tickets are not configured yet.', 'Add the Wave release slugs in the Netlify deploy-preview environment variables.');
      return;
    }

    setupTitoLifecycle();
    ensureTitoScript(Boolean(state.testMode));

    const widget = document.createElement('tito-widget');
    widget.setAttribute('event', state.event);
    widget.setAttribute('releases', wave.releases.join(','));
    widget.setAttribute('source', storedAttribution?.source || data.defaultSource || 'Direct');
    if (storedAttribution?.metadata) {
      widget.setAttribute('prefill', JSON.stringify({ metadata: storedAttribution.metadata }));
    }
    mount.replaceChildren(widget);
    installQuantityGuard(wave.remaining);
  }

  async function refreshAvailability({ allowWaveSwitch = false } = {}) {
    try {
      const next = await fetchAvailability();
      const previousKey = availabilityState?.currentWave?.key || null;
      const nextKey = next?.currentWave?.key || null;
      availabilityState = next;
      renderAvailability(next.currentWave);

      if (quantityGuardCleanup?.updateRemaining && next.currentWave) {
        quantityGuardCleanup.updateRemaining(next.currentWave.remaining);
      }

      if (allowWaveSwitch && !registrationInProgress && previousKey !== nextKey) {
        clearSelectionWarning();
        createTitoWidget(next);
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

  fillSharedFields();
  renderHighlights();
  renderProgramme();
  renderTravel();
  renderVisit();
  renderFaqs();
  renderTickets();
  setupHeroVideo();
})();
