// Angriffswerte: Übung nach Klasse und Volk (PHB 2014), Kampfstile, waffenloser Schlag.
import { S } from './state.js';
import { mod, sg } from './util.js';
import { BYN } from './catalog.js';
import { REF_ALIAS } from './ref-alias.js';
import { classLevels } from './tables.js';
import { t, dice } from './i18n/index.js';
import { itemView, isShield } from './helpers.js';

const AMMO = /Munition|Ammunition/i, TWO = /Two-Handed|Zweihändig/i, HEAVY = /Heavy|Schwer/i, FINESSE = /Finesse/i;
const SIMPLE = ['simple'], ALL = ['simple', 'martial'];
// Regeln 2024: alle Klassen einfache Waffen; Mönch dazu leichte Kriegs-Nahkampfwaffen, Schurke Kriegswaffen mit Finesse oder Leicht
const CLASS_W = {
  Barbarian: { g: ALL }, Bard: { g: SIMPLE }, Cleric: { g: SIMPLE }, Druid: { g: SIMPLE },
  Fighter: { g: ALL }, Monk: { g: SIMPLE, light: true }, Paladin: { g: ALL }, Ranger: { g: ALL },
  Rogue: { g: SIMPLE, fl: true }, Sorcerer: { g: SIMPLE }, Warlock: { g: SIMPLE }, Wizard: { g: SIMPLE },
};
// Kriegswaffen durch Unterklasse oder Ordenswahl (Divine Order: Protector, Primal Order: Warden)
const SUB_MARTIAL = ['College of Valor', 'College of Swords'];
const LIGHT = /\b(Light|Leicht)\b/;
// Beim Multiclassing bringt eine weitere Klasse weniger Übungen mit als als Startklasse.
const MULTI_W = { Barbarian: { g: ALL }, Fighter: { g: ALL }, Paladin: { g: ALL }, Ranger: { g: ALL }, Monk: { g: SIMPLE, w: ['shortsword'] }, Warlock: { g: SIMPLE } };
const ELF_W = ['longsword', 'shortsword', 'shortbow', 'longbow'];
const RACE_W = { Dwarf: ['battleaxe', 'handaxe', 'light-hammer', 'warhammer'], 'High Elf': ELF_W, 'Wood Elf': ELF_W, Drow: ['rapier', 'shortsword', 'hand-crossbow'] };

const refOf = r => REF_ALIAS[r] || r;
const refId = raw => { const r = raw.ref && refOf(raw.ref); return r && r.startsWith('item:') ? r.slice(5) : ''; };
const groupOf = raw => (raw.ref ? BYN[raw.ref]?.group : undefined);
const styled = n => S.feats.some(f => f.n === n);

/** Ohne Klasse oder bei Waffen außerhalb des Katalogs bleibt es bei der Annahme „geübt“. */
function classProf(raw) {
  const id = refId(raw), g = groupOf(raw);
  if (!S.klass || !id || !ALL.includes(g)) return true;
  const p = BYN[raw.ref]?.p || '', melee = !AMMO.test(p) && !/Thrown|Wurf/.test(p.split('·')[0] || '');
  const ok = e => !!e && ((e.g || []).includes(g) || (e.w || []).includes(id) || (g === 'martial' && ((e.light && LIGHT.test(p) && melee) || (e.fl && (LIGHT.test(p) || FINESSE.test(p))))));
  if (g === 'martial' && (['Protector', 'Warden'].includes(S.order) || classLevels().some(c => SUB_MARTIAL.includes(c.sub)))) return true;
  return ok(CLASS_W[S.klass]) || (S.multi || []).some(m => ok(MULTI_W[m.k])) || (RACE_W[S.race] || []).includes(id) || (RACE_W[S.subrace] || []).includes(id);
}
// Welche Munition eine Fernkampfwaffe verbraucht (Katalogschlüssel).
const AMMO_OF = { shortbow: 'item:arrows', longbow: 'item:arrows', 'light-crossbow': 'item:bolts', 'heavy-crossbow': 'item:bolts', 'hand-crossbow': 'item:bolts', sling: 'item:bullets-sling', blowgun: 'item:needles', musket: 'item:bullets-firearm', pistol: 'item:bullets-firearm' };
export const ammoFor = raw => AMMO_OF[refId(raw)] || '';
/** Munition im Rucksack: Anzahl und Plätze der Stapel. */
const AMMO_NAME = { 'item:arrows': /^(pfeile?|arrows?)\b/i, 'item:bolts': /^(armbrust)?bolzen|^(crossbow )?bolts?\b/i, 'item:bullets-sling': /schleuder\s*kugel|sling bullets?/i, 'item:needles': /blasrohr\s*nadel|^nadeln?\b|needles?/i, 'item:bullets-firearm': /firearm bullets?|kugeln?\b.*feuerwaffe/i };
/** Ist dieser Gegenstand Munition (Katalog oder eigener Stapel mit passendem Namen)? */
export const isAmmoItem = it => !!it && (/^item:(arrows|bolts|bullets|needles)/.test(it.ref || '') || (!it.ref && Object.values(AMMO_NAME).some(r => r.test(it.n || ''))));
export function ammoLeft(ref) { const at = []; let n = 0; const nm = AMMO_NAME[ref]; S.bag.forEach((it, i) => { if (it && ((it.ref && refOf(it.ref) === ref) || (!it.ref && nm && nm.test(it.n || '')))) { n += it.q || 0; at.push(i); } }); return { n, at }; }
export const weaponProf = raw => (raw.prof != null ? !!raw.prof : classProf(raw));

const monkLevel = () => classLevels().find(c => c.k === 'Monk')?.lvl || 0;
// 2024: Kampfkunstwürfel W6, W8 ab Stufe 5, W10 ab 11, W12 ab 17
const martialDie = l => (l >= 17 ? '1d12' : l >= 11 ? '1d10' : l >= 5 ? '1d8' : '1d6');
const sides = d => +(String(d).match(/[Wd](\d+)/)?.[1] || 1);

const DMG = { Hieb: 'slashing', Stich: 'piercing', Wucht: 'bludgeoning', slashing: 'slashing', piercing: 'piercing', bludgeoning: 'bludgeoning' };

export function atk(raw, hand = 'main') {
  const it = itemView(raw);
  const m = it.p.match(/(\d+[Wd]\d+|\b1\b) (Hieb|Stich|Wucht|slashing|piercing|bludgeoning)/i);
  if (!m) return null;
  const st = mod(S.abil.str), dx = mod(S.abil.dex);
  const ranged = AMMO.test(it.p) || refId(raw) === 'dart', twoH = TWO.test(it.p);
  const monk = monkLevel();
  // Mönchswaffen 2024: einfache Nahkampfwaffen und Kriegs-Nahkampfwaffen mit Leicht
  const monkWeapon = monk > 0 && !ranged && (groupOf(raw) === 'simple' || (groupOf(raw) === 'martial' && LIGHT.test(it.p))) && !(twoH && HEAVY.test(it.p));
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
