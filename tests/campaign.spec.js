// Kampagnenübersicht als Lagebericht und Gruppe: Kapitel/Planung dauerhaft, Spielleiterwerkzeuge nur für die Spielleitung,
// Spieler übernehmen die Angaben der Spielleitung, Spielername gilt für das Gerät, Aufgaben und Chronik ohne Kopien.
import { test, expect, URL_UNDER_TEST } from './helpers.js';

test.use({ hub: true });
const chars = { 'charbogen-v4': { v: 4, id: 'c1', name: 'Mirelle', race: 'Elf', klass: 'Cleric', level: 5, hp: 30, hpMax: 38, tab: 'prof' }, 'charbogen-index': [{ id: 'c1', name: 'Mirelle', klass: 'Cleric', level: 5 }] };
async function start(page, data = {}) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(d => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, data);
  await page.reload();
  await page.locator('.hub').waitFor();
}
const camps = page => page.evaluate(() => JSON.parse(localStorage.getItem('charbogen-campaigns') || '[]'));
const fake = (page, dm) => page.addInitScript(d => {
  window.__sent = [];
  window.__liveFake = (code, key, onPeers, onStatus) => { setTimeout(() => onStatus('on'), 0); return { track(p) { window.__sent.push(p); onPeers([...(d ? [d] : []), { ...p, key }]); }, send() {}, close() {} }; };
}, dm || null);

test.describe('Lagebericht und Gruppe @new', () => {
  test('Spielleitung: Werkzeugleiste, Kapitel und Planung dauerhaft, Aufgaben und Chronik aus dem Notizbuch, Presence trägt sie', async ({ page }) => {
    await fake(page);
    const dmData = { on: true, only: false, notes: [{ id: 'n1', kind: 'plot', title: 'Den Boten finden', body: '' }, { id: 'n2', kind: 'session', title: 'Sitzung 4', body: 'Die Brücke fiel.' }, { id: 'n3', kind: 'place', title: 'Grenzhall', body: 'Geheim: Der Vogt ist bestochen.' }], here: 'n3' };
    await start(page, { ...chars, 'charbogen-dm': { on: true }, 'charbogen-dm-camp-k1': dmData, 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: [], role: 'dm', room: 'ABC234', split: true }] });
    await page.locator('.hub-side [data-s="gm"]').click();
    await page.locator('.hub-camp [data-a="campplay"]').click();
    await expect(page.locator('.lb-tools')).toBeVisible();
    await page.locator('#cv-chapter').fill('Kapitel 2: Die Belagerung');
    await page.locator('#cv-plan').fill('Vorräte kaufen');
    await page.locator('#cv-next').fill('2026-12-01T19:00');
    await page.locator('#cv-next').blur();
    expect((await camps(page))[0]).toMatchObject({ chapter: 'Kapitel 2: Die Belagerung', plan: 'Vorräte kaufen', next: '2026-12-01T19:00' });
    await expect(page.locator('.hd .rc-ribbon')).toHaveText('Kapitel 2: Die Belagerung');
    await expect(page.locator('.lb-place .cover-v')).toHaveText('Grenzhall');
    await expect(page.locator('.lb-tasks')).toContainText('Den Boten finden');
    await expect(page.locator('.lb-recent')).toContainText('Sitzung 4');
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1)?.camp)).toMatchObject({ n: 'Grenzland', c: 'Kapitel 2: Die Belagerung', p: 'Vorräte kaufen', x: '2026-12-01T19:00' });
    // Der Notiztext des Orts verlässt das Gerät nie
    expect(JSON.stringify(await page.evaluate(() => window.__sent))).not.toContain('bestochen');
  });

  test('Spieler: keine Werkzeuge, Angaben der Spielleitung werden dauerhaft übernommen, Aufgaben aus der eigenen Chronik', async ({ page }) => {
    await fake(page, { key: 'dm-x', role: 'dm', camp: { n: 'Grenzland', d: '', c: 'Kapitel 2', p: 'Vorräte', x: '2026-12-01T19:00' }, here: 'Taverne' });
    await start(page, { ...chars, 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], role: 'player', room: 'ABC234', split: true, log: 'Sitzung 1: Ankunft\n[ ] Den Schmied fragen' }] });
    await page.locator('[data-a="campplay"]').click();
    await expect(page.locator('.lb-tools')).toHaveCount(0);
    await expect(page.locator('.hd .rc-ribbon')).toHaveText('Kapitel 2');
    await expect.poll(async () => (await camps(page))[0]).toMatchObject({ chapter: 'Kapitel 2', plan: 'Vorräte', next: '2026-12-01T19:00', place: 'Taverne' });
    await expect(page.locator('.lb-tasks li')).toHaveText(['Den Schmied fragen']);
    await expect(page.locator('.lb-recent')).toContainText('Sitzung 1: Ankunft');
    await expect(page.locator('.lb-recent')).not.toContainText('Schmied');
  });

  test('Spielername: einmal in den Einstellungen, geht mit der Presence und steht auf der Gruppenkarte', async ({ page }) => {
    await fake(page, { key: 'p2', role: 'player', name: 'Borin', pl: 'Tom', klass: 'Fighter', level: 4, hp: 8, hpMax: 36, ac: 17, cond: ['Prone'] });
    await start(page, { ...chars, 'charbogen-campaigns': [{ id: 'k1', name: 'Grenzland', status: 'active', chars: ['c1'], role: 'player', room: 'ABC234', split: true }] });
    await page.locator('.hub-side [data-s="settings"]').click();
    await page.locator('#pl-name').fill('Lea');
    expect(await page.evaluate(() => localStorage.getItem('charbogen-player'))).toBe('Lea');
    await page.locator('.hub-side [data-s="camps"]').click();
    await page.locator('[data-a="campplay"]').click();
    await expect.poll(() => page.evaluate(() => window.__sent.at(-1)?.pl)).toBe('Lea');
    await page.locator('[data-a="tab"][data-t="party"]').click();
    await expect(page.locator('.mcard.me')).toContainText('Lea');
    const borin = page.locator('.mcard', { hasText: 'Borin' });
    await expect(borin).toContainText('Tom');
    await expect(borin.locator('.tag.t-bad')).toHaveText('Prone');
    await expect(borin.locator('.hpbar')).toHaveClass(/low/);
  });
});
