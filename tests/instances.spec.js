// Schritt 1 der Kampagnenstände: derselbe Charakter hat je Kampagne einen eigenen Stand, Spielleitungsdaten sind je Kampagne
// getrennt, eigene Monster bleiben global. Ältere Kampagnen (ohne split) und alle vorhandenen Daten bleiben unverändert.
import { test, expect, URL_UNDER_TEST, tab } from './helpers.js';

test.use({ hub: true });
const IMG = 'data:image/jpeg;base64,/9j/AAAA';
const lib = { v: 4, id: 'c1', camp: null, name: 'Mirelle', img: IMG, info: 'Priesterin', klass: 'Cleric', level: 3, hp: 20, hpMax: 20, gold: { gp: 10 }, cond: {}, spells: [], tab: 'prof' };
const inst1 = { ...lib, camp: 'k1', img: '', level: 5, hp: 30, hpMax: 40, gold: { gp: 100 }, cond: { Poisoned: true }, spells: [{ n: 'Bless', lvl: 1, ic: 'star', src: 'sum' }], bag: [{ id: 'p1', ref: 'potion:potion-of-healing', n: 'Potion of Healing', ic: 'potion', q: 2, cons: true }] };
const base = {
  'charbogen-v4': lib, 'charbogen-index': [{ id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 3 }],
  'charbogen-campaigns': [
    { id: 'k1', name: 'Alpha', status: 'active', chars: ['c1'], role: 'player', room: 'AAA222', split: true },
    { id: 'k2', name: 'Beta', status: 'active', chars: ['c1'], role: 'player', room: 'BBB333', split: true },
  ],
  'charbogen-inst-k1-c1': inst1,
};
async function start(page, data) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const ls = (page, k) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
async function open(page, name) {
  if (await page.locator('.hub').count() === 0) await page.locator('[data-a="crumbhome"]').click();
  await page.locator('.hub-side [data-s="camps"]').click();
  await page.locator('.hub-camp', { hasText: name }).locator('[data-a="campplay"]').click();
  await page.locator('.crumbs', { hasText: name }).waitFor();
}
/** Nachgebaute Raumverbindung und Online-Speicherung: merkt sich gesendete Presence und gespeicherte Stände je Raum. */
const fakes = page => page.addInitScript(() => {
  window.__sent = []; window.__puts = [];
  window.__liveFake = (code, key, onPeers, onStatus) => { setTimeout(() => onStatus('on'), 0); return { track(p) { window.__sent.push({ code, key, ...p }); onPeers([{ ...p, key }]); }, send() {}, close() {} }; };
  window.__cloudFake = async (url, opts) => {
    // Neue (*2, mit Geheimnis) und alte Funktionen gleich behandeln
    const fn = url.split('/').pop().replace(/2$/, ''), body = JSON.parse(opts.body || '{}');
    if (fn === 'charbogen_put') window.__puts.push({ room: body.p_room, kind: body.p_kind, id: body.p_id, camp: body.p_data?.camp ?? null, level: body.p_data?.level, gp: body.p_data?.gold?.gp, notes: (body.p_data?.notes || []).map(n => n.title) });
    const out = fn === 'charbogen_put' ? new Date().toISOString() : [];
    return { ok: true, status: 200, json: async () => out, text: async () => '' };
  };
});

test.describe('Kampagnenstände @new', () => {
  test('derselbe Charakter: eigene Stufe, TP, Gold, Inventar, Zauber und Zustände je Kampagne; A ändert B nie', async ({ page }) => {
    await start(page, base);
    await open(page, 'Alpha');
    let s = await ls(page, 'charbogen-v4');
    expect(s).toMatchObject({ camp: 'k1', level: 5, hp: 30, gold: { gp: 100 }, cond: { Poisoned: true } });
    expect(s.spells.map(x => x.n)).toContain('Bless');
    await expect(page.locator('.camp-me')).toContainText('30/40');
    // Beta hat noch keinen Stand: er entsteht aus dem Grundbogen
    await open(page, 'Beta');
    s = await ls(page, 'charbogen-v4');
    expect(s).toMatchObject({ camp: 'k2', level: 3, hp: 20, gold: { gp: 10 }, cond: {} });
    expect(s.spells).toHaveLength(0);
    expect(s.bag.filter(Boolean)).toHaveLength(0);
    // In Beta ändern: Gold und Zustand
    await tab(page, 'main');
    await page.locator('[data-a="condopen"]').click();
    await page.locator('[data-a="cond"][data-c="Prone"]').click();
    await page.locator('[data-a="tab"][data-t="party"]').click();
    await page.locator('.camp-mine [data-a="crumb"]').click();
    await page.locator('[data-a="tab"][data-t="inv"]').click();
    await page.locator('[data-a="gold"][data-c="gp"][data-d="1"]').click();
    // Zurück nach Alpha: unverändert
    await open(page, 'Alpha');
    s = await ls(page, 'charbogen-v4');
    expect(s).toMatchObject({ camp: 'k1', level: 5, gold: { gp: 100 }, cond: { Poisoned: true } });
    expect(s.cond.Prone).toBeFalsy();
    expect(await ls(page, 'charbogen-inst-k2-c1')).toMatchObject({ camp: 'k2', gold: { gp: 11 }, cond: { Prone: true }, level: 3 });
    // Grundbogen in der Bibliothek blieb unberührt
    expect(await ls(page, 'charbogen-char-c1')).toMatchObject({ camp: null, level: 3, gold: { gp: 10 }, cond: {} });
  });

  test('Identität (Name, Porträt, Beschreibung) gilt überall, Porträt wird im Kampagnenstand nicht mitgespeichert', async ({ page }) => {
    await start(page, base);
    await open(page, 'Alpha');
    await page.locator('[data-a="tab"][data-t="party"]').click();
    await page.locator('.camp-mine [data-a="crumb"]').click();
    await page.locator('[data-a="tab"][data-t="setup"]').click();
    await page.locator('#f-name').fill('Mirelle die Weise');
    await page.locator('#f-name').blur();
    await expect.poll(async () => (await ls(page, 'charbogen-char-c1')).name).toBe('Mirelle die Weise');
    await open(page, 'Beta');
    await expect(page.locator('.camp-me')).toContainText('Mirelle die Weise');
    expect((await ls(page, 'charbogen-v4')).img).toBe(IMG);
    const k1 = await ls(page, 'charbogen-inst-k1-c1');
    expect(k1).toMatchObject({ name: 'Mirelle die Weise', img: '', level: 5 });
  });

  test('Echtzeit und Online-Speicherung senden den Stand der geöffneten Kampagne in deren Raum', async ({ page }) => {
    await fakes(page);
    await start(page, base);
    await open(page, 'Alpha');
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1))).toMatchObject({ code: 'AAA222', key: 'c1', hp: 30, level: 5 });
    await expect.poll(() => page.evaluate(() => window.__puts.filter(p => p.room === 'AAA222').at(-1)), { timeout: 12000 }).toMatchObject({ kind: 'char', id: 'c1', camp: 'k1', level: 5, gp: 100 });
    await open(page, 'Beta');
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1))).toMatchObject({ code: 'BBB333', key: 'c1', hp: 20, level: 3 });
    await expect.poll(() => page.evaluate(() => window.__puts.filter(p => p.room === 'BBB333').at(-1)), { timeout: 12000 }).toMatchObject({ camp: 'k2', level: 3, gp: 10 });
    // In Alphas Raum ging nie der Stand von Beta
    expect(await page.evaluate(() => window.__puts.filter(p => p.room === 'AAA222').every(p => p.camp === 'k1'))).toBe(true);
  });

  test('Spielleitung: Notizen und Kampf je Kampagne getrennt, eigene Monster überall, alter gemeinsamer Bereich unverändert', async ({ page }) => {
    await fakes(page);
    const legacy = { on: true, only: false, notes: [{ id: 'old', kind: 'npc', title: 'Alte Notiz', body: '' }], custom: [{ id: 'c-m1', n: 'Moorwolf', cr: 1, ac: 13, hp: 22, speed: '', abil: {}, text: '', source: 'own', verified: false, custom: true }] };
    await start(page, { ...base, 'charbogen-dm': legacy, 'charbogen-campaigns': [
      { id: 'd1', name: 'Erste Runde', status: 'active', chars: [], role: 'dm', room: 'DDD444', split: true },
      { id: 'd2', name: 'Zweite Runde', status: 'active', chars: [], role: 'dm', room: 'DDD555', split: true },
      { id: 'd0', name: 'Alte Runde', status: 'active', chars: [], role: 'dm' },
    ] });
    await page.locator('.hub-side [data-s="gm"]').click();
    await page.locator('.hub-camp', { hasText: 'Erste Runde' }).locator('[data-a="campplay"]').click();
    await page.locator('[data-a="tab"][data-t="dmnotes"]').click();
    await expect(page.locator('.wli')).toHaveCount(0);
    await page.locator('[data-a="dmnew"]').click();
    await page.locator('#dm-ntitle').fill('Notiz der ersten Runde');
    await page.locator('#dm-ntitle').blur();
    await page.locator('[data-a="tab"][data-t="dmcombat"]').click();
    await page.locator('#dm-mq').fill('moorwolf');
    await expect(page.locator('#dm-results')).toContainText('Moorwolf');
    await expect.poll(() => page.evaluate(() => window.__puts.filter(p => p.room === 'DDD444' && p.kind === 'dm').at(-1)?.notes), { timeout: 12000 }).toEqual(['Notiz der ersten Runde']);
    // Zweite Runde: leer, Monster trotzdem da
    await page.locator('[data-a="crumbhome"]').click();
    await page.locator('.hub-side [data-s="gm"]').click();
    await page.locator('.hub-camp', { hasText: 'Zweite Runde' }).locator('[data-a="campplay"]').click();
    await page.locator('[data-a="tab"][data-t="dmnotes"]').click();
    await expect(page.locator('.wli')).toHaveCount(0);
    await page.locator('[data-a="tab"][data-t="dmcombat"]').click();
    await page.locator('#dm-mq').fill('moorwolf');
    await expect(page.locator('#dm-results')).toContainText('Moorwolf');
    // Alte Runde (vor der Trennung) zeigt den bisherigen gemeinsamen Bereich
    await page.locator('[data-a="crumbhome"]').click();
    await page.locator('.hub-side [data-s="gm"]').click();
    await page.locator('.hub-camp', { hasText: 'Alte Runde' }).locator('[data-a="campplay"]').click();
    await expect(page.locator('.dlg.mig')).toContainText(/1 (notes|Notizen)/);
    await page.locator('[data-a="miglater"]').click();
    await expect(page.locator('.lb-legacy')).toBeVisible();
    await page.locator('[data-a="tab"][data-t="dmnotes"]').click();
    await expect(page.locator('.wli')).toHaveText([/Alte Notiz/]);
    // Gespeichert: getrennt, Altbestand unverändert
    expect((await ls(page, 'charbogen-dm-camp-d1')).notes.map(n => n.title)).toEqual(['Notiz der ersten Runde']);
    expect((await ls(page, 'charbogen-dm-camp-d2')).notes).toEqual([]);
    expect((await ls(page, 'charbogen-dm')).notes.map(n => n.title)).toEqual(['Alte Notiz']);
    expect((await ls(page, 'charbogen-dm-lib')).custom.map(m => m.n)).toEqual(['Moorwolf']);
  });

  test('ältere Kampagne ohne Trennung nutzt weiter den gemeinsamen Charakter; Sicherung enthält die neuen Stände', async ({ page }) => {
    await start(page, { ...base, 'charbogen-campaigns': [...base['charbogen-campaigns'], { id: 'k0', name: 'Gamma', status: 'active', chars: ['c1'], role: 'player' }] });
    await page.locator('.hub-side [data-s="camps"]').click();
    await page.locator('.hub-camp', { hasText: 'Gamma' }).locator('[data-a="campplay"]').click();
    await page.locator('[data-a="miglater"]').click();
    await page.locator('.crumbs', { hasText: 'Gamma' }).waitFor();
    expect(await ls(page, 'charbogen-v4')).toMatchObject({ camp: null, level: 3 });
    await expect(page.locator('.lb-legacy')).toBeVisible();
    await open(page, 'Alpha');
    await page.locator('[data-a="crumbhome"]').click();
    await page.locator('.hub-side [data-s="settings"]').click();
    const dl = page.waitForEvent('download');
    await page.locator('[data-a="bakdl"]').click();
    const fs = await import('node:fs');
    const b = JSON.parse(fs.readFileSync(await (await dl).path(), 'utf8'));
    expect(Object.keys(b.data)).toEqual(expect.arrayContaining(['charbogen-v4', 'charbogen-char-c1', 'charbogen-campaigns']));
    // Der geladene Kampagnenstand liegt in charbogen-v4 (mit camp), Alphas abgelegter Stand bzw. die Bibliothek in ihren Schlüsseln
    expect(b.data['charbogen-v4'].camp === 'k1' || Object.keys(b.data).includes('charbogen-inst-k1-c1')).toBe(true);
  });
});
