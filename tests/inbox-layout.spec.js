// Vorschläge der Spielleitung in der Live-Leiste: Text nutzt die verfügbare Breite (kein Buchstabenumbruch),
// „Annehmen“ und „Ablehnen“ bleiben nebeneinander – am Desktop (Leiste in der globalen Seitenleiste), Tablet und Handy.
import { test, expect, seed, base4, joinRoom } from './helpers.js';

test.describe('Posteingang Live-Leiste @new', () => {
  for (const [w, h, name] of [[1440, 900, 'Desktop'], [1000, 800, 'Tablet'], [390, 844, 'Handy']]) {
    test(`${name}: Text breit genug, Knöpfe zusammen`, async ({ page }) => {
      await page.addInitScript(() => { window.__liveFake = (code, key, onPeers, onStatus, onMsg) => { window.__msg = onMsg; setTimeout(() => onStatus('on'), 0); return { track() {}, send() {}, close() {} }; }; });
      await page.setViewportSize({ width: w, height: h });
      await seed(page, base4({ tab: 'prof', id: 'held1', name: 'Mira' }));
      await joinRoom(page, 'ABC234');
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.__msg({ id: 'x1', type: 'item', to: 'held1', from: 'dm-x', ref: 'potion:potion-of-healing', n: 'Potion of Healing', q: 1 }));
      const row = page.locator('#live-dock .inbox .row').first();
      await expect(row).toBeVisible();
      const nm = await row.locator('.nm').boundingBox(), yes = await row.locator('[data-a="liveyes"]').boundingBox(), no = await row.locator('[data-a="liveno"]').boundingBox();
      // Text mindestens 120 px breit und höchstens drei Zeilen hoch (vorher: 13 px, ein Buchstabe je Zeile)
      expect(nm.width).toBeGreaterThan(120);
      const lh = await row.locator('.nm small').evaluate(e => parseFloat(getComputedStyle(e).lineHeight) || 20);
      expect(nm.height).toBeLessThan(lh * 2 + 40);
      // Knöpfe nebeneinander, gleiche Höhe, nicht über dem Text
      expect(Math.abs(yes.y - no.y)).toBeLessThan(2);
      expect(no.x).toBeGreaterThan(yes.x + yes.width - 1);
      expect(yes.y + 1 >= nm.y + nm.height || yes.x >= nm.x + nm.width - 1).toBe(true);
      // Kein waagrechter Überlauf der Leiste
      expect(await page.locator('#live-dock').evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    });
  }
});
