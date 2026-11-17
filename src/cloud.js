// Online-Speicherung pro Gruppe: Charakterbögen und DM-Bereich landen im Supabase-Projekt unter dem Raumcode.
// Läuft nur, solange ein Live-Raum aktiv ist. Spieler sichern ihren aktiven Bogen, die Spielleitung den DM-Bereich.
// Datenbankseite: supabase/charbogen-saves.sql. Gelesen und geschrieben wird nur über die Funktionen dort.
import { SUPA, API_KEY, L } from './live.js';
import { S, hooks, storeChar } from './state.js';
import { D, dmHooks, replaceD, chronOut, houseOut } from './dm.js';

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
/* D2: Jedes Gerät hat je Raum ein eigenes Geheimnis (localStorage charbogen-cloud-secret, auch in der Sicherung).
   Die Datenbank speichert nur seinen Hash. Mit den neuen Funktionen (*2) darf nur der Besitzer schreiben, und der
   Spielleitungsbereich ist nur mit ihrem Geheimnis lesbar. Fehlen die neuen Funktionen noch (SQL nicht ausgeführt),
   arbeitet die App mit den bisherigen weiter; die gemeinsame Chronik gibt es dann noch nicht. */
const SECRET = 'charbogen-cloud-secret';
export function secretFor(room) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(SECRET) || '{}') || {}; } catch (e) { all = {}; }
  if (!all[room]) {
    const b = crypto.getRandomValues(new Uint8Array(24));
    all[room] = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem(SECRET, JSON.stringify(all)); } catch (e) { /* Datenschutzmodus */ }
  }
  return all[room];
}
/** null = unbekannt, true = neue Funktionen vorhanden, false = nur die bisherigen. */
export const V2 = { on: null };
async function call(fn, body) {
  if (V2.on !== false) {
    try { const r = await rpc(fn + '2', { ...body, p_secret: secretFor(body.p_room) }); V2.on = true; return r; }
    catch (e) { if (!(e.setup && V2.on === null)) throw e; V2.on = false; }
  }
  return rpc(fn, body);
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
    const at = await call('charbogen_put', { p_room: L.code, p_kind: m.kind, p_id: m.id, p_name: m.name, p_data: m.data, p_base: force ? null : bases()[k] || '1970-01-01T00:00:00Z' });
    if (at === null) { C.status = 'conflict'; }
    else { setBase(k, at); C.status = 'ok'; C.at = at; C.err = ''; }
    listener();
    if (L.role === 'dm' && V2.on) await pushChron();
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
    const rows = await call('charbogen_get', { p_room: L.code, p_kind: kind, p_id: id });
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
/** Bogen eines Spielers nur lesen (Spielleitung): nichts wird lokal gespeichert. */
export async function peek(id) {
  if (!active()) return null;
  try {
    const rows = await call('charbogen_get', { p_room: L.code, p_kind: 'char', p_id: id });
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row && row.data ? { data: row.data, at: row.updated_at } : { data: null };
  } catch (e) { fail(e); return { data: null }; }
}
export async function remove(kind, id) {
  if (!active()) return;
  try { await call('charbogen_del', { p_room: L.code, p_kind: kind, p_id: id }); setBase(keyOf(kind, id), null); await refreshList(); }
  catch (e) { fail(e); }
}
/* ---- Gemeinsame Chronik ----
   Die Spielleitung schreibt eine eigene Zeile 'chron'/'shared' mit nur den freigegebenen Einträgen (Positivliste aus chronOut()).
   Ihre Presence trägt einen kurzen Fingerabdruck; ändert er sich, holen Spieler die Zeile und speichern sie in ihrer Kampagne. */
let lastChron = '';
async function pushChron() {
  const data = { entries: chronOut(), rules: houseOut() }, j = JSON.stringify(data);
  if (j + L.code === lastChron) return;
  await call('charbogen_put', { p_room: L.code, p_kind: 'chron', p_id: 'shared', p_name: 'Chronik', p_data: data, p_base: null });
  lastChron = j + L.code;
}
/** Spieler: gemeinsame Chronik und Hausregeln holen. Liefert { entries, rules } oder null. */
export async function fetchChron() {
  if (!active()) return null;
  try {
    const rows = await call('charbogen_get', { p_room: L.code, p_kind: 'chron', p_id: 'shared' });
    const row = Array.isArray(rows) ? rows[0] : rows;
    const d = row && row.data;
    return { entries: d && Array.isArray(d.entries) ? d.entries : [], rules: d && Array.isArray(d.rules) ? d.rules : [] };
  } catch (e) { return null; }
}
/** Beim Betreten eines Raums: Übersicht laden und den eigenen Stand gleich sichern. */
export function onJoin() {
  C.status = 'off'; C.list = null; C.err = '';
  if (!active()) { listener(); return; }
  refreshList().then(() => pushNow(false));
}
