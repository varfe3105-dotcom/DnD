import { test, expect, seed, read, act, tab, base4, item, URL_UNDER_TEST } from './helpers.js';

const abil = { str: 10, dex: 16, con: 14, int: 10, wis: 14, cha: 10 };
const leather = () => item('l', 'Leather Armor', { ref: 'item:leather-armor', slot: 'body', p: 'x' });
const chain = () => item('c', 'Chain Mail', { ref: 'item:chain-mail', slot: 'body', p: 'x' });
const halfplate = () => item('h', 'Half Plate', { ref: 'item:half-plate-armor', slot: 'body', p: 'x' });
const shield = () => item('s', 'Shield', { ref: 'item:shield', slot: 'off', p: 'x' });
const auto = o => base4({ acMode: 'auto', abil, ...o });
const shownAc = page => page.locator('.st').first().locator('b');

async function drag(page, from, to) {
  const a = await page.locator(`[data-drag="${from}"]`).boundingBox();
  const b = await page.locator(`[data-slot="${to}"]`).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}

test.describe('Rüstungsklasse automatisch @new', () => {
  const cases = [
    ['ohne Rüstung', {}, 13],
    ['Lederrüstung', { eq: { body: leather() } }, 14],
    ['Kettenpanzer ohne GES', { eq: { body: chain() } }, 16],
    ['Halbplatte begrenzt GES auf +2', { eq: { body: halfplate() } }, 17],
    ['Schild addiert +2', { eq: { body: leather(), off: shield() } }, 16],
    ['Barbar ohne Rüstung', { klass: 'Barbarian', level: 1 }, 15],
    ['Mönch ohne Rüstung', { klass: 'Monk', level: 1 }, 15],
    ['Mönch mit Schild verliert WE', { klass: 'Monk', level: 1, eq: { off: shield() } }, 15],
    ['Kampfstil Defense in Rüstung', { eq: { body: leather() }, feats: [{ n: 'Defense', p: 'x', lvl: 1, src: 'Klasse' }] }, 15],
    ['eingestimmter Schutzring', { eq: { ring1: item('r', 'Ring', { ref: 'magic:ring-of-protection', slot: 'ring', tuned: true }) } }, 14],
    ['Schutzring ohne Einstimmung', { eq: { ring1: item('r', 'Ring', { ref: 'magic:ring-of-protection', slot: 'ring' }) } }, 13],
    ['eigene Rüstung aus Text', { eq: { body: item('o', 'Drachenleder', { slot: 'body', p: 'Leicht · RK 12 + GES · 45 GM' }) } }, 15],
  ];
  for (const [name, o, ac] of cases) {
    test(name, async ({ page }) => {
      await seed(page, auto(o));
      await expect(shownAc(page)).toHaveText(String(ac));
    });
  }

  test('Anziehen im Inventar ändert die RK sofort', async ({ page }) => {
    const bag = Array(24).fill(null); bag[0] = leather();
    await seed(page, auto({ bag, tab: 'inv' }));
    await drag(page, 'bag:0', 'eq:body');
    await expect.poll(async () => (await read(page)).ac).toBe(14);
    await tab(page, 'main');
    await expect(shownAc(page)).toHaveText('14');
  });

  test('alte Bögen bleiben bei ihrem eingetragenen Wert', async ({ page }) => {
    await seed(page, base4({ ac: 19, abil, eq: { body: leather() } }));
    await expect(shownAc(page)).toHaveText('19');
    await act(page, 'hp', '[data-d="-1"]').first().click();
    expect((await read(page)).acMode).toBe('manual');
  });

  test('Automatik lässt sich ein- und ausschalten', async ({ page }) => {
    await seed(page, base4({ ac: 19, abil, tab: 'setup' }));
    await expect(page.locator('#f-ac')).toBeEnabled();
    await page.locator('#ac-auto').check();
    await expect(page.locator('#f-ac')).toBeDisabled();
    await expect(page.locator('#f-ac')).toHaveValue('13');
    await page.locator('#ac-auto').uncheck();
    await page.locator('#f-ac').fill('20');
    await page.locator('#f-ac').blur();
    await expect.poll(async () => (await read(page)).ac).toBe(20);
  });

  test('unbekannte Rüstung behält den Wert und weist darauf hin', async ({ page }) => {
    await seed(page, auto({ ac: 18, tab: 'setup', eq: { body: item('m', 'Mystery', { slot: 'body', p: 'selbst erdacht' }) } }));
    await expect(page.locator('#f-ac')).toHaveValue('18');
    await expect(page.locator('.card', { has: page.locator('#ac-auto') }).locator('.note')).toBeVisible();
  });

  test('neue Charaktere rechnen automatisch', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await tab(page, 'setup');
    await expect(page.locator('#ac-auto')).toBeChecked();
  });
});

test.describe('Werkzeuge und Sprachen @new', () => {
  test('Feld in Einrichten, Anzeige auf der Karte', async ({ page }) => {
    await seed(page, base4({ tab: 'setup' }));
    await page.locator('#f-tools').fill("Poisoner's Kit, Forgery Kit");
    await page.locator('#f-tools').blur();
    await page.locator('#f-langs').fill('Common, Elvish');
    await page.locator('#f-langs').blur();
    await expect.poll(async () => (await read(page)).tools).toEqual(["Poisoner's Kit", 'Forgery Kit']);
    expect((await read(page)).langs).toEqual(['Common', 'Elvish']);
    await tab(page, 'main');
    await expect(page.locator('.chip', { hasText: 'Forgery Kit' })).toBeVisible();
    await expect(page.locator('.chip', { hasText: 'Elvish' })).toBeVisible();
  });

  test('ohne Einträge kein leerer Abschnitt', async ({ page }) => {
    await seed(page, base4({}));
    await expect(page.locator('h2', { hasText: /Tools and Languages/ })).toHaveCount(0);
  });

});

test.describe('Inventar und Fertigkeiten @new', () => {
  const bagOf = (...x) => { const b = Array(24).fill(null); x.forEach((v, i) => { b[i] = v; }); return b; };
  test('Rahmen folgt der Seltenheit', async ({ page }) => {
    await seed(page, base4({ tab: 'inv', bag: bagOf(item('r', 'Ring', { ref: 'magic:ring-of-protection', slot: 'ring' }), item('d', 'Dagger', { ref: 'item:dagger', slot: 'hand' })) }));
    await expect(page.locator('[data-drag="bag:0"]')).toHaveClass(/t-rare/);
    await expect(page.locator('[data-drag="bag:1"]')).not.toHaveClass(/t-(uncommon|rare|veryrare|legendary|arcane)/);
  });
  test('Traglast rechnet Gewicht und Stärke, Sprache wechselt die Einheit', async ({ page }) => {
    await seed(page, base4({ tab: 'inv', abil: { ...abil, str: 10 }, bag: bagOf(item('d', 'Dagger', { ref: 'item:dagger', slot: 'hand', q: 2 }), item('a', 'Arrows', { ref: 'item:arrow', q: 20 })) }));
    await expect(page.locator('.carryv')).toHaveText('3 lb / 150 lb');
    await page.locator('[data-a="lang"][data-l="de"]').click();
    await expect(page.locator('.carryv')).toHaveText('1,4 kg / 67,5 kg');
  });
  test('Filter blendet Unpassendes ab, Eingabe bleibt', async ({ page }) => {
    await seed(page, base4({ tab: 'inv', bag: bagOf(item('a', 'Seil'), item('b', 'Fackel')) }));
    await page.locator('#inv-filter').fill('sei');
    await expect(page.locator('[data-slot="bag:1"]')).toHaveClass(/dim/);
    await expect(page.locator('[data-slot="bag:0"]')).not.toHaveClass(/dim/);
    await expect(page.locator('#inv-filter')).toHaveValue('sei');
    await expect(page.locator('#inv-filter')).toBeFocused();
  });
  test('Figur zeigt RK und Angriff der Haupthand', async ({ page }) => {
    await seed(page, auto({ tab: 'inv', eq: { main: item('d', 'Dagger', { ref: 'item:dagger', slot: 'hand' }), body: leather() } }));
    await expect(page.locator('.acb b')).toHaveText('14');
    await expect(page.locator('.dstat')).toContainText('1d4+3');
  });
  test('Fertigkeiten nach Attribut mit Stern', async ({ page }) => {
    await seed(page, base4({ skills: { Stealth: 2, Arcana: 1 } }));
    const dex = page.locator('.skg', { hasText: 'Dexterity' });
    await expect(dex).toContainText('Stealth');
    await expect(dex.locator('.skr', { hasText: 'Stealth' }).locator('.skstar')).toHaveText('★★');
    await expect(page.locator('.skg')).toHaveCount(5);
  });
});
