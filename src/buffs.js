// Zauber auf Mitspieler (Regeln 2024): Wer wirkt, trägt die Wirkung in S.buffsOut ein und teilt sie über die Presence.
// Das Ziel übernimmt sie in S.buffs und entfernt sie wieder, sobald der Wirker sie nicht mehr meldet
// (Konzentration beendet, lange Rast). Ist der Wirker nicht verbunden, bleibt die Wirkung stehen und lässt sich von Hand entfernen.
import { S } from './state.js';
import { uid } from './util.js';
import { spellStats } from './tables.js';
import { t } from './i18n/index.js';

/** Feste Werte. base = Grad des Zaubers, max = Ziele auf diesem Grad, up = weitere Ziele je höherem Grad. */
export const BUFFS = {
  'Shield of Faith': { base: 1, max: 1, ac: 2, good: true, conc: true },
  Bless: { base: 1, max: 3, up: 1, d4: 1, good: true, conc: true },
  Bane: { base: 1, max: 3, up: 1, d4: -1, good: false, conc: true },
  Haste: { base: 3, max: 1, ac: 2, haste: true, good: true, conc: true },
  Aid: { base: 2, max: 3, aid: true, good: true, conc: false },
  Heroism: { base: 1, max: 1, up: 1, hero: true, good: true, conc: true },
  'Protection from Evil and Good': { base: 1, max: 1, good: true, conc: true },
};
export const isBuff = n => !!BUFFS[n];
export const maxTargets = (n, lvl) => { const b = BUFFS[n]; return b ? b.max + (b.up || 0) * Math.max(0, lvl - b.base) : 0; };
/** Wert, den das Ziel braucht: Aid = TP, Heroism = Zaubermodifikator des Wirkers. */
function valueFor(n, lvl) {
  if (n === 'Aid') return 5 * Math.max(1, lvl - 1);
  if (n === 'Heroism') { const st = spellStats()[0]; return st ? Math.max(0, st.atk - S.prof) : 0; }
  return 0;
}
const arr = k => { if (!Array.isArray(S[k])) S[k] = []; return S[k]; };

/** Nach dem Wirken: Ziele (Schlüssel der Spieler, eigener Schlüssel = S.id) eintragen. */
export function castOn(n, lvl, to) {
  if (!BUFFS[n] || !to.length) return;
  const out = arr('buffsOut').filter(b => b.s !== n); // derselbe Zauber neu gewirkt ersetzt den alten
  out.push({ id: uid(), s: n, lvl, to: to.slice(0, maxTargets(n, lvl)), v: valueFor(n, lvl) });
  S.buffsOut = out;
}
/** Was der Wirker gerade aussendet: Konzentrationszauber nur, solange die Konzentration hält. */
export const activeOut = () => arr('buffsOut').filter(b => BUFFS[b.s] && (!BUFFS[b.s].conc || S.conc === b.s));

function apply(x) { if (BUFFS[x.s]?.aid && x.v) { S.hpMax += x.v; S.hp += x.v; } }
function revert(x) { if (BUFFS[x.s]?.aid && x.v) { S.hpMax = Math.max(1, S.hpMax - x.v); S.hp = Math.min(S.hp, S.hpMax); } }

/** Abgleich mit den verbundenen Spielern. Liefert true, wenn sich am Bogen etwas geändert hat. */
export function syncBuffs(peers = []) {
  const me = S.id, mine = arr('buffs'), gone = new Set(arr('buffsGone'));
  S.buffsOut = activeOut();
  const self = { key: me, name: S.name, buffs: S.buffsOut, self: true };
  const sources = [self, ...peers.filter(p => p.role === 'player' && p.key !== me)];
  const forMe = (src, id) => (src.buffs || []).some(b => b.id === id && (b.to || []).includes(me));
  let changed = false;
  sources.forEach(src => (src.buffs || []).forEach(b => {
    if (!BUFFS[b.s] || !(b.to || []).includes(me) || gone.has(b.id) || mine.some(x => x.id === b.id)) return;
    // Gleicher Zauber von jemand anderem: der neue ersetzt den alten (Wirkungen desselben Zaubers addieren sich nicht)
    const old = mine.find(x => x.s === b.s);
    if (old) { revert(old); mine.splice(mine.indexOf(old), 1); }
    const x = { id: b.id, s: b.s, by: src.self ? '' : src.name, byKey: src.key, v: +b.v || 0 };
    apply(x); mine.push(x); changed = true;
  }));
  S.buffs = mine.filter(x => {
    const src = x.byKey === me ? self : peers.find(p => p.key === x.byKey);
    if (!src || forMe(src, x.id)) return true; // Wirker nicht verbunden: stehen lassen
    revert(x); changed = true; return false;
  });
  return changed;
}
/** Ziel entfernt eine Wirkung von Hand (z. B. Wirker offline). */
export function dropBuff(id) {
  const x = arr('buffs').find(b => b.id === id);
  if (!x) return;
  revert(x);
  S.buffs = S.buffs.filter(b => b !== x);
  S.buffsGone = [...arr('buffsGone'), id].slice(-50);
  if (x.byKey === S.id) S.buffsOut = arr('buffsOut').map(b => (b.id === id ? { ...b, to: b.to.filter(k => k !== S.id) } : b)).filter(b => b.to.length);
}
/** Lange Rast: Wirkungen ohne Konzentration (Aid) enden beim Ziel und beim Wirker. */
export function restBuffs() {
  arr('buffs').filter(x => !BUFFS[x.s]?.conc).forEach(x => { revert(x); S.buffsGone = [...arr('buffsGone'), x.id].slice(-50); });
  S.buffs = arr('buffs').filter(x => BUFFS[x.s]?.conc);
  S.buffsOut = arr('buffsOut').filter(b => BUFFS[b.s]?.conc);
}

/** Herkunft für Tooltips: „Shield of Faith von Mira, +2“. */
export const origin = (x, extra = '') => (x.by ? t('buff.from', { s: x.s, n: x.by }) : x.s) + (extra ? ', ' + extra : '');
export const myBuffs = () => arr('buffs').filter(x => BUFFS[x.s]);
/** RK-Bonus aus Wirkungen (je Zauber einmal). */
export function acBonus() {
  const list = myBuffs().filter(x => BUFFS[x.s].ac);
  return { v: list.reduce((a, x) => a + BUFFS[x.s].ac, 0), why: list.map(x => origin(x, '+' + BUFFS[x.s].ac)).join('; ') };
}
export const acNow = () => S.ac + acBonus().v;
export const hasted = () => myBuffs().some(x => BUFFS[x.s].haste);
/** Kurzbeschreibung der Wirkung für „Wirkt gerade“. */
export function buffText(x) {
  const b = BUFFS[x.s];
  if (b.d4) return t(b.d4 > 0 ? 'buff.bless' : 'buff.bane');
  if (b.haste) return t('buff.haste');
  if (b.aid) return t('buff.aid', { n: x.v });
  if (b.hero) return t('buff.hero', { n: x.v || '?' });
  if (x.s === 'Protection from Evil and Good') return t('buff.pfeg');
  if (b.ac) return t('buff.ac', { n: b.ac });
  return '';
}
/** Für die Presence: was auf mir liegt (Gruppenansicht, Kampf-Tracker). */
export const fxOut = () => myBuffs().slice(0, 6).map(x => ({ s: x.s, by: x.by || S.name, good: BUFFS[x.s].good }));
