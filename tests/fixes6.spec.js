import { test, expect, seed, read, act, base4, URL_UNDER_TEST } from './helpers.js';

test.describe('Notizseiten @new', () => {
  const notes = page => page.locator('#notes');

  test('alter Bogen: Notizen bleiben auf der ersten Seite', async ({ page }) => {
    await seed(page, base4({ tab: 'notes', notes: 'Alte Geschichte' }));
    await expect(notes(page)).toHaveValue('Alte Geschichte');
    await expect(page.locator('.notepages [data-a="npsel"]')).toHaveCount(1);
  });

  test('Seiten anlegen, benennen, wechseln, Text bleibt getrennt', async ({ page }) => {
    await seed(page, base4({ tab: 'notes', notes: 'Eins' }));
    await act(page, 'npadd').click();
    await page.locator('#np-title').fill('Quests');
    await notes(page).fill('Zwei');
    await expect(page.locator('.notepages .chip.on')).toHaveText('Quests');
    await act(page, 'npsel', '[data-i="0"]').click();
    await expect(notes(page)).toHaveValue('Eins');
    await act(page, 'npsel', '[data-i="1"]').click();
    await expect(notes(page)).toHaveValue('Zwei');
    const s = await read(page);
    expect(s.notes).toBe('Eins');
    expect(s.notePages[0]).toMatchObject({ title: 'Quests', text: 'Zwei' });
  });

  test('Eingaben überstehen das Neuladen', async ({ page }) => {
    await seed(page, base4({ tab: 'notes' }));
    await act(page, 'npadd').click();
    await notes(page).fill('Bleibt');
    await page.reload();
    await expect(notes(page)).toHaveValue('Bleibt');
  });

  test('Löschen fragt bei Text nach, leere Seite geht sofort', async ({ page }) => {
    await seed(page, base4({ tab: 'notes', notes: 'Eins', notePages: [{ id: 'a', title: 'B', text: 'Inhalt' }, { id: 'b', title: 'C', text: '' }], notePage: 2 }));
    await act(page, 'npdel').click();
    expect((await read(page)).notePages).toHaveLength(1);
    await act(page, 'npdel').click();
    expect((await read(page)).notePages).toHaveLength(1);
    await act(page, 'npdel').click();
    const s = await read(page);
    expect(s.notePages).toHaveLength(0);
    expect(s.notes).toBe('Eins');
    await expect(act(page, 'npdel')).toHaveCount(0);
  });

  test('erste Seite löschen rückt die zweite nach', async ({ page }) => {
    await seed(page, base4({ tab: 'notes', notes: '', notePages: [{ id: 'a', title: 'B', text: 'Zweite' }] }));
    await act(page, 'npdel').click();
    const s = await read(page);
    expect(s.notes).toBe('Zweite');
    expect(s.noteTitle).toBe('B');
    expect(s.notePages).toHaveLength(0);
  });
});

test.describe('Unterklasse in Einrichten @new', () => {
  const sub = page => page.locator('#f-sub');

  test('Auswahl zeigt die Unterklassen der Klasse und trägt Merkmale bis zur Stufe ein', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', klass: 'Fighter', level: 3 }));
    await expect(sub(page).locator('option')).toHaveCount(4);
    await sub(page).selectOption('Champion');
    await expect.poll(async () => (await read(page)).sub).toBe('Champion');
    const f = (await read(page)).feats;
    expect(f.map(x => x.n)).toContain('Improved Critical');
    expect(f.map(x => x.n)).not.toContain('Remarkable Athlete');
  });

  test('Wechsel nimmt die alten Merkmale zurück', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', klass: 'Fighter', level: 3 }));
    await sub(page).selectOption('Champion');
    await expect.poll(async () => (await read(page)).sub).toBe('Champion');
    await page.waitForTimeout(50);
    await sub(page).selectOption('Battle Master');
    await expect.poll(async () => (await read(page)).sub).toBe('Battle Master');
    expect((await read(page)).feats.map(x => x.n)).not.toContain('Improved Critical');
  });

  test('eigene Unterklasse aus einem Import bleibt erhalten', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', klass: 'Fighter', level: 3, sub: 'Echo Knight' }));
    await expect(sub(page)).toHaveValue('Echo Knight');
  });
});

test.describe('Orte @new', () => {
  const open = async (page, extra = {}) => {
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(([s, d]) => { localStorage.clear(); localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, view: 'notes', party: [{ count: 4, level: 3 }], ...d })); }, [base4({ tab: 'dm' }), extra]);
    await page.reload();
    await page.locator('#app header').waitFor();
  };
  const dmData = page => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')));

  test('Ort anlegen, Monster mit Anzahl zuordnen, Schwierigkeit und Kampfstart', async ({ page }) => {
    await open(page, { combat: { round: 3, active: null, list: [{ id: 'p', kind: 'pc', name: 'Held', init: 12, ac: 15, hp: 9, hpMax: 9, cond: {}, note: '' }] } });
    await act(page, 'dmnewp').click();
    await page.locator('#dm-ntitle').fill('Goblinhöhle');
    await page.locator('#dm-ntitle').blur();
    await page.locator('#dm-pq').fill('goblin');
    await act(page, 'dmpladd', '[data-m="goblin"]').click();
    await act(page, 'dmplqty', '[data-m="goblin"][data-d="1"]').click();
    let d = await dmData(page);
    expect(d.notes[0]).toMatchObject({ kind: 'place', title: 'Goblinhöhle', monsters: [{ id: 'goblin', qty: 2 }] });
    await expect(page.locator('.dm-place .dm-total')).toContainText('XP');
    await expect(page.locator('.wli small').first()).toContainText('2');
    await act(page, 'dmplstart').click();
    d = await dmData(page);
    expect(d.view).toBe('combat');
    expect(d.combat.list.map(c => c.name).sort()).toEqual(['Goblin 1', 'Goblin 2', 'Held']);
  });

  test('Anzahl auf 0 entfernt das Monster', async ({ page }) => {
    await open(page, { sel: 'a', notes: [{ id: 'a', kind: 'place', title: 'X', body: '', monsters: [{ id: 'ogre', qty: 1 }] }] });
    await act(page, 'dmplqty', '[data-d="-1"]').click();
    expect((await dmData(page)).notes[0].monsters).toEqual([]);
    await expect(act(page, 'dmplstart')).toHaveCount(0);
  });

  test('Filter zeigt nur Orte, andere Notizarten haben keine Monsterliste', async ({ page }) => {
    await open(page, { sel: 'n', notes: [{ id: 'n', kind: 'npc', title: 'Baron', body: '' }, { id: 'a', kind: 'place', title: 'Burg', body: '' }] });
    await expect(page.locator('.dm-place')).toHaveCount(0);
    await act(page, 'dmnk', '[data-k="place"]').click();
    await expect(page.locator('.wli')).toHaveCount(1);
    await expect(page.locator('.wli')).toContainText('Burg');
  });
});
