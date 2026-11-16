// Zurück-Taste des Browsers (auch Maustaste und Handy) führt innerhalb von RealmCraft eine Ansicht zurück.
import { test, expect, URL_UNDER_TEST } from './helpers.js';

test.use({ hub: true });
const data = {
  'charbogen-v4': { v: 4, id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 3, tab: 'prof' }, 'charbogen-index': [{ id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 3 }],
  'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], role: 'player', split: true }],
};
async function start(page, d = data) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(x => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(x)) localStorage.setItem(k, JSON.stringify(v)); }, d);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const sec = page => page.locator('.hub').getAttribute('data-sec');
const tabNow = page => page.locator('.tabs [aria-selected="true"]').getAttribute('data-t');

test.describe('Zurück-Taste @new', () => {
  test('Startseite: Bereiche zurück, die Seite bleibt offen', async ({ page }) => {
    await start(page);
    await page.locator('.hub-side [data-s="camps"]').click();
    await page.locator('.hub-side [data-s="map"]').click();
    await page.locator('.hub-side [data-s="wiki"]').click();
    await page.goBack();
    expect(await sec(page)).toBe('map');
    await page.goBack();
    expect(await sec(page)).toBe('camps');
    await page.goForward();
    expect(await sec(page)).toBe('map');
    expect(page.url()).toContain('charakterbogen.html');
  });

  test('Kampagne → Gruppe → Charakter → Werte, dann Schritt für Schritt zurück bis zur Kampagnenliste', async ({ page }) => {
    await start(page);
    await page.locator('.hub-side [data-s="camps"]').click();
    await page.locator('.hub-camp [data-a="campplay"]').click();
    await page.locator('[data-a="tab"][data-t="party"]').click();
    await page.locator('.camp-mine [data-a="crumb"]').click();
    await page.locator('[data-a="tab"][data-t="stats"]').click();
    await page.goBack();
    expect(await tabNow(page)).toBe('prof');
    await page.goBack();
    expect(await tabNow(page)).toBe('party');
    await page.goBack();
    expect(await tabNow(page)).toBe('cover');
    await page.goBack();
    await expect(page.locator('.hub')).toBeVisible();
    expect(await sec(page)).toBe('camps');
    // Vorwärts öffnet die Kampagne wieder
    await page.goForward();
    await expect(page.locator('.crumbs')).toContainText('Grenzland');
  });

  test('offener Dialog: Zurück schließt zuerst ihn', async ({ page }) => {
    await start(page, { ...data, 'charbogen-dm': { on: true }, 'charbogen-campaigns': [{ id: 'd1', name: 'Runde', status: 'active', chars: [], role: 'dm', split: true }], 'charbogen-dm-camp-d1': { combat: { round: 1, active: null, list: [{ id: 'a', kind: 'mon', name: 'Ork', init: 10, hp: 15, hpMax: 15, ac: 13, cond: {}, fx: [], note: '' }] } } });
    await page.locator('.hub-side [data-s="gm"]').click();
    await page.locator('.hub-camp [data-a="campplay"]').click();
    await page.locator('[data-a="tab"][data-t="dmcombat"]').click();
    await page.locator('[data-a="dmopen"][data-id="a"]').click();
    await expect(page.locator('.dm-dlg')).toBeVisible();
    await page.goBack();
    await expect(page.locator('.dm-dlg')).toHaveCount(0);
    expect(await tabNow(page)).toBe('dmcombat');
    await page.goBack();
    expect(await tabNow(page)).toBe('cover');
  });
});
