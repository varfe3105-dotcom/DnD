// Rahmen auf Kampagnen- und Charakterebene: schmale globale Leiste (Desktop, einklappbar), kompakte Kopfleiste mit
// Menü (Handy) und Liniensymbole für alle Reiter. Die Startseite hat ihre eigene, breitere Leiste (views/hub.js).
import { esc } from '../util.js';
import { S, U } from '../state.js';
import { L } from '../live.js';
import { t, lang, units } from '../i18n/index.js';
import { dmOnly } from './dm-mode.js';
import { curCamp, charLevel, tabLabel } from './nav.js';

/** Liniensymbole (24er-Raster, nur Striche). Gleicher Stil wie die Seitenleiste der Startseite. */
export const LINE = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  camps: '<path d="M4 4l10 10M4 4v4M4 4h4"/><path d="M20 4 10 14M20 4v4M20 4h-4"/><path d="M8 16l-3 3M16 16l3 3M7 13l4 4M17 13l-4 4"/>',
  gm: '<path d="M3 18h18M4 16 3 7l5 4 4-7 4 7 5-4-1 9z"/>',
  chars: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/>',
  map: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
  wiki: '<path d="M3 5c3-1.5 6-1.5 9 1 3-2.5 6-2.5 9-1v14c-3-1.5-6-1.5-9 1-3-2.5-6-2.5-9-1z"/><path d="M12 6v14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  // Reiter der Kampagne und des Charakters
  cover: '<path d="M12 3 20 6v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  party: '<circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9" r="3"/><path d="M2.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M11.5 16c.9-1 2.6-1.5 5-1.5 2.5 0 4.6 1.5 5 4.5"/>',
  main: '<path d="M14.5 4H20v5.5L9 20.5 3.5 15z"/><path d="M6 13l5 5M3 21l3-3"/>',
  explore: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z"/>',
  trade: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  chron: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6M9 11h4"/>',
  prof: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/>',
  stats: '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9z"/><path d="M12 8v8M8.5 10.5l7 3M15.5 10.5l-7 3"/>',
  inv: '<path d="M8 7V6a4 4 0 0 1 8 0v1"/><path d="M4.5 8h15l-1.2 12.5H5.7z"/>',
  spells: '<path d="M4 20 15 9"/><path d="M17 3v3M17 9v1M14 6h-1M21 6h-3"/>',
  notes: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  setup: '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  dmlive: '<circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9" r="3"/><path d="M2.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M11.5 16c.9-1 2.6-1.5 5-1.5 2.5 0 4.6 1.5 5 4.5"/>',
  dmcombat: '<path d="M14.5 4H20v5.5L9 20.5 3.5 15z"/><path d="M6 13l5 5M3 21l3-3"/>',
  dmloot: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  dmnotes: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6M9 11h4"/>',
  dmenc: '<path d="M12 3c4 2 6 5 6 9a6 6 0 0 1-12 0c0-4 2-7 6-9z"/><path d="M9.5 12.5h.01M14.5 12.5h.01M10 16h4"/>',
  dmcheat: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 14h7M9 17h5"/>',
  dmset: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  fold: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};
export const line = (k, cls = '') => `<svg class="li${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${LINE[k] || LINE.more}</svg>`;

const GLOBAL = ['home', 'camps', 'gm', 'chars', 'map', 'wiki'];
/** Welcher globale Bereich gerade „aktiv“ ist: in einer Kampagne „Meine Kampagnen“, sonst die Bibliothek. */
const here = () => (curCamp() ? (dmOnly() ? 'gm' : 'camps') : dmOnly() ? 'gm' : 'chars');

let railMin = false;
try { railMin = localStorage.getItem('charbogen-rail') === 'min'; } catch (e) { /* Datenschutzmodus */ }
export const railFolded = () => railMin;
export function toggleRail() { railMin = !railMin; try { localStorage.setItem('charbogen-rail', railMin ? 'min' : 'full'); } catch (e) { /* egal */ } }

/** Globale Leiste (ab 900 px). Die Live-Leiste sitzt am Desktop unten in der Leiste und verdeckt so keine Inhalte. */
export function vRail(dockHtml) {
  const cur = here();
  const btn = s => `<button data-a="hubgo" data-s="${s}" aria-current="${cur === s ? 'true' : 'false'}" title="${t('hub.nav.' + s)}">${line(s)}<span>${t('hub.nav.' + s)}</span></button>`;
  return `<aside class="rail" aria-label="${t('hub.navLabel')}"><button class="rail-brand" data-a="railhome" title="${t('hub.backTitle')}"><i class="hub-mark" aria-hidden="true"></i><b>RealmCraft</b></button><nav>${GLOBAL.map(btn).join('')}</nav><div class="rail-foot">${btn('settings')}<button class="rail-fold" data-a="railfold" aria-pressed="${railMin}" title="${t(railMin ? 'frame.unfold' : 'frame.fold')}">${line('fold')}<span>${t('frame.fold')}</span></button></div>${dockHtml}</aside>`;
}

/** Handy: schmale Kopfleiste mit Monogramm, Ort und Menü. Ersetzt Brotkrumen und Kopfknöpfe. */
export function vMobTop() {
  const c = curCamp(), ttl = charLevel() ? S.name : c ? c.name : dmOnly() ? t('dmm.title') : S.name;
  const st = L.code && L.role ? `<i class="mt-live st-${L.status === 'on' ? 'on' : L.status === 'error' ? 'error' : 'connecting'}" title="${t(L.status === 'on' ? 'live.stOn' : 'live.stConnecting')}"></i>` : '';
  return `<div class="mtop"><button class="mt-mark" data-a="railhome" aria-label="${t('hub.backTitle')}"><i class="hub-mark" aria-hidden="true"></i></button><div class="mt-where"><small>${t(charLevel() ? 'nav.lvl.char' : 'nav.lvl.camp')}</small><b>${esc(ttl || '')}</b></div>${st}<button class="mt-menu" data-a="mmenu" aria-expanded="${!!U.MMENU}" aria-label="${t('frame.menu')}">${line('menu')}</button></div>`;
}

/** Menü am Handy: weitere Bereiche der Ebene, Aktionen aus der Titelplatte, globale Navigation. */
export function vMobMenu(tabKeys) {
  if (!U.MMENU) return '';
  const c = curCamp(), dm = dmOnly(), player = c && !dm;
  const tabBtn = k => `<button data-a="tab" data-t="${k}" aria-current="${S.tab === k ? 'page' : 'false'}">${line(k)}<span>${tabLabel(k)}</span></button>`;
  const acts = [];
  if (charLevel() && !dm) acts.push(`<button class="btn gilt" data-a="lu">${S.level ? (S.level >= 20 ? t('head.lvl20') : t('head.levelUp')) : t('head.build1')}</button>`);
  if (player || charLevel() && (S.camp || c)) acts.push(`<button class="btn" data-a="rest" data-r="short">${t('rest.short')}</button><button class="btn" data-a="rest" data-r="long">${t('rest.long')}</button>`);
  if (dm) acts.push(`<button class="btn" data-a="tab" data-t="setup">${t('tab.setup')}</button>`);
  if (c && charLevel()) acts.push(`<button class="btn" data-a="crumb" data-t="cover">${t('frame.toCamp', { n: esc(c.name) })}</button>`);
  const langBtn = l => `<button data-a="lang" data-l="${l}" aria-pressed="${lang === l}" lang="${l}">${l.toUpperCase()}</button>`;
  const prefs = `<div class="mm-prefs"><div class="langs" role="group" aria-label="${t('head.language')}">${langBtn('en')}${langBtn('de')}</div><div class="langs units" role="group" aria-label="${t('head.units')}">${['m', 'ft'].map(u => `<button data-a="units" data-u="${u}" aria-pressed="${units === u}" title="${t('units.' + u)}">${u}</button>`).join('')}</div></div>`;
  const glob = [...GLOBAL, 'settings'].map(s => `<button data-a="hubgo" data-s="${s}">${line(s)}<span>${t('hub.nav.' + s)}</span></button>`).join('');
  return `<div class="mm-ovl" data-a="mmenu"></div><div class="mmenu" role="dialog" aria-modal="true" aria-label="${t('frame.menu')}"><div class="mm-h"><b>${t('frame.menu')}</b><button class="mm-x" data-a="mmenu" aria-label="${t('common.close')}">${line('close')}</button></div>
  <h4>${t(charLevel() ? 'nav.lvl.char' : 'nav.lvl.camp')}</h4><nav class="mm-grid">${tabKeys.map(tabBtn).join('')}</nav>${acts.length ? `<div class="mm-acts">${acts.join('')}</div>` : ''}${prefs}<h4>RealmCraft</h4><nav class="mm-grid">${glob}</nav></div>`;
}
