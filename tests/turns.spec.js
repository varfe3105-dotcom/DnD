import { test, expect, seed, act, base4, URL_UNDER_TEST } from './helpers.js';

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

  test('wer anders dran ist, steht schlicht da; Monster heißen nur „Gegner“', async ({ page }) => {
    await seed(page, base4({ tab: 'main', id: 'held1' }));
    await page.evaluate(() => localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'player' })));
    await page.reload();
    await page.evaluate(p => window.__peers([p]), dmPeer({ r: 1, cur: '', name: '', enemy: true, next: 'Borin', nextEnemy: false }));
    await expect(page.locator('.turn')).toContainText(/Enemy|Gegner/);
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
      { id: 'c2', kind: 'mon', name: 'Goblin', init: 12, hp: 7, hpMax: 7, ac: 15, cond: {} },
    ] };
    await page.evaluate(([s, c]) => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, view: 'combat', combat: c })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, [base4({ tab: 'dm' }), combat]);
    await page.reload();
    await page.locator('#app header').waitFor();
    expect(await page.evaluate(() => window.__tracked.at(-1).turn)).toBeNull();
    await act(page, 'dmturns').click();
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).turn)).toMatchObject({ cur: 'held1', name: 'Mirelle', nextEnemy: true, next: '' });
    // Falscher Absender ändert nichts
    await page.evaluate(() => window.__msg({ id: 'm1', type: 'endturn', to: 'dm', from: 'jemand' }));
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')).combat.active)).toBe('c1');
    await page.evaluate(() => window.__msg({ id: 'm2', type: 'endturn', to: 'dm', from: 'held1' }));
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')).combat.active)).toBe('c2');
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1).turn)).toMatchObject({ cur: '', name: '', enemy: true, next: 'Mirelle' });
  });
});
