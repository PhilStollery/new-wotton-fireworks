import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../post-event.html', import.meta.url), 'utf8');

test('post-event homepage thanks attendees and retains community contact', () => {
  assert.match(html, /Thank you,<br><span>Wotton!<\/span>/);
  assert.match(html, /7 November 2026/);
  assert.match(html, /local good causes/);
  assert.match(html, /facebook\.com\/wotton\.fireworks/);
  assert.match(html, /facebook\.com\/wottonrt/);
  assert.match(html, /href="\/terms"/);
  assert.match(html, /href="\/privacy"/);
});

test('post-event homepage does not load ticketing, sales or Tito scripts', () => {
  assert.doesNotMatch(html, /id="tito-mount"|js\/fireworks-2026\.js|js\/event-data-2026\.js/);
  assert.doesNotMatch(html, /Get tickets|Book for Wotton-under-Edge|ticket-availability/);
});
