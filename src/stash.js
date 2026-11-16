// Gruppenkasse im Live-Raum. Die Spielleitung führt sie (D.stash) und teilt sie über ihre Presence.
// Spieler zahlen ein (Nachricht stash mit Kennung dep); der Gegenstand verlässt sofort den Bogen und steht in S.stashPend,
// bis die Spielleitung die Kennung in got meldet. Bis dahin wird erneut gesendet und man kann zurücknehmen.
import { D } from './dm.js';
import { S, mk, putBag } from './state.js';
import { BYN } from './catalog.js';
import { uid } from './util.js';

export const COINK = ['pp', 'gp', 'ep', 'sp', 'cp'];
const KINDS = ['item', 'potion', 'magic'];
const RESEND = 4000;

/* ---- Spielleitung ---- */
export function stash() {
  const s = D.stash && typeof D.stash === 'object' ? D.stash : {};
  D.stash = { gold: { ...Object.fromEntries(COINK.map(k => [k, 0])), ...(s.gold || {}) }, items: Array.isArray(s.items) ? s.items : [], got: Array.isArray(s.got) ? s.got : [], wants: s.wants && typeof s.wants === 'object' ? s.wants : {} };
  return D.stash;
}
export const itemName = x => (x.key && BYN[x.key] ? BYN[x.key].n : x.n);
/** Einzahlung (von einem Spieler oder von der Spielleitung selbst). Liefert false bei Doppelten. */
export function stashPut(m, by = '') {
  const s = stash();
  if (m.dep && s.got.includes(m.dep)) return false;
  if (m.coins) COINK.forEach(k => { s.gold[k] = (+s.gold[k] || 0) + (+m.coins[k] || 0); });
  else {
    const same = s.items.find(x => (m.key ? x.key === m.key : !x.key && x.n === m.n && x.p === (m.p || '')));
    if (same) same.q += m.q || 1;
    else s.items.push({ id: uid(), ...(m.key ? { key: m.key } : { n: m.n, p: m.p || '' }), q: m.q || 1, by });
  }
  if (m.dep) s.got = [...s.got, m.dep].slice(-40);
  return true;
}
/** Nimmt ein Stück (oder alles) heraus und liefert die Nachricht für den Empfänger. */
export function stashTake(id, all = false) {
  const s = stash(), x = s.items.find(i => i.id === id);
  if (!x) return null;
  const q = all ? x.q : 1;
  x.q -= q;
  if (x.q <= 0) { s.items = s.items.filter(i => i !== x); delete s.wants[id]; }
  return x.key ? { type: 'item', key: x.key, q } : { type: 'item', n: x.n, p: x.p, q };
}
export function stashDrop(id) { const s = stash(); s.items = s.items.filter(i => i.id !== id); delete s.wants[id]; }
export function want(iid, name) { const s = stash(); if (!s.items.some(i => i.id === iid)) return; const w = s.wants[iid] || []; if (!w.includes(name)) s.wants[iid] = [...w, name].slice(-6); }
/** Gerecht aufteilen: jeder bekommt den gleichen Anteil je Münzart, der Rest bleibt in der Kasse. */
export function splitCoins(n) {
  const s = stash(), each = {};
  if (n < 1) return null;
  COINK.forEach(k => { each[k] = Math.floor((+s.gold[k] || 0) / n); s.gold[k] -= each[k] * n; });
  return COINK.some(k => each[k]) ? each : null;
}
export function takeCoins(coins) { const s = stash(); COINK.forEach(k => { s.gold[k] = Math.max(0, (+s.gold[k] || 0) - (+coins[k] || 0)); }); }
/** Für die Presence der Spielleitung. */
export const stashOut = () => { const s = stash(); if (!s.items.length && !s.got.length && !COINK.some(k => s.gold[k])) return null; return { g: s.gold, it: s.items.slice(0, 40).map(x => ({ id: x.id, n: itemName(x), q: x.q, w: (s.wants[x.id] || []).length })), got: s.got.slice(-30) }; };

/* ---- Spieler ---- */
const pend = () => { if (!Array.isArray(S.stashPend)) S.stashPend = []; return S.stashPend; };
export const pending = () => pend();
/** Ein Stück aus dem Rucksack einzahlen. Liefert die Nachricht oder null. */
export function depositItem(bagIdx) {
  const it = S.bag[bagIdx];
  if (!it) return null;
  const c = it.ref && BYN[it.ref];
  const m = { dep: uid(), q: 1, ...(c && KINDS.includes(c.k) ? { key: c.key } : { n: it.n, p: it.p || '' }), at: 0, back: { ...it, q: 1 } };
  if (it.q > 1) it.q--; else S.bag[bagIdx] = null;
  pend().push(m);
  return m;
}
export function depositCoins(coins) {
  const ok = COINK.some(k => coins[k] > 0) && COINK.every(k => (+S.gold[k] || 0) >= (coins[k] || 0));
  if (!ok) return null;
  COINK.forEach(k => { S.gold[k] -= coins[k] || 0; });
  const m = { dep: uid(), coins, at: 0 };
  pend().push(m);
  return m;
}
/** Zurücknehmen, solange die Spielleitung die Einzahlung nicht bestätigt hat. */
export function cancelDeposit(dep) {
  const m = pend().find(x => x.dep === dep);
  if (!m) return;
  if (m.coins) COINK.forEach(k => { S.gold[k] = (+S.gold[k] || 0) + (m.coins[k] || 0); });
  else putBag(S, mk({ ...m.back, key: m.back.ref }, 1));
  S.stashPend = pend().filter(x => x !== m);
}
export const msgOf = m => ({ type: 'stash', to: 'dm', dep: m.dep, ...(m.coins ? { coins: m.coins } : m.key ? { key: m.key, q: m.q } : { n: m.n, p: m.p, q: m.q }) });
/** Abgleich mit der Presence der Spielleitung: bestätigte entfernen, offene erneut senden. Liefert true bei Änderung. */
export function syncDeposits(dmStash, send) {
  const list = pend();
  if (!list.length) return false;
  const got = new Set(dmStash?.got || []), before = list.length, now = Date.now();
  S.stashPend = list.filter(m => !got.has(m.dep));
  if (dmStash) S.stashPend.forEach(m => { if (now - (m.at || 0) > RESEND && send(msgOf(m))) m.at = now; });
  return S.stashPend.length !== before;
}
