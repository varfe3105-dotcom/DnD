import { test, expect, act, base4, URL_UNDER_TEST } from './helpers.js';

async function dm(page, state = {}, extra = {}) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(([s, d]) => { localStorage.clear(); localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, ...d })); }, [base4({ tab: 'dm', ...state }), extra]);
  await page.reload();
  await page.locator('#app header').waitFor();
}
const dmData = page => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')));
async function addMonster(page, q, id) {
  await page.locator('#dm-mq').fill(q);
  await act(page, 'dmadd', `[data-m="${id}"]`).click();
}

test.describe('Begegnungen @new', () => {
  const open = (page, extra = {}) => dm(page, {}, { view: 'enc', party: [{ count: 4, level: 3 }], ...extra });
  const enc = monsters => ({ id: 'e1', name: 'Hoehle', monsters });

  test('Schwellen folgen der Gruppe', async ({ page }) => {
    await open(page);
    await expect(page.locator('.dm-th b')).toHaveText(['300', '600', '900', '1600']);
    await page.locator('#dmp-l0').fill('5');
    await page.locator('#dmp-l0').blur();
    await expect(page.locator('.dm-th b')).toHaveText(['1000', '2000', '3000', '4400']);
  });

  test('gemischte Stufen addieren sich', async ({ page }) => {
    await open(page, { party: [{ count: 2, level: 3 }, { count: 1, level: 5 }] });
    await expect(page.locator('.dm-th b')).toHaveText(['400', '800', '1200', '1900']);
  });

  const cases = [
    ['ein Ogre', [{ id: 'ogre', qty: 1 }], 'Easy', 450],
    ['drei Ogres mit Faktor 2', [{ id: 'ogre', qty: 3 }], 'Deadly', 2700],
    ['vier Goblins mit Faktor 2', [{ id: 'goblin', qty: 4 }], 'Easy', 400],
  ];
  for (const [name, monsters, label, adj] of cases) {
    test(`Rechner: ${name}`, async ({ page }) => {
      await open(page, { encounters: [enc(monsters)], encSel: 'e1' });
      await expect(page.locator('.dm-total .dm-diff')).toHaveText(label);
      await expect(page.locator('.dm-total')).toContainText(`= ${adj} XP`);
    });
  }

  test('kleine und große Gruppen verschieben den Faktor', async ({ page }) => {
    await open(page, { party: [{ count: 2, level: 3 }], encounters: [enc([{ id: 'goblin', qty: 1 }])], encSel: 'e1' });
    await expect(page.locator('.dm-total')).toContainText('× 1.5');
    await page.locator('#dmp-c0').fill('6');
    await page.locator('#dmp-c0').blur();
    await expect(page.locator('.dm-total')).toContainText('× 0.5');
  });

  test('zusammenstellen und starten: Spieler bleiben, Monster werden ersetzt', async ({ page }) => {
    await open(page, { combat: { round: 4, active: null, list: [{ id: 'p', kind: 'pc', name: 'Held', init: 12, ac: 15, hp: 9, hpMax: 9, cond: {}, note: '' }, { id: 'x', kind: 'mon', mon: 'ogre', name: 'Alt', init: 3, ac: 11, hp: 5, hpMax: 59, cond: {}, note: '' }] } });
    await act(page, 'dmenew').click();
    await page.locator('#dme-n').fill('Bruecke');
    await page.locator('#dme-n').blur();
    await page.locator('#dm-eq').fill('goblin');
    await act(page, 'dmeadd', '[data-m="goblin"]').click();
    await act(page, 'dmeqty', '[data-m="goblin"][data-d="1"]').click();
    await act(page, 'dmestart').click();
    const d = await dmData(page);
    expect(d.view).toBe('combat');
    expect(d.combat.round).toBe(1);
    expect(d.combat.list.map(c => c.name).sort()).toEqual(['Goblin 1', 'Goblin 2', 'Held']);
    expect(d.encounters[0]).toMatchObject({ name: 'Bruecke', monsters: [{ id: 'goblin', qty: 2 }] });
  });

  test('eigenes Monster: anlegen, zählt im Rechner, bearbeiten, löschen', async ({ page }) => {
    await open(page, { encounters: [enc([])], encSel: 'e1' });
    await page.locator('.dm-custom summary').click();
    await page.locator('#dmc-n').fill('Bugbear Chief');
    await page.locator('#dmc-cr').fill('1/4');
    await page.locator('#dmc-ac').fill('17');
    await page.locator('#dmc-hp').fill('65');
    await page.locator('#dmc-t').fill('Morningstar. +5 to hit.');
    await act(page, 'dmcsave').click();
    let d = await dmData(page);
    expect(d.custom[0]).toMatchObject({ n: 'Bugbear Chief', cr: 0.25, ac: 17, hp: 65, source: 'own' });
    await page.locator('#dm-eq').fill('bugbear chief');
    await page.locator('#dm-eres [data-a="dmeadd"]').first().click();
    await expect(page.locator('.dm-total')).toContainText('50 XP');
    await act(page, 'dmcedit').click();
    await page.locator('#dmc-hp').fill('70');
    await act(page, 'dmcsave').click();
    d = await dmData(page);
    expect(d.custom).toHaveLength(1);
    expect(d.custom[0].hp).toBe(70);
    await act(page, 'dmcdel').click();
    await act(page, 'dmcdel').click();
    expect((await dmData(page)).custom).toHaveLength(0);
  });

  test('eigenes Monster erscheint im Kampf mit Text', async ({ page }) => {
    await dm(page, {}, { view: 'combat', custom: [{ id: 'c-1', n: 'Riese X', cr: 2, ac: 13, hp: 40, speed: '40 ft.', abil: { str: 18, dex: 10, con: 16, int: 8, wis: 10, cha: 8 }, text: 'Hieb. +6.', custom: true, source: 'own' }] });
    await addMonster(page, 'riese', 'c-1');
    await act(page, 'dmopen').click();
    await expect(page.locator('.dm-stat')).toContainText('Hieb. +6.');
  });
});

test.describe('Effekte und Legendary Actions @new', () => {
  const fig = (id, name, init, extra = {}) => ({ id, kind: 'pc', name, init, ac: 15, hp: 9, hpMax: 9, cond: {}, note: '', ...extra });
  const start = (page, list) => dm(page, {}, { view: 'combat', combat: { round: 1, active: null, list } });

  test('Effekt zählt je Runde herunter und endet mit Meldung', async ({ page }) => {
    await start(page, [fig('a', 'Anna', 20), fig('b', 'Bert', 10)]);
    await page.locator('[data-a="dmopen"][data-id="a"]').click();
    await page.locator('#dm-fxn-a').fill('Slow');
    await page.locator('#dm-fxr-a').fill('2');
    await page.locator('[data-a="dmfx"][data-id="a"]').click();
    const next = () => act(page, 'dmstep', '[data-d="1"]').click();
    await expect(page.locator('.dm-fx .chip')).toHaveText('Slow 2');
    await next(); await next();
    await expect(page.locator('.dm-fx .chip')).toHaveText('Slow 2');
    await next();
    await expect(page.locator('.dm-fx .chip')).toHaveText('Slow 1');
    await next(); await next();
    await expect(page.locator('.dm-fx .chip')).toHaveCount(0);
    await expect(page.locator('#toast')).toContainText('Slow ends on Anna');
  });

  test('Zurückgehen zählt nichts', async ({ page }) => {
    await start(page, [fig('a', 'Anna', 20, { fx: [{ id: 'f', n: 'Bless', r: 3 }] })]);
    await act(page, 'dmstep', '[data-d="1"]').click();
    await act(page, 'dmstep', '[data-d="-1"]').click();
    await expect(page.locator('.dm-fx .chip')).toHaveText('Bless 3');
  });

  test('Klick auf den Effekt entfernt ihn', async ({ page }) => {
    await start(page, [fig('a', 'Anna', 20, { fx: [{ id: 'f', n: 'Bless', r: 3 }] })]);
    await act(page, 'dmfxdel').click();
    await expect(page.locator('.dm-fx .chip')).toHaveCount(0);
  });

  test('Legendary Actions füllen sich im eigenen Zug wieder auf', async ({ page }) => {
    await dm(page);
    await addMonster(page, 'adult red', 'adult-red-dragon');
    await addMonster(page, 'goblin', 'goblin');
    for (const [i, v] of [[0, 20], [1, 10]]) { const el = page.locator('.dm-init').nth(i); await el.fill(String(v)); await el.blur(); await page.waitForTimeout(30); }
    await expect(page.locator('.dm-la .pip')).toHaveCount(3);
    await act(page, 'dmstep', '[data-d="1"]').click();
    await page.locator('.dm-la .pip').first().click();
    const used = async () => (await dmData(page)).combat.list.find(c => c.la).la.used;
    expect(await used()).toBe(1);
    await act(page, 'dmstep', '[data-d="1"]').click();
    expect(await used()).toBe(1);
    await act(page, 'dmstep', '[data-d="1"]').click();
    expect(await used()).toBe(0);
  });

  test('Monster-Zauberplätze aus dem Text', async ({ page }) => {
    await dm(page);
    await addMonster(page, 'mage', 'mage');
    await act(page, 'dmopen').click();
    expect((await dmData(page)).combat.list[0].slots[0]).toEqual({ lvl: 1, max: 4, used: 0 });
    await act(page, 'dmslot', '[data-k="0"][data-j="0"]').click();
    expect((await dmData(page)).combat.list[0].slots[0].used).toBe(1);
  });
});
