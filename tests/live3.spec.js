import { test, expect, seed, read, act, base4, URL_UNDER_TEST } from './helpers.js';

// Ersatz für Supabase: zählt Verbindungen, zeichnet Gesendetes auf, erlaubt Presence, Status und Nachrichten einzuspielen.
const fake = () => {
  window.__tracked = []; window.__sent = []; window.__opens = 0;
  window.__liveFake = (code, key, onPeers, onStatus, onMsg) => {
    window.__opens++;
    window.__peers = onPeers; window.__msg = onMsg; window.__status = onStatus; window.__key = key;
    setTimeout(() => onStatus('on'), 0);
    return { track: p => window.__tracked.push(p), send: m => window.__sent.push(m), close() {} };
  };
};
const peer = (key, name, extra = {}) => ({ key, role: 'player', name, klass: 'Ranger', level: 3, hp: 20, hpMax: 24, tmp: 0, ac: 15, exh: 0, conc: '', cond: [], death: { s: 0, f: 0 }, ...extra });
const asPlayer = async (page, s = {}) => {
  await seed(page, base4({ tab: 'main', id: 'held1', name: 'Mira', ...s }));
  await page.evaluate(() => localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'player' })));
  await page.reload();
  await expect(page.locator('#live-dock .st-on')).toBeVisible();
};
const asDm = async (page, combat = { round: 1, active: null, list: [] }) => {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(([s, c]) => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'combat', combat: c })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, [base4({ tab: 'dmcombat' }), combat]);
  await page.reload();
  await page.locator('#app header').waitFor();
  await expect(page.locator('#live-dock .st-on')).toBeVisible();
};
const dmState = page => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')));

test.describe('Live zuverlässig @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('Spieler bestätigt jede Nachricht, Doppelte landen nur einmal im Posteingang, Posteingang übersteht Neuladen', async ({ page }) => {
    await asPlayer(page);
    const m = { id: 'm1', type: 'dmg', to: 'held1', from: 'dm-x', value: 5 };
    await page.evaluate(x => { window.__msg(x); window.__msg(x); }, m);
    await expect(page.locator('#live-dock .inbox .row')).toHaveCount(1);
    await expect(page.locator('#toast')).toContainText('5');
    const rcv = await page.evaluate(() => window.__sent.filter(x => x.type === 'rcv'));
    expect(rcv).toHaveLength(2);
    expect(rcv[0]).toMatchObject({ to: 'dm', ref: 'm1', from: 'held1' });
    await page.reload();
    await expect(page.locator('#live-dock .inbox .row')).toHaveCount(1);
    // Nach dem Neuladen schickt die Spielleitung dieselbe Nachricht erneut: kein zweiter Eintrag
    await page.evaluate(x => window.__msg(x), m);
    await expect(page.locator('#live-dock .inbox .row')).toHaveCount(1);
    await act(page, 'liveyes').click();
    expect((await read(page)).hp).toBe(15);
  });

  test('Leiste wird auch beim Tippen aktualisiert', async ({ page }) => {
    await asPlayer(page, { tab: 'notes' });
    const ta = page.locator('textarea').first();
    await ta.click();
    await page.evaluate(() => window.__msg({ id: 'm2', type: 'heal', to: 'held1', from: 'dm-x', value: 3 }));
    await expect(page.locator('#live-dock .inbox .row')).toHaveCount(1);
    await expect(ta).toBeFocused();
  });

  test('Abbruch: Ampel rot, nach kurzer Zeit neue Verbindung', async ({ page }) => {
    await asPlayer(page);
    const before = await page.evaluate(() => window.__opens);
    await page.evaluate(() => window.__status('error'));
    await expect(page.locator('#live-dock .st-error')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__opens), { timeout: 8000 }).toBe(before + 1);
    await expect(page.locator('#live-dock .st-on')).toBeVisible();
  });

  test('Zustand entfernen und Schaden am Begleiter', async ({ page }) => {
    await asPlayer(page, { cond: { Prone: true }, pets: [{ id: 'p1', n: 'Wolf', ac: 13, hp: 11, hpMax: 11, speed: '', text: '', source: 'srd', bm: false }] });
    await page.evaluate(() => { window.__msg({ id: 'c1', type: 'cond', to: 'held1', from: 'dm-x', cond: 'Prone', off: true }); window.__msg({ id: 'c2', type: 'dmg', to: 'held1', from: 'dm-x', value: 4, pet: 'p1' }); });
    await expect(page.locator('#live-dock .inbox')).toContainText('Wolf');
    await act(page, 'liveyes').first().click();
    await act(page, 'liveyes').first().click();
    const s = await read(page);
    expect(s.cond.Prone).toBeFalsy();
    expect(s.pets[0].hp).toBe(7);
    expect(s.hp).toBe(s.hpMax);
  });

  test('Begleiter gehen in der Presence mit', async ({ page }) => {
    await asPlayer(page, { pets: [{ id: 'p1', n: 'Wolf', ac: 13, hp: 11, hpMax: 11, speed: '', text: '', source: 'srd', bm: false }] });
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1)?.pets)).toEqual([{ id: 'p1', n: 'Wolf', hp: 11, hpMax: 11, ac: 13 }]);
  });
});

test.describe('Kampf-Tracker mit verbundenen Spielern @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('Spieler einzeln hinzufügen, Begleiter direkt darunter, beim Weiterschalten übersprungen', async ({ page }) => {
    await asDm(page, { round: 1, active: null, list: [{ id: 'g1', kind: 'mon', mon: 'goblin-warrior', name: 'Goblin', init: 10, hp: 10, hpMax: 10, ac: 15, cond: {} }] });
    await page.evaluate(l => window.__peers(l), [peer('held1', 'Mira', { pets: [{ id: 'p1', n: 'Wolf', hp: 11, hpMax: 11, ac: 13 }], conc: 'Hunter\'s Mark' }), peer('held2', 'Borin')]);
    await act(page, 'liveadd1', '[data-k="held1"]').first().click();
    let d = await dmState(page);
    expect(d.combat.list.map(c => c.name)).toEqual(['Goblin', 'Mira', 'Wolf']);
    expect(d.combat.list[2]).toMatchObject({ kind: 'pet', live: 'held1', pet: 'p1' });
    await expect(page.locator('.dm-row.pet')).toContainText('Wolf');
    await expect(page.locator('.dm-row.live').first()).toContainText("Hunter's Mark");
    // Mira vor den Goblin setzen: Wolf bleibt unter ihr
    await page.locator('.dm-row:not(.pet) .dm-init').first().fill('15');
    await page.locator('.dm-row:not(.pet) .dm-init').first().press('Tab');
    await expect(page.locator('.dm-row b').first()).toHaveText(/Mira|Goblin/);
    await act(page, 'dmstep', '[data-d="1"]').click();
    await act(page, 'dmstep', '[data-d="1"]').click();
    d = await dmState(page);
    const act1 = d.combat.list.find(c => c.id === d.combat.active);
    expect(act1.kind).not.toBe('pet');
  });

  test('Schaden an einem verbundenen Spieler geht als Vorschlag, wird wiederholt bis zur Bestätigung', async ({ page }) => {
    await asDm(page, { round: 1, active: null, list: [{ id: 'c1', kind: 'pc', live: 'held1', name: 'Mira', init: 12, hp: 20, hpMax: 24, ac: 15, cond: {} }] });
    await page.evaluate(l => window.__peers(l), [peer('held1', 'Mira')]);
    await page.locator('#dm-amt-c1').fill('6');
    await act(page, 'dmhp', '[data-id="c1"][data-d="-1"]').click();
    const sent = await page.evaluate(() => window.__sent.filter(m => m.type === 'dmg'));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'held1', value: 6 });
    // Lokal ändert sich nichts, bis der Spieler annimmt
    expect((await dmState(page)).combat.list[0].hp).toBe(20);
    await expect(page.locator('.dm-wait')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__sent.filter(m => m.type === 'dmg').length), { timeout: 10000 }).toBeGreaterThan(1);
    const id = sent[0].id;
    await page.evaluate(ref => window.__msg({ id: 'r1', type: 'rcv', to: 'dm', from: 'held1', ref }), id);
    await expect(page.locator('.dm-wait')).toHaveCount(0);
    const n = await page.evaluate(() => window.__sent.filter(m => m.type === 'dmg').length);
    await page.waitForTimeout(4500);
    expect(await page.evaluate(() => window.__sent.filter(m => m.type === 'dmg').length)).toBe(n);
  });

  test('Zustand an einem verbundenen Spieler: an/aus als Vorschlag', async ({ page }) => {
    await asDm(page, { round: 1, active: null, list: [{ id: 'c1', kind: 'pc', live: 'held1', name: 'Mira', init: 12, hp: 20, hpMax: 24, ac: 15, cond: { Prone: true } }] });
    await page.evaluate(l => window.__peers(l), [peer('held1', 'Mira', { cond: ['Prone'] })]);
    await act(page, 'dmopen', '[data-id="c1"]').click();
    await act(page, 'dmcond', '[data-id="c1"][data-c="Prone"]').click();
    await act(page, 'dmcond', '[data-id="c1"][data-c="Blinded"]').click();
    const conds = await page.evaluate(() => window.__sent.filter(m => m.type === 'cond').map(m => [m.cond, m.off]));
    expect(conds).toEqual([['Prone', true], ['Blinded', false]]);
  });
});
