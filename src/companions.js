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
/** Primal Companion des Beast Master (Regeln 2024): Werte hängen an Waldläuferstufe und Weisheit, siehe petView(). */
const PRIMAL = {
  land: { n: 'Beast of the Land', speed: '40 ft., climb 40 ft.', atk: 'Rend', die: '1d8', plus: 2, type: 'slashing', hp: 5, text: { en: 'Charge: if it moves at least 20 feet straight toward a target and then hits it with Rend, the target takes an extra 1d6 Piercing damage, and a Large or smaller target has the Prone condition. Primal Bond: add your Proficiency Bonus to its ability checks and saving throws.', de: 'Sturmangriff: Bewegt es sich mindestens 6 m gerade auf ein Ziel zu und trifft dann mit Rend, erleidet das Ziel zusätzlich 1W6 Stichschaden, und ein höchstens großes Ziel ist Prone. Ursprüngliche Bindung: Dein Übungsbonus gilt für seine Attributs- und Rettungswürfe.' } },
  sea: { n: 'Beast of the Sea', speed: '5 ft., swim 60 ft.', atk: 'Binding Strike', die: '1d6', plus: 2, type: 'piercing', hp: 5, text: { en: 'Amphibious: it can breathe air and water. Binding Strike: Piercing or Bludgeoning (your choice), and the target has the Grappled condition (escape DC = your spell save DC); the beast can grapple only one creature at a time. Primal Bond: add your Proficiency Bonus to its ability checks and saving throws.', de: 'Amphibisch: atmet Luft und Wasser. Binding Strike: Stich- oder Wuchtschaden (deine Wahl), das Ziel ist Grappled (Befreien-SG = dein Zauber-SG); es hält nur eine Kreatur zugleich. Ursprüngliche Bindung: Dein Übungsbonus gilt für seine Attributs- und Rettungswürfe.' } },
  sky: { n: 'Beast of the Sky', speed: '10 ft., fly 60 ft.', atk: 'Shred', die: '1d4', plus: 3, type: 'slashing', hp: 4, text: { en: 'Flyby: it doesn\'t provoke Opportunity Attacks when it flies out of an enemy\'s reach. Primal Bond: add your Proficiency Bonus to its ability checks and saving throws.', de: 'Vorbeiflug: Fliegt es aus der Reichweite eines Feindes, löst das keine Gelegenheitsangriffe aus. Ursprüngliche Bindung: Dein Übungsbonus gilt für seine Attributs- und Rettungswürfe.' } },
};
export const PRIMAL_KINDS = Object.keys(PRIMAL);
export const isPrimalRanger = () => classLevels().some(c => c.k === 'Ranger' && /beast[\s_-]*master|herr der tiere/i.test(c.sub || '') && c.lvl >= 3);
/** Begleiter sicherstellen (vor jedem Zeichnen, idempotent). Liefert true bei Änderung.
 *  1. Kampagnenstand ohne Begleiter, Grundbogen mit Begleitern: einmal übernehmen (Wolf im Grundbogen angelegt).
 *  2. Beast Master ab Stufe 3 ganz ohne Begleiter: einmal automatisch „Beast of the Land“ anlegen (2024 automatisch).
 *     Die Form lässt sich in Bearbeiten wechseln (Land, See, Himmel). */
export function syncPets(libPets) {
  let ch = false;
  if (!Array.isArray(S.pets)) { S.pets = []; ch = true; }
  if (S.camp && !S.pets.length && !S.petsLib && Array.isArray(libPets) && libPets.length) { S.pets = JSON.parse(JSON.stringify(libPets)); S.petsLib = true; ch = true; }
  if (isPrimalRanger() && !S.pets.length && !S.primalAuto) { const p = petPrimal('land'); p.hp = petView(p).hpMax; p.auto = true; S.pets.push(p); S.primalAuto = true; ch = true; }
  return ch;
}
export const petPrimal = kind => { const P = PRIMAL[kind]; return { id: uid(), n: P.n, primal: kind, ac: 13, hp: 999, hpMax: 0, speed: P.speed, text: '', source: 'summary', bm: false }; };
export const primalText = p => PRIMAL[p.primal]?.text || null;
export const petOwn = (n, ac, hp, speed, text) => ({ id: uid(), n, ac: Math.max(0, Math.floor(+ac) || 10), hp: Math.max(1, Math.floor(+hp) || 1), hpMax: Math.max(1, Math.floor(+hp) || 1), speed, text, source: 'own', bm: false });

const ATTACK = /^([^.\n]+)\.\s+(?:Melee or Ranged|Melee|Ranged)\s+(?:Weapon\s+|Spell\s+)?Attack(?: Roll)?:\s*\+(\d+)(?:\s+to hit)?.*?Hit:\s*(?:\d+\s+\(([^)]+)\)|(\d+))\s+([a-z]+)\s+damage/i;
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
  if (p.primal && PRIMAL[p.primal]) {
    const P = PRIMAL[p.primal], ranger = classLevels().find(c => c.k === 'Ranger')?.lvl || 0, w = Math.floor((S.abil.wis - 10) / 2);
    const hpMax = P.hp + P.hp * ranger, plus = P.plus + w;
    return { ...p, ac: 13 + w, hpMax, hp: clamp(p.hp, 0, hpMax), attacks: [{ n: P.atk, hit: S.prof + w, dmg: P.die + (plus ? (plus > 0 ? '+' : '') + plus : ''), type: P.type }] };
  }
  const b = p.bm ? S.prof : 0;
  const ranger = classLevels().find(c => c.k === 'Ranger')?.lvl || 0;
  const hpMax = p.bm ? Math.max(p.hpMax, 4 * ranger) : p.hpMax;
  return { ...p, ac: p.ac + b, hpMax, hp: clamp(p.hp, 0, hpMax), attacks: petAttacks(p.text, b) };
}
