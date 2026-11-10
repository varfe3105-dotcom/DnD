import { test, expect, seed, read, act, rest, amount, base4, spell, blankSlots } from './helpers.js';

test.describe('Schaden, Heilen, Temp-TP', () => {
  test('Schaden und Heilen, begrenzt auf Max-TP', async ({ page }) => {
    await seed(page, base4({}));
    await amount(page, 'dmg', 7);
    expect((await read(page)).hp).toBe(13);
    await amount(page, 'heal', 3);
    expect((await read(page)).hp).toBe(16);
    await amount(page, 'heal', 50);
    expect((await read(page)).hp).toBe(20);
  });

  test('Temp-TP fangen zuerst ab und addieren sich nicht', async ({ page }) => {
    await seed(page, base4({}));
    await amount(page, 'temp', 5);
    expect((await read(page)).tmp).toBe(5);
    await amount(page, 'temp', 3);
    expect((await read(page)).tmp).toBe(5);
    await amount(page, 'dmg', 8);
    const s = await read(page);
    expect(s.tmp).toBe(0);
    expect(s.hp).toBe(17);
  });

  test('Plus und Minus ändern die TP um eins', async ({ page }) => {
    await seed(page, base4({ hp: 10 }));
    await act(page, 'hp', '[data-d="-1"]').first().click();
    expect((await read(page)).hp).toBe(9);
    await act(page, 'hp', '[data-d="1"]').first().click();
    expect((await read(page)).hp).toBe(10);
  });

  test('Konzentration endet bei 0 TP', async ({ page }) => {
    await seed(page, base4({ hp: 5, conc: 'Bless' }));
    await amount(page, 'dmg', 5);
    const s = await read(page);
    expect(s.conc).toBe('');
    expect(s.cond.Unconscious).toBe(true);
  });
});

test.describe('Todesrettungswürfe', () => {
  test('bei 0 TP sichtbar, abhakbar, Heilung setzt zurück', async ({ page }) => {
    await seed(page, base4({ hp: 3 }));
    await expect(page.locator('.death')).toHaveCount(0);
    await amount(page, 'dmg', 3);
    await expect(page.locator('.death')).toBeVisible();
    await act(page, 'ds', '[data-t="s"][data-j="1"]').click();
    expect((await read(page)).death.s).toBe(2);
    await act(page, 'ds', '[data-t="f"][data-j="0"]').click();
    expect((await read(page)).death.f).toBe(1);
    await amount(page, 'heal', 2);
    const s = await read(page);
    expect(s.hp).toBe(2);
    expect(s.death).toEqual({ s: 0, f: 0 });
    expect(s.cond.Unconscious).toBeUndefined();
    await expect(page.locator('.death')).toHaveCount(0);
  });

  test('Schaden bei 0 TP zählt als Fehlschlag', async ({ page }) => {
    await seed(page, base4({ hp: 0, cond: { Unconscious: true } }));
    await amount(page, 'dmg', 1);
    expect((await read(page)).death.f).toBe(1);
  });
});

test.describe('Zauber wirken', () => {
  const slots = (...m) => blankSlots().map((s, i) => ({ max: m[i] || 0, used: 0 }));

  test('verbraucht den niedrigsten passenden Platz und steigt dann auf', async ({ page }) => {
    await seed(page, base4({ slots: slots(1, 1), spells: [spell('Magic Missile', 1)] }));
    await act(page, 'cast').click();
    let s = await read(page);
    expect([s.slots[0].used, s.slots[1].used]).toEqual([1, 0]);
    await act(page, 'cast').click();
    s = await read(page);
    expect([s.slots[0].used, s.slots[1].used]).toEqual([1, 1]);
    await act(page, 'cast').click();
    s = await read(page);
    expect([s.slots[0].used, s.slots[1].used]).toEqual([1, 1]);
  });

  test('Cantrips verbrauchen keinen Platz', async ({ page }) => {
    await seed(page, base4({ slots: slots(2), spells: [spell('Fire Bolt', 0)] }));
    await act(page, 'cast').click();
    expect((await read(page)).slots[0].used).toBe(0);
  });

  test('Paktmagie wird zuerst verbraucht', async ({ page }) => {
    await seed(page, base4({ slots: slots(2), pact: { max: 1, used: 0, lvl: 2 }, spells: [spell('Hex', 1)] }));
    await act(page, 'cast').click();
    let s = await read(page);
    expect(s.pact.used).toBe(1);
    expect(s.slots[0].used).toBe(0);
    await act(page, 'cast').click();
    s = await read(page);
    expect(s.slots[0].used).toBe(1);
  });

  test('Konzentration wird gesetzt, gewechselt und beendet', async ({ page }) => {
    await seed(page, base4({ slots: slots(4), spells: [spell('Bless', 1, { conc: true }), spell('Shield', 1)] }));
    const cast = n => page.locator('.sp', { hasText: n }).locator('[data-a="cast"]').click();
    await cast('Bless');
    expect((await read(page)).conc).toBe('Bless');
    await expect(page.locator('.conc')).toBeVisible();
    await cast('Shield');
    expect((await read(page)).conc).toBe('Bless');
    await act(page, 'concend').click();
    expect((await read(page)).conc).toBe('');
  });

  test('Kästchen: Klick verbraucht, Klick auf ✕ gibt zurück', async ({ page }) => {
    await seed(page, base4({ slots: slots(2), spells: [spell('Sleep', 1)] }));
    await act(page, 'pip', '[data-k="slots"][data-j="0"]').click();
    expect((await read(page)).slots[0].used).toBe(1);
    await act(page, 'pip', '[data-k="slots"][data-j="1"]').click();
    expect((await read(page)).slots[0].used).toBe(0);
  });
});

test.describe('Rasten', () => {
  const worn = () => base4({
    hp: 4, tmp: 3, conc: 'Bless', exh: 2, cond: { Blinded: true },
    hd: { max: 5, used: 4, die: 'W8' },
    slots: blankSlots().map((s, i) => (i === 0 ? { max: 4, used: 3 } : s)),
    pact: { max: 2, used: 2, lvl: 1 },
    res: [
      { n: 'Second Wind', ic: 'heart', max: 1, used: 1, rest: 'short', p: '' },
      { n: 'Rage', ic: 'flame', max: 3, used: 2, rest: 'long', p: '' },
      { n: 'Einmalig', ic: 'box', max: 1, used: 1, rest: 'none', p: '' },
    ],
  });

  test('kurze Rast: nur Kurzrast-Fähigkeiten und Paktmagie', async ({ page }) => {
    await seed(page, worn());
    await rest(page, 'short');
    const s = await read(page);
    expect(s.res.map(r => r.used)).toEqual([0, 2, 1]);
    expect(s.pact.used).toBe(0);
    expect(s.slots[0].used).toBe(3);
    expect(s.hp).toBe(4);
    expect(s.conc).toBe('Bless');
    expect(s.hd.used).toBe(4);
  });

  test('lange Rast: TP, Plätze, halbe Trefferwürfel, Exhaustion -1, Zustände bleiben', async ({ page }) => {
    await seed(page, worn());
    await rest(page, 'long');
    const s = await read(page);
    expect(s.hp).toBe(20);
    expect(s.tmp).toBe(0);
    expect(s.conc).toBe('');
    expect(s.slots[0].used).toBe(0);
    expect(s.res.map(r => r.used)).toEqual([0, 0, 1]);
    expect(s.hd.used).toBe(2);
    expect(s.exh).toBe(1);
    expect(s.cond.Blinded).toBe(true);
  });
});
