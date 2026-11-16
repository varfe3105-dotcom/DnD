import { test, expect, seed, read, act, base4, rest } from './helpers.js';

const abil = { str: 14, dex: 14, con: 14, int: 10, wis: 16, cha: 16 };

test.describe('Klassen 2024 @new', () => {
  test('Barde: College of Glamour wählbar, Zauber und Fähigkeiten der Unterklasse', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', klass: 'Bard', level: 6, prof: 3, abil }));
    const opts = await page.locator('[data-p="sub"] option').allTextContents();
    expect(opts.join('|')).toMatch(/College of Dance.*College of Glamour.*College of Lore.*College of Valor/);
    await page.locator('[data-p="sub"]').selectOption('College of Glamour');
    const s = await read(page);
    expect(s.spells.filter(x => x.always).map(x => x.n).sort()).toEqual(['Charm Person', 'Command', 'Mirror Image']);
    expect(s.res.map(r => r.n)).toEqual(expect.arrayContaining(['Bardic Inspiration', 'Beguiling Magic', 'Mantle of Majesty']));
  });

  test('Wiki zeigt die Klasse 2024 mit Unterklassen als Zusammenfassung', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('Bard');
    await act(page, 'wsel', '[data-key="class:Bard"]').click();
    const pane = page.locator('.wd.pane');
    await expect(pane).toContainText('Font of Inspiration');
    await expect(pane).toContainText('Mantle of Inspiration');
  });

  test('Paladin Stufe 1 hat Zauberplätze, Lay on Hands als Bonusaktion, Smite ab Stufe 2', async ({ page }) => {
    await seed(page, base4({ klass: 'Paladin', level: 0, abil }));
    await act(page, 'lu').click();
    await act(page, 'luapply').click();
    const s = await read(page);
    expect(s.klass).toBe('Paladin');
    expect(s.slots[0].max).toBe(2);
    expect(s.res.find(r => r.n === 'Lay on Hands')).toMatchObject({ max: 5 });
    expect(s.saves).toEqual({ wis: true, cha: true });
  });

  test('Channel Divinity: kurze Rast gibt nur eine Anwendung zurück', async ({ page }) => {
    await seed(page, base4({ klass: 'Cleric', level: 6, prof: 3, abil, res: [{ n: 'Channel Divinity', ic: 'star', max: 3, used: 3, rest: 'long', one: true, p: '' }] }));
    await rest(page, 'short');
    expect((await read(page)).res[0].used).toBe(2);
    await rest(page, 'long');
    expect((await read(page)).res[0].used).toBe(0);
  });

  test('Waldläufer: Favored Enemy zählt freie Hunter\'s Mark, Hail of Thorns ist eine Bonusaktion ohne Konzentration', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', klass: 'Ranger', level: 5, prof: 3, abil }));
    await page.locator('[data-p="sub"]').selectOption('Gloom Stalker');
    const s = await read(page);
    expect(s.res.find(r => r.n === 'Favored Enemy')).toMatchObject({ max: 3, rest: 'long' });
    expect(s.res.find(r => r.n === 'Dreadful Strike')).toMatchObject({ max: 3 });
    expect(s.spells.filter(x => x.always).map(x => x.n).sort()).toEqual(['Disguise Self', "Hunter's Mark", 'Rope Trick']);
    await page.locator('[data-a="tab"][data-t="wiki"]').click();
    await page.locator('#wq').fill('Hail of Thorns');
    await act(page, 'wsel', '[data-key="spell:Hail of Thorns"]').click();
    await expect(page.locator('.wd.pane')).toContainText(/bonus action/i);
    await expect(page.locator('.wd.pane')).not.toContainText(/Concentration/);
  });
});

test('Roving: Waldläufer 6 ist 3 m schneller @new', async ({ page }) => {
  await seed(page, base4({ klass: 'Ranger', level: 6, prof: 3, speed: 9 }));
  await expect(page.locator('.st', { hasText: /Speed|Tempo/ }).locator('b')).toContainText('12 m');
});

test('Spickzettel: Regeln 2024 stehen oben, Suche findet die Meisterschaften @new', async ({ page }) => {
  await page.goto((await import('./helpers.js')).URL_UNDER_TEST);
  await page.evaluate(() => { localStorage.setItem('charbogen-v4', JSON.stringify({ v: 4, tab: 'dmcheat' })); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'cheat' })); });
  await page.reload();
  await expect(page.locator('.dm-rs').first()).toHaveAttribute('data-rid', 'r24-turn');
  await page.locator('#dm-rq').fill('Nick');
  await expect(page.locator('.dm-rs[data-rid="r24-mastery"]')).toContainText(/Attack action/);
});
