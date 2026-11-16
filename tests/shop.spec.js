import { test, expect, seed, read, act, base4, spell } from './helpers.js';

const gold = (o = {}) => ({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0, ...o });
const abil = { str: 14, dex: 14, con: 14, int: 10, wis: 16, cha: 16 };

test.describe('Einkaufen und Verkaufen @new', () => {
  test('Kaufen im Wiki: Preis aus dem PHB, Wechselgeld, Gegenstand im Rucksack', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki', gold: gold({ pp: 10 }) }));
    await page.locator('#wq').fill('Component pouch');
    await expect(page.locator('.buy-p').first()).toHaveValue('25');
    await act(page, 'buy').first().click();
    const s = await read(page);
    expect(s.gold).toMatchObject({ pp: 7, gp: 5 });
    expect(s.bag.filter(Boolean).map(x => x.ref)).toContain('item:component-pouch');
  });

  test('Zu wenig Geld: nichts passiert', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki', gold: gold({ gp: 3 }) }));
    await page.locator('#wq').fill('Component pouch');
    await act(page, 'buy').first().click();
    await expect(page.locator('#toast')).toContainText(/3/);
    const s = await read(page);
    expect(s.gold.gp).toBe(3);
    expect((s.bag || []).filter(Boolean)).toHaveLength(0);
  });

  test('Verkaufen im Inventar: halber Listenpreis, ein Stück weniger', async ({ page }) => {
    const pouch = { id: 'a1', n: 'Component pouch', ic: 'bag', p: '', q: 2, slot: '', cons: false, att: false, ref: 'item:component-pouch' };
    await seed(page, base4({ tab: 'inv', gold: gold(), bag: [pouch, null, null, null, null, null] }));
    await page.locator('[data-slot="bag:0"] .it').click();
    await expect(page.locator('#sell-p')).toHaveValue('12.5');
    await act(page, 'sell').click();
    const s = await read(page);
    expect(s.gold).toMatchObject({ gp: 12, sp: 5 });
    expect(s.bag[0].q).toBe(1);
  });
});

test.describe('Zaubertausch beim Aufstieg @new', () => {
  test('Sorcerer 2024 bereitet vor: kein Tausch, dafür mehr vorbereitete Zauber laut Tabelle', async ({ page }) => {
    await seed(page, base4({ klass: 'Sorcerer', level: 2, prof: 2, hpMax: 14, hp: 14, abil, hd: { max: 2, used: 0, die: 'W6' }, spells: [spell('Magic Missile', 1, { cls: 'SW' }), spell('Sleep', 1, { cls: 'BSW' })] }));
    await act(page, 'lu').click();
    await expect(page.locator('#lu-swapold')).toHaveCount(0);
    await expect(page.locator('.lup-head').last()).toContainText(/0 (of|von) 4/);
  });

  test('Cleric und Ranger 2024 haben keinen Tausch (bereiten vor)', async ({ page }) => {
    await seed(page, base4({ klass: 'Cleric', sub: 'Life Domain', level: 2, prof: 2, hpMax: 18, hp: 18, abil, hd: { max: 2, used: 0, die: 'W8' } }));
    await act(page, 'lu').click();
    await expect(page.locator('#lu-swapold')).toHaveCount(0);
  });
});
