// Spielleitung im laufenden Kampf: Schaden auf ein gewähltes Ziel, nicht nur auf die Figur am Zug.
// Werteblock „Treffer auf“ (Durchschnitt vorbelegt), Spieler am Zug trifft Gegner, Zielwechsel in „Eingreifen“,
// verbundene Spieler bekommen den Schaden als Vorschlag.
import { test, expect, URL_UNDER_TEST, base4 } from './helpers.js';

const pc = (id, name, init, hp, extra = {}) => ({ id, kind: 'pc', name, init, hp, hpMax: hp, ac: 16, cond: {}, fx: [], note: '', ...extra });
const mon = (id, name, init, hp) => ({ id, kind: 'mon', mon: 'goblin-warrior', name, init, hp, hpMax: hp, ac: 15, cond: {}, fx: [], note: '' });
async function dmFight(page, active, extraPeers = []) {
  await page.addInitScript(ps => { window.__sent = []; window.__liveFake = (code, key, onPeers, onStatus) => { setTimeout(() => onStatus('on'), 0); return { track(p) { onPeers([...ps, { ...p, key }]); }, send(m) { window.__sent.push(m); }, close() {} }; }; }, extraPeers);
  await page.goto(URL_UNDER_TEST);
  const combat = { round: 1, active, list: [pc('p1', 'Borin', 18, 30), mon('m1', 'Goblin 1', 15, 10), mon('m2', 'Goblin 2', 9, 10), pc('p2', 'Mira', 5, 20, { live: 'held2' })] };
  await page.evaluate(([s, c]) => { localStorage.clear(); localStorage.setItem('charbogen-lang', 'de'); localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true, combat: c })); localStorage.setItem('charbogen-live', JSON.stringify({ code: 'ABC234', role: 'dm' })); }, [base4({ tab: 'dmcombat' }), combat]);
  await page.reload();
  await page.waitForLoadState('networkidle');
}
const dmState = page => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-dm')).combat.list);

test.describe('Kampf: Schaden auf ein Ziel @new', () => {
  test('Gegner am Zug: Angriff aufklappen, Treffer auf Borin mit Durchschnittsschaden', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await dmFight(page, 'm1');
    const atk = page.locator('.f3-turn details.arow-d').first();
    await atk.locator('summary').click();
    const amount = atk.locator('.hit-on input');
    await expect(amount).toHaveValue(/^\d+$/);
    const avg = +(await amount.inputValue());
    await atk.locator('[data-a="dmhit"]', { hasText: 'Borin' }).click();
    expect((await dmState(page)).find(c => c.id === 'p1').hp).toBe(30 - avg);
    await expect(page.locator('.f3-feed')).toContainText('Goblin 1 trifft Borin');
    // Betrag änderbar, Ziel ein anderer Gegner (z. B. Verwirrung)
    await atk.locator('summary').click().catch(() => {});
    const atk2 = page.locator('.f3-turn details.arow-d').first();
    if (!(await atk2.evaluate(e => e.open))) await atk2.locator('summary').click();
    await atk2.locator('.hit-on input').fill('3');
    await atk2.locator('[data-a="dmhit"]', { hasText: 'Goblin 2' }).click();
    expect((await dmState(page)).find(c => c.id === 'm2').hp).toBe(7);
  });

  test('Spieler am Zug trifft einen Gegner; verbundene Spieler erhalten Schaden als Vorschlag', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await dmFight(page, 'p1', [{ key: 'held2', role: 'player', name: 'Mira', hp: 20, hpMax: 20, ac: 14, cond: [] }]);
    const box = page.locator('.tp-hit');
    await expect(box).toContainText('Borin trifft einen Gegner');
    await expect(box.locator('[data-a="dmhit"]')).toHaveCount(2); // nur Gegner
    await box.locator('input').fill('6');
    await box.locator('[data-a="dmhit"]', { hasText: 'Goblin 1' }).click();
    expect((await dmState(page)).find(c => c.id === 'm1').hp).toBe(4);
    // Zielwahl in „Eingreifen“: auf Mira umschalten, Schaden geht als Vorschlag an ihr Gerät
    await page.locator('.ein-tgt [data-a="dmfocus"]', { hasText: 'Mira' }).click();
    await expect(page.locator('.ein-h .rc-n')).toHaveText('Mira');
    await page.locator('.ein [id^="lv-a-"]').fill('4');
    await page.locator('.ein [data-a="livesend"][data-t="dmg"]').click();
    await expect.poll(() => page.evaluate(() => window.__sent.find(m => m.type === 'dmg'))).toMatchObject({ type: 'dmg', to: 'held2', value: 4 });
  });

  test('Handy: Zielwahl im Eingreifen-Blatt und Treffer aus dem Werteblock', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await dmFight(page, 'm1');
    const atk = page.locator('.f3-turn details.arow-d').first();
    await atk.locator('summary').click();
    await atk.locator('.hit-on input').fill('2');
    await atk.locator('[data-a="dmhit"]', { hasText: 'Borin' }).click();
    expect((await dmState(page)).find(c => c.id === 'p1').hp).toBe(28);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
});
