(() => {
  const token = new URLSearchParams(location.search).get('token');
  const root = document.querySelector('#post-purchase-root');
  if (!root) return;
  if (!token) {
    root.innerHTML = '<div class="utility-card"><h1>Booking link missing</h1><p>Please use the link from your booking confirmation.</p><p><a class="button button-dark" href="/">Back to the event website</a></p></div>';
    return;
  }

  const api = async (url, options = {}) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  };

  const choices = [
    {
      stage: 'cancellation',
      title: 'If we have to cancel, could you help us carry the cost?',
      body: 'Cancelling the fireworks would always be a last resort. By the time that decision is made, though, a lot of the event cost has already been spent or committed. Refunding every booking can turn one cancelled evening into a major loss and make it much harder to put on the next display. If you are happy for us to keep your ticket money as a donation instead, it gives the event a financial cushion when we need it most and helps us come back the following year.',
      yes: ['Donate my ticket money if the event is cancelled', 'donate'],
      no: ['Refund me as normal', 'refund']
    },
    {
      stage: 'next_year',
      title: 'Same again next year?',
      body: 'We can send you a heads-up when tickets for next year’s Wotton Firework Display go on sale. No need to remember to look for them.',
      yes: ['Tell me when next year’s tickets go on sale', 'yes'],
      no: ['No thanks', 'no']
    },
    {
      stage: 'other_events',
      title: 'More good things to do in Wotton',
      body: 'Fireworks is only one of the events we organise and get involved with. If you would like to hear when we have something worth coming to, from family events and festivals to comedy, food and the occasional slightly daft idea, we’ll keep you posted.',
      yes: ['Keep me posted about future events', 'yes'],
      no: ['No thanks', 'no']
    }
  ];

  let state = null;
  let index = 0;

  async function save(stage, value) {
    await api('/api/order-preferences', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, stage, value })
    });
    index += 1;
    render();
  }

  async function bookMeetAndGreet() {
    const button = document.querySelector('#meet-book');
    if (button) button.disabled = true;
    try {
      await api('/api/meet-and-greet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token })
      });
      root.innerHTML = `<div class="utility-card"><p class="kicker kicker-dark">You're all set</p><h1>Thanks — and see you on 7 November.</h1><p>Your booking choices have been saved.</p><p><a class="button button-dark" href="/#visit">Plan your visit</a></p></div>`;
    } catch (error) {
      alert(error.message);
      if (button) button.disabled = false;
    }
  }

  function render() {
    if (!state) return;
    if (index < choices.length) {
      const item = choices[index];
      root.innerHTML = `<div class="utility-card"><p class="utility-progress">${index + 1} of ${choices.length}${state.meetAndGreetEnabled ? ' + one optional invite' : ''}</p><h1>${item.title}</h1><p>${item.body}</p><div class="utility-actions"><button class="button button-dark" data-value="${item.yes[1]}">${item.yes[0]}</button><button class="button button-outline-dark" data-value="${item.no[1]}">${item.no[0]}</button></div></div>`;
      root.querySelectorAll('[data-value]').forEach((button) => button.addEventListener('click', () => save(item.stage, button.dataset.value)));
      return;
    }
    if (state.meetAndGreetEnabled) {
      root.innerHTML = `<div class="utility-card"><p class="kicker kicker-dark">One last thing</p><h1>Fancy meeting the people behind the fireworks?</h1><p>Our next Round Table social is bouldering: exactly the sort of thing we get up to when we are not running the fireworks. We’re also putting on a Round Table family meet-and-greet at Beermongery.Inc, 40 Long St, Wotton-under-Edge, on Friday 13 November at 8pm. Come along, meet people and see what the Round Table family is actually like. No speeches and no obligation.</p><div class="utility-actions"><button id="meet-book" class="button button-dark">Claim my free place</button><a class="button button-outline-dark" href="/#visit">Maybe another time</a></div></div>`;
      document.querySelector('#meet-book')?.addEventListener('click', bookMeetAndGreet);
      return;
    }
    root.innerHTML = `<div class="utility-card"><p class="kicker kicker-dark">You're all set</p><h1>Thanks — and see you on 7 November.</h1><p>Your choices have been saved against booking <strong>${state.reference}</strong>.</p><p><a class="button button-dark" href="/#visit">Plan your visit</a></p></div>`;
  }

  root.innerHTML = '<div class="utility-card"><p>Loading your booking…</p></div>';
  api(`/api/order-view?token=${encodeURIComponent(token)}`).then((data) => {
    state = data;
    render();
  }).catch((error) => {
    root.innerHTML = `<div class="utility-card"><h1>We couldn't load that booking</h1><p>${error.message}</p><p><a class="button button-dark" href="/">Back to the event website</a></p></div>`;
  });
})();
