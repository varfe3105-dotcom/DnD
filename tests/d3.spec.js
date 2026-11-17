// D3: Rechte serverseitig. Drei getrennte Browser-Profile (Spielleitung, Spieler A, Spieler B) über einen
// nachgebauten Server mit den Regeln aus supabase/d3-rechte.sql und einen gemeinsamen nachgebauten Live-Kanal.
// Geprüft wird, was tatsächlich über die Leitung geht – nicht nur, was angezeigt wird.
import { test, expect, URL_UNDER_TEST } from './helpers.js';
import crypto from 'node:crypto';

const hash = s => crypto.createHash('sha256').update(String(s || '')).digest('hex');
/** Nachbau der D3-Funktionen (gleiche Regeln wie das SQL). */
function server() {
  const rows = new Map(), rooms = new Map(); let tick = Date.parse('2026-01-01T00:00:00Z');
  const now = () => new Date((tick += 1000)).toISOString();
  const isDm = (room, s) => rooms.get(room)?.dm === hash(s);
  const api = {
    charbogen_claim: ({ p_room, p_secret, p_key }) => {
      if (String(p_secret || '').length < 24) throw new Error('no secret');
      if (p_key && (p_key.kty !== 'EC' || 'd' in p_key)) throw new Error('bad key');
      const r = rooms.get(p_room), h = hash(p_secret);
      if (!r) { rooms.set(p_room, { dm: h, key: p_key }); return true; }
      if (r.dm !== h) return false;
      r.key = p_key; return true;
    },
    charbogen_room_key: ({ p_room }) => rooms.get(p_room)?.key ?? null,
    charbogen_put2: ({ p_room, p_kind, p_id, p_name, p_data, p_base, p_secret }) => {
      if (String(p_secret || '').length < 24) throw new Error('no secret');
      if (['dm', 'chron'].includes(p_kind) && rooms.has(p_room) && !isDm(p_room, p_secret)) throw new Error('not dm');
      const k = `${p_room}|${p_kind}|${p_id}`, cur = rows.get(k), h = hash(p_secret);
      if (cur && cur.owner && cur.owner !== h) throw new Error('not owner');
      if (cur && p_base !== null && Date.parse(cur.updated_at) > Date.parse(p_base)) return null;
      const at = now(); rows.set(k, { room: p_room, kind: p_kind, id: p_id, name: p_name, data: p_data, updated_at: at, owner: h }); return at;
    },
    charbogen_get2: ({ p_room, p_kind, p_id, p_secret }) => {
      const r = rows.get(`${p_room}|${p_kind}|${p_id}`);
      const ok = r && (r.kind === 'chron' || r.owner === hash(p_secret) || (r.kind === 'char' && isDm(p_room, p_secret)));
      return ok ? [{ data: r.data, updated_at: r.updated_at }] : [];
    },
    charbogen_list2: ({ p_room, p_secret }) => [...rows.values()].filter(r => r.room === p_room && (isDm(p_room, p_secret) || r.owner === hash(p_secret))).map(({ kind, id, name, updated_at }) => ({ kind, id, name, updated_at })),
  };
  return { rows, rooms, api };
}
/** Gemeinsamer Live-Kanal: jede Presence geht an alle Geräte; alles, was gesendet wird, landet in wire. */
function channel() {
  const pages = new Set(), presence = new Map(), wire = [];
  const fanout = async () => { const list = [...presence.values()]; for (const p of pages) await p.evaluate(l => window.__peers && window.__peers(l), list).catch(() => {}); };
  return { pages, presence, wire, fanout };
}
async function device(browser, srv, ch, data) {
  const ctx = await browser.newContext();
  await ctx.exposeBinding('__track', async (_s, key, p) => { ch.wire.push(JSON.parse(JSON.stringify(p))); ch.presence.set(key, { ...p, key }); await ch.fanout(); });
  await ctx.addInitScript(() => {
    window.__liveFake = (code, key, onPeers, onStatus) => { window.__peers = onPeers; setTimeout(() => onStatus('on'), 0); return { track(p) { window.__track(key, p); }, send() {}, close() {} }; };
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route('**/rest/v1/rpc/*', async route => {
    const fn = route.request().url().split('/').pop(), f = srv.api[fn];
    if (!f) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"PGRST202"}' });
    try { return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(f(JSON.parse(route.request().postData() || '{}'))) }); }
    catch (e) { return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: e.message }) }); }
  });
  const page = await ctx.newPage();
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
  ch.pages.add(page);
  return { ctx, page };
}
const ROOM = 'QW3RT9';
const char = (id, name, hp, hpMax) => ({ v: 4, id, name, klass: 'Cleric', level: 3, hp, hpMax, abil: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }, spells: [{ n: 'Bless', lvl: 1 }] });
const pcamp = id => ({ 'charbogen-lang': 'de', 'charbogen-v4': char(id, id === 'a1' ? 'Mirelle' : 'Borin', id === 'a1' ? 30 : 9, id === 'a1' ? 38 : 44), 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: [id], role: 'player', room: ROOM, split: true }] });

test('Spielleitung und zwei Spieler: genaue TP nur verschlüsselt, fremde Bögen online nicht lesbar @new', async ({ browser }) => {
  test.setTimeout(90000);
  const srv = server(), ch = channel();
  // Spielleitung öffnet den Raum und beansprucht ihn
  const dm = await device(browser, srv, ch, { 'charbogen-lang': 'de', 'charbogen-dm': { on: true }, 'charbogen-campaigns': [{ id: 'd1', name: 'Grenzland', status: 'active', chars: [], role: 'dm', room: ROOM, split: true }] });
  await dm.page.locator('.hub-side [data-s="gm"]').click();
  await dm.page.locator('.hub-camp [data-a="campplay"]').click();
  await expect.poll(() => srv.rooms.get(ROOM)?.key?.kty).toBe('EC');
  expect(srv.rooms.get(ROOM).key.d).toBeUndefined();
  // Zwei Spieler treten bei
  const a = await device(browser, srv, ch, pcamp('a1'));
  const b = await device(browser, srv, ch, pcamp('b1'));
  for (const p of [a, b]) { await p.page.locator('.hub-side [data-s="camps"]').click(); await p.page.locator('.hub-camp [data-a="campplay"]').click(); }
  // Was über die Leitung geht: von Spielern keine TP-Zahlen, nur Stufe und Chiffrat
  await expect.poll(() => ch.presence.get('a1')?.sec?.ct?.length || 0).toBeGreaterThan(10);
  const sentByPlayers = ch.wire.filter(p => p.role === 'player');
  expect(sentByPlayers.length).toBeGreaterThan(0);
  for (const p of sentByPlayers) { expect(p.hp).toBeUndefined(); expect(p.hpMax).toBeUndefined(); expect(p.tmp).toBeUndefined(); expect(JSON.stringify(p)).not.toMatch(/"abil"|"spells"|Bless"?\]/); }
  expect(ch.presence.get('b1').hq).toBe('bad');
  // Spielleitung: entschlüsselt genaue Werte und sieht „Absicherung aktiv“
  await dm.page.locator('.tabs [data-a="tab"][data-t="dmlive"]').click();
  await expect(dm.page.locator('.sec-state.on')).toBeVisible();
  await expect(dm.page.locator('.dm-prow', { hasText: 'Mirelle' }).locator('.mc-hp')).toContainText('30');
  await expect(dm.page.locator('.dm-prow', { hasText: 'Borin' }).locator('.mc-hp')).toContainText('44');
  // Spieler A sieht Borin nur grob
  await a.page.locator('.tabs [data-a="tab"][data-t="party"]').click();
  const borin = a.page.locator('.mcard', { hasText: 'Borin' });
  await expect(borin).toContainText('Schwer verwundet');
  await expect(borin).not.toContainText('44');
  // Online-Speicherung: Spieler A darf Borins Bogen nicht lesen, die Spielleitung schon
  await expect.poll(() => srv.rows.has(`${ROOM}|char|b1`), { timeout: 20000 }).toBe(true);
  const read = (p, id) => p.evaluate(async ([room, id]) => {
    const secret = JSON.parse(localStorage.getItem('charbogen-cloud-secret'))[room];
    const r = await fetch('https://ovkxoqgqocspwjvxhige.supabase.co/rest/v1/rpc/charbogen_get2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_room: room, p_kind: 'char', p_id: id, p_secret: secret }) });
    return r.json();
  }, [ROOM, id]);
  expect(await read(a.page, 'b1')).toEqual([]);
  expect((await read(a.page, 'a1'))[0].data.name).toBe('Mirelle');
  expect((await read(dm.page, 'b1'))[0].data.name).toBe('Borin');
  // Ein Spieler kann sich nicht als Spielleitung eintragen und den Spielleitungsbereich nicht schreiben
  expect(srv.api.charbogen_claim({ p_room: ROOM, p_secret: 'x'.repeat(48), p_key: { kty: 'EC', x: 'a', y: 'b' } })).toBe(false);
  expect(() => srv.api.charbogen_put2({ p_room: ROOM, p_kind: 'dm', p_id: 'dm', p_name: 'x', p_data: {}, p_base: null, p_secret: 'y'.repeat(48) })).toThrow('not dm');
  for (const d of [dm, a, b]) await d.ctx.close();
});

test('Datenbank ohne D3: bisheriges Verhalten, Spielleitung sieht „nicht aktiv“ @new', async ({ browser }) => {
  const srv = server(); delete srv.api.charbogen_claim; delete srv.api.charbogen_room_key; delete srv.api.charbogen_list2;
  const ch = channel();
  const dm = await device(browser, srv, ch, { 'charbogen-lang': 'de', 'charbogen-dm': { on: true }, 'charbogen-campaigns': [{ id: 'd1', name: 'Grenzland', status: 'active', chars: [], role: 'dm', room: ROOM, split: true }] });
  await dm.page.locator('.hub-side [data-s="gm"]').click();
  await dm.page.locator('.hub-camp [data-a="campplay"]').click();
  const a = await device(browser, srv, ch, pcamp('a1'));
  await a.page.locator('.hub-side [data-s="camps"]').click(); await a.page.locator('.hub-camp [data-a="campplay"]').click();
  await expect.poll(() => ch.presence.get('a1')?.hp).toBe(30);
  await dm.page.locator('.tabs [data-a="tab"][data-t="dmlive"]').click();
  await expect(dm.page.locator('.sec-state.off')).toBeVisible();
  for (const d of [dm, a]) await d.ctx.close();
});
