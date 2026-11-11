// Was Zustände, Erschöpfung und Rüstung gerade bewirken (PHB 2014, Anhang A und Kapitel 5).
// Liefert Gründe statt nur Ja/Nein, damit der Bogen an jeder Stelle sagen kann, woher ein Vor- oder Nachteil kommt.
import items from '../data/items.json';
import { S } from './state.js';
import { isShield } from './helpers.js';
import { t } from './i18n/index.js';

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
    speed: { base: S.speed, val: S.speed, zero: [], half: [], minus: [] }, hpHalf: '', noAct: [], noCast: [], vs: { adv: [], dis: [], crit: [], meleeAdv: [], rangedDis: [] },
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
  // Erschöpfung wirkt kumulativ
  if (ex >= 1) e.checks.push(X(1));
  if (ex >= 2) e.speed.half.push(X(2));
  if (ex >= 3) { e.atk.dis.push(X(3)); AB.forEach(a => e.saves[a].dis.push(X(3))); }
  if (ex >= 4) e.hpHalf = X(4);
  if (ex >= 5) e.speed.zero.push(X(5));
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
  let v = S.speed;
  if (e.speed.minus.length) v = Math.max(0, v - 3);
  if (e.speed.half.length) v = v / 2;
  if (e.speed.zero.length) v = 0;
  e.speed.val = v;
  return e;
}
/** Wirksames Trefferpunktmaximum (Erschöpfung 4 halbiert es). */
export const hpMaxNow = () => ((S.exh || 0) >= 4 ? Math.floor(S.hpMax / 2) : S.hpMax);
/** Vor- und Nachteil zusammengefasst: 'adv', 'dis', 'both' oder ''. */
export const rollState = (adv, dis) => (adv.length && dis.length ? 'both' : adv.length ? 'adv' : dis.length ? 'dis' : '');
export const anyEffect = e => !!(e.atk.adv.length || e.atk.dis.length || e.checks.length || e.checkAb.str.length || e.stealth.length || e.sight.length || e.hear.length || e.speed.val !== e.speed.base || e.hpHalf || e.noAct.length || e.noCast.length || e.vs.adv.length || e.vs.dis.length || e.vs.meleeAdv.length || AB.some(a => e.saves[a].fail.length || e.saves[a].dis.length));
