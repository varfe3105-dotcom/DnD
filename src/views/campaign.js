// Kampagnenebene: Übersicht als Lagebericht und Gruppe. Datenquellen ohne Kopien:
// Kapitel, Planung, Termin und zuletzt bekannter Ort stehen dauerhaft an der Kampagne (charbogen-campaigns);
// die Spielleitung pflegt sie, Spieler erhalten sie über die Presence und übernehmen sie in ihren Kampagneneintrag.
// Ort, letzte Sitzungen und offene Aufgaben der Spielleitung kommen aus ihrem Notizbuch (D.notes), bei Spielern aus ihrer Chronik (log).
import { esc } from '../util.js';
import { S, U } from '../state.js';
import { D, hereNote } from '../dm.js';
import { L, players, dmOnline, dmHere } from '../live.js';
import { campaigns } from '../campaigns.js';
import { dmOnly } from './dm-mode.js';
import { liveState } from './dm.js';
import { partyPeers } from './live-ui.js';
import { memberCard, memberChip, selfMember } from './party.js';
import { fmtDate } from './hub.js';
import { t } from '../i18n/index.js';

const sec = (cls, title, body) => `<section class="lb-sec ${cls}"><h3 class="ov-h">${title}</h3>${body}</section>`;
const excerpt = (s, n = 160) => { const x = String(s || '').replace(/\[\[([^\]\n]+)\]\]/g, '$1').replace(/\s+/g, ' ').trim(); return esc(x.slice(0, n)) + (x.length > n ? ' …' : ''); };
/** Offene Aufgaben in der eigenen Chronik: Zeilen, die mit „[ ]“ oder „- [ ]“ beginnen. */
export const logTasks = log => String(log || '').split('\n').map(l => l.trim()).filter(l => /^(-\s*)?\[ \]/.test(l)).map(l => l.replace(/^(-\s*)?\[ \]\s*/, ''));
const logRecent = log => String(log || '').split('\n').map(l => l.trim()).filter(l => l && !/^(-\s*)?\[[ x]\]/i.test(l)).slice(-3).reverse();

/** Raum: Spielleitung öffnet und teilt den Code, Spieler verbinden sich. */
export function vRoom(c) {
  const here = L.code && c.room === L.code, role = L.role;
  if (dmOnly()) {
    if (here && role === 'dm') return `<div class="lb-room"><div class="live-code"><small>${t('live.code')}</small><b>${esc(L.code)}</b></div>${liveState()}<span class="lbl">${t('camp.players', { n: players().length })}</span><button class="btn sm" data-a="campcopy" data-c="${esc(L.code)}">${t('camp.copy')}</button><button class="btn sm bad" data-a="liveoff">${t('live.close')}</button></div><p class="note">${t('camp.shareHint')}</p>`;
    return `<div class="add" style="margin-top:0"><button class="btn solid" data-a="camproom" data-id="${esc(c.id)}">${c.room ? t('camp.roomOpen', { c: esc(c.room) }) : t('camp.roomNew')}</button></div><p class="note">${t('camp.roomHintDm')}</p>`;
  }
  if (here && role === 'player') return `<div class="lb-room"><div class="live-code"><small>${t('live.code')}</small><b>${esc(L.code)}</b></div>${liveState()}<span class="lbl">${dmOnline() ? t('live.dmOn') : t('live.dmOff')}</span><button class="btn sm bad" data-a="liveoff">${t('live.leave')}</button></div>`;
  return c.room ? `<div class="add" style="margin-top:0"><button class="btn solid" data-a="camproom" data-id="${esc(c.id)}">${t('camp.connect', { c: esc(c.room) })}</button></div>` : `<p class="note" style="margin-top:0">${t('camp.noRoomP')}</p>`;
}

/** Werkzeugleiste der Spielleitung auf der Übersicht. Wird für Spieler gar nicht erzeugt. */
function vDmTools(c) {
  const places = D.notes.filter(n => n.kind === 'place'), h = hereNote();
  const next = c.next && c.next.length === 10 ? c.next + 'T19:00' : c.next;
  return `<section class="lb-tools" aria-label="${t('lb.tools')}"><p class="lb-tools-h">${t('camp.role.dm')}</p><div class="form">
  <label><span class="lbl">${t('lb.chapter')}</span><input type="text" id="cv-chapter" maxlength="120" value="${esc(c.chapter)}" placeholder="${t('lb.chapterPh')}"></label>
  <label><span class="lbl">${t('nav.here')}</span><select id="cv-here"><option value="">${t('dm.herePick')}</option>${places.map(p => `<option value="${esc(p.id)}"${h && h.id === p.id ? ' selected' : ''}>${esc(p.title || t('dm.untitled'))}</option>`).join('')}</select></label>
  <label><span class="lbl">${t('camp.next')}</span><input type="datetime-local" id="cv-next" value="${esc(next)}"></label></div>
  <label class="lb-plan"><span class="lbl">${t('lb.plan')}</span><textarea id="cv-plan" rows="2" maxlength="1000" placeholder="${t('lb.planPh')}">${esc(c.plan)}</textarea></label>
  <div class="add"><button class="btn sm" data-a="dmnewhere">${t('dm.newPlace')}</button><button class="btn sm" data-a="dmnews">${t('dm.newSession')}</button>${c.status === 'active' ? `<button class="btn sm" data-a="campdone" data-id="${esc(c.id)}">${t('camp.done')}</button>` : ''}<button class="btn sm" data-a="campedit" data-id="${esc(c.id)}">${t('camp.edit')}</button></div>
  <p class="note">${t('lb.toolsHint')}</p></section>`;
}

export function vCover() {
  const c = U.CAMP && campaigns().find(x => x.id === U.CAMP);
  if (!c) return vNoCamp();
  const dm = dmOnly(), h = dm ? hereNote() : null;
  const place = dm ? h?.title || '' : dmHere() || c.place;
  const placeTxt = dm && h?.body ? `<p class="lb-ptext">${excerpt(h.body, 260)}</p>` : '';
  const chapter = c.chapter ? `<p class="lb-chapter">${esc(c.chapter)}</p>` : '';
  const prog = c.planned ? t('camp.sessOf', { a: c.done, b: c.planned }) : t('camp.sess', { n: c.done });
  const head = `<header class="lb-head"><div class="tags"><span class="tag ${c.status === 'active' ? 't-good' : ''}">${t('camp.st.' + c.status)}</span><span class="tag t-res">${t('camp.role.' + c.role)}</span><span class="tag">${esc(prog)}</span></div>${c.split ? '' : `<p class="note lb-legacy">${t('inst.legacy')}</p>`}<p class="lbl">${t('lb.chapter')}</p>${chapter || `<p class="lb-chapter none">${t(dm ? 'lb.noChapterDm' : 'lb.noChapter')}</p>`}</header>`;
  // Lage: Ort, offene Aufgaben, zuletzt
  const tasks = dm ? D.notes.filter(n => n.kind === 'plot').slice(0, 6).map(n => `<li><button class="linkbtn" data-a="dmopen" data-id="${esc(n.id)}">${esc(n.title || t('dm.untitled'))}</button></li>`) : logTasks(c.log).slice(0, 6).map(x => `<li>${esc(x)}</li>`);
  const recent = dm ? D.notes.filter(n => n.kind === 'session').slice(0, 3).map(n => `<li><b>${esc(n.title || t('dm.untitled'))}</b>${n.body ? `<span>${excerpt(n.body)}</span>` : ''}</li>`) : logRecent(c.log).map(x => `<li><span>${esc(x.slice(0, 200))}</span></li>`);
  const lage = sec('lb-place', t('lb.situation'), `<p class="lbl">${t('nav.here')}</p><p class="cover-v">${place ? esc(place) : `<span class="note">${t(dm ? 'nav.hereNoneDm' : 'nav.hereNone')}</span>`}</p>${placeTxt}`)
    + sec('lb-tasks', t('lb.tasks'), tasks.length ? `<ul class="lb-list">${tasks.join('')}</ul>` : `<p class="note">${t(dm ? 'lb.noTasksDm' : 'lb.noTasks')}</p>`)
    + sec('lb-recent', t('lb.recent'), recent.length ? `<ul class="lb-list rec">${recent.join('')}</ul>` : `<p class="note">${t(dm ? 'lb.noRecentDm' : 'lb.noRecent')}</p>`);
  // Seite: nächste Sitzung, Gruppe, Raum
  const next = sec('lb-next', t('lb.next'), `${c.next ? `<p class="lb-date">${esc(fmtDate(c.next))}</p>` : `<p class="note">${t('hub.noDate')}</p>`}${c.plan ? `<p class="lb-ptext">${esc(c.plan)}</p>` : ''}`);
  const members = dm ? players().map(p => ({ ...p, dm: true })) : [selfMember(), ...partyPeers()];
  const group = sec('lb-group', t('nav.party'), members.length ? `<div class="mchips">${members.map(memberChip).join('')}</div>` : `<p class="note">${t('nav.groupEmpty')}</p>`);
  const room = sec('lb-roomsec', t('nav.room'), vRoom(c));
  return `${dm ? vDmTools(c) : ''}<div class="lagebericht">${head}<div class="lb-grid"><div class="lb-main">${lage}</div><aside class="lb-side">${next}${group}${room}</aside></div></div>`;
}

/** Spielleitung ohne geöffnete Kampagne (früherer Spielleitungsmodus): Kampagne wählen oder anlegen. */
export function vNoCamp() {
  const mine = campaigns().filter(c => c.role === 'dm' && c.status === 'active');
  return `<h2>${t('nav.noCamp')}</h2><div class="card"><p class="note" style="margin-top:0">${t('nav.noCampHint')}</p>${mine.map(c => `<div class="row"><div class="nm">${esc(c.name)}<small>${c.room ? esc(c.room) : t('camp.noRoom')}</small></div><button class="btn sm solid" data-a="campopen" data-id="${esc(c.id)}">${t('hub.open')}</button></div>`).join('')}<div class="add"><button class="btn" data-a="hubgo" data-s="gm">${t('hub.nav.gm')}</button></div></div>`;
}

/** Gruppe (Spieler): Abenteurergruppe als Porträtkarten, die eigene öffnet den Charakter. */
export function vPartyP() {
  const me = memberCard(selfMember(), `<div class="mc-act camp-mine"><button class="btn sm solid" data-a="crumb" data-t="prof">${t('nav.openChar')}</button></div>`);
  const online = L.role === 'player' && L.code, peers = partyPeers();
  const rest = peers.map(p => memberCard(p)).join('');
  return `<h2>${t('nav.party')}</h2><div class="party-grid">${me}${rest}</div>${online ? (peers.length ? '' : `<p class="note">${t('party.none')}</p>`) : `<p class="note">${t('nav.partyOffline')}</p>`}`;
}
