// Regeln 2024, Nachträge: Anrufungen und Metamagie nach 2024 (Stufen, Voraussetzungen), fehlende PHB-Zauber,
// Sneak Attack bei den Angriffen, Glückspunkte aus Lucky, Aufladen bei Monstern.
import { test, expect, seed, read, act, base4, URL_UNDER_TEST } from './helpers.js';

const caster = (klass, level, extra = {}) => base4({ klass, level, prof: level >= 5 ? 3 : 2, abil: { str: 10, dex: 14, con: 14, int: 12, wis: 12, cha: 16 }, tab: 'main', ...extra });
const opts = (page, id) => page.locator(`#lu-${id} option`).evaluateAll(o => o.map(x => x.value).filter(Boolean));

test.describe('Regeln 2024 Nachträge @new', () => {
  test('Hexenmeister: Anrufung schon auf Stufe 1, Liste nach Stufe gefiltert', async ({ page }) => {
    await seed(page, caster('Warlock', 0));
    await act(page, 'lu').click();
    const l1 = await opts(page, 'invocations0');
    expect(l1).toEqual(expect.arrayContaining(['Pact of the Blade', 'Pact of the Chain', 'Pact of the Tome', 'Armor of Shadows', 'Eldritch Mind']));
    expect(l1).not.toContain('Agonizing Blast'); // ab Stufe 2
    expect(l1).not.toContain('Thirsting Blade'); // ab Stufe 5 und Pact of the Blade
    expect(l1).not.toContain('Book of Ancient Secrets'); // Liste von 2014
  });

  test('Hexenmeister Stufe 5: zwei neue Anrufungen; Thirsting Blade nur mit Pact of the Blade', async ({ page }) => {
    await seed(page, caster('Warlock', 4, { sub: 'Fiend Patron', feats: [{ n: 'Pact of the Blade', p: '', lvl: 1 }] }));
    await act(page, 'lu').click();
    await expect(page.locator('#lu-invocations1')).toBeVisible();
    expect(await opts(page, 'invocations0')).toEqual(expect.arrayContaining(['Thirsting Blade', 'Eldritch Smite', 'Agonizing Blast']));
    expect(await opts(page, 'invocations0')).not.toContain('Investment of the Chain Master');
    expect(await opts(page, 'invocations0')).not.toContain('Pact of the Blade'); // schon gewählt
  });

  test('Zauberer: Metamagie auf Stufe 2 mit zwei Optionen, darunter Seeking und Transmuted Spell', async ({ page }) => {
    await seed(page, caster('Sorcerer', 1));
    await act(page, 'lu').click();
    await expect(page.locator('#lu-metamagic1')).toBeVisible();
    expect(await opts(page, 'metamagic0')).toEqual(expect.arrayContaining(['Seeking Spell', 'Transmuted Spell', 'Quickened Spell']));
    expect((await opts(page, 'metamagic0')).length).toBe(10);
  });

  test('Neue PHB-2024-Zauber im Katalog', async ({ page }) => {
    await seed(page, caster('Wizard', 5, { tab: 'wiki' }));
    for (const n of ['Arcane Vigor', 'Toll the Dead', 'Tasha\'s Bubbling Cauldron']) {
      await page.locator('#wq').fill(n);
      await expect(page.locator('.wli').first()).toContainText(n);
    }
  });

  test('Schurke: Sneak Attack mit Würfeln nach Stufe bei den Angriffen', async ({ page }) => {
    await seed(page, caster('Rogue', 5, { tab: 'main' }));
    await expect(page.locator('.atk-sneak')).toContainText(/3[Wd]6/);
    await expect(page.locator('.atk-sneak')).toContainText(/einmal pro Zug|once per turn/);
  });

  test('Lucky: Glückspunkte = Übungsbonus, verschwinden ohne Talent wieder', async ({ page }) => {
    await seed(page, caster('Fighter', 5, { feats: [{ n: 'Lucky', p: '', lvl: 0 }] }));
    await expect.poll(async () => (await read(page)).res.find(r => r.n === 'Luck Points')).toMatchObject({ max: 3, rest: 'long', feat: true });
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('charbogen-v4')); s.feats = []; localStorage.setItem('charbogen-v4', JSON.stringify(s)); });
    await page.reload();
    await expect.poll(async () => (await read(page)).res.some(r => r.n === 'Luck Points')).toBe(false);
  });

  test('Monster mit Aufladen: Schalter bereit/verbraucht mit Hinweis zum Würfeln', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    const combat = { round: 1, active: 'w1', list: [{ id: 'w1', kind: 'mon', mon: 'red-dragon-wyrmling', name: 'Wyrmling', init: 15, hp: 75, hpMax: 75, ac: 17, cond: {}, fx: [], note: '' }, { id: 'p1', kind: 'pc', name: 'Borin', init: 10, hp: 30, hpMax: 30, ac: 16, cond: {}, fx: [], note: '' }] };
    await page.evaluate(([s, c]) => { localStorage.clear(); localStorage.setItem('charbogen-lang', 'de'); localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, combat: c })); }, [base4({ tab: 'dmcombat' }), combat]);
    await page.reload();
    const chip = page.locator('.rech [data-a="dmrech"]', { hasText: 'Fire Breath' });
    await expect(chip).toContainText('bereit');
    await chip.click();
    await expect(page.locator('.rech [data-a="dmrech"]', { hasText: 'Fire Breath' })).toContainText('verbraucht');
    await expect(page.locator('.rech .note')).toContainText('Fire Breath 5–6');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')).combat.list[0].rechUsed)).toEqual({ 'Fire Breath': true });
  });
});
