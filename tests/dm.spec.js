import { test, expect, seed, read, act, tab, base4, URL_UNDER_TEST } from './helpers.js';

async function dm(page, state = {}, extra = {}) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(([s, d]) => { localStorage.clear(); localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, ...d })); }, [base4({ tab: 'dm', ...state }), extra]);
  await page.reload();
  await page.locator('#app header').waitFor();
}
const dmData = page => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')));
async function addMonster(page, q, id, qty = 1) {
  await page.locator('#dm-mq').fill(q);
  await page.locator('#dm-qty').fill(String(qty));
  await act(page, 'dmadd', `[data-m="${id}"]`).click();
}
const initAll = async (page, values) => {
  for (let i = 0; i < values.length; i++) {
    const el = page.locator('.dm-init').nth(i);
    await el.fill(String(values[i]));
    await el.blur();
    await page.waitForTimeout(30);
  }
};

test.describe('DM-Bereich @new', () => {
  test('ist standardmäßig aus und lässt sich einschalten', async ({ page }) => {
    await seed(page, base4({ tab: 'setup' }));
    await expect(page.locator('[data-a="tab"][data-t="dm"]')).toHaveCount(0);
    await page.locator('#dm-on').check();
    await expect(page.locator('[data-a="tab"][data-t="dm"]')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-a="tab"][data-t="dm"]')).toBeVisible();
  });

  test('Monster mit SRD-Werten, nummeriert', async ({ page }) => {
    await dm(page);
    await addMonster(page, 'goblin', 'goblin', 2);
    const d = await dmData(page);
    expect(d.combat.list.map(c => c.name)).toEqual(['Goblin 1', 'Goblin 2']);
    expect(d.combat.list[0]).toMatchObject({ ac: 15, hp: 7, hpMax: 7 });
  });

  test('Reihenfolge nach Initiative, Runden zählen, Besiegte werden übersprungen', async ({ page }) => {
    await dm(page);
    await addMonster(page, 'goblin', 'goblin', 3);
    await initAll(page, [5, 20, 10]);
    const names = async () => page.locator('.dm-name b').allTextContents();
    await expect.poll(names).toEqual(['Goblin 2', 'Goblin 3', 'Goblin 1']);
    const next = () => act(page, 'dmstep', '[data-d="1"]').click();
    const active = () => page.locator('.dm-row.on .dm-name b');
    await next();
    await expect(active()).toHaveText('Goblin 2');
    const goblin3 = page.locator('.dm-row', { hasText: 'Goblin 3' });
    await goblin3.locator('input[id^="dm-amt"]').fill('7');
    await goblin3.locator('[data-a="dmhp"][data-d="-1"]').click();
    await expect(page.locator('.dm-row', { hasText: 'Goblin 3' })).toHaveClass(/down/);
    await next();
    await expect(active()).toHaveText('Goblin 1');
    expect((await dmData(page)).combat.round).toBe(1);
    await next();
    await expect(active()).toHaveText('Goblin 2');
    expect((await dmData(page)).combat.round).toBe(2);
  });

  test('Zustände und Werteblock je Figur', async ({ page }) => {
    await dm(page);
    await addMonster(page, 'goblin', 'goblin');
    await act(page, 'dmopen').click();
    await act(page, 'dmcond', '[data-c="Poisoned"]').click();
    await expect(page.locator('.dm-name small')).toContainText('Poisoned');
    await expect(page.locator('.dm-stat')).toContainText('Nimble Escape');
  });

  test('Charaktere des Geräts kommen mit ihren Werten, die Figur bleibt unverändert', async ({ page }) => {
    await dm(page, { name: 'Held', ac: 17, hp: 12, hpMax: 20 });
    await act(page, 'dmchars').click();
    await act(page, 'dmchars').click();
    const d = await dmData(page);
    expect(d.combat.list.length).toBe(1);
    expect(d.combat.list[0]).toMatchObject({ name: 'Held', ac: 17, hp: 12, kind: 'pc' });
    await page.locator('[data-a="dmhp"][data-d="-1"]').click();
    expect((await read(page)).hp).toBe(12);
  });

  test('Kampf beenden braucht Bestätigung', async ({ page }) => {
    await dm(page);
    await addMonster(page, 'goblin', 'goblin');
    await act(page, 'dmclear').click();
    expect((await dmData(page)).combat.list.length).toBe(1);
    await act(page, 'dmclear').click();
    expect((await dmData(page)).combat.list.length).toBe(0);
  });

  test('Notizen: Anlegen, Suche, Verweise und Rückverweise', async ({ page }) => {
    await dm(page, {}, { view: 'notes' });
    await act(page, 'dmnew').click();
    await page.locator('#dm-ntitle').fill('Baron Vex');
    await page.locator('#dm-nbody').fill('Herrscht über [[Dunkelhafen]].');
    await page.locator('#dm-nbody').blur();
    await act(page, 'dmlink', '[data-t="Dunkelhafen"]').click();
    await expect(page.locator('#dm-ntitle')).toHaveValue('Dunkelhafen');
    await expect(page.locator('[data-a="dmsel"]', { hasText: 'Baron Vex' }).last()).toBeVisible();
    await page.locator('#dm-nq').fill('herrscht');
    await expect(page.locator('#dm-nlist .wli')).toHaveCount(1);
  });

  test('DM-Daten überstehen Charakterwechsel und lassen sich sichern', async ({ page }) => {
    await dm(page);
    await addMonster(page, 'goblin', 'goblin');
    await tab(page, 'setup');
    await act(page, 'charnew').click();
    await tab(page, 'dm');
    await expect(page.locator('.dm-name b')).toHaveText('Goblin');
    await page.locator('.dm-backup summary').click();
    await act(page, 'dmexp').click();
    const text = await page.locator('#dm-exp').inputValue();
    await act(page, 'dmstep', '[data-d="1"]').click();
    await act(page, 'dmclear').click();
    await act(page, 'dmclear').click();
    await page.locator('.dm-backup summary').click();
    await page.locator('#dm-imp').fill(text);
    await act(page, 'dmimp').click();
    await expect(page.locator('.dm-name b')).toHaveText('Goblin');
  });

  for (const v of ['combat', 'notes']) {
    test(`Handybreite ohne Querscrollen: ${v}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      await dm(page, {}, { view: v, combat: { round: 1, active: null, list: [{ id: 'a', kind: 'mon', mon: 'goblin', name: 'Goblin', init: 12, ac: 15, hp: 7, hpMax: 7, cond: {}, note: '' }] } });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBeLessThanOrEqual(0);
    });
  }
});
