import fs from 'node:fs';
import path from 'node:path';
import { test, expect, seed, read, act, tab, base4, spell, item, URL_UNDER_TEST } from './helpers.js';
import en from '../src/i18n/en.json' with { type: 'json' };
import de from '../src/i18n/de.json' with { type: 'json' };

const setLang = l => act_lang => act_lang.locator(`[data-a="lang"][data-l="${l}"]`).click();
const srcFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? srcFiles(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []));

test.describe('Wörterbücher @new', () => {
  test('beide Wörterbücher haben dieselben Schlüssel', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
  });

  test('kein Wert ist leer, Platzhalter stimmen überein', () => {
    const ph = s => (s.match(/\{\w+\}/g) || []).sort();
    for (const k of Object.keys(en)) {
      expect(en[k], k).not.toBe('');
      expect(ph(en[k]), k).toEqual(ph(de[k]));
    }
  });

  test('jeder feste Schlüssel im Code steht im Wörterbuch', () => {
    const used = new Set();
    for (const f of srcFiles('src')) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\b(?:t|tr)\('([a-zA-Z]+\.[a-zA-Z0-9]+)'(?=[,)])/g)) used.add(m[1]);
    const missing = [...used].filter(k => !(k in en));
    expect(missing).toEqual([]);
  });
});

test.describe('Umschalten @new', () => {
  test('Standard ist Englisch, Umschalter sichtbar auch am Handy', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await seed(page, base4({}));
    await expect(page.locator('[data-a="lang"][data-l="en"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-a="lang"][data-l="de"]')).toBeVisible();
    await expect(page.locator('[data-a="tab"][data-t="inv"]')).toHaveText('Inventory');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
  });

  test('Wahl bleibt gespeichert, Anzeige wechselt', async ({ page }) => {
    await seed(page, base4({}));
    await setLang('de')(page);
    await expect(page.locator('[data-a="tab"][data-t="inv"]')).toHaveText('Inventar');
    await page.reload();
    await expect(page.locator('[data-a="tab"][data-t="inv"]')).toHaveText('Inventar');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('de');
  });

  test('Umschalten ändert die gespeicherten Daten nicht', async ({ page }) => {
    const own = item('o', 'Mein Zauberding', { p: 'Eigener Text bleibt' });
    await seed(page, base4({ notes: 'Meine Notiz', bag: [own], spells: [spell('Fire Bolt', 0)] }));
    await act(page, 'hp', '[data-d="-1"]').first().click();
    const before = await read(page);
    await setLang('de')(page);
    await setLang('en')(page);
    expect(await read(page)).toEqual({ ...before });
  });

  test('eigene Einträge bleiben, wie eingetragen', async ({ page }) => {
    await seed(page, base4({ tab: 'inv', bag: [item('o', 'Mein Zauberding', { p: 'Eigener Text bleibt' })] }));
    await page.locator('[data-drag="bag:0"]').click();
    await expect(page.locator('.selp')).toContainText('Eigener Text bleibt');
    await setLang('de')(page);
    await expect(page.locator('.selp')).toContainText('Eigener Text bleibt');
  });

  test('Einheiten: ft. auf Englisch, m auf Deutsch, intern Meter', async ({ page }) => {
    await seed(page, base4({ speed: 9 }));
    await expect(page.locator('.st').nth(2).locator('b')).toHaveText('30 ft.');
    await setLang('de')(page);
    await expect(page.locator('.st').nth(2).locator('b')).toHaveText('9 m');
    expect((await read(page)).speed).toBe(9);
  });

  test('Tempo eingeben: Englisch in Fuß, gespeichert in Metern', async ({ page }) => {
    await seed(page, base4({ tab: 'setup' }));
    await page.locator('#f-speed').fill('35');
    await page.locator('#f-speed').blur();
    await expect.poll(async () => (await read(page)).speed).toBe(10.5);
  });

  test('Namen bleiben englisch, Deutsch steht daneben', async ({ page }) => {
    await seed(page, base4({ cond: { Blinded: true } }));
    const chip = page.locator('[data-a="cond"][data-c="Blinded"]');
    await expect(chip).toHaveText('Blinded');
    await setLang('de')(page);
    await expect(chip).toHaveText('Blinded · Blind');
  });

  test('Zustandstext: Englisch aus dem SRD, Deutsch eigene Fassung', async ({ page }) => {
    await seed(page, base4({ cond: { Blinded: true } }));
    await expect(page.locator('.row', { hasText: 'Blinded' }).first()).toContainText("can't see");
    await setLang('de')(page);
    await expect(page.locator('.row', { hasText: 'Blinded' }).first()).toContainText('kann nicht sehen');
  });

  test('Würfel: 1d8 auf Englisch, 1W8 auf Deutsch', async ({ page }) => {
    await seed(page, base4({ eq: { main: item('s', 'Langschwert', { p: 'Krieg · 1W8 Hieb · Vielseitig (1W10) · 15 GM', slot: 'hand' }) } }));
    await expect(page.locator('.atk b').nth(1)).toHaveText('1d8+2');
    await setLang('de')(page);
    await expect(page.locator('.atk b').nth(1)).toHaveText('1W8+2');
  });

  test('Fehlende Übersetzungen werden gemeldet und die Oberfläche bleibt vollständig', async ({ page }) => {
    const report = [];
    for (const l of ['en', 'de']) {
      await seed(page, base4({ tab: 'wiki' }));
      await page.locator(`[data-a="lang"][data-l="${l}"]`).click();
      for (const t of ['main', 'inv', 'wiki', 'notes', 'setup']) await tab(page, t);
      report.push(...await page.evaluate(() => [...window.__i18nMissing].filter(x => !x.includes(':') || /^(en|de):[a-z]+\.[a-zA-Z0-9]+$/.test(x))));
    }
    expect(report, 'fehlende Oberflächentexte').toEqual([]);
  });
});
