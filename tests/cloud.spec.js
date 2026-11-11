import { test, expect, act, base4, URL_UNDER_TEST } from './helpers.js';

// Nachbau der SQL-Funktionen aus supabase/charbogen-saves.sql, geteilt zwischen mehreren „Geräten“ (Browser-Kontexten).
function fakeServer() {
  const rows = new Map();
  let tick = Date.parse('2026-01-01T00:00:00Z');
  const now = () => new Date((tick += 1000)).toISOString();
  const api = {
    charbogen_put: ({ p_room, p_kind, p_id, p_name, p_data, p_base }) => {
      const k = `${p_room}|${p_kind}|${p_id}`, cur = rows.get(k);
      if (cur && p_base !== null && Date.parse(cur.updated_at) > Date.parse(p_base)) return null;
      const at = now();
      rows.set(k, { kind: p_kind, id: p_id, name: p_name, data: p_data, updated_at: at, room: p_room });
      return at;
    },
    charbogen_list: ({ p_room }) => [...rows.values()].filter(r => r.room === p_room).map(({ kind, id, name, updated_at }) => ({ kind, id, name, updated_at })),
    charbogen_get: ({ p_room, p_kind, p_id }) => { const r = rows.get(`${p_room}|${p_kind}|${p_id}`); return r ? [{ data: r.data, updated_at: r.updated_at }] : []; },
    charbogen_del: ({ p_room, p_kind, p_id }) => { rows.delete(`${p_room}|${p_kind}|${p_id}`); return null; },
  };
  return { rows, api };
}
const live = () => {
  window.__liveFake = (code, key, onPeers, onStatus) => { setTimeout(() => onStatus('on'), 0); return { track() {}, send() {}, close() {} }; };
};
async function device(browser, server, state, { setup = true } = {}) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(live);
  await ctx.route('**/rest/v1/rpc/*', async route => {
    if (!setup) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"PGRST202","message":"Could not find the function public.charbogen_put"}' });
    const fn = route.request().url().split('/').pop();
    const out = server.api[fn](JSON.parse(route.request().postData() || '{}'));
    return route.fulfill(out === null && fn === 'charbogen_del' ? { status: 204 } : { status: 200, contentType: 'application/json', body: JSON.stringify(out) });
  });
  const page = await ctx.newPage();
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(s => { localStorage.clear(); localStorage.setItem('charbogen-v4', JSON.stringify(s)); }, state);
  await page.reload();
  await page.locator('#app header').waitFor();
  return { ctx, page };
}
const join = async (page, code = 'ABC234') => {
  await page.locator('#live-code').fill(code);
  await act(page, 'livejoin').click();
  await expect(page.locator('.live-state')).toHaveClass(/on/);
};

test.describe('Online-Speicherung @new', () => {
  test('Spieler sichert beim Beitritt, ein zweites Gerät lädt den Bogen', async ({ browser }) => {
    const server = fakeServer();
    const a = await device(browser, server, base4({ tab: 'setup', id: 'held1', name: 'Mirelle', hp: 17 }));
    await join(a.page);
    await expect(a.page.locator('.cloud-st')).toHaveClass(/ok/);
    expect(server.rows.get('ABC234|char|held1').data.hp).toBe(17);
    expect(server.rows.get('ABC234|char|held1').name).toBe('Mirelle');

    const b = await device(browser, server, base4({ tab: 'setup', id: 'anders', name: 'Borin' }));
    await join(b.page);
    const row = b.page.locator('.cloud .edrow', { hasText: 'Mirelle' });
    await expect(row).toBeVisible();
    await row.locator('[data-a="cloudpull"]').click();
    await expect(b.page.locator('.edrow', { hasText: 'Mirelle' }).first()).toBeVisible();
    const stored = await b.page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-char-held1')));
    expect(stored.hp).toBe(17);
    await a.ctx.close(); await b.ctx.close();
  });

  test('neuerer Online-Stand wird nicht überschrieben, Laden übernimmt ihn', async ({ browser }) => {
    const server = fakeServer();
    const a = await device(browser, server, base4({ tab: 'setup', id: 'held1', name: 'Mirelle', hp: 17 }));
    await join(a.page);
    await expect(a.page.locator('.cloud-st')).toHaveClass(/ok/);
    // Ein anderes Gerät speichert inzwischen einen neueren Stand.
    server.api.charbogen_put({ p_room: 'ABC234', p_kind: 'char', p_id: 'held1', p_name: 'Mirelle', p_data: { ...server.rows.get('ABC234|char|held1').data, hp: 5 }, p_base: null });
    await act(a.page, 'cloudnow').click();
    await expect(a.page.locator('.cloud-st')).toHaveClass(/conflict/);
    expect(server.rows.get('ABC234|char|held1').data.hp).toBe(5);
    await a.page.locator('.cloud [data-a="cloudpull"]').first().click();
    await expect(a.page.locator('.cloud-st')).not.toHaveClass(/conflict/);
    expect(await a.page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-v4')).hp)).toBe(5);
    await a.ctx.close();
  });

  test('gleicher Bogen ohne bekannten Stand überschreibt nichts', async ({ browser }) => {
    const server = fakeServer();
    server.api.charbogen_put({ p_room: 'ABC234', p_kind: 'char', p_id: 'held1', p_name: 'Mirelle', p_data: { hp: 3 }, p_base: null });
    const a = await device(browser, server, base4({ tab: 'setup', id: 'held1', name: 'Mirelle', hp: 17 }));
    await join(a.page);
    await expect(a.page.locator('.cloud-st')).toHaveClass(/conflict/);
    expect(server.rows.get('ABC234|char|held1').data.hp).toBe(3);
    await act(a.page, 'cloudforce').click();
    await expect(a.page.locator('.cloud-st')).toHaveClass(/ok/);
    expect(server.rows.get('ABC234|char|held1').data.hp).toBe(17);
    await a.ctx.close();
  });

  test('ohne SQL-Skript erscheint ein Hinweis statt eines Fehlers', async ({ browser }) => {
    const a = await device(browser, fakeServer(), base4({ tab: 'setup' }), { setup: false });
    await join(a.page);
    await expect(a.page.locator('.cloud-st')).toHaveClass(/setup/);
    await expect(a.page.locator('.cloud-st')).toContainText('SQL');
    await a.ctx.close();
  });

  test('Spielleitung sichert den DM-Bereich und kann ihn auf einem neuen Gerät laden', async ({ browser }) => {
    const server = fakeServer();
    const a = await device(browser, server, base4({ tab: 'dm' }));
    await a.page.evaluate(() => { localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, view: 'live', notes: [{ id: 'n1', title: 'Rabenturm', text: 'Geheimgang', kind: 'place' }] })); });
    await a.page.reload();
    await act(a.page, 'livecreate').click();
    await expect(a.page.locator('.cloud-st')).toHaveClass(/ok/);
    const room = [...server.rows.values()].find(r => r.kind === 'dm');
    expect(room.data.notes[0].title).toBe('Rabenturm');

    const b = await device(browser, server, base4({ tab: 'dm' }));
    await b.page.evaluate(() => localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, view: 'live' })));
    await b.page.reload();
    await b.page.locator('#live-dmcode').fill(room.room.toLowerCase());
    await act(b.page, 'livedmjoin').click();
    const row = b.page.locator('.cloud .edrow', { hasText: /DM/ });
    await expect(row).toBeVisible();
    await expect(b.page.locator('.cloud-st')).toHaveClass(/conflict/);
    await row.locator('[data-a="cloudpull"]').click();
    await expect.poll(() => b.page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')).notes?.[0]?.title)).toBe('Rabenturm');
    await a.ctx.close(); await b.ctx.close();
  });
});
