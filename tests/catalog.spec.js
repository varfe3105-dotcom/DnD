import fs from 'node:fs';
import { test, expect, seed, read, act, base4, item } from './helpers.js';
import spells from '../data/spells.json' with { type: 'json' };
import items from '../data/items.json' with { type: 'json' };
import magic from '../data/magic-items.json' with { type: 'json' };
import potions from '../data/potions.json' with { type: 'json' };

const SOURCES = ['srd', 'summary', 'own'];
const setLang = (page, l) => page.locator(`[data-a="lang"][data-l="${l}"]`).click();

test.describe('Katalogdaten @new', () => {
  test('alle 361 PHB-Zauber sind vorhanden, kein Name doppelt', () => {
    expect(spells.filter(s => !s.origin).length).toBe(361);
    expect(new Set(spells.map(s => s.n)).size).toBe(spells.length);
  });

  test('jeder Zauber hat alle Spielwerte in beiden Sprachen', () => {
    for (const s of spells) {
      expect(Number.isInteger(s.lvl), s.n).toBe(true);
      expect(s.school, s.n).toBeTruthy();
      expect(s.comp, s.n).toBeTruthy();
      expect(s.cls, s.n).toBeTruthy();
      for (const f of ['time', 'range', 'dur', 'text']) { expect(s[f].en, `${s.n} ${f} en`).toBeTruthy(); expect(s[f].de, `${s.n} ${f} de`).toBeTruthy(); }
      expect(typeof s.conc).toBe('boolean');
      expect(typeof s.ritual).toBe('boolean');
    }
  });

  test('jeder Datensatz hat source und verified:false', () => {
    for (const r of [...spells, ...items, ...magic, ...potions]) {
      expect(SOURCES, JSON.stringify(r.n)).toContain(r.source);
      expect(r.verified).toBe(false);
    }
  });

  test('Ausrüstung und magische Gegenstände sind zweisprachig benannt', () => {
    for (const r of [...items, ...magic, ...potions]) { expect(r.n.en).toBeTruthy(); expect(r.n.de, r.n.en).toBeTruthy(); expect(r.text.en, r.n.en).toBeTruthy(); }
    const noDe = [...items, ...magic, ...potions].filter(r => !r.text.de).map(r => r.n.en);
    expect(noDe).toEqual([]);
  });

  test('keine Katalog-ID kommt doppelt vor', () => {
    const ids = [...items, ...magic, ...potions].map(r => `${r.k}:${r.id}`);
    expect(ids.filter((x, i) => ids.indexOf(x) !== i)).toEqual([]);
  });

  test('Abgleich mit dem SRD wurde dokumentiert', () => {
    const doc = fs.readFileSync('docs/srd-gaps.md', 'utf8');
    expect(doc).toContain('Noch fehlend im Katalog (0)');
  });
});

test.describe('Katalog in der Oberfläche @new', () => {
  test('Zauber: Englisch aus dem SRD, Deutsch mit Metern und Namenszusatz', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('Fireball');
    await act(page, 'wsel', '[data-key="spell:Fireball"]').click();
    const pane = page.locator('.wd.pane');
    await expect(pane).toContainText('150 feet');
    await expect(pane).toContainText('8d6');
    await setLang(page, 'de');
    await expect(pane).toContainText('45 m');
    await expect(pane).toContainText('8W6');
    await expect(pane.locator('small').first()).toContainText('Feuerball');
  });

  test('Hinweis bei Zusammenfassungen ist sichtbar', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('Hex');
    await act(page, 'wsel', '[data-key="spell:Hex"]').click();
    await expect(page.locator('.wd.pane .src')).toContainText('Summary');
    await setLang(page, 'de');
    await expect(page.locator('.wd.pane .src')).toHaveText('Zusammenfassung, bei Unklarheit im Buch prüfen.');
  });

  test('Klassenfilter zeigt nur passende Zauber', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('Eldritch Blast');
    await page.locator('#wc').selectOption('W');
    await expect(page.locator('.wli')).toHaveCount(0);
    await page.locator('#wc').selectOption('K');
    await expect(page.locator('.wli', { hasText: 'Eldritch Blast' })).toBeVisible();
  });

  test('alte deutsche Gegenstände folgen der Sprache, eigene nicht', async ({ page }) => {
    const old = item('a', 'Langschwert', { p: 'Krieg · 1W8 Hieb · Vielseitig (1W10) · 15 GM', slot: 'hand' });
    const own = item('b', 'Langschwert', { p: 'Vom Schmied im Dorf', slot: 'hand' });
    await seed(page, base4({ tab: 'inv', bag: [old, own] }));
    await expect(page.locator('[data-drag="bag:0"]')).toHaveAttribute('aria-label', 'Longsword');
    await expect(page.locator('[data-drag="bag:1"]')).toHaveAttribute('aria-label', 'Langschwert');
    await act(page, 'tab', '[data-t="main"]').click();
    const s = await read(page);
    expect(s.bag[0].ref).toBe('item:longsword');
    expect(s.bag[0].p).toBe(old.p);
    expect(s.bag[1].ref).toBeUndefined();
  });

  test('Angriff aus Katalogwaffe rechnet in beiden Sprachen', async ({ page }) => {
    await seed(page, base4({ tab: 'inv' }));
    await page.locator('#inv-sel').selectOption('item:rapier');
    await act(page, 'addinv').click();
    await page.locator('[data-drag="bag:0"]').click();
    await act(page, 'equip').click();
    await act(page, 'tab', '[data-t="main"]').click();
    await expect(page.locator('.atk b').nth(1)).toHaveText('1d8+3');
    await setLang(page, 'de');
    await expect(page.locator('.atk b').nth(1)).toHaveText('1W8+3');
  });

  test('magische Gegenstände tragen Seltenheit und Einstimmung', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('Cloak of Protection');
    await act(page, 'wsel', '[data-key="magic:cloak-of-protection"]').click();
    await expect(page.locator('.wd.pane')).toContainText('Uncommon');
    await expect(page.locator('.wd.pane')).toContainText('requires attunement');
  });
});
