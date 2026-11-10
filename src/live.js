// Live-Tisch: Supabase Realtime Presence reicht TP und Zustände nur durch, gespeichert wird dort nichts.
// Verbindet erst, wenn jemand einem Raum beitritt. Der Publishable Key ist laut Supabase für Clients gedacht.
import { RealtimeClient } from '@supabase/realtime-js';
import { uid } from './util.js';
import { S, hooks } from './state.js';
import { COND } from './catalog.js';

const WS = 'wss://ovkxoqgqocspwjvxhige.supabase.co/realtime/v1';
const API_KEY = 'sb_publishable__g6JJhXOVsiXLvgvqYiK0w_cE4tmXTn';
const LS = 'charbogen-live';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const L = { status: 'off', code: '', role: '', peers: [] };
export const isCode = c => /^[A-HJ-NP-Z2-9]{6}$/.test(c);
export const players = () => L.peers.filter(p => p.role === 'player');
export const dmOnline = () => L.peers.some(p => p.role === 'dm');

let transport = null, listener = () => {}, peerHook = () => {}, lastSent = '', timer = null;
export const setLiveListener = fn => { listener = fn; };
export const setPeerHook = fn => { peerHook = fn; };

function realtime(code, key, onPeers, onStatus) {
  const client = new RealtimeClient(WS, { params: { apikey: API_KEY } });
  const ch = client.channel('charbogen:' + code, { config: { presence: { key } } });
  let last = null, joined = false;
  ch.on('presence', { event: 'sync' }, () => onPeers(Object.entries(ch.presenceState()).map(([k, a]) => ({ ...a[a.length - 1], key: k }))));
  ch.subscribe(s => {
    if (s === 'SUBSCRIBED') { joined = true; onStatus('on'); if (last) ch.track(last); }
    else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { joined = false; onStatus('error'); }
  });
  return { track(p) { last = p; if (joined) ch.track(p); }, close() { client.removeChannel(ch); client.disconnect(); } };
}

const CONDS = new Set(COND.map(c => c.n));
const int = (v, max = 9999) => Math.max(0, Math.min(max, Math.floor(+v) || 0));
const str = (v, n = 60) => String(v ?? '').slice(0, n);
/** Eingehende Daten kommen von anderen Geräten und werden auf die erwarteten Felder begrenzt. */
function clean(p) {
  return {
    key: str(p.key, 40), role: p.role === 'dm' ? 'dm' : 'player', name: str(p.name), klass: str(p.klass, 30), level: int(p.level, 20),
    insp: !!p.insp, hp: int(p.hp), hpMax: int(p.hpMax), tmp: int(p.tmp), ac: int(p.ac, 99), exh: int(p.exh, 6), conc: str(p.conc),
    cond: Array.isArray(p.cond) ? p.cond.filter(c => CONDS.has(c)) : [], death: { s: int(p.death?.s, 3), f: int(p.death?.f, 3) },
  };
}
const payload = () => (L.role === 'dm' ? { role: 'dm' } : { role: 'player', insp: !!S.insp, name: S.name, klass: S.klass, level: S.level, hp: S.hp, hpMax: S.hpMax, tmp: S.tmp, ac: S.ac, exh: S.exh, conc: S.conc, cond: Object.keys(S.cond).filter(c => S.cond[c]), death: S.death });
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
  L.code = code; L.role = role; L.status = 'connecting'; L.peers = [];
  store();
  const key = role === 'dm' ? 'dm-' + uid() : S.id;
  const factory = window.__liveFake || realtime;
  transport = factory(code, key, list => { L.peers = list.map(clean); peerHook(); listener(); }, st => { if (st !== L.status) { L.status = st; listener(true); } });
  lastSent = '';
  push();
  listener(true);
}
export function disconnect() {
  clearTimeout(timer);
  if (transport) { try { transport.close(); } catch (e) { /* bereits getrennt */ } }
  transport = null;
  L.code = ''; L.role = ''; L.status = 'off'; L.peers = [];
  store();
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
