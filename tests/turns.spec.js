import { test, expect, seed, read, act, base4, URL_UNDER_TEST } from './helpers.js';

// Ersatz für Supabase: zeichnet Gesendetes auf und erlaubt, Presence und Nachrichten einzuspielen.
const fake = () => {
  window.__tracked = []; window.__sent = [];
  window.__liveFake = (code, key, onPeers, onStatus, onMsg) => {
    window.__peers = onPeers; window.__msg = onMsg; window.__key = key;
    setTimeout(() => onStatus('on'), 0);
    return { track: p => window.__tracked.push(p), send: m => window.__sent.push(m), close() {} };
  };
};
const dmPeer = turn => ({ key: 'dm-x', role: 'dm', name: '', klass: '', level: 0, hp: 0, hpMax: 0, tmp: 0, ac: 0, exh: 0, conc: '', cond: [], death: { s: 0, f: 0 }, turn });
const joinAsPlayer = async page => {
  await page.locator('#live-code').fill('ABC234');
  await act(page, 'livejoin').click();
  await expect(page.locator('.live-state')).toHaveClass(/on/);
};

test.describe('Zuganzeige @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('Spieler sieht „Dein Zug“ und beendet ihn, danach geht die Nachricht an die Spielleitung', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', id: 'held1', name: 'Mirelle' }));
    await joinAsPlayer(page);
    await expect(page.locator('.turn')).toHaveCount(0);
    await page.evaluate(p => window.__peers([p]), dmPeer({ r: 2, cur: 'held1', name: 'Mirelle', enemy: false, next: '', nextEnemy: true }));
    await expect(page.locator('.turn.mine')).toBeVisible();
    await expect(page.locator('.turn.mine')).toContainText(/Your turn|Dein Zug/);
    await act(page, 'endturn').click();
    const sent = await page.evaluate(() => window.__sent.at(-1));
    expect(sent).toMatchObject({ type: 'endturn', to: 'dm', from: 'held1' });
  });

  test('wer anders dran ist, steht schlicht da; Monster mit Herausforderungsgrad', async ({ page }) => {
    await seed(page, base4({ tab: 'main', id: 'held1' }));
    await page.evaluate(() => localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'player' })));
    await page.reload();
    await page.evaluate(p => window.__peers([p]), dmPeer({ r: 1, cur: '', name: 'Goblin 2', enemy: true, cr: '1/4', next: 'Borin', nextEnemy: false }));
    await expect(page.locator('.turn')).toContainText(/Goblin 2 \((CR|HG) 1\/4\)/);
    await expect(page.locator('.turn')).toContainText('Borin');
    await expect(page.locator('.turn.mine')).toHaveCount(0);
  });

  test('Zuganzeige lässt sich pro Gerät ausschalten', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', id: 'held1' }));
    await joinAsPlayer(page);
    await page.evaluate(p => window.__peers([p]), dmPeer({ r: 1, cur: 'held1', name: 'Test', enemy: false, next: '', nextEnemy: false }));
    await expect(page.locator('.turn.mine')).toBeVisible();
    await act(page, 'turnshow').click();
    await expect(page.locator('.turn')).toHaveCount(0);
  });

  test('Spielleitung: ohne Schalter kein Zug gesendet, mit Schalter Zug des Spielers, „Zug beenden“ geht weiter', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    const combat = { round: 1, active: 'c1', list: [
      { id: 'c1', kind: 'pc', live: 'held1', name: 'Mirelle', init: 18, hp: 20, hpMax: 20, ac: 14, cond: {} },
      { id: 'c2', kind: 'mon', mon: 'goblin', name: 'Goblin', init: 12, hp: 7, hpMax: 7, ac: 15, cond: {} },
    ] };
    await page.evaluate(([s, c]) => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'combat', combat: c })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, [base4({ tab: 'dm' }), combat]);
    await page.reload();
    await page.locator('#app header').waitFor();
    expect(await page.evaluate(() => window.__tracked.at(-1).turn)).toBeNull();
    await act(page, 'dmturns').click();
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).turn)).toMatchObject({ cur: 'held1', name: 'Mirelle', nextEnemy: true, next: 'Goblin', nextCr: '1/4' });
    // Falscher Absender ändert nichts
    await page.evaluate(() => window.__msg({ id: 'm1', type: 'endturn', to: 'dm', from: 'jemand' }));
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')).combat.active)).toBe('c1');
    await page.evaluate(() => window.__msg({ id: 'm2', type: 'endturn', to: 'dm', from: 'held1' }));
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')).combat.active)).toBe('c2');
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).turn)).toMatchObject({ cur: '', name: 'Goblin', enemy: true, next: 'Mirelle' });
  });
});

test.describe('Spielleitungsmodus und Meilenstein @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('Umschalten in Einrichten: eigene Reiter, kein Charakterkopf; zurück bringt die Karte wieder', async ({ page }) => {
    await seed(page, base4({ tab: 'setup' }));
    await page.evaluate(() => localStorage.setItem('charbogen-dm', JSON.stringify({ on: true })));
    await page.reload();
    await page.locator('#dm-only').click();
    await expect(page.locator('.dmhd')).toBeVisible();
    await expect(page.locator('[data-a="tab"][data-t="main"]')).toHaveCount(0);
    await expect(page.locator('[data-a="tab"][data-t="dmnotes"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.here')).toBeVisible();
    await page.locator('[data-a="tab"][data-t="dmnotes"]').click();
    await expect(page.locator('h2', { hasText: /Notebook|Notizbuch/ }).first()).toBeVisible();
    await page.locator('[data-a="tab"][data-t="setup"]').click();
    await page.locator('#dm-only').click();
    await expect(page.locator('[data-a="tab"][data-t="main"]')).toHaveCount(1);
    await expect(page.locator('.dmhd')).toHaveCount(0);
  });

  test('Meilenstein: Spieler bekommt Stufenaufstieg zum Annehmen, Annehmen öffnet den Dialog', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', id: 'held1', klass: 'Fighter', level: 2, hpMax: 20, hp: 20 }));
    await joinAsPlayer(page);
    await page.evaluate(() => window.__msg({ id: 'm1', type: 'levelup', to: 'all', from: 'dm-x' }));
    await expect(page.locator('.inbox')).toContainText(/Level-up|Stufenaufstieg/);
    await act(page, 'liveyes').click();
    await expect(page.locator('.dlg')).toBeVisible();
  });

  test('Spielleitung schickt einem einzelnen Spieler einen Stufenaufstieg, kein Knopf für alle mehr', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(s => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'live' })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, base4({ tab: 'dm' }));
    await page.reload();
    await page.evaluate(p => window.__peers([p]), { key: 'held1', role: 'player', name: 'Mirelle', klass: 'Wizard', level: 3, hp: 10, hpMax: 10, tmp: 0, ac: 12, exh: 0, conc: '', cond: [], death: { s: 0, f: 0 } });
    await expect(page.locator('[data-a="livelevel"]')).toHaveCount(0);
    await act(page, 'livesend', '[data-k="held1"][data-t="levelup"]').click();
    expect(await page.evaluate(() => window.__sent.at(-1))).toMatchObject({ type: 'levelup', to: 'held1' });
  });
});

test.describe('XP und Notizbuch @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });

  test('XP im Kopf mit Schwelle; XP-Vorschlag annehmen erhöht den Stand', async ({ page }) => {
    await seed(page, base4({ tab: 'setup', id: 'held1', klass: 'Fighter', level: 1, xp: 250 }));
    await expect(page.locator('.xpl')).toContainText('250 / 300');
    await joinAsPlayer(page);
    await page.evaluate(() => window.__msg({ id: 'x1', type: 'xp', to: 'all', from: 'dm-x', value: 75 }));
    await expect(page.locator('.inbox')).toContainText('75');
    await act(page, 'liveyes').click();
    await expect(page.locator('.xpl')).toHaveClass(/ready/);
    expect((await read(page)).xp).toBe(325);
    expect((await read(page)).level).toBe(1);
  });

  test('Spielleitung: besiegte Monster ergeben XP, Anteil geht an alle', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    const combat = { round: 3, active: 'c1', list: [
      { id: 'c1', kind: 'pc', live: 'held1', name: 'Mirelle', init: 18, hp: 20, hpMax: 20, ac: 14, cond: {} },
      { id: 'c2', kind: 'mon', mon: 'goblin', name: 'Goblin 1', init: 12, hp: 0, hpMax: 7, ac: 15, cond: {} },
      { id: 'c3', kind: 'mon', mon: 'goblin', name: 'Goblin 2', init: 9, hp: 0, hpMax: 7, ac: 15, cond: {} },
      { id: 'c4', kind: 'mon', mon: 'goblin', name: 'Goblin 3', init: 5, hp: 4, hpMax: 7, ac: 15, cond: {} },
    ] };
    await page.evaluate(([s, c]) => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'combat', combat: c })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, [base4({ tab: 'dm' }), combat]);
    await page.reload();
    await page.evaluate(p => window.__peers([p, { ...p, key: 'held2', name: 'Borin' }]), { key: 'held1', role: 'player', name: 'Mirelle', klass: 'Wizard', level: 3, hp: 10, hpMax: 10, tmp: 0, ac: 12, exh: 0, conc: '', cond: [], death: { s: 0, f: 0 } });
    await act(page, 'dmxpopen').click();
    await expect(page.locator('.xpshare')).toContainText('100 XP');
    await expect(page.locator('#dm-xpn')).toHaveValue('2');
    await act(page, 'dmxpsend').click();
    expect(await page.evaluate(() => window.__sent.at(-1))).toMatchObject({ type: 'xp', to: 'all', value: 50 });
  });

  test('Notizbuch: Ort als „Hier sind wir“ markieren, neue Sitzung anlegen', async ({ page }) => {
    await seed(page, base4({ tab: 'dm' }));
    await page.evaluate(() => localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'notes', notes: [{ id: 'p1', kind: 'place', title: 'Rabenturm', body: 'Feucht und kalt. [[Wirt Haldor]]', monsters: [{ id: 'goblin', qty: 2 }] }] })));
    await page.reload();
    await expect(page.locator('.here-place')).toContainText(/No current place|Noch kein aktueller Ort/);
    await page.locator('#dm-here').selectOption('p1');
    await expect(page.locator('.here-place h3')).toHaveText('Rabenturm');
    await expect(page.locator('.here-place')).toContainText('Wirt Haldor');
    await expect(page.locator('.here-place [data-a="dmplstart"]')).toContainText('2');
    await act(page, 'dmnews', ':visible').first().click();
    await expect(page.locator('.here-session h3')).toContainText(/Session 1|Sitzung 1/);
  });
});

test.describe('Beute an einzelne Spieler @new', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(fake); });
  test('Empfänger wählen: Knopf nennt den Spieler, Gegenstand geht nur an ihn', async ({ page }) => {
    await page.goto(URL_UNDER_TEST);
    await page.evaluate(s => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, view: 'loot' })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, base4({ tab: 'dm' }));
    await page.reload();
    const peer = { key: 'held1', role: 'player', name: 'Mirelle', klass: 'Wizard', level: 3, hp: 10, hpMax: 10, tmp: 0, ac: 12, exh: 0, conc: '', cond: [], death: { s: 0, f: 0 } };
    await page.evaluate(ps => window.__peers(ps), [peer, { ...peer, key: 'held2', name: 'Borin' }]);
    const first = page.locator('[data-a="lootsend"]').first();
    await expect(first).toHaveText(/Send to everyone|An alle schicken/);
    await page.locator('#dm-lto2').selectOption('held2');
    await expect(page.locator('[data-a="lootsend"]').first()).toHaveText(/Send to Borin|An Borin schicken/);
    await expect(page.locator('#dm-lto')).toHaveValue('held2');
    await page.locator('[data-a="lootsend"]').first().click();
    expect(await page.evaluate(() => window.__sent.at(-1))).toMatchObject({ type: 'item', to: 'held2' });
  });
});

test('Spielleitungsmodus: neue Spieler erscheinen sofort im Live-Tisch @new', async ({ page }) => {
  await page.addInitScript(fake);
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(s => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, only: true, view: 'live' })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, base4({ tab: 'dmlive' }));
  await page.reload();
  await page.evaluate(p => window.__peers([p]), { key: 'held1', role: 'player', name: 'Mirelle', klass: 'Wizard', level: 3, hp: 10, hpMax: 10, tmp: 0, ac: 12, exh: 0, conc: '', cond: [], death: { s: 0, f: 0 } });
  await expect(page.locator('.dm-row')).toContainText('Mirelle');
});
