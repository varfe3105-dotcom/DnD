// Startseite „Roll & Tale“: Einstieg, echte Daten, Kampagnen, Übergang in den Spielbereich
import { test, expect, URL_UNDER_TEST } from './helpers.js';

test.use({ hub: true });
const chars = { 'charbogen-v4': { v: 4, id: 'c1', name: 'Mirelle', race: 'Elf', klass: 'Cleric', level: 5, tab: 'main' }, 'charbogen-char-c2': { v: 4, id: 'c2', name: 'Borin', klass: 'Fighter', level: 4 }, 'charbogen-index': [{ id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 5 }, { id: 'c2', name: 'Borin', klass: 'Fighter', level: 4 }] };
async function start(page, data = {}) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const camps = page => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-campaigns') || '[]'));

test.describe('Dashboard @new', () => {
  test('ohne Daten: Startseite mit Einladung, keine erfundenen Inhalte', async ({ page }) => {
    await start(page);
    await expect(page.locator('.hub-hero-h')).toHaveText(/Welcome|Willkommen/);
    await expect(page.locator('.hub-camp')).toHaveCount(0);
    await expect(page.locator('.hub-empty')).toBeVisible();
    await expect(page.locator('.hub-next')).toContainText(/No date|Noch kein Termin/);
    await expect(page.locator('.hub-gm')).toHaveCount(0);
    await expect(page.locator('.hub-group')).toContainText(/No characters|Noch keine Charaktere/);
    await expect(page.locator('.hub-word')).toHaveText('RealmCraft');
    await expect(page.locator('.hub-ql')).not.toContainText([/dice|Würfel/i]);
  });

  test('zeigt vorhandene Charaktere, öffnet Borin im Spielbereich, Übersicht führt zurück', async ({ page }) => {
    await start(page, chars);
    await expect(page.locator('.hub-gm-t b')).toHaveText(['Mirelle', 'Borin']);
    await page.locator('.hub-gm', { hasText: 'Borin' }).click();
    await expect(page.locator('#app header.hd h1')).toHaveText('Borin');
    expect(await page.evaluate(() => sessionStorage.getItem('charbogen-view'))).toBe('play');
    // Neuladen mitten im Spiel bleibt im Spielbereich
    await page.reload();
    await expect(page.locator('#app header.hd h1')).toHaveText('Borin');
    await page.locator('[data-a="hubhome"]').click();
    await expect(page.locator('.hub')).toBeVisible();
    await expect(page.locator('.hub-gm.cur .hub-gm-t b')).toHaveText('Borin');
  });

  test('Kampagne anlegen, Charaktere zuordnen, Termin erscheint als nächste Session, Session zählen', async ({ page }) => {
    await start(page, chars);
    await page.locator('.hub-hero [data-a="campnew"]').click();
    await page.locator('#cf-name').fill('Die letzte Bastion');
    await page.locator('#cf-desc').fill('Gemeinsam gegen das Dunkel');
    await page.locator('#cf-planned').fill('8');
    const d = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    await page.locator('#cf-next').fill(d + 'T19:00');
    await page.locator('[data-a="campchar"]', { hasText: 'Borin' }).click();
    await page.locator('[data-a="campart"][data-i="4"]').click();
    await expect(page.locator('#cf-name')).toHaveValue('Die letzte Bastion');
    await page.locator('[data-a="campsave"]').click();
    let c = await camps(page);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ name: 'Die letzte Bastion', art: 4, chars: ['c2'], planned: 8, done: 0, status: 'active', next: d + 'T19:00' });
    await page.locator('.hub-side [data-a="hubgo"][data-s="home"]').click();
    await expect(page.locator('.hub-next h4')).toHaveText('Die letzte Bastion');
    await expect(page.locator('.hub-gm', { hasText: 'Borin' })).toContainText('Die letzte Bastion');
    await expect(page.locator('.hub-camp .hub-camp-art')).toHaveClass(/a4/);
    await page.locator('.hub-camp [data-a="campdone"]').click();
    c = await camps(page);
    expect(c[0]).toMatchObject({ done: 1, next: '' });
    await expect(page.locator('.hub-camp')).toContainText(/1 (of|von) 8/);
  });

  test('Kampagne mit Raumcode: „Zum Live-Tisch“ öffnet den Charakter und betritt den Raum', async ({ page }) => {
    await page.addInitScript(() => { window.__liveFake = (code, key, onPeers, onStatus) => { window.__code = code; setTimeout(() => onStatus('on'), 0); return { track() {}, send() {}, close() {} }; }; });
    await start(page, { ...chars, 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c2'], room: 'ABC234', done: 2 }] });
    await page.locator('[data-a="campplay"]').click();
    await expect(page.locator('#app header.hd h1')).toHaveText('Borin');
    await expect(page.locator('#live-dock .st-on')).toBeVisible();
    expect(await page.evaluate(() => window.__code)).toBe('ABC234');
  });

  test('Suche findet Charakter, Kampagne und Zauber; Zauber öffnet das Wiki', async ({ page }) => {
    await start(page, { ...chars, 'charbogen-campaigns': [{ id: 'k1', name: 'Feuer im Norden', status: 'active', chars: [] }] });
    await page.locator('#hub-q').fill('fire');
    await expect(page.locator('.hub-hit').first()).toBeVisible();
    await expect(page.locator('#hub-res')).toContainText('Fireball');
    await page.locator('#hub-q').fill('feuer');
    await expect(page.locator('#hub-res')).toContainText('Feuer im Norden');
    await page.locator('#hub-q').fill('Fireball');
    await page.locator('.hub-hit[data-a="hubwiki"]').first().click();
    await expect(page.locator('.hub[data-sec="wiki"] .wd')).toContainText('Fireball');
  });

  test('Kampagne löschen braucht Bestätigung; gelöschter Charakter verschwindet aus Kampagnen', async ({ page }) => {
    await start(page, { ...chars, 'charbogen-campaigns': [{ id: 'k1', name: 'Alpha', status: 'active', chars: ['c2'] }, { id: 'k2', name: 'Omega', status: 'archived', chars: [] }] });
    await page.locator('.hub-side [data-a="hubgo"][data-s="camps"]').click();
    await expect(page.locator('.hub-camp')).toHaveCount(2);
    await page.locator('.hub-camp', { hasText: 'Omega' }).locator('[data-a="campedit"]').click();
    await page.locator('[data-a="campdel"]').click();
    expect(await camps(page)).toHaveLength(2);
    await page.locator('[data-a="campdel"]').click();
    expect((await camps(page)).map(x => x.id)).toEqual(['k1']);
    // Borin über Einrichten löschen
    await page.locator('.hub-side [data-a="hubgo"][data-s="chars"]').click();
    await page.locator('.hub-char', { hasText: 'Borin' }).locator('[data-a="hubplay"]').click();
    await page.locator('[data-a="tab"][data-t="setup"]').click();
    await page.locator('[data-a="chardel"][data-id="c2"]').click();
    await page.locator('[data-a="chardel"][data-id="c2"]').click();
    expect((await camps(page))[0].chars).toEqual([]);
  });

  test('Sicherungsdatei enthält die Kampagnen', async ({ page }) => {
    await start(page, { ...chars, 'charbogen-campaigns': [{ id: 'k1', name: 'A', status: 'active', chars: [] }] });
    const data = await page.evaluate(async () => { const m = await import('./backup.js').catch(() => null); return m ? null : Object.keys(localStorage); });
    expect(data).toContain('charbogen-campaigns');
    await page.locator('.hub-side [data-a="hubgo"][data-s="settings"]').click();
    const dl = page.waitForEvent('download');
    await page.locator('[data-a="bakdl"]').click();
    const file = await (await dl).path();
    const fs = await import('node:fs');
    const b = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(Object.keys(b.data)).toContain('charbogen-campaigns');
  });

  test('Schnellzugriff Charaktere → „Neuer Charakter“ legt einen neuen an und startet den Assistenten', async ({ page }) => {
    await start(page, chars);
    await page.locator('.hub-ql[data-k="chars"]').click();
    await page.locator('.hub-addc[data-a="hubnewchar"]').click();
    await expect(page.locator('.wiz')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-index')).length)).toBe(3);
  });

  test('Handybreite: kein Querscrollen, Originalgrafiken geladen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page, { ...chars, 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], art: 3 }] });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    const bg = await page.locator('.hub-camp-art').first().evaluate(e => getComputedStyle(e).backgroundImage);
    expect(bg.startsWith('url("data:image/webp')).toBe(true);
    await expect(page.locator('.hub-camp')).toBeVisible();
  });
});
