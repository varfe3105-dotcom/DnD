// Kampf und Inventar: eigene Gegenstände der Spielleitung, Tränke/Verbrauchsgüter/Munition verbrauchen, Begleiter im Zug,
// klare Beschriftung von Treffen und Schaden, besiegte Gegner in der Reihenfolge.
import { test, expect, seed, read, act, base4, item, URL_UNDER_TEST, joinRoom } from './helpers.js';

const bagOf = (...x) => { const b = Array(24).fill(null); x.forEach((v, i) => { b[i] = v; }); return b; };
const fake = () => {
  window.__sent = [];
  window.__liveFake = (code, key, onPeers, onStatus, onMsg) => {
    window.__livePeers = onPeers; window.__liveMsg = onMsg;
    setTimeout(() => onStatus('on'), 0);
    return { track: p => { window.__tracked = p; }, send: m => window.__sent.push(m), close: () => {} };
  };
};

test.describe('Eigene Gegenstände der Spielleitung @new', () => {
  test('Spielleitung schickt Rabenfeder-Talisman mit Art, Platz und Eigenschaften', async ({ page }) => {
    await page.addInitScript(fake);
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(s => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'live' })); }, base4({ tab: 'dm' }));
    await page.reload();
    await act(page, 'livecreate').click();
    await page.locator('[data-a="tab"][data-t="dmloot"]').click();
    await page.locator('details.loot-own summary').click();
    await page.locator('#lo-n').fill('Raven Feather Charm');
    await page.locator('#lo-ic').selectOption('wing');
    await page.locator('#lo-slot').selectOption('neck');
    await page.locator('#lo-p').fill('Mit Tieren sprechen ohne Zauber.');
    await page.locator('#lo-a').check();
    await act(page, 'lootown').click();
    const s = await page.evaluate(() => window.__sent);
    expect(s.at(-1)).toMatchObject({ type: 'item', n: 'Raven Feather Charm', ic: 'wing', slot: 'neck', att: true, cons: false, q: 1 });
  });

  test('Spieler nimmt an: Symbol, Platz und Einstimmung bleiben; unbekanntes Symbol wird verworfen', async ({ page }) => {
    await page.addInitScript(fake);
    await seed(page, base4({ tab: 'setup', id: 'me1' }));
    await joinRoom(page, 'ABC234');
    await expect(page.locator('.live-state')).toHaveClass(/on/);
    await page.evaluate(() => { window.__liveMsg({ id: 'r1', type: 'item', to: 'me1', n: 'Raven Feather Charm', p: 'Mit Tieren sprechen.', ic: 'wing', slot: 'neck', att: true, q: 1 }); window.__liveMsg({ id: 'r2', type: 'item', to: 'me1', n: 'Komisch', ic: '<script>', slot: 'xx', q: 1 }); });
    await act(page, 'liveyes').first().click();
    await act(page, 'liveyes').first().click();
    const bag = (await read(page)).bag.filter(Boolean);
    expect(bag.find(x => x.n === 'Raven Feather Charm')).toMatchObject({ ic: 'wing', slot: 'neck', att: true, magic: true, p: 'Mit Tieren sprechen.' });
    expect(bag.find(x => x.n === 'Komisch')).toMatchObject({ ic: 'box', slot: '' });
  });
});

test.describe('Zug: Verbrauchsgüter, Munition, Begleiter @new', () => {
  test('Trank als Bonusaktion wird verbraucht, eigenes Verbrauchsgut mit der Aktion Benutzen', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 1, bag: bagOf(item('p', 'Potion of Healing', { ref: 'potion:potion-of-healing', cons: true, q: 2 }), item('w', 'Weihwasser-Phiole', { cons: true, q: 1, p: '2W6 gleißender Schaden gegen Untote' })) }));
    const tv = page.locator('.turnboard');
    await expect(tv.locator('[data-a="tpotion"]')).toHaveCount(1);
    await expect(tv).toContainText(/potion is used up/);
    await act(page, 'tpotion').first().click();
    let s = await read(page);
    expect(s.bag.find(x => x && x.id === 'p').q).toBe(1);
    expect(s.turn.b).toBe(1);
    await expect(tv.locator('[data-a="tuse"]')).toHaveCount(1);
    await act(page, 'tuse').click();
    s = await read(page);
    expect(s.bag.some(x => x && x.id === 'w')).toBe(false);
    expect(s.turn.a).toBe(1);
  });

  test('Angreifen mit Langbogen verbraucht einen Pfeil, auch bei eigenem Stapel „Pfeile“', async ({ page }) => {
    await seed(page, base4({ klass: 'Ranger', level: 1, eq: { main: item('b', 'Longbow', { ref: 'item:longbow', slot: 'hand' }) }, bag: bagOf(item('a', 'Pfeile', { cons: true, q: 3 })) }));
    await expect(page.locator('.turnboard')).toContainText(/uses 1 ammunition, 3 left/);
    await page.locator('[data-a="tatk"][data-k="attack"]').click();
    const s = await read(page);
    expect(s.bag.find(x => x && x.id === 'a').q).toBe(2);
    expect(s.turn.atk).toBe(1);
  });

  test('Beast Master: Begleiter befehlen als Bonusaktion mit Angriffswerten; Merkmal mit Beschreibung', async ({ page }) => {
    await seed(page, base4({ klass: 'Ranger', sub: 'Beast Master', level: 3, prof: 2, abil: { str: 12, dex: 16, con: 12, int: 10, wis: 14, cha: 8 }, pets: [{ id: 'w1', n: 'Beast of the Land', primal: 'land', hp: 20, hpMax: 20, ac: 13 }], res: [{ n: 'Second Wind', ic: 'heart', max: 2, used: 0, rest: 'short', p: 'Heilt 1W10 + Kämpferstufe.' }] }));
    const tv = page.locator('.turnboard');
    await expect(tv).toContainText('Beast of the Land');
    await expect(tv.locator('.tv-atk')).toContainText(/to hit/);
    await expect(tv.locator('.tv-atk')).toContainText(/damage/);
    await expect(tv.locator('.tv-det', { hasText: /Heilt|Second/ }).first()).toHaveCount(1);
    await act(page, 'tpet').click();
    expect((await read(page)).turn.b).toBe(1);
  });

  test('Angriffszeile sagt, was Treffen und was Schaden ist', async ({ page }) => {
    await seed(page, base4({ klass: 'Fighter', level: 1, eq: { main: item('s', 'Longsword', { ref: 'item:longsword', slot: 'hand' }) } }));
    await expect(page.locator('.wrow .atk').first()).toContainText('to hit (d20 +)');
    await expect(page.locator('.wrow .atk').nth(1)).toContainText('Damage');
  });
});

test.describe('Temporäre TP sichtbar @new', () => {
  test('21 TP + 6 temporäre: große Zahl 27, Aufteilung darunter; Schaden zieht zuerst die temporären ab', async ({ page }) => {
    await seed(page, base4({ hp: 21, hpMax: 21, tmp: 6 }));
    await expect(page.locator('.hpn b')).toHaveText('27');
    await expect(page.locator('.hpn .tmp')).toContainText('21 HP + 6 temporary = 27');
    await page.locator('#hpv').fill('4');
    await act(page, 'dmg').click();
    await expect(page.locator('.hpn b')).toHaveText('23');
    const s = await read(page);
    expect(s).toMatchObject({ hp: 21, tmp: 2 });
  });
});
