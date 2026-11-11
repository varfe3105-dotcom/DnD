// Online-Speicherung pro Gruppe: Charakterbögen und DM-Bereich landen im Supabase-Projekt unter dem Raumcode.
// Läuft nur, solange ein Live-Raum aktiv ist. Spieler sichern ihren aktiven Bogen, die Spielleitung den DM-Bereich.
// Datenbankseite: supabase/charbogen-saves.sql. Gelesen und geschrieben wird nur über die Funktionen dort.
import { SUPA, API_KEY, L } from './live.js';
import { S, hooks, storeChar } from './state.js';
import { D, dmHooks, replaceD } from './dm.js';

const LS = 'charbogen-cloud';
const WAIT = 4000;
/** status: off | saving | ok | conflict | setup (SQL fehlt) | error */
export const C = { status: 'off', at: '', list: null, listFor: '', err: '' };
let timer = null, listener = () => {}, busy = false, again = false;
export const setCloudListener = fn => { listener = fn; };

const bases = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } };
const setBase = (k, v) => { const b = bases(); if (v) b[k] = v; else delete b[k]; try { localStorage.setItem(LS, JSON.stringify(b)); } catch (e) { /* Datenschutzmodus */ } };
const keyOf = (kind, id) => `${L.code}:${kind}:${id}`;

async function rpc(fn, body) {
  const f = window.__cloudFake || window.fetch.bind(window);
  const r = await f(`${SUPA}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    const e = new Error(txt.slice(0, 200));
    e.setup = r.status === 404 || /charbogen_|PGRST202|does not exist/.test(txt);
    throw e;
  }
  return r.status === 204 ? null : r.json();
}
const fail = e => { C.status = e.setup ? 'setup' : 'error'; C.err = e.message || ''; listener(); };

/** Was dieses Gerät gerade sichern soll. */
function mine() {
  if (L.role === 'player') return { kind: 'char', id: S.id, name: S.name, data: S };
  if (L.role === 'dm') return { kind: 'dm', id: 'dm', name: 'DM', data: { kind: 'charbogen-dm', ...D } };
  return null;
}
export const active = () => !!L.code && !!L.role;

/** Sichert den eigenen Stand. force überschreibt einen neueren Online-Stand bewusst. */
export async function pushNow(force) {
  const m = mine();
  if (!m || !active()) return;
  if (busy) { again = true; return; }
  const k = keyOf(m.kind, m.id);
  if (C.status === 'conflict' && !force) return;
  busy = true; C.status = 'saving'; listener();
  try {
    const at = await rpc('charbogen_put', { p_room: L.code, p_kind: m.kind, p_id: m.id, p_name: m.name, p_data: m.data, p_base: force ? null : bases()[k] || '1970-01-01T00:00:00Z' });
    if (at === null) { C.status = 'conflict'; }
    else { setBase(k, at); C.status = 'ok'; C.at = at; C.err = ''; }
    listener();
  } catch (e) { fail(e); }
  busy = false;
  if (again) { again = false; schedule(); }
}
function schedule() { if (!active()) return; clearTimeout(timer); timer = setTimeout(() => pushNow(false), WAIT); }
hooks.cloud = () => { if (L.role === 'player') schedule(); };
dmHooks.onSave = () => { if (L.role === 'dm') schedule(); };

/** Übersicht des Raums laden (ohne Daten). */
export async function refreshList() {
  if (!active()) { C.list = null; return; }
  const room = L.code;
  try { C.list = await rpc('charbogen_list', { p_room: room }); C.listFor = room; if (C.status === 'setup' || C.status === 'error') C.status = 'ok'; }
  catch (e) { C.list = null; fail(e); return; }
  listener();
}
/** Online-Stand übernehmen: Charakter ersetzt oder ergänzt den lokalen, DM-Stand ersetzt den DM-Bereich. */
export async function pull(kind, id) {
  if (!active()) return '';
  try {
    const rows = await rpc('charbogen_get', { p_room: L.code, p_kind: kind, p_id: id });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row || !row.data) return '';
    setBase(keyOf(kind, id), row.updated_at);
    let res = 'dm';
    if (kind === 'char') res = storeChar(row.data); else replaceD(row.data);
    const m = mine();
    if (m && m.kind === kind && m.id === id && C.status === 'conflict') C.status = 'ok';
    listener();
    return res;
  } catch (e) { fail(e); return ''; }
}
export async function remove(kind, id) {
  if (!active()) return;
  try { await rpc('charbogen_del', { p_room: L.code, p_kind: kind, p_id: id }); setBase(keyOf(kind, id), null); await refreshList(); }
  catch (e) { fail(e); }
}
/** Beim Betreten eines Raums: Übersicht laden und den eigenen Stand gleich sichern. */
export function onJoin() {
  C.status = 'off'; C.list = null; C.err = '';
  if (!active()) { listener(); return; }
  refreshList().then(() => pushNow(false));
}
