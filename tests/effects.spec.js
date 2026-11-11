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
