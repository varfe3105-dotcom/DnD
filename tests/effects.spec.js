import { test, expect, seed, read, act, base4, item } from './helpers.js';

const chain = () => item('a1', 'Chain Mail', { ref: 'item:chain-mail', slot: 'body' });
const speedBox = page => page.locator('.st', { hasText: /Speed|Tempo/ });

test.describe('Wirkungen von Zuständen, Erschöpfung und Rüstung @new', () => {
  test('ohne Zustände keine Übersicht und keine Marken', async ({ page }) => {
    await seed(page, base4({}));
    await expect(page.locator('.fx')).toHaveCount(0);
    await expect(page.locator('.fxm')).toHaveCount(0);
  });

  test('Poisoned: Nachteil bei Angriffen und Attributswürfen, mit Grund', async ({ page }) => {
    await seed(page, base4({ cond: { Poisoned: true } }));
    await expect(page.locator('.fx')).toContainText('Poisoned');
    await expect(page.locator('.atk-un .fxw.dis')).toBeVisible();
    await expect(page.locator('.skg h3 .fxm.dis')).toHaveCount(5);
    await expect(page.locator('.sv .fxm')).toHaveCount(0);
  });

  test('Paralyzed: Stärke- und Geschicklichkeitsrettungswürfe scheitern, Tempo 0', async ({ page }) => {
    await seed(page, base4({ cond: { Paralyzed: true } }));
    await expect(page.locator('.sv .fxm.fail')).toHaveCount(2);
    await expect(speedBox(page).locator('b')).toHaveText('0 ft.');
    await expect(page.locator('.fx')).toContainText(/critical|kritisch/);
  });

  test('Erschöpfung 2 halbiert das Tempo, 4 das TP-Maximum, Heilen hört dort auf', async ({ page }) => {
    await seed(page, base4({ exh: 2 }));
    await expect(speedBox(page).locator('b')).toHaveText('15 ft.');
    await seed(page, base4({ exh: 4, hp: 5, hpMax: 20 }));
    await expect(page.locator('.hpn small')).toContainText('/ 10');
    await page.locator('#hpv').fill('30');
    await act(page, 'heal').click();
    expect((await read(page)).hp).toBe(10);
  });

  test('Kettenhemd: Stealth-Nachteil, zu wenig Stärke kostet 3 m Tempo', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', abil: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 10 }, eq: { body: chain() } }));
    await expect(page.locator('.skr', { hasText: 'Stealth' }).locator('.fxm.dis')).toBeVisible();
    await expect(speedBox(page).locator('b')).toHaveText('20 ft.');
    await expect(page.locator('.atk-un .fxw')).toHaveCount(0);
  });

  test('Rüstung ohne Übung: Nachteil auf Angriffe, kein Zaubern', async ({ page }) => {
    await seed(page, base4({ klass: 'Wizard', abil: { str: 16, dex: 14, con: 12, int: 16, wis: 10, cha: 10 }, eq: { body: chain() } }));
    await expect(page.locator('.atk-un .fxw.dis')).toBeVisible();
    await expect(page.locator('.fx')).toContainText(/No spellcasting|Kein Zaubern/);
    await expect(page.locator('.sv .fxm.dis')).toHaveCount(2);
  });

  test('Bergzwerg darf mittlere Rüstung, Zwerge verlieren kein Tempo', async ({ page }) => {
    await seed(page, base4({ klass: 'Wizard', race: 'Dwarf', subrace: 'Mountain Dwarf', speed: 7.5, abil: { str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 10 }, eq: { body: chain() } }));
    await expect(speedBox(page).locator('b')).toHaveText('25 ft.');
    await expect(page.locator('.fx')).toContainText(/without proficiency|ohne Übung/);
  });
});

test.describe('Zaubertricks nach Charakterstufe @new', () => {
  const sp = n => ({ n, ic: 'flame', lvl: 0, time: '', range: '', dur: '', eff: '', conc: false, ritual: false, school: '', cls: '', src: 'sum' });
  test('Fire Bolt auf Stufe 5: 2d10 und Zauberangriff', async ({ page }) => {
    await seed(page, base4({ klass: 'Wizard', level: 5, prof: 3, abil: { str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 10 }, spells: [sp('Fire Bolt')] }));
    await expect(page.locator('.sp .cant')).toHaveText('Spell attack +6 · Damage 2d10 fire');
  });
  test('Eldritch Blast auf Stufe 11 mit Agonizing Blast: drei Strahlen mit Charisma', async ({ page }) => {
    await seed(page, base4({ klass: 'Warlock', level: 11, prof: 4, abil: { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 18 }, feats: [{ n: 'Agonizing Blast', p: '', src: 'Klasse' }], spells: [sp('Eldritch Blast')] }));
    await expect(page.locator('.sp .cant')).toContainText('3 beams of 1d10+4 force');
  });
  test('Sacred Flame zeigt Rettungswurf und SG', async ({ page }) => {
    await seed(page, base4({ klass: 'Cleric', level: 1, prof: 2, abil: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 }, spells: [sp('Sacred Flame')] }));
    await expect(page.locator('.sp .cant')).toHaveText('Dexterity save, DC 13 · Damage 1d8 radiant');
  });
});

test.describe('Merkmale, die Werte ändern @new', () => {
  const stat = (page, re) => page.locator('.st', { hasText: re }).locator('b').first();
  const abil = { str: 10, dex: 14, con: 12, int: 10, wis: 12, cha: 10 };
  test('Jack of All Trades: halber Übungsbonus auf ungeübte Fertigkeiten und Initiative', async ({ page }) => {
    await seed(page, base4({ klass: 'Bard', level: 3, prof: 2, abil, skills: { Persuasion: 1 } }));
    await expect(page.locator('.skr', { hasText: 'Athletics' }).locator('b')).toHaveText('+1');
    await expect(page.locator('.skr', { hasText: 'Persuasion' }).locator('b')).toHaveText('+2');
    await expect(stat(page, /Initiative/)).toHaveText('+3');
  });
  test('Alert +5 auf Initiative, Observant +5 auf passive Wahrnehmung', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', abil, feats: [{ n: 'Alert', p: '', src: 'Talent' }, { n: 'Observant', p: '', src: 'Talent' }] }));
    await expect(stat(page, /Initiative/)).toHaveText('+7');
    await expect(stat(page, /Passive/)).toHaveText('16');
  });
  test('Mönch Stufe 6 ohne Rüstung: +15 ft Tempo', async ({ page }) => {
    await seed(page, base4({ klass: 'Monk', level: 6, abil }));
    await expect(page.locator('.st', { hasText: /Speed/ }).locator('b .fxw')).toHaveText('45 ft.');
    await expect(page.locator('.fx')).toHaveCount(0);
  });
});

test.describe('Munition, passive Werte, Reliable Talent @new', () => {
  test('Langbogen zeigt Pfeile, „Schuss −1“ zieht einen ab, leer gibt einen Hinweis', async ({ page }) => {
    const bow = item('w1', 'Longbow', { ref: 'item:longbow', slot: 'hand', p: 'Martial · 1d8 piercing · Ammunition (range 150/600), Heavy, Two-Handed · 50 gp' });
    const arrows = item('a1', 'Arrows (20)', { ref: 'item:arrow', q: 2, cons: true });
    const bag = Array(24).fill(null); bag[0] = arrows;
    await seed(page, base4({ klass: 'Ranger', eq: { main: bow }, bag }));
    await expect(page.locator('.ammo b')).toHaveText('2');
    await act(page, 'shoot').click();
    await expect(page.locator('.ammo b')).toHaveText('1');
    await act(page, 'shoot').click();
    await expect(page.locator('.ammo')).toContainText(/No .* in the backpack|Keine/);
    expect((await read(page)).bag[0]).toBeNull();
  });
  test('passive Motiv erkennen und Nachforschungen stehen unter der passiven Wahrnehmung', async ({ page }) => {
    await seed(page, base4({ abil: { str: 10, dex: 10, con: 10, int: 14, wis: 12, cha: 10 } }));
    await expect(page.locator('.st', { hasText: /Passive/ }).locator('.fxsub')).toHaveText('Insight 11 · Investigation 12');
  });
  test('Schurke ab Stufe 11 bekommt den Hinweis zu Reliable Talent', async ({ page }) => {
    await seed(page, base4({ klass: 'Rogue', level: 11, prof: 4 }));
    await expect(page.locator('.fxnote', { hasText: 'Reliable Talent' })).toBeVisible();
  });
});

test.describe('Goliath @new', () => {
  test('im Wiki mit Buchangabe, beide Varianten, Stone’s Endurance je nach Variante', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await page.locator('#wq').fill('Goliath');
    await act(page, 'wsel', '[data-key="race:Goliath"]').click();
    await expect(page.locator('.wd.pane')).toContainText("Volo's Guide to Monsters / Monsters of the Multiverse");
    await expect(page.locator('.wd.pane')).toContainText('Monsters of the Multiverse');
    await expect(page.locator('.wd.pane')).toContainText('Natural Athlete');
  });
  test('Auswahl im Einrichten setzt Tempo, Fähigkeit und doppelte Tragkraft', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', prof: 3, abil: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 10 } }));
    await page.locator('[data-p="race"]').selectOption('Goliath');
    await page.locator('[data-p="subrace"]').selectOption("Volo's Guide");
    let s = await read(page);
    expect(s.speed).toBe(9);
    expect(s.res.find(r => r.n === "Stone's Endurance")).toMatchObject({ max: 1, rest: 'short' });
    await page.locator('[data-p="subrace"]').selectOption('Monsters of the Multiverse');
    s = await read(page);
    expect(s.res.filter(r => r.n === "Stone's Endurance")).toHaveLength(1);
    expect(s.res.find(r => r.n === "Stone's Endurance")).toMatchObject({ max: 3, rest: 'long' });
    await page.locator('[data-a="tab"][data-t="inv"]').click();
    await expect(page.locator('.carryv')).toContainText('480');
  });
});

test.describe('Monster im Wiki @new', () => {
  test('Filter Monster zeigt Werteblock mit HG, XP und Fähigkeiten', async ({ page }) => {
    await seed(page, base4({ tab: 'wiki' }));
    await act(page, 'wf', '[data-f="monster"]').click();
    await page.locator('#wq').fill('Goblin');
    await act(page, 'wsel', '[data-key="monster:goblin"]').click();
    const pane = page.locator('.wd.pane');
    await expect(pane).toContainText('50 XP');
    await expect(pane).toContainText('Nimble Escape');
    await expect(pane).toContainText(/Armor Class|Rüstungsklasse/);
  });
});

test.describe('Übersichtlichkeit @new', () => {
  test('Zustände: nur aktive sichtbar, „+ Zustand“ klappt die Liste auf', async ({ page }) => {
    await seed(page, base4({ cond: { Poisoned: true } }));
    await expect(page.locator('[data-a="cond"]')).toHaveCount(1);
    await act(page, 'condopen').click();
    await expect(page.locator('[data-a="cond"]')).toHaveCount(14);
  });
  test('Ansicht Kampf blendet Fertigkeiten aus, Erkundung die Angriffe; Wahl bleibt gespeichert', async ({ page }) => {
    await seed(page, base4({}));
    await act(page, 'sheetmode', '[data-m="combat"]').click();
    await expect(page.locator('.skgrid')).toHaveCount(0);
    await expect(page.locator('.atk-un')).toBeVisible();
    await act(page, 'sheetmode', '[data-m="explore"]').click();
    await expect(page.locator('.atk-un')).toHaveCount(0);
    await expect(page.locator('.skgrid')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-a="sheetmode"][data-m="explore"]')).toHaveAttribute('aria-pressed', 'true');
  });
  test('Kurzleiste erscheint beim Scrollen und ändert TP', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await seed(page, base4({ hp: 10, hpMax: 20 }));
    await expect(page.locator('body')).not.toHaveClass(/scrolled/);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(page.locator('body')).toHaveClass(/scrolled/);
    await act(page, 'mbhp', '[data-d="-1"]').click();
    expect((await read(page)).hp).toBe(9);
    await act(page, 'mbtab', '[data-t="inv"]').click();
    await expect(page.locator('.invg')).toBeVisible();
  });
  test('Einrichten: Sprungleiste führt zu den Abschnitten', async ({ page }) => {
    await seed(page, base4({ tab: 'setup' }));
    const n = await page.locator('[data-a="jump"]').count();
    expect(n).toBeGreaterThan(8);
    await page.locator('[data-a="jump"]').last().click();
    await expect(page.locator('h2[id^="sec-"]').last()).toBeInViewport();
  });
  test('Handy: Reiter als feste Leiste unten', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await seed(page, base4({}));
    const box = await page.locator('.tabs nav').boundingBox();
    expect(box.y + box.height).toBeGreaterThan(780);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test.describe('Darstellung und Icon @new', () => {
  test('Darstellung wechseln: Schlicht und Modern setzen das Attribut, Grimoire entfernt es; Helligkeit nur im Grimoire', async ({ page }) => {
    await seed(page, base4({ tab: 'setup' }));
    await expect(page.locator('#bright')).toBeVisible();
    await page.locator('#skin').selectOption('plain');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'plain');
    await expect(page.locator('#bright')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'plain');
    await page.locator('#skin').selectOption('modern');
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'modern');
    await page.locator('#skin').selectOption('grimoire');
    await expect(page.locator('html')).not.toHaveAttribute('data-skin', /.+/);
  });
  test('Seite hat ein eigenes Icon', async ({ page }) => {
    await seed(page, base4({}));
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toMatch(/^data:image\/svg\+xml/);
  });
});
