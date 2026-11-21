// Begleiter (z. B. Primal Companion des Beast Master): beim Spieler sichtbar (Übersicht und Kampfseite),
// bei der Spielleitung im Kampf unter dem Spieler, auch wenn er erst nach dem Kampfbeitritt angelegt wurde.
import { test, expect, seed, base4, URL_UNDER_TEST } from './helpers.js';

const ranger = extra => base4({ klass: 'Ranger', sub: 'Beast Master', level: 3, abil: { str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 8 }, pets: [{ id: 'w1', n: 'Wolf', ac: 13, hp: 11, hpMax: 11, speed: '40 ft.', text: 'Bite' }], ...extra });

test.describe('Begleiter @new', () => {
  test('Spieler: Wolf auf der Übersicht sichtbar', async ({ page }) => {
    await seed(page, ranger({ tab: 'prof' }));
    await expect(page.locator('#app')).toContainText('Wolf');
  });

  test('Spielleitung: Begleiter erscheint im laufenden Kampf unter dem Spieler, auch nachträglich', async ({ page }) => {
    await page.addInitScript(() => {
      window.__liveFake = (code, key, onPeers, onStatus) => { window.__peers = onPeers; setTimeout(() => onStatus('on'), 0); return { track() {}, send() {}, close() {} }; };
    });
    await page.goto(URL_UNDER_TEST);
    const combat = { round: 1, active: 'p1', list: [{ id: 'p1', kind: 'pc', live: 'held1', name: 'Grom', init: 14, hp: 30, hpMax: 30, ac: 15, cond: {}, fx: [], note: '' }] };
    await page.evaluate(([s, c]) => { localStorage.clear(); localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, combat: c })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, [base4({ tab: 'dmcombat' }), combat]);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.__peers([{ key: 'held1', role: 'player', name: 'Grom', hp: 30, hpMax: 30, ac: 15, cond: [], pets: [{ id: 'w1', n: 'Wolf', hp: 11, hpMax: 11, ac: 13 }] }]));
    await expect(page.locator('.dm-row', { hasText: 'Wolf' })).toBeVisible();
    const list = await page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')).combat.list);
    expect(list.find(c => c.kind === 'pet')).toMatchObject({ name: 'Wolf', live: 'held1', hp: 11, hpMax: 11 });
  });
});
