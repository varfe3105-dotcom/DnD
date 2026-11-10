import { $, esc } from './util.js';
import { S, U, roster } from './state.js';
import { classLevels } from './tables.js';
import { vMain } from './views/sheet.js';
import { vInv } from './views/inventory.js';
import { vWiki } from './views/wiki.js';
import { vSetup } from './views/setup.js';
import { vLU } from './views/levelup.js';
import { vDm } from './views/dm.js';
import { dmOn } from './dm.js';
import { L } from './live.js';
import { hideTip } from './tooltip.js';
import { CLASSES } from './catalog.js';
import { t, lang } from './i18n/index.js';

export function vHead() {
  const classes = S.multi?.length ? classLevels().map(c => `${c.k} ${c.lvl}`).join(' / ') : [S.klass, S.sub].filter(Boolean).join(' · ');
  const line = [S.subrace || S.race, classes].filter(Boolean).join(' · ');
  const others = roster();
  const langBtn = l => `<button data-a="lang" data-l="${l}" aria-pressed="${lang === l}" lang="${l}">${l.toUpperCase()}</button>`;
  return `<header class="hd"><label class="por" for="img-in" title="${t('head.portrait')}">${S.img ? `<img src="${S.img}" alt="${t('head.portraitAlt', { n: esc(S.name) })}">` : `<span aria-hidden="true">${esc((S.name || '?').trim()[0] || '?')}</span>`}</label><input type="file" id="img-in" accept="image/*" hidden>
  <div class="who"><h1>${esc(S.name)}</h1><p>${esc(line || t('head.pickRace'))}</p>${S.info ? `<p class="sub2">${esc(S.info)}</p>` : ''}</div>
  ${S.level ? `<div class="seal" title="${t('head.level')}"><small>${t('head.seal')}</small><b>${S.level}</b></div>` : ''}
  <div class="hacts">${others.length > 1 ? `<select id="char-switch" class="charsw" aria-label="${t('chars.switch')}">${others.map(c => `<option value="${esc(c.id)}"${c.id === S.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>` : ''}<div class="hrow"><button class="btn gilt" data-a="lu">${S.level ? (S.level >= 20 ? t('head.lvl20') : t('head.levelUp')) : t('head.build1')}</button><div class="langs" role="group" aria-label="${t('head.language')}">${langBtn('en')}${langBtn('de')}</div></div><div class="rests"><button class="btn ghost" data-a="rest" data-r="short">${t('rest.short')}</button><button class="btn ghost" data-a="rest" data-r="long">${t('rest.long')}</button></div></div></header>`;
}
export const tabs = () => ['main', 'inv', 'wiki', 'notes', 'setup', ...(dmOn() ? ['dm'] : [])];
export const app = $('app');
export function render() {
  hideTip();
  if (!tabs().includes(S.tab)) S.tab = 'main';
  const tb = S.tab, ae = document.activeElement, keep = ae && ae.id && app.contains(ae) ? ae.id : null;
  let h = vHead();
  h += `<div class="tabs"><nav role="tablist" aria-label="${t('head.areas')}">${tabs().map(k => `<button role="tab" aria-selected="${tb === k}" data-a="tab" data-t="${k}">${t('tab.' + k)}</button>`).join('')}</nav><div class="mini${S.hp === 0 ? ' down' : ''}">${L.status === 'on' ? `<i class="live-dot" title="${t('live.on')}"></i>` : ''}${t('head.hpShort')} <b>${S.hp}</b>/${S.hpMax}${S.tmp ? ` +${S.tmp}` : ''}</div></div>`;
  if (tb === 'main') h += vMain();
  if (tb === 'inv') h += vInv();
  if (tb === 'wiki') h += vWiki();
  if (tb === 'notes') h += `<h2>${t('tab.notes')}</h2><textarea id="notes" placeholder="${t('notes.placeholder')}" aria-label="${t('tab.notes')}">${esc(S.notes)}</textarea>`;
  if (tb === 'setup') h += vSetup();
  if (tb === 'dm') h += vDm();
  h += `<footer><p>${t('footer.rules')}</p><details><summary>${t('footer.about')}</summary><p>${t('footer.srd')}</p><p>${t('footer.icons')}</p><p>${t('footer.fonts')}</p></details></footer>`;
  if (U.LU && CLASSES[S.klass]) h += vLU();
  document.body.style.overflow = U.LU ? 'hidden' : '';
  app.innerHTML = h;
  if (U.LU && U.LUfocus) { U.LUfocus = false; const f = $('lu-h'); if (f) f.focus(); }
  else if (keep) { const el = $(keep); if (el) el.focus({ preventScroll: true }); }
}
