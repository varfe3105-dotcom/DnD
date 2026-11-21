// Begleiter Ende zu Ende mit zwei Geräten: Beast-Master-Waldläufer (Stufe 3, kein Begleiter angelegt) tritt der Kampagne bei.
// Erwartet: Primal Companion entsteht automatisch, Spielleitung sieht ihn in „Bogen ansehen“ und im Kampf unter dem Spieler.
import { test, expect, URL_UNDER_TEST } from './helpers.js';
import crypto from 'node:crypto';

const hash = s => crypto.createHash('sha256').update(String(s || '')).digest('hex');
function server() {
  const rows = new Map(); let tick = Date.parse('2026-01-01T00:00:00Z');
  const now = () => new Date((tick += 1000)).toISOString();
  return { rows, api: {
    charbogen_put2: ({ p_room, p_kind, p_id, p_name, p_data, p_secret }) => { const k = `${p_room}|${p_kind}|${p_id}`; const at = now(); rows.set(k, { kind: p_kind, data: p_data, updated_at: at, owner: hash(p_secret) }); return at; },
    charbogen_get2: ({ p_room, p_kind, p_id }) => { const r = rows.get(`${p_room}|${p_kind}|${p_id}`); return r ? [{ data: r.data, updated_at: r.updated_at }] : []; },
  } };
}
function channel() {
  const pages = new Set(), presence = new Map();
  const fanout = async () => { const list = [...presence.values()]; for (const p of pages) await p.evaluate(l => window.__peers && window.__peers(l), list).catch(() => {}); };
  return { pages, presence, fanout };
}
async function device(browser, srv, ch, data) {
  const ctx = await browser.newContext();
  await ctx.exposeBinding('__track', async (_s, key, p) => { ch.presence.set(key, { ...p, key }); await ch.fanout(); });
  await ctx.addInitScript(() => { window.__liveFake = (code, key, onPeers, onStatus) => { window.__peers = onPeers; setTimeout(() => onStatus('on'), 0); return { track(p) { window.__track(key, p); }, send() {}, close() {} }; }; });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route('**/rest/v1/rpc/*', async route => {
    const fn = route.request().url().split('/').pop(), f = srv.api[fn];
    if (!f) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"PGRST202"}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(f(JSON.parse(route.request().postData() || '{}'))) });
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('Seitenfehler:', e.message));
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
  ch.pages.add(page);
  return { ctx, page };
}
const ROOM = 'WLF234';
const daniel = { v: 4, id: 'd1', name: 'Grom', race: 'Goliath', klass: 'Ranger', sub: 'Beast Master', level: 3, hp: 28, hpMax: 28, prof: 2, abil: { str: 14, dex: 16, con: 14, int: 10, wis: 14, cha: 8 }, pets: [] };

test('Beast Master ohne angelegten Wolf: Begleiter automatisch, Spielleitung sieht ihn im Bogen und im Kampf @new', async ({ browser }) => {
  test.setTimeout(90000);
  const srv = server(), ch = channel();
  const dm = await device(browser, srv, ch, { 'charbogen-lang': 'de', 'charbogen-dm': { on: true }, 'charbogen-campaigns': [{ id: 'c1', name: 'Runde', status: 'active', chars: [], role: 'dm', room: ROOM, split: true }] });
  await dm.page.locator('.hub-side [data-s="gm"]').click();
  await dm.page.locator('.hub-camp [data-a="campplay"]').click();
  // Daniel: Grundbogen in der Bibliothek, Kampagne mit eigenem Stand
  const pl = await device(browser, srv, ch, { 'charbogen-lang': 'de', 'charbogen-v4': daniel, 'charbogen-char-d1': daniel, 'charbogen-index': [{ id: 'd1', name: 'Grom' }], 'charbogen-campaigns': [{ id: 'c1', name: 'Runde', status: 'active', chars: ['d1'], role: 'player', room: ROOM, split: true }] });
  await pl.page.locator('.hub-side [data-s="camps"]').click();
  await pl.page.locator('.hub-camp [data-a="campplay"]').click();
  // Spieler: Begleiter automatisch angelegt und sichtbar
  await pl.page.locator('.tabs [data-a="tab"][data-t="prof"]').click();
  await expect(pl.page.locator('#app')).toContainText('Beast of the Land');
  await expect.poll(() => ch.presence.get('d1')?.pets?.length || 0).toBe(1);
  // Spielleitung: Bogen ansehen zeigt den Begleiter
  await expect.poll(() => srv.rows.has(`${ROOM}|char|d1`), { timeout: 20000 }).toBe(true);
  await dm.page.locator('.tabs [data-a="tab"][data-t="dmlive"]').click();
  await dm.page.locator('.dm-prow [data-a="peek"]').first().click();
  await expect(dm.page.locator('.dlg.peek')).toContainText('Beast of the Land');
  await dm.page.locator('[data-a="peekclose"]').click();
  // Kampf: Spieler aufnehmen, Begleiter steht darunter
  await dm.page.locator('[data-a="liveadd1"]').first().click();
  await dm.page.locator('.tabs [data-a="tab"][data-t="dmcombat"]').click();
  await expect(dm.page.locator('.dm-row', { hasText: 'Beast of the Land' })).toBeVisible();
  for (const d of [dm, pl]) await d.ctx.close();
});
