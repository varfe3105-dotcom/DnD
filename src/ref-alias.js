// Kennungen aus den 2014-Daten (SRD 5.1) → Kennungen der 2024-Daten (SRD 5.2).
// Gespeicherte Gegenstände tragen `ref`; über diese Tabelle finden sie ihren neuen Katalogeintrag.
export const REF_ALIAS = {
  'item:arrow': 'item:arrows', 'item:crossbow-bolt': 'item:bolts', 'item:sling-bullet': 'item:bullets-sling', 'item:blowgun-needle': 'item:needles',
  'item:crossbow-light': 'item:light-crossbow', 'item:crossbow-hand': 'item:hand-crossbow', 'item:crossbow-heavy': 'item:heavy-crossbow',
  'item:ball-bearings-bag-of-1000': 'item:ball-bearings', 'item:chain-10-feet': 'item:chain', 'item:ink-1-ounce-bottle': 'item:ink', 'item:ladder-10-foot': 'item:ladder',
  'item:oil-flask': 'item:oil', 'item:paper-one-sheet': 'item:paper', 'item:parchment-one-sheet': 'item:parchment', 'item:perfume-vial': 'item:perfume', 'item:pole-10-foot': 'item:pole',
  'item:rations-1-day': 'item:rations', 'item:string-10-feet': 'item:string', 'item:diplomats-pack': 'item:diplomat-pack', 'item:dungeoneers-pack': 'item:dungeoneer-pack',
  'item:cartographers-tools': 'item:cartographer-tools', 'item:clothes-costume': 'item:costume', 'item:rope-hempen-50-feet': 'item:rope', 'item:rope-silk-50-feet': 'item:rope',
  'item:mirror-steel': 'item:mirror', 'item:spike-iron': 'item:spikes-iron', 'item:tent-two-person': 'item:tent', 'item:dice-set': 'item:dice', 'item:playing-card-set': 'item:playing-cards',
  'item:flask-or-tankard': 'item:flask', 'item:jug-or-pitcher': 'item:jug', 'item:robes': 'item:robe',
  'potion:acid-vial': 'potion:acid', 'potion:alchemists-fire-flask': 'potion:alchemists-fire', 'potion:antitoxin-vial': 'potion:antitoxin', 'potion:holy-water-flask': 'potion:holy-water',
  'potion:poison-basic-vial': 'potion:poison-basic', 'potion:potion-of-healing-common': 'potion:potion-of-healing',
  'potion:potion-of-healing-greater': 'potion:potions-of-healing', 'potion:potion-of-healing-superior': 'potion:potions-of-healing', 'potion:potion-of-healing-supreme': 'potion:potions-of-healing',
  ...Object.fromEntries(['hill', 'frost', 'stone', 'fire', 'cloud', 'storm'].map(g => ['potion:potion-of-giant-strength-' + g, 'potion:potion-of-giant-strength'])),
  ...Object.fromEntries(['acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder'].map(d => ['potion:potion-of-resistance-' + d, 'potion:potion-of-resistance'])),
};
