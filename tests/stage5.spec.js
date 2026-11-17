// Stufe 5: Atlas (Freigabe nur mit Spielertext), Händler (Kauf über die Verbindung), Chronik als Kampagnenbuch
import { test, expect, URL_UNDER_TEST } from './helpers.js';

test.use({ hub: true });
const lib = { v: 4, id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 3, gold: { gp: 60 }, tab: 'prof' };
async function start(page, data) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const ls = (page, k) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
/** Nachgebaute Verbindung: Presence und gesendete Nachrichten werden aufgezeichnet; optional eine Spielleitung im Raum. */
const fake = (page, dm) => page.addInitScript(d => {
  window.__sent = []; window.__msgs = [];
  window.__liveFake = (code, key, onPeers, onStatus, onMsg) => { window.__onMsg = onMsg; setTimeout(() => onStatus('on'), 0); return { track(p) { window.__sent.push(p); onPeers([...(d ? [d] : []), { ...p, key }]); }, send(m) { window.__msgs.push(m); }, close() {} }; };
}, dm || null);
const dmCamp = { id: 'd1', name: 'Runde', status: 'active', chars: [], role: 'dm', room: 'DDD444', split: true };
const openDm = async page => { await page.locator('.hub-side [data-s="gm"]').click(); await page.locator('.hub-camp [data-a="campplay"]').click(); };

test.describe('Stufe 5 @new', () => {
  test('Atlas: Notiz bleibt privat, Spieler bekommen nur Titel und Spielertext', async ({ page }) => {
    await fake(page);
    await start(page, { 'charbogen-v4': lib, 'charbogen-dm': { on: true }, 'charbogen-campaigns': [dmCamp], 'charbogen-dm-camp-d1': { notes: [{ id: 'p1', kind: 'place', title: 'Grenzhall', body: 'Geheim: Der Vogt ist bestochen.' }] } });
    await openDm(page);
    await page.locator('[data-a="tab"][data-t="explore"]').click();
    await expect(page.locator('.atlas-r')).toContainText('Geheim');
    await page.locator('[data-a="atpub"]').check();
    await page.locator('#at-pub').fill('Ummauerte Oberstadt mit Bergfried.');
    await page.locator('#at-pub').blur();
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1)?.atlas)).toEqual([{ t: 'Grenzhall', d: 'Ummauerte Oberstadt mit Bergfried.', k: 'place', h: false }]);
    expect(JSON.stringify(await page.evaluate(() => window.__sent))).not.toContain('bestochen');
  });

  test('Atlas beim Spieler: freigegebene Orte sichtbar und dauerhaft gespeichert', async ({ page }) => {
    await fake(page, { key: 'dm-x', role: 'dm', here: 'Grenzhall', atlas: [{ t: 'Grenzhall', d: 'Ummauerte Oberstadt.', k: 'place', h: true }, { t: 'Vogt Harald', d: 'Wirkt nervös.', k: 'npc', h: false }] });
    await start(page, { 'charbogen-v4': lib, 'charbogen-campaigns': [{ id: 'k1', name: 'Runde', status: 'active', chars: ['c1'], role: 'player', room: 'DDD444', split: true }] });
    await page.locator('.hub-side [data-s="camps"]').click();
    await page.locator('.hub-camp [data-a="campplay"]').click();
    await page.locator('[data-a="tab"][data-t="explore"]').click();
    await expect(page.locator('.atlas-r')).toContainText('Ummauerte Oberstadt.');
    await page.locator('.atlas-l .ilr', { hasText: 'Vogt Harald' }).click();
    await expect(page.locator('.atlas-r')).toContainText('Wirkt nervös.');
    await expect.poll(async () => (await ls(page, 'charbogen-campaigns'))[0].atlas.length).toBe(2);
  });

  test('Händler: Spielleitung legt an und öffnet; Verkauf senkt den Bestand', async ({ page }) => {
    await fake(page);
    await start(page, { 'charbogen-v4': lib, 'charbogen-dm': { on: true }, 'charbogen-campaigns': [dmCamp] });
    await openDm(page);
    await page.locator('[data-a="tab"][data-t="dmloot"]').click();
    await page.locator('#mer-new').fill('Alchemist Varo');
    await page.locator('[data-a="mernew"]').click();
    const id = (await ls(page, 'charbogen-dm-camp-d1')).merchants[0].id;
    await page.locator(`#mer-add-${id}`).selectOption('potion:potion-of-healing');
    await page.locator(`#mer-q-${id}`).fill('3');
    await page.locator(`[data-a="meradd"][data-id="${id}"]`).click();
    await page.locator(`[data-a="mertg"][data-id="${id}"]`).click();
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1)?.shop?.[0]?.it?.[0])).toMatchObject({ k: 'potion:potion-of-healing', cp: 5000, q: 3 });
    const wid = (await ls(page, 'charbogen-dm-camp-d1')).merchants[0].items[0].id;
    await page.evaluate(([m, w]) => window.__onMsg({ id: 'b1', type: 'buy', from: 'p-1', to: 'dm', m, i: w, name: 'Lea' }), [id, wid]);
    await expect.poll(async () => (await ls(page, 'charbogen-dm-camp-d1')).merchants[0].items[0].q).toBe(2);
    await expect(page.locator('.lb-list')).toContainText('Lea');
  });

  test('Händler beim Spieler: Kaufen zieht Gold ab, legt die Ware in den Rucksack, meldet den Kauf', async ({ page }) => {
    await fake(page, { key: 'dm-x', role: 'dm', shop: [{ id: 'm1', n: 'Alchemist Varo', it: [{ id: 'w1', k: 'potion:potion-of-healing', n: 'Potion of Healing', cp: 5000, q: 2 }, { id: 'w2', k: '', n: 'Seltener Trank', cp: 900000, q: 1 }] }] });
    await start(page, { 'charbogen-v4': lib, 'charbogen-campaigns': [{ id: 'k1', name: 'Runde', status: 'active', chars: ['c1'], role: 'player', room: 'DDD444', split: true }] });
    await page.locator('.hub-side [data-s="camps"]').click();
    await page.locator('.hub-camp [data-a="campplay"]').click();
    await page.locator('[data-a="tab"][data-t="trade"]').click();
    await expect(page.locator('[data-a="shopbuy"][data-w="w2"]')).toBeDisabled();
    await page.locator('[data-a="shopbuy"][data-w="w1"]').click();
    const s = await ls(page, 'charbogen-v4');
    expect(s.gold.gp).toBe(10);
    expect(s.bag.filter(Boolean).map(x => x.ref)).toContain('potion:potion-of-healing');
    expect(await page.evaluate(() => window.__msgs.filter(m => m.type === 'buy'))).toMatchObject([{ m: 'm1', i: 'w1', name: 'Mirelle' }]);
  });

  test('Chronik: Spieler-Eintrag mit wichtigem Ereignis und Aufgabe; Kampagnenbuch der Spielleitung privat', async ({ page }) => {
    await start(page, { 'charbogen-v4': lib, 'charbogen-dm': { on: true }, 'charbogen-campaigns': [{ id: 'k1', name: 'Runde', status: 'active', chars: ['c1'], role: 'player', split: true }, { ...dmCamp, name: 'Leitrunde', room: '' }],
      'charbogen-dm-camp-d1': { notes: [{ id: 's1', kind: 'session', title: 'Sitzung 1', body: '! Die Brücke fällt\n[ ] Boten finden' }] } });
    await page.locator('.hub-side [data-s="camps"]').click();
    await page.locator('.hub-camp', { hasText: 'Runde' }).first().locator('[data-a="campplay"]').click();
    await page.locator('[data-a="tab"][data-t="chron"]').click();
    await page.locator('#chr-t').fill('Sitzung 2');
    await page.locator('#chr-x').fill('Ankunft in Grenzhall\n! Der Vogt verweigert Hilfe\n[ ] Schmied fragen');
    await page.locator('[data-a="chronadd"]').click();
    await expect(page.locator('.chron-e h3')).toHaveText(['Sitzung 2']);
    await expect(page.locator('.chron-hl')).toHaveText('Der Vogt verweigert Hilfe');
    await expect(page.locator('.chron-task')).toContainText('Schmied fragen');
    expect((await ls(page, 'charbogen-campaigns'))[0].log).toBe('## Sitzung 2\nAnkunft in Grenzhall\n! Der Vogt verweigert Hilfe\n[ ] Schmied fragen');
    // Spielleitung: Kampagnenbuch zeigt Sitzungen als Zeitleiste, privat markiert
    await page.locator('[data-a="crumbhome"]').click();
    await openDm(page);
    await page.locator('[data-a="tab"][data-t="dmnotes"]').click();
    await page.locator('[data-a="chronv"][data-k="book"]').click();
    await expect(page.locator('.book .bk-page h3')).toHaveText('Sitzung 1');
    await expect(page.locator('.book .chron-hl')).toHaveText('Die Brücke fällt');
    await expect(page.locator('.book .bk-priv')).toHaveText(/privat|private/);
  });
});
