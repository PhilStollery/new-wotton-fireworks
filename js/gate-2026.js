(() => {
  const root = document.querySelector('#gate-root');
  const tokenFromUrl = new URLSearchParams(location.search).get('token') || '';
  let token = tokenFromUrl;
  let gateKey = sessionStorage.getItem('wfdGateKey') || '';
  let current = null;

  const api = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), 'x-gate-key': gateKey }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  };

  function login() {
    root.innerHTML = `<div class="utility-card gate-login"><h1>Gate check-in</h1><p>Enter the staff access code for this device.</p><form id="gate-login-form"><input id="gate-code" type="password" autocomplete="current-password" required><button class="button button-dark">Continue</button></form></div>`;
    document.querySelector('#gate-login-form').addEventListener('submit', (event) => {
      event.preventDefault();
      gateKey = document.querySelector('#gate-code').value;
      sessionStorage.setItem('wfdGateKey', gateKey);
      token ? loadOrder() : showSearch();
    });
  }

  async function loadOrder() {
    try {
      const data = await api(`/api/gate-order?token=${encodeURIComponent(token)}`);
      current = data.order;
      renderOrder();
    } catch (error) {
      if (/access code|401/i.test(error.message)) return login();
      root.innerHTML = `<div class="utility-card"><h1>Booking unavailable</h1><p>${error.message}</p><button id="search-instead" class="button button-dark">Search bookings</button></div>`;
      document.querySelector('#search-instead').onclick = showSearch;
    }
  }

  function renderOrder() {
    const checked = current.tickets.filter((t) => t.checkedIn).length;
    const rows = current.tickets.map((t) => `<label class="gate-ticket ${t.checkedIn ? 'is-checked' : ''}"><input type="checkbox" data-slug="${t.slug}" data-uuid="${t.checkinUuid || ''}" data-checked="${t.checkedIn ? '1' : '0'}"><span><strong>${t.releaseTitle}</strong><small>${t.reference} · ${t.checkedIn ? 'checked in' : 'not checked in'}</small></span></label>`).join('');
    root.innerHTML = `<div class="utility-card gate-order"><div class="gate-topline"><div><p class="kicker kicker-dark">Order ${current.reference}</p><h1>${current.name || 'Group booking'}</h1><p>${current.email || ''}</p></div><div class="gate-count"><strong>${checked}/${current.tickets.length}</strong><span>checked in</span></div></div>${current.refunded || /cancel/i.test(current.state) ? '<div class="gate-warning">This booking is cancelled or refunded. Do not admit without resolving it.</div>' : ''}<div class="gate-ticket-list">${rows}</div><div class="utility-actions"><button id="check-selected" class="button button-dark">Check in selected</button><button id="check-all" class="button button-dark">Check in all remaining</button><button id="reverse-selected" class="button button-outline-dark">Undo selected check-ins</button><button id="new-search" class="button button-outline-dark">Search</button></div></div>`;
    document.querySelector('#check-selected').onclick = () => mutate('checkin', [...document.querySelectorAll('.gate-ticket input:checked')].filter((el) => el.dataset.checked === '0').map((el) => el.dataset.slug), []);
    document.querySelector('#check-all').onclick = () => mutate('checkin', current.tickets.filter((t) => !t.checkedIn).map((t) => t.slug), []);
    document.querySelector('#reverse-selected').onclick = () => mutate('reverse', [], [...document.querySelectorAll('.gate-ticket input:checked')].filter((el) => el.dataset.checked === '1').map((el) => el.dataset.uuid));
    document.querySelector('#new-search').onclick = showSearch;
  }

  async function mutate(action, ticketSlugs, checkinUuids) {
    if (!(ticketSlugs.length || checkinUuids.length)) return;
    try {
      await api('/api/gate-checkin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action, ticketSlugs, checkinUuids }) });
      await loadOrder();
    } catch (error) { alert(error.message); }
  }

  function showSearch() {
    token = '';
    history.replaceState({}, '', '/gate');
    root.innerHTML = `<div class="utility-card"><h1>Find a booking</h1><p>Search by order reference, purchaser name or email address.</p><form id="gate-search-form" class="gate-search"><input id="gate-search" type="search" minlength="2" required autocomplete="off"><button class="button button-dark">Search</button></form><div id="gate-results"></div></div>`;
    document.querySelector('#gate-search-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const q = document.querySelector('#gate-search').value.trim();
      try {
        const data = await api(`/api/gate-search?q=${encodeURIComponent(q)}`);
        const results = document.querySelector('#gate-results');
        results.innerHTML = data.results.length ? data.results.map((r, i) => `<button class="gate-search-result" data-i="${i}"><strong>${r.reference}</strong><span>${r.name || ''}</span><small>${r.email || ''} · ${r.ticketCount || 0} tickets · ${r.state}</small></button>`).join('') : '<p>No matching bookings found.</p>';
        results.querySelectorAll('[data-i]').forEach((button) => button.onclick = () => { token = data.results[Number(button.dataset.i)].token; history.replaceState({}, '', `/gate?token=${encodeURIComponent(token)}`); loadOrder(); });
      } catch (error) {
        if (/access code|401/i.test(error.message)) return login();
        alert(error.message);
      }
    });
  }

  if (!gateKey) login(); else if (token) loadOrder(); else showSearch();
})();
