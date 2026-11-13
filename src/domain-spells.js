// Immer vorbereitete Zauber aus Unterklassen (PHB 2014): Domänenzauber (Kleriker) und Eidzauber (Paladin).
// Schlüssel = Klassenstufe, ab der die Zauber dazukommen. Nur Zaubernamen, keine Texte.
import { S, spFrom } from './state.js';
import { BYN } from './catalog.js';
import { classLevels } from './tables.js';

const CLERIC = {
  'Knowledge Domain': { 1: ['Command', 'Identify'], 3: ['Augury', 'Suggestion'], 5: ['Nondetection', 'Speak with Dead'], 7: ['Arcane Eye', 'Confusion'], 9: ['Legend Lore', 'Scrying'] },
  'Life Domain': { 1: ['Bless', 'Cure Wounds'], 3: ['Lesser Restoration', 'Spiritual Weapon'], 5: ['Beacon of Hope', 'Revivify'], 7: ['Death Ward', 'Guardian of Faith'], 9: ['Mass Cure Wounds', 'Raise Dead'] },
  'Light Domain': { 1: ['Burning Hands', 'Faerie Fire'], 3: ['Flaming Sphere', 'Scorching Ray'], 5: ['Daylight', 'Fireball'], 7: ['Guardian of Faith', 'Wall of Fire'], 9: ['Flame Strike', 'Scrying'] },
  'Nature Domain': { 1: ['Animal Friendship', 'Speak with Animals'], 3: ['Barkskin', 'Spike Growth'], 5: ['Plant Growth', 'Wind Wall'], 7: ['Dominate Beast', 'Grasping Vine'], 9: ['Insect Plague', 'Tree Stride'] },
  'Tempest Domain': { 1: ['Fog Cloud', 'Thunderwave'], 3: ['Gust of Wind', 'Shatter'], 5: ['Call Lightning', 'Sleet Storm'], 7: ['Control Water', 'Ice Storm'], 9: ['Destructive Wave', 'Insect Plague'] },
  'Trickery Domain': { 1: ['Charm Person', 'Disguise Self'], 3: ['Mirror Image', 'Pass without Trace'], 5: ['Blink', 'Dispel Magic'], 7: ['Dimension Door', 'Polymorph'], 9: ['Dominate Person', 'Modify Memory'] },
  'War Domain': { 1: ['Divine Favor', 'Shield of Faith'], 3: ['Magic Weapon', 'Spiritual Weapon'], 5: ["Crusader's Mantle", 'Spirit Guardians'], 7: ['Freedom of Movement', 'Stoneskin'], 9: ['Flame Strike', 'Hold Monster'] },
};
const PALADIN = {
  'Oath of Devotion': { 3: ['Protection from Evil and Good', 'Sanctuary'], 5: ['Lesser Restoration', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike'] },
  'Oath of the Ancients': { 3: ['Ensnaring Strike', 'Speak with Animals'], 5: ['Moonbeam', 'Misty Step'], 9: ['Plant Growth', 'Protection from Energy'], 13: ['Ice Storm', 'Stoneskin'], 17: ['Commune with Nature', 'Tree Stride'] },
  'Oath of Vengeance': { 3: ['Bane', "Hunter's Mark"], 5: ['Hold Person', 'Misty Step'], 9: ['Haste', 'Protection from Energy'], 13: ['Banishment', 'Dimension Door'], 17: ['Hold Monster', 'Scrying'] },
};
export const ALWAYS = { Cleric: CLERIC, Paladin: PALADIN };

const byLower = () => { const m = {}; Object.values(BYN).forEach(e => { if (e.k === 'spell') m[e.n.toLowerCase()] = e; }); return m; };
/** Alle immer vorbereiteten Zauber, die der Charakter auf seiner Stufe haben müsste. */
export function alwaysFor(list = classLevels()) {
  const out = [];
  list.forEach(c => { const t = ALWAYS[c.k]?.[c.sub]; if (t) Object.entries(t).forEach(([l, ns]) => { if (c.lvl >= +l) out.push(...ns); }); });
  return [...new Set(out)];
}
/** Trägt fehlende Domänen- und Eidzauber als „immer vorbereitet“ ein. Liefert die Zahl der Änderungen. */
export function syncAlwaysSpells() {
  const names = alwaysFor();
  if (!names.length) return 0;
  const cat = byLower();
  let changed = 0;
  names.forEach(n => {
    const have = S.spells.find(s => s.n.toLowerCase() === n.toLowerCase());
    if (have) { if (!have.always) { have.always = true; changed++; } return; }
    const c = cat[n.toLowerCase()];
    if (c) { S.spells.push({ ...spFrom(c), always: true }); changed++; }
  });
  return changed;
}
