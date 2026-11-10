import { test, expect, seed, read, act, tab, base4, item } from './helpers.js';

const bag = (...its) => { const b = Array(24).fill(null); its.forEach((x, i) => { b[i] = x; }); return b; };
const sword = () => item('a', 'Langschwert', { ic: 'sword', p: 'Krieg · 1W8 Hieb · Vielseitig (1W10) · 15 GM', slot: 'hand' });

async function drag(page, from, to) {
  const a = await page.locator(`[data-drag="${from}"]`).boundingBox();
  const b = await page.locator(`[data-slot="${to}"]`).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test.describe('Inventar', () => {
  test('Ziehen rüstet aus und berechnet den Angriff', async ({ page }) => {
    await seed(page, base4({ bag: bag(sword()) , tab: 'inv' }));
    await drag(page, 'bag:0', 'eq:main');
    const s = await read(page);
    expect(s.eq.main.n).toBe('Langschwert');
    expect(s.bag[0]).toBeNull();
    await tab(page, 'main');
    await expect(page.locator('.atk b').first()).toHaveText('+4');
    await expect(page.locator('.atk b').nth(1)).toHaveText(/1[dW]8\+2/);
  });

  test('Ziehen auf einen unpassenden Platz wird abgelehnt', async ({ page }) => {
    await seed(page, base4({ bag: bag(sword()), tab: 'inv' }));
    await drag(page, 'bag:0', 'eq:head');
    const s = await read(page);
    expect(s.eq.head).toBeUndefined();
    expect(s.bag[0].n).toBe('Langschwert');
  });

  test('Verbrauchsgüter stapeln beim Ablegen', async ({ page }) => {
    const p = () => item('x', 'Trank', { cons: true, q: 2, p: 'heilt' });
    await seed(page, base4({ bag: bag(p(), { ...p(), id: 'y', q: 3 }), tab: 'inv' }));
    await drag(page, 'bag:0', 'bag:1');
    const s = await read(page);
    expect(s.bag[0]).toBeNull();
    expect(s.bag[1].q).toBe(5);
  });

  test('Antippen öffnet Details, Benutzen zählt herunter', async ({ page }) => {
    await seed(page, base4({ bag: bag(item('x', 'Trank', { cons: true, q: 2 })), tab: 'inv' }));
    await page.locator('[data-drag="bag:0"]').click();
    await act(page, 'use').click();
    expect((await read(page)).bag[0].q).toBe(1);
  });

  test('Tooltip beim Überfahren zeigt Name und Angriff', async ({ page }) => {
    await seed(page, base4({ bag: bag(sword()), tab: 'inv' }));
    await expect(page.locator('#tip')).toBeHidden();
    await page.locator('[data-drag="bag:0"]').hover();
    await expect(page.locator('#tip')).toBeVisible();
    await expect(page.locator('#tip b').first()).toHaveText(/Longsword|Langschwert/);
    await expect(page.locator('#tip .ta')).toContainText(/1[dW]8\+2/);
    await page.mouse.move(5, 5);
    await expect(page.locator('#tip')).toBeHidden();
  });

  test('Geld lässt sich anpassen', async ({ page }) => {
    await seed(page, base4({ tab: 'inv' }));
    await act(page, 'gold', '[data-c="gp"][data-d="1"]').click();
    await act(page, 'gold', '[data-c="gp"][data-d="1"]').click();
    expect((await read(page)).gold.gp).toBe(2);
  });
});

test.describe('Wiki', () => {
  test('Suche findet Zauber und Zustände', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('Fireball');
    await expect(page.locator('.wli').first()).toContainText('Fireball');
    await page.locator('#wq').fill('Grappled');
    await expect(page.locator('.wli', { hasText: 'Grappled' }).first()).toBeVisible();
  });

  test('Filter und Hinzufügen in den Bogen', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await act(page, 'wf', '[data-f="spell"]').click();
    await page.locator('#wq').fill('Magic Missile');
    await act(page, 'wadd').first().click();
    expect((await read(page)).spells.map(s => s.n)).toContain('Magic Missile');
    await act(page, 'wf', '[data-f="mine"]').click();
    await expect(page.locator('.wli', { hasText: 'Magic Missile' })).toBeVisible();
  });

  test('Klassen- und Völkereinträge haben Details', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await act(page, 'wf', '[data-f="class"]').click();
    await act(page, 'wsel', '[data-key="class:Wizard"]').click();
    await expect(page.locator('.wd.pane h3')).toHaveText('Wizard');
    await expect(page.locator('.wd.pane')).toContainText('Arcane Recovery');
  });
});
