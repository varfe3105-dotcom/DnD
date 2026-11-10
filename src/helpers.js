import { esc, mod, sg, clamp } from './util.js';
import { S, toast, hooks } from './state.js';
import { CLN, EQ, SK, ABK } from './constants.js';
import { RACES, BYN, CLASSES } from './catalog.js';
import { classLevels } from './tables.js';
import { t, tl, lang, loc, dice, nameLine } from './i18n/index.js';

export const skv = k => { const s = SK.find(x => x[0] === k); return mod(S.abil[s[1]]) + S.prof * (S.skills[k] || 0); };
export const pips = (max, used, attr) => Array.from({ length: max }, (_, j) => `<button class="pip ${j < max - used ? 'on' : ''}" ${attr} data-j="${j}" aria-label="${j < max - used ? t('pip.use') : t('pip.reset')}"></button>`).join('');
export const fid = p => 'f-' + p.replace(/\./g, '-');
export const numIn = (p, v, l, min = 0, max, step, extra = '') => `<input type="number" class="n" id="${fid(p)}" data-p="${p}" data-t="n" value="${v}" min="${min}"${max != null ? ` max="${max}"` : ''}${step ? ` step="${step}"` : ''} inputmode="decimal" aria-label="${esc(l)}" ${extra}>`;
export const txtIn = (p, v, l, ph, extra = '') => `<input type="text" id="${fid(p)}" data-p="${p}" value="${esc(v)}" aria-label="${esc(l)}"${ph ? ` placeholder="${esc(ph)}"` : ''} ${extra}>`;
export const classOpts = (sel, first) => `<option value="">${first}</option>` + Object.entries(CLN).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${nameLine(v)}</option>`).join('');
export const get = r => { const [a, b] = r.split(':'); return a === 'bag' ? S.bag[+b] || null : S.eq[b] || null; };
export const set = (r, v) => { const [a, b] = r.split(':'); if (a === 'bag') S.bag[+b] = v || null; else if (v) S.eq[b] = v; else delete S.eq[b]; };
export const refs = () => [...EQ.map(e => 'eq:' + e[0]), ...S.bag.map((_, i) => 'bag:' + i)].filter(r => get(r));
export const fits = (it, r) => { if (!it) return false; if (r.startsWith('bag')) return true; const base = r.split(':')[1].replace(/\d$/, ''); const s = it.slot; if (!s) return false; if (s === 'hand') return base === 'main' || base === 'off'; return s === base; };
export const slotLabel = r => r.startsWith('bag') ? t('eq.bag') : t('eq.' + r.split(':')[1]);
export const slotName = s => t('slot.' + (s || 'none'));
export const abName = k => t('ab.' + k);
export const abShort = k => t('abs.' + k);

/** Gegenstand für die Anzeige: Katalogeinträge folgen der Sprache, eigene bleiben, wie sie eingetragen wurden. */
export function itemView(it) {
  const c = it.ref && BYN[it.ref];
  return c ? { ...it, n: c.n, p: c.p } : it;
}
/** Zauber für die Anzeige, eigene Einträge bleiben unverändert. */
export function spellView(s) {
  const c = s.src !== 'own' && BYN['spell:' + s.n];
  return c ? { ...s, time: c.time, range: c.range, dur: c.dur, eff: c.eff, school: c.school, cls: c.cls || s.cls, comp: c.comp, material: c.material, higher: c.higher, de: c.de, aka: c.aka, source: c.source } : s;
}

const DMG = { Hieb: 'slashing', Stich: 'piercing', Wucht: 'bludgeoning', slashing: 'slashing', piercing: 'piercing', bludgeoning: 'bludgeoning' };
export function atk(raw) {
  const it = itemView(raw);
  const m = it.p.match(/(\d+[Wd]\d+|\b1\b) (Hieb|Stich|Wucht|slashing|piercing|bludgeoning)/i);
  if (!m) return null;
  const st = mod(S.abil.str), dx = mod(S.abil.dex);
  const am = /Munition|Ammunition/i.test(it.p) ? dx : /Finesse/i.test(it.p) ? Math.max(st, dx) : st;
  const plus = +((it.n.match(/\+(\d)/) || [])[1] || 0), dm = am + plus;
  const v = it.p.match(/(?:Vielseitig|Versatile) \((\d+[Wd]\d+)\)/i);
  return { hit: sg(am + S.prof + plus), dmg: dice(m[1]) + (dm ? sg(dm) : ''), type: t('dmg.' + (DMG[m[2]] || DMG[m[2].toLowerCase()])), vers: v ? dice(v[1]) + (dm ? sg(dm) : '') : '' };
}
export function raceTraits() {
  const R = RACES[S.race];
  if (!R) return [];
  const sb = R.subs[S.subrace];
  return [...R.tr, ...(sb ? sb.tr : [])].map(f => ({ n: f.n, p: loc(f.text), src: S.subrace || S.race, race: true }));
}
const RACE_RES = { 'Breath Weapon': ['res.breath', 'flame', 'short', 1], 'Relentless Endurance': ['res.relentless', 'heart', 'long', 1] };
export function applyRace() {
  const R = RACES[S.race];
  if (!R) return;
  const sb = R.subs[S.subrace];
  S.speed = (sb && sb.sp) || R.sp;
  const add = (n) => { if (!S.res.some(r => r.n === n)) { const [k, ic, rest, max] = RACE_RES[n]; S.res.push({ n, ic, max, used: 0, rest, p: t(k) }); } };
  if (S.race === 'Dragonborn') add('Breath Weapon');
  if (S.race === 'Half-Orc') add('Relentless Endurance');
  toast(t('toast.raceBonus', { b: (sb ? loc(sb.asi) + ', ' : '') + loc(R.asi) }));
}
export function resFor(k, l, tongue = lang) {
  const o = [], cha = mod(S.abil.cha), R = (n, max, rest, key, ic, params) => o.push({ n, max, rest, p: tl(tongue, key, params), ic });
  const d = s => dice(s, tongue);
  switch (k) {
    case 'Barbarian': R('Rage', l >= 20 ? 99 : l >= 17 ? 6 : l >= 12 ? 5 : l >= 6 ? 4 : l >= 3 ? 3 : 2, 'long', l >= 20 ? 'res.rageUnl' : 'res.rage', 'flame', { n: l >= 16 ? 4 : l >= 9 ? 3 : 2 }); break;
    case 'Bard': R('Bardic Inspiration', Math.max(1, cha), l >= 5 ? 'short' : 'long', 'res.inspiration', 'music', { d: d('W' + (l >= 15 ? 12 : l >= 10 ? 10 : l >= 5 ? 8 : 6)) }); break;
    case 'Cleric': if (l >= 2) R('Channel Divinity', l >= 18 ? 3 : l >= 6 ? 2 : 1, 'short', 'res.channelC', 'star'); break;
    case 'Druid': if (l >= 2) R('Wild Shape', l >= 20 ? 99 : 2, 'short', 'res.wild', 'leaf', { cr: l >= 8 ? '1' : l >= 4 ? '1/2' : '1/4' }); break;
    case 'Fighter': R('Second Wind', 1, 'short', 'res.secondWind', 'heart', { d: d(`1W10+${l}`) }); if (l >= 2) R('Action Surge', l >= 17 ? 2 : 1, 'short', 'res.surge', 'bolt'); if (l >= 9) R('Indomitable', l >= 17 ? 3 : l >= 13 ? 2 : 1, 'long', 'res.indomitable', 'shield'); break;
    case 'Monk': if (l >= 2) R('Ki', l, 'short', 'res.ki', 'swirl', { d: d('W' + (l >= 17 ? 10 : l >= 11 ? 8 : l >= 5 ? 6 : 4)) }); break;
    case 'Paladin': R('Divine Sense', 1 + Math.max(0, cha), 'long', 'res.sense', 'eye'); R('Lay on Hands', 5 * l, 'long', 'res.layOn', 'heart'); if (l >= 3) R('Channel Divinity', 1, 'short', 'res.channelP', 'star'); break;
    case 'Rogue': if (l >= 20) R('Stroke of Luck', 1, 'short', 'res.luck', 'star'); break;
    case 'Sorcerer': if (l >= 2) R('Sorcery Points', l, 'long', 'res.points', 'gem'); break;
    case 'Warlock': if (l >= 11) R('Mystic Arcanum', l >= 17 ? 4 : l >= 15 ? 3 : l >= 13 ? 2 : 1, 'long', 'res.arcanum', 'gem'); if (l >= 20) R('Eldritch Master', 1, 'long', 'res.master', 'eye'); break;
    case 'Wizard': R('Arcane Recovery', 1, 'long', 'res.recovery', 'book', { n: Math.ceil(l / 2) }); break;
  }
  return o;
}
/** Beschreibung einer Fähigkeit in der aktuellen Sprache; von Hand geänderte Texte bleiben. */
export function resText(r) {
  for (const l of ['en', 'de']) {
    for (const c of classLevels()) {
      const a = resFor(c.k, c.lvl, l).find(x => x.n === r.n);
      if (a && a.p === r.p) return resFor(c.k, c.lvl, lang).find(x => x.n === r.n).p;
    }
    const rr = RACE_RES[r.n];
    if (rr && tl(l, rr[0]) === r.p) return t(rr[0]);
  }
  return r.p;
}
export { ABK, clamp, CLASSES };
/** Trefferwürfel als Text, bei Multiclassing nach Art getrennt. */
export function hdText() {
  const list = classLevels().filter(c => c.lvl > 0);
  if (list.length < 2) return dice(S.hd.die);
  const by = {};
  list.forEach(c => { const d = 'W' + CLASSES[c.k].hd; by[d] = (by[d] || 0) + c.lvl; });
  return Object.entries(by).map(([d, n]) => dice(n + d)).join(' + ');
}

/* Rüstungsklasse aus der Ausrüstung */
const numPlus = n => +((String(n).match(/\+(\d)/) || [])[1] || 0);
function armorStats(it) {
  const c = it.ref && BYN[it.ref];
  if (c?.ac) return c.ac;
  const m = String(it.p).match(/\b(?:RK|AC) (\d+)(?: \+ (?:GES|DEX)(?: \(max\.? \+(\d)\))?)?/);
  return m ? { b: +m[1], dex: /\+ (?:GES|DEX)/.test(it.p), max: m[2] ? +m[2] : null, cat: m[2] ? 'Medium' : '' } : null;
}
const isShield = it => !!it && (it.slot === 'off' && (it.ref && BYN[it.ref]?.ac?.shield || /shield|schild/i.test(it.n)));
const shieldBonus = it => (isShield(it) ? 2 + numPlus(it.n) : 0);
const WORN_AC = { 'magic:ring-of-protection': 1, 'magic:cloak-of-protection': 1 };
const hasFeat = (n, src) => S.feats.some(f => f.n === n && (!src || f.src === src));
/** Rüstungsklasse nach Ausrüstung und Klasse. null, wenn eine getragene Rüstung keine erkennbaren Werte hat. */
export function computeAc() {
  const dex = mod(S.abil.dex), body = S.eq.body, off = S.eq.off;
  let ac;
  if (body) {
    const a = armorStats(body);
    if (!a || a.shield) return null;
    const cap = a.max == null ? Infinity : a.max + (a.cat === 'Medium' && hasFeat('Medium Armor Master', 'Talent') ? 1 : 0);
    ac = a.b + (a.dex ? Math.min(dex, cap) : 0) + numPlus(body.n) + (hasFeat('Defense', 'Klasse') ? 1 : 0);
  } else {
    const list = classLevels();
    const opts = [10 + dex];
    if (list.some(c => c.k === 'Barbarian')) opts.push(10 + dex + mod(S.abil.con));
    if (list.some(c => c.k === 'Monk') && !isShield(off)) opts.push(10 + dex + mod(S.abil.wis));
    if (list.some(c => c.k === 'Sorcerer' && c.sub === 'Draconic Bloodline')) opts.push(13 + dex);
    ac = Math.max(...opts);
    if (S.eq.hands?.ref === 'magic:bracers-of-defense' && S.eq.hands.tuned && !isShield(off)) ac += 2;
  }
  ['ring1', 'ring2', 'cloak'].forEach(k => { const it = S.eq[k]; if (it?.tuned) ac += WORN_AC[it.ref] || 0; });
  return ac + shieldBonus(off);
}
export function syncAc() { if (S.acMode === 'auto') { const v = computeAc(); if (v != null) S.ac = v; } }
hooks.beforeSave = syncAc;
