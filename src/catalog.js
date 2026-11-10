// Baut aus den JSON-Dateien in data/ den durchsuchbaren Katalog in der aktuellen Sprache.
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
import { lang, t, loc, deName, dist, dice } from './i18n/index.js';

export const CLASSES = classes;
export const RACES = races;
export const { FULL, CANT, KNOWN } = tables;
export const COND = conditions;
export const EXH = exhaustion;

export const catOf = (n, p) => /^Einfach/.test(p) ? 'simple' : /^Krieg/.test(p) ? 'martial' : /RK /.test(p) ? 'armor' : /Paket/.test(n) ? 'pack' : /^(Werkzeug|Instrument|Spielset)/.test(p) ? 'tool' : /Fokus|Symbol|Zauberbuch|Komponenten/.test(n) ? 'focus' : 'gear';
export const slotOf = (n, c) => (c === 'simple' || c === 'martial') ? 'hand' : n === 'Schild' ? 'off' : c === 'armor' ? 'body' : (c === 'focus' && !/Zauberbuch|beutel/.test(n)) ? 'hand' : '';
export const parseSp = p => { const [m, eff] = p.split(' — '); const [time, range, dur] = m.split(' · '); return { time, range, dur, eff: eff || '', conc: /Konz\./.test(dur || ''), ritual: /Ritual/.test(time || '') }; };

export const CAT = [];
export const BYN = {};
const addCat = e => { e.key = e.k + ':' + (e.id || e.n); CAT.push(e); BYN[e.key] = e; };
const hayOf = o => [o.en, o.de].join(' ');

/** Baut den Katalog in der aktuellen Sprache neu auf (beim Start und beim Umschalten). */
export function buildCatalog() {
  CAT.length = 0;
  Object.keys(BYN).forEach(k => delete BYN[k]);
  potions.forEach(({ n, ic, p }) => addCat({ k: 'potion', n, ic, p, c: t('cat.potion'), cons: true, slot: '' }));
  items.forEach(({ n, ic, p }) => {
    const g = catOf(n, p);
    const qm = n.match(/\((\d+)\)$/);
    addCat({ k: 'item', n, ic, p, c: t('cat.' + g), slot: slotOf(n, g), cons: /^(Tagesration|Fackel|Kerze|Ölflasche)$/.test(n) || /^Munition/.test(p), q: qm ? +qm[1] : 1 });
  });
  magicItems.forEach(({ n, ic, slot, att, p, cons }) => addCat({ k: 'magic', n, ic, p, c: t('cat.magic'), slot, att, cons, magic: true }));
  spells.forEach(({ n, lvl, school, ic, cls, text }) => addCat(Object.assign({ k: 'spell', n, lvl, school, ic, cls, c: lvl ? t('spell.level', { n: lvl }) : t('spell.cantrips') }, parseSp(text))));
  COND.forEach(c => addCat({ k: 'cond', n: c.n, de: c.de, ic: c.ic, p: loc(c.text), c: t('cat.cond'), source: c.source }));
  rules.forEach(r => addCat({ k: 'rule', id: r.n.de, n: loc(r.n), ic: r.ic, p: loc(r.text), c: t('cat.rule'), source: r.source, hay: hayOf(r.n) }));
  Object.entries(CLASSES).forEach(([n, C]) => addCat({ k: 'class', n, de: deName(n), ic: CLIC[n], c: t('cat.class'), p: t('class.summary', { d: dice('W' + C.hd), l: C.subL }), hay: Object.values(C.f).flat().map(x => x.n + ' ' + hayOf(x.text)).join(' ') + ' ' + C.subs.join(' ') }));
  Object.entries(RACES).forEach(([n, R]) => addCat({ k: 'race', n, de: deName(n), ic: 'mask', c: t('cat.race'), p: `${loc(R.asi)} · ${t('stat.speed')} ${dist(R.sp)}`, hay: R.tr.map(x => x.n + ' ' + hayOf(x.text)).join(' ') + ' ' + Object.keys(R.subs).join(' ') }));
}
buildCatalog();

// Zuordnung gespeicherter Merkmalstexte zum Katalog, damit sie der Sprache folgen.
const FEATX = {};
const noteFeat = (n, text) => { [text.en, text.de].forEach(s => { if (s) FEATX[n + '|' + s] = text; }); };
Object.values(CLASSES).forEach(C => Object.values(C.f).flat().forEach(f => noteFeat(f.n, f.text)));
export const featText = f => { const m = FEATX[f.n + '|' + f.p]; return m ? loc(m) : f.p; };
export { lang };
