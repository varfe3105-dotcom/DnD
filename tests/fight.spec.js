// Kampfmodus (Vorbereitung / laufender Kampf), Reihenfolge für Spieler, Konzentration beenden, Meldungen, Zauberverwaltung
import { test, expect, URL_UNDER_TEST, seed, read, base4, tab, joinRoom } from './helpers.js';

const blankSlots = () => Array.from({ length: 9 }, () => ({ max: 0, used: 0 }));
async function dmPage(page) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(s => { localStorage.clear(); localStorage.setItem('charbogen-v4', JSON.stringify(s)); localStorage.setItem('charbogen-dm', JSON.stringify({ on: true, only: true })); }, base4({ tab: 'dmcombat' }));
  await page.reload();
  await page.locator('#app header').waitFor();
}
/** Nachgebaute Verbindung. dm(key) liefert die Presence einer Spielleitung (oder null); msgs werden nach dem Verbinden zugestellt. */
const fake = (page, dmPeer, msgs = []) => page.addInitScript(([d, ms]) => {
  window.__sent = [];
  window.__liveFake = (code, key, onPeers, onStatus, onMsg) => {
    const peer = d ? JSON.parse(JSON.stringify(d).replaceAll('$KEY', key)) : null;
    setTimeout(() => { onStatus('on'); setTimeout(() => ms.forEach(m => onMsg(JSON.parse(JSON.stringify(m).replaceAll('$KEY', key)))), 1500); }, 0);
    return { track(p) { window.__sent.push(p); onPeers([...(peer ? [peer] : []), { ...p, key }]); }, send() {}, close() {} };
  };
}, [dmPeer || null, msgs]);

test.describe('Kampfmodus @new', () => {
  test('Spielleitung: Vorbereitung → Kampf starten → Reihenfolge an Spieler → Kampf beenden', async ({ page }) => {
    await fake(page);
    await dmPage(page);
    await expect(page.locator('.fight-state')).not.toHaveClass(/on/);
    await expect(page.locator('[data-a="dmstep"]')).toBeDisabled();
    await page.locator('#dm-mq').fill('goblin warrior');
    await page.locator('[data-a="dmadd"][data-m="goblin-warrior"]').click();
    await page.locator('[data-a="tab"][data-t="dmlive"]').click();
    await page.locator('[data-a="livecreate"]').click();
    await page.locator('[data-a="tab"][data-t="dmcombat"]').click();
    await page.locator('[data-a="dmstep"][data-d="1"]').click();
    await expect(page.locator('.fight-state.on')).toContainText(/Round 1|Runde 1/);
    await expect(page.locator('.fight-state.on')).toContainText('Goblin Warrior');
    await page.locator('.dm-row [data-a="dmhp"][data-d="-1"]').click();
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1)?.turn?.order)).toEqual([{ n: 'Goblin Warrior', pc: false, k: '', s: '', cr: '1/4', ac: '', c: [], ty: 'fey', cur: true, i: '0', nx: false }]);
    // Geheimhaltung: nach Schaden verrät die Übertragung an Spieler weder TP noch einen groben Zustand
    expect(JSON.stringify(await page.evaluate(() => window.__sent.at(-1)?.turn))).not.toMatch(/hurt|bad|hp/);
    // Konzentration eines Gegners eintragen
    await page.locator('.dm-name').click();
    await page.locator('[data-dm="conc"]').fill('Hold Person');
    await page.locator('[data-dm="conc"]').blur();
    await expect(page.locator('.dm-row')).toContainText('Hold Person');
    await page.locator('[data-a="dmclose"]').click();
    // Initiativeleiste: aktiver Zug golden markiert
    await expect(page.locator('.ibar .ib.cur')).toContainText('Goblin Warrior');
    await page.locator('[data-a="dmfightend"]').click();
    await page.locator('[data-a="dmfightend"]').click();
    await expect(page.locator('.fight-state')).not.toHaveClass(/on/);
    await expect(page.locator('.dm-row')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1)?.turn)).toBe(null);
  });

  test('Spieler: Reihenfolge mit Zustand der Gegner, Meldungen bei Wirkung und Konzentrationsende', async ({ page }) => {
    await fake(page, { key: 'dm-x', role: 'dm', turn: { r: 2, cur: '', name: 'Goblin', enemy: true, next: 'Test', order: [{ n: 'Goblin', pc: false, s: 'bad', cur: true }, { n: 'Test', pc: true, k: '$KEY' }, { n: 'Ork', pc: false, s: 'down' }] }, buffs: [{ id: 'b1', s: 'Shield of Faith', to: ['$KEY'], v: 2 }] }, [{ id: 'm1', type: 'conc', to: '$KEY', from: 'dm-x' }]);
    await seed(page, base4({ tab: 'setup', conc: 'Bless' }));
    await joinRoom(page, 'ABC234');
    await expect(page.locator('#toast')).toContainText('Shield of Faith');
    await tab(page, 'main');
    await expect(page.locator('.fight-state.on')).toContainText(/Round 2|Runde 2/);
    await expect(page.locator('.fight-order li.cur')).toContainText('Goblin');
    // Gegner-TP bleiben verborgen: auch ein grober Zustand („bad“) wird verworfen, nur „besiegt“ (von der Spielleitung markiert) erscheint
    await expect(page.locator('.fight-order li.cur')).not.toContainText(/bloodied|schwer verletzt|verletzt/);
    await expect(page.locator('.fight-order li', { hasText: 'Ork' })).toContainText(/defeated|besiegt/i);
    await expect(page.locator('.fight-order li.me .ib-hp')).toContainText('20');
    await page.locator('[data-a="liveyes"][data-id="m1"]').click();
    expect((await read(page)).conc).toBe('');
  });

  test('Spieler: eigener Zug golden hervorgehoben, Meldungsstreifen für Zug und Schaden, Ton nur auf Wunsch', async ({ page }) => {
    await fake(page, { key: 'dm-x', role: 'dm', turn: { r: 1, cur: '$KEY', name: 'Test', next: 'Ork', order: [{ n: 'Test', pc: true, k: '$KEY', cur: true, i: '15' }, { n: 'Ork', pc: false, s: 'ok', i: '8', nx: true }] } }, [{ id: 'm1', type: 'dmg', to: '$KEY', from: 'dm-x', value: 8 }]);
    await seed(page, base4({ tab: 'setup' }));
    await joinRoom(page, 'ABC234');
    await tab(page, 'main');
    await expect(page.locator('.fight-state.mine')).toBeVisible();
    await expect(page.locator('.ibar .ib.cur .ib-i')).toHaveText('15');
    await expect(page.locator('.ibar .ib.next')).toContainText('Ork');
    await expect(page.locator('.feed li.turn')).toBeVisible();
    await expect(page.locator('.feed li.bad')).toContainText('8');
    await expect(page.locator('[data-a="soundtg"]')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('[data-a="soundtg"]').click();
    expect(await page.evaluate(() => localStorage.getItem('charbogen-sound'))).toBe('on');
  });

  test('Spielleitung am Tablet: Gruppe und Gegner als Reiter, Kompaktdialog über die Initiativeleiste', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1100 });
    await dmPage(page);
    await page.locator('#dm-mq').fill('goblin warrior');
    await page.locator('#dm-qty').fill('2');
    await page.locator('[data-a="dmadd"][data-m="goblin-warrior"]').click();
    await expect(page.locator('.prep3 .prep-go [data-a="dmstep"]')).toBeEnabled();
    await page.locator('[data-a="dmstep"][data-d="1"]').click();
    await expect(page.locator('.fight-col.foes')).toBeHidden();
    await page.locator('[data-a="fside"][data-k="foes"]').click();
    await expect(page.locator('.fight-col.foes .dm-row')).toHaveCount(2);
    await page.locator('.ibar [data-a="dmfocus"]').nth(1).click();
    await expect(page.locator('.dm-dlg')).toBeVisible();
    await page.locator('.dm-dlg [data-a="dmcond"][data-c="Prone"]').click();
    await expect(page.locator('.fight-col.foes .dm-row').nth(1).locator('.tag.t-bad')).toHaveText(/Prone/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test('Ohne Spielleitung: Vorbereitung, Kampf selbst beginnen und beenden', async ({ page }) => {
    await seed(page, base4({}));
    await expect(page.locator('.fight-state')).not.toHaveClass(/on/);
    await page.locator('[data-a="tstart"]').click();
    await expect(page.locator('.fight-state.on')).toBeVisible();
    await page.locator('[data-a="tend"]').click();
    await expect(page.locator('.fight-state')).not.toHaveClass(/on/);
  });
});

test.describe('Zauberverwaltung @new', () => {
  const sp = (n, lvl, o = {}) => ({ n, lvl, ic: 'wand', time: '1 action', range: '', dur: '', eff: '', src: 'sum', ...o });
  test('Übersicht ohne Umschalter; Vorbereiten nur bewusst; nichts wird gelöscht', async ({ page }) => {
    await seed(page, base4({ klass: 'Cleric', level: 3, abil: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }, slots: blankSlots().map((s, i) => (i < 2 ? { max: 2, used: 0 } : s)), spells: [sp('Bless', 1), sp('Sleep', 1, { prep: false })], tab: 'spells' }));
    await expect(page.locator('[data-a="prep"]')).toHaveCount(0);
    await expect(page.locator('.sp', { hasText: 'Sleep' })).toHaveCount(0);
    await expect(page.locator('.card')).toContainText(/1 unprepared|1 nicht vorbereitete/);
    await page.locator('[data-a="spall"]').click();
    await expect(page.locator('[data-a="prep"]')).toHaveCount(2);
    expect((await read(page)).spells).toHaveLength(2);
  });
  test('Entfernen nur in Bearbeiten und mit Bestätigung', async ({ page }) => {
    await seed(page, base4({ spells: [sp('Light', 0)], tab: 'setup' }));
    await page.locator('[data-a="spdel"]').click();
    expect((await read(page)).spells).toHaveLength(1);
    await page.locator('[data-a="spdel"]').click();
    expect((await read(page)).spells).toHaveLength(0);
  });
});
