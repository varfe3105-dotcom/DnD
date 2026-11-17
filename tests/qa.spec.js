// Prüfung 17.11.2026: Regressionen der gefundenen Fehler und vollständige Trennung der Kampagnenstände
import { test, expect, URL_UNDER_TEST } from './helpers.js';
import fs from 'node:fs';

test.use({ hub: true });
const lib = { v: 4, id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 3, xp: 900, hp: 20, hpMax: 20, tab: 'prof', abil: { str: 10, dex: 12, con: 14, int: 10, wis: 16, cha: 10 }, res: [{ n: 'Channel Divinity', ic: 'star', max: 2, used: 0, rest: 'short', p: '' }], pets: [] };
const inst = { ...lib, camp: 'k1', level: 7, xp: 23000, hp: 44, hpMax: 50, abil: { ...lib.abil, wis: 20 }, res: [{ n: 'Channel Divinity', ic: 'star', max: 3, used: 2, rest: 'short', p: '' }], pets: [{ id: 'w', n: 'Wolf', hp: 11, hpMax: 11, ac: 13, p: '' }] };
const base = { 'charbogen-v4': lib, 'charbogen-index': [{ id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 3 }], 'charbogen-inst-k1-c1': inst,
  'charbogen-campaigns': [{ id: 'k1', name: 'Alpha', status: 'active', chars: ['c1'], role: 'player', room: 'AAA222', split: true }, { id: 'k2', name: 'Beta', status: 'active', chars: ['c1'], role: 'player', room: 'BBB333', split: true }] };
async function start(page, d = base) {
  await page.addInitScript(() => { window.__open = ''; window.__liveFake = (code, key, onPeers, onStatus) => { window.__open = code; setTimeout(() => onStatus('on'), 0); return { track(x) { onPeers([{ ...x, key }]); }, send() {}, close() { window.__open = ''; } }; }; });
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(x => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(x)) localStorage.setItem(k, JSON.stringify(v)); }, d);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const ls = (page, k) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
const openCamp = async (page, n) => { if (!(await page.locator('.hub').count())) await page.locator('[data-a="crumbhome"]').click(); await page.locator('.hub-side [data-s="camps"]').click(); await page.locator('.hub-camp', { hasText: n }).locator('[data-a="campplay"]').click(); await page.locator('.crumbs', { hasText: n }).waitFor(); };
const toChar = async page => { await page.locator('[data-a="tab"][data-t="party"]').click(); await page.locator('.camp-mine [data-a="crumb"]').click(); };

test.describe('Prüfung: Trennung und Fehlerkorrekturen @new', () => {
  test('XP, Attribute, Ressourcen und Begleiter bleiben je Kampagne getrennt', async ({ page }) => {
    await start(page);
    await openCamp(page, 'Beta');
    await toChar(page);
    await page.locator('[data-a="tab"][data-t="setup"]').click();
    await page.locator('#f-xp').fill('1500');
    await page.locator('#f-xp').blur();
    await page.locator('#f-abil-str').fill('15');
    await page.locator('#f-abil-str').blur();
    await expect.poll(async () => (await ls(page, 'charbogen-v4')).abil.str).toBe(15);
    await openCamp(page, 'Alpha');
    const a = await ls(page, 'charbogen-v4');
    expect(a).toMatchObject({ camp: 'k1', xp: 23000, abil: { str: 10, wis: 20 } });
    expect(a.res[0]).toMatchObject({ max: 3, used: 2 });
    expect(a.pets.map(x => x.n)).toEqual(['Wolf']);
    const b = await ls(page, 'charbogen-inst-k2-c1');
    expect(b).toMatchObject({ xp: 1500, abil: { str: 15, wis: 16 } });
    expect(b.pets).toEqual([]);
    expect(await ls(page, 'charbogen-char-c1')).toMatchObject({ xp: 900, abil: { str: 10 } });
  });

  test('Grundbogen öffnen verlässt den Raum der Kampagne und lädt wirklich den Grundbogen', async ({ page }) => {
    await start(page);
    await openCamp(page, 'Alpha');
    await expect.poll(() => page.evaluate(() => window.__open)).toBe('AAA222');
    await page.locator('[data-a="crumbhome"]').click();
    await page.locator('.hub-side [data-s="chars"]').click();
    await page.locator('.hub-char [data-a="hubplay"][data-lib="1"]').click();
    expect(await page.evaluate(() => window.__open)).toBe('');
    expect(await ls(page, 'charbogen-v4')).toMatchObject({ camp: null, level: 3 });
    await expect(page.locator('.lib-banner')).toBeVisible();
  });

  test('in der Kampagne: kein Charakterwechsel im Kopf, Einrichten ohne Charakterliste und Raumbeitritt', async ({ page }) => {
    await start(page, { ...base, 'charbogen-index': [...base['charbogen-index'], { id: 'c2', name: 'Borin' }], 'charbogen-char-c2': { v: 4, id: 'c2', name: 'Borin' } });
    await openCamp(page, 'Alpha');
    await toChar(page);
    await expect(page.locator('#char-switch')).toHaveCount(0);
    await page.locator('[data-a="tab"][data-t="setup"]').click();
    await expect(page.locator('#live-code, [data-a="charsw"], [data-a="charnew"]')).toHaveCount(0);
  });

  test('Kampagne löschen, während ihr Stand geladen ist: Grundbogen wird geladen, der Stand bleibt gespeichert', async ({ page }) => {
    await start(page);
    await openCamp(page, 'Alpha');
    await page.locator('[data-a="crumbhome"]').click();
    await page.locator('.hub-side [data-s="camps"]').click();
    await page.locator('.hub-camp', { hasText: 'Alpha' }).locator('[data-a="campedit"]').click();
    await page.locator('[data-a="campdel"]').click();
    await page.locator('[data-a="campdel"]').click();
    expect(await ls(page, 'charbogen-v4')).toMatchObject({ camp: null, level: 3 });
    expect(await ls(page, 'charbogen-inst-k1-c1')).toMatchObject({ level: 7 });
    expect(await page.evaluate(() => window.__open)).toBe('');
  });

  test('Schnellzugriff „Inventar“ öffnet in der Kampagne', async ({ page }) => {
    await start(page, { ...base, 'charbogen-v4': inst, 'charbogen-char-c1': lib });
    await page.locator('.hub-ql[data-k="inv"]').click();
    await expect(page.locator('.crumbs')).toContainText('Alpha');
    expect((await ls(page, 'charbogen-v4')).camp).toBe('k1');
  });

  test('Kampfdialog: Escape und Klick daneben schließen; „Nächster Zug“ auch in der Kurzleiste', async ({ page }) => {
    await start(page, { ...base, 'charbogen-dm': { on: true }, 'charbogen-campaigns': [{ id: 'd1', name: 'Runde', status: 'active', chars: [], role: 'dm', split: true }],
      'charbogen-dm-camp-d1': { combat: { round: 1, active: 'a', list: [{ id: 'a', kind: 'mon', name: 'Ork', init: 10, hp: 15, hpMax: 15, ac: 13, cond: {}, fx: [], note: '' }, { id: 'b', kind: 'pc', name: 'Borin', init: 5, hp: 15, hpMax: 15, ac: 13, cond: {}, fx: [], note: '' }] } } });
    await page.locator('.hub-side [data-s="gm"]').click();
    await page.locator('.hub-camp [data-a="campplay"]').click();
    await page.locator('[data-a="tab"][data-t="dmcombat"]').click();
    await page.locator('.fight-cols [data-a="dmopen"][data-id="a"]').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.dm-dlg')).toHaveCount(0);
    // Klick daneben gilt für das Blatt am Handy; am Desktop steht „Eingreifen“ fest in der Spalte
    await page.setViewportSize({ width: 390, height: 800 });
    await page.locator('[data-a="fside"][data-k="foes"]').click();
    await page.locator('.fight-cols [data-a="dmopen"][data-id="a"]').click();
    await page.mouse.click(5, 5);
    await expect(page.locator('.dm-dlg')).toHaveCount(0);
    await page.setViewportSize({ width: 1280, height: 420 });
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.locator('[data-a="mbstep"]').click();
    await expect(page.locator('.ibar .ib.cur')).toContainText('Borin');
  });

  test('Sicherung und Wiederherstellung umfassen Kampagnenstände und Spielleitungsdaten', async ({ page }) => {
    await start(page, { ...base, 'charbogen-dm-camp-d9': { notes: [{ id: 'n', kind: 'npc', title: 'Vogt', body: '' }] } });
    await page.locator('.hub-side [data-s="settings"]').click();
    const dl = page.waitForEvent('download');
    await page.locator('[data-a="bakdl"]').first().click();
    const file = await (await dl).path();
    const b = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(Object.keys(b.data)).toEqual(expect.arrayContaining(['charbogen-inst-k1-c1', 'charbogen-dm-camp-d9', 'charbogen-v4']));
    // Daten verändern, dann die Sicherung einspielen
    await page.evaluate(() => { localStorage.removeItem('charbogen-inst-k1-c1'); localStorage.removeItem('charbogen-dm-camp-d9'); });
    await page.locator('#bak-f').setInputFiles(file);
    await page.locator('[data-a="bakyes"]').click();
    await page.waitForEvent('load');
    expect(await ls(page, 'charbogen-inst-k1-c1')).toMatchObject({ level: 7, camp: 'k1' });
    expect((await ls(page, 'charbogen-dm-camp-d9')).notes[0].title).toBe('Vogt');
  });
});
