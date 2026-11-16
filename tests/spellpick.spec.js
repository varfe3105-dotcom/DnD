import { test, expect, seed, read, act, base4 } from './helpers.js';

const abil = { str: 14, dex: 14, con: 14, int: 10, wis: 16, cha: 16 };
const openLU = async page => { await act(page, 'lu').click(); await expect(page.locator('.dlg')).toBeVisible(); };

test.describe('Zauberwahl im Stufenaufstieg @new', () => {
  test('Ranger 1 → 2 (2024): Hunter\'s Mark immer vorbereitet, drei vorbereitete Zauber laut Tabelle', async ({ page }) => {
    await seed(page, base4({ klass: 'Ranger', level: 1, prof: 2, hpMax: 12, hp: 12, abil, hd: { max: 1, used: 0, die: 'W10' } }));
    expect((await read(page)).spells.find(x => x.n === "Hunter's Mark")).toMatchObject({ always: true });
    await openLU(page);
    await expect(page.locator('.lup-head')).toContainText(/0 (of|von) 3/);
    await page.locator('[data-a="lupick"][data-n="Ensnaring Strike"]').click();
    await page.locator('[data-a="lupick"][data-n="Cure Wounds"]').click();
    await page.locator('[data-a="lupick"][data-n="Hail of Thorns"]').click();
    await expect(page.locator('.lup-head')).toContainText(/3 (of|von) 3/);
    await expect(page.locator('[data-a="lupick"][data-n="Goodberry"]')).toBeDisabled();
    await expect(page.locator('[data-a="lupick"][data-n="Lesser Restoration"]')).toHaveCount(0);
    await act(page, 'luapply').click();
    const s = await read(page);
    expect(s.spells.map(x => x.n).sort()).toEqual(['Cure Wounds', 'Ensnaring Strike', 'Hail of Thorns', "Hunter's Mark"]);
  });

  test('Suche filtert die Liste, Abwählen gibt wieder frei', async ({ page }) => {
    await seed(page, base4({ klass: 'Ranger', level: 1, prof: 2, hpMax: 12, hp: 12, abil, hd: { max: 1, used: 0, die: 'W10' } }));
    await openLU(page);
    await page.locator('#lu-q').fill('goodberry');
    await expect(page.locator('[data-a="lupick"]')).toHaveCount(1);
    await page.locator('[data-a="lupick"]').click();
    await page.locator('[data-a="lupick"]').click();
    await expect(page.locator('.lup.on')).toHaveCount(0);
  });

  test('Cleric 2 → 3 mit Life Domain: Domänenzauber 2024 automatisch, vorbereitbare Zauber laut Tabelle', async ({ page }) => {
    await seed(page, base4({ klass: 'Cleric', level: 2, prof: 2, hpMax: 17, hp: 17, abil, slots: Array.from({ length: 9 }, (_, i) => ({ max: [3][i] || 0, used: 0 })), hd: { max: 2, used: 0, die: 'W8' } }));
    await openLU(page);
    await page.locator('#lu-sub').fill('Life Domain');
    await page.locator('#lu-sub').press('Tab');
    await expect(page.locator('.lup-head').last()).toContainText(/0 (of|von) 6/);
    await page.locator('[data-a="lupick"][data-n="Guiding Bolt"]').click();
    await act(page, 'luapply').click();
    const s = await read(page);
    expect(s.spells.find(x => x.n === 'Guiding Bolt')).toBeTruthy();
    expect(s.spells.filter(x => x.always).map(x => x.n).sort()).toEqual(['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration']);
  });

  test('Paladin 2 → 3 mit Oath of Devotion: Eidzauber werden eingetragen', async ({ page }) => {
    await seed(page, base4({ klass: 'Paladin', level: 2, prof: 2, hpMax: 22, hp: 22, abil, hd: { max: 2, used: 0, die: 'W10' } }));
    await openLU(page);
    await page.locator('#lu-sub').fill('Oath of Devotion');
    await page.locator('#lu-sub').press('Tab');
    await act(page, 'luapply').click();
    const s = await read(page);
    expect(s.sub).toBe('Oath of Devotion');
    expect(s.spells.filter(x => x.always).map(x => x.n).sort()).toEqual(['Divine Smite', 'Protection from Evil and Good', 'Shield of Faith']);
  });
});

test.describe('Ressourcen der Unterklassen @new', () => {
  test('Light Domain unter Einrichten: Warding Flare mit Weisheitsmodifikator, Wechsel nimmt es wieder weg', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', klass: 'Cleric', level: 3, prof: 2, abil }));
    await page.locator('[data-p="sub"]').selectOption('Light Domain');
    let s = await read(page);
    expect(s.res.find(r => r.n === 'Warding Flare')).toMatchObject({ max: 3, rest: 'long' });
    expect(s.spells.filter(x => x.always).map(x => x.n).sort()).toEqual(['Burning Hands', 'Faerie Fire', 'Scorching Ray', 'See Invisibility']);
    await page.locator('[data-p="sub"]').selectOption('Life Domain');
    s = await read(page);
    expect(s.res.find(r => r.n === 'Warding Flare')).toBeUndefined();
  });
  test('Fighter 2 → 3 als Battle Master: Überlegenheitswürfel', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 2, prof: 2, hpMax: 20, hp: 20, abil, hd: { max: 2, used: 0, die: 'W10' } }));
    await openLU(page);
    await page.locator('#lu-sub').fill('Battle Master');
    await page.locator('#lu-sub').press('Tab');
    await act(page, 'luapply').click();
    expect((await read(page)).res.find(r => r.n === 'Superiority Dice')).toMatchObject({ max: 4, rest: 'short' });
  });
});
