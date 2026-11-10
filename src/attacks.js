// Angriffswerte: Übung nach Klasse und Volk (PHB 2014), Kampfstile, waffenloser Schlag.
import { S } from './state.js';
import { mod, sg } from './util.js';
import { BYN } from './catalog.js';
import { classLevels } from './tables.js';
import { t, dice } from './i18n/index.js';
import { itemView, isShield } from './helpers.js';

const SIMPLE = ['simple'], ALL = ['simple', 'martial'];
const ROGUE_W = ['crossbow-hand', 'longsword', 'rapier', 'shortsword'];
const CASTER_W = ['dagger', 'dart', 'sling', 'quarterstaff', 'crossbow-light'];
const CLASS_W = {
  Barbarian: { g: ALL }, Bard: { g: SIMPLE, w: ROGUE_W }, Cleric: { g: SIMPLE },
  Druid: { w: ['club', 'dagger', 'dart', 'javelin', 'mace', 'quarterstaff', 'scimitar', 'sickle', 'sling', 'spear'] },
  Fighter: { g: ALL }, Monk: { g: SIMPLE, w: ['shortsword'] }, Paladin: { g: ALL }, Ranger: { g: ALL },
  Rogue: { g: SIMPLE, w: ROGUE_W }, Sorcerer: { w: CASTER_W }, Warlock: { g: SIMPLE }, Wizard: { w: CASTER_W },
};
// Beim Multiclassing bringt eine weitere Klasse weniger Übungen mit als als Startklasse.
const MULTI_W = { Barbarian: { g: ALL }, Fighter: { g: ALL }, Paladin: { g: ALL }, Ranger: { g: ALL }, Monk: { g: SIMPLE, w: ['shortsword'] }, Warlock: { g: SIMPLE } };
const ELF_W = ['longsword', 'shortsword', 'shortbow', 'longbow'];
const RACE_W = { Dwarf: ['battleaxe', 'handaxe', 'light-hammer', 'warhammer'], 'High Elf': ELF_W, 'Wood Elf': ELF_W, Drow: ['rapier', 'shortsword', 'crossbow-hand'] };

const refId = raw => (raw.ref && raw.ref.startsWith('item:') ? raw.ref.slice(5) : '');
const groupOf = raw => (raw.ref ? BYN[raw.ref]?.group : undefined);
const styled = n => S.feats.some(f => f.n === n);

/** Ohne Klasse oder bei Waffen außerhalb des Katalogs bleibt es bei der Annahme „geübt“. */
function classProf(raw) {
  const id = refId(raw), g = groupOf(raw);
  if (!S.klass || !id || !ALL.includes(g)) return true;
  const ok = e => !!e && ((e.g || []).includes(g) || (e.w || []).includes(id));
  return ok(CLASS_W[S.klass]) || (S.multi || []).some(m => ok(MULTI_W[m.k])) || (RACE_W[S.race] || []).includes(id) || (RACE_W[S.subrace] || []).includes(id);
}
export const weaponProf = raw => (raw.prof != null ? !!raw.prof : classProf(raw));

const monkLevel = () => classLevels().find(c => c.k === 'Monk')?.lvl || 0;
const martialDie = l => (l >= 17 ? '1d10' : l >= 11 ? '1d8' : l >= 5 ? '1d6' : '1d4');
const sides = d => +(String(d).match(/[Wd](\d+)/)?.[1] || 1);

const DMG = { Hieb: 'slashing', Stich: 'piercing', Wucht: 'bludgeoning', slashing: 'slashing', piercing: 'piercing', bludgeoning: 'bludgeoning' };
const AMMO = /Munition|Ammunition/i, TWO = /Two-Handed|Zweihändig/i, HEAVY = /Heavy|Schwer/i, FINESSE = /Finesse/i;

export function atk(raw, hand = 'main') {
  const it = itemView(raw);
  const m = it.p.match(/(\d+[Wd]\d+|\b1\b) (Hieb|Stich|Wucht|slashing|piercing|bludgeoning)/i);
  if (!m) return null;
  const st = mod(S.abil.str), dx = mod(S.abil.dex);
  const ranged = AMMO.test(it.p) || refId(raw) === 'dart', twoH = TWO.test(it.p);
  const monk = monkLevel();
  const monkWeapon = monk > 0 && !ranged && !twoH && !HEAVY.test(it.p) && (groupOf(raw) === 'simple' || refId(raw) === 'shortsword');
  const am = AMMO.test(it.p) ? dx : (FINESSE.test(it.p) || monkWeapon) ? Math.max(st, dx) : st;
  const plus = +((it.n.match(/\+(\d)/) || [])[1] || 0);
  const prof = weaponProf(raw), tags = [];

  let die = m[1];
  if (monkWeapon && sides(martialDie(monk)) > sides(die)) die = martialDie(monk);
  if (monkWeapon) tags.push(t('atk.monk'));

  const archery = ranged && styled('Archery') ? 2 : 0;
  if (archery) tags.push('Archery +2');

  const other = hand === 'off' ? S.eq.main : S.eq.off;
  const dueling = !ranged && !twoH && styled('Dueling') && (!other || isShield(other)) ? 2 : 0;
  if (dueling) tags.push('Dueling +2');

  // Ein Angriff mit der zweiten Waffe bekommt den Attributsbonus nur mit Two-Weapon Fighting.
  const offAttack = hand === 'off' && !!S.eq.main && !isShield(S.eq.main) && !isShield(raw);
  const twf = offAttack && styled('Two-Weapon Fighting');
  if (twf) tags.push('Two-Weapon Fighting');
  const abilDmg = offAttack && !twf ? Math.min(am, 0) : am;

  if (styled('Great Weapon Fighting') && !ranged && (twoH || /Versatile|Vielseitig/i.test(it.p))) tags.push(t('atk.gwf'));

  const bonus = abilDmg + plus;
  const v = it.p.match(/(?:Vielseitig|Versatile) \((\d+[Wd]\d+)\)/i);
  return {
    hit: sg(am + (prof ? S.prof : 0) + plus + archery),
    dmg: dice(die) + (bonus + dueling ? sg(bonus + dueling) : ''),
    type: t('dmg.' + (DMG[m[2]] || DMG[m[2].toLowerCase()])),
    vers: v ? dice(v[1]) + (bonus ? sg(bonus) : '') : '',
    prof, tags,
  };
}

/** Waffenloser Schlag: 1 + ST, beim Monk Kampfkünste-Würfel und das bessere aus ST und GE. */
export function unarmed() {
  const st = mod(S.abil.str), dx = mod(S.abil.dex), monk = monkLevel();
  const am = monk ? Math.max(st, dx) : st;
  const die = monk ? martialDie(monk) : styled('Tavern Brawler') ? '1d4' : '';
  return {
    hit: sg(am + S.prof),
    dmg: die ? dice(die) + (am ? sg(am) : '') : String(Math.max(0, 1 + am)),
    type: t('dmg.bludgeoning'),
    tags: monk ? [t('atk.monk')] : [],
  };
}
