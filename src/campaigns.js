// Kampagnen der Spielgruppe auf diesem Gerät (localStorage charbogen-campaigns, gehört zur Sicherungsdatei).
// Eine Kampagne: Name, Beschreibung, Status, zugeordnete Charaktere (IDs aus der Charakterliste), optional Live-Raumcode,
// nächster Termin und Sitzungszähler (gespielt / geplant). Alles trägt der Nutzer selbst ein, nichts ist vorbelegt.
// role: eigene Rolle in dieser Kampagne ('dm' leitet, 'player' spielt mit), log: eigene Chronik, seen: zuletzt geöffnet.
import { uid } from './util.js';

export const CAMP_KEY = 'charbogen-campaigns';
/** Anzahl der Kampagnenbilder (src/assets/realmcraft/campaigns, Klassen .hub-camp-art.a0 … a5 in areas.css). */
export const ART = 6;
const roleOf = c => (c.role === 'dm' || c.role === 'player' ? c.role : Array.isArray(c.chars) && c.chars.length ? 'player' : 'dm');
const clean = c => ({
  id: String(c.id || uid()), name: String(c.name || '').slice(0, 80), desc: String(c.desc || '').slice(0, 400),
  status: c.status === 'archived' ? 'archived' : 'active', chars: Array.isArray(c.chars) ? c.chars.map(String).slice(0, 12) : [],
  room: /^[A-HJ-NP-Z2-9]{6}$/.test(c.room || '') ? c.room : '', next: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(c.next || '') ? c.next : '',
  done: Math.max(0, Math.min(999, Math.floor(+c.done) || 0)), planned: Math.max(0, Math.min(999, Math.floor(+c.planned) || 0)),
  art: Number.isInteger(c.art) ? c.art % ART : 0, at: String(c.at || new Date().toISOString()),
  role: roleOf(c), log: String(c.log || '').slice(0, 20000), seen: String(c.seen || ''),
  // Lagebericht: Kapitel und geplante Inhalte (dauerhaft), zuletzt bekannter Ort (bei Spielern von der Spielleitung übernommen)
  // split: eigene Charakterstände und Spielleitungsdaten (neu angelegte Kampagnen); ältere bleiben bis zur Übernahme beim gemeinsamen Stand
  split: !!c.split,
  // migr: Übernahme aus dem gemeinsamen Stand (Zeitpunkt, Charakter: 'cur', Spielleitung: 'this' | 'empty'); nur dann gibt es den Rückweg
  migr: c.migr && typeof c.migr === 'object' ? { at: String(c.migr.at || ''), char: c.migr.char === 'cur' ? 'cur' : '', dm: ['this', 'empty'].includes(c.migr.dm) ? c.migr.dm : '' } : null,
  chapter: String(c.chapter || '').slice(0, 120), plan: String(c.plan || '').slice(0, 1000), place: String(c.place || '').slice(0, 80),
});
export function campaigns() {
  try { const o = JSON.parse(localStorage.getItem(CAMP_KEY) || '[]'); return Array.isArray(o) ? o.filter(x => x && typeof x === 'object').map(clean) : []; } catch (e) { return []; }
}
function store(list) { try { localStorage.setItem(CAMP_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
export const campaignById = id => campaigns().find(c => c.id === id) || null;
/** Neu anlegen oder ändern. Liefert die gespeicherte Kampagne oder null. */
export function saveCampaign(c) {
  const list = campaigns(), i = list.findIndex(x => x.id === c.id);
  const art = Number.isInteger(c.art) ? c.art : i >= 0 ? list[i].art : list.length % ART;
  const v = clean({ ...(i >= 0 ? list[i] : { split: c.split !== false }), ...c, art });
  if (!v.name) return null;
  if (i >= 0) list[i] = v; else list.push(v);
  return store(list) ? v : null;
}
/** Beim Öffnen merken, damit die Startseite „zuletzt geöffnet“ zeigen kann. */
export function touchCampaign(id) { const c = campaignById(id); if (c) saveCampaign({ ...c, seen: new Date().toISOString() }); }
export const campaignByRoom = code => (code ? campaigns().find(c => c.room === code) || null : null);
export function deleteCampaign(id) { store(campaigns().filter(c => c.id !== id)); }
export function setStatus(id, status) { const c = campaignById(id); if (c) saveCampaign({ ...c, status }); }
export function sessionDone(id) { const c = campaignById(id); if (c) saveCampaign({ ...c, done: c.done + 1, next: '' }); }
/** Kampagnen, in denen dieser Charakter mitspielt. */
export const campaignsOf = charId => campaigns().filter(c => c.chars.includes(charId));
/** Nächster Termin aus allen aktiven Kampagnen (nur zukünftige oder heutige). */
export function nextSession(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return campaigns().filter(c => c.status === 'active' && c.next && c.next.slice(0, 10) >= today).sort((a, b) => a.next.localeCompare(b.next))[0] || null;
}
/** Charakter entfernt: aus allen Kampagnen austragen. */
export function dropChar(charId) { const list = campaigns(); let ch = false; list.forEach(c => { if (c.chars.includes(charId)) { c.chars = c.chars.filter(x => x !== charId); ch = true; } }); if (ch) store(list); }
