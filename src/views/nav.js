// Drei Ebenen: global (Startseite, views/hub.js), Kampagne und Charakter. Diese Datei legt fest, welche Reiter auf
// welcher Ebene stehen, zeichnet die Brotkrumen (wo bin ich, wie komme ich zurück) und die Seiten der Kampagnenebene.
// Die Reiterkennungen der bisherigen Seiten bleiben (main, inv, notes, setup, wiki, dm…), damit gespeicherte Bögen,
// Tests und Sprünge weiter stimmen. Neu: cover, party, explore, trade, chron (Kampagne) und prof, stats, spells (Charakter).
import { esc } from '../util.js';
import { S, U } from '../state.js';
import { D, hereNote, lastSession } from '../dm.js';
import { L, players, dmOnline, dmHere, dmTurn, myTurn } from '../live.js';
import { campaignById, campaigns, campaignsOf } from '../campaigns.js';
import { COINK } from '../constants.js';
import { dmOnly } from './dm-mode.js';
import { liveState, vHere } from './dm.js';
import { partyRow, partyPeers, vStashPlayer } from './live-ui.js';
import { vMain, vHP } from './sheet.js';
import { vProfile, vStats, vSpellBook } from './char.js';
import { vCover, vPartyP } from './campaign.js';
import { hpMaxNow } from '../effects.js';
import { t } from '../i18n/index.js';

/** Kampagnenebene: Spieler und Spielleitung sehen dieselben Bereiche, die Spielleitung mit ihren Werkzeugen. */
export const CAMP_P = ['cover', 'party', 'main', 'explore', 'trade', 'chron'];
export const CAMP_DM = ['cover', 'dmlive', 'dmcombat', 'explore', 'dmloot', 'dmnotes'];
/** Erreichbar, aber nicht in der Leiste: Begegnungen und Spickzettel über den Kampf, Wiki und Einrichten über den Kopf. */
const DM_MORE = ['dmenc', 'dmcheat', 'wiki', 'setup'];
export const CHAR_T = ['prof', 'stats', 'inv', 'spells', 'notes', 'setup'];
/** Seiten, die Bausteine des Bogens zeigen und deshalb im Charakterstil erscheinen. */
export const CHAR_STYLE = ['main', 'prof', 'stats', 'spells'];

export const curCamp = () => (U.CAMP && campaignById(U.CAMP)) || null;
/** Charakterebene: eigene Reiter des Charakters. Ohne Kampagne gehört auch der Kampfmodus dazu (eigener Reiter am Ende). */
export const charLevel = () => !dmOnly() && (CHAR_T.includes(S.tab) || (!curCamp() && ['main', 'wiki'].includes(S.tab)));
export function navTabs() {
  if (dmOnly()) return CAMP_DM;
  if (!curCamp()) return [...CHAR_T, 'main'];
  return CHAR_T.includes(S.tab) ? CHAR_T : CAMP_P;
}
export function validTabs() {
  if (dmOnly()) return [...CAMP_DM, ...DM_MORE];
  return [...(curCamp() ? CAMP_P : ['main']), ...CHAR_T, 'wiki'];
}
export const fallbackTab = () => (curCamp() ? 'cover' : dmOnly() ? 'dmnotes' : 'prof');

const LBL = { cover: 'nav.cover', party: 'nav.party', explore: 'nav.explore', trade: 'nav.trade', chron: 'nav.chron', prof: 'nav.charHome', setup: 'nav.edit', stats: 'nav.stats', spells: 'nav.spells', dmlive: 'nav.party', dmcombat: 'nav.fight', dmloot: 'nav.trade', dmnotes: 'nav.chron' };
export const tabLabel = k => t(k === 'main' ? 'nav.fight' : LBL[k] || 'tab.' + k);
export const NAV_IC = { cover: 'shield', party: 'mask', explore: 'eye', trade: 'coin', chron: 'book', prof: 'star', stats: 'gem', spells: 'wand', dmlive: 'mask', dmcombat: 'sword', dmloot: 'coin', dmnotes: 'book' };

/** Brotkrumen: Ebene, Weg und Rückweg. Eigene Aktion „crumb“, damit Reiterknöpfe eindeutig bleiben. */
export function vCrumbs() {
  const c = curCamp(), dm = dmOnly(), ch = charLevel();
  const parts = [`<button data-a="crumbhome">RealmCraft</button>`];
  if (c) parts.push(`<button data-a="crumb" data-t="cover">${esc(c.name)}</button>`);
  else if (dm) parts.push(`<span>${t('dmm.title')}</span>`);
  else parts.push(`<button data-a="hubgo" data-s="chars">${t('hub.nav.chars')}</button>`);
  if (ch && c) parts.push(`<button data-a="crumb" data-t="party">${t('nav.party')}</button>`);
  if (ch) parts.push(`<span>${esc(S.name)}</span>`);
  parts.push(`<b aria-current="page">${tabLabel(S.tab)}</b>`);
  const lvl = ch ? 'char' : 'camp', role = c ? `<span class="crumb-role ${c.role}">${t('camp.role.' + c.role)}</span>` : '';
  return `<nav class="crumbs" aria-label="${t('nav.where')}"><span class="crumb-lvl ${lvl}">${t('nav.lvl.' + lvl)}</span>${parts.join('<i aria-hidden="true">›</i>')}${role}</nav>`;
}

const roomLine = c => {
  if (L.code && (!c || !c.room || c.room === L.code)) return `${t('live.code')} <b>${esc(L.code)}</b> ${liveState()}`;
  return c && c.room ? t('camp.roomIdle', { c: esc(c.room) }) : t('camp.noRoom');
};
/** Kopf der Kampagnenebene für Spieler (die Spielleitung behält ihren Kopf aus dm-mode.js). */
export function vCampHead() {
  const c = curCamp();
  const me = `<button class="camp-me" data-a="crumb" data-t="prof" title="${t('nav.openChar')}"><span class="por sm">${S.img ? `<img src="${S.img}" alt="">` : `<span>${esc((S.name || '?').trim()[0] || '?')}</span>`}</span><span><b>${esc(S.name)}</b><small>${t('head.hpShort')} ${S.hp}/${hpMaxNow()}</small></span></button>`;
  return `<header class="hd camphd"><i class="hd-art hub-camp-art a${c?.art ?? 1}" aria-hidden="true"></i><div class="who"><h1>${esc(c ? c.name : '')}</h1><p>${roomLine(c)}</p>${c?.desc ? `<p class="sub2">${esc(c.desc)}</p>` : ''}</div>
  <div class="hacts"><div class="hrow">${me}<button class="btn ghost home" data-a="hubhome" title="${t('hub.backTitle')}">${t('hub.back')}</button><button class="btn ghost" data-a="tab" data-t="wiki">${t('nav.rules')}</button></div><div class="rests"><button class="btn ghost" data-a="rest" data-r="short">${t('rest.short')}</button><button class="btn ghost" data-a="rest" data-r="long">${t('rest.long')}</button></div></div></header>`;
}

/* ---- Kampagnenebene ---- */
const card = (title, body, cls = '') => `<h2>${title}</h2><div class="card${cls ? ' ' + cls : ''}">${body}</div>`;
const go = (k, l) => `<button class="btn sm" data-a="crumb" data-t="${k}">${l}</button>`;

/** Erkundung: aktueller Ort, bekannte Orte und Handlung (Spielleitung), Karte auf Wunsch. */
function vExplore() {
  const map = `<div class="add" style="margin-top:0"><button class="btn${U.MAPOPEN ? ' solid' : ''}" data-a="mapshow" aria-pressed="${!!U.MAPOPEN}">${t(U.MAPOPEN ? 'nav.mapHide' : 'nav.mapShow')}</button><a class="btn" href="https://www.aidedd.org/atlas/faerun" target="_blank" rel="noopener noreferrer">${t('map.newTab')}</a></div>${U.MAPOPEN ? `<p class="note">${t('map.source')}</p><div id="hub-map-slot" class="hub-mapslot camp-map" aria-hidden="true"></div>` : ''}`;
  if (!dmOnly()) {
    const here = dmHere();
    return card(t('nav.here'), `<p class="cover-v" style="margin-top:0">${here ? esc(here) : `<span class="note">${t('nav.hereNone')}</span>`}</p><p class="note">${t('nav.explorePlayer')}</p>`) + card(t('hub.nav.map'), map);
  }
  const list = kind => D.notes.filter(n => n.kind === kind).map(n => `<button class="chip${D.here === n.id ? ' on' : ''}" data-a="dmopen" data-id="${esc(n.id)}">${esc(n.title || t('dm.untitled'))}</button>`).join('');
  return `${vHere().replaceAll('data-a="dmsel"', 'data-a="dmopen"')}${card(t('nav.places'), `<div class="chips">${list('place') || `<span class="note">${t('dm.hereNoPlaces')}</span>`}</div><div class="add"><button class="btn sm solid" data-a="dmnewhere">${t('dm.newPlace')}</button></div>`)}${card(t('nav.plot'), `<div class="chips">${list('plot') || `<span class="note">${t('nav.plotNone')}</span>`}</div><p class="note">${t('nav.plotHint')}</p>`)}${card(t('hub.nav.map'), map)}`;
}
/** Inventar & Handel (Spieler): Münzen, Gruppenkasse, Einkauf. Das persönliche Inventar bleibt beim Charakter. */
function vTrade() {
  const coins = COINK.map(k => `<span class="chip">${t('coin.' + k)} <b>${S.gold[k] || 0}</b></span>`).join('');
  const stash = vStashPlayer();
  return card(t('inv.money'), `<div class="chips">${coins}</div><div class="add"><button class="btn sm solid" data-a="crumb" data-t="inv">${t('nav.toInv')}</button></div><p class="note">${t('nav.invHint')}</p>`)
    + card(t('stash.title'), stash || `<p class="note" style="margin-top:0">${t('nav.stashOffline')}</p>`)
    + card(t('nav.shop'), `<p class="note" style="margin-top:0">${t('nav.shopHint')}</p><div class="add"><button class="btn sm" data-a="shopopen">${t('nav.shopOpen')}</button></div>`);
}
/** Chronik (Spieler): eigene Aufzeichnungen zur Kampagne. Charakternotizen liegen beim Charakter. */
function vChron() {
  const c = curCamp();
  return card(t('nav.chron'), `<p class="note" style="margin-top:0">${t('nav.chronHint')}</p><textarea id="camp-log" rows="14" aria-label="${t('nav.chron')}" placeholder="${t('nav.chronPh')}">${esc(c?.log || '')}</textarea><div class="add"><button class="btn sm" data-a="crumb" data-t="notes">${t('nav.toNotes')}</button></div>`);
}
/** Unterleiste im Kampf der Spielleitung: Verlauf, Vorbereitung, Spickzettel. */
export function vDmSub() {
  const b = (k, l) => `<button class="chip${S.tab === k ? ' on' : ''}" data-a="crumb" data-t="${k}" aria-pressed="${S.tab === k}">${l}</button>`;
  return `<div class="chips subnav">${b('dmcombat', t('nav.fightNow'))}${b('dmenc', t('tab.dmenc'))}${b('dmcheat', t('tab.dmcheat'))}</div>`;
}

/* ---- Charakterebene: Seiten in views/char.js ---- */
/** Kampfmodus der Spieler: Zustand (Vorbereitung oder laufender Kampf), Reihenfolge aus der Presence der Spielleitung,
 * darunter alles, was der eigene Charakter im Kampf braucht. Gilt mit und ohne Kampagne. */
const HP_WORD = { ok: 'fight.sOk', hurt: 'fight.sHurt', bad: 'fight.sBad', down: 'fight.sDown' };
export function vFight() {
  const tr = dmTurn(), local = !tr && S.turn?.on, peers = L.role === 'player' ? players() : [];
  let head;
  if (tr) {
    const order = (tr.order || []).map(o => {
      const p = o.k && peers.find(x => x.key === o.k), me = o.k && o.k === S.id;
      const hp = p ? `<span class="dm-hpv"><b>${p.hp}</b>/${p.hpMax}</span>` : o.s ? `<span class="fo-s ${o.s}">${t(HP_WORD[o.s])}</span>` : '';
      return `<li class="${o.cur ? 'cur' : ''}${o.pc ? ' pc' : ' foe'}${me ? ' me' : ''}"><span>${esc(o.n)}${me ? ` <small>(${t('nav.me')})</small>` : ''}</span>${(p?.cond || []).map(c => `<span class="chip on">${esc(c)}</span>`).join('')}${p?.conc ? `<span class="dm-conc">${t('live.concShort', { n: esc(p.conc) })}</span>` : ''}${hp}</li>`;
    }).join('');
    head = `<div class="fight-state on"><div class="fs-top"><span class="fs-badge">${t('fight.active')}</span><b>${t('turn.round', { n: tr.r })}</b><span>${myTurn() ? `<b class="fs-mine">${t('turn.mineTitle')}</b>` : t('turn.now', { n: esc(tr.name || '?') })}${tr.next ? ' · ' + t('turn.next', { n: esc(tr.next) }) : ''}</span></div>${order ? `<ol class="fight-order">${order}</ol>` : ''}</div>`;
  } else if (local) {
    head = `<div class="fight-state on"><div class="fs-top"><span class="fs-badge">${t('fight.active')}</span><span>${t('fight.local')}</span></div></div>`;
  } else {
    const room = L.role === 'player' && L.code;
    head = `<div class="fight-state"><div class="fs-top"><span class="fs-badge">${t('fight.prep')}</span><span>${t(room ? 'fight.prepRoom' : 'fight.prepSolo')}</span>${room ? '' : `<button class="btn sm solid" data-a="tstart">${t('fight.startSolo')}</button>`}</div></div>`;
  }
  return head + vMain({ mode: 'combat' });
}
export const CAMP_PAGES = { cover: vCover, party: vPartyP, explore: vExplore, trade: vTrade, chron: vChron };
export const CHAR_PAGES = { prof: vProfile, stats: vStats, spells: vSpellBook };
export { vHP };
