// Baut aus den JSON-Dateien in data/ den durchsuchbaren Katalog.
import potions from '../data/potions.json';
import items from '../data/items.json';
import magicItems from '../data/magic-items.json';
import spells from '../data/spells.json';
import conditions from '../data/conditions.json';
import exhaustion from '../data/exhaustion.json';
import rules from '../data/rules.json';
import classes from '../data/classes.json';
import races from '../data/races.json';
import tables from '../data/tables.json';
import { CLIC } from './constants.js';
import { fmtM } from './util.js';

export const CLASSES = classes;
export const RACES = races;
export const { FULL, CANT, KNOWN } = tables;
export const COND = conditions.map(c => [c.n, c.de, c.ic, c.p]);
export const EXH = exhaustion.map(e => e.p);
export const RULES = rules.map(r => [r.n, r.ic, r.p]);

export const catOf = (n, p) => /^Einfach/.test(p) ? 'Einfache Waffen' : /^Krieg/.test(p) ? 'Kriegswaffen' : /RK /.test(p) ? 'Rüstungen und Schilde' : /Paket/.test(n) ? 'Ausrüstungspakete' : /^(Werkzeug|Instrument|Spielset)/.test(p) ? 'Werkzeuge und Instrumente' : /Fokus|Symbol|Zauberbuch|Komponenten/.test(n) ? 'Zauberfokusse' : 'Ausrüstung';
export const slotOf = (n, c) => /Waffen$/.test(c) ? 'hand' : n === 'Schild' ? 'off' : c === 'Rüstungen und Schilde' ? 'body' : (c === 'Zauberfokusse' && !/Zauberbuch|beutel/.test(n)) ? 'hand' : '';
export const parseSp = p => { const [m, eff] = p.split(' — '); const [time, range, dur] = m.split(' · '); return { time, range, dur, eff: eff || '', conc: /Konz\./.test(dur || ''), ritual: /Ritual/.test(time || '') }; };

export const CAT = [];
export const BYN = {};
const addCat = e => { e.key = e.k + ':' + e.n; CAT.push(e); BYN[e.key] = e; };

potions.forEach(({ n, ic, p }) => addCat({ k: 'potion', n, ic, p, c: 'Tränke und Verbrauchsgüter', cons: true, slot: '' }));
items.forEach(({ n, ic, p }) => {
  const c = catOf(n, p);
  const qm = n.match(/\((\d+)\)$/);
  addCat({ k: 'item', n, ic, p, c, slot: slotOf(n, c), cons: /^(Tagesration|Fackel|Kerze|Ölflasche)$/.test(n) || /^Munition/.test(p), q: qm ? +qm[1] : 1 });
});
magicItems.forEach(({ n, ic, slot, att, p, cons }) => addCat({ k: 'magic', n, ic, p, c: 'Magische Gegenstände', slot, att, cons, magic: true }));
spells.forEach(({ n, lvl, school, ic, cls, text }) => addCat(Object.assign({ k: 'spell', n, lvl, school, ic, cls, c: lvl ? 'Grad ' + lvl : 'Cantrips' }, parseSp(text))));
COND.forEach(([n, de, ic, p]) => addCat({ k: 'cond', n, de, ic, p, c: 'Zustand' }));
RULES.forEach(([n, ic, p]) => addCat({ k: 'rule', n, ic, p, c: 'Regel' }));
Object.entries(CLASSES).forEach(([n, C]) => addCat({ k: 'class', n, ic: CLIC[n], c: 'Klasse', p: `Trefferwürfel W${C.hd} · Unterklasse ab Stufe ${C.subL}`, hay: Object.values(C.f).flat().map(x => x.join(' ')).join(' ') + ' ' + C.subs.join(' ') }));
Object.entries(RACES).forEach(([n, R]) => addCat({ k: 'race', n, ic: 'mask', c: 'Volk', p: `${R.asi} · Tempo ${fmtM(R.sp)} m`, hay: R.tr.map(x => x.join(' ')).join(' ') + ' ' + Object.keys(R.subs).join(' ') }));
