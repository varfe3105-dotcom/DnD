import { test, expect, seed, read, act, tab, base4, item } from './helpers.js';

const bag = (...its) => { const b = Array(24).fill(null); its.forEach((x, i) => { b[i] = x; }); return b; };
const sword = () => item('a', 'Langschwert', { ic: 'sword', p: 'Krieg · 1W8 Hieb · Vielseitig (1W10) · 15 GM', slot: 'hand' });

async function drag(page, from, to) {
  await page.setViewportSize({ width: 1280, height: 1500 });
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

test.describe('Icons @new', () => {
  test('Gegenstände zeigen das Pack, unbekannte Motive das eigene Symbol', async ({ page }) => {
    await seed(page, base4({ tab: 'inv', bag: bag(sword(), item('m', 'Maske', { ic: 'mask' })) }));
    await expect(page.locator('[data-drag="bag:0"] .spr')).toHaveCount(1);
    await expect(page.locator('[data-drag="bag:1"] svg.i')).toHaveCount(1);
  });

  test('Spritesheet ist eingebettet und wird geladen', async ({ page }) => {
    await seed(page, base4({ tab: 'inv', bag: bag(sword()) }));
    const bg = await page.locator('[data-drag="bag:0"] .spr').evaluate(el => getComputedStyle(el).backgroundImage);
    expect(bg.startsWith('url("data:image/png')).toBe(true);
  });

  test('alle Zuordnungen liegen im Blatt und treffen vorhandene Schlüssel', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/icon-art.js', 'utf8');
    const read = f => JSON.parse(fs.readFileSync(`data/${f}.json`, 'utf8'));
    const known = new Set([...read('items'), ...read('potions'), ...read('magic-items')].map(i => `${i.k}:${i.id}`));
    read('conditions').forEach(c => known.add('cond:' + c.n));
    read('spells').forEach(s => known.add('spell:' + s.n));
    Object.keys(read('classes')).forEach(c => known.add('class:' + c));
    const unknown = [...src.matchAll(/'((?:item|potion|cond|class|spell):[^']+)': \[(\d+), [^\]]+\]/g)].filter(m => !known.has(m[1])).map(m => m[1]);
    expect(unknown).toEqual([]);
  });

  test('Lizenzhinweis steht im Bogen', async ({ page }) => {
    await seed(page, base4({}));
    await expect(page.locator('footer')).toContainText("Shikashi's Fantasy Icons Pack");
  });
});

test.describe('Wiki-Scrollposition @new', () => {
  test('Desktop: Klick lässt die Liste stehen', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await act(page, 'wf', '[data-f="spell"]').click();
    const list = page.locator('.wl');
    await list.evaluate(el => { el.scrollTop = 900; });
    const before = await list.evaluate(el => el.scrollTop);
    expect(before).toBeGreaterThan(500);
    const target = page.locator('.wli').nth(25);
    await target.click();
    expect(await page.locator('.wl').evaluate(el => el.scrollTop)).toBe(before);
    await expect(page.locator('.wli').nth(25)).toHaveAttribute('aria-current', 'true');
  });

  test('Handy: angetipptes Element bleibt an seiner Stelle', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await seed(page, base4({ tab: 'wiki' }));
    await act(page, 'wf', '[data-f="spell"]').click();
    const first = page.locator('.wli').nth(30);
    await first.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    const key = await first.getAttribute('data-key');
    const box = async () => (await page.locator(`.wli[data-key="${key}"]`).boundingBox()).y;
    const y = await box();
    await first.click();
    expect(Math.abs(await box() - y)).toBeLessThan(3);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  });

  test('Filterwechsel beginnt wieder oben', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('.wl').evaluate(el => { el.scrollTop = 900; });
    await act(page, 'wf', '[data-f="spell"]').click();
    expect(await page.locator('.wl').evaluate(el => el.scrollTop)).toBe(0);
  });
});
