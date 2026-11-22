// Live-Tisch: Supabase Realtime Presence reicht TP und Zustände nur durch, gespeichert wird dort nichts.
// Verbindet erst, wenn jemand einem Raum beitritt. Der Publishable Key ist laut Supabase für Clients gedacht.
import { ICN } from './icons.js';
import { SLOTK } from './constants.js';
const ICON_KEYS = new Set(Object.keys(ICN)), SLOT_KEYS = SLOTK;
import { RealtimeClient } from '@supabase/realtime-js';
import { uid } from './util.js';
import { S, hooks } from './state.js';
import { COND, BYN } from './catalog.js';
import { acNow, acBonus, fxOut, activeOut, BUFFS } from './buffs.js';
import { playerName } from './player.js';
import { condRoundsOut } from './cond-rounds.js';
import { seal, unseal, hpLevel, dmKeys, supported } from './secure.js';
import { claimRoom, roomKey } from './cloud.js';

export const SUPA = 'https://ovkxoqgqocspwjvxhige.supabase.co';
const WS = SUPA.replace('https', 'wss') + '/realtime/v1';
export const API_KEY = 'sb_publishable__g6JJhXOVsiXLvgvqYiK0w_cE4tmXTn';
const LS = 'charbogen-live';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const L = { status: 'off', code: '', role: '', peers: [], inbox: [], handouts: [] };
/** D3 – Absicherung im Live-Tisch. mode: 'off' (Datenbank ohne D3: bisheriges Verhalten), 'wait' (Spieler: noch kein
 * Schlüssel der Spielleitung – genaue Werte gehen gar nicht hinaus), 'on' (abgesichert), 'foreign' (Spielleitung: Raum
 * gehört einer anderen Spielleitung). */
export const SEC = { mode: 'off', key: null, box: null, plain: '', busy: false, tried: 0, cache: new Map() };
export const isCode = c => /^[A-HJ-NP-Z2-9]{6}$/.test(c);
export const players = () => L.peers.filter(p => p.role === 'player');
export const dmOnline = () => L.peers.some(p => p.role === 'dm');

let transport = null, listener = () => {}, peerHook = () => {}, ackHook = () => {}, lastSent = '', timer = null, myKey = '';
export const setAckHook = fn => { ackHook = fn; };
export const setLiveListener = fn => { listener = fn; };
export const setPeerHook = fn => { peerHook = fn; };
let joinHook = () => {}, endTurnHook = () => {}, turnHook = () => {}, lastTurn = '';
/** Spielleitung: ein Spieler hat „Zug beenden“ gedrückt. */
export const setEndTurnHook = fn => { endTurnHook = fn; };
let dmMsgHook = () => {};
/** Spielleitung: Einzahlung in die Gruppenkasse oder Wunsch eines Spielers. */
export const setDmMsgHook = fn => { dmMsgHook = fn; };
/** Spieler: Gruppenkasse aus der Presence der Spielleitung. */
/** Was die Spielleitung über die geöffnete Kampagne teilt: Name, Beschreibung, aktueller Ort (nur der Titel). */
export const dmCamp = () => L.peers.find(p => p.role === 'dm' && p.camp)?.camp || null;
export const dmAtlas = () => { const d = L.peers.find(p => p.role === 'dm'); return d ? d.atlas || [] : null; };
export const dmShop = () => L.peers.find(p => p.role === 'dm' && p.shop && p.shop.length)?.shop || [];
export const dmChronMark = () => L.peers.find(p => p.role === 'dm')?.chron ?? null;
export const dmHere = () => L.peers.find(p => p.role === 'dm' && p.here)?.here || '';
export const dmStash = () => L.peers.find(p => p.role === 'dm' && p.stash)?.stash || null;
/** Spieler: die Zuganzeige hat sich geändert (mine = jetzt am Zug). */
export const setTurnHook = fn => { turnHook = fn; };
/** Zugstand der Spielleitung, falls sie ihn sendet. */
export const dmTurn = () => L.peers.find(p => p.role === 'dm' && p.turn)?.turn || null;
export const myTurn = () => { const tr = dmTurn(); return !!tr && L.role === 'player' && tr.cur === myKey; };
export function endTurn() { return sendMsg({ type: 'endturn', to: 'dm' }); }
/** Wird nach jedem Betreten und Verlassen eines Raums aufgerufen (Online-Speicherung). */
export const setJoinHook = fn => { joinHook = fn; };

function realtime(code, key, onPeers, onStatus, onMsg) {
  const client = new RealtimeClient(WS, { params: { apikey: API_KEY } });
  const ch = client.channel('charbogen:' + code, { config: { presence: { key } } });
  let last = null, joined = false;
  ch.on('presence', { event: 'sync' }, () => onPeers(Object.entries(ch.presenceState()).map(([k, a]) => ({ ...a[a.length - 1], key: k }))));
  ch.on('broadcast', { event: 'msg' }, ({ payload }) => onMsg(payload));
  ch.subscribe(s => {
    if (s === 'SUBSCRIBED') { joined = true; onStatus('on'); if (last) ch.track(last); }
    else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') { joined = false; onStatus('error'); }
  });
  return { track(p) { last = p; if (joined) ch.track(p); }, send(m) { if (joined) ch.send({ type: 'broadcast', event: 'msg', payload: m }); }, close() { client.removeChannel(ch); client.disconnect(); } };
}

const CONDS = new Set(COND.map(c => c.n));
const int = (v, max = 9999) => Math.max(0, Math.min(max, Math.floor(+v) || 0));
const str = (v, n = 60) => String(v ?? '').slice(0, n);
const HQ = ['ok', 'hurt', 'bad', 'down'], HQ_EST = { ok: 4, hurt: 2, bad: 1, down: 0 };
const b64ok = (v, n) => typeof v === 'string' && v.length <= n && /^[A-Za-z0-9+/=_-]*$/.test(v);
const box = b => (b && typeof b === 'object' && b.e && b64ok(b.e.x, 64) && b64ok(b.e.y, 64) && b64ok(b.iv, 24) && b64ok(b.ct, 4000) ? { e: { x: b.e.x, y: b.e.y }, iv: b.iv, ct: b.ct } : null);
/** Eingehende Daten kommen von anderen Geräten und werden auf die erwarteten Felder begrenzt. Mit D3 kommen TP nur als
 * grobe Stufe (hq); für die Anzeige stehen dann Schätzwerte darin (est: true), bis die Spielleitung entschlüsselt hat. */
function clean(p) {
  const c = clean0(p);
  c.tu = c.role === 'player' && p.tu && typeof p.tu === 'object' ? { a: int(p.tu.a, 9), m: Math.max(1, int(p.tu.m, 9)), b: !!p.tu.b, r: !!p.tu.r } : null;
  const hq = HQ.includes(p.hq) ? p.hq : '';
  if (c.role === 'player' && hq && p.hp === undefined) Object.assign(c, { hq, hp: HQ_EST[hq], hpMax: 4, tmp: 0, est: true, sec: box(p.sec) });
  if (c.role === 'player') c.pets = c.pets.map((x, i) => { const q = p.pets?.[i]?.hq; return HQ.includes(q) && p.pets[i].hp === undefined ? { ...x, hp: HQ_EST[q], hpMax: 4, est: true } : x; });
  return c;
}
function clean0(p) {
  return {
    key: str(p.key, 40), role: p.role === 'dm' ? 'dm' : 'player', name: str(p.name), klass: str(p.klass, 30), level: int(p.level, 20),
    insp: !!p.insp, lock: !!p.lock, hp: int(p.hp), hpMax: int(p.hpMax), tmp: int(p.tmp), ac: int(p.ac, 99), exh: int(p.exh, 6), conc: str(p.conc),
    cond: Array.isArray(p.cond) ? p.cond.filter(c => CONDS.has(c)) : [], cr: p.cr && typeof p.cr === 'object' ? Object.fromEntries(Object.entries(p.cr).filter(([c]) => CONDS.has(c)).map(([c, n]) => [c, int(n, 99)])) : {}, death: { s: int(p.death?.s, 3), f: int(p.death?.f, 3) },
    acB: int(p.acB, 20), fx: Array.isArray(p.fx) ? p.fx.slice(0, 6).filter(x => x && BUFFS[x.s]).map(x => ({ s: x.s, by: str(x.by), good: !!x.good })) : [],
    buffs: Array.isArray(p.buffs) ? p.buffs.slice(0, 8).filter(b => b && BUFFS[b.s]).map(b => ({ id: str(b.id, 40), s: b.s, to: Array.isArray(b.to) ? b.to.slice(0, 6).map(k => str(k, 40)) : [], v: int(b.v, 99) })) : [],
    pets: Array.isArray(p.pets) ? p.pets.slice(0, 3).map(x => ({ id: str(x?.id, 40), n: str(x?.n), hp: int(x?.hp), hpMax: int(x?.hpMax), ac: int(x?.ac, 99), at: Array.isArray(x?.at) ? x.at.slice(0, 3).map(a => ({ n: str(a?.n, 40), hit: Math.max(-5, Math.min(30, Math.floor(+a?.hit) || 0)), dmg: str(a?.dmg, 24).replace(/[^0-9dDwW+\- ]/g, ''), type: str(a?.type, 20) })) : [] })).filter(x => x.id) : [],
    stash: p.role === 'dm' && p.stash && typeof p.stash === 'object' ? { g: Object.fromEntries(COINS.map(k => [k, int(p.stash.g?.[k], 9999999)])), it: Array.isArray(p.stash.it) ? p.stash.it.slice(0, 40).map(x => ({ id: str(x?.id, 40), n: str(x?.n, 80), q: Math.max(1, int(x?.q, 999)), w: int(x?.w, 9) })).filter(x => x.id && x.n) : [], got: Array.isArray(p.stash.got) ? p.stash.got.slice(-40).map(x => str(x, 40)) : [] } : null,
    pl: str(p.pl, 40), race: str(p.race, 30), chron: p.role === 'dm' ? str(p.chron, 16) : '',
    shop: p.role === 'dm' && Array.isArray(p.shop) ? p.shop.slice(0, 4).map(m => ({ id: str(m?.id, 40), n: str(m?.n, 60), it: Array.isArray(m?.it) ? m.it.slice(0, 30).map(w => ({ id: str(w?.id, 40), k: typeof w?.k === 'string' && BYN[w.k] ? w.k : '', n: str(w?.n, 80), cp: int(w?.cp, 99999999), q: int(w?.q, 999) })).filter(w => w.id && w.n) : [] })).filter(m => m.id) : [],
    atlas: p.role === 'dm' && Array.isArray(p.atlas) ? p.atlas.slice(0, 16).map(a => ({ t: str(a?.t, 80), d: str(a?.d, 300), k: ['place', 'npc', 'plot'].includes(a?.k) ? a.k : 'place', h: !!a?.h })).filter(a => a.t) : [],
    camp: p.role === 'dm' && p.camp && typeof p.camp === 'object' ? { n: str(p.camp.n, 80), d: str(p.camp.d, 200), c: str(p.camp.c, 120), p: str(p.camp.p, 600), x: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(p.camp.x || '') ? p.camp.x : '', g: p.camp.g === 'xp' ? 'xp' : p.camp.g === 'ms' ? 'ms' : '' } : null, here: p.role === 'dm' ? str(p.here, 80) : '',
    turn: p.role === 'dm' && p.turn && typeof p.turn === 'object' ? { r: int(p.turn.r, 999), cur: str(p.turn.cur, 40), name: str(p.turn.name), next: str(p.turn.next), enemy: !!p.turn.enemy, nextEnemy: !!p.turn.nextEnemy, cr: str(p.turn.cr, 6), nextCr: str(p.turn.nextCr, 6), order: Array.isArray(p.turn.order) ? p.turn.order.slice(0, 24).map(o => ({ n: str(o?.n, 40), pc: !!o?.pc, k: str(o?.k, 40), s: o?.s === 'down' ? 'down' : '', cr: str(o?.cr, 6), ac: str(o?.ac, 3), c: Array.isArray(o?.c) ? o.c.filter(x => CONDS.has(x)).slice(0, 6) : [], ty: str(o?.ty, 20), cur: !!o?.cur, i: str(o?.i, 4), nx: !!o?.nx })) : [] } : null,
  };
}
const MSG_TYPES = new Set(['dmg', 'heal', 'temp', 'cond', 'handout', 'ack', 'rcv', 'item', 'gold', 'endturn', 'levelup', 'xp', 'insp', 'stash', 'want', 'conc', 'buy']);
// Nachrichten der Spielleitung, die bis zur Empfangsbestätigung erneut gesendet werden
const RELIABLE = new Set(['dmg', 'heal', 'temp', 'cond', 'handout', 'item', 'gold', 'levelup', 'xp', 'insp', 'conc']);
const COINS = ['pp', 'gp', 'ep', 'sp', 'cp'];
const JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
/** Nachrichten kommen von jedem mit dem Raumcode. Werte werden begrenzt, Änderungen am Bogen muss der Spieler annehmen. */
function cleanMsg(m) {
  if (!m || typeof m !== 'object' || !MSG_TYPES.has(m.type)) return null;
  const out = { id: str(m.id, 40), type: m.type, to: str(m.to, 40), from: str(m.from, 40) };
  if (m.type === 'rcv' || m.type === 'ack') out.ref = str(m.ref, 40);
  if (m.pet) out.pet = str(m.pet, 40);
  if (['dmg', 'heal', 'temp'].includes(m.type)) { out.value = int(m.value, 999); if (!out.value) return null; }
  if (m.type === 'xp') { out.value = int(m.value, 1000000); if (!out.value) return null; }
  if (m.type === 'cond') { if (!CONDS.has(m.cond)) return null; out.cond = m.cond; out.off = !!m.off; out.r = int(m.r, 99); }
  if (m.type === 'handout') {
    out.title = str(m.title, 80); out.text = str(m.text, 4000);
    out.img = typeof m.img === 'string' && m.img.length < 300000 && JPEG.test(m.img) ? m.img : '';
    if (!out.title && !out.text && !out.img) return null;
  }
  if (m.type === 'ack') { out.name = str(m.name); out.ok = !!m.ok; }
  if (m.type === 'buy') { out.m = str(m.m, 40); out.i = str(m.i, 40); out.name = str(m.name); if (!out.m || !out.i) return null; }
  if (m.type === 'want') { out.iid = str(m.iid, 40); out.name = str(m.name); if (!out.iid) return null; }
  if (m.type === 'stash') { out.dep = str(m.dep, 40); out.name = str(m.name); if (!out.dep) return null; }
  if (m.type === 'stash' && m.coins) { out.coins = {}; COINS.forEach(k => { out.coins[k] = int(m.coins?.[k], 99999); }); if (!COINS.some(k => out.coins[k])) return null; }
  else if (m.type === 'item' || m.type === 'stash') {
    out.q = Math.max(1, int(m.q, 99));
    if (typeof m.key === 'string' && BYN[m.key] && ['item', 'potion', 'magic'].includes(BYN[m.key].k)) out.key = m.key;
    else { out.n = str(m.n, 80); out.p = str(m.p, 1500); if (!out.n) return null; if (typeof m.ic === 'string' && ICON_KEYS.has(m.ic)) out.ic = m.ic; if (SLOT_KEYS.includes(m.slot)) out.slot = m.slot; out.att = !!m.att; out.cons = !!m.cons; }
  }
  if (m.type === 'gold') { out.coins = {}; COINS.forEach(k => { out.coins[k] = int(m.coins?.[k], 99999); }); if (!COINS.some(k => out.coins[k])) return null; }
  return out;
}
function onMessage(raw) {
  const m = cleanMsg(raw);
  if (!m) return;
  if (L.role === 'dm') {
    if ((m.type === 'ack' || m.type === 'rcv') && m.to === 'dm') settle(m.ref, m.from);
    if (m.type === 'ack' && m.to === 'dm') ackHook(m);
    if (m.type === 'endturn' && m.to === 'dm') endTurnHook(m.from);
    if ((m.type === 'stash' || m.type === 'want' || m.type === 'buy') && m.to === 'dm') dmMsgHook(m);
    return;
  }
  if (m.type === 'endturn' || m.type === 'ack' || m.type === 'rcv' || m.type === 'stash' || m.type === 'want' || m.type === 'buy' || (m.to !== myKey && m.to !== 'all')) return;
  // Empfang immer bestätigen, auch bei Doppelten: dann hört die Spielleitung auf zu senden.
  if (transport && transport.send) transport.send({ id: uid(), from: myKey, type: 'rcv', to: 'dm', ref: m.id });
  if (seen.has(m.id)) return;
  seen.add(m.id);
  const list = m.type === 'handout' ? L.handouts : L.inbox;
  if (list.length >= 20 || list.some(x => x.id === m.id)) return;
  list.push(m);
  keepInbox();
  newMsgHook(m);
  listener(true);
}
export function sendMsg(m) {
  if (!transport || !transport.send) return false;
  if (L.status !== 'on' && !(L.role === 'dm' && RELIABLE.has(m.type))) return false;
  const msg = { id: uid(), from: myKey, ...m };
  if (L.role === 'dm' && RELIABLE.has(m.type)) {
    const wait = m.to === 'all' ? players().map(p => p.key) : [m.to];
    if (wait.length) { outbox.push({ m: msg, wait, at: Date.now(), last: Date.now() }); keepOutbox(); }
  }
  if (L.status === 'on') transport.send(msg);
  return true;
}
/* ---- Zuverlässig zustellen ----
   Die Spielleitung behält jede Nachricht, bis jeder Empfänger sie bestätigt (rcv oder ack), und sendet sie alle paar
   Sekunden und sofort bei Wiederkehr eines Empfängers erneut. Spieler erkennen Doppelte an der Kennung. */
const OUT_LS = 'charbogen-live-out', IN_LS = 'charbogen-live-in', SEEN_MAX = 300;
let generation = 0, outbox = [], seen = new Set(), newMsgHook = () => {}, resendTimer = null, retryTimer = null, hiddenAt = 0, knownPeers = '';
export const setNewMsgHook = fn => { newMsgHook = fn; };
export const pendingCount = () => outbox.reduce((a, o) => a + o.wait.length, 0);
/** Wartet eine Nachricht an diesen Spieler noch auf Bestätigung? */
export const pendingFor = (key, pet = '') => outbox.some(o => o.wait.includes(key) && (o.m.pet || '') === pet);
function keepOutbox() { try { localStorage.setItem(OUT_LS, JSON.stringify({ code: L.code, outbox })); } catch (e) { /* voll oder gesperrt */ } }
function keepInbox() { try { localStorage.setItem(IN_LS, JSON.stringify({ code: L.code, inbox: L.inbox, handouts: L.handouts, seen: [...seen].slice(-SEEN_MAX) })); } catch (e) { /* voll oder gesperrt */ } }
function restoreQueues() {
  try {
    const o = JSON.parse(localStorage.getItem(OUT_LS) || 'null');
    outbox = o && o.code === L.code && Array.isArray(o.outbox) ? o.outbox : [];
    const i = JSON.parse(localStorage.getItem(IN_LS) || 'null');
    if (i && i.code === L.code) { L.inbox = i.inbox || []; L.handouts = i.handouts || []; seen = new Set(i.seen || []); } else seen = new Set();
  } catch (e) { outbox = []; seen = new Set(); }
}
function settle(ref, from) {
  let hit = false;
  outbox.forEach(o => { if (o.m.id === ref && o.wait.includes(from)) { o.wait = o.wait.filter(k => k !== from); hit = true; } });
  if (!hit) return;
  outbox = outbox.filter(o => o.wait.length);
  keepOutbox();
  listener(true);
}
function resend(onlyKeys) {
  if (!transport || !transport.send || L.status !== 'on' || L.role !== 'dm') return;
  const now = Date.now();
  outbox = outbox.filter(o => now - o.at < 30 * 60 * 1000);
  outbox.forEach(o => { if (onlyKeys ? o.wait.some(k => onlyKeys.includes(k)) : now - o.last > 3500) { o.last = now; transport.send(o.m); } });
  keepOutbox();
}
/** Neu verbinden ohne Posteingang und Kennung zu verlieren (nach Abbruch, Sperrbildschirm, Funkloch). */
export function reconnect() {
  if (!L.code || !L.role) return;
  clearTimeout(retryTimer);
  openTransport();
}
function onStatusChange(st) {
  if (st === L.status) return;
  L.status = st;
  clearTimeout(retryTimer);
  if (st === 'error' && L.code) retryTimer = setTimeout(reconnect, 3000);
  if (st === 'on') { lastSent = ''; push(); resend(); }
  listener(true);
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (!L.code) return;
    // Handys schließen die Verbindung im Hintergrund oft stillschweigend: nach einer Pause lieber neu verbinden.
    if (L.status !== 'on' || Date.now() - hiddenAt > 5000) reconnect(); else { lastSent = ''; push(); }
  });
  window.addEventListener('online', () => { if (L.code) reconnect(); });
}
/** Beantwortet einen Vorschlag. Gibt ihn bei Zustimmung zurück, damit er angewendet wird. */
export function answer(id, ok) {
  const i = L.inbox.findIndex(x => x.id === id);
  if (i < 0) return null;
  const [m] = L.inbox.splice(i, 1);
  keepInbox();
  sendMsg({ type: 'ack', to: 'dm', ok, name: S.name, ref: m.id });
  return ok ? m : null;
}
/** Handout schließen: auch aus dem gesicherten Posteingang entfernen. */
export function dropHandout() { L.handouts.shift(); keepInbox(); }

let dmFlags = () => ({});
export const setDmFlags = fn => { dmFlags = fn; };
/** Absprache der Spielleitung: Beute nur über sie. Gilt nur, solange der Spieler verbunden ist. */
export const lootLocked = () => L.role === 'player' && L.status === 'on' && L.peers.some(p => p.role === 'dm' && p.lock);
export const refresh = () => push();
let petSource = () => [];
/** Begleiter (Ranger-Begleiter, Vertrauter …) mit ihren Spielwerten, gesetzt in events.js. */
export const setPetSource = fn => { petSource = fn; };
/** Genaue Werte, die nur die Spielleitung lesen darf. */
/** Zugstand für die Spielleitung: Aktionen verbraucht/gesamt, Bonusaktion und Reaktion verbraucht. Nur solange gezählt wird. */
const turnOut = () => { const T = S.turn; return T && T.on ? { a: Math.min(9, T.a | 0), m: Math.min(9, T.aMax | 0 || 1), b: !!T.b, r: !!T.r } : null; };
const petAtOut = p => (p.attacks || []).slice(0, 3).map(a => ({ n: String(a.n || '').slice(0, 40), hit: Math.max(-5, Math.min(30, Math.floor(+a.hit) || 0)), dmg: String(a.dmg || '').slice(0, 24), type: String(a.type || '').slice(0, 20) }));
const secretPart = () => ({ hp: S.hp, hpMax: S.hpMax, tmp: S.tmp, pets: petSource().slice(0, 3).map(p => ({ id: p.id, hp: p.hp, hpMax: p.hpMax })) });
/** Ohne D3 wie bisher; mit D3 im Klartext nur die grobe Stufe, genau nur verschlüsselt für die Spielleitung. */
const hpOut = () => (SEC.mode === 'off' ? { hp: S.hp, hpMax: S.hpMax, tmp: S.tmp } : { hq: hpLevel(S.hp, S.hpMax), ...(SEC.mode === 'on' && SEC.box ? { sec: SEC.box } : {}) });
const payload = () => (L.role === 'dm' ? { role: 'dm', chron: dmFlags().chron || '', shop: (dmFlags().shop || []).slice(0, 4), atlas: (dmFlags().atlas || []).slice(0, 16), camp: dmFlags().camp || null, here: dmFlags().here || '', lock: !!dmFlags().lock, turn: dmFlags().turn || null, stash: dmFlags().stash || null, buffs: (dmFlags().buffs || []).slice(0, 8) } : { role: 'player', insp: !!S.insp, name: S.name, pl: playerName(), race: S.subrace || S.race, klass: S.klass, level: S.level, ...hpOut(), ...(S.turn?.on ? { tu: turnOut() } : {}), ac: acNow(), acB: acBonus().v, fx: fxOut(), buffs: activeOut().slice(-6).map(b => ({ id: b.id, s: b.s, to: b.to.slice(0, 6), v: b.v || 0 })), exh: S.exh, conc: S.conc, cond: Object.keys(S.cond).filter(c => S.cond[c]), cr: condRoundsOut(), death: S.death, pets: petSource().slice(0, 3).map(p => (SEC.mode === 'off' ? { id: p.id, n: p.n, hp: p.hp, hpMax: p.hpMax, ac: p.ac, at: petAtOut(p) } : { id: p.id, n: p.n, hq: hpLevel(p.hp, p.hpMax), ac: p.ac, at: petAtOut(p) })) });
function push() {
  if (!transport) return;
  // Spieler mit Schlüssel der Spielleitung: genaue Werte neu verschlüsseln, sobald sie sich ändern
  if (L.role === 'player' && SEC.mode === 'on') {
    const pt = JSON.stringify(secretPart());
    if (pt !== SEC.plain && !SEC.busy) { SEC.busy = true; const room = L.code; seal(SEC.key, JSON.parse(pt)).then(box => { SEC.busy = false; if (room !== L.code) return; SEC.box = box; SEC.plain = pt; push(); }); }
  }
  const p = payload(), j = JSON.stringify(p);
  if (j === lastSent) return;
  lastSent = j;
  transport.track(p);
}
hooks.onSave = () => { if (!transport || L.role !== 'player') return; clearTimeout(timer); timer = setTimeout(push, 200); };

const store = () => { try { if (L.code) localStorage.setItem(LS, JSON.stringify({ code: L.code, role: L.role })); else localStorage.removeItem(LS); } catch (e) { /* Datenschutzmodus */ } };

export function connect(code, role) {
  disconnect();
  L.code = code; L.role = role; L.peers = []; L.inbox = []; L.handouts = [];
  // Spieler senden genaue Werte erst, wenn feststeht, ob der Raum abgesichert ist (secInit)
  SEC.mode = role === 'player' ? 'wait' : 'off';
  store();
  // Die Kennung der Spielleitung bleibt pro Raum gleich, damit Neuverbinden keine „neue“ Spielleitung erzeugt.
  myKey = role === 'dm' ? dmKeyFor(code) : S.id;
  restoreQueues();
  openTransport();
  joinHook();
  secInit();
}
function dmKeyFor(code) {
  try { const o = JSON.parse(localStorage.getItem('charbogen-live-dmkey') || 'null'); if (o && o.code === code) return o.key; const key = 'dm-' + uid(); localStorage.setItem('charbogen-live-dmkey', JSON.stringify({ code, key })); return key; } catch (e) { return 'dm-' + uid(); }
}
function openTransport() {
  if (transport) { try { transport.close(); } catch (e) { /* schon zu */ } }
  L.status = 'connecting';
  const factory = window.__liveFake || realtime;
  const gen = ++generation, mine = fn => (...x) => { if (gen === generation) fn(...x); };
  const onList = mine(list => {
    L.peers = list.map(clean);
    if (L.role === 'dm') openBoxes(list, onList);
    peerHook();
    // Wer neu (oder wieder) im Raum ist, bekommt offene Nachrichten sofort.
    const keys = players().map(p => p.key), sig = keys.join(',');
    if (sig !== knownPeers) { const fresh = keys.filter(k => !knownPeers.split(',').includes(k)); knownPeers = sig; if (fresh.length) resend(fresh); }
    const tr = dmTurn(), ts = tr ? JSON.stringify(tr) : '';
    // Spieler: Gruppenansicht und Wirkungen hängen an den Presence-Daten, deshalb immer neu zeichnen
    if (ts !== lastTurn) { lastTurn = ts; if (L.role === 'player') turnHook(myTurn()); listener(true); } else listener(L.role === 'player');
    // Spieler wartet auf den Schlüssel der Spielleitung: erneut fragen, sobald sie im Raum ist
    if (L.role === 'player' && SEC.mode === 'wait' && L.peers.some(x => x.role === 'dm') && Date.now() - SEC.tried > 15000) secInit();
  });
  transport = factory(L.code, myKey, onList, mine(onStatusChange), mine(onMessage));
  lastSent = '';
  push();
  clearInterval(resendTimer);
  if (L.role === 'dm') resendTimer = setInterval(() => resend(), 4000);
  listener(true);
}
/** Spielleitung: verschlüsselte Spielerwerte öffnen (Ergebnis je Chiffrat zwischengespeichert) und einsetzen. */
function openBoxes(list, again) {
  let pending = false;
  L.peers.forEach(p => {
    if (!p.sec) return;
    const v = SEC.cache.get(p.sec.ct);
    if (v === undefined) {
      pending = true; SEC.cache.set(p.sec.ct, null);
      unseal(L.code, p.sec).then(o => { SEC.cache.set(p.sec.ct, o || false); if (SEC.cache.size > 200) SEC.cache.delete(SEC.cache.keys().next().value); again(list); });
      return;
    }
    if (!v) return;
    Object.assign(p, { hp: int(v.hp), hpMax: int(v.hpMax), tmp: int(v.tmp), est: false });
    p.pets = p.pets.map(x => { const y = Array.isArray(v.pets) && v.pets.find(z => z && z.id === x.id); return y ? { ...x, hp: int(y.hp), hpMax: int(y.hpMax), est: false } : x; });
  });
  return pending;
}
/** D3 einrichten: Spielleitung beansprucht den Raum mit ihrem öffentlichen Schlüssel, Spieler holen diesen Schlüssel. */
async function secInit() {
  const room = L.code, role = L.role, before = SEC.mode + '|' + (SEC.key ? SEC.key.x : '');
  if (!room || !supported()) return;
  SEC.tried = Date.now();
  try {
    if (role === 'dm') {
      const k = await dmKeys(room);
      const ok = await claimRoom(room, k.pub);
      if (room !== L.code) return;
      SEC.mode = ok ? 'on' : 'foreign';
    } else {
      const k = await roomKey(room);
      if (room !== L.code) return;
      SEC.key = k && k.x ? k : null; SEC.mode = SEC.key ? 'on' : 'wait'; SEC.plain = '';
    }
  } catch (e) { if (room === L.code && e.setup) SEC.mode = 'off'; }
  // Nur bei geändertem Stand neu senden und neu zeichnen (sonst gingen etwa gerade gewählte Auswahlfelder verloren)
  if (room !== L.code || SEC.mode + '|' + (SEC.key ? SEC.key.x : '') === before) return;
  lastSent = ''; push(); listener(true);
}
export function disconnect() {
  generation++;
  Object.assign(SEC, { mode: 'off', key: null, box: null, plain: '', busy: false, tried: 0 });
  clearTimeout(timer); clearTimeout(retryTimer); clearInterval(resendTimer); knownPeers = '';
  if (transport) { try { transport.close(); } catch (e) { /* bereits getrennt */ } }
  transport = null;
  L.code = ''; L.role = ''; L.status = 'off'; L.peers = []; L.inbox = []; L.handouts = [];
  store();
  joinHook();
}
/** Neuer Raumcode, ohne zu verbinden (Kampagne vorbereiten). */
export function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map(b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}
export function createRoom() {
  connect(makeCode(), 'dm');
}
/** Nach dem Neuladen wieder in den zuletzt genutzten Raum. */
export function resume() {
  try {
    const o = JSON.parse(localStorage.getItem(LS) || 'null');
    if (o && isCode(o.code) && (o.role === 'dm' || o.role === 'player')) connect(o.code, o.role);
  } catch (e) { /* kein gespeicherter Raum */ }
}
