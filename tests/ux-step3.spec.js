// UX-Schritt 3: „Einrichten“ in den Kampagneneinstellungen, einheitliche Namen, Titelplatte ohne doppelte Wege,
// „Zug beenden“ nur auf der Kampfseite.
import { test, expect, URL_UNDER_TEST } from './helpers.js';

test.use({ hub: true });
const lib = { v: 4, id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 5, hp: 30, hpMax: 38, tab: 'prof' };
async function start(page, extra = {}) {
  await page.goto(URL_UNDER_TEST);
  const data = { 'charbogen-lang': 'de', 'charbogen-v4': lib, 'charbogen-char-c1': lib, 'charbogen-index': [{ id: 'c1', name: 'Mirelle' }], 'charbogen-dm': { on: true },
    'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], role: 'player', split: true }, { id: 'd1', name: 'Bastion', status: 'active', chars: [], role: 'dm', split: true }], ...extra };
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
}

test.describe('UX Schritt 3 @new', () => {
  test('Spielleitung: Einrichten steckt in den Einstellungen; Namen Gruppe/Chronik/Wiki einheitlich', async ({ page }) => {
    await start(page);
    await page.locator('.hub-side [data-a="hubgo"][data-s="gm"]').click();
    await page.locator('.hub-camp [data-a="campplay"]').click();
    // Titelplatte ohne Einrichten, Sprache, Einheiten
    await expect(page.locator('header.dmhd [data-a="tab"][data-t="setup"]')).toHaveCount(0);
    await expect(page.locator('header.dmhd [data-a="lang"]')).toHaveCount(0);
    // Sprache und Einheiten unten in der globalen Leiste
    await expect(page.locator('.rail .rail-prefs [data-a="lang"][data-l="de"]')).toBeVisible();
    // Einstellungen: Bereich „Spielleitung & Gerät“ mit Verlassen, Darstellung und Sicherung
    await page.locator('.tabs [data-a="tab"][data-t="dmset"]').click();
    const dev = page.locator('.cs-dev');
    await expect(dev).toContainText('Spielleitung & Gerät');
    await expect(dev.locator('[data-a="dmleave"]')).toBeVisible();
    await expect(dev.locator('#skin, select, [data-a="skin"]').first()).toBeVisible();
    // Alter Sprung auf „Einrichten“ landet in den Einstellungen
    await page.evaluate(() => { const b = document.createElement('button'); b.dataset.a = 'tab'; b.dataset.t = 'setup'; document.getElementById('app').appendChild(b); b.click(); });
    await expect(page.locator('.cs-top h2')).toHaveText('Kampagneneinstellungen');
    // Namen
    await page.locator('.tabs [data-a="tab"][data-t="dmlive"]').click();
    await expect(page.locator('#app h2').first()).toHaveText('Gruppe');
    await page.locator('.tabs [data-a="tab"][data-t="dmnotes"]').click();
    await expect(page.locator('#app h2').first()).toHaveText('Chronik');
    await expect(page.locator('[data-a="chronv"][data-k="notes"]')).toHaveText('Notizbuch (privat)');
    await expect(page.locator('.rail [data-t="wiki"] span')).toHaveText('Wiki');
    await page.locator('.tabs [data-a="tab"][data-t="wiki"]').click();
    await expect(page.locator('#app h2').first()).toHaveText('Wiki – Regeln & Wissen');
  });

  test('Charakter-Titelplatte ohne Startseite, Regeln, Sprache und Einheiten; Stufenaufstieg und Rasten bleiben', async ({ page }) => {
    await start(page);
    await page.locator('.hub-side [data-a="hubgo"][data-s="camps"]').click();
    await page.locator('.hub-camp', { hasText: 'Grenzland' }).locator('[data-a="campplay"]').click();
    await page.locator('.tabs [data-a="tab"][data-t="prof"]').click();
    const hd = page.locator('#app header.hd');
    for (const sel of ['[data-a="hubhome"]', '[data-a="tab"][data-t="wiki"]', '[data-a="lang"]', '[data-a="units"]']) await expect(hd.locator(sel)).toHaveCount(0);
    await expect(hd.locator('[data-a="lu"]')).toBeVisible();
    await expect(hd.locator('[data-a="rest"][data-r="long"]')).toBeVisible();
  });
});

test.describe('Farbschema nach Kampagnenbild @new', () => {
  test('Kampagne mit Waldbild: grünes Schema in der Kampagne, Startseite bleibt Aubergine; Bild füllt die Titelplatte', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await start(page, { 'charbogen-campaigns': [{ id: 'd1', name: 'Wald', status: 'active', chars: [], role: 'dm', split: true, art: 5 }] });
    await expect(page.locator('html')).not.toHaveAttribute('data-art', /.*/);
    await page.locator('.hub-side [data-a="hubgo"][data-s="gm"]').click();
    await page.locator('.hub-camp [data-a="campplay"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-art', '5');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--camp-tint').trim())).not.toBe('transparent');
    // Kein leerer Streifen: Bild reicht bis an den rechten Rand der Titelplatte
    const [hd, art] = await Promise.all([page.locator('header.hd').boundingBox(), page.locator('header.hd .hd-art').boundingBox()]);
    expect(Math.abs(hd.x + hd.width - (art.x + art.width))).toBeLessThan(2);
    // Zurück auf die Startseite: wieder Standard
    await page.locator('.rail [data-a="railhome"]').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-art', /.*/);
  });
});
