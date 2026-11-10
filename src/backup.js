// Sicherung: Datei mit allen Charakteren und DM-Daten, dazu die letzten Stände in IndexedDB.
// IndexedDB statt localStorage, damit der Verlauf nicht den Speicher der Charaktere aufbraucht.
import { S, U, hooks, save } from './state.js';

const KEEP = /^charbogen-(v4|v3|v2|index|dm|char-[\w-]+)$/;
const LAST = 'charbogen-lastbackup', DAY = 86400000, MAX_SNAPS = 5, EVERY = 600000;

export function collect() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (KEEP.test(k)) data[k] = localStorage.getItem(k); }
  return { kind: 'charbogen-backup', v: 1, at: new Date().toISOString(), data };
}

/** Prüft eine Sicherung, bevor sie irgendetwas überschreibt. */
export function parseBackup(text) {
  let o;
  try { o = JSON.parse(text); } catch (e) { return null; }
  if (!o || o.kind !== 'charbogen-backup' || !o.data || typeof o.data !== 'object') return null;
  const data = {};
  for (const [k, v] of Object.entries(o.data)) {
    if (!KEEP.test(k) || typeof v !== 'string') return null;
    try { JSON.parse(v); } catch (e) { return null; }
    data[k] = v;
  }
  if (!data['charbogen-v4'] && !data['charbogen-v3'] && !data['charbogen-index']) return null;
  return { at: String(o.at || ''), data };
}
export const charCount = b => (b.data['charbogen-v4'] || b.data['charbogen-v3'] ? 1 : 0) + Object.keys(b.data).filter(k => k.startsWith('charbogen-char-')).length;

export const lastBackup = () => { try { return localStorage.getItem(LAST) || ''; } catch (e) { return ''; } };
/** Erinnert nach einer Woche. Beim ersten Start beginnt die Woche erst. */
export function needsBackup() {
  if (U.NAGOFF || (!S.klass && !S.level)) return false;
  const last = lastBackup();
  if (!last) { try { localStorage.setItem(LAST, new Date().toISOString()); } catch (e) { /* Datenschutzmodus */ } return false; }
  return Date.now() - Date.parse(last) > 7 * DAY;
}

export function downloadBackup() {
  save();
  const b = collect(), url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = `charakterbogen-sicherung-${b.at.slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try { localStorage.setItem(LAST, b.at); } catch (e) { /* Datenschutzmodus */ }
  U.NAGOFF = true;
}

const openDb = () => new Promise((res, rej) => {
  const r = indexedDB.open('charbogen-backup', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('snaps', { keyPath: 'at' });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const done = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
const metas = all => all.sort((a, b) => b.at.localeCompare(a.at)).map(x => ({ at: x.at, n: charCount(x) }));

let lastSig = '', lastAt = 0;
/** Legt einen Stand an, wenn sich seit dem letzten etwas geändert hat. */
export async function snapshot() {
  try {
    const b = collect(), sig = JSON.stringify(b.data);
    if (sig === lastSig) return;
    const db = await openDb(), store = db.transaction('snaps', 'readwrite').objectStore('snaps');
    const all = await done(store.getAll());
    if (all.length && JSON.stringify(all.sort((x, y) => y.at.localeCompare(x.at))[0].data) === sig) { lastSig = sig; U.SNAPS = metas(all); db.close(); return; }
    all.push(b);
    await done(store.put(b));
    const sorted = all.sort((x, y) => y.at.localeCompare(x.at));
    for (const old of sorted.slice(MAX_SNAPS)) await done(store.delete(old.at));
    lastSig = sig; lastAt = Date.now(); U.SNAPS = metas(sorted.slice(0, MAX_SNAPS));
    db.close();
  } catch (e) { /* ohne IndexedDB bleibt die Sicherungsdatei */ }
}
export async function loadSnap(at) {
  try {
    const db = await openDb(), x = await done(db.transaction('snaps').objectStore('snaps').get(at));
    db.close();
    return x ? { at: x.at, data: x.data } : null;
  } catch (e) { return null; }
}

/** Ersetzt alles in diesem Browser. Vorher wird der aktuelle Stand gesichert, bei Fehlern zurückgerollt. */
export async function restoreBackup(b) {
  await snapshot();
  const before = collect().data;
  const clear = () => Object.keys(before).forEach(k => localStorage.removeItem(k));
  try {
    clear();
    Object.entries(b.data).forEach(([k, v]) => localStorage.setItem(k, v));
  } catch (e) {
    Object.keys(b.data).forEach(k => localStorage.removeItem(k));
    Object.entries(before).forEach(([k, v]) => localStorage.setItem(k, v));
    return false;
  }
  location.reload();
  return true;
}

export function initBackup(onReady) {
  hooks.afterSave = () => { if (Date.now() - lastAt > EVERY) { lastAt = Date.now(); snapshot(); } };
  snapshot().then(onReady);
}
