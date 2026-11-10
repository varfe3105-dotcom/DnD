import { test as base, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = process.env.TARGET === 'legacy' ? 'legacy/charakterbogen-v4.html' : 'dist/charakterbogen.html';
export const URL_UNDER_TEST = pathToFileURL(path.resolve(file)).href;
export const KEY = 'charbogen-v4';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Nur das Original lädt Google Fonts; im Test bleibt alles lokal.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
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
export const tab = (page, t) => page.locator(`[data-a="tab"][data-t="${t}"]`).click();
export const rest = (page, r) => act(page, 'rest', `[data-r="${r}"]`).click();

export const blankSlots = () => Array.from({ length: 9 }, () => ({ max: 0, used: 0 }));
export const base4 = o => ({ v: 4, name: 'Test', hp: 20, hpMax: 20, tmp: 0, level: 1, prof: 2, ac: 12, speed: 9, abil: { str: 14, dex: 16, con: 12, int: 10, wis: 10, cha: 10 }, slots: blankSlots(), tab: 'main', ...o });
export const spell = (n, lvl, extra = {}) => ({ n, ic: 'star', lvl, time: '1', range: '1', dur: '1', eff: 'x', conc: false, ritual: false, school: '', cls: '', src: 'sum', ...extra });
export const item = (id, n, extra = {}) => ({ id, n, ic: 'box', p: 'Beschreibung', q: 1, slot: '', cons: false, att: false, magic: false, tuned: false, ...extra });

export async function amount(page, a, value) {
  await page.locator('#hpv').fill(String(value));
  await act(page, a).click();
}
