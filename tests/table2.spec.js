// Zustände mit Runden, Charakter-Assistent, Gruppenkasse, Inspiration über den Live-Tisch
import { test, expect, seed, read, act, base4, URL_UNDER_TEST } from './helpers.js';

const fake = () => {
  window.__tracked = []; window.__sent = [];
  window.__liveFake = (code, key, onPeers, onStatus, onMsg) => {
    window.__peers = onPeers; window.__msg = onMsg;
    setTimeout(() => onStatus('on'), 0);
    return { track: p => window.__tracked.push(p), send: m => window.__sent.push(m), close() {} };
  };
};
const peer = (key, name, extra = {}) => ({ key, role: 'player', name, klass: 'Cleric', level: 3, hp: 20, hpMax: 24, tmp: 0, ac: 16, exh: 0, conc: '', cond: [], death: { s: 0, f: 0 }, ...extra });
const dmPeer = (extra = {}) => ({ key: 'dm-x', role: 'dm', ...extra });
const asPlayer = async (page, s = {}) => {
  await seed(page, base4({ tab: 'main', id: 'held1', name: 'Borin', ...s }));
  await page.evaluate(() => localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'player' })));
  await page.reload();
  await expect(page.locator('#live-dock .st-on')).toBeVisible();
};
const asDm = async (page, tab, dm = {}) => {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(([s, d]) => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, ...d })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, [base4({ tab }), dm]);
  await page.reload();
  await page.locator('#app header').waitFor();
  await expect(page.locator('#live-dock .st-on')).toBeVisible();
};
const dmState = page => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')));

test.describe('Zustände mit Runden @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('von Hand: Runden setzen und herunterzählen, bei 0 endet der Zustand', async ({ page }) => {
    await seed(page, base4({ tab: 'main', cond: { Frightened: true } }));
    const plus = page.locator('[data-a="condr"][data-c="Frightened"][data-d="1"]');
    await plus.click(); await plus.click();
    await expect(page.locator('.qty.cr')).toContainText(/2/);
    expect((await read(page)).condR).toEqual({ Frightened: 2 });
    const minus = page.locator('[data-a="condr"][data-c="Frightened"][data-d="-1"]');
    await minus.click(); await minus.click();
    const s = await read(page);
    expect(s.cond.Frightened).toBeFalsy();
    expect(s.condR).toEqual({});
  });

  test('Live: Spielleitung schickt Zustand mit 2 Runden, neue Runden zählen herunter', async ({ page }) => {
    await asPlayer(page);
    await page.evaluate(() => window.__peers([{ key: 'dm-x', role: 'dm', turn: { r: 3, cur: 'x', name: 'Ork' } }]));
    await page.evaluate(() => window.__msg({ id: 'm1', from: 'dm-x', type: 'cond', to: 'held1', cond: 'Frightened', r: 2 }));
    await expect(page.locator('.inbox')).toContainText(/Frightened.*2/);
    await act(page, 'liveyes').click();
    expect((await read(page)).condR).toEqual({ Frightened: 2 });
    await page.evaluate(() => window.__peers([{ key: 'dm-x', role: 'dm', turn: { r: 4, cur: 'x', name: 'Ork' } }]));
    await expect.poll(async () => (await read(page)).condR).toEqual({ Frightened: 1 });
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).cr)).toEqual({ Frightened: 1 });
    await page.evaluate(() => window.__peers([{ key: 'dm-x', role: 'dm', turn: { r: 5, cur: 'x', name: 'Ork' } }]));
    await expect.poll(async () => (await read(page)).cond.Frightened).toBeFalsy();
  });
});

test.describe('Zug im Live-Raum @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });
  test('Spielleitung schaltet auf mich: neuer Zug, Aktionen wieder frei', async ({ page }) => {
    await asPlayer(page, { turn: { on: true, a: 1, aMax: 1, b: 1, r: 1, mv: 6, dash: 0, atk: 0, atkMax: 0, obj: 1, slot: true } });
    await page.evaluate(() => window.__peers([{ key: 'dm-x', role: 'dm', turn: { r: 2, cur: 'held1', name: 'Borin' } }]));
    await expect.poll(async () => (await read(page)).turn).toMatchObject({ on: true, a: 0, b: 0, r: 0, mv: 0, slot: false });
  });
});

test.describe('Inspiration über den Live-Tisch @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('Spielleitung gibt Heroic Inspiration, Spieler nimmt an', async ({ page }) => {
    await asPlayer(page, { insp: false });
    await page.evaluate(() => window.__msg({ id: 'i1', from: 'dm-x', type: 'insp', to: 'held1' }));
    await expect(page.locator('.inbox')).toContainText('Heroic Inspiration');
    await act(page, 'liveyes').click();
    expect((await read(page)).insp).toBe(true);
  });

  test('Spielleitung: Knopf Inspiration schickt zuverlässige Nachricht', async ({ page }) => {
    await asDm(page, 'dmlive', { view: 'live' });
    await page.evaluate(l => window.__peers(l), [peer('held1', 'Mira', { insp: true })]);
    await expect(page.locator('.dm-prow .chip.buff', { hasText: 'Inspiration' })).toBeVisible();
    await page.locator('[data-a="livesend"][data-t="insp"]').click();
    await expect.poll(() => page.evaluate(() => window.__sent.filter(m => m.type === 'insp').length)).toBeGreaterThan(0);
  });

  test('Bardic Inspiration an Mira: Anwendung verbraucht, Mira erhält W8', async ({ page }) => {
    await asPlayer(page, { klass: 'Bard', level: 5, prof: 3, abil: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 16 }, res: [{ n: 'Bardic Inspiration', ic: 'music', max: 3, used: 0, rest: 'short', p: '' }] });
    await page.evaluate(l => window.__peers(l), [peer('held2', 'Mira')]);
    await act(page, 'bigive').click();
    await expect(page.locator('#tg-h')).toContainText('Bardic Inspiration');
    await expect(page.locator('[data-a="tgt"][data-k="held1"]')).toHaveCount(0);
    await page.locator('[data-a="tgt"][data-k="held2"]').click();
    await act(page, 'tgtok').click();
    const s = await read(page);
    expect(s.res[0].used).toBe(1);
    expect(s.buffsOut[0]).toMatchObject({ s: 'Bardic Inspiration', to: ['held2'], v: 8 });
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).buffs.map(b => b.s))).toEqual(['Bardic Inspiration']);
  });

  test('Ziel sieht Bardic Inspiration im Kasten „Wirkt gerade“', async ({ page }) => {
    await asPlayer(page);
    await page.evaluate(l => window.__peers(l), [peer('held2', 'Lia', { klass: 'Bard', buffs: [{ id: 'bi1', s: 'Bardic Inspiration', to: ['held1'], v: 8 }] })]);
    await expect(page.locator('.fx .fxbuff')).toContainText(/1W8|1d8/);
  });
});

test.describe('Gruppenkasse @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('Spieler zahlt ein, Gegenstand wartet bis zur Bestätigung', async ({ page }) => {
    await asPlayer(page, { gold: { pp: 0, gp: 30, ep: 0, sp: 0, cp: 0 }, bag: [{ id: 'r1', n: 'Rope', ic: 'box', p: '', q: 2, cons: true }, ...Array(23).fill(null)] });
    await page.evaluate(() => window.__peers([{ key: 'dm-x', role: 'dm', stash: { g: { pp: 0, gp: 5, ep: 0, sp: 0, cp: 0 }, it: [{ id: 's1', n: 'Lantern', q: 1 }], got: [] } }]));
    await expect(page.locator('.stash')).toContainText('Lantern');
    await page.locator('#st-item').selectOption('0');
    await act(page, 'stdep').click();
    let s = await read(page);
    expect(s.bag[0].q).toBe(1);
    expect(s.stashPend).toHaveLength(1);
    const sent = await page.evaluate(() => window.__sent.filter(m => m.type === 'stash'));
    expect(sent[0]).toMatchObject({ type: 'stash', to: 'dm', n: 'Rope', q: 1 });
    await page.locator('#stc-gp').fill('10');
    await act(page, 'stdepc').click();
    expect((await read(page)).gold.gp).toBe(20);
    // Spielleitung bestätigt die erste Einzahlung
    await page.evaluate(dep => window.__peers([{ key: 'dm-x', role: 'dm', stash: { g: { gp: 5 }, it: [], got: [dep] } }]), sent[0].dep);
    await expect.poll(async () => (await read(page)).stashPend.length).toBe(1);
    // die zweite zurücknehmen
    await act(page, 'stback').click();
    s = await read(page);
    expect(s.gold.gp).toBe(30);
    expect(s.stashPend).toEqual([]);
    await page.locator('[data-a="stwant"]').count();
  });

  test('Spielleitung: Einzahlung kommt an (ohne Doppel), Münzen gerecht aufteilen, Gegenstand geben', async ({ page }) => {
    await asDm(page, 'dmloot', { view: 'loot' });
    await page.evaluate(l => window.__peers(l), [peer('held1', 'Mira'), peer('held2', 'Borin')]);
    const msg = { id: 'x1', from: 'held1', type: 'stash', to: 'dm', dep: 'd1', n: 'Rope', p: '', q: 1 };
    await page.evaluate(m => { window.__msg(m); window.__msg({ ...m, id: 'x2' }); }, msg);
    await page.evaluate(() => window.__msg({ id: 'x3', from: 'held2', type: 'stash', to: 'dm', dep: 'd2', coins: { gp: 25, sp: 3 } }));
    await expect.poll(async () => (await dmState(page)).stash?.items?.length).toBe(1);
    let d = await dmState(page);
    expect(d.stash.items[0]).toMatchObject({ n: 'Rope', q: 1, by: 'Mira' });
    expect(d.stash.gold.gp).toBe(25);
    expect(d.stash.got).toEqual(['d1', 'd2']);
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).stash.got)).toEqual(['d1', 'd2']);
    await act(page, 'stsplit').click();
    const gold = await page.evaluate(() => window.__sent.filter(m => m.type === 'gold'));
    expect(gold.map(m => m.to).sort()).toEqual(['held1', 'held2']);
    expect(gold[0].coins).toMatchObject({ gp: 12, sp: 1 });
    d = await dmState(page);
    expect(d.stash.gold).toMatchObject({ gp: 1, sp: 1 });
    await page.evaluate(() => window.__msg({ id: 'x4', from: 'held2', type: 'want', to: 'dm', iid: 'nope' }));
    const iid = d.stash.items[0].id;
    await page.evaluate(i => window.__msg({ id: 'x5', from: 'held2', type: 'want', to: 'dm', iid: i, name: 'Borin' }), iid);
    await expect(page.locator('b.want')).toContainText('Borin');
    await page.locator('#dm-lto3').selectOption('held2');
    await page.locator('[data-a="stgive"]').first().click();
    const item = await page.evaluate(() => window.__sent.filter(m => m.type === 'item').at(-1));
    expect(item).toMatchObject({ to: 'held2', n: 'Rope', q: 1 });
    expect((await dmState(page)).stash.items).toEqual([]);
  });
});

test.describe('Charakter-Assistent @new', () => {
  test('Klasse, Standardwerte per Vorschlag, Punktekauf, Fertigkeiten, Ausrüstung, Stufe 1', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', klass: '', level: 0 }));
    await act(page, 'wizopen').click();
    await page.locator('#f-klass').selectOption('Fighter');
    await page.locator('[data-a="wizgo"]', { hasText: /Weiter|Next/ }).click();
    await act(page, 'wizsug').click();
    let s = await read(page);
    expect(s.abil).toMatchObject({ str: 15, con: 14, dex: 13, wis: 12, cha: 10, int: 8 });
    await page.locator('[data-a="wizm"][data-m="buy"]').click();
    await expect(page.locator('.wiz')).toContainText(/27/);
    await expect(page.locator('.wiz')).toContainText(/1 (of|von) 27/);
    await page.locator('[data-a="wizb"][data-k="dex"][data-d="-1"]').click();
    await expect(page.locator('.wiz')).toContainText(/3 (of|von) 27/);
    expect((await read(page)).abil.dex).toBe(14);
    await page.locator('.wiz-steps [data-a="wizgo"][data-s="3"]').click();
    await page.locator('[data-a="wizsk"][data-k="Athletics"]').click();
    await page.locator('[data-a="wizsk"][data-k="Perception"]').click();
    await page.locator('[data-a="wizsk"][data-k="Survival"]').click();
    s = await read(page);
    expect(s.classSkills).toEqual(['Athletics', 'Perception']);
    expect(s.skills.Athletics).toBe(1);
    await page.locator('[data-a="wizgo"]', { hasText: /Weiter|Next/ }).click();
    await page.locator('[data-a="wizgear"][data-i="0"]').click();
    s = await read(page);
    expect(s.classGear).toBe(true);
    expect(s.bag.filter(Boolean).map(x => x.ref)).toEqual(expect.arrayContaining(['item:chain-mail', 'item:greatsword']));
    expect(s.gold.gp).toBe(4);
    await page.locator('[data-a="wizgo"]', { hasText: /Weiter|Next/ }).click();
    await act(page, 'wizdone').click();
    await expect(page.locator('[data-a="luapply"]')).toBeVisible();
  });

  test('Standardwerte von Hand: doppelte Werte werden markiert', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', klass: 'Wizard', level: 0 }));
    await act(page, 'wizopen').click();
    await page.locator('.wiz-steps [data-a="wizgo"][data-s="1"]').click();
    await page.locator('#wz-a-int').selectOption('15');
    await page.locator('#wz-a-dex').selectOption('15');
    await expect(page.locator('.note.bad')).toBeVisible();
    expect((await read(page)).abil.int).toBe(15);
  });
});
