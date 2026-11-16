// Kampfmodus (Vorbereitung / laufender Kampf), Reihenfolge für Spieler, Konzentration beenden, Meldungen, Zauberverwaltung
import { test, expect, URL_UNDER_TEST, seed, read, base4, tab } from './helpers.js';

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
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1)?.turn?.order)).toEqual([{ n: 'Goblin Warrior', pc: false, k: '', s: 'hurt', cur: true }]);
    // Konzentration eines Gegners eintragen
    await page.locator('.dm-name').click();
    await page.locator('[data-dm="conc"]').fill('Hold Person');
    await page.locator('[data-dm="conc"]').blur();
    await expect(page.locator('.dm-name small')).toContainText('Hold Person');
    await page.locator('[data-a="dmfightend"]').click();
    await page.locator('[data-a="dmfightend"]').click();
    await expect(page.locator('.fight-state')).not.toHaveClass(/on/);
    await expect(page.locator('.dm-row')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1)?.turn)).toBe(null);
  });

  test('Spieler: Reihenfolge mit Zustand der Gegner, Meldungen bei Wirkung und Konzentrationsende', async ({ page }) => {
    await fake(page, { key: 'dm-x', role: 'dm', turn: { r: 2, cur: '', name: 'Goblin', enemy: true, next: 'Test', order: [{ n: 'Goblin', pc: false, s: 'bad', cur: true }, { n: 'Test', pc: true, k: '$KEY' }] }, buffs: [{ id: 'b1', s: 'Shield of Faith', to: ['$KEY'], v: 2 }] }, [{ id: 'm1', type: 'conc', to: '$KEY', from: 'dm-x' }]);
    await seed(page, base4({ tab: 'setup', conc: 'Bless' }));
    await page.locator('#live-code').fill('ABC234');
    await page.locator('[data-a="livejoin"]').click();
    await expect(page.locator('#toast')).toContainText('Shield of Faith');
    await tab(page, 'main');
    await expect(page.locator('.fight-state.on')).toContainText(/Round 2|Runde 2/);
    await expect(page.locator('.fight-order li.cur')).toContainText('Goblin');
    await expect(page.locator('.fight-order li.cur .fo-s')).toHaveText(/bloodied|schwer verletzt/);
    await expect(page.locator('.fight-order li.me .dm-hpv')).toContainText('20');
    await page.locator('[data-a="liveyes"][data-id="m1"]').click();
    expect((await read(page)).conc).toBe('');
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
