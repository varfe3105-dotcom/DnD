// Erzeugt Screenshots: Desktop 1280 px und Handy 390 px, hell und dunkel.
// Aufruf: node scripts/screenshots.mjs [tabs, kommagetrennt]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const url = pathToFileURL(path.resolve('dist/charakterbogen.html')).href;
const tabs = (process.argv[2] || 'main,inv,wiki,setup').split(',');
const out = 'screenshots';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);

const slots = Array.from({ length: 9 }, (_, i) => ({ max: [4, 3, 2][i] || 0, used: i === 0 ? 1 : 0 }));
const it = (id, n, ic, p, extra = {}) => ({ id, n, ic, p, q: 1, slot: '', cons: false, att: false, magic: false, tuned: false, ...extra });
const bag = Array(24).fill(null);
bag[0] = it('b1', 'Trank der Heilung', 'potion', 'Heilt 2W4+2 TP · Aktion · 50 GM', { cons: true, q: 3 });
bag[1] = it('b2', 'Dolch', 'sword', 'Einfach · 1W4 Stich · Finesse, Leicht, Wurf 6/18 m · 2 GM', { slot: 'hand' });
bag[2] = it('b3', 'Ring of Protection', 'ring', '+1 auf RK und auf alle Rettungswürfe.', { slot: 'ring', att: true, magic: true });
const demo = {
  v: 4, name: 'Mirelle Ashgrove', info: 'Sage · Neutral Good', race: 'Elf', subrace: 'High Elf', klass: 'Wizard', sub: 'School of Evocation', level: 5, cls: 'W',
  hp: 23, hpMax: 32, tmp: 4, ac: 13, speed: 9, prof: 3, abil: { str: 8, dex: 16, con: 14, int: 18, wis: 12, cha: 10 }, saves: { int: true, wis: true }, skills: { Arcana: 1, History: 2 },
  hd: { max: 5, used: 2, die: 'W6' }, slots, conc: 'Fly', cond: { Poisoned: true },
  res: [{ n: 'Arcane Recovery', ic: 'book', max: 1, used: 0, rest: 'long', p: 'Plätze bis Gesamtgrad 3 zurück' }],
  spells: [
    { n: 'Fire Bolt', ic: 'flame', lvl: 0, time: '1 Aktion', range: '36 m', dur: 'Sofort', eff: 'Fernkampf-Zauberangriff, 1W10 Feuer.', conc: false, ritual: false, school: 'Hervorrufung', cls: 'SW', src: 'sum' },
    { n: 'Magic Missile', ic: 'star', lvl: 1, time: '1 Aktion', range: '36 m', dur: 'Sofort', eff: '3 Geschosse, je 1W4+1 Kraft.', conc: false, ritual: false, school: 'Hervorrufung', cls: 'SW', src: 'sum' },
    { n: 'Fly', ic: 'wing', lvl: 3, time: '1 Aktion', range: 'Berührung', dur: 'Konz. 10 Min', eff: 'Flugtempo 18 m.', conc: true, ritual: false, school: 'Verwandlung', cls: 'SKW', src: 'sum' },
  ],
  feats: [{ n: 'Arcane Recovery', p: 'Einmal pro Tag bei einer kurzen Rast Plätze zurückholen.', lvl: 1, src: 'Klasse' }],
  bag, eq: { main: it('e1', 'Kampfstab', 'wand', 'Einfach · 1W6 Wucht · Vielseitig (1W8) · 2 SM', { slot: 'hand' }) },
  gold: { pp: 1, gp: 47, ep: 0, sp: 12, cp: 3 }, tab: 'main',
};

const langs = (process.env.LANGS || '').split(',').filter(Boolean);
const browser = await chromium.launch();
for (const [vw, w, h] of [['desktop', 1280, 900], ['handy', 390, 844]]) {
  for (const scheme of ['light', 'dark']) {
    for (const lang of langs.length ? langs : ['']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
      const page = await ctx.newPage();
      await page.goto(url);
      await page.evaluate(([s, l]) => { localStorage.setItem('charbogen-v4', JSON.stringify(s)); if (l) localStorage.setItem('charbogen-lang', l); }, [demo, lang]);
      for (const t of tabs) {
        await page.evaluate(x => { const s = JSON.parse(localStorage.getItem('charbogen-v4')); s.tab = x; localStorage.setItem('charbogen-v4', JSON.stringify(s)); }, t);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(out, `${t}-${vw}-${scheme}${lang ? '-' + lang : ''}.png`), fullPage: vw === 'handy' ? false : false });
      }
      await ctx.close();
    }
  }
}
await browser.close();
console.log('Screenshots in', out);
