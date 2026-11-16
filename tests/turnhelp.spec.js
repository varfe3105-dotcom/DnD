import { test, expect, seed, act, base4, spell, item } from './helpers.js';

const bagOf = (...x) => { const b = Array(24).fill(null); x.forEach((v, i) => { b[i] = v; }); return b; };
const sword = (id, ref, n) => item(id, n, { ref, slot: 'hand', att: true });

test.describe('Zugübersicht @new', () => {
  test('Aktionen nach 2024, eigene Zauber nach Zeitaufwand, Tränke und Merkmale als Bonusaktion', async ({ page }) => {
    await seed(page, base4({ klass: 'Cleric', level: 3, spells: [spell('Healing Word', 1), spell('Shield', 1), spell('Fireball', 3)], res: [{ n: 'Cunning Action', ic: 'key', max: 99, used: 0, rest: 'none', p: '' }], bag: bagOf(item('p', 'Potion of Healing', { ref: 'potion:potion-of-healing', cons: true })) }));
    const tv = page.locator('.turnov');
    await tv.locator('summary').click();
    const sec = n => tv.locator('.tv-sec').nth(n);
    await expect(sec(0)).toContainText('Disengage');
    await expect(sec(0)).toContainText('Fireball');
    await expect(sec(1)).toContainText('Healing Word');
    await expect(sec(1)).toContainText('Cunning Action');
    await expect(sec(1)).toContainText(/potion/i);
    await expect(sec(2)).toContainText('Shield');
    await expect(sec(2)).toContainText(/Opportunity/);
    await expect(tv).toContainText(/grappling and shoving replace an attack/);
    // Bleibt nach dem Neuzeichnen offen
    await act(page, 'insp').click();
    await expect(page.locator('.turnov')).toHaveAttribute('open', '');
  });

  test('zwei leichte Waffen: Zweitangriff als Bonusaktion, mit Nick als Teil der Angriffsaktion', async ({ page }) => {
    await seed(page, base4({ klass: 'Rogue', level: 1, eq: { main: sword('a', 'item:shortsword', 'Shortsword'), off: sword('b', 'item:scimitar', 'Scimitar') } }));
    await page.locator('.turnov summary').click();
    await expect(page.locator('.turnov .tv-sec').nth(1)).toContainText(/off-hand/);
    await expect(page.locator('.turnov .tv-sec').nth(1)).not.toContainText(/Nick/);
    await act(page, 'wmast', '[data-w="item:scimitar"]').click();
    await expect(page.locator('.turnov .tv-sec').nth(1)).toContainText(/Nick/);
    await page.locator('[data-a="lang"][data-l="de"]').click();
    await expect(page.locator('.turnov .tv-sec').nth(1)).toContainText(/Nick/);
  });
});

test.describe('Waffenmeisterschaft @new', () => {
  test('Kämpfer wählt Meisterschaften bis zur Grenze, Text erscheint beim Angriff', async ({ page }) => {
    await seed(page, base4({ klass: 'Paladin', level: 1, eq: { main: sword('a', 'item:longsword', 'Longsword') }, bag: bagOf() }));
    const chip = page.locator('[data-a="wmast"]');
    await expect(chip).toContainText(/Sap/);
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await chip.click();
    await expect(page.locator('[data-a="wmast"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.mast-t')).toContainText(/Disadvantage|disadvantage/);
  });

  test('Grenze: Paladin hat 2 Meisterschaften', async ({ page }) => {
    await seed(page, base4({ klass: 'Paladin', level: 1, mastery: ['item:greatsword', 'item:dagger'], eq: { main: sword('a', 'item:longsword', 'Longsword') } }));
    await act(page, 'wmast').click();
    await expect(page.locator('#toast')).toContainText('2');
    await expect(page.locator('[data-a="wmast"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('Klasse ohne Weapon Mastery: nur Hinweis', async ({ page }) => {
    await seed(page, base4({ klass: 'Wizard', level: 1, eq: { main: sword('a', 'item:dagger', 'Dagger') } }));
    await expect(page.locator('.chip.mast.dim')).toContainText(/Nick/);
    await expect(page.locator('[data-a="wmast"]')).toHaveCount(0);
  });
});

test.describe('Suche und Einheiten @new', () => {
  test('„Tasha“ findet Hideous Laughter, PHB-Name steht im Eintrag', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('tasha');
    await expect(page.locator('.wli[data-key="spell:Hideous Laughter"]')).toBeVisible();
    await page.locator('#wq').fill("bigby's");
    await act(page, 'wsel', '[data-key="spell:Arcane Hand"]').click();
    await expect(page.locator('.wd.pane')).toContainText("Bigby's Hand");
  });

  test('Fuß auf Deutsch: Meter im Zaubertext werden zu Fuß', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('[data-a="lang"][data-l="de"]').click();
    await page.locator('[data-a="units"][data-u="ft"]').click();
    await page.locator('#wq').fill('Fireball');
    await act(page, 'wsel', '[data-key="spell:Fireball"]').click();
    await expect(page.locator('.wd.pane')).toContainText('150 Fuß');
  });
});
