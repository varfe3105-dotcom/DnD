/* global __BUILD__ */
import { vNotesTab } from './views/notes.js';
import { vInbox, vHandout, vBackupNag, vTurn } from './views/live-ui.js';
import { $, esc } from './util.js';
import { S, U, roster } from './state.js';
import { classLevels, XP_LEVELS, totalLevel } from './tables.js';
import { vMain, vMiniBar } from './views/sheet.js';
import { vInv } from './views/inventory.js';
import { vWiki } from './views/wiki.js';
import { vSetup } from './views/setup.js';
import { vLU } from './views/levelup.js';
import { vDm } from './views/dm.js';
import { D } from './dm.js';
import { DM_TABS, DM_TAB_IC, dmOnly, vDmHead, vDmBar, vDmSetup } from './views/dm-mode.js';
import { L } from './live.js';
import { hideTip } from './tooltip.js';
import { glyph } from './icons.js';
import { syncAc } from './helpers.js';
import { CLASSES } from './catalog.js';
import { t, lang } from './i18n/index.js';

/** XP-Stand mit Balken bis zur nächsten Stufe. Wann aufgestiegen wird, entscheidet die Spielleitung. */
function vXp() {
  const lv = totalLevel() || S.level || 0, xp = +S.xp || 0;
  if (!lv && !xp) return '';
  const f = n => n.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US');
  if (lv >= 20) return `<p class="xpl">${t('xp.short')} ${f(xp)}</p>`;
  const from = XP_LEVELS[lv] || 0, to = XP_LEVELS[lv + 1], pct = Math.max(0, Math.min(100, (xp - from) / (to - from) * 100)), ready = xp >= to;
  return `<p class="xpl${ready ? ' ready' : ''}" title="${t('xp.hint')}">${t('xp.short')} ${f(xp)} / ${f(to)} <i class="xpbar" aria-hidden="true"><u style="width:${pct}%"></u></i>${ready ? ` <b>${t('xp.ready', { n: lv + 1 })}</b>` : ''}</p>`;
}
export function vHead() {
  const classes = S.multi?.length ? classLevels().map(c => `${c.k} ${c.lvl}`).join(' / ') : [S.klass, S.sub].filter(Boolean).join(' · ');
  const line = [S.subrace || S.race, classes].filter(Boolean).join(' · ');
  const others = roster();
  const langBtn = l => `<button data-a="lang" data-l="${l}" aria-pressed="${lang === l}" lang="${l}">${l.toUpperCase()}</button>`;
  return `<header class="hd"><label class="por" for="img-in" title="${t('head.portrait')}">${S.img ? `<img src="${S.img}" alt="${t('head.portraitAlt', { n: esc(S.name) })}">` : `<span aria-hidden="true">${esc((S.name || '?').trim()[0] || '?')}</span>`}</label><input type="file" id="img-in" accept="image/*" hidden>
  <div class="who"><h1>${esc(S.name)}</h1><p>${esc(line || t('head.pickRace'))}</p>${S.info ? `<p class="sub2">${esc(S.info)}</p>` : ''}${vXp()}</div>
  <button class="insp${S.insp ? ' on' : ''}" data-a="insp" aria-pressed="${!!S.insp}" aria-label="${t('insp.title')}" title="${t(S.insp ? 'insp.on' : 'insp.off')}">${glyph('star')}</button>${S.level ? `<div class="seal" title="${t('head.level')}"><small>${t('head.seal')}</small><b>${S.level}</b></div>` : ''}
  <div class="hacts">${others.length > 1 ? `<select id="char-switch" class="charsw" aria-label="${t('chars.switch')}">${others.map(c => `<option value="${esc(c.id)}"${c.id === S.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>` : ''}<div class="hrow"><button class="btn gilt" data-a="lu">${S.level ? (S.level >= 20 ? t('head.lvl20') : t('head.levelUp')) : t('head.build1')}</button><div class="langs" role="group" aria-label="${t('head.language')}">${langBtn('en')}${langBtn('de')}</div></div><div class="rests"><button class="btn ghost" data-a="rest" data-r="short">${t('rest.short')}</button><button class="btn ghost" data-a="rest" data-r="long">${t('rest.long')}</button></div></div></header>`;
}
const TAB_IC = { main: 'shield', inv: 'bag', wiki: 'book', notes: 'scroll', setup: 'tool', dm: 'dice', ...DM_TAB_IC };
// Im Spielleitungsmodus gibt es keinen eigenen Charakter: eigene Reiter statt Karte, Inventar und Notizen.
export const tabs = () => (dmOnly() ? [...Object.keys(DM_TABS), 'wiki', 'setup'] : ['main', 'inv', 'wiki', 'notes', 'setup']);
export const app = $('app');
export function render() {
  hideTip();
  syncAc();
  // Alter Reiter „Spielleitung“ (vor dem Spielleitungsmodus) → passender Reiter im Modus
  if (S.tab === 'dm' && dmOnly()) S.tab = 'dm' + (D.view || 'notes');
  if (!tabs().includes(S.tab)) S.tab = tabs()[0];
  const tb = S.tab, ae = document.activeElement, keep = ae && ae.id && app.contains(ae) ? ae.id : null;
  document.documentElement.toggleAttribute('data-dm-only', dmOnly());
  let h = dmOnly() ? vDmHead() : vHead();
  h += `<div class="tabs"><nav role="tablist" aria-label="${t('head.areas')}">${tabs().map(k => `<button role="tab" aria-selected="${tb === k}" data-a="tab" data-t="${k}">${glyph(TAB_IC[k])}<span>${t('tab.' + k)}</span></button>`).join('')}</nav>${dmOnly() ? '' : `<div class="mini${S.hp === 0 ? ' down' : ''}">${L.status === 'on' ? `<i class="live-dot" title="${t('live.on')}"></i>` : ''}${t('head.hpShort')} <b>${S.hp}</b>/${S.hpMax}${S.tmp ? ` +${S.tmp}` : ''}</div>`}</div>`;
  h += (dmOnly() ? vDmBar : vMiniBar)(tabs().map(k => `<button class="${tb === k ? 'on' : ''}" data-a="mbtab" data-t="${k}" title="${t('tab.' + k)}" aria-label="${t('tab.' + k)}">${glyph(TAB_IC[k])}</button>`).join(''));
  h += vTurn() + vInbox() + vBackupNag();
  if (tb === 'main') h += vMain();
  if (tb === 'inv') h += vInv();
  if (tb === 'wiki') h += vWiki();
  if (tb === 'notes') h += vNotesTab();
  if (tb === 'setup') h += dmOnly() ? vDmSetup() : vSetup();
  if (DM_TABS[tb]) { D.view = DM_TABS[tb]; h += vDm(true); }
  if (tb === 'dm') h += vDm();
  h += `<footer><p>${t('footer.rules')}</p><details><summary>${t('footer.about')}</summary><p>${t('footer.srd')}</p><p>${t('footer.icons')}</p><p>${t('footer.fonts')}</p><p class="lbl">${t('footer.version', { v: typeof __BUILD__ !== 'undefined' ? __BUILD__ : '–' })}</p></details></footer>`;
  if (U.LU && CLASSES[S.klass]) h += vLU();
  h += vHandout();
  document.body.style.overflow = U.LU ? 'hidden' : '';
  const wl = document.querySelector('.wl'), wlTop = wl && !U.resetWl ? wl.scrollTop : 0, pageY = window.scrollY;
  app.innerHTML = h;
  U.resetWl = false;
  const wl2 = document.querySelector('.wl');
  if (wl2) wl2.scrollTop = wlTop;
  window.scrollTo({ top: pageY, behavior: 'instant' });
  if (U.anchor) {
    const el = document.querySelector(`.wli[data-key="${CSS.escape(U.anchor.key)}"]`);
    if (el) window.scrollBy({ top: el.getBoundingClientRect().top - U.anchor.top, behavior: 'instant' });
    U.anchor = null;
  }
  if (U.LU && U.LUfocus) { U.LUfocus = false; const f = $('lu-h'); if (f) f.focus(); }
  else if (keep) { const el = $(keep); if (el) el.focus({ preventScroll: true }); }
}
