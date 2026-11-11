import { vBackup, vCloud, turnsHidden } from './live-ui.js';
import { vBgField, vBgPick, vStylePicker, vPetSetup } from './extras.js';
import { esc, sg } from '../util.js';
import { tok, iconOpts } from '../icons.js';
import { SK, RESTK } from '../constants.js';
import { S, U, roster } from '../state.js';
import { classLevels } from '../tables.js';
import { dmOn } from '../dm.js';
import { L, dmOnline } from '../live.js';
import { liveState } from './dm.js';
import { skv, fid, numIn, txtIn, computeAc } from '../helpers.js';
import { CLASSES, RACES, CAT } from '../catalog.js';
import { vAbil, restLabel, featSrc } from './sheet.js';
import { t, loc, lang, dice, distValue, nameLine } from '../i18n/index.js';

const sel = (p, opts, v, l) => `<select id="${fid(p)}" data-p="${p}" aria-label="${l}">${opts.map(([k, x]) => `<option value="${k}"${String(k) === String(v) ? ' selected' : ''}>${x}</option>`).join('')}</select>`;
const field = (l, c) => `<label><span class="lbl">${l}</span>${c}</label>`;
const named = keys => keys.map(k => [k, nameLine(k)]);

export function vSetup() {
  const R = RACES[S.race], C = CLASSES[S.klass];
  const bonus = R ? (R.subs[S.subrace] ? loc(R.subs[S.subrace].asi) + ', ' : '') + loc(R.asi) : '';
  return `<p class="note">${t('setup.intro')}</p>
  ${vChars()}
  ${vLiveJoin()}
  <h2>${t('setup.char')}</h2><div class="card"><div class="porsetup"><label class="por" for="img-in2" title="${t('setup.portrait')}">${S.img ? `<img src="${S.img}" alt="">` : `<span>${esc((S.name || '?').trim()[0] || '?')}</span>`}</label><input type="file" id="img-in2" accept="image/*" hidden><div class="add" style="margin:0"><label class="btn sm" for="img-in2">${t('setup.portrait')}</label>${S.img ? `<button class="btn sm bad" data-a="imgdel">${t('setup.portraitDel')}</button>` : ''}${S.fig ? `<button class="btn sm bad" data-a="figdel">${t('setup.figDel')}</button>` : ''}</div></div>
  <div class="form" style="margin-top:12px">
   ${field(t('common.name'), txtIn('name', S.name, t('common.name')))}
   ${field(t('setup.race'), sel('race', [['', t('common.choose')], ...named(Object.keys(RACES))], S.race, t('setup.race')))}
   ${R && Object.keys(R.subs).length ? field(t('setup.subrace'), sel('subrace', [['', t('common.noneOpt')], ...named(Object.keys(R.subs))], S.subrace, t('setup.subrace'))) : ''}
   ${field(t('setup.class'), sel('klass', [['', t('common.choose')], ...named(Object.keys(CLASSES))], S.klass, t('setup.class')))}
   ${field(t('setup.subclass'), sel('sub', [['', C ? t('setup.subFrom', { n: C.subN, l: C.subL }) : t('common.choose')], ...(C ? C.subs : []).map(x => [x, x]), ...(S.sub && !(C && C.subs.includes(S.sub)) ? [[S.sub, S.sub]] : [])].map(([k, x]) => [esc(k), esc(x)]), esc(S.sub), t('setup.subclass')))}
   ${field(t('setup.level'), numIn('level', S.level, t('setup.level'), 0, 20))}
   ${vBgField()}
   ${field(t('setup.background'), txtIn('info', S.info, t('setup.backgroundLabel'), t('setup.backgroundPh')))}
  </div>${R ? `<p class="note">${t('setup.raceBonus', { b: esc(bonus) })}</p>` : ''}
  <p class="note">${S.level ? t('setup.hintLevel') : t('setup.hintStart')}</p>${vBgPick()}</div>
  <h2>${t('setup.values')}</h2><div class="card"><div class="form">
   ${field(t('stat.ac'), numIn('ac', S.ac, t('stat.ac'), 0, null, null, S.acMode === 'auto' ? 'disabled' : ''))}
   ${field(t('setup.speedUnit'), numIn('speed', distValue(S.speed), t('setup.speedUnit'), 0, null, lang === 'en' ? '5' : '1.5', 'data-u="dist"'))}
   ${field(t('stat.prof'), numIn('prof', S.prof, t('stat.prof'), 0, 6))}
   ${field(t('setup.maxHp'), numIn('hpMax', S.hpMax, t('setup.maxHp'), 1))}
   ${field(t('setup.hdCount'), numIn('hd.max', S.hd.max, t('setup.hdCount'), 0, 30))}
   ${field(t('setup.hdType'), sel('hd.die', ['W6', 'W8', 'W10', 'W12'].map(x => [x, dice(x)]), S.hd.die, t('setup.hdType')))}
  </div><div class="add"><label class="ck"><input type="checkbox" id="ac-auto"${S.acMode === 'auto' ? ' checked' : ''}> ${t('setup.acAuto')}</label></div>${S.acMode === 'auto' && computeAc() == null ? `<p class="note">${t('setup.acUnknown')}</p>` : ''}</div>
  <h2>${t('setup.abilities')}</h2>${vAbil(true)}
  <h2>${t('skill.title')}</h2><div class="card"><p class="note" style="margin-top:0">${t('setup.skillHint')}</p><div class="skl">${SK.map(([k, a, de]) => { const p = S.skills[k] || 0; return `<button class="sk" data-a="tskill" data-k="${k}" style="background:none;border:0;border-bottom:1px dotted var(--line);text-align:left"><i class="m m${p}"></i><span>${k}<small>${lang === 'de' ? de + ' · ' : ''}${t('skill.p' + p)}</small></span><b>${sg(skv(k))}</b></button>`; }).join('')}</div></div>
  <h2>${t('setup.profs')}</h2><div class="card"><div class="form">${field(t('setup.tools'), `<input type="text" id="f-tools" data-p="tools" data-list="1" value="${esc(S.tools.join(', '))}" aria-label="${t('setup.tools')}" placeholder="${t('setup.toolsPh')}">`)}${field(t('setup.langs'), `<input type="text" id="f-langs" data-p="langs" data-list="1" value="${esc(S.langs.join(', '))}" aria-label="${t('setup.langs')}" placeholder="${t('setup.langsPh')}">`)}</div></div>
  ${vStylePicker()}${vPetSetup()}
  <h2>${t('setup.feats')}</h2><div class="card">${S.feats.map((f, i) => `<div class="edrow">${txtIn(`feats.${i}.n`, f.n, t('common.name'))}<span class="lbl">${esc(featSrc(f))}${f.lvl ? ' · ' + t('feat.level', { n: f.lvl }) : ''}</span><button class="del" data-a="del" data-k="feats" data-i="${i}" aria-label="${esc(f.n)} ${t('common.delete')}">✕</button><input type="text" class="wide" id="f-feats-${i}-p" data-p="feats.${i}.p" value="${esc(f.p)}" aria-label="${t('common.desc')}"></div>`).join('') || `<div class="empty">${t('setup.featsEmpty')}</div>`}
   <div class="add"><input type="text" id="feat-n" placeholder="${t('setup.featName')}"><input type="text" id="feat-p" placeholder="${t('setup.whatDoes')}"><button class="btn solid" data-a="addfeat">${t('common.create')}</button></div></div>
  <h2>${t('res.title')}</h2><div class="card">${S.res.map((r, i) => `<div class="edrow"><select id="f-res-${i}-ic" data-p="res.${i}.ic" aria-label="${t('common.icon')}">${iconOpts(r.ic)}</select>${txtIn(`res.${i}.n`, r.n, t('common.name'))}${numIn(`res.${i}.max`, r.max, t('common.count'), 1, 200)}${sel(`res.${i}.rest`, RESTK.map(k => [k, restLabel(k)]), r.rest, t('setup.recovery'))}<button class="del" data-a="del" data-k="res" data-i="${i}" aria-label="${esc(r.n)} ${t('common.delete')}">✕</button><input type="text" class="wide" id="f-res-${i}-p" data-p="res.${i}.p" value="${esc(r.p)}" placeholder="${t('setup.whatDoes')}" aria-label="${t('common.desc')}"></div>`).join('') || `<div class="empty">${t('setup.resEmpty')}</div>`}
   <div class="add"><input type="text" id="res-n" placeholder="${t('common.name')}"><select id="res-ic" aria-label="${t('common.icon')}">${iconOpts('star')}</select><input type="number" class="n" id="res-m" min="1" placeholder="${t('common.count')}" aria-label="${t('common.count')}"><select id="res-r" aria-label="${t('setup.recovery')}"><option value="long">${restLabel('long')}</option><option value="short">${restLabel('short')}</option><option value="none">${restLabel('none')}</option></select></div><div class="add"><input type="text" id="res-p" class="wide" placeholder="${t('setup.whatDoesRules')}"><button class="btn solid" data-a="addres">${t('common.create')}</button></div></div>
  <h2>${t('setup.slots')}</h2><div class="card"><div class="slotg">${S.slots.map((s, i) => field(t('spell.level', { n: i + 1 }), numIn(`slots.${i}.max`, s.max, t('setup.slotsOf', { n: i + 1 }), 0, 9))).join('')}</div>
   <div class="slotg" style="margin-top:12px">${field(t('setup.pactSlots'), numIn('pact.max', S.pact.max, t('setup.pactSlots'), 0, 4))}${field(t('setup.pactLevel'), numIn('pact.lvl', S.pact.lvl, t('setup.pactLevel'), 1, 5))}</div><p class="note">${t('setup.pactHint')}</p></div>
  <h2>${t('spell.title')}</h2><div class="card">${S.spells.map((s, i) => [s, i]).sort((a, b) => a[0].lvl - b[0].lvl || a[0].n.localeCompare(b[0].n)).map(([s, i]) => `<div class="edrow">${tok(s.ic, undefined, s.src === 'own' ? '' : 'spell:' + s.n)}<span class="nm">${esc(s.n)}<small>${s.lvl ? t('spell.level', { n: s.lvl }) : t('spell.cantrip')}${s.src === 'own' ? ' · ' + t('setup.ownEntry') : ''}</small></span><button class="del" data-a="del" data-k="spells" data-i="${i}" aria-label="${esc(s.n)} ${t('common.delete')}">✕</button></div>`).join('') || `<div class="empty">${t('setup.spellsEmpty')}</div>`}
   <div class="add">${spSelect()}<button class="btn solid" data-a="addsp">${t('common.add')}</button></div><p class="hint" id="sp-sel-h"></p>
   <details><summary>${t('setup.ownSpell')}</summary><div class="add"><input type="text" id="osp-n" placeholder="${t('common.name')}"><input type="number" class="n" id="osp-l" min="0" max="9" placeholder="${t('setup.spellLevel')}" aria-label="${t('setup.spellLevel')}"></div><div class="add"><input type="text" id="osp-t" placeholder="${t('setup.ospTime')}"><input type="text" id="osp-r" placeholder="${t('spell.range')}"><input type="text" id="osp-d" placeholder="${t('spell.dur')}"></div><div class="add"><input type="text" id="osp-e" class="wide" placeholder="${t('setup.ospEffect')}"></div><div class="add"><label class="ck"><input type="checkbox" id="osp-c"> ${t('conc.title')}</label><label class="ck"><input type="checkbox" id="osp-ri"> ${t('spell.ritual')}</label><button class="btn solid" data-a="addspown">${t('common.create')}</button></div></details></div>
  <h2>${t('setup.backup')}</h2><div class="card"><p class="note" style="margin-top:0">${t('setup.backupHint')}</p>${vBackup()}
   <div class="add"><button class="btn" data-a="print">${t('setup.print')}</button><button class="btn" data-a="exp">${t('setup.export')}</button>${U.EXP ? `<button class="btn solid" data-a="copy">${t('setup.copy')}</button>` : ''}</div>${U.EXP ? `<textarea id="exp" readonly aria-label="${t('setup.exportLabel')}">${esc(U.EXP)}</textarea>` : ''}
   <div class="add" style="margin-top:14px"><label class="ck">${t('setup.loadFile')} <input type="file" id="impf" accept=".json,application/json,text/plain,application/pdf,image/*" multiple></label></div>
   <textarea id="imp" placeholder="${t('setup.pasteImport')}" aria-label="${t('setup.importLabel')}" style="margin-top:8px">${esc(U.IMP)}</textarea>
   <p class="note">${t('imp.hint')} ${t('sheet.hint')}</p>${vSheet()}<div class="add"><button class="btn ${U.CONF === 'imp' ? 'warn' : ''}" data-a="imp">${U.CONF === 'imp' ? t('setup.importConfirm') : t('setup.import')}</button><button class="btn ${U.CONF === 'reset' ? 'warn' : 'bad'}" data-a="reset">${U.CONF === 'reset' ? t('setup.resetConfirm') : t('setup.reset')}</button></div>${vImportReport()}</div>`;
}
function vSheet() {
  const s = U.SHEET;
  if (!s) return '';
  if (s.busy) return `<p class="live-state connecting">${t('sheet.' + s.busy)}</p>`;
  const d = s.draft;
  const text = (f, l, v) => `<label><span class="lbl">${l}</span><input type="text" data-sh="${f}" value="${esc(v ?? '')}"></label>`;
  const list = (f, l, v) => `<label class="wide"><span class="lbl">${l}</span><textarea data-sh="${f}" data-shlist="1" rows="2">${esc(v.join(', '))}</textarea></label>`;
  const num = (f, l, v) => `<label><span class="lbl">${l}</span><input type="number" min="0" data-sh="${f}" data-shnum="1" value="${v ?? ''}"></label>`;
  if (!d.hasSheet) return `<div class="sheet-rev"><h4>${t('sheet.spellsOnly', { n: d.spells.length })}</h4><p class="cls">${esc(d.spells.join(', '))}</p><div class="add"><button class="btn solid" data-a="sheetspells"${d.spells.length ? '' : ' disabled'}>${t('sheet.addSpells')}</button><button class="btn" data-a="sheetcancel">${t('common.cancel')}</button></div></div>`;
  return `<div class="sheet-rev"><h4>${t('sheet.review')}</h4><p class="note">${t('sheet.reviewHint')}</p><div class="form">
   ${text('name', t('common.name'), d.name)}
   <label><span class="lbl">${t('setup.class')}</span><select data-sh="klass"><option value="">${t('common.choose')}</option>${Object.keys(CLASSES).map(k => `<option${k === d.klass ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
   ${text('sub', t('setup.subclass'), d.sub)}${num('level', t('setup.level'), d.level)}${text('race', t('setup.race'), d.race)}${text('background', t('imp.background'), d.background)}${text('alignment', t('imp.alignment'), d.alignment)}
   ${num('ac', t('stat.ac'), d.ac)}${num('hpMax', t('setup.maxHp'), d.hpMax)}${num('speedFt', t('imp.speedFt'), d.speedFt)}
   ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => num('abil.' + k, t('ab.' + k), d.abil[k])).join('')}
   ${num('coins.gp', t('coin.gp'), d.coins.gp)}${num('coins.sp', t('coin.sp'), d.coins.sp)}${num('coins.cp', t('coin.cp'), d.coins.cp)}${num('coins.pp', t('coin.pp'), d.coins.pp)}
   </div><div class="form" style="margin-top:10px">${list('saves', t('ab.saves'), d.saves.map(k => t('abs.' + k)))}${list('skillList', t('skill.title'), Object.entries(d.skills).map(([k, v]) => k + (v === 2 ? ' (2)' : '')))}${list('spells', t('spell.title'), d.spells)}${list('itemList', t('inv.equipment'), d.items.map(i => (i.q > 1 ? i.q + ' ' : '') + i.name))}${list('tools', t('setup.tools'), d.tools)}${list('langs', t('setup.langs'), d.langs)}</div>
   <div class="add"><button class="btn solid" data-a="sheetapply">${t('sheet.create')}</button><button class="btn" data-a="sheetcancel">${t('common.cancel')}</button></div></div>`;
}
function vImportReport() {
  if (!U.IMPREP) return '';
  const block = (title, list) => (list.length ? `<p class="lbl">${title}</p><ul class="imp-list">${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  return `<div class="imp-rep">${U.IMPREP.map(r => `<h4>${t('imp.reportFor', { n: esc(r.name) })}</h4>${block(t('imp.taken'), r.ok)}${block(t('imp.ownItems'), r.own)}${block(t('imp.inNotes'), r.notes)}`).join('')}</div>`;
}
function vLiveJoin() {
  const inside = L.role === 'player';
  return `<h2>${t('live.title')}</h2><div class="card">${inside ? `<div class="dm-bar"><div class="live-code"><small>${t('live.code')}</small><b>${esc(L.code)}</b></div>${liveState()}<span class="lbl">${dmOnline() ? t('live.dmOn') : t('live.dmOff')}</span><button class="btn bad" data-a="liveoff">${t('live.leave')}</button></div><div class="add"><button class="tg${turnsHidden() ? '' : ' on'}" data-a="turnshow" aria-pressed="${!turnsHidden()}">${t('turn.show')}</button></div>${vCloud()}` : `<div class="add" style="margin-top:0"><input type="text" id="live-code" maxlength="6" autocomplete="off" placeholder="${t('live.codePh')}" aria-label="${t('live.code')}"><button class="btn solid" data-a="livejoin">${t('live.join')}</button></div>`}<p class="note">${t('live.shared')}</p></div>`;
}
function vChars() {
  const list = roster();
  return `<h2>${t('chars.title')}<em>${list.length}</em></h2><div class="card">${list.map(c => `<div class="edrow"><span class="nm">${esc(c.name)}${c.id === S.id ? ` <span class="lbl">${t('chars.active')}</span>` : ''}<small>${[c.klass, c.level ? t('feat.level', { n: c.level }) : ''].filter(Boolean).join(' · ')}</small></span>${c.id === S.id ? '' : `<button class="btn sm" data-a="charsw" data-id="${esc(c.id)}">${t('chars.open')}</button>`}<button class="btn sm ${U.CONF === 'chardel:' + c.id ? 'warn' : 'bad'}" data-a="chardel" data-id="${esc(c.id)}">${U.CONF === 'chardel:' + c.id ? t('chars.delConfirm') : t('common.deleteBtn')}</button></div>`).join('')}<div class="add"><button class="btn solid" data-a="charnew">${t('chars.new')}</button><button class="btn" data-a="chardup">${t('chars.dup')}</button></div><div class="add"><label class="ck"><input type="checkbox" id="dm-on"${dmOn() ? ' checked' : ''}> ${t('dm.enable')}</label></div></div>`;
}
export function spSelect() {
  const by = {}, ls = classLevels().map(c => CLASSES[c.k]?.l).filter(Boolean), l = ls.join('');
  CAT.filter(e => e.k === 'spell' && (!l || ls.some(x => e.cls.includes(x)))).forEach(e => { (by[e.c] = by[e.c] || []).push(e); });
  return `<select id="sp-sel" aria-label="${t('setup.spellCat')}"><option value="">${l ? t('setup.spellsOf', { k: S.klass }) : t('setup.spellPick')}</option>${Object.keys(by).map(c => `<optgroup label="${c}">${by[c].map(e => `<option value="${esc(e.n)}">${esc(nameLine(e.n, e.de))}</option>`).join('')}</optgroup>`).join('')}</select>`;
}
