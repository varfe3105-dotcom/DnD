// Importiert SRD-5.1-Daten aus .cache/5e-database (5e-bits/5e-database) nach data/.
// Wiederholbar: node scripts/import-srd.mjs [--check]
// Englisch kommt wörtlich aus dem SRD. Deutsch und alles außerhalb des SRD steht in
// data/translations/ und wird hier nur zusammengeführt.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(root, '.cache/5e-database/src/2014/en');
if (!fs.existsSync(srcDir)) {
  console.error('Fehlt: git clone --depth 1 https://github.com/5e-bits/5e-database .cache/5e-database');
  process.exit(1);
}
const srd = f => JSON.parse(fs.readFileSync(path.join(srcDir, `5e-SRD-${f}.json`), 'utf8'));
const dataFile = f => path.join(root, 'data', f);
const readData = f => JSON.parse(fs.readFileSync(dataFile(f), 'utf8'));
const readTr = f => { const p = dataFile('translations/' + f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}; };
const writeArr = (f, a) => fs.writeFileSync(dataFile(f), '[\n' + a.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n');
const writeObj = (f, o) => fs.writeFileSync(dataFile(f), JSON.stringify(o, null, 1) + '\n');
export const descText = d => (Array.isArray(d) ? d : [d]).join('\n').replace(/\r/g, '').trim();

const report = { missing: [] };
const miss = (what, name) => report.missing.push(`${what}: ${name}`);

/* ---- Zustände ---- */
function conditions() {
  const by = Object.fromEntries(srd('Conditions').map(c => [c.name, c]));
  const out = readData('conditions.json').map(c => {
    const de = typeof c.text === 'object' ? c.text.de : c.p;
    const s = by[c.n];
    if (!s) miss('Zustand ohne SRD', c.n);
    return { n: c.n, de: c.de, ic: c.ic, text: { en: s ? descText(s.desc).replace(/^- /gm, '') : '', de }, source: s ? 'srd' : 'summary', verified: false };
  });
  writeArr('conditions.json', out);
  const ex = by.Exhaustion;
  return ex;
}

/* ---- Klassen: Englisch aus SRD-Features, sonst Zusammenfassung ---- */
const norm = s => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
function classes() {
  const data = readData('classes.json');
  const en = readTr('en-classes.json');
  const feats = srd('Features').filter(f => !f.subclass);
  for (const [klass, C] of Object.entries(data)) {
    const own = feats.filter(f => f.class.name === klass);
    for (const [lvl, list] of Object.entries(C.f)) {
      C.f[lvl] = list.map(raw => {
        const n = raw.n ?? raw[0];
        const de = raw.text?.de ?? raw[1];
        const candidates = own.filter(f => f.level === +lvl && (norm(f.name) === norm(n) || norm(f.name).startsWith(norm(n))));
        const hit = candidates[0];
        const key = `${klass}|${lvl}|${n}`;
        const summary = en[key];
        if (hit && !summary) return { n, text: { en: descText(hit.desc), de }, source: 'srd', verified: false };
        if (!summary) miss('Klassenmerkmal ohne Englisch', key);
        return { n, text: { en: summary || '', de }, source: 'summary', verified: false };
      });
    }
  }
  writeObj('classes.json', data);
}

/* ---- Völker ---- */
const ASI = [[/alle Attribute \+1/, 'all abilities +1'], [/zwei andere Attribute \+1/, 'two other abilities +1'], [/zwei Attribute \+1 \(statt alle\)/, 'two abilities +1 (instead of all)'], [/KON/g, 'CON'], [/WEI/g, 'WIS'], [/GES/g, 'DEX']];
const asiEn = de => ASI.reduce((s, [a, b]) => s.replace(a, b), de);
function races() {
  const data = readData('races.json');
  const en = readTr('en-races.json');
  const traits = Object.fromEntries(srd('Traits').map(t => [norm(t.name), t]));
  const conv = (owner, raw) => {
    const n = raw.n ?? raw[0];
    const de = raw.text?.de ?? raw[1];
    const key = `${owner}|${n}`;
    const summary = en[key] ?? en[`*|${n}`];
    const hit = traits[norm(n)];
    if (hit && !summary) return { n, text: { en: descText(hit.desc), de }, source: 'srd', verified: false };
    if (!summary) miss('Volksmerkmal ohne Englisch', key);
    return { n, text: { en: summary || '', de }, source: 'summary', verified: false };
  };
  for (const [race, R] of Object.entries(data)) {
    R.tr = R.tr.map(t => conv(race, t));
    if (typeof R.asi === 'string') R.asi = { en: asiEn(R.asi), de: R.asi };
    for (const [sn, sub] of Object.entries(R.subs)) {
      sub.tr = sub.tr.map(t => conv(sn, t));
      if (typeof sub.asi === 'string') sub.asi = { en: asiEn(sub.asi), de: sub.asi };
    }
  }
  writeObj('races.json', data);
}

/* ---- Zauber ---- */
const unit = (n, one, many) => `${n} ${+n === 1 ? one : many}`;
const num = v => String(Math.round(v * 10) / 10).replace('.', ',');
export function timeDe(s) {
  return s.replace(/^1 action$/, '1 Aktion').replace(/^1 bonus action$/, '1 Bonusaktion').replace(/^1 reaction$/, '1 Reaktion')
    .replace(/^(\d+) minutes?$/, (m, n) => unit(n, 'Minute', 'Minuten')).replace(/^(\d+) hours?$/, (m, n) => unit(n, 'Stunde', 'Stunden'));
}
export function feetToM(s) {
  return s.replace(/(\d[\d,]*)[- ](?:feet|foot)\b/g, (m, n) => `${num(+n.replace(/,/g, '') * 0.3)} m`)
    .replace(/(\d+)[- ]miles?\b/g, (m, n) => `${num(+n * 1.5)} km`);
}
export function rangeDe(s) {
  return feetToM(s).replace(/^Self/, 'Selbst').replace(/^Touch/, 'Berührung').replace(/^Sight/, 'Sicht').replace(/^Unlimited/, 'Unbegrenzt').replace(/^Special/, 'Speziell')
    .replace(/ radius\)/, ' Radius)').replace(/ cone\)/, ' Kegel)').replace(/ cube\)/, ' Würfel)').replace(/ line\)/, ' Linie)').replace(/ sphere\)/, ' Sphäre)').replace(/ hemisphere\)/, ' Halbkugel)');
}
export function durDe(s) {
  return s.replace(/^Concentration, up to /, 'Konz. bis ').replace(/^Up to /, 'bis ').replace(/^Instantaneous$/, 'Sofort').replace(/^Until dispelled or triggered$/, 'Bis gebannt oder ausgelöst').replace(/^Until dispelled$/, 'Bis gebannt').replace(/^Special$/, 'Speziell')
    .replace(/(\d+) rounds?/, (m, n) => unit(n, 'Runde', 'Runden')).replace(/(\d+) minutes?/, (m, n) => unit(n, 'Minute', 'Minuten')).replace(/(\d+) hours?/, (m, n) => unit(n, 'Stunde', 'Stunden')).replace(/(\d+) days?/, (m, n) => unit(n, 'Tag', 'Tage'));
}
const SCHOOL_IC = { evocation: 'flame', abjuration: 'shield', conjuration: 'swirl', divination: 'eye', enchantment: 'star', illusion: 'mask', necromancy: 'skull', transmutation: 'wing' };
const CLASS_L = { Bard: 'B', Cleric: 'C', Druid: 'D', Paladin: 'P', Ranger: 'R', Sorcerer: 'S', Warlock: 'K', Wizard: 'W' };
const SPELL_IC = { 'Cure Wounds': 'heart', 'Healing Word': 'heart', 'Mass Healing Word': 'heart', 'Mass Cure Wounds': 'heart', Revivify: 'heart', Aid: 'heart', 'Lesser Restoration': 'heart', 'Ray of Frost': 'snow', 'Shocking Grasp': 'bolt', 'Lightning Bolt': 'bolt', 'Eldritch Blast': 'bolt', 'Magic Missile': 'star', Light: 'torch', Fly: 'wing', "Hunter's Mark": 'bow', 'Spiritual Weapon': 'sword', Sleep: 'star', 'Sacred Flame': 'torch', 'Guiding Bolt': 'star' };
// PHB-Namen der im SRD umbenannten Zauber
export const PHB_ALIAS = { "Tasha's Hideous Laughter": 'Hideous Laughter', "Tenser's Floating Disk": 'Floating Disk', "Melf's Acid Arrow": 'Acid Arrow', "Nystul's Magic Aura": "Arcanist's Magic Aura", "Leomund's Tiny Hut": 'Tiny Hut', "Evard's Black Tentacles": 'Black Tentacles', "Leomund's Secret Chest": 'Secret Chest', "Mordenkainen's Faithful Hound": 'Faithful Hound', "Mordenkainen's Private Sanctum": 'Private Sanctum', "Otiluke's Resilient Sphere": 'Resilient Sphere', "Bigby's Hand": 'Arcane Hand', "Rary's Telepathic Bond": 'Telepathic Bond', "Drawmij's Instant Summons": 'Instant Summons', "Otiluke's Freezing Sphere": 'Freezing Sphere', "Otto's Irresistible Dance": 'Irresistible Dance', "Mordenkainen's Magnificent Mansion": 'Magnificent Mansion', "Mordenkainen's Sword": 'Arcane Sword' };
const nameKey = s => s.toLowerCase().replace(/[^a-z]/g, '');

function spells() {
  const de = { ...readTr('de-spells-1.json'), ...readTr('de-spells-2.json') };
  for (const [name, from, to] of readTr('de-spells-patches.json')) {
    if (!de[name]?.[1].includes(from)) { miss('Korrektur greift nicht', name); continue; }
    de[name][1] = de[name][1].replace(from, to);
  }
  const aka = Object.fromEntries(Object.entries(PHB_ALIAS).map(([p, s]) => [s, p]));
  const out = srd('Spells').map(s => {
    const d = de[s.name];
    if (!d) miss('Zauber ohne Deutsch', s.name);
    const conc = !!s.concentration;
    const durEn = conc ? `Concentration, ${s.duration.toLowerCase()}` : s.duration;
    const material = s.material ? { en: s.material } : null;
    return {
      n: s.name, ...(d ? { de: d[0] } : {}), ...(aka[s.name] ? { aka: aka[s.name] } : {}), lvl: s.level, school: s.school.index, ic: SPELL_IC[s.name] || SCHOOL_IC[s.school.index],
      cls: s.classes.map(c => CLASS_L[c.name]).filter(Boolean).join(''),
      time: { en: s.casting_time, de: timeDe(s.casting_time) }, range: { en: s.range, de: rangeDe(s.range) }, dur: { en: durEn, de: durDe(durEn) },
      comp: s.components.join(', '), ...(material ? { material: material.en } : {}), conc, ritual: !!s.ritual,
      text: { en: descText(s.desc), ...(d ? { de: d[1] } : {}) }, ...(s.higher_level?.length || d?.[2] ? { higher: { ...(s.higher_level?.length ? { en: descText(s.higher_level) } : {}), ...(d?.[2] ? { de: d[2] } : {}) } } : {}),
      source: 'srd', verified: false,
    };
  });
  for (const r of readTr('phb-extra-spells.json')) {
    const [n, deName, lvl, school, time, range, dur, comp, conc, ritual, cls, en, deT, higherEn, higherDe] = r;
    out.push({ n, de: deName, lvl, school, ic: SPELL_IC[n] || SCHOOL_IC[school], cls, time: { en: time, de: timeDe(time) }, range: { en: range, de: rangeDe(range) }, dur: { en: dur, de: durDe(dur) }, comp, conc: !!conc, ritual: !!ritual, text: { en, de: deT }, ...(higherEn ? { higher: { en: higherEn, de: higherDe } } : {}), source: 'summary', verified: false });
  }
  for (const [n, deName, lvl, school, time, range, dur, comp, conc, ritual, cls, en, deT, higherEn, higherDe, origin] of readTr('other-extra-spells.json')) out.push({ n, de: deName, lvl, school, ic: SCHOOL_IC[school], cls, time: { en: time, de: timeDe(time) }, range: { en: range, de: rangeDe(range) }, dur: { en: dur, de: durDe(dur) }, comp, conc: !!conc, ritual: !!ritual, text: { en, de: deT }, higher: { en: higherEn, de: higherDe }, origin, source: 'summary', verified: false });
  out.sort((a, b) => a.lvl - b.lvl || a.n.localeCompare(b.n));
  writeArr('spells.json', out);

  // Abgleich mit der PHB-Liste
  const have = new Set(out.map(s => nameKey(s.n)));
  const srdNames = new Set(srd('Spells').map(s => nameKey(s.name)));
  const phb = fs.readFileSync(dataFile('reference/phb-spell-names.txt'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).flatMap(l => l.split('|'));
  const resolved = phb.map(p => [p, nameKey(PHB_ALIAS[p] || p)]);
  const notInSrd = resolved.filter(([, k]) => !srdNames.has(k)).map(([p]) => p);
  const stillMissing = resolved.filter(([, k]) => !have.has(k)).map(([p]) => p);
  const extraSrd = out.filter(s => s.source === 'srd' && !resolved.some(([, k]) => k === nameKey(s.n))).map(s => s.n);
  fs.writeFileSync(path.join(root, 'docs/srd-gaps.md'), `# Abgleich PHB und SRD 5.1\n\nErzeugt von scripts/import-srd.mjs.\n\n## Zauber\n\nPHB-Liste: ${phb.length}. Im SRD: ${srdNames.size}. Im Katalog gesamt: ${out.length}.\n\nIm PHB, aber nicht im SRD (${notInSrd.length}, als Zusammenfassung ergänzt):\n\n${notInSrd.map(x => '- ' + x).join('\n')}\n\nNoch fehlend im Katalog (${stillMissing.length}): ${stillMissing.join(', ') || 'keine'}\n\nIm SRD, aber nicht in der PHB-Liste (${extraSrd.length}): ${extraSrd.join(', ') || 'keine'}\n`);
  console.log(`Zauber: ${out.length}, nicht im SRD: ${notInSrd.length}, fehlend: ${stillMissing.length}, SRD-Extras: ${extraSrd.length}`);
  if (stillMissing.length) console.log(stillMissing.join(', '));
  if (extraSrd.length) console.log('Extras:', extraSrd.join(', '));
  checkDe(out);
}

/** Vergleicht deutsche Texte mit dem Englischen: Würfel und Strecken müssen vorkommen. */
function checkDe(list) {
  const warn = [];
  for (const s of list) {
    if (!s.text.de) continue;
    const en = (s.text.en + ' ' + (s.higher?.en || ''));
    const de = (s.text.de + ' ' + (s.higher?.de || ''));
    const dice = [...new Set(en.match(/\b\d*d\d+\b/g) || [])].filter(d => !/^d(4|6|8|10|12|20|100)$/.test(d));
    const missDice = dice.filter(d => !de.includes(d.replace('d', 'W')));
    const miles = [...new Set(en.match(/\b(\d[\d,]*)[- ](?:feet|foot)\b/g) || [])].map(x => +x.match(/[\d,]+/)[0].replace(/,/g, ''));
    const missM = miles.filter(f => !de.includes(num(f * 0.3) + ' m') && !de.includes(num(f * 0.3) + '-m'));
    const conds = ['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'].filter(c => new RegExp(`\\b${c}\\b`, 'i').test(en) && !de.includes(c));
    if (missDice.length || missM.length) warn.push(`${s.n} [${s.source}]: Würfel ${missDice.join(' ') || '-'} | Fuß ${missM.join(' ') || '-'}${conds.length ? ' | Zustand ' + conds.join(' ') : ''}`);
  }
  fs.writeFileSync(path.join(root, '.cache/de-check.txt'), warn.join('\n') + '\n');
  console.log(`Prüfung Deutsch: ${warn.length} Zauber mit Abweichungen, siehe .cache/de-check.txt`);
}

/* ---- Ausrüstung ---- */
const COIN_DE = { gp: 'GM', sp: 'SM', cp: 'KM', ep: 'EM', pp: 'PM' };
const costEn = c => (c ? `${c.quantity.toLocaleString('en-US')} ${c.unit}` : '');
const costDe = c => (c ? `${c.quantity.toLocaleString('de-DE')} ${COIN_DE[c.unit] || c.unit}` : '');
const DMG_DE = { slashing: 'Hieb', piercing: 'Stich', bludgeoning: 'Wucht' };
const PROP_DE = { finesse: 'Finesse', light: 'Leicht', heavy: 'Schwer', 'two-handed': 'Zweihändig', reach: 'Reichweite', loading: 'Laden', special: 'Sonderregel' };
const die = (d, l) => { if (d === '1d1' || d === '1') return '1'; return l === 'de' ? d.replace('d', 'W') : d; };
const rangeFt = r => `${r.normal}/${r.long} ft.`;
const rangeM = r => `${num(r.normal * 0.3)}/${num(r.long * 0.3)} m`;
function weaponText(e) {
  const dmgType = e.damage?.damage_type?.index;
  const props = (e.properties || []).filter(p => p.index !== 'monk');
  const en = props.map(p => p.index === 'versatile' ? `Versatile (${e.two_handed_damage.damage_dice})` : p.index === 'thrown' ? `Thrown (${rangeFt(e.throw_range)})` : p.index === 'ammunition' ? `Ammunition (${rangeFt(e.range)})` : p.name);
  const de = props.map(p => p.index === 'versatile' ? `Vielseitig (${die(e.two_handed_damage.damage_dice, 'de')})` : p.index === 'thrown' ? `Wurf ${rangeM(e.throw_range)}` : p.index === 'ammunition' ? `Munition ${rangeM(e.range)}` : PROP_DE[p.index] || p.name);
  const catEn = e.weapon_category === 'Simple' ? 'Simple' : 'Martial', catDe = e.weapon_category === 'Simple' ? 'Einfach' : 'Krieg';
  return {
    en: [catEn, e.damage ? `${die(e.damage.damage_dice, 'en')} ${dmgType}` : '', en.join(', '), costEn(e.cost)].filter(Boolean).join(' · '),
    de: [catDe, e.damage ? `${die(e.damage.damage_dice, 'de')} ${DMG_DE[dmgType]}` : '', de.join(', '), costDe(e.cost)].filter(Boolean).join(' · '),
  };
}
function armorText(e) {
  const a = e.armor_class, cat = e.armor_category;
  if (cat === 'Shield') return { en: `+${a.base} AC · ${costEn(e.cost)}`, de: `+${a.base} RK · ${costDe(e.cost)}` };
  const CAT_DE = { Light: 'Leicht', Medium: 'Mittel', Heavy: 'Schwer' };
  const dexEn = a.dex_bonus ? (a.max_bonus ? ` + DEX (max +${a.max_bonus})` : ' + DEX') : '', dexDe = a.dex_bonus ? (a.max_bonus ? ` + GES (max. +${a.max_bonus})` : ' + GES') : '';
  return {
    en: [cat, `AC ${a.base}${dexEn}`, e.str_minimum ? `STR ${e.str_minimum}` : '', e.stealth_disadvantage ? 'Disadvantage on Stealth' : '', costEn(e.cost)].filter(Boolean).join(' · '),
    de: [CAT_DE[cat], `RK ${a.base}${dexDe}`, e.str_minimum ? `ST ${e.str_minimum}` : '', e.stealth_disadvantage ? 'Nachteil Heimlichkeit' : '', costDe(e.cost)].filter(Boolean).join(' · '),
  };
}
const WEAPON_IC = n => /bow|crossbow|sling|blowgun/i.test(n) ? 'bow' : /axe/i.test(n) ? 'axe' : /club|mace|maul|hammer|flail|morningstar|pick/i.test(n) ? 'hammer' : /spear|javelin|pike|lance|trident|halberd|glaive|dart/i.test(n) ? 'spear' : /staff/i.test(n) ? 'wand' : 'sword';
const GEAR_IC = [[/torch|candle|lamp|lantern/i, 'torch'], [/rations|feed/i, 'food'], [/rope|chain|string/i, 'box'], [/spellbook|book/i, 'book'], [/paper|parchment|ink|case, map/i, 'scroll'], [/pack$|backpack|pouch|sack|saddlebag|basket/i, 'bag'], [/poison|antitoxin|acid|holy water|alchemist|oil|vial/i, 'potion'], [/lock$|manacles/i, 'key'], [/hammer|crowbar|pick,|shovel|whetstone/i, 'tool'], [/clothes|robes|vestments/i, 'cloak'], [/waterskin|flask|bottle|jug/i, 'potion'], [/ring/i, 'ring']];
const gearIc = n => (GEAR_IC.find(([re]) => re.test(n)) || [0, 'box'])[1];
const CONSUMABLE = /^(Acid \(vial\)|Alchemist's fire \(flask\)|Antitoxin \(vial\)|Holy water \(flask\)|Poison, basic \(vial\))$/;
const CONS_GEAR = /^(Rations \(1 day\)|Torch|Candle|Oil \(flask\))$/;
const AMMO_Q = { Arrow: 20, 'Blowgun needle': 50, 'Crossbow bolt': 20, 'Sling bullet': 20 };
const GROUP_DE = { tool: 'Werkzeugübung', instrument: 'Instrument', game: 'Spielset', focus: 'Zauberfokus', mount: '' };

function saveLegacy() {
  const p = dataFile('reference/legacy-texts.json');
  if (fs.existsSync(p)) return;
  const old = [...readData('potions.json'), ...readData('items.json'), ...readData('magic-items.json')].filter(x => typeof x.n === 'string');
  fs.writeFileSync(p, JSON.stringify(Object.fromEntries(old.map(x => [x.n, x.p]))) + '\n');
}
function items() {
  saveLegacy();
  const de = readTr('de-items.json');
  const out = srd('Equipment').map(e => {
    const d = de[e.name];
    if (!d) miss('Ausrüstung ohne Deutsch', e.name);
    const gc = e.gear_category?.index, ec = e.equipment_category.index, tc = e.tool_category;
    let group, slot = '', ic, text, ac;
    if (ec === 'weapon') { group = e.weapon_category === 'Simple' ? 'simple' : 'martial'; slot = 'hand'; ic = WEAPON_IC(e.name); text = weaponText(e); }
    else if (ec === 'armor') { group = 'armor'; slot = e.armor_category === 'Shield' ? 'off' : 'body'; ic = e.armor_category === 'Shield' ? 'shield' : 'armor'; text = armorText(e); ac = e.armor_category === 'Shield' ? { shield: e.armor_class.base } : { b: e.armor_class.base, dex: !!e.armor_class.dex_bonus, max: e.armor_class.max_bonus ?? null, cat: e.armor_category }; }
    else {
      const body = e.desc?.length && !/^(These special tools|Several of the most|This item encompasses|Barding is armor|An arcane focus|A druidic focus|A holy symbol)/.test(e.desc[0]) ? descText(e.desc) : '';
      if (gc === 'equipment-packs') { group = 'pack'; ic = 'bag'; }
      else if (['holy-symbols', 'arcane-foci', 'druidic-foci'].includes(gc)) { group = 'focus'; slot = 'hand'; ic = gc === 'holy-symbols' ? 'amulet' : gc === 'druidic-foci' ? 'leaf' : /crystal|orb/i.test(e.name) ? 'gem' : 'wand'; }
      else if (ec === 'tools') { group = 'tool'; ic = tc === 'Musical Instrument' ? 'music' : tc === 'Gaming Sets' ? 'dice' : 'tool'; }
      else if (ec === 'mounts-and-vehicles') { group = 'mount'; ic = 'box'; }
      else if (gc === 'kits') { group = 'tool'; ic = /Healer/.test(e.name) ? 'heart' : /Poison/.test(e.name) ? 'skull' : /Disguise/.test(e.name) ? 'mask' : /Herbal/.test(e.name) ? 'leaf' : /Mess/.test(e.name) ? 'food' : 'tool'; }
      else { group = 'gear'; ic = e.name === 'Component pouch' ? 'bag' : gearIc(e.name); }
      if (e.name === 'Spellbook') { group = 'focus'; ic = 'book'; }
      if (e.name === 'Component pouch') group = 'focus';
      const contentsEn = e.contents?.length ? e.contents.map(c => (c.quantity > 1 ? c.quantity + ' ' : '') + c.item.name).join(', ') : '';
      const contentsDe = e.contents?.length ? e.contents.map(c => (c.quantity > 1 ? c.quantity + ' ' : '') + (de[c.item.name]?.[0] || c.item.name)).join(', ') : '';
      const kindDe = tc === 'Musical Instrument' ? GROUP_DE.instrument : tc === 'Gaming Sets' ? GROUP_DE.game : ec === 'tools' ? GROUP_DE.tool : group === 'focus' && e.name !== 'Spellbook' && e.name !== 'Component pouch' ? GROUP_DE.focus : '';
      const kindEn = tc || (group === 'focus' && e.name !== 'Spellbook' && e.name !== 'Component pouch' ? 'Spellcasting focus' : '');
      text = {
        en: [kindEn, contentsEn, body, costEn(e.cost)].filter(Boolean).join(' · '),
        de: [kindDe, contentsDe, d?.[1] || '', costDe(e.cost)].filter(Boolean).join(' · '),
      };
    }
    const cons = CONS_GEAR.test(e.name) || CONSUMABLE.test(e.name) || e.gear_category?.index === 'ammunition';
    const q = AMMO_Q[e.name] || 1;
    if (e.weapon_category && d?.[1]) text.de += ' · ' + d[1];
    return { id: e.index, k: CONSUMABLE.test(e.name) ? 'potion' : 'item', n: { en: e.name, ...(d ? { de: d[0] } : {}) }, ic, group: CONSUMABLE.test(e.name) ? 'potion' : group, slot, cons, q, text, ...(ac ? { ac } : {}), ...(e.weight ? { w: e.weight } : {}), source: 'srd', verified: false };
  });
  writeArr('items.json', out);
  console.log(`Ausrüstung: ${out.length}`);
}

/* ---- Magische Gegenstände ---- */
const RARITY_DE = { Common: 'Gewöhnlich', Uncommon: 'Ungewöhnlich', Rare: 'Selten', 'Very Rare': 'Sehr selten', 'Very rare': 'Sehr selten', Legendary: 'Legendär', Artifact: 'Artefakt', Varies: 'Variiert' };
const magicSlot = (n, cat) => cat === 'ring' ? 'ring' : cat === 'armor' ? (/shield/i.test(n) ? 'off' : 'body') : ['weapon', 'rod', 'staff', 'wand'].includes(cat) ? 'hand' : /shield/i.test(n) ? 'off' : /boots|slippers/i.test(n) ? 'feet' : /gloves|gauntlets|bracers/i.test(n) ? 'hands' : /belt/i.test(n) ? 'waist' : /cloak|cape|robe|mantle|wings of/i.test(n) ? 'cloak' : /amulet|periapt|necklace|medallion|brooch|scarab/i.test(n) ? 'neck' : /helm|hat|headband|circlet|goggles|eyes of/i.test(n) ? 'head' : '';
const magicIc = (n, cat) => cat === 'ring' ? 'ring' : cat === 'potion' ? 'potion' : cat === 'scroll' ? 'scroll' : cat === 'armor' ? (/shield/i.test(n) ? 'shield' : 'armor') : cat === 'weapon' ? WEAPON_IC(n) : ['rod', 'staff', 'wand'].includes(cat) ? 'wand' : /shield/i.test(n) ? 'shield' : /boots|slippers/i.test(n) ? 'boots' : /gloves|gauntlets|bracers/i.test(n) ? 'gloves' : /belt/i.test(n) ? 'belt' : /cloak|cape|robe|mantle|wings/i.test(n) ? 'cloak' : /amulet|periapt|necklace|medallion|brooch|scarab/i.test(n) ? 'amulet' : /helm|hat|headband|circlet|goggles|eyes/i.test(n) ? 'helm' : /bag|haversack|quiver/i.test(n) ? 'bag' : /manual|tome/i.test(n) ? 'book' : /gem|stone|pearl|orb|ball/i.test(n) ? 'gem' : /oil|philter|ointment|dust|solvent|glue/i.test(n) ? 'potion' : /horn|pipes|chime/i.test(n) ? 'music' : 'star';
const CONS_MAGIC = /^(Potion|Oil|Philter|Spell Scroll|Dust of|Restorative Ointment|Bead of Force|Elemental Gem|Feather Token|Arrow of Slaying|Sovereign Glue|Universal Solvent|Ammunition)/;
const GIANT = { Hill: 21, Stone: 23, Frost: 23, Fire: 25, Cloud: 27, Storm: 29 };
const VARIANT_DE = {
  'potion-of-healing-common': ['Trank der Heilung', 'Aktion: Heilt 2W4+2 TP.'], 'potion-of-healing-greater': ['Trank der großen Heilung', 'Aktion: Heilt 4W4+4 TP.'], 'potion-of-healing-superior': ['Trank der überlegenen Heilung', 'Aktion: Heilt 8W4+8 TP.'], 'potion-of-healing-supreme': ['Trank der höchsten Heilung', 'Aktion: Heilt 10W4+20 TP.'],
};
function variantDe(v, parentName, d) {
  if (VARIANT_DE[v.index]) return VARIANT_DE[v.index];
  const g = v.name.match(/(Hill|Stone|Frost|Fire|Cloud|Storm) Giant Strength/);
  if (g) { const score = GIANT[g[1]]; const potion = /^Potion/.test(v.name); return [g[1] === 'Hill' && potion ? 'Trank der Hügelriesenstärke' : `${d[0]} (${g[1]})`, `${potion ? '1 Stunde: ' : ''}Deine Stärke wird ${score} (keine Wirkung, wenn sie schon höher ist).`]; }
  if (/, \+1, \+2, or \+3$/.test(parentName)) return [`${d[0]}, ${v.name.match(/\+\d/)[0]}`, d[1]];
  const parentWords = new Set(parentName.toLowerCase().split(/[\s,()]+/));
  const diff = v.name.split(/[\s]+/).filter(w => !parentWords.has(w.toLowerCase().replace(/[,()]/g, ''))).join(' ');
  return [`${d[0]}${diff ? ` (${diff})` : ''}`, d[1]];
}
function magic() {
  saveLegacy();
  const de = readTr('de-magic.json');
  const all = srd('Magic-Items');
  const byIndex = Object.fromEntries(all.map(x => [x.index, x]));
  const parentOf = {};
  all.filter(x => x.variants?.length).forEach(p => p.variants.forEach(v => { if (v.index !== p.index) parentOf[v.index] = p; }));
  const rows = all.filter(x => !(x.variants?.length) ).map(x => {
    const parent = parentOf[x.index];
    const cat = x.equipment_category.index;
    const base = parent || x;
    const d = de[base.name];
    if (!d) miss('Magischer Gegenstand ohne Deutsch', base.name);
    const [nDe, tDe] = d ? (parent ? variantDe(x, parent.name, d) : d) : [null, null];
    const [line, ...rest] = x.desc;
    const att = /requires attunement/i.test(line);
    const rarity = x.rarity?.name || '';
    return { id: x.index, k: cat === 'potion' ? 'potion' : 'magic', n: { en: x.name, ...(nDe ? { de: nDe } : {}) }, ic: magicIc(x.name, cat), slot: magicSlot(x.name, cat), att, cons: CONS_MAGIC.test(x.name), rarity: { en: rarity, de: RARITY_DE[rarity] || rarity }, text: { en: descText(rest.length ? rest : x.desc), ...(tDe ? { de: tDe } : {}) }, source: 'srd', verified: false };
  });
  for (const [en, deN, ic, slot, att, cons, rarity, te, td] of readTr('dmg-extra-items.json')) rows.push({ id: en.toLowerCase().replace(/[^a-z0-9]+/g, '-'), k: /^(Potion|Elixir)/.test(en) ? 'potion' : 'magic', n: { en, de: deN }, ic, slot, att: !!att, cons: !!cons, rarity: { en: rarity, de: RARITY_DE[rarity] || rarity }, text: { en: te, de: td }, source: 'summary', verified: false });
  writeArr('magic-items.json', rows.filter(r => r.k !== 'potion'));
  const gear = readData('items.json');
  const gearPotions = new Map([...readData('potions.json').filter(r => r.rarity === undefined), ...gear.filter(r => r.k === 'potion')].map(r => [r.id, r]));
  const potionRows = [...gearPotions.values(), ...rows.filter(r => r.k === 'potion')];
  writeArr('potions.json', potionRows);
  writeArr('items.json', gear.filter(r => r.k !== 'potion'));
  console.log(`Magische Gegenstände: ${rows.length}`);
  checkDe(rows.map(r => ({ n: r.n.en, source: r.source, text: r.text })));
  console.log(`Tränke und Verbrauchsgüter: ${potionRows.length}`);
}

/* ---- Unterklassen, Talente, Auswahloptionen ---- */
const SUB_SRD = { 'Path of the Berserker': 'Berserker', 'College of Lore': 'Lore', 'Life Domain': 'Life', 'Circle of the Land': 'Land', Champion: 'Champion', 'Way of the Open Hand': 'Open Hand', 'Oath of Devotion': 'Devotion', Hunter: 'Hunter', Thief: 'Thief', 'Draconic Bloodline': 'Draconic', 'The Fiend': 'Fiend', 'School of Evocation': 'Evocation' };
function subclasses() {
  const feats = srd('Features').filter(f => f.subclass);
  const data = { ...readTr('subclasses-1.json'), ...readTr('subclasses-2.json') };
  const out = {};
  for (const [key, levels] of Object.entries(data)) {
    const [klass, sub] = key.split('|');
    const srdName = SUB_SRD[sub];
    const res = {};
    for (const [lvl, list] of Object.entries(levels)) {
      res[lvl] = list.map(([n, en, de]) => {
        if (en) return { n, text: { en, de }, source: 'summary', verified: false };
        const main = feats.find(f => f.subclass.name === srdName && +f.level === +lvl && f.name === n);
        if (!main) { miss('Unterklassenmerkmal ohne SRD', `${key}|${lvl}|${n}`); return { n, text: { en: '', de }, source: 'summary', verified: false }; }
        const parts = feats.filter(f => f.subclass.name === srdName && +f.level === +lvl && f.name.startsWith(n + ':')).map(f => `${f.name.slice(n.length + 2)}: ${descText(f.desc)}`);
        return { n, text: { en: [descText(main.desc), ...parts].join('\n'), de }, source: 'srd', verified: false };
      });
    }
    (out[klass] = out[klass] || {})[sub] = res;
  }
  writeObj('subclasses.json', out);
  const { feats: ft, fightingStyles, metamagic, invocations } = readTr('feats-options.json');
  const grappler = srd('Feats')[0];
  writeArr('feats.json', ft.map(([n, de, req, asi, en, deT]) => ({ n, de, ...(req ? { req } : {}), ...(asi ? { asi } : {}), text: { en: n === 'Grappler' ? descText(grappler.desc).replace(/^- /gm, '') : en, de: deT }, source: n === 'Grappler' ? 'srd' : 'summary', verified: false })));
  const opt = a => a.map(([n, en, de]) => ({ n, text: { en, de }, source: 'summary', verified: false }));
  writeObj('options.json', { fightingStyles: opt(fightingStyles), metamagic: opt(metamagic), invocations: opt(invocations) });
  console.log(`Unterklassen: ${Object.values(out).reduce((a, c) => a + Object.keys(c).length, 0)}, Talente: ${ft.length}`);
}

/* ---- Monster für den Kampf-Tracker ---- */
function monsters() {
  const usage = u => {
    if (!u) return '';
    if (u.type === 'recharge on roll') return ` (Recharge ${u.min_value}${u.min_value < 6 ? '-6' : ''})`;
    if (u.type === 'per day') return ` (${u.times}/Day)`;
    if (u.type === 'recharge after rest') return ` (Recharges after a ${(u.rest_types || []).join(' or ')} rest)`;
    return '';
  };
  const part = (title, list) => (list?.length ? [`${title}`, ...list.map(x => `${x.name}${/\(/.test(x.name) ? '' : usage(x.usage)}. ${x.desc || ''}`.trim())] : []);
  const out = srd('Monsters').map(m => ({
    id: m.index, n: m.name, size: m.size, type: m.type, cr: m.challenge_rating, ac: m.armor_class?.[0]?.value ?? 10, hp: m.hit_points, hd: m.hit_points_roll || m.hit_dice, speed: Object.entries(m.speed || {}).map(([k, v]) => `${k} ${v}`).join(', '),
    abil: { str: m.strength, dex: m.dexterity, con: m.constitution, int: m.intelligence, wis: m.wisdom, cha: m.charisma },
    text: [...part('Traits', m.special_abilities), ...part('Actions', m.actions), ...part('Reactions', m.reactions), ...part('Legendary Actions', m.legendary_actions)].join('\n'),
    source: 'srd', verified: false,
  }));
  writeArr('monsters.json', out);
  console.log(`Monster: ${out.length}`);
}

const steps = { conditions, classes, races, spells, items, magic, subclasses, monsters };
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
for (const [name, fn] of Object.entries(steps)) if (!only.length || only.includes(name)) fn();
if (report.missing.length) console.log(report.missing.join('\n'));
console.log(`Fehlend: ${report.missing.length}`);
