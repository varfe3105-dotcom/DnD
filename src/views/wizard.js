// Charakter-Assistent (Regeln 2024): Klasse → Attribute → Herkunft → Fertigkeiten → Ausrüstung → Stufe 1.
// Ersetzt während der Bearbeitung die Seite Einrichten, damit keine Felder doppelt im Dokument stehen.
import { esc, sg, mod } from '../util.js';
import { S, U } from '../state.js';
import { CLASSES, RACES, BYN } from '../catalog.js';
import { SK } from '../constants.js';
import { fid, txtIn } from '../helpers.js';
import { vBgField, vBgPick } from './extras.js';
import { vRaceChoice } from './setup.js';
import { vAbil } from './sheet.js';
import { t, nameLine, lang, dice } from '../i18n/index.js';

export const ABK = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ARRAY = [15, 14, 13, 12, 10, 8];
export const COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const BUDGET = 27;
export const STEPS = ['class', 'abil', 'origin', 'skills', 'gear', 'done'];
/** Vorschlag für die Standardwerte: wichtigstes Attribut zuerst (eigene Einschätzung, keine Buchregel). */
export const PRIO = {
  Barbarian: ['str', 'con', 'dex', 'wis', 'cha', 'int'], Bard: ['cha', 'dex', 'con', 'wis', 'int', 'str'], Cleric: ['wis', 'con', 'str', 'dex', 'cha', 'int'],
  Druid: ['wis', 'con', 'dex', 'int', 'cha', 'str'], Fighter: ['str', 'con', 'dex', 'wis', 'cha', 'int'], Monk: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
  Paladin: ['str', 'cha', 'con', 'wis', 'dex', 'int'], Ranger: ['dex', 'wis', 'con', 'str', 'int', 'cha'], Rogue: ['dex', 'con', 'int', 'wis', 'cha', 'str'],
  Sorcerer: ['cha', 'con', 'dex', 'wis', 'int', 'str'], Warlock: ['cha', 'con', 'dex', 'wis', 'int', 'str'], Wizard: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
};
const abName = k => t('ab.' + k);
const bgAsi = k => +(S.bg?.asi?.[k] || 0);

export function openWizard() {
  const base = Object.fromEntries(ABK.map(k => [k, Math.max(8, Math.min(15, S.abil[k] - bgAsi(k)))]));
  U.WIZ = { step: 0, method: 'array', arr: {}, buy: spent(base) <= BUDGET ? base : Object.fromEntries(ABK.map(k => [k, 8])) };
}
/** Attributswerte aus der gewählten Methode übernehmen (Grundwert + Hintergrund). */
export function applyAbil() {
  const w = U.WIZ;
  if (!w || w.method === 'manual') return;
  ABK.forEach(k => {
    const b = w.method === 'array' ? +w.arr[k] || 8 : +w.buy[k] || 8;
    S.abil[k] = b + bgAsi(k);
  });
}
export const spent = buy => ABK.reduce((a, k) => a + (COST[buy[k]] ?? 0), 0);
export function suggest() {
  const w = U.WIZ, p = PRIO[S.klass];
  if (!w || !p) return;
  w.method = 'array';
  w.arr = Object.fromEntries(p.map((k, i) => [k, ARRAY[i]]));
  applyAbil();
}
export function buyStep(k, d) {
  const w = U.WIZ, n = (+w.buy[k] || 8) + d;
  if (n < 8 || n > 15) return 'range';
  const next = { ...w.buy, [k]: n };
  if (spent(next) > BUDGET) return 'budget';
  w.buy = next;
  applyAbil();
  return '';
}
/** Klassenfertigkeit an/aus. Gemerkt in S.classSkills, damit der Assistent sie wieder abwählen kann. */
export function toggleClassSkill(k) {
  const C = CLASSES[S.klass], pick = C?.skillPick;
  if (!pick || !pick.from.includes(k)) return '';
  const mine = Array.isArray(S.classSkills) ? S.classSkills : [];
  if (mine.includes(k)) { S.classSkills = mine.filter(x => x !== k); if (S.skills[k] === 1) delete S.skills[k]; return ''; }
  if (S.skills[k]) return 'have';
  if (mine.length >= pick.n) return 'full';
  S.classSkills = [...mine, k];
  S.skills[k] = 1;
  return '';
}
export const gearLine = g => [...g.items.map(i => (i.q > 1 ? i.q + '× ' : '') + (BYN['item:' + i.id]?.n || i.id)), ...(g.free || []), g.gp ? g.gp + ' ' + t('price.gp') : ''].filter(Boolean).join(', ');

const chip = (on, a, extra, label) => `<button class="chip${on ? ' on' : ''}" data-a="${a}" ${extra} aria-pressed="${!!on}">${label}</button>`;
function stepClass() {
  const C = CLASSES[S.klass];
  return `<div class="form"><label><span class="lbl">${t('common.name')}</span>${txtIn('name', S.name, t('common.name'))}</label><label><span class="lbl">${t('setup.class')}</span><select id="${fid('klass')}" data-p="klass" aria-label="${t('setup.class')}"><option value="">${t('common.choose')}</option>${Object.keys(CLASSES).map(k => `<option value="${k}"${k === S.klass ? ' selected' : ''}>${esc(nameLine(k))}</option>`).join('')}</select></label></div>
  ${C ? `<p class="note">${t('wiz.classInfo', { d: dice('W' + C.hd), s: (C.sv || []).map(abName).join(', '), l: C.subL })}</p>` : `<p class="note">${t('wiz.classPick')}</p>`}`;
}
function stepAbil() {
  const w = U.WIZ, m = w.method;
  const methods = `<div class="chips">${['array', 'buy', 'manual'].map(x => chip(m === x, 'wizm', `data-m="${x}"`, t('wiz.m.' + x))).join('')}${PRIO[S.klass] ? `<button class="chip more" data-a="wizsug">${t('wiz.suggest', { n: esc(nameLine(S.klass)) })}</button>` : ''}</div>`;
  let body = '';
  if (m === 'array') {
    const used = ABK.map(k => +w.arr[k]).filter(Boolean), dup = used.filter((x, i) => used.indexOf(x) !== i);
    body = `<p class="note">${t('wiz.arrayHint', { a: ARRAY.join(', ') })}</p><div class="wiz-abil">${ABK.map(k => `<label><span class="lbl">${abName(k)}${bgAsi(k) ? ` +${bgAsi(k)}` : ''}</span><select id="wz-a-${k}" aria-label="${abName(k)}"${dup.includes(+w.arr[k]) ? ' class="bad"' : ''}><option value="">–</option>${ARRAY.map(v => `<option value="${v}"${+w.arr[k] === v ? ' selected' : ''}>${v}</option>`).join('')}</select><b>${sg(mod(S.abil[k]))}</b></label>`).join('')}</div>${dup.length ? `<p class="note bad">${t('wiz.dup')}</p>` : ''}`;
  } else if (m === 'buy') {
    const left = BUDGET - spent(w.buy);
    body = `<p class="note">${t('wiz.buyHint', { n: left, b: BUDGET })}</p><div class="wiz-abil">${ABK.map(k => `<div class="wiz-buy"><span class="lbl">${abName(k)}${bgAsi(k) ? ` +${bgAsi(k)}` : ''}</span><div class="qty"><button data-a="wizb" data-k="${k}" data-d="-1" aria-label="${abName(k)} −1">−</button><span>${w.buy[k]}</span><button data-a="wizb" data-k="${k}" data-d="1" aria-label="${abName(k)} +1">+</button></div><b>${sg(mod(S.abil[k]))}</b></div>`).join('')}</div>`;
  } else body = `<p class="note">${t('wiz.manualHint')}</p>${vAbil(true)}`;
  return methods + body + `<p class="note">${t('wiz.abilNote')}</p>`;
}
function stepOrigin() {
  const R = RACES[S.race];
  return `<div class="form"><label><span class="lbl">${t('setup.race')}</span><select id="${fid('race')}" data-p="race" aria-label="${t('setup.race')}"><option value="">${t('common.choose')}</option>${Object.keys(RACES).map(k => `<option value="${esc(k)}"${k === S.race ? ' selected' : ''}>${esc(nameLine(k))}</option>`).join('')}</select></label>${R && Object.keys(R.subs).length ? `<label><span class="lbl">${t('setup.subrace')}</span><select id="${fid('subrace')}" data-p="subrace" aria-label="${t('setup.subrace')}"><option value="">${t('common.noneOpt')}</option>${Object.keys(R.subs).map(k => `<option value="${esc(k)}"${k === S.subrace ? ' selected' : ''}>${esc(nameLine(k))}</option>`).join('')}</select></label>` : ''}${vBgField()}</div>${vRaceChoice()}${vBgPick()}<p class="note">${t('wiz.originNote')}</p>`;
}
function stepSkills() {
  const pick = CLASSES[S.klass]?.skillPick;
  if (!pick) return `<p class="note">${t('wiz.classPick')}</p>`;
  const mine = Array.isArray(S.classSkills) ? S.classSkills : [], de = Object.fromEntries(SK.map(x => [x[0], x[2]]));
  return `<p class="note">${t('wiz.skillHint', { n: pick.n, a: mine.length })}</p><div class="chips">${pick.from.map(k => { const other = S.skills[k] && !mine.includes(k); return `<button class="chip${mine.includes(k) || other ? ' on' : ''}" data-a="wizsk" data-k="${esc(k)}" aria-pressed="${mine.includes(k)}"${other ? ` disabled title="${t('wiz.skillHave')}"` : ''}>${esc(k)}${lang === 'de' && de[k] ? ` <small>${de[k]}</small>` : ''}</button>`; }).join('')}</div>`;
}
function stepGear() {
  const C = CLASSES[S.klass];
  if (!C?.gear?.length) return `<p class="note">${t('wiz.classPick')}</p>`;
  if (S.classGear) return `<p class="note">${t('wiz.gearDone')}</p>`;
  return `<p class="note">${t('wiz.gearHint')}</p>${C.gear.map((g, i) => `<div class="row"><div class="nm">${t('wiz.gearOpt', { n: String.fromCharCode(65 + i) })}<small>${esc(gearLine(g))}</small></div><button class="btn sm solid" data-a="wizgear" data-i="${i}">${t('wiz.gearTake')}</button></div>`).join('')}<p class="note">${t('wiz.gearBg')}</p>`;
}
function stepDone() {
  const missing = [!S.klass && t('setup.class'), !S.race && t('setup.race'), !S.bg && t('bg.pick')].filter(Boolean);
  return `<p class="note">${missing.length ? t('wiz.missing', { n: missing.join(', ') }) : t('wiz.ready')}</p>${S.level ? `<p class="note">${t('wiz.hasLevel', { n: S.level })}</p>` : ''}`;
}

export function vWizard() {
  const w = U.WIZ, i = w.step, id = STEPS[i];
  const body = { class: stepClass, abil: stepAbil, origin: stepOrigin, skills: stepSkills, gear: stepGear, done: stepDone }[id]();
  const crumbs = STEPS.map((s, j) => `<button class="chip${j === i ? ' on' : ''}" data-a="wizgo" data-s="${j}" aria-current="${j === i ? 'step' : 'false'}">${j + 1}. ${t('wiz.s.' + s)}</button>`).join('');
  const last = i === STEPS.length - 1;
  return `<h2>${t('wiz.title')}</h2><div class="card wiz"><nav class="chips wiz-steps" aria-label="${t('wiz.title')}">${crumbs}</nav><h3>${t('wiz.s.' + id)}</h3>${body}
  <div class="dlgf"><button class="btn" data-a="wizclose">${t('wiz.close')}</button>${i ? `<button class="btn" data-a="wizgo" data-s="${i - 1}">${t('wiz.back')}</button>` : ''}${last ? `<button class="btn solid" data-a="wizdone"${S.klass ? '' : ' disabled'}>${S.level ? t('wiz.finish') : t('wiz.level1')}</button>` : `<button class="btn solid" data-a="wizgo" data-s="${i + 1}">${t('wiz.next')}</button>`}</div></div>`;
}
/** Kasten oben in Einrichten für neue Charaktere. */
export const vWizardStart = () => (S.level ? '' : `<div class="card wiz-start"><div class="row wrow"><div class="nm">${t('wiz.startTitle')}<small>${t('wiz.startHint')}</small></div><button class="btn solid" data-a="wizopen">${t('wiz.start')}</button></div></div>`);
