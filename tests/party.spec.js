import { test, expect, seed, read, act, base4, rest, URL_UNDER_TEST } from './helpers.js';

const fake = () => {
  window.__tracked = []; window.__sent = [];
  window.__liveFake = (code, key, onPeers, onStatus, onMsg) => {
    window.__peers = onPeers; window.__msg = onMsg;
    setTimeout(() => onStatus('on'), 0);
    return { track: p => window.__tracked.push(p), send: m => window.__sent.push(m), close() {} };
  };
};
const peer = (key, name, extra = {}) => ({ key, role: 'player', name, klass: 'Cleric', level: 3, hp: 20, hpMax: 24, tmp: 0, ac: 16, exh: 0, conc: '', cond: [], death: { s: 0, f: 0 }, ...extra });
const slots = n => Array.from({ length: 9 }, (_, i) => ({ max: i < 3 ? n : 0, used: 0 }));
const sp = (n, lvl) => ({ n, lvl, conc: n !== 'Aid', src: 'sum' });
const asPlayer = async (page, s = {}) => {
  await seed(page, base4({ tab: 'main', id: 'held1', name: 'Borin', ac: 14, acMode: 'manual', klass: 'Cleric', level: 5, prof: 3, slots: slots(3), ...s }));
  await page.evaluate(() => localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'player' })));
  await page.reload();
  await expect(page.locator('#live-dock .st-on')).toBeVisible();
};
const castIt = async page => { await act(page, 'cast').click(); const p = page.locator('[data-a="castslot"]'); if (await p.count()) await p.first().click(); };
const acBox = page => page.locator('.stats .st').filter({ hasText: /Armor Class|Rüstungsklasse/ }).locator('b');

test.describe('Wirkungen auf Mitspieler @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('Shield of Faith auf mich: RK +2 grün mit Herkunft, endet mit der Konzentration', async ({ page }) => {
    await seed(page, base4({ tab: 'main', ac: 14, acMode: 'manual', slots: slots(2), spells: [sp('Shield of Faith', 1)] }));
    await castIt(page);
    await expect(page.locator('#tg-h')).toContainText('Shield of Faith');
    await act(page, 'tgt').first().click();
    await act(page, 'tgtok').click();
    await expect(acBox(page)).toHaveText('16');
    await expect(acBox(page).locator('.buff')).toHaveAttribute('title', /Shield of Faith/);
    expect((await read(page)).ac).toBe(14);
    await act(page, 'concend').click();
    await expect(acBox(page)).toHaveText('14');
    expect((await read(page)).buffs).toEqual([]);
  });

  test('ohne Ziel: Platz verbraucht, keine Wirkung', async ({ page }) => {
    await seed(page, base4({ tab: 'main', slots: slots(2), spells: [sp('Bless', 1)] }));
    await castIt(page);
    await act(page, 'tgtskip').click();
    const s = await read(page);
    expect(s.slots[0].used).toBe(1);
    expect(s.buffsOut || []).toEqual([]);
  });

  test('Bless von Mira kommt an, verschwindet, wenn Mira es nicht mehr meldet', async ({ page }) => {
    await asPlayer(page);
    const mira = peer('held2', 'Mira', { conc: 'Bless', buffs: [{ id: 'b1', s: 'Bless', to: ['held1', 'held3'], v: 0 }] });
    await page.evaluate(l => window.__peers(l), [mira]);
    await expect(page.locator('.fx .fxbuff')).toContainText(/Bless (from|von) Mira/);
    await expect(page.locator('.fx .fxbuff')).toContainText(/1W4|1d4/);
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).fx)).toEqual([{ s: 'Bless', by: 'Mira', good: true }]);
    await page.evaluate(l => window.__peers(l), [{ ...mira, conc: '', buffs: [] }]);
    await expect(page.locator('.fx .fxbuff')).toHaveCount(0);
  });

  test('Mira offline: Wirkung bleibt, lässt sich von Hand entfernen und kommt nicht wieder', async ({ page }) => {
    await asPlayer(page);
    const mira = peer('held2', 'Mira', { buffs: [{ id: 'b2', s: 'Shield of Faith', to: ['held1'], v: 0 }] });
    await page.evaluate(l => window.__peers(l), [mira]);
    await expect(acBox(page)).toHaveText('16');
    await page.evaluate(() => window.__peers([]));
    await expect(acBox(page)).toHaveText('16');
    await act(page, 'buffrm').click();
    await expect(acBox(page)).toHaveText('14');
    await page.evaluate(l => window.__peers(l), [mira]);
    await expect(acBox(page)).toHaveText('14');
  });

  test('Aid erhöht TP-Maximum und TP, lange Rast nimmt es zurück', async ({ page }) => {
    await asPlayer(page, { hp: 20, hpMax: 30 });
    await page.evaluate(l => window.__peers(l), [peer('held2', 'Mira', { buffs: [{ id: 'a1', s: 'Aid', to: ['held1'], v: 5 }] })]);
    await expect.poll(async () => (await read(page)).hpMax).toBe(35);
    expect((await read(page)).hp).toBe(25);
    await rest(page, 'long');
    const s = await read(page);
    expect(s.hpMax).toBe(30);
    expect(s.hp).toBe(30);
  });

  test('Haste auf mich: Tempo verdoppelt, RK +2', async ({ page }) => {
    await seed(page, base4({ tab: 'main', ac: 15, acMode: 'manual', speed: 9, slots: slots(2), spells: [sp('Haste', 3)] }));
    await castIt(page);
    await act(page, 'tgt').first().click();
    await act(page, 'tgtok').click();
    await expect(acBox(page)).toHaveText('17');
    await expect(page.locator('.stats .st').filter({ hasText: /Speed|Tempo/ }).locator('b')).toContainText(/18|60/);
  });

  test('Bless auf zwei Mitspieler: Presence meldet Ziele, höchstens 3', async ({ page }) => {
    await asPlayer(page, { spells: [sp('Bless', 1)] });
    await page.evaluate(l => window.__peers(l), [peer('held2', 'Mira'), peer('held3', 'Kael'), peer('held4', 'Ilsa')]);
    await castIt(page);
    await act(page, 'tgt', '[data-k="held2"]').click();
    await act(page, 'tgt', '[data-k="held3"]').click();
    await act(page, 'tgt', '[data-k="held4"]').click();
    await act(page, 'tgt', '[data-k="held1"]').click();
    await expect(page.locator('#toast')).toContainText('3');
    await act(page, 'tgtok').click();
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).buffs)).toEqual([expect.objectContaining({ s: 'Bless', to: ['held2', 'held3', 'held4'] })]);
    await act(page, 'concend').click();
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).buffs)).toEqual([]);
  });

  test('Gruppenansicht: Mitspieler mit TP, grüner RK, Konzentration, bewusstlos mit Todesrettungswürfen', async ({ page }) => {
    await asPlayer(page);
    await page.evaluate(l => window.__peers(l), [peer('held2', 'Mira', { ac: 18, acB: 2, fx: [{ s: 'Shield of Faith', by: 'Borin', good: true }], conc: 'Hunter\'s Mark' }), peer('held3', 'Kael', { hp: 0, death: { s: 1, f: 2 } })]);
    const party = page.locator('.party');
    await expect(party.locator('.prow')).toHaveCount(2);
    await expect(party.locator('.prow').first().locator('.buff').first()).toHaveText('18');
    await expect(party).toContainText("Hunter's Mark");
    await expect(party.locator('.prow.down')).toContainText('2');
    await act(page, 'dockparty').click();
    await expect(page.locator('#live-dock .prow')).toHaveCount(2);
  });
});

test.describe('Spielleitung sieht Wirkungen und Bögen @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('Kampf-Tracker zeigt RK grün und die Wirkung; Bogen ansehen liest den Online-Stand', async ({ page }) => {
    const sheet = base4({ id: 'held2', name: 'Mira', klass: 'Ranger', level: 3, abil: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8 }, spells: [{ n: "Hunter's Mark", lvl: 1 }], skills: { Stealth: 2 } });
    await page.route('**/rest/v1/rpc/*', route => {
      const fn = route.request().url().split('/').pop().replace(/2$/, '');
      const body = fn === 'charbogen_get' ? [{ data: sheet, updated_at: '2026-11-16T08:00:00Z' }] : fn === 'charbogen_list' ? [] : '2026-11-16T08:00:00Z';
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(URL_UNDER_TEST);
    const combat = { round: 1, active: null, list: [{ id: 'c1', kind: 'pc', live: 'held2', name: 'Mira', init: 12, hp: 20, hpMax: 24, ac: 18, cond: {} }] };
    await page.evaluate(c => { localStorage.setItem('charbogen-v4', JSON.stringify({ v: 4, tab: 'dmcombat' })); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'combat', combat: c })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, combat);
    await page.reload();
    await page.evaluate(l => window.__peers(l), [peer('held2', 'Mira', { ac: 18, acB: 2, fx: [{ s: 'Shield of Faith', by: 'Borin', good: true }] })]);
    await expect(page.locator('.dm-row.live .buff').first()).toHaveText('18');
    await expect(page.locator('.dm-row.live')).toContainText('Shield of Faith');
    await act(page, 'dmopen', '[data-id="c1"]').click();
    await act(page, 'peek').click();
    await expect(page.locator('.dlg.peek')).toContainText("Hunter's Mark");
    await expect(page.locator('.dlg.peek')).toContainText('Stealth (E)');
    await expect(page.locator('.dlg.peek .pk-abil')).toContainText('+3');
    await act(page, 'peekclose').click();
    await expect(page.locator('.dlg.peek')).toHaveCount(0);
  });
});

test.describe('Lücken aus Etappe 4 @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('Bane von der Spielleitung: −1W4 an Rettungswürfen und Angriffen, Herkunft Spielleitung', async ({ page }) => {
    await asPlayer(page);
    await page.evaluate(l => window.__peers(l), [{ key: 'dm-x', role: 'dm', name: '', cond: [], death: { s: 0, f: 0 }, buffs: [{ id: 'd1', s: 'Bane', to: ['held1'], v: 0 }] }]);
    await expect(page.locator('.fx .fxbuff')).toContainText(/Bane (from|von) (DM|Spielleitung)/);
    await expect(page.locator('.sv .d4.debuff')).toHaveCount(6);
    await expect(page.locator('.atk .d4.debuff').first()).toHaveText(/−1d4|−1W4/);
  });

  test('Heroism: temporäre TP, sobald der eigene Zug angezeigt wird', async ({ page }) => {
    await asPlayer(page);
    await page.evaluate(l => window.__peers(l), [peer('held2', 'Mira', { buffs: [{ id: 'h1', s: 'Heroism', to: ['held1'], v: 3 }] })]);
    await expect(page.locator('.fx .fxbuff')).toContainText('Heroism');
    await page.evaluate(l => window.__peers(l), [peer('held2', 'Mira', { buffs: [{ id: 'h1', s: 'Heroism', to: ['held1'], v: 3 }] }), { key: 'dm-x', role: 'dm', name: '', cond: [], death: { s: 0, f: 0 }, turn: { r: 1, cur: 'held1', name: 'Borin', enemy: false, next: '', nextEnemy: false } }]);
    await expect.poll(async () => (await read(page)).tmp).toBe(3);
  });

  test('Spielleitung legt eine Wirkung auf einen Spieler und nimmt sie wieder weg', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(() => { localStorage.setItem('charbogen-v4', JSON.stringify({ v: 4, tab: 'dmlive' })); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'live' })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); });
    await page.reload();
    // Erst bedienen, wenn die Anfragen nach dem Verbinden (Online-Übersicht) beantwortet sind; sonst setzt das
    // anschließende Neuzeichnen die Auswahl zurück
    await page.waitForLoadState('networkidle');
    await page.evaluate(l => window.__peers(l), [peer('held2', 'Mira')]);
    await page.locator('#lv-b-held2').selectOption('Bane');
    await act(page, 'dmbuff').click();
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).buffs)).toEqual([expect.objectContaining({ s: 'Bane', to: ['held2'] })]);
    await act(page, 'dmbuffrm').click();
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).buffs)).toEqual([]);
  });
});
