// Navigation in der Kampagne: Kampagnenleiste bleibt auf allen Seiten stehen (auch Mein Charakter, Weltkarte, Wiki),
// Weltkarte und Wiki aus der globalen Leiste verlassen die Kampagne nicht; Wechsel ändern keine gespeicherten Daten.
import { test, expect, URL_UNDER_TEST } from './helpers.js';

test.use({ hub: true });
const lib = { v: 4, id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 5, hp: 30, hpMax: 38, tab: 'prof' };
const camps = [
  { id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], role: 'player', split: true },
  { id: 'd1', name: 'Die letzte Bastion', status: 'active', chars: [], role: 'dm', split: true },
];
async function start(page) {
  await page.route(/aidedd/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Karte</p>' }));
  await page.goto(URL_UNDER_TEST);
  const data = { 'charbogen-lang': 'de', 'charbogen-v4': lib, 'charbogen-char-c1': lib, 'charbogen-index': [{ id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 5 }], 'charbogen-campaigns': camps, 'charbogen-dm': { on: true } };
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const vis = async loc => { const n = await loc.count(); for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible()) return loc.nth(i); return null; };
/** Kampagnenreiter anklicken; am Handy stehen weitere Bereiche im Menü („Mehr“). */
async function go(page, k) {
  let b = await vis(page.locator(`.tabs [data-a="tab"][data-t="${k}"]`));
  if (!b) { await page.locator('.tab-more').click(); b = page.locator(`.mmenu [data-a="tab"][data-t="${k}"]`); }
  await b.click();
}
const stored = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('charbogen-inst') || k === 'charbogen-dm-camp-d1').map(k => [k, localStorage.getItem(k)])));
const keysShown = page => page.locator('.tabs nav [data-a="tab"]').evaluateAll(b => b.map(x => x.dataset.t));
const selected = page => page.locator('.tabs nav [data-a="tab"][aria-selected="true"]').evaluateAll(b => b.map(x => x.dataset.t));

for (const [w, h, name] of [[1440, 900, 'Desktop'], [390, 844, 'Handy']]) {
  test.describe(`Kampagnennavigation ${name} @new`, () => {
    test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: w, height: h }); await start(page); });

    test('Spieler: Leiste auf allen Seiten, Weltkarte und Wiki im Kampagnenkontext', async ({ page }) => {
      await (await vis(page.locator('[data-a="hubgo"][data-s="camps"]'))).click();
      await page.locator('.hub-camp', { hasText: 'Grenzland' }).locator('[data-a="campplay"]').click();
      const all = ['cover', 'party', 'prof', 'main', 'explore', 'trade', 'chron', 'map', 'wiki'];
      const before = await stored(page);
      for (const k of all) {
        await go(page, k);
        expect(await keysShown(page)).toEqual(all);
        expect(await selected(page)).toEqual([k]);
        expect(await page.evaluate(() => sessionStorage.getItem('charbogen-camp'))).toBe('k1');
        await expect(page.locator('.hub')).toHaveCount(0);
      }
      // Mein Charakter: Unterseiten mit eigener Unterleiste, oben bleibt „Mein Charakter“ aktiv
      await go(page, 'prof');
      for (const k of ['stats', 'inv', 'spells', 'notes']) {
        await page.locator(`.charsub [data-t="${k}"]`).click();
        expect(await keysShown(page)).toEqual(all);
        expect(await selected(page)).toEqual(['prof']);
      }
      // Weltkarte und Wiki aus der globalen Leiste (Desktop) bzw. dem Menü bleiben in der Kampagne
      const rail = await vis(page.locator('.rail [data-a="railtab"][data-t="map"]'));
      if (rail) await rail.click(); else await go(page, 'map');
      await expect(page.locator('#hub-map-slot')).toBeVisible();
      expect(await selected(page)).toEqual(['map']);
      await expect(page.locator('.hub')).toHaveCount(0);
      const rw = await vis(page.locator('.rail [data-a="railtab"][data-t="wiki"]'));
      if (rw) await rw.click(); else await go(page, 'wiki');
      await expect(page.locator('#wq')).toBeVisible();
      // Direkt zurück zu Kampf und Mein Charakter
      await go(page, 'main');
      await expect(page.locator('.pfight')).toBeVisible();
      await go(page, 'prof');
      await expect(page.locator('.charsub')).toBeVisible();
      // Keine Daten neu geschrieben, nur weil gewechselt wurde
      expect(await stored(page)).toEqual(before);
      // Kein waagrechter Überlauf
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    });

    test('Spielleitung: Weltkarte und Wiki als Bereiche der Kampagne', async ({ page }) => {
      await (await vis(page.locator('[data-a="hubgo"][data-s="gm"]'))).click();
      await page.locator('.hub-camp [data-a="campplay"]').click();
      for (const k of ['dmcombat', 'map', 'wiki', 'dmset', 'dmcombat']) {
        await go(page, k);
        expect(await selected(page)).toEqual([k]);
        expect(await page.evaluate(() => sessionStorage.getItem('charbogen-camp'))).toBe('d1');
      }
      await expect(page.locator('header.dmhd h1')).toHaveText('Die letzte Bastion');
    });
  });
}

test('Außerhalb einer Kampagne führt die Leiste weiter zur globalen Weltkarte', async ({ page }) => {
  await start(page);
  await page.locator('.hub-side [data-a="hubgo"][data-s="chars"]').click();
  await page.locator('.hub-body [data-a="hubplay"], .hub-body [data-a="charplay"]').first().click();
  await page.locator('.rail [data-a="hubgo"][data-s="map"]').click();
  await expect(page.locator('.hub')).toHaveAttribute('data-sec', 'map');
});
