import { test, expect, seed, read, act, tab, base4, spell, blankSlots } from './helpers.js';

const slots = (...m) => blankSlots().map((s, i) => ({ max: m[i] || 0, used: 0 }));
const cleric = o => base4({ klass: 'Cleric', level: 5, prof: 3, abil: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }, slots: slots(4, 3, 2), ...o });

test.describe('Grad wählen @new', () => {
  test('mehrere freie Grade öffnen die Auswahl, gewählt wird der angeklickte', async ({ page }) => {
    await seed(page, cleric({ spells: [spell('Cure Wounds', 1)] }));
    await act(page, 'cast').click();
    expect((await read(page)).slots[0].used).toBe(0);
    await expect(page.locator('[data-a="castslot"]')).toHaveCount(3);
    await act(page, 'castslot', '[data-l="3"]').click();
    const s = await read(page);
    expect(s.slots.map(x => x.used).slice(0, 3)).toEqual([0, 0, 1]);
    await expect(page.locator('[data-a="castslot"]')).toHaveCount(0);
  });
  test('verbrauchte Grade stehen nicht zur Wahl', async ({ page }) => {
    await seed(page, cleric({ spells: [spell('Cure Wounds', 1)], slots: [{ max: 4, used: 4 }, { max: 3, used: 0 }, { max: 2, used: 0 }, ...blankSlots().slice(3)] }));
    await act(page, 'cast').click();
    await expect(page.locator('[data-a="castslot"]')).toHaveText(['Level 2', 'Level 3']);
  });
  test('nur ein freier Grad wird sofort gewirkt', async ({ page }) => {
    await seed(page, cleric({ spells: [spell('Revivify', 3)] }));
    await act(page, 'cast').click();
    expect((await read(page)).slots[2].used).toBe(1);
    await expect(page.locator('[data-a="castslot"]')).toHaveCount(0);
  });
  test('Paktmagie steht zur Wahl, Konzentration greift erst nach der Wahl', async ({ page }) => {
    await seed(page, base4({ slots: slots(2), pact: { max: 1, used: 0, lvl: 2 }, spells: [spell('Hex', 1, { conc: true })] }));
    await act(page, 'cast').click();
    expect((await read(page)).conc || '').toBe('');
    await expect(page.locator('[data-a="castslot"]').first()).toHaveText('Pact 2');
    await page.locator('[data-a="castslot"]').first().click();
    const s = await read(page);
    expect(s.pact.used).toBe(1);
    expect(s.conc).toBe('Hex');
  });
  test('erneuter Klick oder andere Aktion schließt die Auswahl', async ({ page }) => {
    await seed(page, cleric({ spells: [spell('Cure Wounds', 1)] }));
    await act(page, 'cast').click();
    await act(page, 'cast').click();
    await expect(page.locator('[data-a="castslot"]')).toHaveCount(0);
    await act(page, 'cast').click();
    await act(page, 'hp', '[data-d="-1"]').first().click();
    await expect(page.locator('[data-a="castslot"]')).toHaveCount(0);
  });
});

test.describe('Vorbereitete Zauber @new', () => {
  const list = () => [spell('Bless', 1), spell('Command', 1), spell('Sleep', 1, { prep: false }), spell('Guidance', 0)];
  test('Filter blendet Unvorbereitete aus, Zähler rechnet Attribut plus Stufe', async ({ page }) => {
    await seed(page, cleric({ spells: list() }));
    await expect(page.locator('.spprep')).toContainText('Prepared 2 of 8');
    await expect(page.locator('.sp', { hasText: 'Sleep' })).toHaveCount(0);
    await expect(page.locator('.sp', { hasText: 'Guidance' })).toBeVisible();
    await act(page, 'spall').click();
    await expect(page.locator('.sp', { hasText: 'Sleep' })).toHaveClass(/off/);
    await expect(page.locator('.sp', { hasText: 'Sleep' }).locator('[data-a="cast"]')).toHaveCount(0);
  });
  test('Häkchen schaltet um und wird gespeichert', async ({ page }) => {
    await seed(page, cleric({ spells: list() }));
    await act(page, 'spall').click();
    await page.locator('.sp', { hasText: 'Sleep' }).locator('[data-a="prep"]').click();
    expect((await read(page)).spells.find(s => s.n === 'Sleep').prep).toBe(true);
    await expect(page.locator('.spprep')).toContainText('Prepared 3 of 8');
  });
  test('immer vorbereitete zählen nicht und sind gesperrt', async ({ page }) => {
    await seed(page, cleric({ spells: [spell('Bless', 1), spell('Charm Person', 1, { always: true })] }));
    await expect(page.locator('.spprep')).toContainText('Prepared 1 of 8');
    await expect(page.locator('.sp', { hasText: 'Charm Person' }).locator('[data-a="prep"]')).toBeDisabled();
  });
  test('Klassen ohne Vorbereiten sehen nichts davon', async ({ page }) => {
    await seed(page, base4({ klass: 'Sorcerer', level: 3, slots: slots(4), spells: [spell('Sleep', 1, { prep: false })] }));
    await expect(page.locator('.spprep')).toHaveCount(0);
    await expect(page.locator('.sp', { hasText: 'Sleep' })).toBeVisible();
  });
  test('alte Bögen bleiben vollständig sichtbar', async ({ page }) => {
    await seed(page, cleric({ spells: [spell('Bless', 1), spell('Command', 1)] }));
    await expect(page.locator('.sp', { hasText: 'Bless' })).toBeVisible();
    await expect(page.locator('.sp', { hasText: 'Command' })).toBeVisible();
  });
});

test.describe('Zauber-SG und Inspiration @new', () => {
  test('SG und Angriff aus Attribut und Übung', async ({ page }) => {
    await seed(page, cleric({ spells: [spell('Bless', 1)] }));
    await expect(page.locator('.spstats')).toContainText('Wisdom');
    await expect(page.locator('.spstats')).toContainText('Save DC 14');
    await expect(page.locator('.spstats')).toContainText('Attack +6');
  });
  test('Multiclassing zeigt jede Zauberklasse', async ({ page }) => {
    await seed(page, base4({ klass: 'Wizard', level: 5, prof: 3, multi: [{ k: 'Cleric', sub: '', lvl: 2 }], abil: { str: 10, dex: 10, con: 10, int: 18, wis: 12, cha: 10 }, slots: slots(4) }));
    await expect(page.locator('.spstats')).toHaveCount(2);
    await expect(page.locator('.spstats').first()).toContainText('Save DC 15');
    await expect(page.locator('.spstats').nth(1)).toContainText('Save DC 12');
  });
  test('Nicht-Zauberer haben keine Zeile', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 3 }));
    await expect(page.locator('.spstats')).toHaveCount(0);
  });
  test('Inspiration schaltet um, von jedem Reiter, und bleibt gespeichert', async ({ page }) => {
    await seed(page, base4({}));
    expect((await read(page)).insp ?? false).toBe(false);
    await tab(page, 'inv');
    await act(page, 'insp').click();
    expect((await read(page)).insp).toBe(true);
    await expect(page.locator('.insp')).toHaveClass(/on/);
    await page.reload();
    await expect(page.locator('.insp')).toHaveClass(/on/);
    await act(page, 'insp').click();
    expect((await read(page)).insp).toBe(false);
  });
  test('alte Bögen starten ohne Inspiration, Rast ändert sie nicht', async ({ page }) => {
    await seed(page, base4({ insp: true }));
    await act(page, 'rest', '[data-r="long"]').click();
    expect((await read(page)).insp).toBe(true);
  });
});
