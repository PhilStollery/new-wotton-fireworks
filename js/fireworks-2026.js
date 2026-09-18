(() => {
  const data = window.FIREWORKS_EVENT;
  if (!data) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

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

  function attribution() {
    const params = new URLSearchParams(window.location.search);
    const keys = ['source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    const current = {};
    keys.forEach((key) => { const value = params.get(key); if (value) current[key] = value; });
    if (Object.keys(current).length) {
      sessionStorage.setItem('wottonFireworksAttribution', JSON.stringify(current));
      return current;
    }
    try { return JSON.parse(sessionStorage.getItem('wottonFireworksAttribution') || '{}'); }
    catch { return {}; }
  }

  function ensureAttributionInUrl(attrs) {
    const url = new URL(window.location.href);
    let changed = false;
    Object.entries(attrs).forEach(([key, value]) => {
      if (value && !url.searchParams.has(key)) { url.searchParams.set(key, value); changed = true; }
    });
    if (changed) window.history.replaceState({}, '', url);
  }

  function setupTitoLifecycle() {
    window.tito = window.tito || function() { (window.tito.q = window.tito.q || []).push(arguments); };
    window.tito('on:registration:finished', async (registration) => {
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
        // Leave Tito's successful completion state visible rather than disrupting a paid order.
        console.warn('WFD post-purchase handover skipped:', error.message);
      }
    });
  }

  function renderTickets() {
    const mount = $('#tito-mount');
    if (!mount) return;

    if (data.ticketMode !== 'tickets' || !data.titoEvent) {
      mount.innerHTML = `
        <div class="ticket-placeholder">
          <p class="ticket-status">Tickets open Monday 21 September · 5pm</p>
          <h3>The live ticket selector will appear here.</h3>
          <p>The first 1,000 paid admission tickets are discounted. Once sales open, this booking panel will show the current admission prices and the parking options still available.</p>
          <p class="ticket-note">Everyone attending needs a ticket. Children who have not yet started Reception attend free. Select a free ticket for them.</p>
        </div>
      `;
      return;
    }

    const attrs = attribution();
    ensureAttributionInUrl(attrs);
    setupTitoLifecycle();

    const widget = document.createElement('tito-widget');
    widget.setAttribute('event', data.titoEvent);
    widget.setAttribute('save-metadata-parameters', 'utm_*');
    widget.setAttribute('source', attrs.source || data.defaultSource || 'Direct');
    mount.replaceChildren(widget);

    if (!document.querySelector('script[data-tito-widget]')) {
      const script = document.createElement('script');
      const plugins = ['inline'];
      if (data.titoTestMode) plugins.push('test_mode');
      script.src = `https://js.tito.io/v2/with/${plugins.join(',')}`;
      script.async = true;
      script.dataset.titoWidget = 'true';
      document.head.appendChild(script);
    }
  }

  function setupHeroVideo() {
    if (!data.heroVideo) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const video = $('#hero-video');
    const source = $('#hero-video-source');
    if (!video || !source) return;
    source.src = data.heroVideo;
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
