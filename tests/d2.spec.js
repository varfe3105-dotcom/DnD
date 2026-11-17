// D2: Geheimnis je Gerät, geschützter Spielleitungsbereich, gemeinsame Chronik. Nachbau der neuen SQL-Funktionen
// aus supabase/charbogen-saves.sql (Besitz über Hash, 'dm' nur mit Geheimnis lesbar) für zwei Geräte.
import { test, expect, URL_UNDER_TEST } from './helpers.js';
import crypto from 'node:crypto';

const hash = s => crypto.createHash('sha256').update(String(s || '')).digest('hex');
function server() {
  const rows = new Map(); let tick = Date.parse('2026-01-01T00:00:00Z');
  const now = () => new Date((tick += 1000)).toISOString();
  const api = {
    charbogen_put2: ({ p_room, p_kind, p_id, p_name, p_data, p_base, p_secret }) => {
      if (String(p_secret || '').length < 24) throw new Error('no secret');
      const k = `${p_room}|${p_kind}|${p_id}`, cur = rows.get(k), h = hash(p_secret);
      if (cur && cur.owner && cur.owner !== h) throw new Error('not owner');
      if (cur && p_base !== null && Date.parse(cur.updated_at) > Date.parse(p_base)) return null;
      const at = now(); rows.set(k, { room: p_room, kind: p_kind, id: p_id, name: p_name, data: p_data, updated_at: at, owner: h }); return at;
    },
    charbogen_get2: ({ p_room, p_kind, p_id, p_secret }) => { const r = rows.get(`${p_room}|${p_kind}|${p_id}`); return r && (r.kind !== 'dm' || r.owner === hash(p_secret)) ? [{ data: r.data, updated_at: r.updated_at }] : []; },
    charbogen_list: ({ p_room }) => [...rows.values()].filter(r => r.room === p_room).map(({ kind, id, name, updated_at }) => ({ kind, id, name, updated_at })),
  };
  return { rows, api };
}
async function device(browser, srv, data, peer) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(d => { window.__liveFake = (code, key, onPeers, onStatus) => { setTimeout(() => onStatus('on'), 0); return { track(p) { onPeers([...(d ? [d] : []), { ...p, key }]); }, send() {}, close() {} }; }; }, peer || null);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route('**/rest/v1/rpc/*', async route => {
    const fn = route.request().url().split('/').pop(), f = srv.api[fn];
    if (!f) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"PGRST202"}' });
    try { return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(f(JSON.parse(route.request().postData() || '{}'))) }); }
    catch (e) { return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: e.message }) }); }
  });
  const page = await ctx.newPage();
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
  return { ctx, page };
}
const lib = { v: 4, id: 'c1', name: 'Mirelle', level: 3 };

test.describe('D2: gemeinsame Chronik und geschützte Spielleitungsdaten @new', () => {
  test('Spielleitung teilt nur den Gruppentext; ihr Bereich ist ohne Geheimnis nicht lesbar; Spieler sehen die geteilte Chronik', async ({ browser }) => {
    const srv = server();
    const dm = await device(browser, srv, { 'charbogen-v4': lib, 'charbogen-dm': { on: true }, 'charbogen-campaigns': [{ id: 'd1', name: 'Runde', status: 'active', chars: [], role: 'dm', room: 'DDD444', split: true }],
      'charbogen-dm-camp-d1': { notes: [{ id: 's1', kind: 'session', title: 'Sitzung 1', body: 'Geheim: Der Vogt ist bestochen.' }, { id: 's2', kind: 'session', title: 'Sitzung 2', body: 'Privat bleibt privat.' }] } });
    const p = dm.page;
    await p.locator('.hub-side [data-s="gm"]').click();
    await p.locator('.hub-camp [data-a="campplay"]').click();
    await p.locator('[data-a="tab"][data-t="dmnotes"]').click();
    await p.locator('[data-a="chronv"][data-k="book"]').click();
    // Buch: Seite „Sitzung 1“ im Inhaltsverzeichnis aufschlagen
    await p.locator('.bk-toc [data-a="bksel"][data-id="s1"]').click();
    await p.locator('[data-a="bookpub"][data-id="s1"]').click();
    const txt = p.locator('textarea[data-bookpub="s1"]');
    await expect(txt).toHaveValue('Geheim: Der Vogt ist bestochen.');
    await txt.fill('Die Gruppe erreicht Grenzhall. Der Vogt verweigert Hilfe.');
    await txt.blur();
    await expect.poll(() => srv.rows.get('DDD444|chron|shared')?.data?.entries, { timeout: 15000 }).toEqual([{ id: 's1', t: 'Sitzung 1', x: 'Die Gruppe erreicht Grenzhall. Der Vogt verweigert Hilfe.', k: 'session' }]);
    expect(JSON.stringify(srv.rows.get('DDD444|chron|shared'))).not.toMatch(/bestochen|Privat bleibt/);
    // Spielleitungsbereich: ohne Geheimnis nicht lesbar, Besitz gesetzt
    expect(srv.rows.get('DDD444|dm|dm').owner).toBeTruthy();
    expect(srv.api.charbogen_get2({ p_room: 'DDD444', p_kind: 'dm', p_id: 'dm', p_secret: 'x'.repeat(48) })).toEqual([]);
    // Spieler: sieht die geteilte Chronik
    const pl = await device(browser, srv, { 'charbogen-v4': lib, 'charbogen-campaigns': [{ id: 'k1', name: 'Runde', status: 'active', chars: ['c1'], role: 'player', room: 'DDD444', split: true }] }, { key: 'dm-x', role: 'dm', chron: 'm1' });
    await pl.page.locator('.hub-side [data-s="camps"]').click();
    await pl.page.locator('.hub-camp [data-a="campplay"]').click();
    await pl.page.locator('[data-a="tab"][data-t="chron"]').click();
    await expect(pl.page.locator('.book .bk-page')).toContainText('Der Vogt verweigert Hilfe.');
    await expect(pl.page.locator('.book .bk-seal')).toBeVisible();
    await expect(pl.page.locator('.book')).not.toContainText('bestochen');
    // Der Spieler kann den Spielleitungsbereich nicht überschreiben (Besitz)
    expect(() => srv.api.charbogen_put2({ p_room: 'DDD444', p_kind: 'dm', p_id: 'dm', p_name: 'x', p_data: {}, p_base: null, p_secret: 'y'.repeat(48) })).toThrow('not owner');
    await dm.ctx.close(); await pl.ctx.close();
  });
});
