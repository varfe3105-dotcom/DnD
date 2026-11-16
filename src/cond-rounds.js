// Zustände mit Dauer in Runden: S.condR = { Frightened: 3 }. Ohne Eintrag gilt der Zustand ohne feste Dauer.
// Mit Live-Tisch zählt der Bogen herunter, sobald die Spielleitung eine neue Runde beginnt (S.condAt = zuletzt gesehene Runde).
import { S } from './state.js';

const obj = () => { if (!S.condR || typeof S.condR !== 'object' || Array.isArray(S.condR)) S.condR = {}; return S.condR; };
export const roundsOf = c => (S.cond[c] && +obj()[c]) || 0;
/** Zustand endet: aus beiden Listen entfernen. */
export function endCond(c) { delete S.cond[c]; delete obj()[c]; }
/** Runden ändern (d = +1/−1). Liefert den Namen, wenn der Zustand dadurch endet. */
export function stepRounds(c, d) {
  if (!S.cond[c]) return '';
  const R = obj();
  if (d < 0 && !R[c]) return '';
  const n = (+R[c] || 0) + d;
  if (n <= 0) { endCond(c); return c; }
  R[c] = Math.min(99, n);
  return '';
}
export function setRounds(c, n) { const R = obj(); if (n > 0) R[c] = Math.min(99, n); else delete R[c]; }
/** Runde der Spielleitung gesehen. Liefert die Zustände, die dabei geendet haben. */
export function seeRound(r) {
  if (!r) return [];
  const last = +S.condAt || 0;
  S.condAt = r;
  if (!last || r <= last) return []; // erster Blick, neuer Kampf oder gleiche Runde
  const gone = [];
  Object.keys(obj()).forEach(c => {
    if (!S.cond[c]) { delete S.condR[c]; return; }
    for (let i = 0; i < r - last && S.cond[c]; i++) { const g = stepRounds(c, -1); if (g) gone.push(g); }
  });
  return gone;
}
/** Für die Presence: { Frightened: 3 }. */
export const condRoundsOut = () => Object.fromEntries(Object.entries(obj()).filter(([c, n]) => S.cond[c] && n > 0).slice(0, 8));
