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
    if (guarded && button.dataset.wfdAvailabilityGuard !== 'true') {
      button.dataset.wfdAvailabilityGuard = 'true';
      button.dataset.wfdPreviousAriaDisabled = button.getAttribute('aria-disabled') || '';
      if ('disabled' in button) button.dataset.wfdPreviousDisabled = button.disabled ? 'true' : 'false';
      button.setAttribute('aria-disabled', 'true');
      if ('disabled' in button) button.disabled = true;
      else button.style.pointerEvents = 'none';
    } else if (!guarded && button.dataset.wfdAvailabilityGuard === 'true') {
      const previousAria = button.dataset.wfdPreviousAriaDisabled || '';
      if (previousAria) button.setAttribute('aria-disabled', previousAria);
      else button.removeAttribute('aria-disabled');
      if ('disabled' in button) button.disabled = button.dataset.wfdPreviousDisabled === 'true';
      else button.style.pointerEvents = '';
      delete button.dataset.wfdAvailabilityGuard;
      delete button.dataset.wfdPreviousAriaDisabled;
      delete button.dataset.wfdPreviousDisabled;
    }
  }

  function nextAvailableWave(state, waveKey) {
    const waves = Array.isArray(state?.waves) ? state.waves : [];
    const index = waves.findIndex((wave) => wave.key === waveKey);
    if (index < 0) return null;
    return waves.slice(index + 1).find((wave) => !wave.soldOut && Number(wave.remaining || 0) > 0) || null;
  }

  function visibleWavesFromState(state, keys = visibleWaveKeys) {
    const waves = Array.isArray(state?.waves) ? state.waves : [];
    return keys.map((key) => waves.find((wave) => wave.key === key)).filter(Boolean);
  }

  function installQuantityGuard(state, waves, restoreSelections = []) {
    if (quantityGuardCleanup) quantityGuardCleanup();

    const mount = $('#tito-mount');
    if (!mount || !waves.length) return;

    let waveState = waves;
    let pendingRestore = Array.isArray(restoreSelections) && restoreSelections.length ? [...restoreSelections] : null;
    let correcting = false;
    let revealing = false;
    let latestSelectedTotal = 0;
    let clickCheckTimer = null;

    const expectedControlCount = () => waveState.reduce((sum, wave) => sum + wave.releases.length, 0);

    const groupForWave = (controls, waveIndex) => {
      let start = 0;
      for (let i = 0; i < waveIndex; i += 1) start += waveState[i].releases.length;
      return controls.slice(start, start + waveState[waveIndex].releases.length);
    };

    const restoreWhenReady = (controls) => {
      if (!pendingRestore || controls.length < pendingRestore.length) return;
      const values = pendingRestore;
      pendingRestore = null;
      correcting = true;
      values.forEach((value, index) => {
        if (!controls[index]) return;
        controls[index].value = String(Math.max(0, Number(value) || 0));
        controls[index].dispatchEvent(new Event('input', { bubbles: true }));
        controls[index].dispatchEvent(new Event('change', { bubbles: true }));
      });
      correcting = false;
    };

    const revealNextWave = (controls, wave) => {
      if (revealing) return;
      const next = nextAvailableWave(state, wave.key);
      if (!next || visibleWaveKeys.includes(next.key)) return;

      revealing = true;
      const selections = controls.map(numericValue);
      window.setTimeout(() => {
        createTitoWidget(state, {
          waveKeys: [...visibleWaveKeys, next.key],
          restoreSelections: selections,
          preserveWarning: true
        });
      }, 0);
    };

    const evaluate = (availabilityRefresh = false) => {
      const controls = ticketQuantityControls(mount);
      if (controls.length < expectedControlCount()) return;
      restoreWhenReady(controls);

      let blocked = false;
      let warning = null;
      let reveal = null;

      waveState.forEach((wave, waveIndex) => {
        const group = groupForWave(controls, waveIndex);
        const remaining = Math.max(0, Number(wave.remaining || 0));

        group.forEach((control) => {
          if (control.tagName === 'INPUT' && control.max !== String(remaining)) {
            control.max = String(remaining);
          }
        });

        const total = group.reduce((sum, control) => sum + numericValue(control), 0);
        if (total <= remaining) return;

        blocked = true;
        const next = nextAvailableWave(state, wave.key);
        if (next && !visibleWaveKeys.includes(next.key) && !reveal) {
          reveal = { wave, controls };
        }

        if (!warning) {
          const noun = remaining === 1 ? 'ticket' : 'tickets';
          if (availabilityRefresh) {
            warning = {
              title: 'Ticket availability has just changed',
              copy: `Only ${remaining} ${noun} are now left at this price, but you currently have ${total} selected at this price. Please reduce that selection to ${remaining} or fewer.${next ? ' The next price is available below for any additional tickets.' : ''}`
            };
          } else {
            warning = {
              title: `Only ${remaining} ${noun} left at this price`,
              copy: `You've selected ${total} at this price. Please reduce that selection to ${remaining} or fewer.${next ? ' The next price is now available below for any additional tickets.' : ''}`
            };
          }
        }
      });

      latestSelectedTotal = controls.reduce((sum, control) => sum + numericValue(control), 0);
      lastRequestedQuantity = latestSelectedTotal;
      continueButtons(mount).forEach((button) => setGuarded(button, blocked));

      if (warning) {
        stickySelectionWarning = true;
        showSelectionWarning(warning.title, warning.copy);
      } else {
        stickySelectionWarning = false;
        clearSelectionWarning();
      }

      // Tito's +/- controls can update the number field programmatically without
      // emitting a normal input/change event. Any over-limit selection found here
      // still represents a customer action unless this evaluation was explicitly
      // triggered by an availability refresh, so reveal the next band immediately.
      if (reveal) revealNextWave(reveal.controls, reveal.wave);
    };

    const onInput = (event) => {
      if (correcting) return;
      if (event.target?.tagName === 'INPUT' && event.type === 'change') return;
      if (event.target?.tagName === 'SELECT' && event.type === 'input') return;
      if (!ticketQuantityControls(mount).includes(event.target)) return;
      evaluate(false);
    };
    mount.addEventListener('input', onInput, true);
    mount.addEventListener('change', onInput, true);

    // Tito's plus/minus buttons do not consistently emit an input/change event.
    // Check on the next animation frame, plus a short fallback, so the warning and
    // next price band appear immediately instead of waiting for the 10s poll.
    const onClick = (event) => {
      const button = event.target?.closest?.('button, [role="button"]');
      if (!button || !mount.contains(button)) return;
      if (continueButtons(mount).includes(button)) return;
      window.requestAnimationFrame(() => evaluate(false));
      if (clickCheckTimer) window.clearTimeout(clickCheckTimer);
      clickCheckTimer = window.setTimeout(() => evaluate(false), 80);
    };
    mount.addEventListener('click', onClick, true);

    // Watch only structural changes from Tito. We deliberately do not watch the
    // disabled/value attributes, because our own guard changes those and that can
    // create a feedback loop. A structural re-render is treated as a customer-side
    // update; genuine concurrency changes arrive via updateAvailability below.
    const observer = new MutationObserver(() => window.requestAnimationFrame(() => evaluate(false)));
    observer.observe(mount, { childList: true, subtree: true });
    window.setTimeout(() => evaluate(false), 100);

    quantityGuardCleanup = () => {
      observer.disconnect();
      if (clickCheckTimer) window.clearTimeout(clickCheckTimer);
      mount.removeEventListener('input', onInput, true);
      mount.removeEventListener('change', onInput, true);
      mount.removeEventListener('click', onClick, true);
      continueButtons(mount).forEach((button) => setGuarded(button, false));
    };

    quantityGuardCleanup.updateAvailability = (nextState) => {
      state = nextState;
      waveState = visibleWavesFromState(nextState);
      evaluate(true);
    };
    quantityGuardCleanup.selectedTotal = () => latestSelectedTotal;
  }

  function createTitoWidget(state, options = {}) {
    const mount = $('#tito-mount');
    const wave = state?.currentWave;
    if (!mount || !wave) {
      ticketPlaceholder('No test tickets are available right now.', 'The page will update once the test allocation changes.');
      return;
    }

    const requestedKeys = Array.isArray(options.waveKeys) && options.waveKeys.length ? options.waveKeys : [wave.key];
    const waves = visibleWavesFromState(state, requestedKeys);
    const releases = waves.flatMap((item) => item.releases || []);

    if (!releases.length) {
      ticketPlaceholder('Test tickets are not configured yet.', 'Check the test Activity names in integration-config-2026.mjs.');
      return;
    }

    visibleWaveKeys = waves.map((item) => item.key);
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
    installQuantityGuard(state, waves, options.restoreSelections || []);
    if (!options.preserveWarning) {
      stickySelectionWarning = false;
      clearSelectionWarning();
    }
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
        if (selected === 0) {
          stickySelectionWarning = false;
          clearSelectionWarning();
          createTitoWidget(next);
        } else {
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
