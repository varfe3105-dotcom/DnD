// Handy (390 px): kein waagrechter Überlauf auf allen Kampagnen- und Charakterseiten, auch beim Scrollen
// (Kurzleiste) und im Live-Raum mit eigenem Zug; die Live-Leiste bleibt fest unten; Händlerwaren lesbar.
import { test, expect, URL_UNDER_TEST } from './helpers.js';

test.use({ hub: true });
const lib = { v: 4, id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 5, hp: 30, hpMax: 38, tab: 'prof',
  spells: [{ n: 'Bless', lvl: 1, src: 'sum' }, { n: 'Spirit Guardians', lvl: 3, src: 'sum' }], slots: Array.from({ length: 9 }, (_, i) => ({ max: i < 3 ? 3 : 0, used: 0 })) };
const dmPeer = { key: 'dm-x', role: 'dm', turn: { r: 2, cur: 'c1', name: 'Mirelle', next: 'Goblin', order: [{ n: 'Mirelle', pc: true, k: 'c1', cur: true, i: '15' }, { n: 'Goblin', pc: false, i: '9', nx: true, cr: '1/4' }] } };
async function start(page, data) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(d => { window.__liveFake = (code, key, onPeers, onStatus) => { setTimeout(() => onStatus('on'), 0); return { track(p) { onPeers([...(d ? [d] : []), { ...p, key }]); }, send() {}, close() {} }; }; }, data.peer || null);
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, data.ls);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
async function go(page, k) {
  const top = page.locator(`.tabs nav [data-a="tab"][data-t="${k}"]`);
  if (await top.isVisible()) return top.click();
  const sub = page.locator(`.charsub [data-t="${k}"]`);
  if (await sub.count()) return sub.click();
  await page.locator('.tab-more').click();
  await page.locator(`.mmenu [data-a="tab"][data-t="${k}"]`).click();
}

test('Spieler im Live-Raum: alle Seiten ohne Überlauf, Live-Leiste fest unten @new', async ({ page }) => {
  await start(page, { peer: dmPeer, ls: { 'charbogen-lang': 'de', 'charbogen-v4': lib, 'charbogen-char-c1': lib, 'charbogen-index': [{ id: 'c1', name: 'Mirelle' }], 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], role: 'player', room: 'QW3RT9', split: true }] } });
  await page.locator('.hub-side [data-a="hubgo"][data-s="camps"]').click();
  await page.locator('.hub-camp [data-a="campplay"]').click();
  await expect(page.locator('#live-dock.full')).toBeVisible();
  for (const k of ['cover', 'party', 'main', 'explore', 'trade', 'chron', 'wiki', 'prof', 'stats', 'inv', 'spells', 'notes', 'setup']) {
    await go(page, k);
    expect(await noOverflow(page), `Überlauf auf ${k}`).toBe(true);
    // Beim Scrollen erscheint die Kurzleiste; auch dann kein Überlauf
    await page.evaluate(() => window.scrollTo(0, 2000)); await page.waitForTimeout(50);
    expect(await noOverflow(page), `Überlauf auf ${k} (gescrollt)`).toBe(true);
    // Live-Leiste: fest positioniert, unten im Bild, nicht oben im Seitenfluss (auf der Kampfseite ohne Zuganzeige)
    if (k !== 'main') {
    const dock = await page.locator('#live-dock').evaluate(e => ({ pos: getComputedStyle(e).position, top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom }));
    expect(dock.pos, `Live-Leiste auf ${k}`).toBe('fixed');
    expect(dock.bottom).toBeLessThanOrEqual(844);
    expect(dock.top).toBeGreaterThan(844 / 2);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
});

test('Spielleitung: Händlerwaren am Handy lesbar, kein Überlauf @new', async ({ page }) => {
  const dm = { merchants: [{ id: 'mm', n: 'Alchemist Varo', open: true, items: [{ id: 'w', k: 'potion:potion-of-healing', n: 'Potion of Healing', cp: 5000, q: 3 }] }] };
  await start(page, { ls: { 'charbogen-lang': 'de', 'charbogen-dm': { on: true }, 'charbogen-dm-camp-d1': dm, 'charbogen-campaigns': [{ id: 'd1', name: 'Bastion', status: 'active', chars: [], role: 'dm', split: true }] } });
  await page.locator('.hub-side [data-a="hubgo"][data-s="gm"]').click();
  await page.locator('.hub-camp [data-a="campplay"]').click();
  await go(page, 'dmloot');
  const nm = await page.locator('.row.mer-w .nm').first().boundingBox();
  expect(nm.width).toBeGreaterThan(120);
  for (const k of ['cover', 'dmlive', 'dmcombat', 'explore', 'dmloot', 'dmnotes', 'wiki', 'dmset']) { await go(page, k); expect(await noOverflow(page), `Überlauf auf ${k}`).toBe(true); }
});
