// DM-Bereich: Kampf-Tracker und Kampagnennotizen. Liegt getrennt von den Charakteren auf diesem Gerät.
import monsters from '../data/monsters.json';
import { uid, clamp } from './util.js';
import { charSnapshot, roster, toast } from './state.js';
import { t } from './i18n/index.js';

const KEY = 'charbogen-dm';
const blank = () => ({ on: false, view: 'combat', combat: { round: 1, active: null, list: [] }, notes: [], sel: null, party: [{ count: 4, level: 3 }], encounters: [], custom: [], encSel: null });
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    return normD(o);
  } catch (e) { return blank(); }
}
function normD(o) {
  const b = blank();
  if (!o || typeof o !== 'object') return b;
  return { ...b, ...o, combat: { ...b.combat, ...(o.combat || {}), list: Array.isArray(o.combat?.list) ? o.combat.list : [] }, notes: Array.isArray(o.notes) ? o.notes : [], party: Array.isArray(o.party) && o.party.length ? o.party : b.party, encounters: Array.isArray(o.encounters) ? o.encounters : [], custom: Array.isArray(o.custom) ? o.custom : [] };
}
export let D = load();
export const DU = { mq: '', nq: '', eq: '', conf: null, open: {}, exp: '', imp: '', editMon: null };
export const dmHooks = { onSave: null, live: null };
export const saveD = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { toast(t('toast.saveFailed')); } if (dmHooks.onSave) dmHooks.onSave(); if (dmHooks.live) dmHooks.live(); };
/** Ersetzt den DM-Bereich durch einen Online-Stand. */
export function replaceD(o) { const { kind, ...rest } = o || {}; D = normD({ ...rest, on: true }); saveD(); }
export const setDmOn = on => { D.on = !!on; saveD(); };
export const dmOn = () => D.on;

/* ---- Kampf ---- */
export const allMonsters = () => [...D.custom, ...monsters];
export const findMonster = id => allMonsters().find(m => m.id === id);
export const ordered = () => [...D.combat.list].sort((a, b) => (+b.init || 0) - (+a.init || 0));
const out = c => c.kind === 'mon' && c.hp <= 0;
export function searchMonsters(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return allMonsters().filter(m => m.n.toLowerCase().includes(s)).sort((a, b) => a.n.toLowerCase().indexOf(s) - b.n.toLowerCase().indexOf(s) || a.n.localeCompare(b.n)).slice(0, 12);
}
const base = () => ({ id: uid(), init: 0, cond: {}, note: '' });
/** Legendary Actions und Zauberplätze eines Monsters aus seinem Text. */
function monsterExtras(m) {
  const out = {};
  if (/(^|\n)Legendary Actions(\n|$)/.test(m.text || '')) out.la = { max: 3, used: 0 };
  const slots = [...(m.text || '').matchAll(/(\d)(?:st|nd|rd|th) level \((\d+) slots?\)/g)].map(x => ({ lvl: +x[1], max: +x[2], used: 0 }));
  if (slots.length) out.slots = slots;
  return out;
}
export function addMonster(id, qty = 1) {
  const m = findMonster(id);
  if (!m) return;
  const same = D.combat.list.filter(c => c.mon === id).length;
  const number = qty > 1 || same > 0;
  for (let i = 1; i <= qty; i++) D.combat.list.push({ ...base(), kind: 'mon', mon: id, name: number ? `${m.n} ${same + i}` : m.n, ac: m.ac, hp: m.hp, hpMax: m.hp, ...monsterExtras(m) });
}
export function addManual(name, ac, hp) {
  D.combat.list.push({ ...base(), kind: 'pc', name, ac: Math.max(0, Math.floor(ac) || 0), hp: Math.max(0, Math.floor(hp) || 0), hpMax: Math.max(0, Math.floor(hp) || 0) });
}
/** Was die Spieler über den Zug erfahren: Name, bei Monstern dazu der Herausforderungsgrad. */
export function turnInfo() {
  if (!D.turns || !D.combat.active) return null;
  const list = ordered().filter(c => !out(c)), i = list.findIndex(c => c.id === D.combat.active);
  if (i < 0) return null;
  const cur = list[i], nx = list.length > 1 ? list[(i + 1) % list.length] : null, pc = c => c && c.kind === 'pc';
  const cr = c => { const m = c && c.kind === 'mon' && findMonster(c.mon); return m ? (m.cr === 0.125 ? '1/8' : m.cr === 0.25 ? '1/4' : m.cr === 0.5 ? '1/2' : String(m.cr)) : ''; };
  return { r: D.combat.round, cur: cur.live || '', name: cur.name, enemy: !pc(cur), cr: cr(cur), next: nx ? nx.name : '', nextEnemy: !!nx && !pc(nx), nextCr: cr(nx) };
}
/** Ein Spieler beendet seinen Zug. Gilt nur, wenn er wirklich gerade dran ist. */
export function endTurnFrom(key) {
  const c = D.combat.active && find(D.combat.active);
  if (!D.turns || !c || !key || c.live !== key) return null;
  return step(1);
}
export function addChars() {
  const have = new Set(D.combat.list.map(c => c.char));
  roster().filter(c => !have.has(c.id)).forEach(c => {
    const s = charSnapshot(c.id);
    if (s) D.combat.list.push({ ...base(), kind: 'pc', char: c.id, name: s.name, ac: s.ac, hp: s.hp, hpMax: s.hpMax });
  });
}
function tickEffects() {
  const gone = [];
  D.combat.list.forEach(c => { if (!c.fx) return; c.fx.forEach(f => { f.r -= 1; if (f.r <= 0) gone.push({ n: f.n, on: c.name }); }); c.fx = c.fx.filter(f => f.r > 0); });
  return gone;
}
/** Geht einen Zug weiter. Liefert die Effekte, die mit der neuen Runde enden. */
export function step(dir) {
  const list = ordered(), n = list.length, ended = [];
  if (!n || list.every(out)) return ended;
  const c = D.combat;
  let i = list.findIndex(x => x.id === c.active);
  if (i < 0) { i = dir > 0 ? -1 : 0; }
  for (let k = 0; k < n; k++) {
    i += dir;
    if (i >= n && dir > 0) { i = 0; c.round += 1; ended.push(...tickEffects()); }
    if (i >= n) i = 0;
    if (i < 0) { i = n - 1; c.round = Math.max(1, c.round - 1); }
    if (!out(list[i])) break;
  }
  c.active = list[i].id;
  if (dir > 0 && list[i].la) list[i].la.used = 0;
  return ended;
}
export const find = id => D.combat.list.find(c => c.id === id);
export function changeHp(id, delta) {
  const c = find(id);
  if (c) c.hp = clamp(c.hp + delta, 0, Math.max(c.hpMax, c.hp));
}
export function removeC(id) {
  D.combat.list = D.combat.list.filter(c => c.id !== id);
  if (D.combat.active === id) D.combat.active = null;
}
export function clearCombat() { D.combat = { round: 1, active: null, list: [] }; DU.open = {}; }

export function addEffect(id, name, rounds) {
  const c = find(id);
  if (c && name) (c.fx = c.fx || []).push({ id: uid(), n: name, r: Math.max(1, Math.floor(rounds) || 1) });
}
export function removeEffect(id, fx) { const c = find(id); if (c?.fx) c.fx = c.fx.filter(f => f.id !== fx); }
export function togglePip(o, j) { o.used = clamp(j < o.max - o.used ? o.used + 1 : o.used - 1, 0, o.max); }

/* ---- Begegnungen ---- */
const XP = { 0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000 };
const THRESH = [null, [25, 50, 75, 100], [50, 100, 150, 200], [75, 150, 225, 400], [125, 250, 375, 500], [250, 500, 750, 1100], [300, 600, 900, 1400], [350, 750, 1100, 1700], [450, 900, 1400, 2100], [550, 1100, 1600, 2400], [600, 1200, 1900, 2800], [800, 1600, 2400, 3600], [1000, 2000, 3000, 4500], [1100, 2200, 3400, 5100], [1250, 2500, 3800, 5700], [1400, 2800, 4300, 6400], [1600, 3200, 4800, 7200], [2000, 3900, 5900, 8800], [2100, 4200, 6300, 9500], [2400, 4900, 7300, 10900], [2800, 5700, 8500, 12700]];
const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
export const xpOf = cr => XP[cr] ?? 0;
/** XP der besiegten Monster im laufenden Kampf (TP 0). */
export function defeatedXp() {
  const gone = D.combat.list.filter(c => c.kind === 'mon' && c.hp <= 0);
  return { list: gone, xp: gone.reduce((a, c) => a + xpOf(findMonster(c.mon)?.cr), 0) };
}
export const partySize = () => D.party.reduce((a, p) => a + (+p.count || 0), 0);
export const thresholds = () => D.party.reduce((t, p) => { const r = THRESH[clamp(+p.level || 1, 1, 20)]; return t.map((v, i) => v + r[i] * (+p.count || 0)); }, [0, 0, 0, 0]);
/** Schwierigkeit nach den DMG-Regeln: Grund-XP mal Faktor nach Monsterzahl und Gruppengröße. */
export function rate(enc) {
  let n = 0, xp = 0;
  enc.monsters.forEach(e => { const m = findMonster(e.id); if (m) { n += e.qty; xp += xpOf(m.cr) * e.qty; } });
  let i = n <= 1 ? 1 : n === 2 ? 2 : n <= 6 ? 3 : n <= 10 ? 4 : n <= 14 ? 5 : 6;
  const size = partySize();
  if (size < 3) i += 1; else if (size >= 6) i -= 1;
  const mult = STEPS[clamp(i, 0, 7)], adj = Math.round(xp * mult), th = thresholds();
  const level = !n ? 'none' : adj >= th[3] ? 'deadly' : adj >= th[2] ? 'hard' : adj >= th[1] ? 'medium' : adj >= th[0] ? 'easy' : 'trivial';
  return { n, xp, mult, adj, level };
}
export const curEnc = () => D.encounters.find(e => e.id === D.encSel) || null;
export function newEnc(name) { const e = { id: uid(), name, monsters: [] }; D.encounters.unshift(e); D.encSel = e.id; }
export function delEnc(id) { D.encounters = D.encounters.filter(e => e.id !== id); if (D.encSel === id) D.encSel = null; }
export function encAdd(mid) { const e = curEnc(); if (!e) return; const r = e.monsters.find(x => x.id === mid); if (r) r.qty += 1; else e.monsters.push({ id: mid, qty: 1 }); }
export function encQty(mid, d) { const e = curEnc(); if (!e) return; const r = e.monsters.find(x => x.id === mid); if (r) r.qty += d; e.monsters = e.monsters.filter(x => x.qty > 0); }
/** Startet eine Begegnung: Monster werden ersetzt, Spieler bleiben. */
export function startEnc(id) {
  const e = D.encounters.find(x => x.id === id);
  if (e) startMonsters(e.monsters);
}
export function placeAdd(mid) { const n = curNote(); if (!n) return; n.monsters = n.monsters || []; const r = n.monsters.find(x => x.id === mid); if (r) r.qty += 1; else n.monsters.push({ id: mid, qty: 1 }); }
export function placeQty(mid, d) { const n = curNote(); if (!n?.monsters) return; const r = n.monsters.find(x => x.id === mid); if (r) r.qty += d; n.monsters = n.monsters.filter(x => x.qty > 0); }
export function startPlace(id) { const n = D.notes.find(x => x.id === id); if (n?.monsters?.length) startMonsters(n.monsters); }
function startMonsters(monsters) {
  D.combat.list = D.combat.list.filter(c => c.kind !== 'mon');
  D.combat.round = 1; D.combat.active = null; DU.open = {};
  monsters.forEach(m => addMonster(m.id, m.qty));
  D.view = 'combat';
}

/* ---- Eigene Monster ---- */
const crValue = s => { const t = String(s).trim().replace(',', '.'); if (t.includes('/')) { const [a, b] = t.split('/'); return +a / +b; } return +t || 0; };
export function saveCustom(f, editId) {
  const m = { id: editId || 'c-' + uid(), n: f.n, cr: crValue(f.cr), ac: +f.ac || 10, hp: +f.hp || 1, speed: f.speed, size: '', type: '', abil: f.abil, text: f.text, source: 'own', verified: false, custom: true };
  const i = D.custom.findIndex(x => x.id === m.id);
  if (i >= 0) D.custom[i] = m; else D.custom.unshift(m);
}
export function delCustom(id) { D.custom = D.custom.filter(m => m.id !== id); }

/* ---- Live-Tisch ---- */
export function addLive(peers) {
  const have = new Set(D.combat.list.map(c => c.live));
  peers.filter(p => !have.has(p.key)).forEach(p => D.combat.list.push({ ...base(), kind: 'pc', live: p.key, name: p.name, ac: p.ac, hp: p.hp, hpMax: p.hpMax, cond: Object.fromEntries(p.cond.map(c => [c, true])) }));
}
/** Hält verknüpfte Spieler im Tracker aktuell. */
export function syncLive(peers) {
  let changed = false;
  D.combat.list.forEach(c => {
    const p = c.live && peers.find(x => x.key === c.live);
    if (!p) return;
    const cond = Object.fromEntries(p.cond.map(x => [x, true]));
    if (c.hp !== p.hp || c.hpMax !== p.hpMax || c.ac !== p.ac || JSON.stringify(c.cond) !== JSON.stringify(cond)) { Object.assign(c, { hp: p.hp, hpMax: p.hpMax, ac: p.ac, cond }); changed = true; }
  });
  if (changed) saveD();
}

/* ---- Notizen ---- */
export const KINDS = ['session', 'place', 'npc', 'plot', 'other'];
/** „Hier sind wir“: der aktuelle Ort der Gruppe. */
export const hereNote = () => D.notes.find(n => n.id === D.here && n.kind === 'place') || null;
export const setHere = id => { D.here = id || null; };
export const lastSession = () => D.notes.find(n => n.kind === 'session') || null;
export const curNote = () => D.notes.find(n => n.id === D.sel) || null;
export function newNote(kind = 'npc') {
  const nr = D.notes.filter(x => x.kind === 'session').length + 1;
  const title = kind === 'session' ? `${t('dm.sessionTitle', { n: nr })} · ${new Date().toLocaleDateString()}` : '';
  const n = { id: uid(), kind, title, body: '', ...(kind === 'place' ? { monsters: [] } : {}) };
  D.notes.unshift(n);
  D.sel = n.id;
}
export function delNote(id) {
  D.notes = D.notes.filter(n => n.id !== id);
  if (D.sel === id) D.sel = D.notes[0]?.id || null;
}
const LINK = /\[\[([^\]\n]+)\]\]/g;
export const linksOf = n => [...new Set([...(n.body || '').matchAll(LINK)].map(m => m[1].trim()))];
export const noteByTitle = title => D.notes.find(n => n.title.trim().toLowerCase() === title.trim().toLowerCase());
export const backlinks = n => (n.title.trim() ? D.notes.filter(o => o.id !== n.id && linksOf(o).some(l => l.toLowerCase() === n.title.trim().toLowerCase())) : []);
export function searchNotes(q) {
  const s = q.trim().toLowerCase();
  const list = DU.nk ? D.notes.filter(n => n.kind === DU.nk) : D.notes;
  return s ? list.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(s)) : list;
}
/** Legt eine verlinkte, noch nicht vorhandene Notiz an. */
export function openLink(title) {
  let n = noteByTitle(title);
  if (!n) { n = { id: uid(), kind: 'other', title, body: '' }; D.notes.unshift(n); }
  D.sel = n.id;
}

/* ---- Sichern ---- */
export const exportD = () => JSON.stringify({ kind: 'charbogen-dm', ...D });
export function importD(text) {
  let o;
  try { o = JSON.parse(text); } catch (e) { return false; }
  if (!o || o.kind !== 'charbogen-dm') return false;
  const { kind, ...rest } = o;
  D = normD({ ...rest, on: true });
  saveD();
  return true;
}
