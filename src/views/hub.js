// Startseite „Roll & Tale“: eigenständige Abenteuerzentrale vor dem Spielbereich (U.HUB = Bereich, null = Spielbereich).
// Zeigt nur echte Daten: Charaktere aus der Charakterliste, Kampagnen aus campaigns.js, Wiki aus dem Katalog.
import { esc } from '../util.js';
import { S, U, roster, charSnapshot } from '../state.js';
import { CAT } from '../catalog.js';
import { campaigns, campaignsOf, nextSession, campaignById, ART } from '../campaigns.js';
import { dmOnly } from './dm-mode.js';
import { vWiki } from './wiki.js';
import { vBackup } from './live-ui.js';
import { skinControls } from '../bright.js';
import { t, lang, units, nameLine } from '../i18n/index.js';

export const HUB_SECTIONS = ['home', 'camps', 'chars', 'wiki', 'map', 'plan'];
export const MAP_URL = 'https://www.aidedd.org/atlas/faerun';
const HUB_IC = { home: 'shield', camps: 'swords', chars: 'person', wiki: 'book', map: 'map', plan: 'cal', settings: 'gear' };
/** Eigene Strich-Icons der Seitenleiste (gleicher Stil wie icons.js). */
const SVG = {
  shield: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  swords: '<path d="M4 4l10 10M4 4v4M4 4h4"/><path d="M20 4 10 14M20 4v4M20 4h-4"/><path d="M8 16l-3 3M16 16l3 3M7 13l4 4M17 13l-4 4"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/>',
  book: '<path d="M3 5c3-1.5 6-1.5 9 1 3-2.5 6-2.5 9-1v14c-3-1.5-6-1.5-9 1-3-2.5-6-2.5-9-1z"/><path d="M12 6v14"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="1"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 16.5h2M11 16.5h2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  d20: '<path d="M12 2.5 20.5 7.5v9L12 21.5 3.5 16.5v-9z"/><path d="M12 2.5 7.5 14h9z M3.5 7.5 7.5 14 M20.5 7.5 16.5 14 M7.5 14 12 21.5 16.5 14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M4 12.5 9.5 18 20 6.5"/>', pen: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>', bag: '<path d="M8 7V6a4 4 0 0 1 8 0v1"/><path d="M4.5 8h15l-1.2 12.5H5.7z"/>', wand: '<path d="M4 20 15 9"/><path d="M17 3v3M17 9v1M14 6h-1M21 6h-3"/>', crown: '<path d="M3 18h18M4 16 3 7l5 4 4-7 4 7 5-4-1 9z"/>',
  star: '<path d="M12 3l2.2 6.6H21l-5.5 4 2.1 6.6L12 16.3 6.4 20.2l2.1-6.6L3 9.6h6.8z"/>',
  map: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
  scroll: '<path d="M8 4h10a2 2 0 0 1 0 4h-1v10a2.5 2.5 0 0 1-2.5 2.5h-9a2 2 0 0 1 0-4H7V5.5A1.5 1.5 0 0 1 8 4"/><path d="M10 9h4.5M10 12.5h4.5"/>',
};
const ico = (k, cls = '') => `<svg class="hi${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${SVG[k]}</svg>`;
const ornament = () => `<div class="hub-orn" aria-hidden="true"><i></i>${ico('d20')}<i></i></div>`;
const fmtDate = s => {
  if (!s) return '';
  const d = new Date(s.length > 10 ? s : s + 'T00:00');
  if (Number.isNaN(+d)) return s;
  const o = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
  return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', o) + (s.length > 10 ? ' · ' + d.toLocaleTimeString(lang === 'de' ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) + (lang === 'de' ? ' Uhr' : '') : '');
};

/** Charaktere mit Bild und Kampagnen. Der aktive kommt aus S, alle anderen aus ihrem Speicherplatz. */
function chars() {
  return roster().map(c => { const o = charSnapshot(c.id) || {}; return { ...c, img: o.img || '', race: o.race || '', sub: o.sub || '', camps: campaignsOf(c.id) }; });
}
const real = c => c.klass || c.level || c.id !== S.id || S.name !== t('char.new');
const portrait = (c, cls = 'hub-por') => `<span class="${cls}">${c.img ? `<img src="${esc(c.img)}" alt="">` : `<b>${esc((c.name || '?').trim()[0] || '?')}</b>`}</span>`;

function vSide() {
  const nav = HUB_SECTIONS.map(s => `<button data-a="hubgo" data-s="${s}" aria-current="${U.HUB === s ? 'page' : 'false'}">${ico(HUB_IC[s])}<span>${t('hub.nav.' + s)}</span></button>`).join('');
  return `<aside class="hub-side"><div class="hub-brand"><i class="hub-mark" aria-hidden="true"></i><h1 class="hub-word">RealmCraft</h1><small>${t('hub.tagline')}</small></div><i class="hub-div d1" aria-hidden="true"></i><nav aria-label="${t('hub.navLabel')}">${nav}</nav><div class="hub-sideart" aria-hidden="true"></div>
  <div class="hub-sidefoot"><button data-a="hubgo" data-s="settings" aria-current="${U.HUB === 'settings' ? 'page' : 'false'}">${ico('gear')}<span>${t('hub.nav.settings')}</span></button></div></aside>`;
}
function vTop() {
  const me = real({ id: S.id, klass: S.klass, level: S.level }) ? `<button class="hub-me" data-a="hubplay" title="${t('hub.openChar', { n: esc(S.name) })}">${portrait({ name: S.name, img: S.img })}<span>${esc(S.name)}</span></button>` : '';
  return `<header class="hub-top"><div class="hub-search" role="search">${ico('search')}<input type="search" id="hub-q" value="${esc(U.HUBQ || '')}" placeholder="${t('hub.searchPh')}" aria-label="${t('hub.searchPh')}" autocomplete="off"><div id="hub-res">${vHubResults()}</div></div><i class="hub-topline" aria-hidden="true"></i>${me}</header>`;
}
/** Suchergebnisse: Charaktere, Kampagnen und Wiki-Einträge. Eigener Bereich, damit Tippen die Seite nicht neu zeichnet. */
export function vHubResults() {
  const q = (U.HUBQ || '').trim().toLowerCase();
  if (q.length < 2) return '';
  const hit = (...xs) => xs.some(x => String(x || '').toLowerCase().includes(q));
  const cs = chars().filter(c => hit(c.name, c.klass)).slice(0, 3).map(c => `<button class="hub-hit" data-a="hubplay" data-id="${esc(c.id)}">${ico('person')}<span>${esc(c.name)}<small>${t('hub.nav.chars')}</small></span></button>`);
  const ks = campaigns().filter(c => hit(c.name, c.desc)).slice(0, 3).map(c => `<button class="hub-hit" data-a="campedit" data-id="${esc(c.id)}">${ico('swords')}<span>${esc(c.name)}<small>${t('hub.nav.camps')}</small></span></button>`);
  const ws = CAT.filter(e => hit(e.n, e.de, e.aka)).slice(0, 8 - cs.length - ks.length).map(e => `<button class="hub-hit" data-a="hubwiki" data-key="${esc(e.key)}">${ico('book')}<span>${esc(nameLine(e.n, e.de))}<small>${esc(e.c || '')}</small></span></button>`);
  const all = [...cs, ...ks, ...ws];
  return `<div class="hub-results">${all.join('') || `<p class="note">${t('wiki.nothing')}</p>`}</div>`;
}

function vHero() {
  const list = chars().filter(real), cont = real({ id: S.id, klass: S.klass, level: S.level });
  return `<section class="hub-hero"><div class="hub-hero-txt"><h2 class="hub-hero-h">${t('hub.welcome')}</h2><p>${t('hub.welcomeTxt')}</p><i class="hub-div d3" aria-hidden="true"></i><div class="hub-cta"><button class="hbtn pri" data-a="campnew">${t('hub.newCamp')} ${ico('arrow')}</button>${cont ? `<button class="hbtn" data-a="hubplay">${t('hub.continue', { n: esc(S.name) })} ${ico('arrow')}</button>` : list.length ? '' : `<button class="hbtn" data-a="hubnewchar">${t('hub.firstChar')} ${ico('arrow')}</button>`}</div></div><div class="hub-hero-art" aria-hidden="true"></div></section>`;
}
function campCard(c, all) {
  const own = all.filter(x => c.chars.includes(x.id));
  const prog = c.planned ? Math.min(100, c.done / c.planned * 100) : 0;
  return `<article class="hub-camp ${c.status}"><div class="hub-camp-art a${c.art}" aria-hidden="true"></div><span class="hub-status ${c.status}"><i></i>${t('camp.st.' + c.status)}</span><div class="hub-camp-b"><h3>${esc(c.name)}</h3>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}${own.length ? `<div class="hub-avs">${own.map(x => portrait(x, 'hub-av')).join('')}<small>${own.map(x => esc(x.name)).join(', ')}</small></div>` : ''}
  <div class="hub-prog"><span>${c.planned ? t('camp.sessOf', { a: c.done, b: c.planned }) : t('camp.sess', { n: c.done })}</span>${c.planned ? `<i><u style="width:${prog}%"></u></i>` : ''}</div>${c.next ? `<p class="hub-when">${ico('cal')}${esc(fmtDate(c.next))}</p>` : ''}
  <div class="hub-camp-act">${own[0] ? `<button class="hbtn sm pri" data-a="campplay" data-id="${esc(c.id)}">${c.room ? t('camp.toRoom') : t('camp.play')} ${ico('arrow')}</button>` : ''}${c.status === 'active' ? `<button class="hub-ib" data-a="campdone" data-id="${esc(c.id)}" title="${t('camp.doneHint')}" aria-label="${t('camp.done')}">${ico('check')}</button>` : ''}<button class="hub-ib" data-a="campedit" data-id="${esc(c.id)}" title="${t('camp.edit')}" aria-label="${t('camp.edit')}">${ico('pen')}</button></div></div></article>`;
}
function vCampForm() {
  const id = U.CAMPED;
  if (!id) return '';
  const c = id === 'new' ? { name: '', desc: '', status: 'active', chars: [], room: '', next: '', done: 0, planned: 0 } : campaignById(id);
  if (!c) return '';
  const all = chars().filter(real), sel = new Set(U.CAMPCH || c.chars);
  const f = (l, h) => `<label><span class="lbl">${l}</span>${h}</label>`;
  return `<section class="hub-doc hub-form" aria-labelledby="cf-h"><h3 id="cf-h">${id === 'new' ? t('camp.new') : t('camp.editTitle', { n: esc(c.name) })}</h3><div class="form">
  ${f(t('camp.name'), `<input type="text" id="cf-name" value="${esc(c.name)}" maxlength="80">`)}
  ${f(t('camp.status'), `<select id="cf-status"><option value="active"${c.status === 'active' ? ' selected' : ''}>${t('camp.st.active')}</option><option value="archived"${c.status === 'archived' ? ' selected' : ''}>${t('camp.st.archived')}</option></select>`)}
  ${f(t('camp.next'), `<input type="datetime-local" id="cf-next" value="${esc(c.next && c.next.length === 10 ? c.next + 'T19:00' : c.next)}">`)}
  ${f(t('camp.room'), `<input type="text" id="cf-room" value="${esc(c.room)}" maxlength="6" placeholder="ABC234" style="text-transform:uppercase">`)}
  ${f(t('camp.doneN'), `<input type="number" class="n" id="cf-done" min="0" max="999" value="${c.done}">`)}
  ${f(t('camp.planned'), `<input type="number" class="n" id="cf-planned" min="0" max="999" value="${c.planned || ''}" placeholder="–">`)}
  </div>${f(t('camp.desc'), `<textarea id="cf-desc" rows="2" maxlength="400">${esc(c.desc)}</textarea>`)}
  <p class="lbl">${t('camp.art')}</p><div class="hub-artpick">${Array.from({ length: ART }, (_, i) => `<button class="hub-camp-art a${i}${(U.CAMPART ?? c.art ?? 0) === i ? ' on' : ''}" data-a="campart" data-i="${i}" aria-pressed="${(U.CAMPART ?? c.art ?? 0) === i}" aria-label="${t('camp.artN', { n: i + 1 })}"></button>`).join('')}</div>
  <p class="lbl">${t('camp.chars')}</p><div class="chips">${all.map(x => `<button class="chip${sel.has(x.id) ? ' on' : ''}" data-a="campchar" data-id="${esc(x.id)}" aria-pressed="${sel.has(x.id)}">${esc(x.name)}</button>`).join('') || `<span class="note">${t('camp.noChars')}</span>`}</div>
  <div class="dlgf"><button class="hbtn" data-a="campcancel">${t('common.cancel')}</button>${id !== 'new' ? `<button class="hbtn bad" data-a="campdel" data-id="${esc(id)}">${U.CONF === 'campdel:' + id ? t('chars.delConfirm') : t('common.deleteBtn')}</button>` : ''}<button class="hbtn pri" data-a="campsave">${t('camp.save')}</button></div><p class="note">${t('camp.localNote')}</p></section>`;
}
function vCamps(limit) {
  const all = chars(), list = campaigns().sort((a, b) => (a.status === b.status ? b.at.localeCompare(a.at) : a.status === 'active' ? -1 : 1));
  const shown = limit ? list.filter(c => c.status === 'active').slice(0, limit) : list;
  const head = `<div class="hub-h">${ico('d20', 'big')}<h2>${t(limit ? 'hub.yourCamps' : 'hub.nav.camps')}</h2>${limit && list.length ? `<button class="hub-more" data-a="hubgo" data-s="camps">${t('hub.all')} ${ico('arrow')}</button>` : `<button class="hub-more" data-a="campnew">${ico('plus')} ${t('camp.new')}</button>`}</div>`;
  const empty = `<div class="hub-empty"><div class="hub-camp-art a1" aria-hidden="true"></div><div><h3>${t('camp.emptyTitle')}</h3><p>${t('camp.emptyTxt')}</p><button class="hbtn pri" data-a="campnew">${t('hub.newCamp')} ${ico('arrow')}</button></div></div>`;
  return `${head}${limit ? '' : vCampForm()}${shown.length ? `<div class="hub-camps">${shown.map(c => campCard(c, all)).join('')}</div>` : list.length ? `<p class="note">${t('camp.onlyArchived')}</p>` : empty}`;
}
function vChars(limit) {
  const list = chars().filter(real);
  const head = `<div class="hub-h">${ico('person', 'big')}<h2>${t(limit ? 'hub.yourChars' : 'hub.nav.chars')}</h2>${limit && list.length > limit ? `<button class="hub-more" data-a="hubgo" data-s="chars">${t('hub.all')} ${ico('arrow')}</button>` : ''}</div>`;
  const card = c => `<article class="hub-char${c.id === S.id ? ' cur' : ''}">${portrait(c, 'hub-por lg')}<div><h3>${esc(c.name)}</h3><p>${esc([c.race, c.klass, c.level ? t('feat.level', { n: c.level }) : ''].filter(Boolean).join(' · ') || t('hub.noClass'))}</p>${c.camps.length ? `<p class="hub-tag">${ico('swords')}${c.camps.map(x => esc(x.name)).join(', ')}</p>` : ''}<button class="hbtn sm pri" data-a="hubplay" data-id="${esc(c.id)}">${t('hub.open')} ${ico('arrow')}</button></div></article>`;
  const shown = limit ? list.slice(0, limit) : list;
  const add = `<article class="hub-char add"><button class="hub-addc" data-a="hubnewchar">${ico('plus')}<span>${t('hub.newChar')}</span></button><button class="hub-addc" data-a="hubimport">${ico('upload')}<span>${t('hub.importChar')}</span></button></article>`;
  return `${head}<div class="hub-chars">${shown.map(card).join('')}${limit && shown.length >= limit ? '' : add}</div>`;
}
/** Eigene Gruppe kompakt: Porträt, Name, Klasse und Stufe, TP aus dem gespeicherten Bogen, Kampagne. */
function vGroup() {
  const list = chars().filter(real);
  const head = `<div class="hub-h">${ico('person', 'big')}<h2>${t('hub.group')}</h2><button class="hub-more" data-a="hubgo" data-s="chars">${t('hub.all')} ${ico('arrow')}</button></div>`;
  if (!list.length) return head + `<section class="hub-panel hub-group"><p class="note">${t('hub.groupEmpty')}</p><div class="hub-cta"><button class="hbtn pri" data-a="hubnewchar">${t('hub.firstChar')} ${ico('arrow')}</button><button class="hbtn" data-a="hubimport">${t('hub.importChar')}</button></div></section>`;
  const row = c => {
    const o = c.id === S.id ? S : charSnapshot(c.id) || {}, max = +o.hpMax || 0, hp = Math.max(0, Math.min(max, +o.hp || 0)), pct = max ? hp / max * 100 : 0;
    return `<button class="hub-gm${c.id === S.id ? ' cur' : ''}" data-a="hubplay" data-id="${esc(c.id)}">${portrait(c, 'hub-por md')}<span class="hub-gm-t"><b>${esc(c.name)}</b><small>${esc([c.klass, c.level ? t('feat.level', { n: c.level }) : ''].filter(Boolean).join(' · ') || t('hub.noClass'))}</small>${max ? `<span class="hub-hp" title="${t('hub.hp')} ${hp}/${max}"><em>${t('hub.hpShort')}</em><i><u style="width:${pct}%"></u></i><small>${hp}/${max}</small></span>` : ''}${c.camps.length ? `<small class="hub-gm-c">${c.camps.map(x => esc(x.name)).join(', ')}</small>` : ''}</span></button>`;
  };
  return head + `<section class="hub-panel orn hub-group"><div class="hub-gms">${list.slice(0, 6).map(row).join('')}</div></section>`;
}
function vNext() {
  const n = nextSession(), all = chars();
  if (!n) return `<section class="hub-panel orn hub-next">${ico('cal', 'big')}<h3>${t('hub.nextTitle')}</h3><p class="note">${t('hub.noNext')}</p><button class="hbtn wide" data-a="hubgo" data-s="plan">${t('hub.planSession')} ${ico('arrow')}</button></section>`;
  const own = all.filter(x => n.chars.includes(x.id));
  return `<section class="hub-panel orn hub-next"><div class="hub-h sm">${ico('cal', 'big')}<h3>${t('hub.nextTitle')}</h3></div><h4>${esc(n.name)}</h4><p class="hub-when">${ico('cal')}${esc(fmtDate(n.next))}</p>${own.length ? `<div class="hub-avs">${own.map(x => portrait(x, 'hub-av lg')).join('')}</div>` : ''}${own[0] ? `<button class="hbtn wide" data-a="campplay" data-id="${esc(n.id)}">${n.room ? t('camp.toRoom') : t('hub.toSession')} ${ico('arrow')}</button>` : `<button class="hbtn wide" data-a="campedit" data-id="${esc(n.id)}">${t('camp.edit')} ${ico('arrow')}</button>`}</section>`;
}
function vQuick() {
  const has = real({ id: S.id, klass: S.klass, level: S.level });
  const L = [
    ['chars', 'person', t('hub.q.chars')], ['wiki', 'book', t('hub.q.rules')], ['map', 'map', t('hub.q.map')],
    ...(has && !dmOnly() ? [['inv', 'bag', t('hub.q.inv')], ['notes', 'scroll', t('hub.q.notes')]] : []), ['campnew', 'swords', t('hub.q.newCamp')], ['import', 'upload', t('hub.q.import')],
    ...(dmOnly() ? [['dm', 'crown', t('hub.q.dm')]] : [['live', 'star', t('hub.q.live')]]),
  ];
  return `<section class="hub-parch hub-quick"><div class="hub-h sm">${ico('star', 'big')}<h3>${t('hub.quick')}</h3></div>${L.map(([k, ic, l]) => `<button class="hub-ql" data-a="hubq" data-k="${k}">${ico(ic)}<span>${l}</span></button>`).join('')}</section>`;
}
function vPlan() {
  const list = campaigns().filter(c => c.status === 'active');
  return `<div class="hub-h">${ico('cal', 'big')}<h2>${t('hub.nav.plan')}</h2></div><section class="hub-doc">${list.length ? list.sort((a, b) => (a.next || '9').localeCompare(b.next || '9')).map(c => `<div class="row hub-planrow"><div class="nm">${esc(c.name)}<small>${c.next ? esc(fmtDate(c.next)) : t('hub.noDate')}</small></div><input type="datetime-local" id="plan-${esc(c.id)}" value="${esc(c.next && c.next.length === 10 ? c.next + 'T19:00' : c.next)}" aria-label="${t('camp.next')} ${esc(c.name)}">${c.next ? `<button class="hbtn sm" data-a="plandel" data-id="${esc(c.id)}">${t('hub.noDateBtn')}</button>` : ''}</div>`).join('') + `<p class="note">${t('hub.planNote')}</p>` : `<p class="note">${t('hub.planEmpty')}</p><button class="hbtn pri" data-a="campnew">${t('hub.newCamp')} ${ico('arrow')}</button>`}</section>`;
}
/** Weltkarte: Platzhalter im Inhalt, die Karte selbst setzt syncMapLayer() darüber. */
function vMap() {
  const on = typeof navigator === 'undefined' || navigator.onLine !== false;
  return `<div class="hub-h">${ico('map', 'big')}<h2>${t('hub.nav.map')}</h2><a class="hub-more" href="${MAP_URL}" target="_blank" rel="noopener noreferrer">${t('map.newTab')} ${ico('ext')}</a></div>
  <p class="note hub-mapnote">${t('map.source')}</p>${on ? '<div id="hub-map-slot" class="hub-mapslot" aria-hidden="true"></div>' : `<section class="hub-panel"><p class="note">${t('map.offline')}</p></section>`}`;
}
/** Legt die Karte über ihren Platzhalter. Ohne Platzhalter (anderer Bereich) bleibt sie versteckt geladen. */
export function syncMapLayer() {
  const slot = document.getElementById('hub-map-slot');
  let layer = document.getElementById('map-layer');
  if (!slot) { if (layer) layer.hidden = true; return; }
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'map-layer';
    layer.innerHTML = `<iframe src="${MAP_URL}" title="${t('hub.nav.map')}" referrerpolicy="no-referrer" allow="fullscreen" loading="eager"></iframe>`;
    document.body.appendChild(layer);
  }
  const r = slot.getBoundingClientRect();
  layer.hidden = false;
  Object.assign(layer.style, { left: r.left + window.scrollX + 'px', top: r.top + window.scrollY + 'px', width: r.width + 'px', height: r.height + 'px' });
}
function vSettings() {
  const langBtn = l => `<button class="chip${lang === l ? ' on' : ''}" data-a="lang" data-l="${l}" aria-pressed="${lang === l}">${l === 'de' ? 'Deutsch' : 'English'}</button>`;
  return `<div class="hub-h">${ico('gear', 'big')}<h2>${t('hub.nav.settings')}</h2></div><section class="hub-panel"><p class="lbl">${t('head.language')}</p><div class="chips">${langBtn('de')}${langBtn('en')}</div><p class="lbl">${t('head.units')}</p><div class="chips">${['m', 'ft'].map(u => `<button class="chip${units === u ? ' on' : ''}" data-a="units" data-u="${u}" aria-pressed="${units === u}">${t('units.' + u)}</button>`).join('')}</div><p class="lbl">${t('hub.look')}</p><div class="add">${skinControls(t)}</div><label class="ck"><input type="checkbox" id="dm-only"${dmOnly() ? ' checked' : ''}> ${t('dmm.toggle')}</label><p class="note">${t('dmm.offHint')}</p></section>
  <div class="hub-h">${ico('upload', 'big')}<h2>${t('setup.backup')}</h2></div><section class="hub-panel">${vBackup()}</section>`;
}

export function vHub() {
  const s = U.HUB === 'settings' || HUB_SECTIONS.includes(U.HUB) ? U.HUB : 'home';
  let main = '';
  if (s === 'home') main = `<div class="hub-grid"><div class="hub-col">${vHero()}${vCamps(3)}${vGroup()}</div><div class="hub-col side">${vNext()}${vQuick()}<blockquote class="hub-quote"><i class="hub-div d2" aria-hidden="true"></i><p>${t('hub.quote')}</p><i class="hub-div d4" aria-hidden="true"></i></blockquote></div></div>`;
  if (s === 'camps') main = vCamps(0);
  if (s === 'chars') main = vChars(0);
  if (s === 'wiki') main = vWiki();
  if (s === 'plan') main = vPlan();
  if (s === 'map') main = vMap();
  if (s === 'settings') main = vSettings();
  return `<div class="hub" data-sec="${s}">${vSide()}<div class="hub-main">${vTop()}<main class="hub-body">${main}</main><input type="file" id="impf" accept=".json,application/json,text/plain,application/pdf,image/*" multiple hidden></div></div>`;
}
