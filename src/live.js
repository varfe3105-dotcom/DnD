// Live-Tisch: Supabase Realtime Presence reicht TP und Zustände nur durch, gespeichert wird dort nichts.
// Verbindet erst, wenn jemand einem Raum beitritt. Der Publishable Key ist laut Supabase für Clients gedacht.
import { RealtimeClient } from '@supabase/realtime-js';
import { uid } from './util.js';
import { S, hooks } from './state.js';
import { COND, BYN } from './catalog.js';

export const SUPA = 'https://ovkxoqgqocspwjvxhige.supabase.co';
const WS = SUPA.replace('https', 'wss') + '/realtime/v1';
export const API_KEY = 'sb_publishable__g6JJhXOVsiXLvgvqYiK0w_cE4tmXTn';
const LS = 'charbogen-live';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const L = { status: 'off', code: '', role: '', peers: [], inbox: [], handouts: [] };
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
    else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { joined = false; onStatus('error'); }
  });
  return { track(p) { last = p; if (joined) ch.track(p); }, send(m) { if (joined) ch.send({ type: 'broadcast', event: 'msg', payload: m }); }, close() { client.removeChannel(ch); client.disconnect(); } };
}

const CONDS = new Set(COND.map(c => c.n));
const int = (v, max = 9999) => Math.max(0, Math.min(max, Math.floor(+v) || 0));
const str = (v, n = 60) => String(v ?? '').slice(0, n);
/** Eingehende Daten kommen von anderen Geräten und werden auf die erwarteten Felder begrenzt. */
function clean(p) {
  return {
    key: str(p.key, 40), role: p.role === 'dm' ? 'dm' : 'player', name: str(p.name), klass: str(p.klass, 30), level: int(p.level, 20),
    insp: !!p.insp, lock: !!p.lock, hp: int(p.hp), hpMax: int(p.hpMax), tmp: int(p.tmp), ac: int(p.ac, 99), exh: int(p.exh, 6), conc: str(p.conc),
    cond: Array.isArray(p.cond) ? p.cond.filter(c => CONDS.has(c)) : [], death: { s: int(p.death?.s, 3), f: int(p.death?.f, 3) },
    turn: p.role === 'dm' && p.turn && typeof p.turn === 'object' ? { r: int(p.turn.r, 999), cur: str(p.turn.cur, 40), name: str(p.turn.name), next: str(p.turn.next), enemy: !!p.turn.enemy, nextEnemy: !!p.turn.nextEnemy, cr: str(p.turn.cr, 6), nextCr: str(p.turn.nextCr, 6) } : null,
  };
}
const MSG_TYPES = new Set(['dmg', 'heal', 'temp', 'cond', 'handout', 'ack', 'item', 'gold', 'endturn', 'levelup', 'xp']);
const COINS = ['pp', 'gp', 'ep', 'sp', 'cp'];
const JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
/** Nachrichten kommen von jedem mit dem Raumcode. Werte werden begrenzt, Änderungen am Bogen muss der Spieler annehmen. */
function cleanMsg(m) {
  if (!m || typeof m !== 'object' || !MSG_TYPES.has(m.type)) return null;
  const out = { id: str(m.id, 40), type: m.type, to: str(m.to, 40), from: str(m.from, 40) };
  if (['dmg', 'heal', 'temp'].includes(m.type)) { out.value = int(m.value, 999); if (!out.value) return null; }
  if (m.type === 'xp') { out.value = int(m.value, 1000000); if (!out.value) return null; }
  if (m.type === 'cond') { if (!CONDS.has(m.cond)) return null; out.cond = m.cond; }
  if (m.type === 'handout') {
    out.title = str(m.title, 80); out.text = str(m.text, 4000);
    out.img = typeof m.img === 'string' && m.img.length < 300000 && JPEG.test(m.img) ? m.img : '';
    if (!out.title && !out.text && !out.img) return null;
  }
  if (m.type === 'ack') { out.name = str(m.name); out.ok = !!m.ok; }
  if (m.type === 'item') {
    out.q = Math.max(1, int(m.q, 99));
    if (typeof m.key === 'string' && BYN[m.key] && ['item', 'potion', 'magic'].includes(BYN[m.key].k)) out.key = m.key;
    else { out.n = str(m.n, 80); out.p = str(m.p, 600); if (!out.n) return null; }
  }
  if (m.type === 'gold') { out.coins = {}; COINS.forEach(k => { out.coins[k] = int(m.coins?.[k], 99999); }); if (!COINS.some(k => out.coins[k])) return null; }
  return out;
}
function onMessage(raw) {
  const m = cleanMsg(raw);
  if (!m) return;
  if (L.role === 'dm') { if (m.type === 'ack' && m.to === 'dm') ackHook(m); if (m.type === 'endturn' && m.to === 'dm') endTurnHook(m.from); return; }
  if (m.type === 'endturn') return;
  if (m.type === 'ack' || (m.to !== myKey && m.to !== 'all')) return;
  const list = m.type === 'handout' ? L.handouts : L.inbox;
  if (list.length >= 10 || list.some(x => x.id === m.id)) return;
  list.push(m);
  listener(true);
}
export function sendMsg(m) {
  if (!transport || !transport.send || L.status !== 'on') return false;
  transport.send({ id: uid(), from: myKey, ...m });
  return true;
}
/** Beantwortet einen Vorschlag. Gibt ihn bei Zustimmung zurück, damit er angewendet wird. */
export function answer(id, ok) {
  const i = L.inbox.findIndex(x => x.id === id);
  if (i < 0) return null;
  const [m] = L.inbox.splice(i, 1);
  sendMsg({ type: 'ack', to: 'dm', ok, name: S.name });
  return ok ? m : null;
}

let dmFlags = () => ({});
export const setDmFlags = fn => { dmFlags = fn; };
/** Absprache der Spielleitung: Beute nur über sie. Gilt nur, solange der Spieler verbunden ist. */
export const lootLocked = () => L.role === 'player' && L.status === 'on' && L.peers.some(p => p.role === 'dm' && p.lock);
export const refresh = () => push();
const payload = () => (L.role === 'dm' ? { role: 'dm', lock: !!dmFlags().lock, turn: dmFlags().turn || null } : { role: 'player', insp: !!S.insp, name: S.name, klass: S.klass, level: S.level, hp: S.hp, hpMax: S.hpMax, tmp: S.tmp, ac: S.ac, exh: S.exh, conc: S.conc, cond: Object.keys(S.cond).filter(c => S.cond[c]), death: S.death });
function push() {
  if (!transport) return;
  const p = payload(), j = JSON.stringify(p);
  if (j === lastSent) return;
  lastSent = j;
  transport.track(p);
}
hooks.onSave = () => { if (!transport || L.role !== 'player') return; clearTimeout(timer); timer = setTimeout(push, 200); };

const store = () => { try { if (L.code) localStorage.setItem(LS, JSON.stringify({ code: L.code, role: L.role })); else localStorage.removeItem(LS); } catch (e) { /* Datenschutzmodus */ } };

export function connect(code, role) {
  disconnect();
  L.code = code; L.role = role; L.status = 'connecting'; L.peers = []; L.inbox = []; L.handouts = [];
  store();
  const key = role === 'dm' ? 'dm-' + uid() : S.id;
  myKey = key;
  const factory = window.__liveFake || realtime;
  transport = factory(code, key, list => { L.peers = list.map(clean); peerHook(); const tr = dmTurn(), sig = tr ? JSON.stringify(tr) : ''; if (sig !== lastTurn) { lastTurn = sig; if (L.role === 'player') turnHook(myTurn()); listener(true); } else listener(); }, st => { if (st !== L.status) { L.status = st; listener(true); } }, onMessage);
  lastSent = '';
  push();
  listener(true);
  joinHook();
}
export function disconnect() {
  clearTimeout(timer);
  if (transport) { try { transport.close(); } catch (e) { /* bereits getrennt */ } }
  transport = null;
  L.code = ''; L.role = ''; L.status = 'off'; L.peers = []; L.inbox = []; L.handouts = [];
  store();
  joinHook();
}
export function createRoom() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  connect([...bytes].map(b => CODE_CHARS[b % CODE_CHARS.length]).join(''), 'dm');
}
/** Nach dem Neuladen wieder in den zuletzt genutzten Raum. */
export function resume() {
  try {
    const o = JSON.parse(localStorage.getItem(LS) || 'null');
    if (o && isCode(o.code) && (o.role === 'dm' || o.role === 'player')) connect(o.code, o.role);
  } catch (e) { /* kein gespeicherter Raum */ }
}
