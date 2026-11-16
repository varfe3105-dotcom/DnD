// Was Zustände, Erschöpfung und Rüstung gerade bewirken (PHB 2014, Anhang A und Kapitel 5).
// Liefert Gründe statt nur Ja/Nein, damit der Bogen an jeder Stelle sagen kann, woher ein Vor- oder Nachteil kommt.
import items from '../data/items.json';
import { S } from './state.js';
import { isShield } from './helpers.js';
import { classLevels } from './tables.js';
import { t } from './i18n/index.js';
import { hasted, myBuffs } from './buffs.js';

const ARMOR = Object.fromEntries(items.filter(i => i.ac && !i.ac.shield).map(i => [i.id, { cat: i.ac.cat, str: +(i.text.en.match(/STR (\d+)/) || [])[1] || 0, stealth: /Disadvantage on Stealth/.test(i.text.en) }]));
// Rüstungsübung als Startklasse und beim Multiclassing (L = leicht, M = mittel, H = schwer, S = Schild).
const START = { Barbarian: 'LMS', Bard: 'L', Cleric: 'LMS', Druid: 'LMS', Fighter: 'LMHS', Monk: '', Paladin: 'LMHS', Ranger: 'LMS', Rogue: 'L', Sorcerer: '', Warlock: 'L', Wizard: '' };
const MULTI = { Barbarian: 'S', Bard: 'L', Cleric: 'LMS', Druid: 'LMS', Fighter: 'LMS', Monk: '', Paladin: 'LMS', Ranger: 'LMS', Rogue: 'L', Sorcerer: '', Warlock: 'L', Wizard: '' };
const SUB = { 'College of Valor': 'MS', 'Life Domain': 'H', 'Nature Domain': 'H', 'Tempest Domain': 'H', 'War Domain': 'H' };
const FEAT = { 'Lightly Armored': 'L', 'Moderately Armored': 'MS', 'Heavily Armored': 'H' };
const CAT = { Light: 'L', Medium: 'M', Heavy: 'H' };

function armorProfs() {
  if (!S.klass) return null; // ohne Klasse keine Aussage, wie bei den Waffen
  let p = START[S.klass] || '';
  (S.multi || []).forEach(m => { p += MULTI[m.k] || ''; });
  [S.sub, ...(S.multi || []).map(m => m.sub)].forEach(s => { p += SUB[s] || ''; });
  if (S.subrace === 'Mountain Dwarf') p += 'LM';
  S.feats.forEach(f => { p += FEAT[f.n] || ''; });
  return p;
}
const armorOf = raw => {
  const id = raw && raw.ref && raw.ref.startsWith('item:') ? raw.ref.slice(5) : '';
  return ARMOR[id] || null;
};

const INCAP = ['Incapacitated', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious'];
const NO_MOVE = ['Grappled', 'Restrained', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious'];
const AB = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

/** Alle Wirkungen mit Gründen. Leere Listen heißen: nichts zu beachten. */
export function effects() {
  const on = n => !!S.cond[n], ex = S.exh || 0, X = n => t('fx.exh', { n });
  const all = c => c.filter(on);
  const e = {
    atk: { adv: [], dis: [] }, saves: Object.fromEntries(AB.map(a => [a, { fail: [], dis: [] }])),
    checks: [], checkAb: { str: [], dex: [] }, stealth: [], sight: [], hear: [],
    speed: { base: S.speed, norm: S.speed, val: S.speed, zero: [], half: [], minus: [], plus: [] }, d20: 0, d20Why: '', grapAtk: [], init: { adv: [], dis: [] }, noConc: [], dead: '', hpHalf: '', noAct: [], noCast: [], vs: { adv: [], dis: [], crit: [], meleeAdv: [], rangedDis: [] },
  };
  // Zustände
  all(['Blinded', 'Frightened', 'Poisoned', 'Prone', 'Restrained']).forEach(n => e.atk.dis.push(n));
  if (on('Invisible')) e.atk.adv.push('Invisible');
  all(['Frightened', 'Poisoned']).forEach(n => e.checks.push(n));
  if (on('Blinded')) e.sight.push('Blinded');
  if (on('Deafened')) e.hear.push('Deafened');
  if (on('Restrained')) e.saves.dex.dis.push('Restrained');
  all(['Paralyzed', 'Petrified', 'Stunned', 'Unconscious']).forEach(n => { e.saves.str.fail.push(n); e.saves.dex.fail.push(n); });
  all(INCAP).forEach(n => e.noAct.push(n));
  all(NO_MOVE).forEach(n => e.speed.zero.push(n));
  all(['Blinded', 'Paralyzed', 'Petrified', 'Restrained', 'Stunned', 'Unconscious']).forEach(n => e.vs.adv.push(n));
  if (on('Invisible')) e.vs.dis.push('Invisible');
  all(['Paralyzed', 'Unconscious']).forEach(n => e.vs.crit.push(n));
  if (on('Prone')) { e.vs.meleeAdv.push('Prone'); e.vs.rangedDis.push('Prone'); }
  // Regeln 2024: Grappled gibt Nachteil gegen alle außer den Packenden, Incapacitated beendet Konzentration
  // und gibt Nachteil bei Initiative, Invisible gibt Vorteil bei Initiative.
  if (on('Grappled')) e.grapAtk.push('Grappled');
  all(INCAP).forEach(n => { e.noConc.push(n); e.init.dis.push(n); });
  if (on('Invisible')) e.init.adv.push('Invisible');
  // Erschöpfung 2024: −2 pro Stufe auf jeden W20-Test, −1,5 m Tempo pro Stufe, Stufe 6 ist der Tod
  if (ex >= 1) { e.d20 = 2 * Math.min(ex, 6); e.d20Why = X(ex); e.speed.minus.push(X(ex)); }
  if (ex >= 6) e.dead = X(6);
  // Rüstung
  const body = armorOf(S.eq.body), shield = isShield(S.eq.off), profs = armorProfs();
  if (body) {
    const label = t('fx.armor');
    const mam = body.cat === 'Medium' && S.feats.some(f => f.n === 'Medium Armor Master');
    if (body.stealth && !mam) e.stealth.push(label);
    if (body.str && S.abil.str < body.str && S.race !== 'Dwarf') e.speed.minus.push(t('fx.armorStr', { n: body.str }));
  }
  const noProf = [];
  if (profs != null && body && !profs.includes(CAT[body.cat])) noProf.push(t('fx.armorNoProf'));
  if (profs != null && shield && !profs.includes('S')) noProf.push(t('fx.shieldNoProf'));
  noProf.forEach(r => { e.atk.dis.push(r); e.checkAb.str.push(r); e.checkAb.dex.push(r); e.saves.str.dis.push(r); e.saves.dex.dis.push(r); e.noCast.push(r); });
  // Tempo
  // Tempo-Boni aus Klasse und Talenten (in Metern: 10 ft = 3 m)
  const lv = k => classLevels().filter(c => c.k === k).reduce((a, c) => a + (c.lvl || 0), 0);
  let plus = 0;
  const monk = lv('Monk');
  if (monk >= 2 && !S.eq.body && !shield) { const m = monk >= 18 ? 9 : monk >= 14 ? 7.5 : monk >= 10 ? 6 : monk >= 6 ? 4.5 : 3; plus += m; e.speed.plus.push('Unarmored Movement'); }
  if (lv('Barbarian') >= 5 && !(body && body.cat === 'Heavy')) { plus += 3; e.speed.plus.push('Fast Movement'); }
  if (S.feats.some(f => f.n === 'Mobile')) { plus += 3; e.speed.plus.push('Mobile'); }
  e.speed.norm = S.speed + plus;
  let v = e.speed.norm;
  if (ex >= 1) v = Math.max(0, v - 1.5 * Math.min(ex, 6));
  if (e.speed.minus.some(m => m !== X(ex))) v = Math.max(0, v - 3);
  if (e.speed.half.length) v = v / 2;
  if (hasted()) { v *= 2; e.speed.plus.push('Haste'); e.speed.norm *= 2; }
  if (e.speed.zero.length) v = 0;
  e.speed.val = v;
  e.buffs = myBuffs();
  return e;
}
/** Wirksames Trefferpunktmaximum (Erschöpfung 4 halbiert es). */
export const hpMaxNow = () => S.hpMax; // 2024: Erschöpfung senkt das TP-Maximum nicht mehr
/** Vor- und Nachteil zusammengefasst: 'adv', 'dis', 'both' oder ''. */
export const rollState = (adv, dis) => (adv.length && dis.length ? 'both' : adv.length ? 'adv' : dis.length ? 'dis' : '');
export const anyEffect = e => !!((e.buffs || []).length || e.atk.adv.length || e.atk.dis.length || e.d20 || e.grapAtk.length || e.init.adv.length || e.init.dis.length || e.noConc.length || e.dead || e.checks.length || e.checkAb.str.length || e.stealth.length || e.sight.length || e.hear.length || e.speed.val !== e.speed.norm || e.hpHalf || e.noAct.length || e.noCast.length || e.vs.adv.length || e.vs.dis.length || e.vs.meleeAdv.length || AB.some(a => e.saves[a].fail.length || e.saves[a].dis.length));
