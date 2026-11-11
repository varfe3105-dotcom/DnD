// Zuordnung zum Spritesheet src/assets/icons.png (Shikashi's Fantasy Icons Pack, 32 × 32, 16 Spalten, 22 Zeilen).
// Werte sind [Zeile, Spalte]. Was hier fehlt, zeigt das eigene SVG-Symbol.
export const SHEET = { cols: 16, rows: 22 };

/** Allgemeine Motive, gelten auch für eigene Einträge mit gewähltem Symbol. */
const BY_IC = {
  sword: [5, 1], axe: [5, 10], hammer: [10, 4], spear: [10, 6], bow: [6, 3], shield: [6, 1], armor: [7, 5], helm: [7, 1], cloak: [7, 14], gloves: [8, 0], belt: [7, 15], boots: [8, 2], ring: [8, 4], amulet: [8, 6],
  potion: [19, 5], flame: [3, 9], skull: [0, 0], heart: [3, 5], scroll: [13, 12], book: [13, 1], wand: [6, 8], gem: [12, 15], bag: [8, 9], tool: [4, 4], key: [11, 9], torch: [10, 10], food: [15, 1], music: [11, 3], coin: [12, 7], dice: [13, 13], leaf: [11, 13], star: [0, 5], eye: [10, 8], swirl: [21, 0], bolt: [3, 2], snow: [21, 11], wing: [17, 10], box: [11, 11],
};

const BY_KEY = {
  // Völker
  'race:Dwarf': [4, 4], 'race:Elf': [11, 15], 'race:Halfling': [12, 5], 'race:Human': [7, 0], 'race:Dragonborn': [17, 9], 'race:Gnome': [10, 7], 'race:Half-Elf': [11, 14], 'race:Half-Orc': [5, 13], 'race:Tiefling': [3, 14], 'race:Goliath': [17, 1],
  // Talente
  'feat:Alert': [10, 9], 'feat:Athlete': [1, 4], 'feat:Actor': [11, 1], 'feat:Charger': [10, 6], 'feat:Crossbow Expert': [6, 4], 'feat:Defensive Duelist': [5, 5], 'feat:Dual Wielder': [5, 9], 'feat:Dungeon Delver': [11, 9],
  'feat:Durable': [9, 4], 'feat:Elemental Adept': [3, 9], 'feat:Grappler': [5, 15], 'feat:Great Weapon Master': [5, 2], 'feat:Healer': [11, 12], 'feat:Heavily Armored': [7, 3], 'feat:Heavy Armor Master': [7, 4], 'feat:Inspiring Leader': [11, 8],
  'feat:Keen Mind': [1, 3], 'feat:Lightly Armored': [7, 6], 'feat:Linguist': [4, 1], 'feat:Lucky': [13, 13], 'feat:Mage Slayer': [3, 3], 'feat:Magic Initiate': [6, 8], 'feat:Martial Adept': [3, 2], 'feat:Medium Armor Master': [7, 7],
  'feat:Mobile': [8, 3], 'feat:Moderately Armored': [6, 1], 'feat:Mounted Combatant': [19, 10], 'feat:Observant': [10, 8], 'feat:Polearm Master': [5, 10], 'feat:Resilient': [3, 5], 'feat:Ritual Caster': [4, 7], 'feat:Savage Attacker': [3, 11],
  'feat:Sentinel': [3, 7], 'feat:Sharpshooter': [6, 3], 'feat:Shield Master': [6, 2], 'feat:Skilled': [17, 6], 'feat:Skulker': [7, 14], 'feat:Spell Sniper': [6, 9], 'feat:Tavern Brawler': [13, 15], 'feat:Tough': [1, 0], 'feat:War Caster': [6, 10], 'feat:Weapon Master': [5, 7],
  // Waffen
  'item:club': [5, 13], 'item:dagger': [5, 6], 'item:greatclub': [5, 13], 'item:handaxe': [10, 1], 'item:javelin': [10, 6], 'item:light-hammer': [10, 4], 'item:mace': [5, 13], 'item:quarterstaff': [5, 0], 'item:sickle': [5, 5], 'item:spear': [10, 6], 'item:crossbow-light': [6, 4], 'item:dart': [10, 6], 'item:shortbow': [6, 3], 'item:sling': [6, 5],
  'item:battleaxe': [5, 10], 'item:flail': [5, 12], 'item:glaive': [5, 11], 'item:greataxe': [5, 11], 'item:greatsword': [5, 2], 'item:halberd': [5, 11], 'item:lance': [10, 6], 'item:longsword': [5, 1], 'item:maul': [10, 4], 'item:morningstar': [5, 12], 'item:pike': [10, 6], 'item:rapier': [5, 3], 'item:scimitar': [5, 5], 'item:shortsword': [5, 4], 'item:trident': [5, 8], 'item:war-pick': [10, 2], 'item:warhammer': [10, 4], 'item:whip': [5, 14], 'item:blowgun': [11, 6], 'item:crossbow-hand': [6, 4], 'item:crossbow-heavy': [6, 4], 'item:longbow': [6, 3],
  // Rüstung
  'item:padded-armor': [7, 8], 'item:leather-armor': [7, 6], 'item:studded-leather-armor': [7, 6], 'item:hide-armor': [7, 6], 'item:chain-shirt': [7, 7], 'item:scale-mail': [7, 7], 'item:breastplate': [7, 4], 'item:half-plate-armor': [7, 5], 'item:ring-mail': [7, 7], 'item:chain-mail': [7, 7], 'item:splint-armor': [7, 5], 'item:plate-armor': [7, 5], 'item:shield': [6, 1],
  // Ausrüstung
  'item:backpack': [8, 9], 'item:torch': [10, 10], 'item:candle': [10, 11], 'item:lamp': [10, 9], 'item:lantern-bullseye': [10, 9], 'item:lantern-hooded': [10, 9], 'item:rope-hempen-50-feet': [10, 13], 'item:rope-silk-50-feet': [10, 13], 'item:rations-1-day': [15, 3], 'item:crowbar': [10, 2], 'item:shovel': [10, 3], 'item:pick-miners': [10, 2], 'item:hammer': [10, 4], 'item:hammer-sledge': [10, 4], 'item:grappling-hook': [10, 5], 'item:spyglass': [10, 7], 'item:magnifying-glass': [10, 8], 'item:hourglass': [10, 15], 'item:manacles': [11, 2], 'item:hunting-trap': [10, 14], 'item:mirror-steel': [11, 1], 'item:lock': [11, 9], 'item:spellbook': [13, 6], 'item:book': [13, 1], 'item:paper-one-sheet': [13, 9], 'item:parchment-one-sheet': [13, 11], 'item:case-map-or-scroll': [13, 12], 'item:tent-two-person': [4, 3], 'item:basket': [20, 0], 'item:chest': [11, 11], 'item:waterskin': [15, 8], 'item:flask-or-tankard': [15, 14], 'item:bottle-glass': [19, 3], 'item:vial': [19, 2], 'item:oil-flask': [19, 0], 'item:healers-kit': [9, 15], 'item:herbalism-kit': [11, 12], 'item:poisoners-kit': [11, 12], 'item:climbers-kit': [10, 13], 'item:component-pouch': [12, 6], 'item:pouch': [12, 6], 'item:sack': [12, 6], 'item:fishing-tackle': [16, 0], 'item:clothes-common': [7, 8], 'item:clothes-fine': [7, 8], 'item:clothes-travelers': [7, 9], 'item:clothes-costume': [7, 13], 'item:robes': [7, 14], 'item:vestments': [7, 14], 'item:signet-ring': [8, 4], 'item:perfume-vial': [9, 14], 'item:arrow': [6, 3], 'item:crossbow-bolt': [6, 4],
  // Fokusse
  'item:crystal': [12, 14], 'item:orb': [18, 4], 'item:rod': [6, 10], 'item:staff': [6, 7], 'item:wand': [6, 8], 'item:amulet': [8, 7], 'item:emblem': [8, 7], 'item:reliquary': [8, 7], 'item:sprig-of-mistletoe': [11, 12], 'item:totem': [8, 8], 'item:wooden-staff': [6, 7], 'item:yew-wand': [5, 0],
  // Werkzeug und Instrumente
  'item:thieves-tools': [11, 10], 'item:cartographers-tools': [13, 12], 'item:cooks-utensils': [19, 9], 'item:alchemists-supplies': [19, 8], 'item:brewers-supplies': [13, 15], 'item:smiths-tools': [4, 4], 'item:navigators-tools': [10, 7], 'item:lute': [11, 4], 'item:lyre': [11, 3], 'item:flute': [11, 6], 'item:pan-flute': [11, 7], 'item:horn': [11, 8], 'item:viol': [11, 4], 'item:shawm': [11, 6], 'item:dice-set': [13, 13], 'item:playing-card-set': [13, 14],
  // Reittiere
  'item:horse-draft': [19, 10], 'item:horse-riding': [19, 10], 'item:warhorse': [19, 10], 'item:pony': [19, 10],
  // Tränke und Verbrauchsgüter
  'potion:acid-vial': [9, 2], 'potion:alchemists-fire-flask': [10, 12], 'potion:antitoxin-vial': [9, 6], 'potion:holy-water-flask': [9, 1], 'potion:poison-basic-vial': [0, 1],
  'potion:potion-of-healing-common': [9, 0], 'potion:potion-of-healing-greater': [9, 4], 'potion:potion-of-healing-superior': [9, 8], 'potion:potion-of-healing-supreme': [9, 12],
  // Zustände
  'cond:Blinded': [0, 2], 'cond:Charmed': [0, 6], 'cond:Deafened': [0, 3], 'cond:Frightened': [0, 4], 'cond:Grappled': [8, 1], 'cond:Incapacitated': [0, 5], 'cond:Paralyzed': [0, 8], 'cond:Petrified': [17, 1], 'cond:Poisoned': [0, 1], 'cond:Prone': [2, 5], 'cond:Restrained': [11, 2], 'cond:Stunned': [0, 5], 'cond:Unconscious': [0, 7],
  // Klassen
  'class:Barbarian': [5, 11], 'class:Bard': [11, 3], 'class:Cleric': [8, 7], 'class:Druid': [11, 14], 'class:Fighter': [5, 1], 'class:Monk': [5, 15], 'class:Paladin': [6, 2], 'class:Ranger': [6, 3], 'class:Rogue': [5, 6], 'class:Sorcerer': [21, 0], 'class:Warlock': [6, 15 - 4], 'class:Wizard': [13, 8],
  // Zauber
  'spell:Fireball': [3, 9], 'spell:Burning Hands': [3, 9], 'spell:Fire Bolt': [3, 9], 'spell:Sleep': [0, 7], 'spell:Hold Person': [0, 8], 'spell:Hold Monster': [0, 8], 'spell:Bless': [3, 15], 'spell:Daylight': [21, 8], 'spell:Sunbeam': [3, 15], 'spell:Sunburst': [3, 15], 'spell:Moonbeam': [21, 10], 'spell:Goodberry': [14, 5], 'spell:Identify': [10, 8], 'spell:Earthquake': [3, 13], 'spell:Gust of Wind': [3, 12], 'spell:Magic Missile': [0, 5], 'spell:Poison Spray': [0, 1], 'spell:Cloudkill': [0, 1], 'spell:Stinking Cloud': [0, 1], 'spell:Shield': [3, 7], 'spell:Shield of Faith': [3, 7], 'spell:Charm Person': [0, 6], 'spell:Fear': [0, 4], 'spell:Silence': [0, 3], 'spell:Disintegrate': [3, 10],
};

/** Magische Gegenstände nach Namensmuster im Schlüssel. */
const MAGIC = [
  [/ring-of-/, [8, 5]], [/staff-of-fire/, [6, 9]], [/staff-of-frost/, [6, 8]], [/staff-of-healing/, [6, 10]], [/staff-of-power|staff-of-the-magi/, [6, 11]], [/^magic:staff/, [6, 7]], [/^magic:wand/, [6, 8]], [/^magic:rod/, [6, 10]],
  [/spell-scroll/, [21, 1]], [/manual-|tome-/, [13, 6]], [/deck-of/, [13, 14]], [/crystal-ball/, [18, 4]], [/ioun-stone/, [18, 2]], [/orb-of/, [18, 5]], [/elemental-gem|gem-of|pearl|luckstone/, [12, 15]], [/bag-of|handy-haversack|portable-hole/, [12, 6]], [/horn-of/, [11, 8]], [/pipes-of/, [11, 7]], [/lantern/, [10, 9]], [/rope-of/, [10, 13]], [/necklace|periapt|amulet|medallion|talisman|scarab|brooch/, [8, 7]], [/necklace-of-fireballs/, [10, 12]],
  [/^potion:oil|^magic:oil/, [19, 7]], [/potion-of-(fire|giant|heroism|speed)/, [9, 3]], [/potion-of-(water|mind|clairvoyance|invisibility|resistance)/, [9, 1]], [/potion-of-(growth|climbing|animal|vitality|longevity)/, [9, 2]], [/potion-of-poison/, [19, 6]], [/philter/, [9, 14]], [/^potion:/, [9, 13]],
  [/dust-of/, [20, 8]],
];

export function artFor(ic, key) {
  if (key) {
    if (BY_KEY[key]) return BY_KEY[key];
    const m = MAGIC.find(([re]) => re.test(key));
    if (m) return m[1];
  }
  return BY_IC[ic] || null;
}
