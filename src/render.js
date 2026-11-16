/* global __BUILD__ */
import { vNotesTab } from './views/notes.js';
import { vHandout, vBackupNag, vDock, vTarget, vParty } from './views/live-ui.js';
import { $, esc } from './util.js';
import { S, U, roster } from './state.js';
import { classLevels, XP_LEVELS, totalLevel } from './tables.js';
import { vMiniBar } from './views/sheet.js';
import { vInv } from './views/inventory.js';
import { vWiki } from './views/wiki.js';
import { vSetup } from './views/setup.js';
import { vLU } from './views/levelup.js';
import { vDm, vPeek } from './views/dm.js';
import { vHub, syncMapLayer } from './views/hub.js';
import { campaignsOf } from './campaigns.js';
import { D } from './dm.js';
import { DM_TABS, DM_TAB_IC, dmOnly, vDmHead, vDmBar, vDmSetup } from './views/dm-mode.js';
import { L } from './live.js';
import { hideTip } from './tooltip.js';
import { glyph } from './icons.js';
import { syncAc } from './helpers.js';
import { CLASSES } from './catalog.js';
import { navTabs, validTabs, fallbackTab, tabLabel, NAV_IC, vCrumbs, vCampHead, charLevel, curCamp, CAMP_PAGES, CHAR_PAGES, CHAR_STYLE, vDmSub, vFight } from './views/nav.js';
import { t, lang, units } from './i18n/index.js';

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
  const art = campaignsOf(S.id)[0]?.art ?? 1;
  return `<header class="hd"><i class="hd-art hub-camp-art a${art}" aria-hidden="true"></i><label class="por" for="img-in" title="${t('head.portrait')}">${S.img ? `<img src="${S.img}" alt="${t('head.portraitAlt', { n: esc(S.name) })}">` : `<span aria-hidden="true">${esc((S.name || '?').trim()[0] || '?')}</span>`}</label><input type="file" id="img-in" accept="image/*" hidden>
  <div class="who"><h1>${esc(S.name)}</h1><p>${esc(line || t('head.pickRace'))}</p>${S.info ? `<p class="sub2">${esc(S.info.length > 140 ? S.info.slice(0, 140) + ' …' : S.info)}</p>` : ''}${vXp()}${campaignsOf(S.id).length ? `<p class="hd-camps">${campaignsOf(S.id).map(c => `<span class="tag t-res">${esc(c.name)}</span>`).join('')}</p>` : ''}</div>
  <button class="insp${S.insp ? ' on' : ''}" data-a="insp" aria-pressed="${!!S.insp}" aria-label="${t('insp.title')}" title="${t(S.insp ? 'insp.on' : 'insp.off')}">${glyph('star')}</button>${S.level ? `<div class="seal" title="${t('head.level')}"><small>${t('head.seal')}</small><b>${S.level}</b></div>` : ''}
  <div class="hacts">${others.length > 1 ? `<select id="char-switch" class="charsw" aria-label="${t('chars.switch')}">${others.map(c => `<option value="${esc(c.id)}"${c.id === S.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>` : ''}<div class="hrow"><button class="btn ghost home" data-a="hubhome" title="${t('hub.backTitle')}">${t('hub.back')}</button><button class="btn ghost" data-a="tab" data-t="wiki">${t('nav.rules')}</button><button class="btn gilt" data-a="lu">${S.level ? (S.level >= 20 ? t('head.lvl20') : t('head.levelUp')) : t('head.build1')}</button><div class="langs" role="group" aria-label="${t('head.language')}">${langBtn('en')}${langBtn('de')}</div><div class="langs units" role="group" aria-label="${t('head.units')}">${['m', 'ft'].map(u => `<button data-a="units" data-u="${u}" aria-pressed="${units === u}" title="${t('units.' + u)}">${u}</button>`).join('')}</div></div>${S.camp || U.CAMP || S.tab === 'main' ? `<div class="rests"><button class="btn ghost" data-a="rest" data-r="short">${t('rest.short')}</button><button class="btn ghost" data-a="rest" data-r="long">${t('rest.long')}</button></div>` : ''}</div></header>${!S.camp && !dmOnly() && !U.CAMP ? `<p class="lib-banner">${t('lib.banner')}</p>` : ''}`;
}
const TAB_IC = { main: 'sword', inv: 'bag', wiki: 'book', notes: 'scroll', setup: 'tool', dm: 'dice', ...DM_TAB_IC, ...NAV_IC };
// Reiter je Ebene (Kampagne oder Charakter) kommen aus views/nav.js. Im Spielleitungsmodus gibt es keinen eigenen Charakter.
export const tabs = navTabs;
export const app = $('app');
export function render() {
  hideTip();
  syncAc();
  // Alter Reiter „Spielleitung“ (vor dem Spielleitungsmodus) → passender Reiter im Modus
  if (S.tab === 'dm' && dmOnly()) S.tab = 'dm' + (D.view || 'notes');
  if (!validTabs().includes(S.tab)) S.tab = fallbackTab();
  const tb = S.tab, ae = document.activeElement, keep = ae && ae.id && app.contains(ae) ? ae.id : null;
  document.documentElement.toggleAttribute('data-dm-only', dmOnly());
  let h = '';
  if (U.HUB) h = vHub() + vDock() + vHandout() + vTarget();
  else {
  h = vCrumbs() + (dmOnly() ? vDmHead() : charLevel() || !curCamp() ? vHead() : vCampHead());
  // Charakterebene: Navigation seitlich (Desktop), Inhalt daneben; sonst Reiter oben. Am Handy immer die feste Leiste unten.
  const side = charLevel();
  const tabsHtml = `<div class="tabs${side ? ' side' : ''}"><nav role="tablist" aria-label="${t('head.areas')}"${side ? ' aria-orientation="vertical"' : ''}>${tabs().map(k => `<button role="tab" aria-selected="${tb === k}" data-a="tab" data-t="${k}"${k === 'main' ? ' class="tab-fight"' : ''}>${glyph(TAB_IC[k])}<span>${tabLabel(k)}</span></button>`).join('')}</nav>${dmOnly() ? '' : `<div class="mini${S.hp === 0 ? ' down' : ''}">${L.status === 'on' ? `<i class="live-dot" title="${t('live.on')}"></i>` : ''}${t('head.hpShort')} <b>${S.hp}</b>/${S.hpMax}${S.tmp ? ` +${S.tmp}` : ''}</div>`}</div>`;
  const mini = (dmOnly() ? vDmBar : vMiniBar)(tabs().map(k => `<button class="${tb === k ? 'on' : ''}" data-a="mbtab" data-t="${k}" title="${tabLabel(k)}" aria-label="${tabLabel(k)}">${glyph(TAB_IC[k])}</button>`).join(''));
  let body = '';
  if (tb === 'main') body += vFight() + vParty();
  if (CAMP_PAGES[tb]) body += CAMP_PAGES[tb]();
  if (CHAR_PAGES[tb]) body += CHAR_PAGES[tb]();
  if (['dmcombat', 'dmenc', 'dmcheat'].includes(tb)) body += vDmSub();
  if (tb === 'inv') body += vInv();
  if (tb === 'wiki') body += vWiki();
  if (tb === 'notes') body += vNotesTab();
  if (tb === 'setup') body += dmOnly() ? vDmSetup() : vSetup();
  if (DM_TABS[tb]) { D.view = DM_TABS[tb]; body += vDm(true); }
  if (tb === 'dm') body += vDm();
  h += side ? mini + vDock() + vBackupNag() + `<div class="charlayout">${tabsHtml}<div class="charmain">${body}</div></div>` : tabsHtml + mini + vDock() + vBackupNag() + body;
  h += `<footer><p>${t('footer.rules')}</p><details><summary>${t('footer.about')}</summary><p>${t('footer.srd')}</p><p>${t('footer.icons')}</p><p>${t('footer.fonts')}</p><p class="lbl">${t('footer.version', { v: typeof __BUILD__ !== 'undefined' ? __BUILD__ : '–' })}</p></details></footer>`;
  if (U.LU && CLASSES[S.klass]) h += vLU();
  h += vHandout() + vTarget() + vPeek();
  }
  document.documentElement.toggleAttribute('data-hub', !!U.HUB);
  document.documentElement.dataset.area = U.HUB ? 'hub' : !dmOnly() && CHAR_STYLE.includes(tb) ? 'char' : 'play';
  document.body.style.overflow = U.LU ? 'hidden' : '';
  const wl = document.querySelector('.wl'), wlTop = wl && !U.resetWl ? wl.scrollTop : 0, pageY = window.scrollY;
  app.innerHTML = h;
  syncMapLayer();
  U.resetWl = false;
  const wl2 = document.querySelector('.wl');
  if (wl2) wl2.scrollTop = wlTop;
  window.scrollTo({ top: pageY, behavior: 'instant' });
  if (U.anchor) {
    const el = document.querySelector(`.wli[data-key="${CSS.escape(U.anchor.key)}"]`);
    if (el) window.scrollBy({ top: el.getBoundingClientRect().top - U.anchor.top, behavior: 'instant' });
    U.anchor = null;
  }
  if (U.SCROLLTO) { const el = $(U.SCROLLTO); U.SCROLLTO = null; if (el) el.scrollIntoView({ block: 'center' }); }
  if (U.LU && U.LUfocus) { U.LUfocus = false; const f = $('lu-h'); if (f) f.focus(); }
  else if (keep) { const el = $(keep); if (el) el.focus({ preventScroll: true }); }
}

/** Nur die Live-Leiste neu zeichnen (geht auch, während jemand tippt). */
export function updateDock() {
  const el = document.getElementById('live-dock');
  if (!el) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = vDock();
  el.replaceWith(tmp.firstChild);
}
