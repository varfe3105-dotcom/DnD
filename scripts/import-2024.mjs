// Importiert SRD-5.2-Daten (Regeln 2024) aus .cache/5e-database/src/2024/en nach data/.
// Wiederholbar: node scripts/import-2024.mjs [spells|conditions|items|magic|monsters|mastery]
// Englisch kommt wörtlich aus dem SRD 5.2 (CC-BY 4.0). Deutsch steht in data/translations/2024/
// (Schlüssel = SRD-Index) und wird hier nur zusammengeführt. Fehlt eine Übersetzung, bleibt nur Englisch.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(root, '.cache/5e-database/src/2024/en');
if (!fs.existsSync(srcDir)) {
  console.error('Fehlt: git clone --depth 1 https://github.com/5e-bits/5e-database .cache/5e-database');
  process.exit(1);
}
const srd = f => JSON.parse(fs.readFileSync(path.join(srcDir, `5e-SRD-${f}.json`), 'utf8'));
const dataFile = f => path.join(root, 'data', f);
const trDir = dataFile('translations/2024');
const readJson = p => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {});
const tr = prefix => Object.assign({}, ...fs.readdirSync(trDir).filter(f => f.startsWith(prefix)).sort().map(f => readJson(path.join(trDir, f))));
const NAMES = readJson(path.join(trDir, 'names-2014.json'));
const writeArr = (f, a) => fs.writeFileSync(dataFile(f), '[\n' + a.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n');
const SRC = 'srd52';
const missing = [];

/** SRD-5.2-Texte haben „  \n “ als Absatzgrenze. */
export const clean = s => String(s || '').replace(/\r/g, '').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{2,}/g, '\n').replace(/\*\*/g, '').trim();
const num = v => String(Math.round(v * 10) / 10).replace('.', ',');
const unit = (n, one, many) => `${n} ${+n === 1 ? one : many}`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/* ---- Zauber ---- */
const TIME_DE = {
  Action: '1 Aktion', 'Bonus Action': '1 Bonusaktion', Reaction: '1 Reaktion',
  'Reaction, which you take when you see a creature within 60 feet of yourself casting a spell with Verbal, Somatic, or Material components': '1 Reaktion, wenn du siehst, wie eine Kreatur im Umkreis von 18 m einen Zauber mit verbalen, Gesten- oder Materialkomponenten wirkt',
  'Bonus Action, which you take immediately after hitting a target with a Melee weapon or an Unarmed Strike': '1 Bonusaktion direkt nachdem du ein Ziel mit einer Nahkampfwaffe oder einem waffenlosen Schlag getroffen hast',
  'Bonus Action, which you take immediately after hitting a creature with a weapon': '1 Bonusaktion direkt nachdem du eine Kreatur mit einer Waffe getroffen hast',
  'Reaction, which you take when you or a creature you can see within 60 feet of you falls': '1 Reaktion, wenn du oder eine Kreatur, die du im Umkreis von 18 m sehen kannst, fällt',
  'Reaction, which you take in response to taking damage from a creature that you can see within 60 feet of yourself': '1 Reaktion, wenn dir eine Kreatur, die du im Umkreis von 18 m sehen kannst, Schaden zufügt',
  'Action (Overgrowth) or 8 hours (Enrichment)': '1 Aktion (Wuchern) oder 8 Stunden (Bereichern)',
  'Reaction, which you take when you are hit by an attack roll or targeted by the Magic Missile spell': '1 Reaktion, wenn du von einem Angriffswurf getroffen oder vom Zauber Magic Missile anvisiert wirst',
  'Bonus Action, which you take immediately after hitting a creature with a Melee weapon or an Unarmed Strike': '1 Bonusaktion direkt nachdem du eine Kreatur mit einer Nahkampfwaffe oder einem waffenlosen Schlag getroffen hast',
};
const timeEn = s => (/^(Action|Bonus Action|Reaction)/.test(s) ? s.replace(/^(Action|Bonus Action|Reaction)/, m => '1 ' + m.toLowerCase()) : s);
const timeDe = s => TIME_DE[s] || s.replace(/^(\d+) minutes?$/, (m, n) => unit(n, 'Minute', 'Minuten')).replace(/^(\d+) hours?$/, (m, n) => unit(n, 'Stunde', 'Stunden'));
const feetToM = s => s.replace(/(\d[\d,]*)[- ](?:feet|foot)\b/g, (m, n) => `${num(+n.replace(/,/g, '') * 0.3)} m`).replace(/(\d+)[- ]miles?\b/g, (m, n) => `${num(+n * 1.5)} km`);
const rangeDe = s => feetToM(s).replace(/^Self/, 'Selbst').replace(/^Touch/, 'Berührung').replace(/^Sight/, 'Sicht').replace(/^Unlimited/, 'Unbegrenzt').replace(/^Special/, 'Speziell')
  .replace(/ (radius|Emanation)\)/i, ' Radius)').replace(/ cone\)/i, ' Kegel)').replace(/ cube\)/i, ' Würfel)').replace(/ line\)/i, ' Linie)').replace(/ sphere\)/i, ' Sphäre)').replace(/ hemisphere\)/i, ' Halbkugel)').replace(/ cylinder\)/i, ' Zylinder)');
const durDe = s => s.replace(/^Concentration, up to /i, 'Konz. bis ').replace(/^Up to /i, 'bis ').replace(/^Instantaneous$/, 'Sofort').replace(/^Until dispelled or triggered$/, 'Bis gebannt oder ausgelöst').replace(/^Until dispelled$/, 'Bis gebannt').replace(/^Special$/, 'Speziell')
  .replace(/(\d+) rounds?/, (m, n) => unit(n, 'Runde', 'Runden')).replace(/(\d+) minutes?/, (m, n) => unit(n, 'Minute', 'Minuten')).replace(/(\d+) hours?/, (m, n) => unit(n, 'Stunde', 'Stunden')).replace(/(\d+) days?/, (m, n) => unit(n, 'Tag', 'Tage'));
const SCHOOL_IC = { evocation: 'flame', abjuration: 'shield', conjuration: 'swirl', divination: 'eye', enchantment: 'star', illusion: 'mask', necromancy: 'skull', transmutation: 'wing' };
const CLASS_L = { Bard: 'B', Cleric: 'C', Druid: 'D', Paladin: 'P', Ranger: 'R', Sorcerer: 'S', Warlock: 'K', Wizard: 'W' };
const SPELL_IC = { 'Cure Wounds': 'heart', 'Healing Word': 'heart', 'Mass Healing Word': 'heart', 'Mass Cure Wounds': 'heart', Revivify: 'heart', Aid: 'heart', 'Lesser Restoration': 'heart', 'Ray of Frost': 'snow', 'Shocking Grasp': 'bolt', 'Lightning Bolt': 'bolt', 'Eldritch Blast': 'bolt', 'Magic Missile': 'star', Light: 'torch', Fly: 'wing', "Hunter's Mark": 'bow', 'Spiritual Weapon': 'sword', Sleep: 'star', 'Sacred Flame': 'torch', 'Guiding Bolt': 'star', 'Divine Smite': 'sword', 'Shining Smite': 'sword', 'Searing Smite': 'sword', 'Ice Knife': 'snow' };
const NEW_DE = { befuddlement: 'Geistesverwirrung', 'charm-monster': 'Monster bezaubern', 'divine-smite': 'Göttliches Niederstrecken', 'dragons-breath': 'Drachenodem', elementalism: 'Elementarismus', 'ice-knife': 'Eismesser', 'mind-spike': 'Geistesstachel', 'shining-smite': 'Leuchtendes Niederstrecken', 'sorcerous-burst': 'Zauberische Entladung', 'starry-wisp': 'Sternenfunke', 'summon-dragon': 'Drachen herbeirufen', 'vitriolic-sphere': 'Ätzende Kugel' };
const ABIL = { Strength: 'str', Dexterity: 'dex', Constitution: 'con', Intelligence: 'int', Wisdom: 'wis', Charisma: 'cha' };
/** Zaubertrick-Schaden nach Charakterstufe aus dem Abschnitt „Cantrip Upgrade“. */
function cantData(s, text) {
  const base = s.damage?.damage_at_slot_level?.['0'] || s.damage?.damage_at_character_level?.['1'];
  if (!base) return null;
  const d = { 1: base };
  const up = text.match(/Cantrip Upgrade\.[^\n]*/)?.[0] || '';
  for (const m of up.matchAll(/(\d+) \((\d+d\d+)\)/g)) d[m[1]] = m[2];
  // Ohne Würfel in der Verbesserung (etwa Eldritch Blast: mehr Strahlen) bleibt der Grundschaden gleich
  [5, 11, 17].forEach(l => { if (!d[l]) d[l] = d[Object.keys(d).filter(k => +k < l).pop()]; });
  const save = text.match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/)?.[1];
  const type = (s.damage?.damage_type?.index || '').toLowerCase();
  return { d, type, ...(s.attack_type ? { atk: s.attack_type } : {}), ...(!s.attack_type && save ? { save: ABIL[save] } : {}), ...(s.name === 'Eldritch Blast' ? { beams: { 1: 1, 5: 2, 11: 3, 17: 4 } } : {}) };
}
// PHB-2024-Zauber außerhalb des SRD 5.2: bis zur eigenen 2024-Zusammenfassung bleibt die 2014-Fassung (markiert).
const KEEP_2014 = ['Blade Ward', 'Friends', 'Thorn Whip', 'Armor of Agathys', 'Arms of Hadar', 'Compelled Duel', 'Hail of Thorns', 'Thunderous Smite', 'Witch Bolt', 'Wrathful Smite', 'Beast Sense', 'Cloud of Daggers', 'Cordon of Arrows', 'Crown of Madness', 'Aura of Vitality', 'Blinding Smite', 'Conjure Barrage', "Crusader's Mantle", 'Elemental Weapon', 'Feign Death', 'Hunger of Hadar', 'Lightning Arrow', 'Aura of Purity', 'Grasping Vine', 'Staggering Smite', 'Banishing Smite', 'Circle of Power', 'Conjure Volley', 'Destructive Wave', 'Swift Quiver', 'Arcane Gate', 'Telepathy'];
function spells() {
  const de = tr('de-spells-');
  const own = tr('own-spells-'); // eigene Zusammenfassungen 2024 (PHB außerhalb des SRD)
  const old = JSON.parse(fs.readFileSync(dataFile('spells.json'), 'utf8'));
  const out = srd('Spells').map(s0 => {
    // Datenfehler: bei einigen Zaubern stehen die Komponenten im Feld Reichweite („Touch Component: V, S“)
    const rc = String(s0.range).match(/^(.*?)\s*Components?:\s*(.+)$/);
    const s = rc ? { ...s0, range: rc[1], components: s0.components?.length ? s0.components : rc[2].split(/,\s*/) } : s0;
    const d = de[s.index];
    const text = clean(s.description);
    const deName = d?.[0] || NEW_DE[s.index] || NAMES.spells?.[s.name.toLowerCase()];
    if (!d) missing.push('Zauber ohne Deutsch: ' + s.name);
    const conc = !!s.concentration;
    const durEn = conc && !/^concentration/i.test(s.duration) ? `Concentration, ${s.duration.toLowerCase()}` : cap(s.duration);
    const cant = s.level === 0 ? cantData(s, text) : null;
    return {
      n: s.name, ...(deName ? { de: deName } : {}), lvl: s.level, school: s.school.index, ic: SPELL_IC[s.name] || SCHOOL_IC[s.school.index],
      cls: s.classes.map(c => CLASS_L[c.name]).filter(Boolean).join(''),
      time: { en: timeEn(s.casting_time), de: timeDe(s.casting_time) }, range: { en: s.range, de: rangeDe(s.range) }, dur: { en: durEn, de: durDe(durEn) },
      comp: s.components.join(', '), ...(s.material ? { material: s.material } : {}), conc, ritual: !!s.ritual,
      text: { en: text, ...(d?.[1] ? { de: d[1] } : {}) },
      ...(s.higher_level || d?.[2] ? { higher: { ...(s.higher_level ? { en: clean(s.higher_level) } : {}), ...(d?.[2] ? { de: d[2] } : {}) } } : {}),
      ...(cant ? { cant } : {}),
      source: SRC, verified: false,
    };
  });
  const have = new Set(out.map(s => s.n.toLowerCase()));
  for (const [n, o] of Object.entries(own)) { if (!have.has(n.toLowerCase())) { out.push({ n, ...o, source: 'summary', ed: 2024, verified: false }); have.add(n.toLowerCase()); } }
  for (const n of KEEP_2014) {
    if (have.has(n.toLowerCase())) continue;
    const o = old.find(x => x.n === n && x.ed !== 2024);
    if (o) out.push({ ...o, source: 'summary', ed: 2014, verified: false }); else missing.push('Zauber 2014 nicht gefunden: ' + n);
  }
  out.sort((a, b) => a.lvl - b.lvl || a.n.localeCompare(b.n));
  writeArr('spells.json', out);
  console.log(`Zauber: ${out.length} (SRD 5.2: ${out.filter(s => s.source === SRC).length}, deutsch: ${out.filter(s => s.text.de).length}, noch 2014: ${out.filter(s => s.ed === 2014).length})`);
}

/* ---- Zustände und Erschöpfung ---- */
const COND_IC = { Blinded: 'eye', Charmed: 'heart', Deafened: 'ear', Frightened: 'skull', Grappled: 'hand', Incapacitated: 'x', Invisible: 'mask', Paralyzed: 'bolt', Petrified: 'gem', Poisoned: 'potion', Prone: 'down', Restrained: 'chain', Stunned: 'star', Unconscious: 'moon' };
function conditions() {
  const de = tr('de-conditions');
  const old = JSON.parse(fs.readFileSync(dataFile('conditions.json'), 'utf8'));
  const all = srd('Conditions');
  const out = all.filter(c => c.name !== 'Exhaustion').map(c => {
    const o = old.find(x => x.n === c.name);
    const d = de[c.index];
    if (!d) missing.push('Zustand ohne Deutsch: ' + c.name);
    return { n: c.name, de: d?.[0] || NAMES.conditions?.[c.name.toLowerCase()] || c.name, ic: o?.ic || COND_IC[c.name] || 'star', text: { en: [...new Set(clean(c.description).replace(/\nWhen this condition ends, you remain Prone\./, ' When this condition ends, you remain Prone.').split('\n'))].join('\n'), ...(d?.[1] ? { de: d[1] } : {}) }, source: SRC, verified: false };
  });
  writeArr('conditions.json', out);
  const ex = all.find(c => c.name === 'Exhaustion'), d = de.exhaustion;
  // 2024: jede Stufe −2 auf W20-Tests und −1,5 m Tempo, Stufe 6 = Tod.
  const lv = Array.from({ length: 6 }, (_, i) => {
    const n = i + 1;
    return n === 6
      ? { level: 6, text: { en: 'You die.', de: 'Du stirbst.' }, source: SRC, verified: false }
      : { level: n, text: { en: `D20 Tests −${2 * n} · Speed −${5 * n} ft.`, de: `W20-Tests −${2 * n} · Tempo −${num(1.5 * n)} m` }, source: SRC, verified: false };
  });
  lv[0].rule = { en: clean(ex.description), ...(d?.[1] ? { de: d[1] } : {}) };
  writeArr('exhaustion.json', lv);
  console.log(`Zustände: ${out.length}, Erschöpfung: 6 Stufen`);
}

/* ---- Waffenmeisterschaften ---- */
const MASTERY_IC = { cleave: 'axe', graze: 'sword', nick: 'sword', push: 'hammer', sap: 'hammer', slow: 'bow', topple: 'hammer', vex: 'bow' };
function mastery() {
  const de = tr('de-mastery');
  const out = srd('Weapon-Mastery-Properties').map(m => ({ id: m.index, n: m.name, ic: MASTERY_IC[m.index] || 'sword', text: { en: clean(m.description), ...(de[m.index] ? { de: de[m.index] } : {}) }, source: SRC, verified: false }));
  writeArr('mastery.json', out);
  console.log(`Waffenmeisterschaften: ${out.length}`);
}

/* ---- Ausrüstung ---- */
const COIN_DE = { gp: 'GM', sp: 'SM', cp: 'KM', ep: 'EM', pp: 'PM' };
const costEn = c => (c ? `${c.quantity.toLocaleString('en-US')} ${c.unit}` : '');
const costDe = c => (c ? `${c.quantity.toLocaleString('de-DE')} ${COIN_DE[c.unit] || c.unit}` : '');
const DMG_DE = { slashing: 'Hieb', piercing: 'Stich', bludgeoning: 'Wucht' };
const PROP_DE = { finesse: 'Finesse', light: 'Leicht', heavy: 'Schwer', 'two-handed': 'Zweihändig', reach: 'Reichweite', loading: 'Laden', special: 'Sonderregel' };
const die = (d, l) => (d === '1d1' || d === '1' ? '1' : l === 'de' ? d.replace('d', 'W') : d);
const rangeFt = r => `${r.normal}/${r.long} ft.`;
const rangeM = r => `${num(r.normal * 0.3)}/${num(r.long * 0.3)} m`;
const cats = e => new Set((e.equipment_categories || []).map(c => c.index));
function weaponText(e, c) {
  const dmgType = e.damage?.damage_type?.index;
  const props = e.properties || [];
  const vers = e.two_handed_damage?.damage_dice;
  const en = props.map(p => p.index === 'versatile' ? `Versatile${vers ? ` (${vers})` : ''}` : p.index === 'thrown' && e.throw_range ? `Thrown (${rangeFt(e.throw_range)})` : p.index === 'ammunition' && e.range?.long ? `Ammunition (${rangeFt(e.range)}; ${e.ammunition?.name || ''})`.replace('; )', ')') : p.name);
  const de = props.map(p => p.index === 'versatile' ? `Vielseitig${vers ? ` (${die(vers, 'de')})` : ''}` : p.index === 'thrown' && e.throw_range ? `Wurf ${rangeM(e.throw_range)}` : p.index === 'ammunition' && e.range?.long ? `Munition ${rangeM(e.range)}` : PROP_DE[p.index] || p.name);
  const simple = c.has('simple-weapons');
  const m = e.mastery?.name;
  return {
    en: [simple ? 'Simple' : 'Martial', e.damage ? `${die(e.damage.damage_dice, 'en')} ${dmgType}` : '', en.join(', '), m ? `Mastery: ${m}` : '', costEn(e.cost)].filter(Boolean).join(' · '),
    de: [simple ? 'Einfach' : 'Kriegswaffe', e.damage ? `${die(e.damage.damage_dice, 'de')} ${DMG_DE[dmgType] || dmgType}` : '', de.join(', '), m ? `Meisterschaft: ${m}` : '', costDe(e.cost)].filter(Boolean).join(' · '),
  };
}
function armorText(e, c) {
  const a = e.armor_class;
  if (c.has('shields')) return { en: `+${a.base} AC · ${costEn(e.cost)}`, de: `+${a.base} RK · ${costDe(e.cost)}` };
  const cat = c.has('light-armor') ? 'Light' : c.has('medium-armor') ? 'Medium' : 'Heavy';
  const CAT_DE = { Light: 'Leicht', Medium: 'Mittel', Heavy: 'Schwer' };
  const dexEn = a.dex_bonus ? (a.max_bonus ? ` + DEX (max +${a.max_bonus})` : ' + DEX') : '', dexDe = a.dex_bonus ? (a.max_bonus ? ` + GES (max. +${a.max_bonus})` : ' + GES') : '';
  return {
    cat,
    en: [cat, `AC ${a.base}${dexEn}`, e.str_minimum ? `STR ${e.str_minimum}` : '', e.stealth_disadvantage ? 'Disadvantage on Stealth' : '', costEn(e.cost)].filter(Boolean).join(' · '),
    de: [CAT_DE[cat], `RK ${a.base}${dexDe}`, e.str_minimum ? `ST ${e.str_minimum}` : '', e.stealth_disadvantage ? 'Nachteil Heimlichkeit' : '', costDe(e.cost)].filter(Boolean).join(' · '),
  };
}
const WEAPON_IC = n => /bow|crossbow|sling|blowgun|musket|pistol/i.test(n) ? 'bow' : /axe/i.test(n) ? 'axe' : /club|mace|maul|hammer|flail|morningstar|pick/i.test(n) ? 'hammer' : /spear|javelin|pike|lance|trident|halberd|glaive|dart/i.test(n) ? 'spear' : /staff/i.test(n) ? 'wand' : 'sword';
const GEAR_IC = [[/torch|candle|lamp|lantern/i, 'torch'], [/rations|feed/i, 'food'], [/rope|chain|string/i, 'box'], [/spellbook|book/i, 'book'], [/paper|parchment|ink|map/i, 'scroll'], [/pack$|backpack|pouch|sack|saddlebag|basket|quiver|case/i, 'bag'], [/poison|antitoxin|acid|holy water|alchemist|oil|vial|potion/i, 'potion'], [/lock$|manacles/i, 'key'], [/hammer|crowbar|pick|shovel|whetstone/i, 'tool'], [/clothes|robe|vestments|costume/i, 'cloak'], [/waterskin|flask|bottle|jug/i, 'potion'], [/ring/i, 'ring']];
const gearIc = n => (GEAR_IC.find(([re]) => re.test(n)) || [0, 'box'])[1];
const CONSUMABLE = /^(Acid|Alchemist's Fire|Antitoxin|Holy Water|Basic Poison|Poison, Basic|Potion of Healing)$/;
const CONS_GEAR = /^(Rations|Torch|Candle|Oil|Ball Bearings|Caltrops)$/;
const ABIL_DE = { str: 'ST', dex: 'GES', con: 'KON', int: 'INT', wis: 'WEI', cha: 'CHA' };
// Übertragungsfehler im Datenpaket (Preis im SRD 5.2 / PHB 2024 wie 2014): hier korrigiert.
const PRICE_FIX = { basket: [4, 'sp'], bedroll: [1, 'gp'], blanket: [5, 'sp'], caltrops: [1, 'gp'], chest: [5, 'gp'], 'clothes-travelers': [2, 'gp'], 'component-pouch': [25, 'gp'], dart: [5, 'cp'], javelin: [5, 'sp'], longbow: [50, 'gp'], 'poisoners-kit': [50, 'gp'], spear: [1, 'gp'] };
function items() {
  const de = tr('de-items');
  const out = srd('Equipment').map(e0 => {
    const e = PRICE_FIX[e0.index] ? { ...e0, cost: { quantity: PRICE_FIX[e0.index][0], unit: PRICE_FIX[e0.index][1] } } : e0;
    const c = cats(e), d = de[e.index];
    const nDe = d?.[0] || NAMES.items?.[e.name.toLowerCase()];
    let group = 'gear', slot = '', ic, text, ac;
    if (c.has('weapons')) { group = c.has('simple-weapons') ? 'simple' : 'martial'; slot = 'hand'; ic = WEAPON_IC(e.name); text = weaponText(e, c); }
    else if (c.has('armor')) {
      const sh = c.has('shields'); group = 'armor'; slot = sh ? 'off' : 'body'; ic = sh ? 'shield' : 'armor';
      const t = armorText(e, c); text = { en: t.en, de: t.de };
      ac = sh ? { shield: e.armor_class.base } : { b: e.armor_class.base, dex: !!e.armor_class.dex_bonus, max: e.armor_class.max_bonus || null, cat: t.cat };
    } else {
      if (c.has('equipment-packs') || /Pack$/.test(e.name)) { group = 'pack'; ic = 'bag'; }
      else if (c.has('holy-symbols') || c.has('arcane-foci') || c.has('druidic-foci')) { group = 'focus'; slot = /amulet/i.test(e.name) ? 'neck' : 'hand'; ic = c.has('holy-symbols') ? 'amulet' : c.has('druidic-foci') ? 'leaf' : /crystal|orb/i.test(e.name) ? 'gem' : 'wand'; }
      else if (c.has('tools') || c.has('artisans-tools') || c.has('musical-instruments') || c.has('gaming-sets')) { group = 'tool'; ic = c.has('musical-instruments') ? 'music' : c.has('gaming-sets') ? 'dice' : /Healer/.test(e.name) ? 'heart' : /Poisoner/.test(e.name) ? 'skull' : /Disguise/.test(e.name) ? 'mask' : /Herbalism/.test(e.name) ? 'leaf' : 'tool'; }
      else { ic = gearIc(e.name); }
      if (/^Spellbook$|^Component Pouch$/i.test(e.name)) { group = 'focus'; ic = /book/i.test(e.name) ? 'book' : 'bag'; }
      const util = e.utilize?.length ? e.utilize.map(u => `${u.name}${u.dc ? ` (DC ${u.dc.dc_value})` : ''}`).join(', ') : '';
      const kindEn = c.has('musical-instruments') ? 'Musical Instrument' : c.has('gaming-sets') ? 'Gaming Set' : c.has('artisans-tools') ? "Artisan's Tools" : c.has('tools') ? 'Tool' : group === 'focus' && !/Spellbook|Component/i.test(e.name) ? 'Spellcasting Focus' : '';
      const kindDe = { 'Musical Instrument': 'Musikinstrument', 'Gaming Set': 'Spielset', "Artisan's Tools": 'Handwerkszeug', Tool: 'Werkzeug', 'Spellcasting Focus': 'Zauberfokus' }[kindEn] || '';
      const abEn = e.ability ? `Ability: ${e.ability.name}` : '', abDe = e.ability ? `Attribut: ${ABIL_DE[e.ability.index] || e.ability.name}` : '';
      const qty = e.quantity > 1 ? `${e.quantity}× ` : '';
      text = {
        en: [kindEn, abEn, util ? `Utilize: ${util}` : '', clean(e.description), qty + costEn(e.cost)].filter(Boolean).join(' · '),
        de: [kindDe, abDe, d?.[1] || '', qty + costDe(e.cost)].filter(Boolean).join(' · '),
      };
    }
    if (!d && !c.has('weapons') && !c.has('armor')) missing.push('Ausrüstung ohne deutschen Text: ' + e.name);
    const potion = CONSUMABLE.test(e.name);
    const cons = potion || CONS_GEAR.test(e.name) || c.has('ammunition');
    return { id: e.index, k: potion ? 'potion' : 'item', n: { en: e.name, ...(nDe ? { de: nDe } : {}) }, ic, group: potion ? 'potion' : group, slot, cons, q: e.quantity || 1, text, ...(ac ? { ac } : {}), ...(e.mastery ? { mastery: e.mastery.index } : {}), ...(e.weight ? { w: e.weight } : {}), source: SRC, verified: false };
  });
  writeArr('items.json', out.filter(r => r.k !== 'potion'));
  fs.writeFileSync(path.join(root, '.cache/gear-potions-2024.json'), JSON.stringify(out.filter(r => r.k === 'potion')));
  console.log(`Ausrüstung: ${out.length}`);
}

/* ---- Magische Gegenstände ---- */
const RARITY_DE = { Common: 'Gewöhnlich', Uncommon: 'Ungewöhnlich', Rare: 'Selten', 'Very Rare': 'Sehr selten', Legendary: 'Legendär', Artifact: 'Artefakt', Varies: 'Variiert' };
const rarOf = r => { const s = String(r || '').replace(/\s*\(.*\)$/, '').trim(); return s.replace(/\bRare\b/, 'Rare').replace(/^Very rare$/i, 'Very Rare'); };
const magicSlot = (n, cat) => cat === 'rings' ? 'ring' : cat === 'armor' ? (/shield/i.test(n) ? 'off' : 'body') : ['weapons', 'staffs', 'wands'].includes(cat) || /^Rod/.test(n) ? 'hand' : /shield/i.test(n) ? 'off' : /boots|slippers/i.test(n) ? 'feet' : /gloves|gauntlets|bracers/i.test(n) ? 'hands' : /belt/i.test(n) ? 'waist' : /cloak|cape|robe|mantle|wings of/i.test(n) ? 'cloak' : /amulet|periapt|necklace|medallion|brooch|scarab/i.test(n) ? 'neck' : /helm|hat|headband|circlet|goggles|eyes of/i.test(n) ? 'head' : '';
const magicIc = (n, cat) => cat === 'rings' ? 'ring' : cat === 'potions' ? 'potion' : /scroll/i.test(n) ? 'scroll' : cat === 'armor' ? (/shield/i.test(n) ? 'shield' : 'armor') : cat === 'weapons' ? WEAPON_IC(n) : ['staffs', 'wands'].includes(cat) || /^Rod/.test(n) ? 'wand' : /shield/i.test(n) ? 'shield' : /boots|slippers/i.test(n) ? 'boots' : /gloves|gauntlets|bracers/i.test(n) ? 'gloves' : /belt/i.test(n) ? 'belt' : /cloak|cape|robe|mantle|wings/i.test(n) ? 'cloak' : /amulet|periapt|necklace|medallion|brooch|scarab/i.test(n) ? 'amulet' : /helm|hat|headband|circlet|goggles|eyes/i.test(n) ? 'helm' : /bag|haversack|quiver/i.test(n) ? 'bag' : /manual|tome/i.test(n) ? 'book' : /gem|stone|pearl|orb|ball/i.test(n) ? 'gem' : /oil|philter|ointment|dust|solvent|glue/i.test(n) ? 'potion' : /horn|pipes|chime/i.test(n) ? 'music' : 'star';
const CONS_MAGIC = /^(Potion|Oil|Philter|Elixir|Spell Scroll|Dust of|Restorative Ointment|Bead of Force|Elemental Gem|Feather Token|Arrow of Slaying|Sovereign Glue|Universal Solvent|Ammunition)/;
function magic() {
  const de = tr('de-magic');
  const all = srd('Magic-Items');
  const parentOf = {};
  all.filter(x => x.variants?.length).forEach(p => p.variants.forEach(v => { if (v.index !== p.index) parentOf[v.index] = p; }));
  const rows = all.filter(x => !x.variants?.length).map(x => {
    const parent = parentOf[x.index];
    const cat = x.equipment_category.index;
    const d = de[x.index] || (parent && de[parent.index]);
    const [line, ...rest] = clean(x.desc).split('\n');
    let nDe = de[x.index]?.[0] || NAMES.magic?.[x.name.toLowerCase()];
    if (!nDe && parent && de[parent.index]) nDe = de[parent.index][0] + x.name.slice(parent.name.length).replace(/^,?/, '');
    if (!d) missing.push('Magischer Gegenstand ohne Deutsch: ' + x.name);
    const rarity = rarOf(x.rarity?.name);
    const potion = cat === 'potions' || /^(Potion|Oil|Philter|Elixir)/.test(x.name);
    return { id: x.index, k: potion ? 'potion' : 'magic', n: { en: x.name, ...(nDe ? { de: nDe } : {}) }, ic: magicIc(x.name, cat), slot: magicSlot(x.name, cat), att: !!x.attunement, cons: CONS_MAGIC.test(x.name), rarity: { en: rarity, de: RARITY_DE[rarity] || rarity }, type: line, text: { en: (rest.length ? rest : [line]).join('\n'), ...(d?.[1] ? { de: d[1] } : {}) }, source: SRC, verified: false };
  });
  writeArr('magic-items.json', rows.filter(r => r.k !== 'potion'));
  const gearPotions = JSON.parse(fs.readFileSync(path.join(root, '.cache/gear-potions-2024.json'), 'utf8'));
  writeArr('potions.json', [...gearPotions, ...rows.filter(r => r.k === 'potion')]);
  console.log(`Magische Gegenstände: ${rows.length}, deutsch: ${rows.filter(r => r.text.de).length}`);
}

/* ---- Monster ---- */
function monsters() {
  const usage = u => {
    if (!u) return '';
    if (u.type === 'recharge on roll') return ` (Recharge ${u.min_value}${u.min_value < 6 ? '-6' : ''})`;
    if (u.type === 'per day') return ` (${u.times}/Day)`;
    if (u.type === 'recharge after rest') return ` (Recharges after a ${(u.rest_types || []).join(' or ')} rest)`;
    return '';
  };
  // Zauberliste der Aktion „Spellcasting“ steht 2024 getrennt; als Zeilen „At will: …“ / „2/Day each: …“ anhängen.
  const spellsOf = x => {
    const sp = x.spellcasting?.spells;
    if (!sp?.length || !/^Spellcasting/.test(x.name)) return '';
    const g = {};
    sp.forEach(s => { const k = s.usage?.type === 'per day' ? `${s.usage.times}/Day each` : 'At will'; (g[k] = g[k] || []).push(s.name); });
    return Object.entries(g).sort(([a], [b]) => (a === 'At will' ? -1 : b === 'At will' ? 1 : b.localeCompare(a))).map(([k, ns]) => `\n${k}: ${ns.join(', ')}`).join('');
  };
  const part = (title, list) => (list?.length ? [`${title}`, ...list.map(x => `${x.name}${/\(/.test(x.name) ? '' : usage(x.usage)}. ${clean(x.desc || x.description || '')}${spellsOf(x)}`.trim())] : []);
  const out = srd('Monsters').map(m => ({
    id: m.index, n: m.name, size: m.size, type: m.type, cr: m.challenge_rating, ac: m.armor_class?.[0]?.value ?? m.armor_class ?? 10, hp: m.hit_points, hd: m.hit_points_roll || m.hit_dice, speed: Object.entries(m.speed || {}).map(([k, v]) => `${k} ${v}`).join(', '),
    abil: { str: m.strength, dex: m.dexterity, con: m.constitution, int: m.intelligence, wis: m.wisdom, cha: m.charisma },
    text: [...part('Traits', m.special_abilities), ...part('Actions', m.actions), ...part('Bonus Actions', m.bonus_actions), ...part('Reactions', m.reactions), ...part('Legendary Actions', m.legendary_actions)].join('\n'),
    source: SRC, verified: false,
  }));
  writeArr('monsters.json', out);
  console.log(`Monster: ${out.length}`);
}

/* ---- Völker (Species 2024) ---- */
const DT_DE = { acid: 'Säure', cold: 'Kälte', fire: 'Feuer', lightning: 'Blitz', poison: 'Gift' };
const SIZE_DE = { Medium: 'Mittelgroß', Small: 'Klein', 'Medium or Small': 'Mittelgroß oder klein' };
const SUB_NAME = {
  'draconic-ancestor-': s => s.name.replace('Draconic Ancestor: ', '') + ' Dragon',
  'elven-lineage-': s => s.name.replace('Elven Lineage: ', ''),
  'gnomish-lineage-': s => s.name.replace('Gnomish Lineage: ', ''),
  'giant-ancestry-': s => ({ 'clouds-jaunt': 'Cloud Giant', 'fires-burn': 'Fire Giant', 'frosts-chill': 'Frost Giant', 'hills-tumble': 'Hill Giant', 'stones-endurance': 'Stone Giant', 'storms-thunder': 'Storm Giant' })[s.index.replace('giant-ancestry-', '')],
  'fiendish-legacy-': s => cap(s.index.replace('fiendish-legacy-', '')),
};
// Allgemeine Merkmale, deren Inhalt bei der Unterart genauer steht, bleiben trotzdem sichtbar (Regeltext).
function species() {
  const de = tr('de-traits'), extra = readJson(path.join(trDir, 'species-extra.json'));
  const traits = Object.fromEntries(srd('Traits').map(t => [t.index, t]));
  const subsAll = srd('Subspecies');
  const T = (idx, lvl) => {
    const t = traits[idx];
    const spell = idx.startsWith('lineage-spell-');
    if (spell) {
      const sp = t.name, cantrip = lvl === 1;
      return { n: lvl > 1 ? `${sp} (${lvl})` : sp, lvl, text: { en: lvl > 1 ? `From character level ${lvl}: you always have ${sp} prepared and can cast it once without a spell slot per Long Rest.` : `You know the ${sp} ${cantrip ? 'cantrip' : 'spell'}.`, de: lvl > 1 ? `Ab Charakterstufe ${lvl}: Du hast ${sp} immer vorbereitet und kannst ihn einmal pro langer Rast ohne Zauberplatz wirken.` : `Du kennst den Zaubertrick ${sp}.` }, spell: sp, source: SRC, verified: false };
    }
    const dt = idx.match(/^draconic-(breath-weapon|damage-resistance)-(\w+)$/);
    if (dt) { const d = de['draconic-' + dt[1]]; return { n: t.name, text: { en: clean(t.description), de: d[1].replace('{typ}', DT_DE[dt[2]]) }, source: SRC, verified: false }; }
    const d = de[idx];
    if (!d) missing.push('Merkmal ohne Deutsch: ' + idx);
    return { n: t.name.replace(/^(High Elf|Wood Elf|Gnomish Lineage|Giant Ancestry): /, ''), text: { en: clean(t.description).replace(/^- /gm, ''), ...(d ? { de: d[1] } : {}) }, source: SRC, verified: false };
  };
  const out = {};
  for (const s of srd('Species')) {
    const name = s.name;
    const size = s.size || 'Medium or Small';
    const R = { sp: num(s.speed * 0.3).replace(',', '.') * 1, size: { en: size, de: SIZE_DE[size] || size }, asi: { en: 'None (2024: ability scores come from your background)', de: 'Keine (2024: Attributswerte kommen vom Hintergrund)' }, tr: s.traits.map(x => T(x.index)), subs: {}, source: SRC };
    for (const ref of s.subspecies || []) {
      const sub = subsAll.find(x => x.index === ref.index);
      const pre = Object.keys(SUB_NAME).find(p => sub.index.startsWith(p));
      const sn = SUB_NAME[pre](sub);
      const tr = sub.traits.map(x => T(x.index, x.level));
      // Drachenabstammung: Odem und Resistenz der Farbe, Typ steht in der Unterart
      R.subs[sn] = { tr, ...(sub.traits.some(x => x.index === 'wood-elf-speed-increase') ? { sp: 10.5 } : {}) };
    }
    if (name === 'Dragonborn') R.tr.unshift(T('draconic-ancestry'));
    out[name] = R;
  }
  for (const [name, x] of Object.entries(extra)) out[name] = { sp: num(x.ft * 0.3).replace(',', '.') * 1, size: { en: x.size, de: SIZE_DE[x.size] }, asi: out.Human.asi, tr: x.traits.map(([n, en, nDe, deT]) => ({ n, de: nDe, text: { en, de: deT }, source: 'summary', verified: false })), subs: {}, source: 'summary' };
  const order = ['Aasimar', 'Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling'];
  const sorted = Object.fromEntries(order.filter(n => out[n]).map(n => [n, out[n]]));
  fs.writeFileSync(dataFile('races.json'), JSON.stringify(sorted, null, 1) + '\n');
  console.log(`Völker: ${Object.keys(sorted).length}, Unterarten: ${Object.values(sorted).reduce((a, r) => a + Object.keys(r.subs).length, 0)}`);
}

/* ---- Talente 2024: SRD-Texte wörtlich, übrige als eigene Zusammenfassung ---- */
function feats() {
  const own = ['feats-2024-a.json', 'feats-2024-b.json'].flatMap(f => readJson(path.join(trDir, f)));
  const srdF = Object.fromEntries(srd('Feats').map(f => [f.name.replace('Two Weapon', 'Two-Weapon'), f]));
  const out = own.map(f => {
    const s = f.srd && srdF[f.n];
    if (f.srd && !s) missing.push('Talent nicht im SRD: ' + f.n);
    const en = s ? clean(s.description).replace(/^You gain the following benefits\.\n/, '') : f.en;
    return { n: f.n, de: f.de, cat: f.cat, ...(f.req ? { req: f.req } : {}), ...(f.asi ? { asi: f.asi } : {}), text: { en, de: f.dt }, source: s ? SRC : 'summary', verified: false };
  });
  writeArr('feats.json', out);
  // Kampfstile sind 2024 Talente der Art „fighting“; die Auswahl unter Einrichten nutzt sie weiter als OPTIONS.fightingStyles.
  const opts = JSON.parse(fs.readFileSync(dataFile('options.json'), 'utf8'));
  opts.fightingStyles = out.filter(f => f.cat === 'fighting').map(f => ({ n: f.n, de: f.de, text: f.text, source: f.source, verified: false }));
  fs.writeFileSync(dataFile('options.json'), JSON.stringify(opts, null, 1) + '\n');
  console.log(`Talente: ${out.length} (SRD: ${out.filter(f => f.source === SRC).length})`);
}

/* ---- Klassen 2024 (alle zwölf): SRD-Merkmale wörtlich, deutsche Texte und Unterklassen außerhalb des SRD als eigene Zusammenfassung ---- */
const CLASSES_24 = { barbarian: 'Barbarian', bard: 'Bard', cleric: 'Cleric', druid: 'Druid', fighter: 'Fighter', monk: 'Monk', paladin: 'Paladin', ranger: 'Ranger', rogue: 'Rogue', sorcerer: 'Sorcerer', warlock: 'Warlock', wizard: 'Wizard' };
// Datenfehler im Paket: Zaubertricks des Druiden springen auf Stufe 7 und 16 (laut PHB 2 / 3 ab Stufe 4 / 4 ab Stufe 10)
const CANT_FIX = { druid: Array.from({ length: 20 }, (_, i) => (i + 1 >= 10 ? 4 : i + 1 >= 4 ? 3 : 2)) };
const SUBS_24 = { Bard: ['College of Dance', 'College of Glamour', 'College of Lore', 'College of Valor'], Cleric: ['Life Domain', 'Light Domain', 'Trickery Domain', 'War Domain'], Paladin: ['Oath of Devotion', 'Oath of Glory', 'Oath of the Ancients', 'Oath of Vengeance'], Ranger: ['Beast Master', 'Fey Wanderer', 'Gloom Stalker', 'Hunter'],
  Barbarian: ['Path of the Berserker', 'Path of the Wild Heart', 'Path of the World Tree', 'Path of the Zealot'], Druid: ['Circle of the Land', 'Circle of the Moon', 'Circle of the Sea', 'Circle of the Stars'], Fighter: ['Battle Master', 'Champion', 'Eldritch Knight', 'Psi Warrior'], Monk: ['Warrior of Mercy', 'Warrior of Shadow', 'Warrior of the Elements', 'Warrior of the Open Hand'], Rogue: ['Arcane Trickster', 'Assassin', 'Soulknife', 'Thief'], Sorcerer: ['Aberrant Sorcery', 'Clockwork Sorcery', 'Draconic Sorcery', 'Wild Magic Sorcery'], Warlock: ['Archfey Patron', 'Celestial Patron', 'Fiend Patron', 'Great Old One Patron'], Wizard: ['Abjurer', 'Diviner', 'Evoker', 'Illusionist'] };
function classes() {
  const de = tr('de-classes');
  const own = {};
  fs.readdirSync(trDir).filter(x => /^subclasses-2024-.*.json$/.test(x)).sort().forEach(x => Object.entries(readJson(path.join(trDir, x))).forEach(([k, v]) => { own[k] = { ...(own[k] || {}), ...v }; }));
  const feats = srd('Features'), levels = srd('Levels'), cls = srd('Classes'), subcls = srd('Subclasses');
  const C = JSON.parse(fs.readFileSync(dataFile('classes.json'), 'utf8'));
  const SC = JSON.parse(fs.readFileSync(dataFile('subclasses.json'), 'utf8'));
  const feat = x => { const t = { en: clean(x.description) }; if (de[x.index]) t.de = de[x.index]; else missing.push('Klassenmerkmal ohne Deutsch: ' + x.index); return { n: x.name.replace('Lay On Hands', 'Lay on Hands'), text: t, source: SRC, verified: false }; };
  const lvlOf = x => +String(x.level?.index || '').split('-').pop();
  for (const [idx, k] of Object.entries(CLASSES_24)) {
    const c = cls.find(x => x.index === idx), old = C[k];
    const ls = levels.filter(l => l.class?.index === idx && !l.subclass).sort((a, b) => a.level - b.level);
    const f = {};
    feats.filter(x => x.class?.index === idx && !x.subclass).forEach(x => { (f[lvlOf(x)] = f[lvlOf(x)] || []).push(feat(x)); });
    const subLv = ls.filter(l => l.features.some(x => /Subclass$/.test(x.name))).map(l => l.level);
    C[k] = { ...old, ed: 2024, hd: c.hit_die, sv: c.saving_throws.map(x => x.index), subL: 3, subs: SUBS_24[k], sl: subLv, asi: [4, 8, 12, 16, 19],
      prep: ls.map(l => l.spellcasting?.prepared_spells || 0), cant: CANT_FIX[idx] || ls.map(l => l.spellcasting?.cantrips_known || 0), f };
    if (!C[k].prep.some(Boolean)) delete C[k].prep;
    if (!C[k].cant.some(Boolean)) delete C[k].cant;
    // Unterklassen: SRD wörtlich, übrige aus den Zusammenfassungen
    const out = {};
    subcls.filter(x => x.class?.index === idx).forEach(sc => {
      const o = {};
      feats.filter(x => x.subclass?.index === sc.index).forEach(x => { (o[lvlOf(x)] = o[lvlOf(x)] || []).push(feat(x)); });
      out[sc.name] = o;
    });
    Object.entries(own[k] || {}).forEach(([n, byL]) => {
      out[n] = Object.fromEntries(Object.entries(byL).map(([l, list]) => [l, list.map(x => ({ n: x.n, text: { en: x.en, de: x.de }, source: 'summary', verified: false }))]));
    });
    SC[k] = Object.fromEntries(SUBS_24[k].filter(n => out[n]).map(n => [n, out[n]]));
    SUBS_24[k].filter(n => !out[n]).forEach(n => missing.push('Unterklasse fehlt: ' + n));
  }
  fs.writeFileSync(dataFile('classes.json'), JSON.stringify(C, null, 1) + '\n');
  fs.writeFileSync(dataFile('subclasses.json'), JSON.stringify(SC, null, 1) + '\n');
  console.log('Klassen 2024: ' + Object.values(CLASSES_24).join(', '));
}

const steps = { spells, conditions, mastery, items, magic, monsters, species, feats, classes };
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
for (const [name, fn] of Object.entries(steps)) if (!only.length || only.includes(name)) fn();
fs.writeFileSync(path.join(root, '.cache/missing-2024.txt'), missing.join('\n') + '\n');
console.log(`Fehlend: ${missing.length} (siehe .cache/missing-2024.txt)`);
