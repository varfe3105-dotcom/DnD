// Charakterbereich: Übersicht (Titelblatt), Werte & Fähigkeiten, Inventar als Liste mit Detail, Zauberbuch, Tagebuch
import { test, expect, seed, read, base4 } from './helpers.js';

test.use({ invGrid: false });
const tab = (page, k) => page.locator(`[data-a="tab"][data-t="${k}"]`).click();
const sword = { id: 'i1', ref: 'item:longsword', n: 'Longsword', ic: 'sword', q: 1, slot: 'hand' };
const potion = { id: 'i2', ref: 'potion:potion-of-healing', n: 'Potion of Healing', ic: 'potion', q: 2, cons: true };
const rope = { id: 'i3', n: 'Seil', ic: 'box', q: 1, p: '15 m Hanfseil' };
const ch = o => base4({ tab: 'prof', klass: 'Fighter', level: 3, hp: 14, hpMax: 28, eq: { main: sword }, bag: [potion, rope], cond: { Poisoned: true }, res: [{ n: 'Second Wind', ic: 'heart', max: 2, used: 1, rest: 'short', p: '' }], ...o });

test.describe('Charakterbereich @new', () => {
  test('Übersicht: TP, RK, Initiative, Tempo; Jetzt und Gerüstet kompakt; Beschreibung direkt bearbeiten', async ({ page }) => {
    await seed(page, ch({ info: '' }));
    await expect(page.locator('.ov-v.hp b')).toContainText('14');
    await expect(page.locator('.ov-v')).toHaveCount(4);
    await expect(page.locator('.ov-abil > div')).toHaveCount(6);
    await expect(page.locator('.ov-col .tag.t-bad')).toHaveText('Poisoned');
    await expect(page.locator('.ov-res')).toContainText('Second Wind');
    await expect(page.locator('.ov-gear')).toContainText(/Longsword|Langschwert/);
    // Keine vollständigen Listen auf der Übersicht
    await expect(page.locator('.skgrid, .sp, .bag')).toHaveCount(0);
    await page.locator('[data-a="ovedit"]').click();
    await page.locator('#ov-info').fill('Söldnerin aus dem Norden');
    await page.locator('#ov-info').blur();
    await page.locator('[data-a="ovedit"]').click();
    await expect(page.locator('.ov-descp')).toHaveText('Söldnerin aus dem Norden');
    expect((await read(page)).info).toBe('Söldnerin aus dem Norden');
  });

  test('Werte & Fähigkeiten: Medaillons, Seitenblock mit TP und Trefferwürfeln, Erklärung an Fertigkeiten, Merkmale gruppiert', async ({ page }) => {
    await seed(page, ch({ tab: 'stats', skills: { Athletics: 1 }, feats: [{ n: 'Alert', p: '', src: 'Talent' }], hd: { max: 3, used: 1, die: 'W10' } }));
    await expect(page.locator('.stats-medals .abw')).toHaveCount(6);
    await expect(page.locator('.sv-row', { hasText: /Hit dice|Trefferwürfel/ }).locator('b')).toHaveText('2/3');
    await expect(page.locator('.skr', { hasText: 'Athletics' })).toHaveAttribute('title', /\+2/);
    await expect(page.locator('.feat-grp')).toContainText([/Feats|Talente/]);
  });

  test('Inventar: Ausgerüstetes abgesetzt, Filter, Detail daneben, Raster bleibt als Ansicht', async ({ page }) => {
    await seed(page, ch({ tab: 'inv' }));
    await expect(page.locator('.il.eqd .ilr')).toHaveCount(1);
    await expect(page.locator('.il:not(.eqd) .ilr')).toHaveCount(2);
    await page.locator('[data-a="invf"][data-f="cons"]').click();
    await expect(page.locator('.ilr')).toHaveCount(1);
    await page.locator('.ilr').click();
    await expect(page.locator('.inv-r .selp')).toBeVisible();
    await expect(page.locator('.inv-r [data-a="use"]')).toBeVisible();
    await page.locator('[data-a="invview"][data-v="grid"]').click();
    await expect(page.locator('.bag .cell').first()).toBeVisible();
    expect((await read(page)).bag.filter(Boolean)).toHaveLength(2);
  });

  test('Zauberbuch: Plätze als Siegel, Konzentrationsmarke, kein Löschen', async ({ page }) => {
    const slots = Array.from({ length: 9 }, (_, i) => (i === 0 ? { max: 3, used: 1 } : { max: 0, used: 0 }));
    await seed(page, base4({ tab: 'spells', klass: 'Wizard', level: 1, slots, spells: [{ n: 'Shield', lvl: 1, ic: 'shield', src: 'sum' }, { n: 'Detect Magic', lvl: 1, ic: 'eye', src: 'sum' }] }));
    await expect(page.locator('.spellbook .pip.on')).toHaveCount(2);
    await expect(page.locator('.spellbook .pip:not(.on)')).toHaveCount(1);
    await expect(page.locator('.sp', { hasText: 'Detect Magic' }).locator('.tag.t-conc')).toBeVisible();
    await expect(page.locator('.spellbook [data-a="spdel"], .spellbook .del')).toHaveCount(0);
  });

  test('Tagebuch: Vorlage legt eine Seite an, Text bleibt beim Charakter', async ({ page }) => {
    await seed(page, base4({ tab: 'notes' }));
    await page.locator('[data-a="nptpl"][data-k="goals"]').click();
    await expect(page.locator('#np-title')).toHaveValue(/Goals|Ziele/);
    await page.locator('#notes').fill('Den Turm von Arrenhall finden');
    await page.locator('#notes').blur();
    await expect.poll(async () => (await read(page)).notePages[0]?.text).toBe('Den Turm von Arrenhall finden');
    await expect(page.locator('[data-a="nptpl"][data-k="goals"]')).toHaveCount(0);
  });
});
