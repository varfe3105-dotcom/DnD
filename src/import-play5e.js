// Importer für Sicherungen aus dem externen Charakter-Tool ("kind": "dnd-backup").
// Was sich nicht zuordnen lässt, landet in den Notizen. Eigene Regeln werden nicht geraten.
import { z } from 'zod';
import { S, def, mk, spFrom, putBag, norm, setS, save, openFresh } from './state.js';
import { CLASSES, RACES, BYN, FEATS, SUBCLASSES, COND, byName } from './catalog.js';
import { classLevels, slotsAll, pactFor, pb } from './tables.js';
import { resFor, applyRace, syncAc } from './helpers.js';
import { SK, CLN } from './constants.js';
import { mod } from './util.js';
import { t, loc } from './i18n/index.js';

const score = z.number().int().min(1).max(30);
const Char = z.object({
  name: z.string().default(''),
  classes: z.array(z.object({ classId: z.string(), subclassId: z.string().nullable().optional(), level: z.number().int().min(1).max(20), hitPointsPerLevel: z.array(z.number()).default([]) })).min(1),
  raceId: z.string().nullable().optional(),
  subraceId: z.string().nullable().optional(),
  backgroundId: z.string().nullable().optional(),
  abilities: z.object({ str: score, dex: score, con: score, int: score, wis: score, cha: score }),
  raceAsiChoice: z.record(z.string(), z.unknown()).default({}),
  asiChoices: z.array(z.unknown()).default([]),
  featIds: z.array(z.string()).default([]),
  skillProficiencies: z.array(z.string()).default([]),
  skillExpertise: z.array(z.string()).default([]),
  grantedSkills: z.object({ proficiency: z.array(z.string()).default([]), expertise: z.array(z.string()).default([]) }).default({ proficiency: [], expertise: [] }),
  savingThrowProficiencies: z.array(z.string()).default([]),
  toolProficiencies: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  otherProficiencies: z.array(z.string()).default([]),
  hitPoints: z.object({ current: z.number().default(0), temporary: z.number().default(0), bonusMax: z.number().default(0) }).default({ current: 0, temporary: 0, bonusMax: 0 }),
  hitDiceSpent: z.record(z.string(), z.number()).default({}),
  deathSaves: z.object({ successes: z.number().default(0), failures: z.number().default(0) }).default({ successes: 0, failures: 0 }),
  slotsSpent: z.array(z.number()).default([]),
  pactSlotsSpent: z.number().default(0),
  concentratingOn: z.string().nullable().optional(),
  conditions: z.array(z.string()).default([]),
  inspiration: z.boolean().default(false),
  exhaustion: z.number().int().min(0).max(6).default(0),
  spells: z.array(z.object({ spellId: z.string() }).loose()).default([]),
  inventory: z.array(z.object({ itemId: z.string().nullable().optional(), name: z.string(), quantity: z.number().default(1), kind: z.string().optional(), equipped: z.boolean().default(false), attuned: z.boolean().default(false), notes: z.string().default(''), meta: z.object({}).loose().optional() })).default([]),
  currency: z.object({ cp: z.number().default(0), sp: z.number().default(0), ep: z.number().default(0), gp: z.number().default(0), pp: z.number().default(0) }).default({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }),
  details: z.object({}).loose().default({}),
  customBackground: z.object({ name: z.string().optional() }).loose().optional(),
}).loose();
const Backup = z.object({ kind: z.literal('dnd-backup'), characters: z.array(Char).min(1) }).loose();

/** Erkennt Dateien des externen Tools, ohne sie schon zu prüfen. */
export const isPlay5e = o => !!o && typeof o === 'object' && (o.kind === 'dnd-backup' || (Array.isArray(o.classes) && !!o.abilities));

const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const SUBRACE_ALIAS = { 'dark-elf': 'Drow', variant: 'Variant Human', 'variant-human': 'Variant Human' };
const titled = s => String(s || '').split(/[-_ ]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

const findKey = (keys, id) => keys.find(k => slug(k) === slug(id));
function findSub(klass, id) {
  const part = String(id || '').split('/').pop();
  if (!part) return '';
  return (CLASSES[klass]?.subs || []).find(s => slug(s) === slug(part) || slug(s).split('-').includes(part) || slug(s).includes(part)) || '';
}
function findSubrace(race, id) {
  const part = String(id || '').split('/').pop();
  if (!part || !RACES[race]) return '';
  const subs = Object.keys(RACES[race].subs);
  return (SUBRACE_ALIAS[part] && subs.includes(SUBRACE_ALIAS[part]) && SUBRACE_ALIAS[part]) || subs.find(s => slug(s) === part || slug(s).startsWith(part + '-') || part.startsWith(slug(s))) || '';
}
const ABIL_DE = { STR: 'str', GES: 'dex', KON: 'con', INT: 'int', WEI: 'wis', CHA: 'cha' };
/** Volksboni aus den Katalogtexten; freie Wahl kommt aus der Datei. */
function raceBonus(race, sub, choice) {
  const out = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const R = RACES[race];
  if (!R) return out;
  const texts = [R.asi?.de, R.subs[sub]?.asi?.de].filter(Boolean);
  const variant = sub === 'Variant Human';
  for (const s of texts) {
    if (/alle Attribute \+1/.test(s) && !variant) Object.keys(out).forEach(k => { out[k] += 1; });
    for (const m of s.matchAll(/\b(STR|GES|KON|INT|WEI|CHA) \+(\d)/g)) out[ABIL_DE[m[1]]] += +m[2];
  }
  Object.entries(choice).forEach(([k, v]) => { if (k in out && typeof v === 'number') out[k] += v; });
  return out;
}
function catalogItem(it) {
  const id = slug(it.itemId || it.name);
  const candidates = [id, id.replace(/-s(-|$)/g, 's$1'), `${id}-armor`, id.replace(/^(.*)-clothes$/, 'clothes-$1'), id.replace(/^leather$/, 'leather-armor')];
  for (const c of candidates) for (const k of ['item', 'potion', 'magic']) if (BYN[`${k}:${c}`]) return BYN[`${k}:${c}`];
  return byName(it.name) || null;
}
function ownItem(it) {
  const m = it.meta || {};
  const bits = [m.category, m.damage && `${m.damage} ${m.damageType || ''}`.trim(), Array.isArray(m.properties) && m.properties.join(', '), m.cost, m.description].filter(Boolean);
  return { w: typeof m.weightLb === 'number' ? m.weightLb : 0, n: it.name, ic: it.kind === 'weapon' ? 'sword' : it.kind === 'armor' ? 'armor' : 'box', p: bits.join(' · '), slot: it.kind === 'weapon' ? 'hand' : it.kind === 'armor' ? 'body' : '', cons: false, att: false };
}
function place(entry, it) {
  const item = mk(entry, Math.max(1, it.quantity || 1));
  if (entry.w && !entry.key) item.w = entry.w;
  if (it.attuned) item.tuned = true;
  const free = it.equipped && (item.slot === 'hand' ? ['main', 'off'] : item.slot === 'ring' ? ['ring1', 'ring2'] : item.slot ? [item.slot] : []).find(k => !S.eq[k]);
  if (free) S.eq[free] = item; else putBag(S, item);
}

function build(c) {
  const rep = { name: c.name, ok: [], own: [], notes: [] };
  const toNotes = [];
  const unknownClass = c.classes.find(x => !findKey(Object.keys(CLASSES), x.classId));
  if (unknownClass) return { error: t('imp.badClass', { n: unknownClass.classId }) };
  const list = c.classes.map(x => { const k = findKey(Object.keys(CLASSES), x.classId); return { k, lvl: x.level, sub: findSub(k, x.subclassId), raw: x }; });
  const first = list[0];
  c.classes.forEach((x, i) => { if (x.subclassId && !list[i].sub) toNotes.push(`${t('setup.subclass')}: ${titled(String(x.subclassId).split('/').pop())}`); });
  const race = findKey(Object.keys(RACES), c.raceId);
  const subrace = race ? findSubrace(race, c.subraceId) : '';
  if (c.raceId && !race) toNotes.push(`${t('setup.race')}: ${titled(c.raceId)}`);
  if (c.subraceId && !subrace) toNotes.push(`${t('setup.subrace')}: ${titled(String(c.subraceId).split('/').pop())}`);
  const bonus = raceBonus(race, subrace, c.raceAsiChoice);
  const abil = Object.fromEntries(Object.entries(c.abilities).map(([k, v]) => [k, Math.min(30, v + bonus[k])]));
  const level = list.reduce((a, x) => a + x.lvl, 0);
  const con = mod(abil.con), perLevel = subrace === 'Hill Dwarf' ? 1 : 0;
  let hpMax = c.hitPoints.bonusMax;
  list.forEach((x, ci) => {
    const die = CLASSES[x.k].hd;
    for (let l = 0; l < x.lvl; l++) hpMax += (ci === 0 && l === 0 ? die : (x.raw.hitPointsPerLevel[l] || die / 2 + 1)) + con + perLevel;
  });
  const bg = c.customBackground?.name || (c.backgroundId ? titled(c.backgroundId) : '');
  const alignment = typeof c.details.alignment === 'string' ? c.details.alignment : '';
  const skills = {};
  const unknownSkills = [];
  const setSkill = (raw, v) => { const s = SK.find(x => x[0].toLowerCase() === String(raw).toLowerCase()); if (s) skills[s[0]] = Math.max(skills[s[0]] || 0, v); else unknownSkills.push(raw); };
  [...c.skillProficiencies, ...c.grantedSkills.proficiency].forEach(s => setSkill(s, 1));
  [...c.skillExpertise, ...c.grantedSkills.expertise].forEach(s => setSkill(s, 2));
  const saves = {};
  CLASSES[first.k].sv.forEach(k => { saves[k] = true; });
  c.savingThrowProficiencies.forEach(s => { const k = slug(s).slice(0, 3); if (k in abil) saves[k] = true; });
  const condNames = new Set(COND.map(x => x.n));
  const cond = {};
  c.conditions.forEach(n => { const m = [...condNames].find(x => x.toLowerCase() === String(n).toLowerCase()); if (m) cond[m] = true; else toNotes.push(`${t('cond.title')}: ${n}`); });

  setS(norm({
    ...def(), name: c.name || t('char.new'), info: [bg, alignment].filter(Boolean).join(' · '), race: race || '', subrace, klass: first.k, sub: first.sub, level, cls: CLASSES[first.k].l,
    multi: list.slice(1).map(x => ({ k: x.k, sub: x.sub, lvl: x.lvl })), hpMax, hp: Math.min(hpMax, Math.max(0, c.hitPoints.current)), tmp: Math.max(0, c.hitPoints.temporary),
    ac: 10 + mod(abil.dex), prof: pb(level), abil, saves, skills, cond, exh: c.exhaustion, conc: c.concentratingOn || '', death: { s: c.deathSaves.successes, f: c.deathSaves.failures },
    hd: { max: level, used: Math.min(level, Object.values(c.hitDiceSpent).reduce((a, n) => a + n, 0)), die: 'W' + CLASSES[first.k].hd },
    acMode: 'auto', tools: c.toolProficiencies, langs: c.languages, gold: { pp: c.currency.pp, gp: c.currency.gp, ep: c.currency.ep, sp: c.currency.sp, cp: c.currency.cp }, tab: 'setup',
  }));
  if (typeof c.details.portrait === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(c.details.portrait)) S.img = c.details.portrait;
  if (race) applyRace();

  // Plätze, Merkmale, Fähigkeiten
  const all = classLevels();
  slotsAll(all).forEach((m, i) => { S.slots[i].max = m; S.slots[i].used = Math.min(m, Math.max(0, c.slotsSpent[i] || 0)); });
  const lock = all.find(x => x.k === 'Warlock');
  if (lock) { const [max, lvl] = pactFor(lock.lvl); S.pact = { max, lvl, used: Math.min(max, c.pactSlotsSpent) }; }
  let features = 0;
  all.forEach(x => {
    const C = CLASSES[x.k];
    for (let l = 1; l <= x.lvl; l++) {
      (C.f[l] || []).forEach(f => { S.feats.push({ n: f.n, p: loc(f.text), lvl: l, src: 'Klasse' }); features++; });
      (SUBCLASSES[x.k]?.[x.sub]?.[l] || []).forEach(f => { S.feats.push({ n: f.n, p: loc(f.text), lvl: l, src: 'Unterklasse' }); features++; });
    }
    resFor(x.k, x.lvl).forEach(r => { if (!S.res.some(y => y.n === r.n)) S.res.push({ n: r.n, ic: r.ic, max: r.max, used: 0, rest: r.rest, p: r.p }); });
  });
  c.featIds.forEach(id => { const f = FEATS.find(x => slug(x.n) === slug(id)); if (f) { S.feats.push({ n: f.n, p: loc(f.text), lvl: 0, src: 'Talent' }); features++; } else toNotes.push(`${t('feat.feat')}: ${titled(id)}`); });
  if (c.asiChoices.length) toNotes.push(t('imp.asiNote'));

  // Zauber
  const spellByslug = Object.fromEntries(Object.values(BYN).filter(e => e.k === 'spell').map(e => [slug(e.n), e]));
  const missingSpells = [];
  c.spells.forEach(s => {
    const e = spellByslug[slug(s.spellId)];
    if (e && !S.spells.some(x => x.n === e.n)) S.spells.push(spFrom(e));
    else if (!e) missingSpells.push(titled(s.spellId));
  });

  // Inventar
  let matched = 0;
  c.inventory.forEach(it => {
    const e = catalogItem(it);
    if (e) { place(e, it); matched++; } else { place(ownItem(it), it); rep.own.push(it.name); }
    if (it.notes) toNotes.push(`${it.name}: ${it.notes}`);
  });

  syncAc();

  // Notizen
  if (missingSpells.length) toNotes.push(`${t('imp.spellsMissing')}: ${missingSpells.join(', ')}`);
  if (unknownSkills.length) toNotes.push(`${t('skill.title')}: ${unknownSkills.join(', ')}`);
  if (c.otherProficiencies.length) toNotes.push(`${t('imp.other')}: ${c.otherProficiencies.join(', ')}`);
  if (c.inspiration) toNotes.push(t('imp.inspiration'));
  const sections = ['backstory', 'personality', 'ideals', 'bonds', 'flaws', 'appearance', 'notes'].map(k => [k, c.details[k]]).filter(([, v]) => typeof v === 'string' && v.trim());
  S.notes = [...sections.map(([k, v]) => `## ${t('imp.d.' + k)}\n${v.trim()}`), ...(toNotes.length ? [`## ${t('imp.unmapped')}\n${toNotes.map(x => '- ' + x).join('\n')}`] : [])].join('\n\n');

  const bonusText = Object.entries(bonus).filter(([, v]) => v).map(([k, v]) => `${t('abs.' + k)} +${v}`).join(', ');
  rep.ok.push(
    `${t('setup.race')}: ${subrace || race || '–'}`,
    `${t('setup.class')}: ${all.map(x => `${x.k} ${x.lvl}${x.sub ? ' (' + x.sub + ')' : ''}`).join(' / ')}`,
    `${t('wiki.abilities')}: ${Object.entries(abil).map(([k, v]) => `${t('abs.' + k)} ${v}`).join(', ')}${bonusText ? ` (${t('imp.withBonus', { b: bonusText })})` : ''}`,
    `${t('head.hpShort')}: ${S.hp}/${S.hpMax} · ${t('stat.ac')}: ${S.ac}`,
    t('imp.count', { a: S.spells.length, b: matched + rep.own.length, c: features }),
    ...(S.tools.length ? [`${t('setup.tools')}: ${S.tools.join(', ')}`] : []),
    ...(S.langs.length ? [`${t('setup.langs')}: ${S.langs.join(', ')}`] : []),
    `${t('inv.money')}: ${S.gold.gp} ${t('coin.gp')}`,
  );
  rep.notes = toNotes;
  return { rep };
}

/** Importiert alle Charaktere der Sicherung als neue Charaktere. Gibt einen Bericht oder Fehlertext zurück. */
export function importPlay5e(raw) {
  const data = raw.kind === 'dnd-backup' ? raw : { kind: 'dnd-backup', characters: [raw] };
  const parsed = Backup.safeParse(data);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { error: t('imp.invalid', { p: i.path.join('.') || '–' }) };
  }
  const reports = [];
  for (const c of parsed.data.characters) {
    if (!openFresh()) return { error: t('toast.saveFailed') };
    const r = build(c);
    if (r.error) return { error: r.error };
    save();
    reports.push(r.rep);
  }
  return { reports };
}
export { CLN };
