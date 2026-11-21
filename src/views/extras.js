import { statText } from './dm-rules.js';
// Ansichten für Ladungen, Begleiter, Hintergrund und Kampfstile.
import { esc } from '../util.js';
import { tok, itTone } from '../icons.js';
import { S, U } from '../state.js';
import { numIn, txtIn, get, itemView } from '../helpers.js';
import { classLevels } from '../tables.js';
import { BYN, OPTIONS } from '../catalog.js';
import { searchMonsters } from '../dm.js';
import { chargeOf, chargeRefs, petView, isPrimalRanger, PRIMAL_KINDS, primalText } from '../companions.js';
import { BACKGROUNDS, TOOL_CHOICES, bgById, bgFeatName, featByName } from '../backgrounds.js';
import { abName } from '../helpers.js';
import { t, loc, dice, dist, nameLine, lang } from '../i18n/index.js';
import { srcNote } from './sheet.js';

const regainText = c => (c.regain === 'all' ? t('chg.all') : dice(c.regain));

export function vCharges() {
  const list = chargeRefs();
  if (!list.length) return '';
  const rows = list.map(r => {
    const raw = get(r), it = itemView(raw), c = chargeOf(raw), left = c.max - c.used;
    const ctl = c.max > 12
      ? `<div class="qty"><button data-a="chgd" data-r="${r}" data-d="1" aria-label="${t('common.less')}">−</button><span>${left}/${c.max}</span><button data-a="chgd" data-r="${r}" data-d="-1" aria-label="${t('common.more')}">+</button></div>`
      : `<div class="pips">${Array.from({ length: c.max }, (_, j) => `<button class="pip ${j < left ? 'on' : ''}" data-a="chg" data-r="${r}" data-j="${j}" aria-label="${j < left ? t('pip.use') : t('pip.reset')}"></button>`).join('')}</div>`;
    return `<div class="row wrow"><div class="ic">${tok(it.ic, itTone(it), it.ref)}</div><div class="nm">${esc(it.n)}<small>${c.regain ? t('chg.regain', { d: regainText(c) }) : t('chg.noRegain')}</small></div>${ctl}</div>`;
  }).join('');
  const due = list.filter(r => { const c = chargeOf(get(r)); return c.regain && c.used > 0; });
  const panel = U.DAWN && due.length ? `<div class="dawn"><p class="note" style="margin-top:0">${t('chg.dawnHint')}</p>${due.map(r => {
    const raw = get(r), c = chargeOf(raw);
    return `<label class="dawnr"><span>${esc(itemView(raw).n)}<small>${c.regain === 'all' ? t('chg.all') : t('chg.roll', { d: dice(c.regain) })}</small></span><input type="number" min="0" max="${c.max}" class="n" data-dawn="${r}" value="${c.regain === 'all' ? c.used : ''}" aria-label="${t('chg.back')}"></label>`;
  }).join('')}<div class="add"><button class="btn solid" data-a="dawnapply">${t('chg.apply')}</button></div></div>` : '';
  return `<h2>${t('chg.title')}</h2><div class="card">${rows}${due.length ? `<div class="add"><button class="btn sm" data-a="dawn" aria-expanded="${!!U.DAWN}">${t('chg.dawn')}</button></div>` : ''}${panel}</div>`;
}

/** Felder im Inventar: Maximum und Rückgewinnung, für Katalog und eigene Gegenstände. */
export function vChargeEdit() {
  const raw = U.SEL && get(U.SEL);
  if (!raw) return '';
  const c = chargeOf(raw), p = U.SEL.replace(':', '.');
  return `<details class="chg-edit"${c ? ' open' : ''}><summary>${t('chg.title')}</summary><div class="add"><label class="ck">${t('chg.max')} ${numIn(p + '.chMax', c ? c.max : 0, t('chg.max'), 0, 99)}</label><label class="ck">${t('chg.regainFld')} ${txtIn(p + '.chRe', c ? c.regain : '', t('chg.regainFld'), t('chg.regainPh'))}</label></div></details>`;
}

const MOVE_DE = { fly: 'Flug', swim: 'Schwimmen', climb: 'Klettern', burrow: 'Graben' };
const speedText = s => String(s || '').replace(/^walk\s+/i, '').replace(/\b(fly|swim|climb|burrow)\b/g, m => (lang === 'de' ? MOVE_DE[m] : m)).replace(/(\d+)\s*ft\.?/g, (_, n) => dist(Math.round(n * 3) / 10));
const typeText = x => (['slashing', 'piercing', 'bludgeoning'].includes(x) ? t('dmg.' + x) : x);

export function vPets() {
  if (!S.pets.length) return '';
  return `<h2>${t('pet.title')}</h2><div class="card">${S.pets.map((raw, i) => {
    const p = petView(raw);
    return `<div class="row wrow${p.hp === 0 ? ' petdown' : ''}"><div class="ic">${tok('leaf')}</div><div class="nm">${esc(p.n)}<small>${t('dm.acShort')} ${p.ac}${p.speed ? ' · ' + esc(speedText(p.speed)) : ''}${p.hp === 0 ? ' · ' + t('pet.down') : ''}</small></div><div class="qty"><button data-a="pethp" data-i="${i}" data-d="-1" aria-label="${t('hp.minusOne')}">−</button><span class="pethp"><b>${p.hp}</b>/${p.hpMax}</span><button data-a="pethp" data-i="${i}" data-d="1" aria-label="${t('common.more')}">+</button></div></div>
    ${p.attacks.map(a => `<div class="petatk"><span>${esc(a.n)}</span><b>+${a.hit}</b><b>${esc(dice(a.dmg))}</b><small>${esc(typeText(a.type))}</small></div>`).join('')}
    ${p.primal ? `<details class="feat"><summary><span>${t('pet.details')}</span></summary><p class="ptext">${esc(loc(primalText(p)))}</p><p class="note">${t('pet.primalNote')}</p></details>` : ''}${p.text ? `<details class="feat"><summary><span>${t('pet.details')}</span></summary><div class="pettext stat">${statText(p.text)}</div><p class="note">${p.source === 'own' ? t('src.own') : srcNote(p.source) && t('dm.srcMonster')}</p></details>` : ''}`;
  }).join('')}</div>`;
}

export function vPetResults() {
  const q = U.petQ.trim();
  if (!q) return '';
  const hits = searchMonsters(q).slice(0, 8);
  if (!hits.length) return `<p class="empty">${t('wiki.nothing')}</p>`;
  return hits.map(m => `<div class="row"><div class="nm">${esc(m.n)}<small>${t('dm.acShort')} ${m.ac} · ${t('head.hpShort')} ${m.hp}${m.speed ? ' · ' + esc(speedText(m.speed)) : ''}</small></div><button class="btn sm solid" data-a="petadd" data-m="${esc(m.id)}">${t('common.add')}</button></div>`).join('');
}

export function vPetSetup() {
  const beast = /beast/i.test(S.sub || '');
  const cur = S.pets.find(p => p.primal);
  const primal = isPrimalRanger() ? `<div class="add"><span class="lbl">${t('pet.primal')}</span>${PRIMAL_KINDS.map(k => `<button class="btn sm${cur?.primal === k ? ' solid' : ''}" data-a="petprimal" data-k="${k}" aria-pressed="${cur?.primal === k}">${t('pet.primal.' + k)}</button>`).join('')}</div>` : '';
  return `<h2>${t('pet.title')}</h2><div class="card">${primal}${S.pets.map((p, i) => `<div class="edrow">${txtIn(`pets.${i}.n`, p.n, t('common.name'))}${numIn(`pets.${i}.ac`, p.ac, t('stat.ac'), 0, 40)}${numIn(`pets.${i}.hpMax`, p.hpMax, t('setup.maxHp'), 1, 999)}<button class="del" data-a="del" data-k="pets" data-i="${i}" aria-label="${esc(p.n)} ${t('common.delete')}">✕</button>${beast || p.bm ? `<label class="ck wide"><input type="checkbox" data-petbm="${i}"${p.bm ? ' checked' : ''}> ${t('pet.bm')}</label>` : ''}</div>`).join('') || `<div class="empty">${t('pet.empty')}</div>`}
  <div class="add"><input type="search" id="pet-q" value="${esc(U.petQ)}" placeholder="${t('pet.search')}" aria-label="${t('pet.search')}"></div><div id="pet-res">${vPetResults()}</div>
  <details><summary>${t('pet.own')}</summary><div class="add"><input type="text" id="pet-n" placeholder="${t('common.name')}" aria-label="${t('common.name')}"><input type="number" class="n" id="pet-ac" min="0" placeholder="${t('dm.acShort')}" aria-label="${t('stat.ac')}"><input type="number" class="n" id="pet-hp" min="1" placeholder="${t('head.hpShort')}" aria-label="${t('setup.maxHp')}"><input type="text" id="pet-sp" placeholder="${t('stat.speed')}" aria-label="${t('stat.speed')}"></div><textarea id="pet-t" rows="3" placeholder="${t('pet.ownText')}" aria-label="${t('pet.ownText')}"></textarea><div class="add"><button class="btn solid" data-a="petown">${t('common.create')}</button></div></details></div>`;
}

export function vBgField() {
  const cur = U.BGPICK || S.bg?.id || '';
  return `<label><span class="lbl">${t('bg.pick')}</span><select id="bg-sel" aria-label="${t('bg.pick')}"><option value="">${t('common.noneOpt')}</option>${BACKGROUNDS.map(b => `<option value="${b.id}"${b.id === cur ? ' selected' : ''}>${esc(loc(b.n))}</option>`).join('')}</select></label>`;
}

const STYLE_CLASSES = ['Fighter', 'Paladin', 'Ranger'];
export function vStylePicker() {
  const on = n => S.feats.some(f => f.n === n);
  if (!classLevels().some(c => STYLE_CLASSES.includes(c.k)) && !OPTIONS.fightingStyles.some(o => on(o.n))) return '';
  return `<h2>${t('setup.styles')}</h2><div class="card"><div class="chips">${OPTIONS.fightingStyles.map(o => `<button class="chip${on(o.n) ? ' on' : ''}" data-a="style" data-n="${esc(o.n)}" aria-pressed="${on(o.n)}" title="${esc(loc(o.text))}">${esc(o.n)}</button>`).join('')}</div><p class="note">${t('setup.stylesHint')}</p></div>`;
}

const gearText = (b, tool) => b.gear.map(g => g === '$tool' ? (tool ? nameLine(BYN['item:' + tool]?.n || tool) : t('bg.tool.' + b.tool.choose)) : typeof g === 'string' ? (BYN['item:' + g]?.n || g) : g.id ? (g.q > 1 ? g.q + '× ' : '') + (g.n ? loc(g.n) : BYN['item:' + g.id]?.n || g.id) : loc(g)).join(', ') + ', ' + b.gold + ' ' + t('price.gp');
/** Kurzinfo zum gewählten Hintergrund bzw. der Dialog mit Attributen, Werkzeug und Ausrüstung. */
export function vBgPick() {
  const b = U.BGPICK && bgById(U.BGPICK);
  if (!b) {
    const cur = S.bg && bgById(S.bg.id);
    if (!cur) return '';
    const asi = Object.entries(S.bg.asi || {}).filter(([, v]) => v).map(([k, v]) => abName(k) + ' +' + v).join(', ');
    return `<p class="note">${t('bg.summary', { f: esc(bgFeatName(cur)), s: cur.skills.map(esc).join(', '), a: asi || '–' })} ${srcNote(cur.source)}</p>`;
  }
  const mode = U.BGMODE || '21';
  const abOpt = (id, sel) => `<select id="${id}" aria-label="${t('bg.' + id)}"><option value="">${t('common.choose')}</option>${b.abil.map(k => `<option value="${k}"${sel === k ? ' selected' : ''}>${abName(k)} (${S.abil[k]})</option>`).join('')}</select>`;
  const toolSel = b.tool.choose ? `<label><span class="lbl">${t('bg.tool.' + b.tool.choose)}</span><select id="bg-tool" aria-label="${t('bg.tool.' + b.tool.choose)}"><option value="">${t('common.choose')}</option>${TOOL_CHOICES[b.tool.choose].map(id => `<option value="${id}"${U.BGTOOL === id ? ' selected' : ''}>${esc(nameLine(BYN['item:' + id]?.n || id))}</option>`).join('')}</select></label>` : '';
  const f = featByName(b.feat.n);
  return `<div class="bgpick"><p class="lbl" style="margin:0 0 8px">${t('bg.dialog', { n: esc(loc(b.n)) })}</p>
  <p class="note" style="margin-top:0">${t('bg.info', { a: b.abil.map(abName).join(', '), s: b.skills.map(esc).join(', '), f: esc(bgFeatName(b)) })}</p>
  <div class="form"><label><span class="lbl">${t('bg.asiMode')}</span><select id="bg-mode" aria-label="${t('bg.asiMode')}"><option value="21"${mode === '21' ? ' selected' : ''}>${t('bg.mode21')}</option><option value="111"${mode === '111' ? ' selected' : ''}>${t('bg.mode111', { a: b.abil.map(abName).join(', ') })}</option></select></label>
  ${mode === '21' ? `<label><span class="lbl">${t('bg.bg-a2')}</span>${abOpt('bg-a2', U.BGA2)}</label><label><span class="lbl">${t('bg.bg-a1')}</span>${abOpt('bg-a1', U.BGA1)}</label>` : ''}
  ${toolSel}
  <label><span class="lbl">${t('bg.gear')}</span><select id="bg-gear" aria-label="${t('bg.gear')}"><option value="A">${t('bg.gearA')}</option><option value="B">${t('bg.gearB')}</option></select></label></div>
  <p class="note">${t('bg.gearAList', { g: esc(gearText(b, U.BGTOOL)) })}</p>
  ${f ? `<details class="bgfeat"><summary>${esc(nameLine(f.n, f.de))}</summary><p class="note">${esc(dice(loc(f.text)))}</p></details>` : ''}
  <div class="add"><button class="btn solid" data-a="bgapply">${t('bg.applyBtn')}</button><button class="btn" data-a="bgcancel">${t('common.cancel')}</button></div></div>`;
}
