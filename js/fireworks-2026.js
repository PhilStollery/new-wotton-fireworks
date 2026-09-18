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
  let visibleWaveKeys = [];
  let titoUiObserver = null;
  let titoUiScheduled = false;
  let stickySelectionWarning = false;

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

    // The checkout overlay is injected into the page in inline mode. Mark it so
    // our CSS can make it feel like part of the Wotton site without taking over
    // Tito's checkout logic.
    $$('[role="dialog"]').forEach((dialog) => {
      if (!String(dialog.textContent || '').includes(data.eventName)) return;
      dialog.classList.add('wfd-tito-dialog');
      dialog.parentElement?.classList.add('wfd-tito-overlay');
    });

    // Fallback for Tito versions that do not expose role="dialog".
    $$('body > div').forEach((candidate) => {
      if (candidate.classList.contains('wfd-tito-overlay')) return;
      if (!String(candidate.textContent || '').includes(data.eventName)) return;
      const style = window.getComputedStyle(candidate);
      if (style.position !== 'fixed') return;
      candidate.classList.add('wfd-tito-overlay');
      const panel = [...candidate.children].find((child) => {
        const childStyle = window.getComputedStyle(child);
        return childStyle.backgroundColor && childStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';
      });
      panel?.classList.add('wfd-tito-dialog');
    });

    // Tito's finished-order panel includes a "Share this event" row pointing
    // at the ti.to event homepage. Our website is the public event page, so the
    // safest treatment is simply to suppress that row rather than advertising a
    // second public URL during checkout.
    if (eventPath) {
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
    titoUiObserver = new MutationObserver(scheduleTitoUiMark);
    titoUiObserver.observe(document.body, { childList: true, subtree: true });
    scheduleTitoUiMark();
  }

  function setupTitoLifecycle() {
    if (titoLifecycleReady) return;
    titoLifecycleReady = true;

    window.tito = window.tito || function() { (window.tito.q = window.tito.q || []).push(arguments); };

    window.tito('on:registration:started', (registration) => {
      registrationInProgress = true;
      scheduleTitoUiMark();
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

    window.tito('on:registration:finished', () => {
      registrationInProgress = false;
      stickySelectionWarning = false;
      clearSelectionWarning();
      scheduleTitoUiMark();
      window.setTimeout(() => refreshAvailability({ allowWaveSwitch: true }), 800);
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

  function releaseCatalog(state) {
    const waves = Array.isArray(state?.waves) ? state.waves : [];
    const items = [];
    waves.forEach((wave, waveIndex) => {
      const details = Array.isArray(wave.releaseDetails) && wave.releaseDetails.length
        ? wave.releaseDetails
        : (wave.releases || []).map((slug) => ({ slug, title: slug }));
      details.forEach((release, releaseIndex) => {
        items.push({
          ...release,
          waveKey: wave.key,
          waveIndex,
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
      if (a.waveIndex !== b.waveIndex) return a.waveIndex - b.waveIndex;
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

      // Prefer a release slug exposed anywhere in Tito's row attributes. This is
      // the strongest mapping and continues to work when two price bands use the
      // same public-facing ticket title.
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

      // Current Tito inline markup does not always expose the slug. In that case
      // use the smallest ancestor containing exactly one known ticket title.
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

      // Final fallback: Tito renders releases in their event position. This is
      // preferable to grouping by Activity order, which caused W1/W2 controls to
      // be misidentified when both bands were displayed together.
      if (!matched) matched = catalog[controlIndex] || null;
      if (!matched || used.has(matched.slug)) return;
      used.add(matched.slug);

      // If the row found above is too small to hide cleanly, climb until it
      // contains this control and no other ticket quantity control.
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

  function applyWaveVisibility(mappings) {
    mappings.forEach(({ row, release }) => {
      if (!row) return;
      row.classList.add('wfd-release-row');
      row.dataset.wfdWave = release.waveKey;
      row.dataset.wfdRelease = release.slug;
      row.hidden = !visibleWaveKeys.includes(release.waveKey);
    });
  }

  function installQuantityGuard(state) {
    if (quantityGuardCleanup) quantityGuardCleanup();

    const mount = $('#tito-mount');
    if (!mount) return;

    let currentState = state;
    let latestSelectedTotal = 0;
    let capacityBlocked = false;
    let clickCheckTimer = null;

    const waveByKey = (key) => (currentState?.waves || []).find((wave) => wave.key === key) || null;

    const revealWave = (wave) => {
      if (!wave || visibleWaveKeys.includes(wave.key)) return false;
      visibleWaveKeys.push(wave.key);
      return true;
    };

    const applyDynamicMaximums = (waveMappings, available) => {
      const total = waveMappings.reduce((sum, { control }) => sum + numericValue(control), 0);
      const headroom = Math.max(available - total, 0);

      waveMappings.forEach(({ control }) => {
        const current = numericValue(control);
        const maxForThisControl = current + headroom;

        if (control.tagName === 'INPUT') {
          control.max = String(maxForThisControl);
          control.setAttribute('aria-valuemax', String(maxForThisControl));
          control.dataset.wfdSharedMax = String(maxForThisControl);
          return;
        }

        if (control.tagName === 'SELECT') {
          [...control.options].forEach((option) => {
            const value = Number(option.value);
            if (!Number.isFinite(value)) return;
            option.disabled = value > maxForThisControl;
          });
          control.dataset.wfdSharedMax = String(maxForThisControl);
        }
      });

      return { total, headroom };
    };

    const evaluate = (availabilityRefresh = false) => {
      const mappings = mapReleaseControls(mount, currentState);
      const expected = releaseCatalog(currentState).length;
      if (mappings.length < expected) return;

      let visibilityChanged = false;
      let warning = null;
      let blocked = false;
      const waves = Array.isArray(currentState?.waves) ? currentState.waves : [];
      const currentWaveKey = currentState?.currentWave?.key || null;

      waves.forEach((wave) => {
        const waveMappings = mappings.filter(({ release }) => release.waveKey === wave.key);
        if (!waveMappings.length) return;

        const available = Math.max(0, Number(wave.remaining || 0));
        const { total } = applyDynamicMaximums(waveMappings, available);
        const left = Math.max(available - total, 0);
        const excess = Math.max(total - available, 0);
        const next = nextAvailableWave(currentState, wave.key);

        // The next price becomes visible as soon as this price allocation has
        // been fully selected. Tito remains mounted once and owns the cart.
        if (left === 0 && total >= available && next) {
          visibilityChanged = revealWave(next) || visibilityChanged;
        }

        if (wave.key === currentWaveKey) {
          renderAvailability(wave, total, next);
        }

        if (excess <= 0) return;

        blocked = true;
        if (next) visibilityChanged = revealWave(next) || visibilityChanged;
        if (!warning) {
          const removeNoun = excess === 1 ? 'ticket' : 'tickets';
          warning = availabilityRefresh
            ? {
                title: 'Ticket availability has changed',
                copy: `Only ${available} tickets are now available at this price, but you have ${total} selected. Reduce the current-price tickets by ${excess} ${removeNoun}, then add any extras using the next price shown below.`
              }
            : {
                title: 'Too many tickets selected at this price',
                copy: `Only ${available} tickets are available at this price. Reduce the current-price tickets by ${excess} ${removeNoun}, then add any additional tickets using the next price shown below.`
              };
        }
      });

      applyWaveVisibility(mappings);
      if (visibilityChanged) applyWaveVisibility(mappings);

      latestSelectedTotal = mappings.reduce((sum, { control }) => sum + numericValue(control), 0);
      lastRequestedQuantity = latestSelectedTotal;
      capacityBlocked = blocked;
      continueButtons(mount).forEach((button) => setGuarded(button, blocked));

      if (warning) {
        stickySelectionWarning = true;
        showSelectionWarning(warning.title, warning.copy);
      } else {
        stickySelectionWarning = false;
        clearSelectionWarning();
      }
    };

    const isIncrementButton = (button) => {
      const label = [
        button?.textContent,
        button?.getAttribute?.('aria-label'),
        button?.getAttribute?.('title'),
        button?.value
      ].filter(Boolean).join(' ').trim().toLowerCase();
      return label === '+' || /\b(add|plus|increase|increment)\b/.test(label);
    };

    const mappingForButton = (button, mappings) => mappings.find(({ row }) => row && row.contains(button)) || null;

    const onInput = (event) => {
      if (!mount.contains(event.target)) return;
      const mappings = mapReleaseControls(mount, currentState);
      if (!mappings.some(({ control }) => control === event.target)) return;
      evaluate(false);
    };
    mount.addEventListener('input', onInput, true);
    mount.addEventListener('change', onInput, true);

    const onClick = (event) => {
      const button = event.target?.closest?.('button, [role="button"], input[type="submit"]');
      if (!button || !mount.contains(button)) return;

      if (continueButtons(mount).includes(button)) {
        evaluate(false);
        if (capacityBlocked) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation?.();
        }
        return;
      }

      // The HTML max attribute is the primary quantity lock. Tito's own +/-
      // controls do not consistently honour it, so stop only an attempted + at
      // the calculated shared maximum. We never rewrite the customer's value.
      if (isIncrementButton(button)) {
        const mappings = mapReleaseControls(mount, currentState);
        const mapping = mappingForButton(button, mappings);
        if (mapping) {
          const max = Number(mapping.control.dataset.wfdSharedMax ?? mapping.control.max);
          const current = numericValue(mapping.control);
          if (Number.isFinite(max) && current >= max) {
            const wave = waveByKey(mapping.release.waveKey);
            const next = nextAvailableWave(currentState, mapping.release.waveKey);
            if (next) revealWave(next);
            applyWaveVisibility(mappings);
            if (wave?.key === currentState?.currentWave?.key) renderAvailability(wave, mappings.filter(({ release }) => release.waveKey === wave.key).reduce((sum, { control }) => sum + numericValue(control), 0), next);
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            return;
          }
        }
      }

      // Recalculate immediately after Tito has processed the +/- click. The
      // microtask makes the counter feel instantaneous; rAF is a fallback for
      // widget versions that update the input on the next frame.
      Promise.resolve().then(() => evaluate(false));
      window.requestAnimationFrame(() => evaluate(false));
      if (clickCheckTimer) window.clearTimeout(clickCheckTimer);
      clickCheckTimer = window.setTimeout(() => evaluate(false), 24);
    };

    const onSubmit = (event) => {
      evaluate(false);
      if (!capacityBlocked) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    mount.addEventListener('click', onClick, true);
    mount.addEventListener('submit', onSubmit, true);

    // We watch Tito only for structural rerenders. max/aria changes are not
    // observed, which avoids the self-triggering loops seen in earlier builds.
    const observer = new MutationObserver(() => window.requestAnimationFrame(() => evaluate(false)));
    observer.observe(mount, { childList: true, subtree: true });
    window.setTimeout(() => evaluate(false), 60);

    quantityGuardCleanup = () => {
      observer.disconnect();
      if (clickCheckTimer) window.clearTimeout(clickCheckTimer);
      mount.removeEventListener('input', onInput, true);
      mount.removeEventListener('change', onInput, true);
      mount.removeEventListener('click', onClick, true);
      mount.removeEventListener('submit', onSubmit, true);
      continueButtons(mount).forEach((button) => setGuarded(button, false));
    };

    quantityGuardCleanup.updateAvailability = (nextState) => {
      const previousCurrent = currentState?.currentWave?.key || null;
      currentState = nextState;
      const nextCurrent = currentState?.currentWave?.key || null;

      if (nextCurrent && !visibleWaveKeys.includes(nextCurrent)) visibleWaveKeys.push(nextCurrent);
      if (previousCurrent !== nextCurrent && latestSelectedTotal === 0 && nextCurrent) {
        visibleWaveKeys = [nextCurrent];
      }
      evaluate(true);
    };
    quantityGuardCleanup.selectedTotal = () => latestSelectedTotal;
  }

  function createTitoWidget(state) {
    const mount = $('#tito-mount');
    const wave = state?.currentWave;
    if (!mount || !wave) {
      ticketPlaceholder('No test tickets are available right now.', 'The page will update once the test allocation changes.');
      return;
    }

    // Mount all configured price bands once, then hide later bands in our UI.
    // Rebuilding the Tito custom element while quantities were selected caused
    // Tito to discard its internal cart state and led to the zeroed/disabled
    // controls seen during mixed W1/W2 testing.
    const catalog = orderedCatalog(state).filter((release) => release.slug);
    const releases = catalog.map((release) => release.slug);
    if (!releases.length) {
      ticketPlaceholder('Test tickets are not configured yet.', 'Check the test Activity names in integration-config-2026.mjs.');
      return;
    }

    visibleWaveKeys = [wave.key];
    setupTitoLifecycle();
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
      renderAvailability(next.currentWave);

      if (quantityGuardCleanup?.updateAvailability) {
        quantityGuardCleanup.updateAvailability(next);
      }

      if (allowWaveSwitch && !registrationInProgress && previousKey !== nextKey) {
        const selected = quantityGuardCleanup?.selectedTotal?.() || 0;
        if (selected > 0) {
          stickySelectionWarning = true;
          showSelectionWarning(
            'Ticket availability has just changed',
            'The current price band changed while you were choosing tickets. Please review the quantities shown before continuing.'
          );
        }
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
