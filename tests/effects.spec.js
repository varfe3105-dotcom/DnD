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
