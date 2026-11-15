import { resFor } from './helpers.js';
// Hintergründe 2024: Attributserhöhung (+2/+1 oder +1/+1/+1 auf drei vorgegebene Attribute), Herkunftstalent,
// zwei Fertigkeiten, ein Werkzeug und Ausrüstung A oder 50 GM. Alles wird gemerkt, damit ein Wechsel es zurücknimmt.
import backgrounds from '../data/backgrounds.json';
import { S, U, mk, putBag, save, toast } from './state.js';
import { BYN, OPTIONS, SUBCLASSES, FEATS } from './catalog.js';
import { classLevels } from './tables.js';
import { t, loc } from './i18n/index.js';

export const BACKGROUNDS = backgrounds;
export const bgById = id => backgrounds.find(b => b.id === id);
export const TOOL_CHOICES = {
  artisan: ['alchemists-supplies', 'brewers-supplies', 'calligraphers-supplies', 'carpenters-tools', 'cartographer-tools', 'cobblers-tools', 'cooks-utensils', 'glassblowers-tools', 'jewelers-tools', 'leatherworkers-tools', 'masons-tools', 'painters-supplies', 'potters-tools', 'smiths-tools', 'tinkers-tools', 'weavers-tools', 'woodcarvers-tools'],
  gaming: ['dice', 'dragonchess', 'playing-cards', 'three-dragon-ante'],
  instrument: ['bagpipes', 'drum', 'dulcimer', 'flute', 'horn', 'lute', 'lyre', 'pan-flute', 'shawm', 'viol'],
};
export const LANGUAGES = ['Common', 'Common Sign Language', 'Draconic', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc', 'Abyssal', 'Celestial', 'Deep Speech', 'Druidic', 'Infernal', 'Primordial', 'Sylvan', "Thieves' Cant", 'Undercommon'];

const entry = id => BYN['item:' + id];
export const featByName = n => FEATS.find(f => f.n === n);
/** Name des Herkunftstalents mit Zusatz (z. B. Magic Initiate (Cleric)). */
export const bgFeatName = b => b.feat.n + (b.feat.note ? ` (${b.feat.note})` : '');

/** Nimmt zurück, was der Hintergrund gesetzt hat (Fertigkeiten, Talent, Attributserhöhung). */
export function clearBg() {
  const o = S.bg;
  if (!o) return;
  (o.skills || []).forEach(k => { if (S.skills[k] === 1) delete S.skills[k]; });
  Object.entries(o.asi || {}).forEach(([k, v]) => { S.abil[k] = Math.max(1, S.abil[k] - v); });
  if (o.hp) { S.hpMax = Math.max(1, S.hpMax - o.hp); S.hp = Math.min(S.hp, S.hpMax); }
  S.feats = S.feats.filter(f => !f.bg);
  S.bg = null;
}

function addGear(g, tool) {
  if (g === '$tool') { if (tool && entry(tool)) putBag(S, mk(entry(tool))); return; }
  if (typeof g === 'string') { const c = entry(g); if (c) putBag(S, mk(c)); return; }
  if (g.id) { const c = entry(g.id); if (c) { const it = mk(c, g.q); if (g.n) it.n = loc(g.n); putBag(S, it); } return; }
  putBag(S, mk({ n: loc(g), ic: 'box', p: '' }));
}

/** asi: { str: 2, dex: 1 } – kommt aus dem Dialog. gear: 'A' oder 'B'. */
export function applyBg(b, { asi = {}, tool = '', gear = 'A' } = {}) {
  const old = S.bg && bgById(S.bg.id);
  clearBg();
  const added = [];
  let dup = 0;
  b.skills.forEach(k => { if (S.skills[k]) dup++; else { S.skills[k] = 1; added.push(k); } });
  const toolId = typeof b.tool === 'string' ? b.tool : tool;
  const toolName = toolId && entry(toolId)?.n;
  if (toolName && !S.tools.includes(toolName)) S.tools.push(toolName);
  const got = {};
  Object.entries(asi).forEach(([k, v]) => { const before = S.abil[k]; S.abil[k] = Math.min(20, before + v); got[k] = S.abil[k] - before; });
  if (gear === 'B') S.gold.gp = (+S.gold.gp || 0) + 50;
  else { b.gear.forEach(g => addGear(g, toolId)); S.gold.gp = (+S.gold.gp || 0) + b.gold; }
  const f = featByName(b.feat.n);
  S.feats.push({ n: bgFeatName(b), p: f ? loc(f.text) : '', lvl: 0, src: 'Hintergrund', bg: true, source: f?.source || b.source });
  const hp = b.feat.n === 'Tough' ? 2 * (S.level || 0) : 0;
  if (hp) { S.hpMax += hp; S.hp += hp; }
  S.bg = { id: b.id, skills: added, asi: got, hp };
  const name = loc(b.n);
  if (!S.info.trim() || (old && S.info === loc(old.n))) S.info = name;
  let msg = t('bg.applied', { n: name });
  if (old) msg += ' ' + t('bg.oldKept');
  if (dup) msg += ' ' + t('bg.dupSkills', { n: dup });
  toast(msg);
}

/** Reaktion auf die Auswahl: 2024 braucht immer die Attributswahl, also immer den kleinen Dialog. */
export function pickBg(id) {
  if (!id) { clearBg(); U.BGPICK = null; save(); return; }
  if (S.bg?.id === id) { U.BGPICK = null; return; }
  if (!bgById(id)) return;
  U.BGPICK = id;
}

export function toggleStyle(n) {
  const j = S.feats.findIndex(f => f.n === n);
  if (j >= 0) { S.feats.splice(j, 1); return; }
  const o = OPTIONS.fightingStyles.find(x => x.n === n);
  if (o) S.feats.push({ n, p: loc(o.text), lvl: 0, src: 'Klasse' });
}

/** Trägt die Merkmale der gewählten Unterklasse bis zur aktuellen Stufe ein und nimmt die der vorherigen zurück. */
import { syncAlwaysSpells } from './domain-spells.js';
export function applySubclass(old) {
  const data = SUBCLASSES[S.klass];
  if (!data) return;
  const lvl = classLevels().find(c => c.k === S.klass)?.lvl || 0;
  const oldNames = new Set(Object.values(data[old] || {}).flat().map(f => f.n));
  S.feats = S.feats.filter(f => !(f.src === 'Unterklasse' && oldNames.has(f.n)));
  Object.entries(data[S.sub] || {}).forEach(([l, fs]) => {
    if (+l > lvl) return;
    fs.forEach(f => { if (!S.feats.some(x => x.n === f.n)) S.feats.push({ n: f.n, p: loc(f.text), lvl: +l, src: 'Unterklasse' }); });
  });  // Ressourcen der Unterklasse (z. B. Warding Flare) angleichen: alte entfernen, neue eintragen
  const keep = new Set(resFor(S.klass, lvl, undefined, '').map(r => r.n)), now = resFor(S.klass, lvl, undefined, S.sub);
  const oldSub = new Set(resFor(S.klass, lvl, undefined, old || '').map(r => r.n).filter(n => !keep.has(n)));
  S.res = S.res.filter(r => !oldSub.has(r.n) || now.some(x => x.n === r.n));
  now.forEach(r => { if (!S.res.some(x => x.n === r.n)) S.res.push({ n: r.n, ic: r.ic, max: r.max, used: 0, rest: r.rest, p: r.p }); });
  syncAlwaysSpells();
}
