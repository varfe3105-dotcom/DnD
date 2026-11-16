// Schritt 2 und 3: Übernahme älterer Kampagnen (nur mit Bestätigung, als Kopie, mit Rückweg), Bibliothek und Einstieg über die Kampagne
import { test, expect, URL_UNDER_TEST } from './helpers.js';

test.use({ hub: true });
const lib = { v: 4, id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 4, hp: 25, hpMax: 30, gold: { gp: 42 }, tab: 'prof' };
const idx = [{ id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 4 }];
async function start(page, data) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const ls = (page, k) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
const openCard = async (page, name, sec = 'camps') => { await page.locator(`.hub-side [data-s="${sec}"]`).click(); await page.locator('.hub-camp', { hasText: name }).locator('[data-a="campplay"]').click(); };

test.describe('Übernahme und Bibliothek @new', () => {
  test('Spieler-Kampagne: Dialog, Kopie des aktuellen Stands, gemeinsamer Stand bleibt, Rückweg entfernt nur die Kopie', async ({ page }) => {
    await start(page, { 'charbogen-v4': lib, 'charbogen-index': idx, 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], role: 'player' }] });
    await openCard(page, 'Grenzland');
    await expect(page.locator('.dlg.mig')).toContainText('42');
    await expect(page.locator('input[name="mig-char"][value="cur"]')).toBeChecked();
    await page.locator('[data-a="migok"]').click();
    await page.locator('.crumbs', { hasText: 'Grenzland' }).waitFor();
    expect((await ls(page, 'charbogen-campaigns'))[0]).toMatchObject({ split: true, migr: { char: 'cur' } });
    expect(await ls(page, 'charbogen-v4')).toMatchObject({ camp: 'k1', level: 4, gold: { gp: 42 } });
    expect(await ls(page, 'charbogen-char-c1')).toMatchObject({ camp: null, level: 4, gold: { gp: 42 } });
    // Rückweg über „Kampagne bearbeiten“
    await page.locator('[data-a="crumbhome"]').click();
    await page.locator('.hub-side [data-s="camps"]').click();
    await page.locator('.hub-camp [data-a="campedit"]').click();
    await page.locator('[data-a="campundo"]').click();
    expect((await ls(page, 'charbogen-campaigns'))[0].split).toBe(true);
    await page.locator('[data-a="campundo"]').click();
    await expect.poll(async () => (await ls(page, 'charbogen-campaigns'))[0].split).toBe(false);
    expect(await ls(page, 'charbogen-inst-k1-c1')).toBeNull();
    expect(await ls(page, 'charbogen-v4')).toMatchObject({ camp: null, level: 4, gold: { gp: 42 } });
  });

  test('derselbe Charakter in zwei älteren Kampagnen: keine Vorbelegung, ohne Wahl passiert nichts', async ({ page }) => {
    await start(page, { 'charbogen-v4': lib, 'charbogen-index': idx, 'charbogen-campaigns': [{ id: 'k1', name: 'Alpha', status: 'active', chars: ['c1'], role: 'player' }, { id: 'k2', name: 'Beta', status: 'active', chars: ['c1'], role: 'player' }] });
    await openCard(page, 'Alpha');
    await expect(page.locator('.dlg.mig')).toContainText('Beta');
    await expect(page.locator('input[name="mig-char"]:checked')).toHaveCount(0);
    await page.locator('[data-a="migok"]').click();
    await expect(page.locator('.dlg.mig')).toBeVisible();
    expect((await ls(page, 'charbogen-campaigns')).every(c => !c.split)).toBe(true);
    await page.locator('[data-a="migcancel"]').click();
    await expect(page.locator('.dlg.mig')).toHaveCount(0);
  });

  test('Spielleitung: bisheriger Bereich geht als Kopie an eine Kampagne, die zweite beginnt leer; Original bleibt', async ({ page }) => {
    const legacy = { on: true, notes: [{ id: 'n1', kind: 'npc', title: 'Vogt Harald', body: '' }], encounters: [{ id: 'e1', name: 'Orks', monsters: [] }] };
    await start(page, { 'charbogen-v4': lib, 'charbogen-index': idx, 'charbogen-dm': legacy, 'charbogen-campaigns': [{ id: 'd1', name: 'Erste', status: 'active', chars: [], role: 'dm' }, { id: 'd2', name: 'Zweite', status: 'active', chars: [], role: 'dm' }] });
    await openCard(page, 'Erste', 'gm');
    await expect(page.locator('.dlg.mig')).toContainText(/1 (notes|Notizen), 1 (encounters|Begegnungen)/);
    await page.locator('input[name="mig-dm"][value="this"]').check();
    await page.locator('[data-a="migok"]').click();
    await page.locator('[data-a="tab"][data-t="dmnotes"]').click();
    await expect(page.locator('.wli')).toHaveText([/Vogt Harald/]);
    await page.locator('[data-a="crumbhome"]').click();
    await openCard(page, 'Zweite', 'gm');
    await expect(page.locator('.dlg.mig')).toContainText(/Erste/);
    await page.locator('input[name="mig-dm"][value="empty"]').check();
    await page.locator('[data-a="migok"]').click();
    await page.locator('[data-a="tab"][data-t="dmnotes"]').click();
    await expect(page.locator('.wli')).toHaveCount(0);
    expect((await ls(page, 'charbogen-dm-camp-d1')).notes.map(n => n.title)).toEqual(['Vogt Harald']);
    expect((await ls(page, 'charbogen-dm')).notes.map(n => n.title)).toEqual(['Vogt Harald']);
  });

  test('Bibliothek: Stände je Kampagne sehen, zuordnen, Grundbogen ohne Spielbetrieb; Gruppe öffnet über die Kampagne', async ({ page }) => {
    await start(page, { 'charbogen-v4': lib, 'charbogen-index': idx, 'charbogen-inst-k1-c1': { ...lib, camp: 'k1', level: 6, hp: 50, hpMax: 52 }, 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], role: 'player', split: true }, { id: 'k2', name: 'Küste', status: 'active', chars: [], role: 'player', split: true }] });
    await page.locator('.hub-side [data-s="chars"]').click();
    const card = page.locator('.hub-char', { hasText: 'Mirelle' });
    await expect(card.locator('.lib-camps')).toContainText(/Grenzland.*(level|Stufe) 6/);
    await card.locator('#lib-add-c1').selectOption('k2');
    await card.locator('[data-a="libadd"]').click();
    expect((await ls(page, 'charbogen-campaigns'))[1].chars).toEqual(['c1']);
    await expect(card.locator('.lib-camps')).toContainText(/Küste/);
    // Grundbogen: Bibliothek mit Hinweis, ohne Kampf und Rasten
    await card.locator('[data-a="hubplay"][data-lib="1"]').click();
    await expect(page.locator('.lib-banner')).toBeVisible();
    await expect(page.locator('[data-a="tab"][data-t="main"], [data-a="rest"]')).toHaveCount(0);
    // Dashboard-Gruppe öffnet über die Kampagne
    await page.locator('[data-a="crumbhome"]').click();
    await page.locator('.hub-gm', { hasText: 'Mirelle' }).click();
    await expect(page.locator('.crumbs')).toContainText(/Grenzland|Küste/);
    expect((await ls(page, 'charbogen-v4')).camp).not.toBeNull();
  });

  test('Stand bewusst als Grundbogen übernehmen (z. B. nach dem Assistenten beim Beitritt)', async ({ page }) => {
    await start(page, { 'charbogen-v4': lib, 'charbogen-index': idx, 'charbogen-inst-k1-c1': { ...lib, camp: 'k1', level: 6 }, 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], role: 'player', split: true }] });
    await openCard(page, 'Grenzland');
    await page.locator('[data-a="tab"][data-t="party"]').click();
    await page.locator('.camp-mine [data-a="crumb"]').click();
    await page.locator('[data-a="tab"][data-t="setup"]').click();
    await page.locator('[data-a="tolib"]').click();
    expect((await ls(page, 'charbogen-char-c1')).level).toBe(4);
    await page.locator('[data-a="tolib"]').click();
    await expect.poll(async () => (await ls(page, 'charbogen-char-c1')).level).toBe(6);
    expect((await ls(page, 'charbogen-char-c1')).camp).toBeNull();
  });
});
