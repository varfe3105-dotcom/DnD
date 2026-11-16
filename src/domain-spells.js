// Immer vorbereitete Zauber (Regeln 2024): Domänen, Eide, Unterklassen von Waldläufer und Barde; Schlüssel '' = die Klasse selbst.
// Knowledge, Nature und Tempest Domain sind noch die Listen aus dem PHB 2014 (gibt es 2024 nicht mehr), für ältere Bögen.
// Schlüssel = Klassenstufe, ab der die Zauber dazukommen. Nur Zaubernamen, keine Texte.
import { S, spFrom } from './state.js';
import { BYN } from './catalog.js';
import { classLevels } from './tables.js';

const CLERIC = {
  'Knowledge Domain': { 1: ['Command', 'Identify'], 3: ['Augury', 'Suggestion'], 5: ['Nondetection', 'Speak with Dead'], 7: ['Arcane Eye', 'Confusion'], 9: ['Legend Lore', 'Scrying'] },
  'Life Domain': { 3: ['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration'], 5: ['Mass Healing Word', 'Revivify'], 7: ['Aura of Life', 'Death Ward'], 9: ['Greater Restoration', 'Mass Cure Wounds'] },
  'Light Domain': { 3: ['Burning Hands', 'Faerie Fire', 'Scorching Ray', 'See Invisibility'], 5: ['Daylight', 'Fireball'], 7: ['Arcane Eye', 'Wall of Fire'], 9: ['Flame Strike', 'Scrying'] },
  'Nature Domain': { 1: ['Animal Friendship', 'Speak with Animals'], 3: ['Barkskin', 'Spike Growth'], 5: ['Plant Growth', 'Wind Wall'], 7: ['Dominate Beast', 'Grasping Vine'], 9: ['Insect Plague', 'Tree Stride'] },
  'Tempest Domain': { 1: ['Fog Cloud', 'Thunderwave'], 3: ['Gust of Wind', 'Shatter'], 5: ['Call Lightning', 'Sleet Storm'], 7: ['Control Water', 'Ice Storm'], 9: ['Destructive Wave', 'Insect Plague'] },
  'Trickery Domain': { 3: ['Charm Person', 'Disguise Self', 'Invisibility', 'Pass without Trace'], 5: ['Hypnotic Pattern', 'Nondetection'], 7: ['Confusion', 'Dimension Door'], 9: ['Dominate Person', 'Modify Memory'] },
  'War Domain': { 3: ['Guiding Bolt', 'Magic Weapon', 'Shield of Faith', 'Spiritual Weapon'], 5: ["Crusader's Mantle", 'Spirit Guardians'], 7: ['Fire Shield', 'Freedom of Movement'], 9: ['Hold Monster', 'Steel Wind Strike'] },
};
const PALADIN = {
  '': { 2: ['Divine Smite'], 5: ['Find Steed'] },
  'Oath of Devotion': { 3: ['Protection from Evil and Good', 'Shield of Faith'], 5: ['Aid', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike'] },
  'Oath of Glory': { 3: ['Guiding Bolt', 'Heroism'], 5: ['Enhance Ability', 'Magic Weapon'], 9: ['Haste', 'Protection from Energy'], 13: ['Compulsion', 'Freedom of Movement'], 17: ['Legend Lore', "Yolande's Regal Presence"] },
  'Oath of the Ancients': { 3: ['Ensnaring Strike', 'Speak with Animals'], 5: ['Moonbeam', 'Misty Step'], 9: ['Plant Growth', 'Protection from Energy'], 13: ['Ice Storm', 'Stoneskin'], 17: ['Commune with Nature', 'Tree Stride'] },
  'Oath of Vengeance': { 3: ['Bane', "Hunter's Mark"], 5: ['Hold Person', 'Misty Step'], 9: ['Haste', 'Protection from Energy'], 13: ['Banishment', 'Dimension Door'], 17: ['Hold Monster', 'Scrying'] },
};
const RANGER = {
  '': { 1: ["Hunter's Mark"] },
  'Gloom Stalker': { 3: ['Disguise Self'], 5: ['Rope Trick'], 9: ['Fear'], 13: ['Greater Invisibility'], 17: ['Seeming'] },
  'Fey Wanderer': { 3: ['Charm Person'], 5: ['Misty Step'], 9: ['Summon Fey'], 13: ['Dimension Door'], 17: ['Mislead'] },
};
const BARD = { '': { 20: ['Power Word Heal', 'Power Word Kill'] }, 'College of Glamour': { 3: ['Charm Person', 'Mirror Image'], 6: ['Command'] } };
const DRUID = {
  '': { 1: ['Speak with Animals'] },
  'Circle of the Moon': { 3: ['Cure Wounds', 'Moonbeam', 'Starry Wisp'], 5: ['Conjure Animals'], 7: ['Fount of Moonlight'], 9: ['Mass Cure Wounds'] },
  'Circle of the Sea': { 3: ['Fog Cloud', 'Gust of Wind', 'Ray of Frost', 'Shatter', 'Thunderwave'], 5: ['Lightning Bolt', 'Water Breathing'], 7: ['Control Water', 'Ice Storm'], 9: ['Conjure Elemental', 'Hold Monster'] },
  'Circle of the Stars': { 3: ['Guidance', 'Guiding Bolt'] },
};
// Circle of the Land: Zauber nach dem gewählten Gelände (S.land), Schlüssel = Druidenstufe
export const LAND = {
  arid: { 3: ['Blur', 'Burning Hands', 'Fire Bolt'], 5: ['Fireball'], 7: ['Blight'], 9: ['Wall of Stone'] },
  polar: { 3: ['Fog Cloud', 'Hold Person', 'Ray of Frost'], 5: ['Sleet Storm'], 7: ['Ice Storm'], 9: ['Cone of Cold'] },
  temperate: { 3: ['Misty Step', 'Shocking Grasp', 'Sleep'], 5: ['Lightning Bolt'], 7: ['Freedom of Movement'], 9: ['Tree Stride'] },
  tropical: { 3: ['Acid Splash', 'Ray of Sickness', 'Web'], 5: ['Stinking Cloud'], 7: ['Polymorph'], 9: ['Insect Plague'] },
};
const SORCERER = {
  'Aberrant Sorcery': { 3: ['Arms of Hadar', 'Calm Emotions', 'Detect Thoughts', 'Dissonant Whispers', 'Mind Sliver'], 5: ['Hunger of Hadar', 'Sending'], 7: ['Black Tentacles', 'Summon Aberration'], 9: ['Telepathic Bond', 'Telekinesis'] },
  'Clockwork Sorcery': { 3: ['Aid', 'Alarm', 'Lesser Restoration', 'Protection from Evil and Good'], 5: ['Dispel Magic', 'Protection from Energy'], 7: ['Freedom of Movement', 'Summon Construct'], 9: ['Greater Restoration', 'Wall of Force'] },
  'Draconic Sorcery': { 3: ['Alter Self', 'Chromatic Orb', 'Command', "Dragon's Breath"], 5: ['Fear', 'Fly'], 7: ['Arcane Eye', 'Charm Monster'], 9: ['Legend Lore', 'Summon Dragon'] },
};
const WARLOCK = {
  '': { 9: ['Contact Other Plane'] },
  'Archfey Patron': { 3: ['Calm Emotions', 'Faerie Fire', 'Misty Step', 'Phantasmal Force', 'Sleep'], 5: ['Blink', 'Plant Growth'], 7: ['Dominate Beast', 'Greater Invisibility'], 9: ['Dominate Person', 'Seeming'] },
  'Celestial Patron': { 3: ['Aid', 'Cure Wounds', 'Guiding Bolt', 'Lesser Restoration', 'Light', 'Sacred Flame'], 5: ['Daylight', 'Revivify'], 7: ['Guardian of Faith', 'Wall of Fire'], 9: ['Greater Restoration', 'Summon Celestial'] },
  'Fiend Patron': { 3: ['Burning Hands', 'Command', 'Scorching Ray', 'Suggestion'], 5: ['Fireball', 'Stinking Cloud'], 7: ['Fire Shield', 'Wall of Fire'], 9: ['Geas', 'Insect Plague'] },
  'Great Old One Patron': { 3: ['Detect Thoughts', 'Dissonant Whispers', 'Phantasmal Force', 'Hideous Laughter'], 5: ['Clairvoyance', 'Hunger of Hadar'], 7: ['Confusion', 'Summon Aberration'], 9: ['Modify Memory', 'Telekinesis'], 10: ['Hex'] },
};
const WIZARD = { Abjurer: { 10: ['Counterspell', 'Dispel Magic'] }, Illusionist: { 3: ['Minor Illusion'], 6: ['Summon Beast', 'Summon Fey'] } };
const FIGHTER = { 'Psi Warrior': { 18: ['Telekinesis'] } };
const MONK = { 'Warrior of Shadow': { 3: ['Minor Illusion'] }, 'Warrior of the Elements': { 3: ['Elementalism'] } };
const ROGUE = { 'Arcane Trickster': { 3: ['Mage Hand'] } };
export const ALWAYS = { Cleric: CLERIC, Paladin: PALADIN, Ranger: RANGER, Bard: BARD, Druid: DRUID, Sorcerer: SORCERER, Warlock: WARLOCK, Wizard: WIZARD, Fighter: FIGHTER, Monk: MONK, Rogue: ROGUE };
// Zauber aus Volk und Abstammung (Regeln 2024), Schlüssel = Charakterstufe.
export const SPECIES = {
  Aasimar: { 1: ['Light'] },
  Drow: { 1: ['Dancing Lights'], 3: ['Faerie Fire'], 5: ['Darkness'] },
  'High Elf': { 1: ['Prestidigitation'], 3: ['Detect Magic'], 5: ['Misty Step'] },
  'Wood Elf': { 1: ['Druidcraft'], 3: ['Longstrider'], 5: ['Pass without Trace'] },
  'Forest Gnome': { 1: ['Minor Illusion', 'Speak with Animals'] },
  'Rock Gnome': { 1: ['Mending', 'Prestidigitation'] },
  Abyssal: { 1: ['Poison Spray', 'Thaumaturgy'], 3: ['Ray of Sickness'], 5: ['Hold Person'] },
  Chthonic: { 1: ['Chill Touch', 'Thaumaturgy'], 3: ['False Life'], 5: ['Ray of Enfeeblement'] },
  Infernal: { 1: ['Fire Bolt', 'Thaumaturgy'], 3: ['Hellish Rebuke'], 5: ['Darkness'] },
};
export function speciesSpells() {
  const lvl = Math.max(1, S.level || 0), out = [];
  [S.race, S.subrace].forEach(k => Object.entries(SPECIES[k] || {}).forEach(([l, ns]) => { if (lvl >= +l) out.push(...ns); }));
  return [...new Set(out)];
}

const byLower = () => { const m = {}; Object.values(BYN).forEach(e => { if (e.k === 'spell') m[e.n.toLowerCase()] = e; }); return m; };
/** Alle immer vorbereiteten Zauber, die der Charakter auf seiner Stufe haben müsste. */
export function alwaysFor(list = classLevels()) {
  const out = [];
  list.forEach(c => [ALWAYS[c.k]?.[''], c.sub ? ALWAYS[c.k]?.[c.sub] : null, c.sub === 'Circle of the Land' ? LAND[S.land] : null].forEach(t => { if (t) Object.entries(t).forEach(([l, ns]) => { if (c.lvl >= +l) out.push(...ns); }); }));
  return [...new Set(out)];
}
/** Trägt fehlende Domänen- und Eidzauber als „immer vorbereitet“ ein. Liefert die Zahl der Änderungen. */
export function syncAlwaysSpells() {
  const names = alwaysFor();
  const cat = byLower();
  let changed = 0;
  // Volkszauber: fehlende eintragen, nicht mehr passende (Volk gewechselt) wieder entfernen
  const sp = speciesSpells().map(n => n.toLowerCase());
  const before = S.spells.length;
  S.spells = S.spells.filter(s => !s.race || sp.includes(s.n.toLowerCase()));
  changed += before - S.spells.length;
  sp.forEach(n => { if (!S.spells.some(s => s.n.toLowerCase() === n)) { const c = cat[n]; if (c) { S.spells.push({ ...spFrom(c), always: true, race: true }); changed++; } } });
  if (!names.length) return changed;
  names.forEach(n => {
    const have = S.spells.find(s => s.n.toLowerCase() === n.toLowerCase());
    if (have) { if (!have.always) { have.always = true; changed++; } return; }
    const c = cat[n.toLowerCase()];
    if (c) { S.spells.push({ ...spFrom(c), always: true }); changed++; }
  });
  return changed;
}
