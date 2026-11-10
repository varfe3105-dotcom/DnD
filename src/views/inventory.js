import { esc } from '../util.js';
import { icon, tok, itTone, iconOpts } from '../icons.js';
import { EQ, SLOTK, COINK } from '../constants.js';
import { S, U } from '../state.js';
import { numIn, get, refs, slotLabel, slotName, itemView } from '../helpers.js';
import { CAT } from '../catalog.js';
import { t } from '../i18n/index.js';

export function cell(r, label, area) {
  const raw = get(r), k = r.split(':')[1];
  const it = raw && itemView(raw);
  return `<div class="cell${label ? ' eqc' : ''}${U.SEL === r ? ' sel' : ''}" data-slot="${r}"${area ? ` style="grid-area:${area}"` : ''}>${label ? `<small>${label}</small>` : ''}${it ? `<div class="it tok t-${itTone(it)}" data-drag="${r}" tabindex="0" role="button" aria-label="${esc(it.n)}${it.q > 1 ? t('item.pieces', { n: it.q }) : ''}">${icon(it.ic)}${it.q > 1 ? `<b class="q">${it.q}</b>` : ''}${it.tuned ? '<i class="t"></i>' : ''}</div>` : (label ? `<span class="ph">${icon((EQ.find(e => e[0] === k) || [])[1])}</span>` : '')}</div>`;
}
const slotOptions = sel => SLOTK.map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${slotName(k)}</option>`).join('');
export function vSel() {
  const raw = U.SEL && get(U.SEL);
  if (!raw) return '';
  const it = itemView(raw), eqd = U.SEL.startsWith('eq');
  return `<h2>${esc(it.n)}</h2><div class="card selp">${tok(it.ic, itTone(it))}<div><p>${esc(it.p) || `<i>${t('item.noDesc')}</i>`}</p><p class="lbl">${eqd ? t('item.equipped', { s: slotLabel(U.SEL) }) : t('item.inBag')}${it.att ? ' · ' + t('item.needsAttune') : ''}</p></div>
  <div class="acts"><div class="qty"><button data-a="qty" data-d="-1" aria-label="${t('common.less')}">−</button><span>${it.q}</span><button data-a="qty" data-d="1" aria-label="${t('common.more')}">+</button></div>
  ${it.cons ? `<button class="btn sm solid" data-a="use" data-r="${U.SEL}">${t('item.use')}</button>` : ''}
  ${eqd ? `<button class="btn sm" data-a="unequip">${t('item.toBag')}</button>` : (it.slot ? `<button class="btn sm" data-a="equip">${t('item.equip')}</button>` : '')}
  ${it.att ? `<button class="btn sm${it.tuned ? ' solid' : ''}" data-a="tune">${it.tuned ? t('item.attuned') : t('item.attune')}</button>` : ''}
  <select id="sel-slot" data-p="${U.SEL.replace(':', '.')}.slot" aria-label="${t('item.slotLabel')}">${slotOptions(it.slot)}</select>
  <button class="btn sm ${U.CONF === 'rm' ? 'warn' : 'bad'}" data-a="rm">${U.CONF === 'rm' ? t('item.removeConfirm') : t('item.remove')}</button>
  <button class="btn sm" data-a="unsel">${t('common.close')}</button></div></div>`;
}
export function catSelect(id, kinds) {
  const by = {};
  CAT.filter(e => kinds.includes(e.k)).forEach(e => { (by[e.c] = by[e.c] || []).push(e); });
  return `<select id="${id}" aria-label="${t('cat.pickLabel')}"><option value="">${t('cat.pick')}</option>${Object.keys(by).map(c => `<optgroup label="${esc(c)}">${by[c].map(e => `<option value="${esc(e.key)}">${esc(e.n)}</option>`).join('')}</optgroup>`).join('')}</select>`;
}
export function vInv() {
  const tuned = refs().filter(r => get(r).tuned).length, n = Math.ceil(S.bag.length / 6) * 6;
  while (S.bag.length < n) S.bag.push(null);
  return `<h2>${t('inv.money')}</h2><div class="card"><div class="coins">${COINK.map(c => { const l = t('coin.' + c); return `<div class="coin"><small class="lbl">${l}</small><div class="qty"><button data-a="gold" data-c="${c}" data-d="-1" aria-label="${t('coin.less', { c: l })}">−</button>${numIn('gold.' + c, S.gold[c], l)}<button data-a="gold" data-c="${c}" data-d="1" aria-label="${t('coin.more', { c: l })}">+</button></div></div>`; }).join('')}</div></div>
  <div class="invg"><div><h2>${t('inv.equipment')}<em>${t('inv.attune', { n: tuned })}</em></h2><div class="doll">${EQ.map(([k]) => cell('eq:' + k, t('eq.' + k), k)).join('')}</div></div>
  <div><h2>${t('inv.bag')}</h2><div class="bag">${S.bag.map((_, i) => cell('bag:' + i)).join('')}</div><p class="note">${t('inv.help')}</p></div></div>
  ${vSel()}
  <h2>${t('inv.found')}</h2><div class="card"><div class="add">${catSelect('inv-sel', ['potion', 'magic', 'item'])}<input type="number" class="n" id="inv-q" min="1" placeholder="${t('common.count')}" aria-label="${t('common.count')}"><button class="btn solid" data-a="addinv">${t('inv.add')}</button></div><p class="hint" id="inv-sel-h"></p>
  <details><summary>${t('inv.ownSummary')}</summary><div class="add"><input type="text" id="own-n" placeholder="${t('common.name')}"><select id="own-ic" aria-label="${t('common.icon')}">${iconOpts('box')}</select><select id="own-slot" aria-label="${t('item.slotLabel')}">${slotOptions('')}</select></div><div class="add"><input type="text" id="own-p" class="wide" placeholder="${t('inv.ownText')}"></div><div class="add"><label class="ck"><input type="checkbox" id="own-c"> ${t('inv.consumable')}</label><label class="ck"><input type="checkbox" id="own-a"> ${t('inv.magicAttune')}</label><input type="number" class="n" id="own-q" min="1" value="1" aria-label="${t('common.count')}"><button class="btn solid" data-a="addown">${t('common.create')}</button></div></details></div>`;
}
