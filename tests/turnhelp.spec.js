import { test, expect, seed, read, act, base4, spell, item } from './helpers.js';

const bagOf = (...x) => { const b = Array(24).fill(null); x.forEach((v, i) => { b[i] = v; }); return b; };
const sword = (id, ref, n) => item(id, n, { ref, slot: 'hand', att: true });

test.describe('Zugübersicht @new', () => {
  test('Zugübersicht offen: Aktionen, eigene Zauber nach Zeitaufwand, Tränke und Merkmale als Bonusaktion', async ({ page }) => {
    await seed(page, base4({ klass: 'Cleric', level: 3, spells: [spell('Healing Word', 1), spell('Shield', 1), spell('Fireball', 3)], res: [{ n: 'Cunning Action', ic: 'key', max: 99, used: 0, rest: 'none', p: '' }], bag: bagOf(item('p', 'Potion of Healing', { ref: 'potion:potion-of-healing', cons: true })) }));
    const tv = page.locator('.turnboard');
    await expect(tv).toBeVisible();
    await expect(tv).toContainText('Disengage');
    await expect(tv).toContainText(/Fireball/);
    await expect(tv.locator('[data-a="tcast"]')).toHaveCount(2); // Healing Word (Bonusaktion), Shield (Reaktion)
    await expect(tv).toContainText('Cunning Action');
    await expect(tv.locator('[data-a="tpotion"]')).toHaveCount(1);
    await expect(tv).toContainText(/Opportunity/);
    await expect(tv).toContainText(/Shove and Grapple replace one attack/);
  });

  test('zwei leichte Waffen: Zweitangriff als Bonusaktion, mit Nick als Teil der Angriffsaktion', async ({ page }) => {
    await seed(page, base4({ klass: 'Rogue', level: 1, eq: { main: sword('a', 'item:shortsword', 'Shortsword'), off: sword('b', 'item:scimitar', 'Scimitar') } }));
    const tv = page.locator('.turnboard');
    await expect(tv).toContainText(/off-hand/);
    await expect(tv).not.toContainText(/Nick/);
    await act(page, 'wmast', '[data-w="item:scimitar"]').click();
    await expect(tv).toContainText(/Nick/);
    await page.locator('[data-a="lang"][data-l="de"]').click();
    await expect(tv).toContainText(/Nick/);
  });

  test('Aktion ausführen verbraucht sie, zweite Aktion geht nicht, Neuer Zug gibt sie frei', async ({ page }) => {
    await seed(page, base4({ klass: 'Cleric', level: 3 }));
    await page.locator('[data-a="tact"][data-k="dodge"]').click();
    let s = await read(page);
    expect(s.turn).toMatchObject({ on: true, a: 1 });
    await expect(page.locator('[data-a="tact"][data-k="dash"]')).toBeDisabled();
    await expect(page.locator('.minibar .tv-chip').first()).not.toHaveClass(/on/);
    await act(page, 'tnew').click();
    s = await read(page);
    expect(s.turn.a).toBe(0);
    await expect(page.locator('[data-a="tact"][data-k="dash"]')).toBeEnabled();
  });

  test('Extra Attack: zwei Angriffe in einer Aktion, Stoßen ersetzt einen, danach ist Schluss', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 5, prof: 3 }));
    await page.locator('[data-a="tatk"][data-k="attack"]').click();
    expect((await read(page)).turn).toMatchObject({ a: 1, atk: 1, atkMax: 2 });
    await page.locator('[data-a="tatk"][data-k="shove"]').click();
    expect((await read(page)).turn).toMatchObject({ atk: 2 });
    await expect(page.locator('[data-a="tatk"][data-k="grapple"]')).toBeDisabled();
  });

  test('Action Surge gibt eine zweite Aktion', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 2, res: [{ n: 'Action Surge', ic: 'bolt', max: 1, used: 0, rest: 'short', p: '' }] }));
    await page.locator('[data-a="tact"][data-k="dash"]').click();
    await act(page, 'tsurge').click();
    await page.locator('[data-a="tact"][data-k="dash"]').click();
    const s = await read(page);
    expect(s.turn).toMatchObject({ a: 2, aMax: 2, dash: 2 });
    expect(s.res[0].used).toBe(1);
  });

  test('Zauber zählen mit: nach einer Aktion kein Zauber mit 1 Aktion, Bonusaktion geht, nur ein Zauberplatz pro Zug', async ({ page }) => {
    const slots = Array.from({ length: 9 }, (_, i) => ({ max: i < 2 ? 4 : 0, used: 0 }));
    await seed(page, base4({ klass: 'Cleric', level: 3, slots, spells: [spell('Guiding Bolt', 1), spell('Healing Word', 1), spell('Sacred Flame', 0)] }));
    await page.locator('[data-a="tact"][data-k="help"]').click();
    await act(page, 'cast', '[data-i="0"]').click(); // Guiding Bolt: 1 Aktion
    expect((await read(page)).slots[0].used).toBe(0);
    await expect(page.locator('#toast')).toContainText(/action is already used/);
    await act(page, 'tnew').click();
    await act(page, 'cast', '[data-i="0"]').click();
    const pick = page.locator('[data-a="castslot"]'); if (await pick.count()) await pick.first().click();
    expect((await read(page)).slots[0].used).toBe(1);
    // Healing Word als Bonusaktion: Bonusaktion frei, aber der Zauberplatz dieses Zuges ist schon ausgegeben
    await page.locator('[data-a="tcast"][data-i="1"]').click();
    const p2 = page.locator('[data-a="castslot"]'); if (await p2.count()) await p2.first().click();
    expect((await read(page)).slots[0].used + (await read(page)).slots[1].used).toBe(1);
    await expect(page.locator('#toast')).toContainText(/one spell slot per turn/);
  });

  test('Bewegung: Schritte bis zum Tempo, Spurten verdoppelt, Aufstehen kostet die Hälfte', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 1, speed: 9 }));
    const plus = page.locator('[data-a="tmove"][data-m="1.5"]');
    for (let i = 0; i < 6; i++) await plus.click();
    expect((await read(page)).turn.mv).toBe(9);
    await expect(plus).toBeDisabled();
    await page.locator('[data-a="tact"][data-k="dash"]').click();
    await expect(plus).toBeEnabled();
    await page.locator('[data-a="tmove"][data-m="4.5"]').click();
    expect((await read(page)).turn.mv).toBe(13.5);
  });

  test('Lange Rast beendet die Zählung', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 1 }));
    await page.locator('[data-a="tact"][data-k="dodge"]').click();
    await act(page, 'tend').click();
    expect((await read(page)).turn.on).toBe(false);
  });

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
