// DM-Bereich: Kampf-Tracker und Kampagnennotizen. Liegt getrennt von den Charakteren auf diesem Gerät.
import monsters from '../data/monsters.json';
import { uid, clamp } from './util.js';
import { charSnapshot, roster, toast } from './state.js';
import { t } from './i18n/index.js';

const KEY = 'charbogen-dm';
const blank = () => ({ on: false, view: 'combat', combat: { round: 1, active: null, list: [] }, notes: [], sel: null });
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null');
    return normD(o);
  } catch (e) { return blank(); }
}
function normD(o) {
  const b = blank();
  if (!o || typeof o !== 'object') return b;
  return { ...b, ...o, combat: { ...b.combat, ...(o.combat || {}), list: Array.isArray(o.combat?.list) ? o.combat.list : [] }, notes: Array.isArray(o.notes) ? o.notes : [] };
}
export let D = load();
export const DU = { mq: '', nq: '', conf: null, open: {}, exp: '', imp: '' };
export const saveD = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { toast(t('toast.saveFailed')); } };
export const setDmOn = on => { D.on = !!on; saveD(); };
export const dmOn = () => D.on;

/* ---- Kampf ---- */
export const MONSTERS = monsters;
export const ordered = () => [...D.combat.list].sort((a, b) => (+b.init || 0) - (+a.init || 0));
const out = c => c.kind === 'mon' && c.hp <= 0;
export function searchMonsters(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return monsters.filter(m => m.n.toLowerCase().includes(s)).sort((a, b) => a.n.toLowerCase().indexOf(s) - b.n.toLowerCase().indexOf(s) || a.n.localeCompare(b.n)).slice(0, 12);
}
const base = () => ({ id: uid(), init: 0, cond: {}, note: '' });
export function addMonster(id, qty = 1) {
  const m = monsters.find(x => x.id === id);
  if (!m) return;
  const same = D.combat.list.filter(c => c.mon === id).length;
  const number = qty > 1 || same > 0;
  for (let i = 1; i <= qty; i++) D.combat.list.push({ ...base(), kind: 'mon', mon: id, name: number ? `${m.n} ${same + i}` : m.n, ac: m.ac, hp: m.hp, hpMax: m.hp });
}
export function addManual(name, ac, hp) {
  D.combat.list.push({ ...base(), kind: 'pc', name, ac: Math.max(0, Math.floor(ac) || 0), hp: Math.max(0, Math.floor(hp) || 0), hpMax: Math.max(0, Math.floor(hp) || 0) });
}
export function addChars() {
  const have = new Set(D.combat.list.map(c => c.char));
  roster().filter(c => !have.has(c.id)).forEach(c => {
    const s = charSnapshot(c.id);
    if (s) D.combat.list.push({ ...base(), kind: 'pc', char: c.id, name: s.name, ac: s.ac, hp: s.hp, hpMax: s.hpMax });
  });
}
export function step(dir) {
  const list = ordered(), n = list.length;
  if (!n || list.every(out)) return;
  const c = D.combat;
  let i = list.findIndex(x => x.id === c.active);
  if (i < 0) { i = dir > 0 ? -1 : 0; }
  for (let k = 0; k < n; k++) {
    i += dir;
    if (i >= n) { i = 0; c.round += 1; }
    if (i < 0) { i = n - 1; c.round = Math.max(1, c.round - 1); }
    if (!out(list[i])) break;
  }
  c.active = list[i].id;
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
export const KINDS = ['npc', 'place', 'plot', 'other'];
export const curNote = () => D.notes.find(n => n.id === D.sel) || null;
export function newNote() {
  const n = { id: uid(), kind: 'npc', title: '', body: '' };
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
  return s ? D.notes.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(s)) : D.notes;
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
