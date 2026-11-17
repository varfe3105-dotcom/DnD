import { test as base, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = process.env.TARGET === 'legacy' ? 'legacy/charakterbogen-v4.html' : 'dist/charakterbogen.html';
export const URL_UNDER_TEST = pathToFileURL(path.resolve(file)).href;
export const KEY = 'charbogen-v4';

export const test = base.extend({
  // Ohne hub: true starten Tests wie früher direkt im Spielbereich (Dashboard hat eigene Tests in hub.spec.js).
  hub: [false, { option: true }],
  invGrid: [true, { option: true }],
  page: async ({ page, hub, invGrid }, use) => {
    if (!hub) await page.addInitScript(() => { try { sessionStorage.setItem('charbogen-view', 'play'); } catch (e) { /* egal */ } });
    // Ältere Tests prüfen das Rucksack-Raster; die neue Listenansicht testet tests/charpages.spec.js.
    if (invGrid) await page.addInitScript(() => { try { localStorage.setItem('charbogen-invview', 'grid'); } catch (e) { /* egal */ } });
    // Nur das Original lädt Google Fonts; im Test bleibt alles lokal.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    // Online-Speicherung: im Test nie den echten Server ansprechen (eigene Tests in cloud.spec.js).
    if (!process.env.LIVE_REAL) await page.route('**/rest/v1/rpc/*', r => r.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"PGRST202"}' }));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await use(page);
    expect(errors, 'JavaScript-Fehler auf der Seite').toEqual([]);
  },
});
export { expect };

export const open = async page => { await page.goto(URL_UNDER_TEST); await page.locator('#app header').waitFor(); };

/** Legt einen Spielstand ab und lädt neu. Fehlende Felder ergänzt die App selbst. */
export async function seed(page, state, key = KEY) {
  await page.goto(URL_UNDER_TEST);
  await page.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [key, state]);
  await page.reload();
  await page.locator('#app header').waitFor();
}

export const read = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
export const act = (page, a, extra = '') => page.locator(`[data-a="${a}"]${extra}`);
// Die Kampfseite ist in der Bibliothek (ohne Kampagne) nicht verlinkt, bleibt aber als Seite gültig. Viele Tests prüfen dort
// die Spiellogik am Grundbogen; sie gelangen über dieselbe Aktion „tab“ dorthin, die auch die Reiter auslösen.
export const tab = async (page, t) => {
  const b = page.locator(`[data-a="tab"][data-t="${t}"]`);
  if (t === 'main' && !(await b.count())) return page.evaluate(() => { const x = document.createElement('button'); x.dataset.a = 'tab'; x.dataset.t = 'main'; x.hidden = true; document.getElementById('app').appendChild(x); x.click(); });
  return b.click();
};
// Rasten stehen im Charakterkopf nur im Spielbetrieb (Kampagne oder Kampfseite); im Grundbogen erst zur Kampfseite.
export const rest = async (page, r) => { if (!(await page.locator('[data-a="rest"]').count())) await tab(page, 'main'); return act(page, 'rest', `[data-r="${r}"]`).click(); };

export const blankSlots = () => Array.from({ length: 9 }, () => ({ max: 0, used: 0 }));
export const base4 = o => ({ v: 4, name: 'Test', hp: 20, hpMax: 20, tmp: 0, level: 1, prof: 2, ac: 12, speed: 9, abil: { str: 14, dex: 16, con: 12, int: 10, wis: 10, cha: 10 }, slots: blankSlots(), tab: 'main', ...o });
export const spell = (n, lvl, extra = {}) => ({ n, ic: 'star', lvl, time: '1', range: '1', dur: '1', eff: 'x', conc: false, ritual: false, school: '', cls: '', src: 'sum', ...extra });
export const item = (id, n, extra = {}) => ({ id, n, ic: 'box', p: 'Beschreibung', q: 1, slot: '', cons: false, att: false, magic: false, tuned: false, ...extra });

export async function amount(page, a, value) {
  await page.locator('#hpv').fill(String(value));
  await act(page, a).click();
}

/** Wirkt einen Zauber; öffnet sich die Gradauswahl, wird der erste Vorschlag genommen. */
export async function castFirst(page, button) {
  await (button || act(page, 'cast')).click();
  const pick = page.locator('[data-a="castslot"]');
  if (await pick.count()) await pick.first().click();
  // Zauber mit Wirkung auf Mitspieler fragen nach dem Ziel: ohne Ziel weiter
  const skip = page.locator('[data-a="tgtskip"]');
  if (await skip.count()) await skip.click();
}

/** Raum ohne Kampagne betreten. In der Oberfläche gibt es das nicht mehr (Beitritt läuft über Kampagnen); viele Tests prüfen
 * aber die Live-Logik am Grundbogen und nutzen dafür die interne Aktion „livejoin“, die auch beim Wiederverbinden greift. */
export const joinRoom = (page, code = 'ABC234') => page.evaluate(c => {
  const app = document.getElementById('app'), i = document.createElement('input'), b = document.createElement('button');
  i.id = 'live-code'; i.hidden = true; i.value = c; b.dataset.a = 'livejoin'; b.hidden = true; app.append(i, b); b.click();
}, code);
