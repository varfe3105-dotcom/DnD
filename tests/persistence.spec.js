import { test, expect, seed, read, act, base4, item, URL_UNDER_TEST, KEY } from './helpers.js';

const v2 = {
  name: 'Alt', info: 'Elf · Bard', hp: 7, hpMax: 12, ac: 14, speed: 9, prof: 2,
  abil: { str: 8, dex: 16, con: 12, int: 10, wis: 10, cha: 16 },
  hd: { max: 2, used: 1 },
  slots: Array.from({ length: 9 }, (_, i) => ({ max: i === 0 ? 3 : 0, used: i === 0 ? 1 : 0 })),
  res: [
    { i: '🧪', n: 'Trank der Heilung', max: 3, used: 1, rest: 'none', p: 'x' },
    { i: '💫', n: 'Inspiration', max: 3, used: 0, rest: 'short', p: 'y' },
  ],
  spells: [{ i: '🔥', n: 'Fire Bolt', lvl: 0, used: false, p: 'alt' }, { i: '✨', n: 'Eigenbau', lvl: 1, p: 'Konz. eigen' }],
  items: [{ i: '🗡️', n: 'Dolch', q: 2, p: 'alt' }, { i: '📦', n: 'Kiste', q: 1, p: 'eigen' }],
  gold: { pp: 1, gp: 2, ep: 0, sp: 3, cp: 4 }, cond: { Blinded: true }, exh: 1, notes: 'Geheimnis', tab: 'main',
};

test.describe('Migration alter Speicherstände', () => {
  test('v4 wird unverändert geladen', async ({ page }) => {
    await seed(page, base4({ name: 'Vier', notes: 'n4', bag: [item('a', 'Seil')] }));
    await expect(page.locator('h1')).toHaveText('Vier');
    await act(page, 'hp', '[data-d="-1"]').first().click();
    const s = await read(page);
    expect(s.notes).toBe('n4');
    expect(s.bag[0].n).toBe('Seil');
    expect(s.bag.length).toBe(24);
    expect(s.hp).toBe(19);
  });

  test('v3 wird übernommen und unter v4 gespeichert', async ({ page }) => {
    await seed(page, { v: 3, name: 'Drei', cls: 'W', hp: 9, hpMax: 9, abil: { str: 10, dex: 10, con: 10, int: 18, wis: 10, cha: 10 } }, 'charbogen-v3');
    await expect(page.locator('h1')).toHaveText('Drei');
    await act(page, 'hp', '[data-d="-1"]').first().click();
    const s = await read(page);
    expect(s.v).toBe(4);
    expect(s.klass).toBe('Wizard');
    expect(s.abil.int).toBe(18);
  });

  test('v2 wird umgebaut: Tränke in den Rucksack, Zauber und Gegenstände übernommen', async ({ page }) => {
    await seed(page, v2, 'charbogen-v2');
    await expect(page.locator('h1')).toHaveText('Alt');
    await act(page, 'hp', '[data-d="1"]').first().click();
    const s = await read(page);
    expect(s.hp).toBe(8);
    expect(s.notes).toBe('Geheimnis');
    expect(s.gold).toMatchObject({ pp: 1, gp: 2, sp: 3, cp: 4 });
    expect(s.cond.Blinded).toBe(true);
    expect(s.res.map(r => r.n)).toEqual(['Inspiration']);
    const q = re => s.bag.filter(Boolean).find(x => re.test(x.n))?.q;
    expect(q(/Potion of Healing|Trank der Heilung/)).toBe(2);
    expect(q(/Dagger|Dolch/)).toBe(2);
    expect(q(/Kiste/)).toBe(1);
    expect(s.spells.find(x => x.n === 'Fire Bolt').src).toBe('sum');
    const own = s.spells.find(x => x.n === 'Eigenbau');
    expect(own.src).toBe('own');
    expect(own.conc).toBe(true);
  });

  test('v4 hat Vorrang vor älteren Ständen', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(([k, a, b]) => { localStorage.setItem(k, a); localStorage.setItem('charbogen-v2', b); }, [KEY, JSON.stringify(base4({ name: 'Neu' })), JSON.stringify(v2)]);
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Neu');
  });

  test('kaputter Speicher führt nicht zum Absturz', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(k => localStorage.setItem(k, '{kaputt'), KEY);
    await page.reload();
    await expect(page.locator('#app header')).toBeVisible();
  });
});

test.describe('Export und Import', () => {
  test('Export erzeugt JSON, Import stellt den Stand wieder her', async ({ page }) => {
    await seed(page, base4({ name: 'Original', notes: 'behalten', tab: 'setup' }));
    await act(page, 'exp').click();
    const text = await page.locator('#exp').inputValue();
    expect(JSON.parse(text).name).toBe('Original');
    await act(page, 'reset').click();
    await act(page, 'reset').click();
    expect((await read(page)).notes).toBe('');
    await page.locator('#imp').fill(text);
    await act(page, 'imp').click();
    await act(page, 'imp').click();
    const s = await read(page);
    expect(s.name).toBe('Original');
    expect(s.notes).toBe('behalten');
  });

  test('ungültiger Text ändert nichts', async ({ page }) => {
    await seed(page, base4({ name: 'Bleibt', tab: 'setup' }));
    await page.locator('#imp').fill('das ist kein json');
    await act(page, 'imp').click();
    await act(page, 'imp').click();
    await expect(page.locator('#toast')).toBeVisible();
    expect((await read(page)).name).toBe('Bleibt');
  });

  test('Datei ohne Server: läuft über file:// und übersteht ein Neuladen', async ({ page }) => {
    expect(URL_UNDER_TEST.startsWith('file://')).toBe(true);
    await seed(page, base4({ name: 'Bleibt' }));
    await page.reload();
    await expect(page.locator('h1')).toHaveText('Bleibt');
  });
});

test.describe('Darstellung', () => {
  for (const t of ['main', 'inv', 'wiki', 'notes', 'setup']) {
    test(`Handybreite ohne Querscrollen: ${t}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      await seed(page, base4({ tab: t }));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBeLessThanOrEqual(0);
    });
  }
});
