import fs from 'node:fs';
import { test, expect, seed, read, act, base4, URL_UNDER_TEST } from './helpers.js';

const character = (o = {}) => ({
  name: 'Nyx', classes: [{ classId: 'cleric', subclassId: 'cleric/trickery', level: 1, hitPointsPerLevel: [5] }], raceId: 'elf', subraceId: 'elf/dark-elf', backgroundId: 'custom-background',
  abilities: { str: 8, dex: 15, con: 13, int: 12, wis: 14, cha: 10 }, raceAsiChoice: {}, asiChoices: [], featIds: [],
  skillProficiencies: ['Perception', 'Insight'], skillExpertise: [], savingThrowProficiencies: [], toolProficiencies: ["Poisoner's kit"], languages: [], otherProficiencies: [],
  hitPoints: { current: 9, temporary: 0, bonusMax: 0 }, hitDiceSpent: {}, deathSaves: { successes: 0, failures: 0 }, slotsSpent: [1, 0, 0, 0, 0, 0, 0, 0, 0], pactSlotsSpent: 0, concentratingOn: null, conditions: [], inspiration: false, exhaustion: 0,
  spells: [{ spellId: 'guidance' }, { spellId: 'charm-person' }, { spellId: 'word-of-radiance' }],
  inventory: [
    { itemId: 'dagger', name: 'Dagger', quantity: 2, kind: 'weapon', equipped: false, attuned: false, notes: '' },
    { itemId: 'leather', name: 'Leather', quantity: 1, kind: 'armor', equipped: true, attuned: false, notes: '' },
    { itemId: 'priest-s-pack', name: "Priest's Pack", quantity: 1, kind: 'gear', equipped: false, attuned: false, notes: '' },
    { itemId: 'zauberding', name: 'Zauberding', quantity: 1, kind: 'gear', equipped: false, attuned: false, notes: 'vom Meister', meta: { cost: '1 gp' } },
  ],
  currency: { cp: 0, sp: 0, ep: 0, gp: 4, pp: 0 }, details: { alignment: 'Lawful evil', backstory: 'Sie floh aus dem Tempel.', personality: '' }, customBackground: { name: 'Fallen Acolyte' }, ...o,
});
const backup = (...chars) => JSON.stringify({ kind: 'dnd-backup', version: 1, characters: chars, homebrew: {} });
const doImport = async (page, text) => {
  await page.locator('#imp').fill(text);
  await act(page, 'imp').click();
};

test.describe('Import aus dem anderen Tool @new', () => {
  test('Werte, Volk, Klasse, Stufe werden richtig übernommen', async ({ page }) => {
    await seed(page, base4({ name: '', level: 0, tab: 'setup', klass: '' }));
    await doImport(page, backup(character()));
    await expect(page.locator('.imp-rep')).toContainText('Nyx');
    const s = await read(page);
    expect(s).toMatchObject({ name: 'Nyx', race: 'Elf', subrace: 'Drow', klass: 'Cleric', sub: 'Trickery Domain', level: 1, hp: 9, hpMax: 9, prof: 2, ac: 13, speed: 9, info: 'Fallen Acolyte · Lawful evil' });
    expect(s.abil).toEqual({ str: 8, dex: 17, con: 13, int: 12, wis: 14, cha: 11 });
    expect(s.saves).toEqual({ wis: true, cha: true });
    expect(s.skills).toEqual({ Perception: 1, Insight: 1 });
    expect(s.gold.gp).toBe(4);
    expect(s.slots[0]).toEqual({ max: 2, used: 1 });
    expect(s.feats.map(f => f.n)).toEqual(expect.arrayContaining(['Spellcasting', 'Blessing of the Trickster']));
  });

  test('Zauber und Gegenstände dem Katalog zuordnen, Rest in die Notizen', async ({ page }) => {
    await seed(page, base4({ name: '', level: 0, tab: 'setup', klass: '' }));
    await doImport(page, backup(character()));
    const s = await read(page);
    expect(s.spells.map(x => x.n).sort()).toEqual(['Charm Person', 'Guidance']);
    expect(s.notes).toContain('Word Of Radiance');
    expect(s.notes).toContain('Sie floh aus dem Tempel.');
    expect(s.notes).toContain("Poisoner's kit");
    expect(s.notes).toContain('vom Meister');
    const bag = s.bag.filter(Boolean);
    expect(bag.find(x => x.ref === 'item:dagger').q).toBe(2);
    expect(bag.some(x => x.ref === 'item:priests-pack')).toBe(true);
    expect(s.eq.body.ref).toBe('item:leather-armor');
    const own = bag.find(x => x.n === 'Zauberding');
    expect(own.ref).toBeUndefined();
    await expect(page.locator('.imp-rep')).toContainText('Zauberding');
  });

  test('bestehende Charaktere bleiben, kein Bestätigen nötig', async ({ page }) => {
    await seed(page, base4({ name: 'Alt', klass: 'Fighter', level: 2, tab: 'setup' }));
    await doImport(page, backup(character()));
    expect((await read(page)).name).toBe('Nyx');
    await expect(page.locator('#char-switch option')).toHaveCount(2);
    await page.locator('#char-switch').selectOption({ label: 'Alt' });
    await expect(page.locator('h1')).toHaveText('Alt');
  });

  test('mehrere Charaktere in einer Datei, leerer Bogen wird ersetzt', async ({ page }) => {
    await seed(page, base4({ name: 'Leer', level: 0, tab: 'setup', klass: '' }));
    await doImport(page, backup(character({ name: 'Eins' }), character({ name: 'Zwei' })));
    await expect(page.locator('#char-switch option')).toHaveCount(2);
    expect(await page.locator('#char-switch option').allTextContents()).toEqual(expect.arrayContaining(['Eins', 'Zwei']));
  });

  test('Multiclass und TP je Stufe', async ({ page }) => {
    await seed(page, base4({ name: '', level: 0, tab: 'setup', klass: '' }));
    await doImport(page, backup(character({ classes: [{ classId: 'fighter', subclassId: 'fighter/champion', level: 3, hitPointsPerLevel: [10, 6, 8] }, { classId: 'wizard', level: 2, hitPointsPerLevel: [4, 5] }], hitPoints: { current: 99, temporary: 3, bonusMax: 2 } })));
    const s = await read(page);
    expect(s.level).toBe(5);
    expect(s.multi).toEqual([{ k: 'Wizard', sub: '', lvl: 2 }]);
    expect(s.sub).toBe('Champion');
    expect(s.hpMax).toBe(10 + 6 + 8 + 4 + 5 + 5 * 1 + 2);
    expect(s.hp).toBe(s.hpMax);
    expect(s.tmp).toBe(3);
    expect(s.prof).toBe(3);
  });

  test('kaputte Datei ändert nichts und nennt das Feld', async ({ page }) => {
    await seed(page, base4({ name: 'Bleibt', tab: 'setup' }));
    await doImport(page, JSON.stringify({ kind: 'dnd-backup', characters: [{ name: 'X', classes: [] }] }));
    await expect(page.locator('#toast')).toContainText('characters.0');
    expect((await read(page)).name).toBe('Bleibt');
    await expect(page.locator('#char-switch')).toHaveCount(0);
  });

  test('eigene Exporte funktionieren weiter wie bisher', async ({ page }) => {
    await seed(page, base4({ name: 'Neu', tab: 'setup' }));
    await doImport(page, JSON.stringify(base4({ name: 'Eigener' })));
    expect((await read(page)).name).toBe('Neu');
    await act(page, 'imp').click();
    expect((await read(page)).name).toBe('Eigener');
  });

  const real = 'import/play5e-backup-2026-11-08.json';
  test('die echte Datei lässt sich importieren', async ({ page }) => {
    test.skip(!fs.existsSync(real), 'Datei liegt nur lokal');
    await page.goto(URL_UNDER_TEST);
    await seed(page, base4({ name: '', level: 0, tab: 'setup', klass: '' }));
    await doImport(page, fs.readFileSync(real, 'utf8'));
    await expect(page.locator('.imp-rep')).toBeVisible();
    const s = await read(page);
    expect(s).toMatchObject({ klass: 'Cleric', sub: 'Trickery Domain', subrace: 'Drow', level: 1, hp: 9, hpMax: 9 });
    expect(s.abil.dex).toBe(17);
    expect(s.spells.length).toBe(8);
    console.log(await page.locator('.imp-rep').innerText());
    console.log('NOTIZEN:\n' + s.notes);
    console.log('BAG:', s.bag.filter(Boolean).map(x => `${x.n} ×${x.q} ${x.ref || 'eigen'}`).join('; '));
  });
});
