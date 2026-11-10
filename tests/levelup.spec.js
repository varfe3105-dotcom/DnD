import { test, expect, seed, read, act, base4 } from './helpers.js';

const start = (klass, con = 14) => ({ v: 4, name: 'Aufsteiger', klass, level: 0, hp: 10, hpMax: 10, prof: 2, abil: { str: 14, dex: 14, con, int: 14, wis: 12, cha: 14 }, tab: 'main' });

/** Führt einen Aufstieg aus und füllt die nötigen Pflichtfelder. */
async function levelUp(page, sub) {
  await act(page, 'lu').click();
  await expect(page.locator('.dlg')).toBeVisible();
  const subIn = page.locator('#lu-sub');
  if (await subIn.count()) { await subIn.fill(sub); await subIn.blur(); }
  const a1 = page.locator('#lu-a1');
  if (await a1.count()) {
    await a1.selectOption('str');
    await page.locator('#lu-a2').selectOption('dex');
  }
  await act(page, 'luapply').click();
  await expect(page.locator('.dlg')).toHaveCount(0);
}

test.describe('Stufenaufstieg 1 bis 5', () => {
  test('Wizard: TP, Plätze, Übung, Arcane Recovery, ASI', async ({ page }) => {
    await seed(page, start('Wizard'));
    const hpAt = [8, 14, 20, 26, 32];
    const firstSlots = [2, 3, 4, 4, 4];
    for (let l = 1; l <= 5; l++) {
      await levelUp(page, 'School of Evocation');
      const s = await read(page);
      expect(s.level).toBe(l);
      expect(s.hpMax).toBe(hpAt[l - 1]);
      expect(s.slots[0].max).toBe(firstSlots[l - 1]);
    }
    const s = await read(page);
    expect(s.prof).toBe(3);
    expect(s.slots.slice(0, 3).map(x => x.max)).toEqual([4, 3, 2]);
    expect(s.saves).toEqual({ int: true, wis: true });
    expect(s.sub).toBe('School of Evocation');
    expect(s.hd).toMatchObject({ max: 5, die: 'W6' });
    expect(s.abil.str).toBe(15);
    expect(s.abil.dex).toBe(15);
    expect(s.res.find(r => r.n === 'Arcane Recovery').p).toContain('3');
    expect(s.cls).toBe('W');
  });

  test('Fighter: Second Wind, Action Surge, Extra Attack, keine Plätze', async ({ page }) => {
    await seed(page, start('Fighter'));
    const hpAt = [12, 20, 28, 36, 44];
    for (let l = 1; l <= 5; l++) {
      await levelUp(page, 'Champion');
      expect((await read(page)).hpMax).toBe(hpAt[l - 1]);
    }
    const s = await read(page);
    expect(s.res.map(r => r.n)).toEqual(['Second Wind', 'Action Surge']);
    expect(s.res[0].p).toMatch(/1[dW]10\+5/);
    expect(s.feats.map(f => f.n)).toEqual(expect.arrayContaining(['Fighting Style', 'Extra Attack']));
    expect(s.slots.every(x => x.max === 0)).toBe(true);
    expect(s.prof).toBe(3);
  });

  test('Warlock: Paktmagie steigt auf 2 Plätze Grad 3', async ({ page }) => {
    await seed(page, start('Warlock'));
    const pact = [[1, 1], [2, 1], [2, 2], [2, 2], [2, 3]];
    for (let l = 1; l <= 5; l++) {
      await levelUp(page, 'The Fiend');
      const s = await read(page);
      expect([s.pact.max, s.pact.lvl]).toEqual(pact[l - 1]);
    }
    const s = await read(page);
    expect(s.slots.every(x => x.max === 0)).toBe(true);
    expect(s.hpMax).toBe(8 + 2 + 4 * (5 + 2));
  });

  test('Abbrechen ändert nichts', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 3 }));
    await act(page, 'lu').click();
    await act(page, 'luclose').click();
    const s = await read(page);
    expect(s.level).toBe(3);
  });

  test('ohne Klasse führt der Aufstieg zum Einrichten', async ({ page }) => {
    await seed(page, base4({ level: 0 }));
    await act(page, 'lu').click();
    await expect(page.locator('.dlg')).toHaveCount(0);
    await expect(page.locator('[data-a="tab"][data-t="setup"]')).toHaveAttribute('aria-selected', 'true');
  });
});
