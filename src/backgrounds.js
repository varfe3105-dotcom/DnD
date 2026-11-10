// Hintergründe aus dem PHB: Auswahl trägt Übungen, Ausrüstung, Gold und Merkmal ein.
import backgrounds from '../data/backgrounds.json';
import { S, U, mk, putBag, save, toast } from './state.js';
import { BYN, OPTIONS } from './catalog.js';
import { t, loc } from './i18n/index.js';

export const BACKGROUNDS = backgrounds;
export const bgById = id => backgrounds.find(b => b.id === id);
export const TOOL_CHOICES = {
  artisan: ['alchemists-supplies', 'brewers-supplies', 'calligraphers-supplies', 'carpenters-tools', 'cartographers-tools', 'cobblers-tools', 'cooks-utensils', 'glassblowers-tools', 'jewelers-tools', 'leatherworkers-tools', 'masons-tools', 'painters-supplies', 'potters-tools', 'smiths-tools', 'tinkers-tools', 'weavers-tools', 'woodcarvers-tools'],
  gaming: ['dice-set', 'playing-card-set'],
  instrument: ['bagpipes', 'drum', 'dulcimer', 'flute', 'lute', 'lyre', 'horn', 'pan-flute', 'shawm', 'viol'],
};
export const LANGUAGES = ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc', 'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'];

const entry = id => BYN['item:' + id];
const needsChoice = b => !!(b.choose.lang || b.choose.tool);

/** Nimmt nur zurück, was der Hintergrund selbst gesetzt hat und was nicht weiter ausgebaut wurde. */
export function clearBg() {
  const o = S.bg;
  if (!o) return;
  o.skills.forEach(k => { if (S.skills[k] === 1) delete S.skills[k]; });
  S.feats = S.feats.filter(f => !f.bg);
  S.bg = null;
}

function addGear(g) {
  if (typeof g === 'string') { const c = entry(g); if (c) putBag(S, mk(c)); return; }
  if (g.id) { const c = entry(g.id); if (c) putBag(S, mk(c, g.q)); return; }
  putBag(S, mk({ n: loc(g), ic: 'box', p: '' }));
}

export function applyBg(b, langs = [], tool = '') {
  const old = S.bg && bgById(S.bg.id);
  clearBg();
  const added = [];
  let dup = 0;
  b.skills.forEach(k => { if (S.skills[k]) dup++; else { S.skills[k] = 1; added.push(k); } });
  const addTool = x => { if (x && !S.tools.includes(x)) S.tools.push(x); };
  b.tools.forEach(e => addTool(typeof e === 'string' ? entry(e)?.n : loc(e)));
  if (tool) addTool(entry(tool)?.n);
  langs.filter(Boolean).forEach(l => { if (!S.langs.includes(l)) S.langs.push(l); });
  b.gear.forEach(addGear);
  if (b.gearChosen && tool) addGear(tool);
  S.gold.gp = (+S.gold.gp || 0) + b.gold;
  S.feats.push({ n: b.feature.n, p: loc(b.feature.text), lvl: 0, src: 'Hintergrund', bg: true, source: b.source });
  S.bg = { id: b.id, skills: added };
  const name = loc(b.n);
  if (!S.info.trim() || (old && S.info === loc(old.n))) S.info = name;
  let msg = t('bg.applied', { n: name });
  if (old) msg += ' ' + t('bg.oldKept');
  if (dup) msg += ' ' + t('bg.dupSkills', { n: dup });
  toast(msg);
}

/** Reaktion auf die Auswahl. Wahlmöglichkeiten öffnen den kleinen Dialog. */
export function pickBg(id) {
  if (!id) { clearBg(); U.BGPICK = null; save(); return; }
  if (S.bg?.id === id) { U.BGPICK = null; return; }
  const b = bgById(id);
  if (!b) return;
  if (needsChoice(b)) { U.BGPICK = id; return; }
  U.BGPICK = null;
  applyBg(b);
  save();
}

export function toggleStyle(n) {
  const j = S.feats.findIndex(f => f.n === n);
  if (j >= 0) { S.feats.splice(j, 1); return; }
  const o = OPTIONS.fightingStyles.find(x => x.n === n);
  if (o) S.feats.push({ n, p: loc(o.text), lvl: 0, src: 'Klasse' });
}
