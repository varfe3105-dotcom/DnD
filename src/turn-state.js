// Aktionen im eigenen Zug (Regeln 2024): eine Aktion, eine Bonusaktion, eine Reaktion pro Runde, Bewegung bis zum Tempo,
// eine freie Interaktion mit einem Gegenstand. S.turn merkt, was verbraucht ist; on = Zählung läuft (Kampf).
import spells from '../data/spells.json';
import { S } from './state.js';
import { classLevels } from './tables.js';
import { featureLevel } from './helpers.js';
import { effects } from './effects.js';

const TIME = Object.fromEntries(spells.map(s => [s.n, s.time.en]));
const blank = () => ({ on: false, a: 0, aMax: 1, b: 0, r: 0, mv: 0, dash: 0, atk: 0, atkMax: 0, obj: 0, slot: false });
export function turn() {
  if (!S.turn || typeof S.turn !== 'object') S.turn = blank();
  return Object.assign(S.turn, { ...blank(), ...S.turn });
}
/** Neuer eigener Zug: alles wieder frei (auch die Reaktion, die 2024 zu Beginn des eigenen Zuges zurückkommt). */
export function newTurn() { S.turn = { ...blank(), on: true }; }
export function endCombat() { S.turn = blank(); }
const start = () => { const T = turn(); T.on = true; return T; };

/** Angriffe pro Angriffsaktion (Extra Attack ab 5, Kämpfer 11 und 20). */
export const attacksPerAction = () => Math.max(1, classLevels().some(c => ['Fighter', 'Barbarian', 'Paladin', 'Ranger', 'Monk'].includes(c.k) && c.lvl >= 5) ? 2 : 1, featureLevel('Fighter') >= 20 ? 4 : featureLevel('Fighter') >= 11 ? 3 : 0);
export const speedMax = () => { const T = turn(); return effects().speed.val * (1 + T.dash); };
export const actionFree = () => turn().a < turn().aMax;

/** Eine Aktion ausführen. Liefert '' oder den Grund, warum es nicht geht. */
export function doAction(k) {
  const T = start();
  if (k === 'attack') return attackOnce();
  if (T.a >= T.aMax) return 'action';
  T.a++;
  if (k === 'dash') T.dash++;
  return '';
}
/** Ein Angriff (auch Stoßen oder Packen): der erste startet die Angriffsaktion. */
export function attackOnce() {
  const T = start();
  if (T.atk < T.atkMax) { T.atk++; return ''; }
  if (T.a >= T.aMax) return T.atkMax ? 'attacks' : 'action';
  T.a++; T.atkMax += attacksPerAction(); T.atk++;
  return '';
}
export function doBonus() { const T = start(); if (T.b) return 'bonus'; T.b = 1; return ''; }
export function doReact() { const T = start(); if (T.r) return 'react'; T.r = 1; return ''; }
export function doObj() { const T = start(); if (T.obj) return T.a < T.aMax ? 'objAction' : 'obj'; T.obj = 1; return ''; }
/** Bewegung in Metern (negativ = zurücknehmen). */
export function moveBy(m) {
  const T = start(), next = Math.round((T.mv + m) * 10) / 10;
  if (next < 0) return '';
  if (next > speedMax() + 0.01) return 'move';
  T.mv = next;
  return '';
}
export function actionSurge() { const T = start(); T.aMax++; }

/** Zeitaufwand eines Zaubers: a = Aktion, b = Bonusaktion, r = Reaktion, '' = länger (Ritual, Minuten). */
export function spellCost(s) {
  const tm = String(TIME[s.n] || s.time || '');
  if (/bonus/i.test(tm)) return 'b';
  if (/reaction|reaktion/i.test(tm)) return 'r';
  if (/^1 (action|aktion)/i.test(tm)) return 'a';
  return '';
}
/** Prüft vor dem Wirken. usesSlot = Zauberplatz nötig. Liefert '' oder den Grund. */
export function spellBlocked(s, usesSlot) {
  const T = turn();
  if (!T.on) return '';
  const c = spellCost(s);
  if (c === 'a' && T.a >= T.aMax) return 'action';
  if (c === 'b' && T.b) return 'bonus';
  if (c === 'r' && T.r) return 'react';
  // 2024: pro Zug nur ein Zauberplatz (Reaktionen zählen hier nicht, sie fallen meist in fremde Züge)
  if (usesSlot && c !== 'r' && T.slot) return 'slotRule';
  return '';
}
export function spellSpend(s, usesSlot) {
  const T = turn();
  if (!T.on) return;
  const c = spellCost(s);
  if (c === 'a') T.a++;
  if (c === 'b') T.b = 1;
  if (c === 'r') T.r = 1;
  if (usesSlot && c !== 'r') T.slot = true;
}
