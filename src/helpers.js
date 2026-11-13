import { esc, mod, sg, clamp } from './util.js';
import { S, toast, hooks } from './state.js';
import { CLN, EQ, SK, ABK } from './constants.js';
import { RACES, BYN, CLASSES } from './catalog.js';
import { classLevels } from './tables.js';
import { t, tl, lang, loc, dice, nameLine } from './i18n/index.js';

const clsLvl = k => classLevels().filter(c => c.k === k).reduce((a, c) => a + (c.lvl || 0), 0);
const champ7 = () => classLevels().some(c => c.k === 'Fighter' && c.sub === 'Champion' && c.lvl >= 7);
/** Halber Übungsbonus für ungeübte Attributswürfe: Jack of All Trades (Barde 2, abgerundet), Remarkable Athlete (Champion 7, aufgerundet, nur STR/GES/KON). */
export function halfProf(ab) {
  const jack = clsLvl('Bard') >= 2 ? Math.floor(S.prof / 2) : 0;
  const ath = champ7() && ['str', 'dex', 'con'].includes(ab) ? Math.ceil(S.prof / 2) : 0;
  return Math.max(jack, ath);
}
export const skv = k => { const s = SK.find(x => x[0] === k), p = S.skills[k] || 0; return mod(S.abil[s[1]]) + (p ? S.prof * p : halfProf(s[1])); };
export const hasFeatN = n => S.feats.some(f => f.n === n);
/** Initiative: GES-Modifikator, Alert +5, halber Übungsbonus (Initiative ist ein Geschicklichkeitswurf). */
export const initBonus = () => mod(S.abil.dex) + (hasFeatN('Alert') ? 5 : 0) + halfProf('dex');
export const passivePerception = () => 10 + skv('Perception') + (hasFeatN('Observant') ? 5 : 0);
export const featureLevel = clsLvl;
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
  return c ? { ...it, n: c.n, p: c.p, price: c.price } : it;
}
/** Zauber für die Anzeige, eigene Einträge bleiben unverändert. */
export function spellView(s) {
  const c = s.src !== 'own' && BYN['spell:' + s.n];
  return c ? { ...s, time: c.time, range: c.range, dur: c.dur, eff: c.eff, school: c.school, cls: c.cls || s.cls, comp: c.comp, material: c.material, higher: c.higher, de: c.de, aka: c.aka, source: c.source, cant: c.cant } : s;
}

export { atk } from './attacks.js';
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
  // Goliath: Stone's Endurance nach Volo's Guide (1 pro kurzer Rast) oder Monsters of the Multiverse (Übungsbonus pro langer Rast)
  S.res = S.res.filter(r => r.n !== "Stone's Endurance");
  if (S.race === 'Goliath') { const motm = S.subrace === 'Monsters of the Multiverse'; S.res.push({ n: "Stone's Endurance", ic: 'shield', max: motm ? S.prof : 1, used: 0, rest: motm ? 'long' : 'short', p: t('res.stone', { d: dice('1W12') }) }); }
  toast(t('toast.raceBonus', { b: (sb ? loc(sb.asi) + (R.asi && /^(see|siehe)/.test(loc(R.asi)) ? '' : ', ' + loc(R.asi)) : loc(R.asi)) }));
}
export function resFor(k, l, tongue = lang, sub = classLevels().find(c => c.k === k)?.sub || '') {
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
  // Unterklassen mit eigener Anzahl an Anwendungen (PHB 2014)
  const wis = Math.max(1, mod(S.abil.wis)), I = Math.max(1, mod(S.abil.int));
  const SR = {
    'Light Domain': () => R('Warding Flare', wis, 'long', 'res.sub.flare', 'shield'),
    'Tempest Domain': () => R('Wrath of the Storm', wis, 'long', 'res.sub.wrath', 'bolt'),
    'War Domain': () => R('War Priest', wis, 'long', 'res.sub.warPriest', 'sword'),
    'Oath of the Ancients': () => { if (l >= 15) R('Undying Sentinel', 1, 'long', 'res.sub.undying', 'heart'); if (l >= 20) R('Elder Champion', 1, 'long', 'res.sub.capstone', 'star'); },
    'Oath of Devotion': () => { if (l >= 20) R('Holy Nimbus', 1, 'long', 'res.sub.capstone', 'star'); },
    'Oath of Vengeance': () => { if (l >= 20) R('Avenging Angel', 1, 'long', 'res.sub.capstone', 'star'); },
    'Battle Master': () => { if (l >= 3) R('Superiority Dice', l >= 15 ? 6 : l >= 7 ? 5 : 4, 'short', 'res.sub.superiority', 'dice', { d: d('W' + (l >= 18 ? 12 : l >= 10 ? 10 : 8)) }); },
    'Circle of the Land': () => { if (l >= 2) R('Natural Recovery', 1, 'long', 'res.sub.natural', 'leaf', { n: Math.ceil(l / 2) }); },
    'Way of the Open Hand': () => { if (l >= 6) R('Wholeness of Body', 1, 'long', 'res.sub.wholeness', 'heart', { n: 3 * l }); },
    'Wild Magic': () => R('Tides of Chaos', 1, 'long', 'res.sub.tides', 'swirl'),
    'The Archfey': () => { R('Fey Presence', 1, 'short', 'res.sub.fey', 'star'); if (l >= 6) R('Misty Escape', 1, 'short', 'res.sub.misty', 'cloak'); if (l >= 14) R('Dark Delirium', 1, 'short', 'res.sub.delirium', 'eye'); },
    'The Fiend': () => { if (l >= 6) R("Dark One's Own Luck", 1, 'short', 'res.sub.luck', 'star'); if (l >= 14) R('Hurl Through Hell', 1, 'long', 'res.sub.hurl', 'flame'); },
    'The Great Old One': () => { if (l >= 6) R('Entropic Ward', 1, 'short', 'res.sub.entropic', 'shield'); },
    'School of Divination': () => { if (l >= 2) R('Portent', l >= 14 ? 3 : 2, 'long', 'res.sub.portent', 'eye'); },
    'School of Abjuration': () => { if (l >= 2) R('Arcane Ward', 2 * l + I, 'long', 'res.sub.ward', 'shield'); },
    'School of Conjuration': () => { if (l >= 6) R('Benign Transposition', 1, 'long', 'res.sub.transpose', 'swirl'); },
    'School of Illusion': () => { if (l >= 10) R('Illusory Self', 1, 'short', 'res.sub.illusory', 'eye'); },
  };
  if (SR[sub]) SR[sub]();
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
export const isShield = it => !!it && (it.slot === 'off' && (it.ref && BYN[it.ref]?.ac?.shield || /shield|schild/i.test(it.n)));
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

/** Getragenes Gewicht in Pfund. Gebinde wie Pfeile wiegen anteilig. */
export function carried() {
  return refs().reduce((sum, r) => { const it = get(r), c = it.ref && BYN[it.ref]; return sum + (c?.w != null ? c.w / (c.q || 1) : it.w || 0) * it.q; }, 0);
}
export const carryMax = () => S.abil.str * 15 * (S.race === 'Goliath' ? 2 : 1); // Powerful Build
