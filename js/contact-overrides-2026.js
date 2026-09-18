(() => {
  const data = window.FIREWORKS_EVENT;
  if (!data) return;

  const email = 'help@wotton-firework-display.co.uk';
  const facebookUrl = 'https://www.facebook.com/wotton.fireworks';
  const facebookLink = `<a href="${facebookUrl}" target="_blank" rel="noopener">Wotton Firework Display Facebook page</a>`;
  const emailLink = `<a href="mailto:${email}">${email}</a>`;

  data.publicEmail = email;
  data.facebookUrl = facebookUrl;

  if (Array.isArray(data.faqs)) {
    data.faqs = data.faqs.map((item) => ({
      ...item,
      a: String(item.a || '')
        .replaceAll('wotton@roundtable.org.uk', emailLink)
        .replaceAll('Wotton Round Table Facebook page', facebookLink)
    }));
  }
})();
