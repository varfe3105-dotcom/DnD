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

test.describe('Unterklassen und Talente @new', () => {
  test('Unterklassen-Merkmale werden automatisch eingetragen', async ({ page }) => {
    await seed(page, start('Wizard'));
    for (let l = 1; l <= 2; l++) await levelUp(page, 'School of Evocation');
    const s = await read(page);
    expect(s.feats.map(f => f.n)).toEqual(expect.arrayContaining(['Evocation Savant', 'Sculpt Spells']));
    expect(s.feats.find(f => f.n === 'Sculpt Spells').src).toBe('Unterklasse');
    expect(s.feats.some(f => /neues Merkmal|new feature/.test(f.n))).toBe(false);
  });

  test('Merkmal auf späterer Stufe kommt aus der gewählten Unterklasse', async ({ page }) => {
    await seed(page, start('Fighter'));
    for (let l = 1; l <= 7; l++) await levelUp(page, 'Champion');
    const s = await read(page);
    expect(s.feats.map(f => f.n)).toEqual(expect.arrayContaining(['Improved Critical', 'Remarkable Athlete']));
  });

  test('Alle Unterklassen decken ihre Merkmalsstufen ab', async () => {
    const fs = await import('node:fs');
    const sub = JSON.parse(fs.readFileSync('data/subclasses.json', 'utf8'));
    const cls = JSON.parse(fs.readFileSync('data/classes.json', 'utf8'));
    let n = 0;
    for (const [k, C] of Object.entries(cls)) for (const name of C.subs) {
      const d = sub[k]?.[name];
      expect(d, `${k}/${name}`).toBeTruthy();
      for (const l of C.sl) expect(d[l]?.length, `${k}/${name}/${l}`).toBeGreaterThan(0);
      Object.values(d).flat().forEach(f => { expect(f.text.en, f.n).toBeTruthy(); expect(f.text.de, f.n).toBeTruthy(); });
      n++;
    }
    expect(n).toBeGreaterThanOrEqual(39);
  });

  test('Talent wählen: Voraussetzung gesperrt, Attribut steigt, Text wird eingetragen', async ({ page }) => {
    await seed(page, { ...start('Fighter'), level: 3, hpMax: 28, hp: 28, sub: 'Champion', abil: { str: 12, dex: 14, con: 14, int: 10, wis: 10, cha: 10 }, hd: { max: 3, used: 0, die: 'W10' } });
    await act(page, 'lu').click();
    await page.locator('#lu-asi').selectOption('feat');
    await expect(page.locator('#lu-feat')).toBeVisible();
    await expect(page.locator('#lu-feat option[value="Grappler"]')).toBeDisabled();
    await page.locator('#lu-feat').selectOption('Athlete');
    await page.locator('#lu-featab').selectOption('dex');
    await act(page, 'luapply').click();
    await expect(page.locator('.dlg')).toHaveCount(0);
    const s = await read(page);
    expect(s.abil.dex).toBe(15);
    const f = s.feats.find(x => x.n === 'Athlete');
    expect(f.src).toBe('Talent');
    expect(f.p).toContain('STR or DEX');
  });

  test('Tough erhöht die TP rückwirkend und künftig', async ({ page }) => {
    await seed(page, { ...start('Fighter'), level: 3, hpMax: 28, hp: 28, sub: 'Champion', hd: { max: 3, used: 0, die: 'W10' } });
    await act(page, 'lu').click();
    await page.locator('#lu-asi').selectOption('feat');
    await page.locator('#lu-feat').selectOption('Tough');
    await act(page, 'luapply').click();
    expect((await read(page)).hpMax).toBe(28 + 8 + 8);
    await act(page, 'lu').click();
    await act(page, 'luapply').click();
    expect((await read(page)).hpMax).toBe(44 + 8 + 2);
  });

  test('Kampfstil, Metamagie und Anrufungen sind wählbar', async ({ page }) => {
    await seed(page, start('Warlock'));
    await levelUp(page, 'The Fiend');
    await act(page, 'lu').click();
    await page.locator('#lu-invocations0').selectOption('Agonizing Blast');
    await page.locator('#lu-invocations1').selectOption("Devil's Sight");
    await act(page, 'luapply').click();
    const s = await read(page);
    expect(s.feats.map(f => f.n)).toEqual(expect.arrayContaining(['Agonizing Blast', "Devil's Sight"]));
  });

  test('Merkmalstexte folgen der Sprache', async ({ page }) => {
    await seed(page, start('Wizard'));
    for (let l = 1; l <= 2; l++) await levelUp(page, 'School of Evocation');
    await page.locator('[data-a="lang"][data-l="de"]').click();
    await page.locator('.feat', { hasText: 'Sculpt Spells' }).locator('summary').click();
    await expect(page.locator('.feat', { hasText: 'Sculpt Spells' })).toContainText('schützt');
  });

  test('Talente im Wiki mit Voraussetzung', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await act(page, 'wf', '[data-f="feat"]').click();
    await act(page, 'wsel', '[data-key="feat:Grappler"]').click();
    await expect(page.locator('.wd.pane')).toContainText('Strength 13');
  });
});
