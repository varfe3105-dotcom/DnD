// Drei Ebenen: Startseite (global), Kampagne, Charakter. Rollen je Kampagne, Spielleiterbereich, Beitreten per Code.
import { test, expect, URL_UNDER_TEST } from './helpers.js';

test.use({ hub: true });
const chars = { 'charbogen-v4': { v: 4, id: 'c1', name: 'Mirelle', race: 'Elf', klass: 'Cleric', level: 5, tab: 'main' }, 'charbogen-char-c2': { v: 4, id: 'c2', name: 'Borin', klass: 'Fighter', level: 4, hp: 30, hpMax: 36, gold: { gp: 12 } }, 'charbogen-index': [{ id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 5 }, { id: 'c2', name: 'Borin', klass: 'Fighter', level: 4 }] };
async function start(page, data = {}) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const camps = page => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-campaigns') || '[]'));
const navKeys = page => page.locator('.tabs nav [data-a="tab"]').evaluateAll(b => b.map(x => x.dataset.t));
/** Nachgebaute Verbindung: merkt sich die gesendete Presence; optional ist eine Spielleitung mit Kampagne im Raum. */
const fake = (page, dm) => page.addInitScript(d => {
  window.__sent = [];
  window.__liveFake = (code, key, onPeers, onStatus) => { window.__code = code; setTimeout(() => onStatus('on'), 0); return { track(p) { window.__sent.push(p); onPeers([...(d ? [d] : []), { ...p, key }]); }, send() {}, close() {} }; };
}, dm || null);

test.describe('Ebenen und Rollen @new', () => {
  test('Spieler: Kampagne → Gruppe → Charakter, Brotkrumen führen zurück, Neuladen bleibt in der Kampagne', async ({ page }) => {
    await start(page, { ...chars, 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c2'], role: 'player' }] });
    await page.locator('[data-a="campplay"]').click();
    await expect(page.locator('.crumb-lvl')).toHaveText(/Kampagne|Campaign/);
    expect(await navKeys(page)).toEqual(['cover', 'party', 'main', 'explore', 'trade', 'chron']);
    await expect(page.locator('.camp-me')).toContainText('Borin');
    // Gruppe → eigener Charakter
    await page.locator('[data-a="tab"][data-t="party"]').click();
    await page.locator('.camp-mine [data-a="crumb"][data-t="prof"]').click();
    await expect(page.locator('.crumb-lvl')).toHaveText(/Charakter|Character/);
    expect(await navKeys(page)).toEqual(['prof', 'stats', 'inv', 'spells', 'notes', 'setup']);
    await expect(page.locator('#app header.hd h1')).toHaveText('Borin');
    await expect(page.locator('.crumbs')).toContainText('Grenzland');
    await page.locator('[data-a="tab"][data-t="stats"]').click();
    await expect(page.locator('.skgrid')).toBeVisible();
    await page.locator('[data-a="tab"][data-t="spells"]').click();
    await expect(page.locator('.sheet.solo h2')).toBeVisible();
    // Zurück zur Kampagne, Kampf ohne Umschalter Alles/Kampf/Erkundung
    await page.locator('.crumbs [data-a="crumb"][data-t="cover"]').click();
    expect(await navKeys(page)).toContain('chron');
    await page.locator('[data-a="tab"][data-t="main"]').click();
    await expect(page.locator('.stats .st.ac')).toBeVisible();
    await expect(page.locator('.modes')).toHaveCount(0);
    // Inventar & Handel und Chronik
    await page.locator('[data-a="tab"][data-t="trade"]').click();
    await expect(page.locator('#app')).toContainText('12');
    await page.locator('[data-a="tab"][data-t="chron"]').click();
    await page.locator('#camp-log').fill('Sitzung 1: Ankunft in Grenzhall');
    expect((await camps(page))[0].log).toBe('Sitzung 1: Ankunft in Grenzhall');
    await page.reload();
    await expect(page.locator('.crumbs')).toContainText('Grenzland');
    await expect(page.locator('#camp-log')).toHaveValue('Sitzung 1: Ankunft in Grenzhall');
    await page.locator('[data-a="crumbhome"]').click();
    await expect(page.locator('.hub')).toBeVisible();
    expect((await camps(page))[0].seen).not.toBe('');
  });

  test('Spielleitung: Spielleiterbereich, Code erzeugen, Kampagne leiten; Presence nennt die Kampagne', async ({ page }) => {
    await page.route('**/aidedd.org/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Karte</p>' }));
    await fake(page);
    await start(page, chars);
    await page.locator('.hub-side [data-a="hubgo"][data-s="gm"]').click();
    await page.locator('.hub-h [data-a="campnew"]').click();
    await expect(page.locator('#cf-role')).toHaveValue('dm');
    await page.locator('#cf-name').fill('Die letzte Bastion');
    await page.locator('#cf-desc').fill('Gegen das Dunkel');
    await page.locator('[data-a="campgen"]').click();
    const code = await page.locator('#cf-room').inputValue();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    await page.locator('[data-a="campsave"]').click();
    expect((await camps(page))[0]).toMatchObject({ name: 'Die letzte Bastion', role: 'dm', room: code, chars: [] });
    await expect(page.locator('.hub-camp')).toContainText(code);
    await page.locator('.hub-camp [data-a="campplay"]').click();
    await expect(page.locator('header.dmhd h1')).toHaveText('Die letzte Bastion');
    expect(await navKeys(page)).toEqual(['cover', 'dmlive', 'dmcombat', 'explore', 'dmloot', 'dmnotes']);
    expect(await page.evaluate(() => window.__code)).toBe(code);
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1)?.camp?.n)).toBe('Die letzte Bastion');
    // Kampf mit Unterleiste: Vorbereitung der Begegnungen
    await page.locator('[data-a="tab"][data-t="dmcombat"]').click();
    await page.locator('.subnav [data-t="dmenc"]').click();
    await expect(page.locator('.dm-th')).toBeVisible();
    // Erkundung: Ort setzen, Karte nur auf Wunsch
    await page.locator('[data-a="tab"][data-t="explore"]').click();
    await expect(page.locator('#hub-map-slot')).toHaveCount(0);
    await page.locator('[data-a="mapshow"]').click();
    await expect(page.locator('#map-layer iframe')).toBeVisible();
    await page.locator('#app [data-a="dmnewhere"]').first().click();
    await page.locator('[data-a="tab"][data-t="dmnotes"]').click();
    await page.locator('#dm-ntitle').fill('Taverne zum Eber');
    await page.locator('#dm-ntitle').blur();
    await page.locator('[data-a="tab"][data-t="cover"]').click();
    await expect(page.locator('.cover-v').first()).toHaveText('Taverne zum Eber');
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1)?.here)).toBe('Taverne zum Eber');
  });

  test('Beitreten: Code, Charakter, Kampagne der Spielleitung sehen, bestätigen', async ({ page }) => {
    await fake(page, { key: 'dm-x', role: 'dm', camp: { n: 'Grenzland', d: 'Im Norden' }, here: 'Taverne' });
    await start(page, chars);
    await page.locator('.hub-hero [data-s="join"]').click();
    await page.locator('#join-code').fill('abc234');
    await page.locator('#join-char').selectOption('c2');
    await page.locator('[data-a="joinconn"]').click();
    await expect(page.locator('.join-name')).toHaveText('Grenzland');
    await page.locator('[data-a="joinok"]').click();
    expect(await camps(page)).toMatchObject([{ name: 'Grenzland', desc: 'Im Norden', role: 'player', room: 'ABC234', chars: ['c2'] }]);
    await expect(page.locator('.crumbs')).toContainText('Grenzland');
    await expect(page.locator('.camp-me')).toContainText('Borin');
    await page.locator('[data-a="tab"][data-t="explore"]').click();
    await expect(page.locator('.cover-v')).toHaveText('Taverne');
  });

  test('Ohne Kampagne: Charakterebene mit Spielansicht, Regeln über den Kopf', async ({ page }) => {
    await start(page, chars);
    await page.locator('.hub-gm', { hasText: 'Mirelle' }).click();
    expect(await navKeys(page)).toEqual(['prof', 'stats', 'inv', 'spells', 'notes', 'setup', 'main']);
    await expect(page.locator('.ov-abil > div')).toHaveCount(6);
    await expect(page.locator('.tabs.side')).toBeVisible();
    await page.locator('[data-a="tab"][data-t="wiki"]').click();
    await expect(page.locator('#wq')).toBeVisible();
    await page.locator('[data-a="tab"][data-t="prof"]').click();
    await expect(page.locator('.ov-name')).toHaveText('Mirelle');
  });

  test('Handybreite: Kampagnenübersicht und Charakterebene ohne Querscrollen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page, { ...chars, 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland mit sehr langem Namen', status: 'active', chars: ['c2'], role: 'player', room: 'ABC234' }] });
    await page.locator('[data-a="campplay"]').click();
    const over = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await over()).toBeLessThanOrEqual(0);
    await page.locator('[data-a="tab"][data-t="party"]').click();
    await page.locator('.camp-mine [data-a="crumb"]').click();
    expect(await over()).toBeLessThanOrEqual(0);
  });
});
