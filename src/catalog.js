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
import subclasses from '../data/subclasses.json';
import feats from '../data/feats.json';
import options from '../data/options.json';
import backgrounds from '../data/backgrounds.json';
import multiclass from '../data/multiclass.json';
import legacyTexts from '../data/reference/legacy-texts.json';
import Fuse from 'fuse.js';
import { CLIC } from './constants.js';
import { lang, t, loc, deName, dist, dice } from './i18n/index.js';

export const CLASSES = classes;
export const RACES = races;
export const { FULL, CANT, KNOWN } = tables;
export const COND = conditions;
export const EXH = exhaustion;
export const MULTICLASS = multiclass;
export const SUBCLASSES = subclasses;
export const FEATS = feats;
export const OPTIONS = options;

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10 };
/** Liest Ladungen aus dem englischen Regeltext. Würfelt das Buch den Startwert aus, gilt der Höchstwert. */
export function chargeInfo(en) {
  const m = String(en || '').match(/\b(?:has|have|starts with|holds?|contains?|of its)\s+(\d+d\d+(?:\s*[+\-−]\s*\d+)?|\d+|one|two|three|four|five|six|seven|ten)\s+(?:\w+\s+)?charges?\b/i);
  if (!m) return undefined;
  const v = m[1].toLowerCase().replace(/\s+/g, '').replace('−', '-');
  const d = v.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  const max = d ? +d[1] * +d[2] + (+d[3] || 0) : (WORDS[v] || +v);
  const r = String(en).match(/regains?\s+(all|\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(?:of\s+)?(?:its\s+)?(?:expended\s+)?charges?\s+daily\s+at\s+dawn/i);
  return { max, regain: r ? r[1].toLowerCase().replace(/\s+/g, '') : '' };
}

let fuse = null;
/** Unscharfe Namenssuche, z. B. findet „firbal“ Fireball. */
export function fuzzy(q) {
  if (!fuse) fuse = new Fuse(CAT, { keys: ['n', 'de', 'aka'], threshold: 0.34, ignoreLocation: true, minMatchCharLength: 2 });
  return fuse.search(q, { limit: 40 }).map(r => r.item);
}

export const CAT = [];
export const BYN = {};
const addCat = e => { e.key = e.k + ':' + (e.id || e.n); CAT.push(e); BYN[e.key] = e; };
const hayOf = o => [o?.en, o?.de].join(' ');

// Richtpreise für magische Gegenstände nach Seltenheit (DMG, Tabelle „Magic Item Rarity“).
// Der einfache Heiltrank hat im PHB einen festen Preis.
const RARITY_GP = { common: [50, 100], uncommon: [101, 500], rare: [501, 5000], 'very rare': [5001, 50000], legendary: [50001, 0] };
const FIXED_GP = { 'potion-of-healing-common': 50 };
export function priceOf(id, rarEn) {
  const f = n => n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US') + ' ' + t('price.gp');
  if (FIXED_GP[id]) return t('price.phb', { p: f(FIXED_GP[id]) });
  const r = String(rarEn || '').toLowerCase();
  if (r === 'artifact') return t('price.priceless');
  const g = RARITY_GP[r];
  if (!g) return '';
  return t('price.dmg', { p: g[1] ? `${f(g[0])}–${f(g[1])}`.replace(` ${t('price.gp')}–`, '–') : t('price.from', { p: f(g[0]) }) });
}

/** Baut den Katalog in der aktuellen Sprache neu auf (beim Start und beim Umschalten). */
export function buildCatalog() {
  fuse = null;
  CAT.length = 0;
  Object.keys(BYN).forEach(k => delete BYN[k]);
  [...potions, ...items, ...magicItems].forEach(i => addCat({ k: i.k, id: i.id, n: loc(i.n), ic: i.ic, p: loc(i.text), c: i.rarity ? (i.k === 'potion' ? t('cat.potion') : t('cat.magic')) : t('cat.' + i.group), group: i.group, slot: i.slot, att: i.att, cons: i.cons, q: i.q, ac: i.ac, w: i.w, rar: i.rarity?.en, price: i.rarity ? priceOf(i.id, i.rarity.en) : '', magic: !!i.rarity, ch: i.rarity ? chargeInfo(i.text.en) : undefined, rarity: i.rarity ? loc(i.rarity) : '', source: i.source, hay: hayOf(i.n) }));
  spells.forEach(s => addCat({ k: 'spell', cant: s.cant, n: s.n, de: s.de, aka: s.aka, origin: s.origin, lvl: s.lvl, school: s.school, ic: s.ic, cls: s.cls, c: s.lvl ? t('spell.level', { n: s.lvl }) : t('spell.cantrips'), time: loc(s.time), range: loc(s.range), dur: loc(s.dur), comp: s.comp, material: s.material, conc: s.conc, ritual: s.ritual, eff: loc(s.text), higher: s.higher ? loc(s.higher) : '', source: s.source, hay: [s.de, s.aka].join(' ') }));
  COND.forEach(c => addCat({ k: 'cond', n: c.n, de: c.de, ic: c.ic, p: loc(c.text), c: t('cat.cond'), source: c.source }));
  feats.forEach(f => addCat({ k: 'feat', n: f.n, de: f.de, ic: 'star', p: loc(f.text), c: t('cat.feat'), source: f.source, req: f.req, hay: f.de }));
  rules.forEach(r => addCat({ k: 'rule', id: r.n.de, n: loc(r.n), ic: r.ic, p: loc(r.text), c: t('cat.rule'), source: r.source, hay: hayOf(r.n) }));
  Object.entries(CLASSES).forEach(([n, C]) => addCat({ k: 'class', n, de: deName(n), ic: CLIC[n], c: t('cat.class'), p: t('class.summary', { d: dice('W' + C.hd), l: C.subL }), hay: Object.values(C.f).flat().map(x => x.n + ' ' + hayOf(x.text)).join(' ') + ' ' + C.subs.join(' ') + ' ' + Object.values(subclasses[n] || {}).flatMap(s => Object.values(s).flat()).map(x => x.n + ' ' + hayOf(x.text)).join(' ') }));
  Object.entries(RACES).forEach(([n, R]) => addCat({ k: 'race', n, de: deName(n), ic: 'mask', c: t('cat.race'), p: `${loc(R.asi)} · ${t('stat.speed')} ${dist(R.sp)}`, hay: R.tr.map(x => x.n + ' ' + hayOf(x.text)).join(' ') + ' ' + Object.keys(R.subs).join(' ') }));
}
buildCatalog();

// Gegenstände unter jedem bekannten Namen finden, auch alte deutsche Einträge.
const NAME_INDEX = {};
[...potions, ...items, ...magicItems].forEach(i => { [i.n.en, i.n.de].filter(Boolean).forEach(n => { NAME_INDEX[n] = i; }); });
const keyOf = i => i.k + ':' + i.id;

/** Katalogeintrag zu einem Namen, in beiden Sprachen und mit alten Bezeichnungen. */
export const byName = n => { const i = NAME_INDEX[n]; return i ? BYN[keyOf(i)] : undefined; };

/** Ordnet einen gespeicherten Gegenstand dem Katalog zu, wenn Name und Text zu ihm passen. Eigene Einträge bleiben frei. */
export function findRef(n, p) {
  const i = NAME_INDEX[n];
  if (!i) return null;
  return [legacyTexts[n], i.text.en, i.text.de].includes(p) ? keyOf(i) : null;
}

// Zuordnung gespeicherter Merkmalstexte zum Katalog, damit sie der Sprache folgen.
const FEATX = {};
const noteFeat = (n, text) => { [text.en, text.de].forEach(s => { if (s) FEATX[n + '|' + s] = text; }); };
Object.values(CLASSES).forEach(C => Object.values(C.f).flat().forEach(f => noteFeat(f.n, f.text)));
Object.entries(multiclass).forEach(([k, m]) => noteFeat('Multiclass: ' + k, m.prof));
Object.values(subclasses).forEach(c => Object.values(c).forEach(s => Object.values(s).flat().forEach(f => noteFeat(f.n, f.text))));
feats.forEach(f => noteFeat(f.n, f.text));
backgrounds.forEach(b => noteFeat(b.feature.n, b.feature.text));
Object.values(options).flat().forEach(f => noteFeat(f.n, f.text));
export const featText = f => { const m = FEATX[f.n + '|' + f.p]; return m ? loc(m) : f.p; };
export { lang };
