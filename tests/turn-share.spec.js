// Zugstand für die Spielleitung: Spieler senden Aktion/Bonusaktion/Reaktion (frei oder verbraucht),
// die Spielleitung sieht ihn unter „Spieler am Zug“ und auf der Karte.
import { test, expect, seed, act, base4, URL_UNDER_TEST, joinRoom } from './helpers.js';

const fake = () => {
  window.__tracked = [];
  window.__liveFake = (code, key, onPeers, onStatus) => { window.__peers = onPeers; setTimeout(() => onStatus('on'), 0); return { track: p => window.__tracked.push(p), send() {}, close() {} }; };
};
const dmPeer = cur => ({ key: 'dm-x', role: 'dm', turn: { r: 1, cur, name: 'Mirelle', order: [{ n: 'Mirelle', pc: true, k: cur, cur: true, i: '15' }] } });

test.describe('Zugstand an die Spielleitung @new', () => {
  test('Spieler: Zugstand geht mit, Aktion ausführen meldet „verbraucht“', async ({ page }) => {
    await page.addInitScript(fake);
    await seed(page, base4({ tab: 'main', id: 'held1', name: 'Mirelle', klass: 'Fighter', level: 1 }));
    await joinRoom(page, 'ABC234');
    await page.waitForLoadState('networkidle');
    await page.evaluate(p => window.__peers([p]), dmPeer('held1'));
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1)?.tu)).toEqual({ a: 0, m: 1, b: false, r: false });
    await page.locator('[data-a="tact"][data-k="dodge"]').click();
    await expect.poll(() => page.evaluate(() => window.__tracked.at(-1)?.tu)).toMatchObject({ a: 1, m: 1 });
  });

  test('Spielleitung: sieht Aktion und Bonusaktion verbraucht, Reaktion frei', async ({ page }) => {
    await page.addInitScript(peer => { window.__liveFake = (code, key, onPeers, onStatus) => { setTimeout(() => onStatus('on'), 0); return { track(p) { onPeers([peer, { ...p, key }]); }, send() {}, close() {} }; }; },
      { key: 'held2', role: 'player', name: 'Mira', hp: 20, hpMax: 20, ac: 14, cond: [], tu: { a: 1, m: 1, b: true, r: false } });
    await page.goto(URL_UNDER_TEST);
    const combat = { round: 1, active: 'p2', list: [{ id: 'p2', kind: 'pc', live: 'held2', name: 'Mira', init: 15, hp: 20, hpMax: 20, ac: 14, cond: {}, fx: [], note: '' }, { id: 'm1', kind: 'mon', mon: 'goblin-warrior', name: 'Goblin', init: 9, hp: 10, hpMax: 10, ac: 15, cond: {}, fx: [], note: '' }] };
    await page.evaluate(([s, c]) => { localStorage.clear(); localStorage.setItem('charbogen-lang', 'de'); localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, combat: c })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, [base4({ tab: 'dmcombat' }), combat]);
    await page.reload();
    const econ = page.locator('.f3-turn .tu-econ');
    await expect(econ).toBeVisible();
    await expect(econ.locator('> div').nth(0)).toHaveClass(/used/);
    await expect(econ.locator('> div').nth(1)).toHaveClass(/used/);
    await expect(econ.locator('> div').nth(2)).not.toHaveClass(/used/);
    await expect(page.locator('.dm-row .tu-mini b.x')).toHaveCount(2);
  });
});
