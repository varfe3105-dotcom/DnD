import fs from 'node:fs';
import { test, expect, seed, read, act, base4 } from './helpers.js';

const sheet = 'import/Dorinak Houndfriend Lorako.pdf', spells = 'import/Dorinak Houndfriend Lorako - spells.pdf';
const blank = () => base4({ name: '', level: 0, tab: 'setup', klass: '' });
const bySh = (page, f) => page.locator(`[data-sh="${f}"]`);

test.describe('Bogen aus PDF @new', () => {
  test.skip(!fs.existsSync(sheet), 'Beispiel-PDF liegt nur lokal');

  test('Werte werden gelesen und in der Prüfansicht gezeigt', async ({ page }) => {
    await seed(page, blank());
    await page.locator('#impf').setInputFiles(sheet);
    await expect(page.locator('.sheet-rev')).toBeVisible({ timeout: 20000 });
    await expect(bySh(page, 'name')).toHaveValue('Dorinak Houndfriend Lorako');
    await expect(bySh(page, 'klass')).toHaveValue('Ranger');
    await expect(bySh(page, 'sub')).toHaveValue('Beast Master');
    await expect(bySh(page, 'level')).toHaveValue('3');
    await expect(bySh(page, 'race')).toHaveValue('Goliath');
    await expect(bySh(page, 'ac')).toHaveValue('16');
    await expect(bySh(page, 'hpMax')).toHaveValue('34');
    await expect(bySh(page, 'speedFt')).toHaveValue('35');
    for (const [k, v] of Object.entries({ str: 16, dex: 14, con: 14, int: 8, wis: 11, cha: 12 })) await expect(bySh(page, 'abil.' + k)).toHaveValue(String(v));
    await expect(bySh(page, 'coins.gp')).toHaveValue('37');
    await expect(bySh(page, 'skillList')).toHaveValue(/Animal Handling \(2\)/);
    await expect(bySh(page, 'skillList')).toHaveValue(/Athletics/);
    await expect(bySh(page, 'spells')).toHaveValue(/Hunter's Mark.*Speak with Animals/);
    await expect(bySh(page, 'itemList')).toHaveValue(/20 Arrows/);
  });

  test('Anlegen übernimmt Werte, Gegenstände und Unbekanntes in die Notizen', async ({ page }) => {
    await seed(page, blank());
    await page.locator('#impf').setInputFiles(sheet);
    await expect(page.locator('.sheet-rev')).toBeVisible({ timeout: 20000 });
    await bySh(page, 'name').fill('Dorinak');
    await bySh(page, 'name').blur();
    await act(page, 'sheetapply').click();
    await expect(page.locator('.imp-rep')).toBeVisible();
    const s = await read(page);
    expect(s).toMatchObject({ name: 'Dorinak', klass: 'Ranger', sub: 'Beast Master', level: 3, hpMax: 34, hp: 34, ac: 16, acMode: 'manual', speed: 10.5, prof: 2 });
    expect(s.abil).toEqual({ str: 16, dex: 14, con: 14, int: 8, wis: 11, cha: 12 });
    expect(s.saves).toEqual({ str: true, dex: true });
    expect(s.skills['Animal Handling']).toBe(2);
    expect(s.skills.Perception).toBe(1);
    expect(s.gold.gp).toBe(37);
    expect(s.spells.map(x => x.n).sort()).toEqual(['Animal Friendship', 'Ensnaring Strike', 'Entangle', "Hunter's Mark", 'Speak with Animals']);
    const refs = s.bag.filter(Boolean).map(x => x.ref);
    expect(refs).toEqual(expect.arrayContaining(['item:breastplate', 'item:greatsword', 'item:crossbow-heavy', 'item:arrow', 'item:quiver', 'item:sprig-of-mistletoe', 'item:explorers-pack', 'item:sickle', 'item:carpenters-tools', 'item:healers-kit', 'item:pot-iron', 'item:shovel', 'item:clothes-travelers']));
    expect(s.bag.filter(Boolean).find(x => x.ref === 'item:arrow').q).toBe(20);
    expect(s.tools).toEqual(["Carpenter's Tools"]);
    expect(s.langs).toEqual(['Common', 'Giant', 'Druidic']);
    expect(s.info).toContain('Goliath');
    expect(s.feats.map(f => f.n)).toContain('Tough');
    expect(s.notes).toContain('Goliath');
    expect(s.notes).toContain('Favored Enemy');
  });

  test('Bogen und Zauber-PDF zusammen, Zauberliste allein ergänzt den aktiven Charakter', async ({ page }) => {
    await seed(page, base4({ name: 'Ranger', klass: 'Ranger', level: 3, tab: 'setup' }));
    await page.locator('#impf').setInputFiles(spells);
    await expect(page.locator('.sheet-rev h4')).toContainText('5', { timeout: 20000 });
    await act(page, 'sheetspells').click();
    expect((await read(page)).spells.map(x => x.n)).toContain('Ensnaring Strike');
    await expect(page.locator('.sheet-rev')).toHaveCount(0);
  });

  test('Abbrechen legt nichts an', async ({ page }) => {
    await seed(page, base4({ name: 'Bleibt', tab: 'setup' }));
    await page.locator('#impf').setInputFiles(sheet);
    await expect(page.locator('.sheet-rev')).toBeVisible({ timeout: 20000 });
    await act(page, 'sheetcancel').click();
    expect((await read(page)).name).toBe('Bleibt');
    await expect(page.locator('#char-switch')).toHaveCount(0);
  });
});

test.describe('Bogen aus Bild @new @real', () => {
  test.skip(!fs.existsSync(sheet), 'Beispiel-PDF liegt nur lokal');
  test('OCR liest ein Foto des Bogens', async ({ page }, info) => {
    test.setTimeout(180000);
    const bytes = fs.readFileSync('screenshots/sheet-photo.png');
    await seed(page, blank());
    await page.locator('#impf').setInputFiles({ name: 'bogen.png', mimeType: 'image/png', buffer: bytes });
    await expect(page.locator('.sheet-rev')).toBeVisible({ timeout: 150000 });
    const v = {};
    for (const f of ['name', 'klass', 'level', 'race', 'ac', 'hpMax', 'abil.str', 'abil.dex', 'abil.con', 'abil.int', 'abil.wis', 'abil.cha', 'skillList', 'coins.gp']) v[f] = await bySh(page, f).inputValue();
    await info.attach('ocr', { body: JSON.stringify(v, null, 1) });
    console.log('OCR-ERGEBNIS', JSON.stringify(v));
    await expect(bySh(page, 'klass')).toHaveValue('Ranger');
  });
});
