import { test, expect, seed, read, act, tab, rest, base4, item } from './helpers.js';

const weapon = (id, n, p, extra = {}) => item(id, n, { ref: 'item:' + id, p, slot: 'hand', ...extra });
const LONG = 'Martial · 1d8 slashing · Versatile (1d10) · 15 gp';
const SHORT = 'Martial · 1d6 piercing · Finesse, Light · 10 gp';
const BOW = 'Martial · 1d8 piercing · Ammunition (150/600 ft.), Heavy, Two-Handed · 50 gp';
const QS = 'Simple · 1d6 bludgeoning · Versatile (1d8) · 2 sp';
const style = n => ({ n, p: '', lvl: 1, src: 'Klasse' });
const atkVals = page => page.locator('.atk b');
const en = async page => { await page.evaluate(() => localStorage.setItem('charbogen-lang', 'en')); await page.reload(); await page.locator('#app header').waitFor(); };

test.describe('Angriffe @new', () => {
  const longsword = () => weapon('longsword', 'Longsword', LONG);

  test('Übung kommt aus der Klasse', async ({ page }) => {
    await seed(page, base4({ klass: 'Wizard', level: 1, eq: { main: longsword() } }));
    await expect(atkVals(page).first()).toHaveText('+2');
    await expect(act(page, 'wprof')).toHaveAttribute('aria-pressed', 'false');
  });

  test('Fighter ist geübt, Schalter überschreibt und bleibt gespeichert', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 1, eq: { main: longsword() } }));
    await expect(atkVals(page).first()).toHaveText('+4');
    await act(page, 'wprof').click();
    await expect(atkVals(page).first()).toHaveText('+2');
    expect((await read(page)).eq.main.prof).toBe(false);
  });

  test('Elf ist mit dem Langschwert geübt, auch als Wizard', async ({ page }) => {
    await seed(page, base4({ klass: 'Wizard', level: 1, race: 'Elf', subrace: 'High Elf', eq: { main: longsword() } }));
    await expect(atkVals(page).first()).toHaveText('+4');
  });

  test('alte Bögen ohne Klasse gelten weiter als geübt', async ({ page }) => {
    await seed(page, base4({ eq: { main: longsword() } }));
    await expect(atkVals(page).first()).toHaveText('+4');
  });

  test('Archery gibt +2 nur im Fernkampf', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 1, feats: [style('Archery')], eq: { main: weapon('longbow', 'Longbow', BOW) } }));
    await expect(atkVals(page).first()).toHaveText('+7');
    await expect(page.locator('.atkt')).toContainText('Archery +2');
  });

  test('Dueling gilt nur ohne zweite Waffe und nicht beidhändig', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 1, feats: [style('Dueling')], eq: { main: longsword() } }));
    await expect(atkVals(page).nth(1)).toHaveText(/1[dW]8\+4/);
    await expect(page.locator('.atk small').nth(1)).toContainText(/1[dW]10\+2/);
  });

  test('Nebenhand ohne Attributsbonus, mit Two-Weapon Fighting mit', async ({ page }) => {
    const eq = { main: weapon('shortsword', 'Shortsword', SHORT), off: { ...weapon('shortsword', 'Shortsword', SHORT), id: 'b', slot: 'off' } };
    await seed(page, base4({ klass: 'Fighter', level: 1, eq }));
    await expect(atkVals(page).nth(3)).toHaveText(/^1[dW]6$/);
    await seed(page, base4({ klass: 'Fighter', level: 1, eq, feats: [style('Two-Weapon Fighting')] }));
    await expect(atkVals(page).nth(3)).toHaveText(/1[dW]6\+3/);
  });

  test('waffenloser Schlag für alle, Monk mit Kampfkünsten', async ({ page }) => {
    await seed(page, base4({}));
    const row = page.locator('.atk-un');
    await expect(row.locator('.atk b').first()).toHaveText('+4');
    await expect(row.locator('.atk b').nth(1)).toHaveText('3');
    await seed(page, base4({ klass: 'Monk', level: 5, prof: 3 }));
    await expect(row.locator('.atk b').first()).toHaveText('+6');
    await expect(row.locator('.atk b').nth(1)).toHaveText(/1[dW]6\+3/);
  });

  test('Monk nutzt GE und größeren Würfel bei Monk-Waffen', async ({ page }) => {
    await seed(page, base4({ klass: 'Monk', level: 11, prof: 4, eq: { main: weapon('quarterstaff', 'Quarterstaff', QS) } }));
    await expect(atkVals(page).nth(1)).toHaveText(/1[dW]8\+3/);
  });

  test('Kampfstil in Einrichten umschalten', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 1, tab: 'setup' }));
    await act(page, 'style', '[data-n="Archery"]').click();
    expect((await read(page)).feats.map(f => f.n)).toEqual(['Archery']);
    await act(page, 'style', '[data-n="Archery"]').click();
    expect((await read(page)).feats).toHaveLength(0);
  });
});

test.describe('Ladungen @new', () => {
  const wand = (extra = {}) => item('w', 'Wand of Magic Missiles', { ref: 'magic:wand-of-magic-missiles', p: 'x', magic: true, ...extra });
  const bagOf = it => { const bag = Array(24).fill(null); bag[0] = it; return bag; };

  test('erkennt Ladungen, Kästchen zählen', async ({ page }) => {
    await seed(page, base4({ bag: bagOf(wand()) }));
    await expect(act(page, 'chg')).toHaveCount(7);
    await act(page, 'chg', '[data-j="0"]').click();
    expect((await read(page)).bag[0].chUsed).toBe(1);
  });

  test('lange Rast ändert nichts, Neuer Tag trägt das Würfelergebnis ein', async ({ page }) => {
    await seed(page, base4({ bag: bagOf(wand({ chUsed: 5 })) }));
    await rest(page, 'long');
    expect((await read(page)).bag[0].chUsed).toBe(5);
    await act(page, 'dawn').click();
    await expect(page.locator('.dawnr')).toContainText(/1[dW]6\+1/);
    await page.locator('[data-dawn]').fill('3');
    await act(page, 'dawnapply').click();
    expect((await read(page)).bag[0].chUsed).toBe(2);
    await expect(page.locator('.dawn')).toHaveCount(0);
  });

  test('leeres Feld bleibt unverändert, Rückgabe stoppt bei voll', async ({ page }) => {
    await seed(page, base4({ bag: bagOf(wand({ chUsed: 2 })) }));
    await act(page, 'dawn').click();
    await act(page, 'dawnapply').click();
    expect((await read(page)).bag[0].chUsed).toBe(2);
    await act(page, 'dawn').click();
    await page.locator('[data-dawn]').fill('6');
    await act(page, 'dawnapply').click();
    expect((await read(page)).bag[0].chUsed).toBe(0);
  });

  test('viele Ladungen als Zähler', async ({ page }) => {
    const staff = item('s', 'Staff of the Magi', { ref: 'magic:staff-of-the-magi', p: 'x', magic: true });
    await seed(page, base4({ bag: bagOf(staff) }));
    await expect(page.locator('[data-a="chg"]')).toHaveCount(0);
    await page.locator('[data-a="chgd"][data-d="1"]').click();
    expect((await read(page)).bag[0].chUsed).toBe(1);
  });

  test('Gegenstand ohne Ladungen zeigt keine Karte, eigener bekommt welche', async ({ page }) => {
    const own = item('o', 'Zauberstab', { p: 'x' });
    await seed(page, base4({ bag: bagOf(own), tab: 'inv' }));
    await page.locator('[data-drag="bag:0"]').click();
    await page.locator('.chg-edit summary').click();
    const f = page.locator('[data-p="bag.0.chMax"]');
    await f.fill('4');
    await f.blur();
    await tab(page, 'main');
    await expect(act(page, 'chg')).toHaveCount(4);
  });
});

test.describe('Begleiter @new', () => {
  const setup = (s = {}) => base4({ tab: 'setup', ...s });
  const addWolf = async page => {
    await page.locator('#pet-q').fill('wolf');
    await act(page, 'petadd', '[data-m="wolf"]').click();
  };

  test('aus SRD-Monstern hinzufügen, Karte zeigt Werte und Angriff', async ({ page }) => {
    await seed(page, setup());
    await addWolf(page);
    await tab(page, 'main');
    await expect(page.locator('.pethp')).toHaveText('11/11');
    await expect(page.locator('.petatk')).toContainText('Bite');
    await expect(page.locator('.petatk b').first()).toHaveText('+4');
    await expect(page.locator('.petatk b').nth(1)).toHaveText(/1[dW]6\+2/);
  });

  test('TP ändern, 0 TP als gefallen, lange Rast heilt', async ({ page }) => {
    await seed(page, base4({ pets: [{ id: 'p', n: 'Wolf', ac: 13, hp: 1, hpMax: 11, speed: '', text: '', source: 'srd', bm: false }] }));
    await act(page, 'pethp', '[data-d="-1"]').click();
    expect((await read(page)).pets[0].hp).toBe(0);
    await expect(page.locator('.petdown')).toHaveCount(1);
    await rest(page, 'long');
    expect((await read(page)).pets[0].hp).toBe(11);
  });

  test('Beast Master rechnet Übungsbonus und TP-Minimum', async ({ page }) => {
    await seed(page, setup({ klass: 'Ranger', sub: 'Beast Master', level: 5, prof: 3 }));
    await addWolf(page);
    await tab(page, 'main');
    await expect(page.locator('.pethp')).toHaveText('11/20');
    await expect(page.locator('.petatk b').first()).toHaveText('+7');
    await expect(page.locator('.petatk b').nth(1)).toHaveText(/1[dW]6\+5/);
  });

  test('eigener Begleiter und alte Bögen', async ({ page }) => {
    await seed(page, setup());
    await page.locator('#pet-q').waitFor();
    await page.locator('details', { hasText: /Eigener Begleiter|Custom companion/ }).locator('summary').click();
    await page.locator('#pet-n').fill('Rabe');
    await page.locator('#pet-ac').fill('12');
    await page.locator('#pet-hp').fill('3');
    await act(page, 'petown').click();
    expect((await read(page)).pets[0]).toMatchObject({ n: 'Rabe', ac: 12, hpMax: 3, source: 'own' });
    await seed(page, base4({}));
    expect(await page.locator('.pethp').count()).toBe(0);
  });
});

test.describe('Hintergründe @new', () => {
  const start = (s = {}) => seed(page0(s), s);
  let current;
  const page0 = () => current;
  const open = async (page, s = {}) => { current = page; await start(base4({ tab: 'setup', ...s })); };

  const pick = async (page, id, { mode = '21', a2, a1, tool, gear = 'A' } = {}) => {
    await page.locator('#bg-sel').selectOption(id);
    if (mode !== '21') await page.locator('#bg-mode').selectOption(mode);
    if (a2) await page.locator('#bg-a2').selectOption(a2);
    if (a1) await page.locator('#bg-a1').selectOption(a1);
    if (tool) await page.locator('#bg-tool').selectOption(tool);
    if (gear !== 'A') await page.locator('#bg-gear').selectOption(gear);
    await act(page, 'bgapply').click();
  };

  test('2024: Attribute +2/+1, Fertigkeiten, Werkzeug, Herkunftstalent, Ausrüstung A', async ({ page }) => {
    await open(page);
    await pick(page, 'sailor', { a2: 'dex', a1: 'wis' });
    await expect.poll(async () => (await read(page)).bg?.id).toBe('sailor');
    const s = await read(page);
    expect(s.abil).toMatchObject({ dex: 18, wis: 11 });
    expect(s.skills).toMatchObject({ Acrobatics: 1, Perception: 1 });
    expect(s.gold.gp).toBe(20);
    expect(s.tools.length).toBe(1);
    expect(s.bag.filter(Boolean).map(x => x.ref)).toEqual(expect.arrayContaining(['item:dagger', 'item:navigators-tools', 'item:rope']));
    expect(s.feats[0]).toMatchObject({ n: 'Tavern Brawler', bg: true });
  });

  test('Dialog verlangt verschiedene Attribute und das Spielset; +1/+1/+1 und 50 GM gehen auch', async ({ page }) => {
    await open(page);
    await page.locator('#bg-sel').selectOption('noble');
    await page.locator('#bg-a2').selectOption('str');
    await page.locator('#bg-a1').selectOption('str');
    await act(page, 'bgapply').click();
    expect((await read(page)).bg).toBeFalsy();
    await page.locator('#bg-mode').selectOption('111');
    await page.locator('#bg-tool').selectOption('dice');
    await page.locator('#bg-gear').selectOption('B');
    await act(page, 'bgapply').click();
    const s = await read(page);
    expect(s.bg.id).toBe('noble');
    expect(s.abil).toMatchObject({ str: 15, int: 11, cha: 11 });
    expect(s.gold.gp).toBe(50);
    expect((s.bag || []).filter(Boolean)).toHaveLength(0);
  });

  test('gewähltes Instrument landet im Rucksack', async ({ page }) => {
    await open(page);
    await pick(page, 'entertainer', { a2: 'cha', a1: 'dex', tool: 'lute' });
    const s = await read(page);
    expect(s.bag.filter(Boolean).map(x => x.ref)).toContain('item:lute');
  });

  test('Wechsel nimmt Fertigkeiten, Attributserhöhung und Talent zurück', async ({ page }) => {
    await open(page, { skills: { Insight: 2 } });
    await pick(page, 'sailor', { a2: 'dex', a1: 'wis' });
    await expect.poll(async () => (await read(page)).bg?.id).toBe('sailor');
    await pick(page, 'criminal', { a2: 'dex', a1: 'int' });
    await expect.poll(async () => (await read(page)).bg?.id).toBe('criminal');
    const s = await read(page);
    expect(s.skills).toEqual({ Insight: 2, 'Sleight of Hand': 1, Stealth: 1 });
    expect(s.abil).toMatchObject({ dex: 18, wis: 10, int: 11 });
    expect(s.feats.map(f => f.n)).toEqual(['Alert']);
  });

  test('schon geübte Fertigkeit bleibt beim Wechsel', async ({ page }) => {
    await open(page, { skills: { Acrobatics: 1 } });
    await pick(page, 'sailor', { a2: 'str', a1: 'dex' });
    await expect.poll(async () => (await read(page)).bg?.skills).toEqual(['Perception']);
    await page.locator('#bg-sel').selectOption('');
    await expect.poll(async () => (await read(page)).bg).toBeNull();
    const s = await read(page);
    expect(s.skills).toEqual({ Acrobatics: 1 });
    expect(s.abil).toMatchObject({ str: 14, dex: 16 });
  });
});

test.describe('Spickzettel @new', () => {
  const dm = async page => {
    await page.goto((await import('./helpers.js')).URL_UNDER_TEST);
    await page.evaluate(s => { localStorage.clear(); localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'cheat' })); }, base4({ tab: 'dm' }));
    await page.reload();
    await page.locator('#app header').waitFor();
  };

  test('alle Abschnitte da, Suche filtert, Tabellen werden gezeichnet', async ({ page }) => {
    await dm(page);
    await expect(page.locator('.dm-rs')).toHaveCount(33);
    await page.locator('#dm-rq').fill('falling');
    expect(await page.locator('.dm-rs').count()).toBeLessThan(33);
    await page.locator('#dm-rq').fill('');
    await en(page);
    await page.locator('.dm-rs[data-rid="objects"] summary').first().click();
    await page.locator('.dm-rs[data-rid="objects"] .rs-orig > summary').click();
    await expect(page.locator('.dm-rs[data-rid="objects"] .rs-sub').first()).toBeVisible();
    await expect(page.locator('.dm-rs[data-rid="objects"] table').first()).toBeAttached();
  });

  test('deutsche Kurzfassung mit Originaltext', async ({ page }) => {
    await dm(page);
    await page.evaluate(() => localStorage.setItem('charbogen-lang', 'de'));
    await page.reload();
    const cover = page.locator('.dm-rs[data-rid="cover"]');
    await cover.locator('summary').first().click();
    await expect(cover).toContainText('+5 auf RK');
    await expect(cover.locator('.rs-orig')).toHaveCount(1);
  });
});
