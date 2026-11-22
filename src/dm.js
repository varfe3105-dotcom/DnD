// DM-Bereich: Kampf-Tracker und Kampagnennotizen. Liegt getrennt von den Charakteren auf diesem Gerät.
import monsters from '../data/monsters.json';
import { BYN } from './catalog.js';
import { uid, clamp } from './util.js';
import { charSnapshot, roster, toast } from './state.js';
import { t } from './i18n/index.js';

const KEY = 'charbogen-dm';
/* Spielleitungsdaten je Kampagne (D1): Getrennte Kampagnen speichern in charbogen-dm-camp-<id>.
   charbogen-dm bleibt der bisherige gemeinsame Bereich (für Kampagnen vor der Trennung und Spielleitung ohne Kampagne)
   und hält die Geräteschalter. Eigene Monster liegen für alle in charbogen-dm-lib. */
const LIB = 'charbogen-dm-lib', campKey = id => 'charbogen-dm-camp-' + id, FLAGS = ['on', 'only', 'view'];
const getJ = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const libCustom = () => { const l = getJ(LIB); return l && Array.isArray(l.custom) ? l.custom : null; };
const mergeCustom = (a, b) => [...a, ...(b || []).filter(x => x && !a.some(y => y.id === x.id))];
let ctx = null;
export const dmCtx = () => ctx;
/** Kurzfassung des bisherigen gemeinsamen Bereichs für den Übernahme-Dialog. */
export function legacySummary() { const o = normD(getJ(KEY)); return { notes: o.notes.length, enc: o.encounters.length, fight: o.combat.list.length }; }
/** Übernahme: Kopie der Kampagnenteile des gemeinsamen Bereichs in eine Kampagne. Der gemeinsame Bereich bleibt unverändert. */
export function adoptLegacy(id) { const { on, only, view, custom, ...camp } = normD(getJ(KEY)); localStorage.setItem(campKey(id), JSON.stringify(camp)); }
/** Rückweg: Spielleitungsdaten einer Kampagne entfernen. */
export function dropCamp(id) { if (ctx === id) useCamp(null); localStorage.removeItem(campKey(id)); }
const blank = () => ({ on: false, view: 'combat', combat: { round: 1, active: null, list: [] }, notes: [], sel: null, party: [{ count: 4, level: 3 }], encounters: [], custom: [], encSel: null, merchants: [], sales: [], house: [] });
function load() {
  const o = normD(getJ(KEY)), lc = libCustom();
  if (lc) o.custom = lc;
  return o;
}
function normD(o) {
  const b = blank();
  if (!o || typeof o !== 'object') return b;
  return { ...b, ...o, combat: { ...b.combat, ...(o.combat || {}), list: Array.isArray(o.combat?.list) ? o.combat.list : [] }, notes: Array.isArray(o.notes) ? o.notes : [], party: Array.isArray(o.party) && o.party.length ? o.party : b.party, encounters: Array.isArray(o.encounters) ? o.encounters : [], custom: Array.isArray(o.custom) ? o.custom : [], merchants: Array.isArray(o.merchants) ? o.merchants : [], sales: Array.isArray(o.sales) ? o.sales : [], house: Array.isArray(o.house) ? o.house : [] };
}
export let D = load();
export const DU = { mq: '', nq: '', eq: '', conf: null, open: {}, exp: '', imp: '', editMon: null, flog: [] };
/** Kampfmeldungen der Spielleitung: nur die letzten Ereignisse dieser Sitzung, kein Protokoll (nicht gespeichert). */
export function flog(text, kind = '') { DU.flog = [{ text, kind, r: D.combat.round }, ...(DU.flog || [])].slice(0, 8); }
export const dmHooks = { onSave: null, live: null };
export const saveD = () => {
  try {
    localStorage.setItem(LIB, JSON.stringify({ custom: D.custom }));
    if (ctx) {
      const { on, only, view, custom, ...camp } = D;
      localStorage.setItem(campKey(ctx), JSON.stringify(camp));
      const shared = getJ(KEY) || {};
      FLAGS.forEach(k => { shared[k] = D[k]; });
      localStorage.setItem(KEY, JSON.stringify(shared));
    } else localStorage.setItem(KEY, JSON.stringify(D));
  } catch (e) { toast(t('toast.saveFailed')); } if (dmHooks.onSave) dmHooks.onSave(); if (dmHooks.live) dmHooks.live(); };
/** Ersetzt den DM-Bereich durch einen Online-Stand. */
export function replaceD(o) { const { kind, ...rest } = o || {}, mine = D.custom; D = normD({ ...rest, only: D.only, view: D.view, on: true }); D.custom = mergeCustom(mine, D.custom); saveD(); }
/** Spielleitungsdaten einer getrennten Kampagne laden (id) oder den bisherigen gemeinsamen Bereich (null). Schalter und eigene Monster bleiben. */
export function useCamp(id) {
  const next = id || null;
  if (next === ctx) return;
  const flags = Object.fromEntries(FLAGS.map(k => [k, D[k]])), custom = D.custom;
  ctx = next;
  D = normD({ ...(getJ(ctx ? campKey(ctx) : KEY) || {}), ...flags });
  D.custom = libCustom() || custom;
  DU.open = {}; DU.conf = null;
}
export const setDmOn = on => { D.on = !!on; saveD(); };
export const dmOn = () => D.on;

/* ---- Kampf ---- */
export const allMonsters = () => [...D.custom, ...monsters];
export const findMonster = id => allMonsters().find(m => m.id === id);
/** Reihenfolge nach Initiative. Begleiter stehen direkt unter ihrem Spieler und handeln in dessen Zug. */
export const ordered = () => {
  const list = D.combat.list, owner = c => c.kind === 'pet' && list.find(x => x.kind === 'pc' && x.live && x.live === c.live);
  const main = list.filter(c => !owner(c)).sort((a, b) => (+b.init || 0) - (+a.init || 0));
  return main.flatMap(c => [c, ...(c.kind === 'pc' && c.live ? list.filter(p => p.kind === 'pet' && p.live === c.live) : [])]);
};
// Besiegte Monster und Begleiter (eigener Zug fällt weg) werden beim Weiterschalten übersprungen.
const out = c => (c.kind === 'mon' && c.hp <= 0) || c.kind === 'pet';
export function searchMonsters(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return allMonsters().filter(m => m.n.toLowerCase().includes(s)).sort((a, b) => a.n.toLowerCase().indexOf(s) - b.n.toLowerCase().indexOf(s) || a.n.localeCompare(b.n)).slice(0, 12);
}
const base = () => ({ id: uid(), init: 0, cond: {}, note: '' });
/** Legendary Actions und Zauberplätze eines Monsters aus seinem Text. */
/** Fähigkeiten mit Aufladen, z. B. „Fire Breath (Recharge 5-6)“ → [{ n, r: '5–6' }]. Gewürfelt wird am Tisch. */
export function recharges(m) {
  return [...String(m?.text || '').matchAll(/(?:^|\n)([^\n.(]+?) \(Recharge (\d)(?:[-–](\d))?\)/g)].map(x => ({ n: x[1].trim(), r: x[3] ? `${x[2]}–${x[3]}` : x[2] }));
}
function monsterExtras(m) {
  const out = {};
  if (/(^|\n)Legendary Actions(\n|$)/.test(m.text || '')) out.la = { max: 3, used: 0 };
  // 2024: Zauber „N/Day each“, je Zauber ein Zähler (ältere Werteblöcke: Plätze pro Grad)
  const perDay = [...(m.text || '').matchAll(/(?:^|\n)(\d)\/Day each: ([^\n]+)/g)].flatMap(x => x[2].split(', ').map(n => ({ lbl: n.trim(), max: +x[1], used: 0 })));
  // Fähigkeiten mit „(3/Day)“ im Namen, z. B. Misty Step (3/Day)
  perDay.push(...[...(m.text || '').matchAll(/(?:^|\n)([^\n.(]+?) \((\d)\/Day\)\./g)].map(x => ({ lbl: x[1].trim(), max: +x[2], used: 0 })));
  const slots = [...perDay, ...[...(m.text || '').matchAll(/(\d)(?:st|nd|rd|th) level \((\d+) slots?\)/g)].map(x => ({ lvl: +x[1], max: +x[2], used: 0 }))];
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
/** Was Spieler über einen Gegner erfahren (Gestaltungskonzept 11.1): Name, Initiative, Zustände; HG nur, wenn nicht verborgen
 * (c.hideCr), RK nur, wenn freigegeben (c.showAc); „besiegt“ nur, wenn die Spielleitung es markiert (c.gone). Nie TP, Balken oder Stufen. */
const foePub = c => { const m = findMonster(c.mon), cr = m ? (m.cr === 0.125 ? '1/8' : m.cr === 0.25 ? '1/4' : m.cr === 0.5 ? '1/2' : String(m.cr)) : ''; return { s: c.gone || c.hp <= 0 ? 'down' : '', cr: c.hideCr ? '' : cr, ac: c.showAc ? String(c.ac ?? '') : '', c: Object.keys(c.cond || {}).filter(k => c.cond[k]).slice(0, 6), ty: m && m.type ? String(m.type).toLowerCase().split(' ')[0] : '' }; };
/** Läuft ein Kampf? Vorbereitung = Liste ohne aktiven Zug. */
export const fighting = () => !!D.combat.active && D.combat.list.some(c => c.id === D.combat.active);
/** Wer ist dran, wer kommt als Nächstes (für die Anzeige der Spielleitung, unabhängig vom Senden an Spieler). */
export function nowNext() {
  const list = ordered().filter(c => !out(c)), i = list.findIndex(c => c.id === D.combat.active);
  return i < 0 ? { cur: null, next: null } : { cur: list[i], next: list.length > 1 ? list[(i + 1) % list.length] : null };
}
/** Kampf beenden: Gegner raus, Spieler und Begleiter bleiben für den nächsten Kampf in der Liste. */
export function endFight() { D.combat.list = D.combat.list.filter(c => c.kind !== 'mon'); D.combat.round = 1; D.combat.active = null; DU.open = {}; }
/** Was die Spieler über den Zug erfahren: Name, bei Monstern dazu der Herausforderungsgrad, die Reihenfolge. */
export function turnInfo() {
  if (D.turns === false || !D.combat.active) return null;
  const list = ordered().filter(c => !out(c)), i = list.findIndex(c => c.id === D.combat.active);
  if (i < 0) return null;
  const cur = list[i], nx = list.length > 1 ? list[(i + 1) % list.length] : null, pc = c => c && c.kind === 'pc';
  const cr = c => { const m = c && c.kind === 'mon' && !c.hideCr && findMonster(c.mon); return m ? (m.cr === 0.125 ? '1/8' : m.cr === 0.25 ? '1/4' : m.cr === 0.5 ? '1/2' : String(m.cr)) : ''; };
  const order = ordered().slice(0, 24).map(c => ({ n: c.name, pc: c.kind !== 'mon', k: c.kind === 'pc' ? c.live || '' : '', ...(c.kind === 'mon' ? foePub(c) : { s: '' }), cur: c.id === cur.id, i: c.kind === 'pet' ? '' : String(c.init ?? ''), nx: !!nx && c.id === nx.id }));
  return { r: D.combat.round, cur: cur.live || '', name: cur.name, enemy: !pc(cur), cr: cr(cur), next: nx ? nx.name : '', nextEnemy: !!nx && !pc(nx), nextCr: cr(nx), order };
}
/** Ein Spieler beendet seinen Zug. Gilt nur, wenn er wirklich gerade dran ist. */
export function endTurnFrom(key) {
  const c = D.combat.active && find(D.combat.active);
  if (D.turns === false || !c || !key || c.live !== key) return null;
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
  const c = find(id);
  D.combat.list = D.combat.list.filter(x => x.id !== id && !(c && c.kind === 'pc' && c.live && x.kind === 'pet' && x.live === c.live));
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
export const xpOf = cr => XP[cr] ?? 0;
/** XP der besiegten Monster im laufenden Kampf (TP 0). */
export function defeatedXp() {
  const gone = D.combat.list.filter(c => c.kind === 'mon' && c.hp <= 0);
  return { list: gone, xp: gone.reduce((a, c) => a + xpOf(findMonster(c.mon)?.cr), 0) };
}
export const partySize = () => D.party.reduce((a, p) => a + (+p.count || 0), 0);
/** XP-Budget je Charakter nach DMG 2024: niedrig, mittel, hoch. */
const BUDGET = [null, [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500], [500, 750, 1100], [600, 1000, 1400], [750, 1300, 1700], [1000, 1700, 2100], [1300, 2000, 2600], [1600, 2300, 3100], [1900, 2900, 4100], [2200, 3700, 4700], [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800], [3800, 6100, 9800], [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000]];
export const thresholds = () => D.party.reduce((t, p) => { const r = BUDGET[clamp(+p.level || 1, 1, 20)]; return t.map((v, i) => v + r[i] * (+p.count || 0)); }, [0, 0, 0]);
/** Schwierigkeit nach den DMG-Regeln: Grund-XP mal Faktor nach Monsterzahl und Gruppengröße. */
export function rate(enc) {
  let n = 0, xp = 0;
  enc.monsters.forEach(e => { const m = findMonster(e.id); if (m) { n += e.qty; xp += xpOf(m.cr) * e.qty; } });
  // 2024: kein Faktor für die Anzahl der Monster; das Budget der gewählten Schwierigkeit ist die Obergrenze
  const th = thresholds();
  const level = !n ? 'none' : xp > th[2] ? 'over' : xp > th[1] ? 'high' : xp > th[0] ? 'moderate' : 'low';
  const budget = level === 'over' ? th[2] : level === 'high' ? th[2] : level === 'moderate' ? th[1] : th[0];
  return { n, xp, mult: 1, adj: xp, level, budget };
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
/** Auswahl vor dem Start: nur die angehakten Zeilen mit ihrer Anzahl. Die vorbereitete Begegnung bleibt unverändert. */
export function startPicked(rows) { startMonsters(rows.filter(r => r.on && r.qty > 0).map(r => ({ id: r.id, qty: r.qty }))); }
export function pickRows(src, id) {
  const list = src === 'enc' ? D.encounters.find(x => x.id === id)?.monsters : D.notes.find(x => x.id === id)?.monsters;
  return (list || []).filter(m => findMonster(m.id)).map(m => ({ id: m.id, qty: m.qty, on: true }));
}
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
const petRow = (p, x) => ({ ...base(), kind: 'pet', live: p.key, pet: x.id, owner: p.name, name: x.n, ac: x.ac, hp: x.hp, hpMax: x.hpMax });
/** Verbundene Spieler (alle oder nur einen) mit ihren Begleitern in den Kampf holen. */
/** Wirkungen, die die Spielleitung auf Spieler legt (z. B. Bane eines Gegners). Bleiben, bis sie entfernt werden. */
export function dmBuff(s, key) {
  D.buffsOut = (D.buffsOut || []).filter(b => !(b.s === s && b.to.includes(key)));
  D.buffsOut.push({ id: uid(), s, to: [key], v: s === 'Aid' ? 5 : s === 'Heroism' ? 3 : 0 });
}
export const dmBuffsFor = key => (D.buffsOut || []).filter(b => b.to.includes(key));
export function dmBuffDrop(id) { D.buffsOut = (D.buffsOut || []).filter(b => b.id !== id); }
export function addLive(peers, key) {
  const have = new Set(D.combat.list.filter(c => c.kind === 'pc').map(c => c.live));
  peers.filter(p => !have.has(p.key) && (!key || p.key === key)).forEach(p => {
    D.combat.list.push({ ...base(), kind: 'pc', live: p.key, name: p.name, ac: p.ac, acB: p.acB || 0, fx: p.fx || [], hp: p.hp, hpMax: p.hpMax, tmp: p.tmp, conc: p.conc, cond: Object.fromEntries(p.cond.map(c => [c, true])) });
    (p.pets || []).forEach(x => D.combat.list.push(petRow(p, x)));
  });
}
export const inCombat = key => D.combat.list.some(c => c.kind === 'pc' && c.live === key);
/** Hält verknüpfte Spieler im Tracker aktuell. */
export function syncLive(peers) {
  let changed = false;
  // Neue Begleiter (z. B. Primal Companion, erst nach dem Kampfbeitritt angelegt) direkt unter ihren Spieler setzen
  D.combat.list.filter(c => c.kind === 'pc' && c.live).forEach(c => {
    const p = peers.find(x => x.key === c.live);
    (p?.pets || []).forEach(x => { if (!D.combat.list.some(y => y.kind === 'pet' && y.live === c.live && y.pet === x.id)) { D.combat.list.push(petRow(p, x)); changed = true; } });
  });
  D.combat.list.forEach(c => {
    const p0 = c.live && peers.find(x => x.key === c.live);
    if (!p0) return;
    // D3: Schätzwerte (noch verschlüsselt) überschreiben die TP im Kampf nicht
    const p = p0.est ? { ...p0, hp: c.hp, hpMax: c.hpMax, tmp: c.tmp } : p0;
    if (c.kind === 'pet') {
      const x0 = (p.pets || []).find(y => y.id === c.pet), x = x0 && x0.est ? { ...x0, hp: c.hp, hpMax: c.hpMax } : x0;
      if (x && (c.hp !== x.hp || c.hpMax !== x.hpMax || c.ac !== x.ac || c.name !== x.n)) { Object.assign(c, { hp: x.hp, hpMax: x.hpMax, ac: x.ac, name: x.n }); changed = true; }
      return;
    }
    const cond = Object.fromEntries(p.cond.map(x => [x, true]));
    if (c.hp !== p.hp || c.hpMax !== p.hpMax || c.ac !== p.ac || c.tmp !== p.tmp || c.conc !== p.conc || c.acB !== (p.acB || 0) || JSON.stringify(c.fx || []) !== JSON.stringify(p.fx || []) || JSON.stringify(c.cond) !== JSON.stringify(cond)) { Object.assign(c, { hp: p.hp, hpMax: p.hpMax, ac: p.ac, acB: p.acB || 0, fx: p.fx || [], tmp: p.tmp, conc: p.conc, cond }); changed = true; }
  });
  // Neue Begleiter eines Spielers, der schon im Kampf ist, kommen dazu.
  peers.forEach(p => {
    if (!D.combat.list.some(c => c.kind === 'pc' && c.live === p.key)) return;
    (p.pets || []).forEach(x => { if (!D.combat.list.some(c => c.kind === 'pet' && c.live === p.key && c.pet === x.id)) { D.combat.list.push(petRow(p, x)); changed = true; } });
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
/** Atlas für Spieler: nur ausdrücklich freigegebene Orte, Personen und Handlung, nur Titel und der eigene Spielertext (nie die Notiz). */
/** Gemeinsame Chronik: nur Sitzungs- und Handlungsnotizen, die ausdrücklich geteilt sind, und nur Titel und Gruppentext. */
export const chronOut = () => D.notes.filter(n => n.pub && ['session', 'plot'].includes(n.kind)).slice(0, 100).map(n => ({ id: String(n.id).slice(0, 40), t: String(n.title || '').slice(0, 120), x: String(n.pubText || '').slice(0, 4000), k: n.kind }));
/** Kurzer Fingerabdruck der geteilten Chronik für die Presence (Spieler holen sie, wenn er sich ändert). */
/** Hausregeln der Kampagne (für alle Spieler sichtbar, gehen mit der gemeinsamen Chronik hinaus). */
export const houseOut = () => (D.house || []).slice(0, 60).map(r => ({ id: String(r.id).slice(0, 40), t: String(r.t || '').slice(0, 120), x: String(r.x || '').slice(0, 2000) }));
export function chronMark() { const s = JSON.stringify([chronOut(), houseOut()]); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return s.length > 7 ? (h >>> 0).toString(36) : ''; }
export const atlasOut = () => D.notes.filter(n => n.pub && ['place', 'npc', 'plot'].includes(n.kind)).slice(0, 16).map(n => ({ t: String(n.title || '').slice(0, 80), d: String(n.pubText || '').slice(0, 300), k: n.kind, h: D.here === n.id }));
/* ---- Händler (je Kampagne) ----
   Ein Händler: Name, offen (für Spieler sichtbar), Waren mit Katalogschlüssel oder eigenem Namen, Preis in Kupfer, Bestand. */
export function addMerchant(name) { const m = { id: uid(), n: String(name || '').slice(0, 60) || t('shop.merchantNew'), open: false, items: [] }; D.merchants.push(m); return m; }
export const merchant = id => (D.merchants || []).find(m => m.id === id);
export function addWare(mid, key, qty, own) {
  const m = merchant(mid); if (!m) return;
  const c = key && BYN[key], cp = c ? (+c.cp || +c.cpMin || 0) : 0;
  m.items.push({ id: uid(), k: c ? key : '', n: c ? c.n : String(own || '').slice(0, 80), cp, q: Math.max(0, Math.min(999, Math.floor(+qty) || 1)) });
}
/** Verkauf an einen Spieler: Bestand −1, kurzer Verlauf. Liefert die Ware oder null. */
export function sellWare(mid, wid, who) {
  const w = merchant(mid)?.items.find(x => x.id === wid);
  if (!w || w.q <= 0) return null;
  w.q -= 1;
  D.sales = [{ who, n: w.n, cp: w.cp, m: mid, at: new Date().toISOString() }, ...(D.sales || [])].slice(0, 20);
  return w;
}
/** Für die Presence: nur geöffnete Händler, Waren mit Preis und Bestand. */
export const shopOut = () => (D.merchants || []).filter(m => m.open).slice(0, 4).map(m => ({ id: m.id, n: m.n, it: m.items.slice(0, 30).map(w => ({ id: w.id, k: w.k, n: w.n, cp: w.cp, q: w.q })) }));
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
  const { kind, ...rest } = o, mine = D.custom;
  D = normD({ ...rest, only: D.only, view: D.view, on: true });
  D.custom = mergeCustom(mine, D.custom);
  saveD();
  return true;
}
