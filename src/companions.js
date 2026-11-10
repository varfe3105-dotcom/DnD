// Ladungen magischer Gegenstände und Begleiter (Tiergefährte, Vertrauter).
import { S } from './state.js';
import { uid, clamp } from './util.js';
import { BYN } from './catalog.js';
import { classLevels } from './tables.js';
import { get, refs } from './helpers.js';

/** Ladungen eines Gegenstands: eigene Angaben gehen vor, sonst der Katalog. */
export function chargeOf(raw) {
  if (!raw) return null;
  const c = raw.ref ? BYN[raw.ref]?.ch : null;
  const max = raw.chMax != null ? raw.chMax : (c?.max || 0);
  if (!max) return null;
  return { max, used: clamp(raw.chUsed || 0, 0, max), regain: raw.chRe != null ? raw.chRe : (c?.regain || '') };
}
export const chargeRefs = () => refs().filter(r => chargeOf(get(r)));

/** Wertet die Morgengrauen-Eingaben aus. Leere Felder bleiben unverändert. */
export function applyDawn(entries) {
  let n = 0;
  entries.forEach(([r, value]) => {
    const it = get(r), c = chargeOf(it), back = Math.floor(+value) || 0;
    if (c && back > 0) { it.chUsed = clamp(c.used - back, 0, c.max); n++; }
  });
  return n;
}

export const petFrom = m => ({ id: uid(), n: m.n, mon: m.id, ac: m.ac, hp: m.hp, hpMax: m.hp, speed: m.speed || '', text: m.text || '', source: m.source || 'srd', bm: /beast/i.test(S.sub || '') });
export const petOwn = (n, ac, hp, speed, text) => ({ id: uid(), n, ac: Math.max(0, Math.floor(+ac) || 10), hp: Math.max(1, Math.floor(+hp) || 1), hpMax: Math.max(1, Math.floor(+hp) || 1), speed, text, source: 'own', bm: false });

const ATTACK = /^([^.\n]+)\.\s+(?:Melee or Ranged|Melee|Ranged)\s+(?:Weapon\s+|Spell\s+)?Attack:\s*\+(\d+)\s+to hit.*?Hit:\s*(?:\d+\s+\(([^)]+)\)|(\d+))\s+([a-z]+)\s+damage/i;
function addFlat(expr, b) {
  const m = String(expr).replace(/\s+/g, '').match(/^(\d+d\d+)([+-]\d+)?$/i);
  if (!m) return String(+expr + b);
  const total = (+m[2] || 0) + b;
  return m[1] + (total ? (total > 0 ? '+' : '') + total : '');
}
function petAttacks(text, b) {
  return String(text || '').split('\n').map(l => l.match(ATTACK)).filter(Boolean).map(m => ({ n: m[1].trim(), hit: +m[2] + b, dmg: addFlat(m[3] || m[4], b), type: m[5].toLowerCase() }));
}

/** Werte eines Begleiters im Spiel. Beast Master: Übungsbonus auf RK und Angriffe, TP mindestens 4 × Ranger-Stufe. */
export function petView(p) {
  const b = p.bm ? S.prof : 0;
  const ranger = classLevels().find(c => c.k === 'Ranger')?.lvl || 0;
  const hpMax = p.bm ? Math.max(p.hpMax, 4 * ranger) : p.hpMax;
  return { ...p, ac: p.ac + b, hpMax, hp: clamp(p.hp, 0, hpMax), attacks: petAttacks(p.text, b) };
}
