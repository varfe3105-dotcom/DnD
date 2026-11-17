// Gesamtauftrag Etappe B/D: globale Leiste auf allen Ebenen, Kopfleiste und Menü am Handy, Kampagneneinstellungen
// (Fortschritt Meilensteine/XP ohne Datenverlust, Hausregeln im Wiki, Löschen nur mit Namen).
import { test, expect, URL_UNDER_TEST } from './helpers.js';

test.use({ hub: true });
const lib = { v: 4, id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 5, xp: 7200, hp: 30, hpMax: 38, tab: 'prof' };
const camps = [
  { id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], role: 'player', split: true },
  { id: 'd1', name: 'Die letzte Bastion', status: 'active', chars: [], role: 'dm', split: true },
];
async function start(page, extra = {}) {
  await page.goto(URL_UNDER_TEST);
  const data = { 'charbogen-lang': 'de', 'charbogen-v4': lib, 'charbogen-char-c1': lib, 'charbogen-index': [{ id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 5 }], 'charbogen-campaigns': camps, ...extra };
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const play = (page, name) => page.locator('.hub-camp', { hasText: name }).locator('[data-a="campplay"]').click();
const campsNow = page => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-campaigns') || '[]'));

test.describe('Rahmen @new', () => {
  test('Desktop: globale Leiste in Kampagne und Charakter, einklappbar und gemerkt', async ({ page }) => {
    await start(page);
    await page.locator('.hub-side [data-a="hubgo"][data-s="camps"]').click();
    await play(page, 'Grenzland');
    const rail = page.locator('.rail');
    await expect(rail).toBeVisible();
    await expect(rail.locator('[data-s="camps"]')).toHaveAttribute('aria-current', 'true');
    // Mein Charakter ist Teil der Kampagnenreiter; im Charakter führt der erste Eintrag zurück
    await page.locator('.tabs [data-a="tab"][data-t="prof"]').click();
    await expect(rail).toBeVisible();
    await expect(page.locator('.tabs [data-t="cover"]')).toContainText('Zur Kampagne');
    await rail.locator('[data-a="railfold"]').click();
    await expect(page.locator('.shell')).toHaveClass(/folded/);
    await page.reload();
    await expect(page.locator('.shell')).toHaveClass(/folded/);
    // Globale Bereiche bleiben erreichbar
    await rail.locator('[data-a="hubgo"][data-s="chars"]').click();
    await expect(page.locator('.hub')).toHaveAttribute('data-sec', 'chars');
  });

  test('Handy: schmale Kopfleiste, Knöpfe im Menü, unten fünf Bereiche und „Mehr“', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page);
    await page.locator('.hub-side [data-a="hubgo"][data-s="camps"]').click();
    await play(page, 'Grenzland');
    await expect(page.locator('.mtop')).toBeVisible();
    await expect(page.locator('.mtop')).toContainText('Grenzland');
    await expect(page.locator('.crumbs')).toBeHidden();
    await expect(page.locator('header.hd .hacts')).toBeHidden();
    // Titelplatte nimmt höchstens ein Viertel des Bildschirms ein
    const hb = await page.locator('header.hd').boundingBox();
    expect(hb.height).toBeLessThan(844 / 4);
    const shown = await page.locator('.tabs nav > button').evaluateAll(b => b.filter(x => getComputedStyle(x).display !== 'none').map(x => x.dataset.t || 'more'));
    expect(shown).toEqual(['cover', 'party', 'prof', 'main', 'explore', 'more']);
    await page.locator('.tab-more').click();
    const menu = page.locator('.mmenu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('[data-a="rest"][data-r="long"]')).toBeVisible();
    await menu.locator('[data-a="tab"][data-t="chron"]').click();
    await expect(menu).toHaveCount(0);
    await expect(page.locator('.tab-more')).toHaveAttribute('aria-selected', 'true');
    // Escape schließt das Menü
    await page.locator('.mt-menu').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mmenu')).toHaveCount(0);
    // Kein waagrechter Überlauf
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
});

test.describe('Kampagneneinstellungen @new', () => {
  test('Fortschritt: Meilensteine Standard, XP wahlweise; XP-Werte bleiben erhalten', async ({ page }) => {
    await start(page);
    await page.locator('.hub-side [data-a="hubgo"][data-s="camps"]').click();
    await play(page, 'Grenzland');
    await page.locator('.tabs [data-a="tab"][data-t="prof"]').click();
    // Meilensteine: keine XP-Anzeige, Wert bleibt gespeichert
    await expect(page.locator('.xpl')).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-inst-k1-c1') || localStorage.getItem('charbogen-v4')).xp)).toBe(7200);
    // Spielleitung der eigenen Kampagne stellt auf XP (hier: Kampagneneintrag direkt, wie ihn die Presence überträgt)
    await page.evaluate(() => { const l = JSON.parse(localStorage.getItem('charbogen-campaigns')); l[0].prog = 'xp'; localStorage.setItem('charbogen-campaigns', JSON.stringify(l)); });
    await page.reload();
    await expect(page.locator('.xpl')).toContainText('7.200');
  });

  test('Spielleitung: Einstellungen, Hausregel im Wiki, XP-Verteilung nur im XP-Modus, Löschen nur mit Namen', async ({ page }) => {
    await start(page, { 'charbogen-dm': { on: true } });
    await page.locator('.hub-side [data-a="hubgo"][data-s="gm"]').click();
    await play(page, 'Die letzte Bastion');
    await page.locator('.tabs [data-a="tab"][data-t="dmset"]').click();
    await expect(page.locator('.cs-top h2')).toHaveText('Kampagneneinstellungen');
    // Allgemeines
    await page.locator('#cs-chapter').fill('Kapitel 2');
    await page.locator('[data-a="cssave"]').click();
    expect((await campsNow(page)).find(c => c.id === 'd1').chapter).toBe('Kapitel 2');
    // Fortschritt
    await expect(page.locator('[data-a="csprog"][data-v="ms"]')).toHaveAttribute('aria-checked', 'true');
    await page.locator('.tabs [data-a="tab"][data-t="dmcombat"]').click();
    await expect(page.locator('[data-a="dmxpopen"]')).toHaveCount(0);
    await page.locator('.tabs [data-a="tab"][data-t="dmset"]').click();
    await page.locator('[data-a="csprog"][data-v="xp"]').click();
    expect((await campsNow(page)).find(c => c.id === 'd1').prog).toBe('xp');
    await page.locator('.tabs [data-a="tab"][data-t="dmcombat"]').click();
    await expect(page.locator('[data-a="dmxpopen"]').first()).toBeVisible();
    // Hausregel anlegen, bearbeiten, im Wiki finden
    await page.locator('.tabs [data-a="tab"][data-t="dmset"]').click();
    await page.locator('#hr-t').fill('Tränke als Bonusaktion');
    await page.locator('#hr-x').fill('Einen Heiltrank selbst zu trinken kostet eine Bonusaktion und heilt den Höchstwert.');
    await page.locator('[data-a="hrsave"]').click();
    await expect(page.locator('.house-r')).toContainText('Tränke als Bonusaktion');
    await page.locator('[data-a="hredit"]').click();
    await page.locator('#hr-t').fill('Heiltränke als Bonusaktion');
    await page.locator('[data-a="hrsave"]').click();
    await expect(page.locator('.house-r')).toHaveCount(1);
    await page.locator('.tabs [data-a="tab"][data-t="wiki"]').click();
    await page.locator('#wq').fill('Heiltränke als');
    await expect(page.locator('.wli').first()).toContainText('Heiltränke als Bonusaktion');
    await page.locator('[data-a="wf"][data-f="house"]').click();
    await expect(page.locator('.wd')).toContainText('Hausregeln der Kampagne');
    // Löschen: falscher Name bricht ab, richtiger Name löscht
    await page.locator('.tabs [data-a="tab"][data-t="dmset"]').click();
    await page.locator('.cs-danger [data-a="csdel"]').click();
    await page.locator('#cs-delname').fill('Falsch');
    await page.locator('.cs-danger [data-a="csdel"]').click();
    expect((await campsNow(page)).some(c => c.id === 'd1')).toBe(true);
    await page.locator('#cs-delname').fill('Die letzte Bastion');
    await page.locator('.cs-danger [data-a="csdel"]').click();
    await expect(page.locator('.hub')).toHaveAttribute('data-sec', 'gm');
    expect((await campsNow(page)).some(c => c.id === 'd1')).toBe(false);
  });
});

test.describe('Begegnung starten @new', () => {
  test('Auswahl vor dem Start: abwählen, Anzahl, weitere hinzufügen; Vorbereitung bleibt, Neustart setzt zurück', async ({ page }) => {
    const enc = { id: 'e1', name: 'Hinterhalt', monsters: [{ id: 'goblin-warrior', qty: 3 }, { id: 'ogre', qty: 1 }] };
    await start(page, { 'charbogen-dm': { on: true }, 'charbogen-dm-camp-d1': { encounters: [enc], encSel: 'e1', combat: { round: 1, active: null, list: [] } } });
    await page.locator('.hub-side [data-a="hubgo"][data-s="gm"]').click();
    await play(page, 'Die letzte Bastion');
    await page.locator('.tabs [data-a="tab"][data-t="dmcombat"]').click();
    await page.locator('[data-a="dmestart"]').first().click();
    const dlg = page.locator('.sp-dlg');
    await expect(dlg.locator('.sp-row')).toHaveCount(2);
    await expect(dlg).toContainText('SRD 5.2.1');
    await dlg.locator('[data-a="spqty"][data-i="0"][data-d="-1"]').click();
    await dlg.locator('[data-a="spon"][data-i="1"]').click();
    await page.locator('#sp-q').fill('Wolf');
    await dlg.locator('[data-a="spadd"]').first().click();
    await expect(dlg.locator('[data-a="spgo"]')).toContainText('3');
    await dlg.locator('[data-a="spgo"]').click();
    const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm-camp-d1')));
    const mons = (await st()).combat.list.filter(c => c.kind === 'mon');
    expect(mons.map(c => c.mon).sort()).toEqual(['goblin-warrior', 'goblin-warrior', 'wolf']);
    expect((await st()).encounters[0].monsters).toEqual(enc.monsters);
    // Gegner besiegen: bleibt mit 0 TP stehen; Neustart setzt auf die vorbereiteten Werte zurück
    await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('charbogen-dm-camp-d1')); d.combat.list[0].hp = 0; localStorage.setItem('charbogen-dm-camp-d1', JSON.stringify(d)); });
    await page.reload();
    expect((await st()).combat.list.filter(c => c.kind === 'mon' && c.hp === 0)).toHaveLength(1);
    await page.locator('.tabs [data-a="tab"][data-t="dmcombat"]').click();
    await page.locator('[data-a="dmestart"]').first().click();
    await page.locator('.sp-dlg [data-a="spgo"]').click();
    const again = (await st()).combat.list.filter(c => c.kind === 'mon');
    expect(again).toHaveLength(4);
    expect(again.every(c => c.hp === c.hpMax && c.hp > 0)).toBe(true);
  });
});
