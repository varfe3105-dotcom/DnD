import { test, expect, seed, read, act, base4 } from './helpers.js';

const abil = { str: 14, dex: 14, con: 14, int: 10, wis: 16, cha: 16 };
const openLU = async page => { await act(page, 'lu').click(); await expect(page.locator('.dlg')).toBeVisible(); };

test.describe('Zauberwahl im Stufenaufstieg @new', () => {
  test('Ranger 1 → 2: genau zwei bekannte Zauber, danach gesperrt, werden eingetragen', async ({ page }) => {
    await seed(page, base4({ klass: 'Ranger', level: 1, prof: 2, hpMax: 12, hp: 12, abil, hd: { max: 1, used: 0, die: 'W10' } }));
    await openLU(page);
    await expect(page.locator('.lup-head')).toContainText(/0 (of|von) 2/);
    await page.locator('[data-a="lupick"][data-n="Hunter\'s Mark"]').click();
    await page.locator('[data-a="lupick"][data-n="Cure Wounds"]').click();
    await expect(page.locator('.lup-head')).toContainText(/2 (of|von) 2/);
    await expect(page.locator('[data-a="lupick"][data-n="Goodberry"]')).toBeDisabled();
    await expect(page.locator('[data-a="lupick"][data-n="Lesser Restoration"]')).toHaveCount(0);
    await act(page, 'luapply').click();
    const s = await read(page);
    expect(s.spells.map(x => x.n).sort()).toEqual(['Cure Wounds', "Hunter's Mark"]);
  });

  test('Suche filtert die Liste, Abwählen gibt wieder frei', async ({ page }) => {
    await seed(page, base4({ klass: 'Ranger', level: 1, prof: 2, hpMax: 12, hp: 12, abil, hd: { max: 1, used: 0, die: 'W10' } }));
    await openLU(page);
    await page.locator('#lu-q').fill('hunter');
    await expect(page.locator('[data-a="lupick"]')).toHaveCount(1);
    await page.locator('[data-a="lupick"]').click();
    await page.locator('[data-a="lupick"]').click();
    await expect(page.locator('.lup.on')).toHaveCount(0);
  });

  test('Cleric (Life) 1 → 2: Domänenzauber automatisch, vorbereitbare Zauber begrenzt', async ({ page }) => {
    await seed(page, base4({ klass: 'Cleric', sub: 'Life Domain', level: 1, prof: 2, hpMax: 10, hp: 10, abil, hd: { max: 1, used: 0, die: 'W8' } }));
    let s = await read(page);
    expect(s.spells.filter(x => x.always).map(x => x.n).sort()).toEqual(['Bless', 'Cure Wounds']);
    await openLU(page);
    await expect(page.locator('.lup-head')).toContainText(/0 (of|von) 5/);
    await expect(page.locator('[data-a="lupick"][data-n="Bless"]')).toHaveCount(0);
    await page.locator('[data-a="lupick"][data-n="Guiding Bolt"]').click();
    await act(page, 'luapply').click();
    s = await read(page);
    expect(s.spells.find(x => x.n === 'Guiding Bolt')).toBeTruthy();
  });

  test('Paladin 2 → 3 mit Oath of Devotion: Eidzauber werden eingetragen', async ({ page }) => {
    await seed(page, base4({ klass: 'Paladin', level: 2, prof: 2, hpMax: 22, hp: 22, abil, hd: { max: 2, used: 0, die: 'W10' } }));
    await openLU(page);
    await page.locator('#lu-sub').fill('Oath of Devotion');
    await page.locator('#lu-sub').press('Tab');
    await act(page, 'luapply').click();
    const s = await read(page);
    expect(s.sub).toBe('Oath of Devotion');
    expect(s.spells.filter(x => x.always).map(x => x.n).sort()).toEqual(['Protection from Evil and Good', 'Sanctuary']);
  });
});

test.describe('Ressourcen der Unterklassen @new', () => {
  test('Light Domain unter Einrichten: Warding Flare mit Weisheitsmodifikator, Wechsel nimmt es wieder weg', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', klass: 'Cleric', level: 1, prof: 2, abil }));
    await page.locator('[data-p="sub"]').selectOption('Light Domain');
    let s = await read(page);
    expect(s.res.find(r => r.n === 'Warding Flare')).toMatchObject({ max: 3, rest: 'long' });
    expect(s.spells.filter(x => x.always).map(x => x.n).sort()).toEqual(['Burning Hands', 'Faerie Fire']);
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
