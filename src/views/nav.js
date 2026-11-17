// Drei Ebenen: global (Startseite, views/hub.js), Kampagne und Charakter. Diese Datei legt fest, welche Reiter auf
// welcher Ebene stehen, zeichnet die Brotkrumen (wo bin ich, wie komme ich zurück) und die Seiten der Kampagnenebene.
// Die Reiterkennungen der bisherigen Seiten bleiben (main, inv, notes, setup, wiki, dm…), damit gespeicherte Bögen,
// Tests und Sprünge weiter stimmen. Neu: cover, party, explore, trade, chron (Kampagne) und prof, stats, spells (Charakter).
import { esc } from '../util.js';
import { S, U } from '../state.js';
import { D, hereNote, lastSession, linksOf } from '../dm.js';
import { L, players, dmOnline, dmHere, dmTurn, myTurn, dmAtlas, dmShop } from '../live.js';
import { BYN } from '../catalog.js';
import { totalCp, cpToGp } from '../shop.js';
import { campaignById, campaigns, campaignsOf } from '../campaigns.js';
import { COINK } from '../constants.js';
import { dmOnly } from './dm-mode.js';
import { liveState, vHere } from './dm.js';
import { partyRow, partyPeers, vStashPlayer } from './live-ui.js';
import { vMain, vHP } from './sheet.js';
import { vProfile, vStats, vSpellBook } from './char.js';
import { vCover, vPartyP } from './campaign.js';
import { timeline, logEntries } from './chron.js';
import { hpMaxNow } from '../effects.js';
import { t } from '../i18n/index.js';
import { soundOn } from '../feed.js';

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
  // Bibliothek (ohne Kampagne): Grundbogen ohne Spielbetrieb, also ohne Kampf
  if (!curCamp()) return CHAR_T;
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

/** Erkundung als Atlas: Karte auf Wunsch darüber, links die Orte (aktueller zuerst), Personen und Handlung, rechts der gewählte Eintrag.
 * Spieler sehen nur, was die Spielleitung freigibt (Titel und eigener Spielertext); die Notiz selbst verlässt nie ihr Gerät. */
const KIND_IC = { place: 'nav.atPlaces', npc: 'nav.atPeople', plot: 'nav.atPlot' };
function vExplore() {
  const map = `<div class="atlas-map"><button class="btn sm${U.MAPOPEN ? ' solid' : ''}" data-a="mapshow" aria-pressed="${!!U.MAPOPEN}">${t(U.MAPOPEN ? 'nav.mapHide' : 'nav.mapShow')}</button><a class="btn sm" href="https://www.aidedd.org/atlas/faerun" target="_blank" rel="noopener noreferrer">${t('map.newTab')}</a>${U.MAPOPEN ? `<p class="note">${t('map.source')}</p><div id="hub-map-slot" class="hub-mapslot camp-map" aria-hidden="true"></div>` : ''}</div>`;
  const group = (k, items, sel, act) => items.length ? `<p class="il-h">${t(KIND_IC[k])}</p><div class="il">${items.map(x => `<button class="ilr${x.id === sel ? ' on' : ''}" data-a="${act}" data-id="${esc(x.id)}"><span class="nm">${esc(x.title || t('dm.untitled'))}${x.here ? ` <span class="tag t-res sm">${t('nav.here')}</span>` : ''}${x.pub === false ? '' : x.pub ? ` <span class="tag t-good sm">${t('nav.atShared')}</span>` : ''}</span></button>`).join('')}</div>` : '';
  if (!dmOnly()) {
    const c = curCamp(), list = (dmAtlas() || c?.atlas || []).map((a, i) => ({ id: 'a' + i, title: a.t, d: a.d, kind: a.k, here: a.h, pub: false }));
    const sel = list.find(x => x.id === U.ATLAS) || list.find(x => x.here) || list[0];
    const left = ['place', 'npc', 'plot'].map(k => group(k, list.filter(x => x.kind === k), sel?.id, 'atsel')).join('') || `<p class="note">${t('nav.atNoneP')}</p>`;
    const right = sel ? `<h3 class="atlas-t">${esc(sel.title)}</h3>${sel.here ? `<span class="tag t-res">${t('nav.here')}</span>` : ''}${sel.d ? `<p class="lb-ptext">${esc(sel.d)}</p>` : `<p class="note">${t('nav.atNoText')}</p>`}` : `<p class="note">${t('nav.explorePlayer')}</p>`;
    const here = dmHere() || c?.place || '';
    return `${map}${here ? `<p class="atlas-here"><span class="lbl">${t('nav.here')}</span> <span class="cover-v">${esc(here)}</span></p>` : ''}<div class="atlas"><aside class="atlas-l">${left}</aside><section class="atlas-r">${right}</section></div>`;
  }
  const notes = D.notes.filter(n => ['place', 'npc', 'plot'].includes(n.kind)).map(n => ({ ...n, here: D.here === n.id, pub: !!n.pub }));
  const sel = notes.find(n => n.id === U.ATLAS) || notes.find(n => n.here) || notes[0];
  const sorted = k => notes.filter(n => n.kind === k).sort((a, b) => b.here - a.here);
  const left = ['place', 'npc', 'plot'].map(k => group(k, sorted(k), sel?.id, 'atsel')).join('') || `<p class="note">${t('dm.hereNoPlaces')}</p>`;
  const adds = `<div class="add">${['place', 'npc', 'plot'].map(k => `<button class="btn sm" data-a="atnew" data-k="${k}">+ ${t('dm.kind.' + k)}</button>`).join('')}</div>`;
  let right = `<p class="note">${t('nav.atPick')}</p>`;
  if (sel) {
    const links = linksOf(sel), mons = sel.monsters || [];
    right = `<input type="text" id="at-title" class="atlas-ti" data-id="${esc(sel.id)}" value="${esc(sel.title)}" placeholder="${t('dm.noteTitle')}" aria-label="${t('dm.noteTitle')}"><div class="tags"><span class="tag">${t('dm.kind.' + sel.kind)}</span>${sel.here ? `<span class="tag t-res">${t('nav.here')}</span>` : ''}</div>
    <div class="add">${sel.kind === 'place' ? `<button class="btn sm${sel.here ? ' solid' : ''}" data-a="athere" data-id="${esc(sel.id)}" aria-pressed="${sel.here}">${sel.here ? t('dm.isHere') : t('dm.setHere')}</button>` : ''}<button class="btn sm" data-a="dmnote" data-id="${esc(sel.id)}">${t('nav.atEdit')}</button>${mons.length ? `<button class="btn sm solid" data-a="dmplstart" data-id="${esc(sel.id)}">${t('dm.startHere', { n: mons.reduce((a, m) => a + m.qty, 0) })}</button>` : ''}</div>
    <p class="lbl">${t('nav.atPrivate')}</p>${sel.body ? `<p class="lb-ptext atlas-priv">${esc(sel.body.replace(/\[\[([^\]\n]+)\]\]/g, '$1'))}</p>` : `<p class="note">${t('nav.atNoBody')}</p>`}${links.length ? `<div class="chips">${links.map(l => `<button class="chip" data-a="dmlink" data-t="${esc(l)}">${esc(l)}</button>`).join('')}</div>` : ''}
    <section class="atlas-pub"><label class="ck"><input type="checkbox" data-a="atpub" data-id="${esc(sel.id)}"${sel.pub ? ' checked' : ''}> ${t('nav.atPub')}</label><textarea id="at-pub" data-id="${esc(sel.id)}" rows="3" maxlength="300" placeholder="${t('nav.atPubPh')}" aria-label="${t('nav.atPubLbl')}">${esc(sel.pubText || '')}</textarea><p class="note">${t('nav.atPubHint')}</p></section>`;
  }
  return `${map}<div class="atlas"><aside class="atlas-l">${left}${adds}</aside><section class="atlas-r">${right}</section></div>`;
}
/** Händler der Spielleitung (nur während die Spielleitung verbunden ist und den Händler geöffnet hat). */
function vShops() {
  const shops = dmShop(), have = totalCp(S.gold);
  if (!shops.length) return card(t('shop.merchants'), `<p class="note" style="margin-top:0">${t(L.role === 'player' && L.code ? 'shop.noneOpen' : 'shop.offline')}</p>`);
  return `<h2>${t('shop.merchants')}</h2><div class="shops">${shops.map(m => `<section class="shop card"><h3 class="ov-h">${esc(m.n)}</h3>${m.it.map(w => `<div class="row"><div class="nm">${esc(w.k && BYN[w.k] ? BYN[w.k].n : w.n)}<small>${t('shop.stockN', { n: w.q })}</small></div><b class="shop-p">${cpToGp(w.cp)} ${t('price.gp')}</b><button class="btn sm solid" data-a="shopbuy" data-m="${esc(m.id)}" data-w="${esc(w.id)}"${w.q <= 0 || w.cp > have ? ' disabled' : ''}>${t(w.q <= 0 ? 'shop.soldOutShort' : 'shop.buy')}</button></div>`).join('') || `<p class="note">${t('shop.noWares')}</p>`}</section>`).join('')}</div>`;
}
/** Inventar & Handel (Spieler): Münzen, Gruppenkasse, Einkauf. Das persönliche Inventar bleibt beim Charakter. */
function vTrade() {
  const coins = COINK.map(k => `<span class="chip">${t('coin.' + k)} <b>${S.gold[k] || 0}</b></span>`).join('');
  const stash = vStashPlayer();
  return card(t('inv.money'), `<div class="chips">${coins}</div><div class="add"><button class="btn sm solid" data-a="crumb" data-t="inv">${t('nav.toInv')}</button></div><p class="note">${t('nav.invHint')}</p>`)
    + card(t('stash.title'), stash || `<p class="note" style="margin-top:0">${t('nav.stashOffline')}</p>`)
    + vShops()
    + card(t('nav.shop'), `<p class="note" style="margin-top:0">${t('nav.shopHint')}</p><div class="add"><button class="btn sm" data-a="shopopen">${t('nav.shopOpen')}</button></div>`);
}
/** Chronik (Spieler): eigene Aufzeichnungen zur Kampagne. Charakternotizen liegen beim Charakter. */
function vChron() {
  const c = curCamp(), entries = logEntries(c?.log), list = U.CHRONREV ? [...entries].reverse() : entries;
  const form = `<div class="card chron-new"><p class="lbl" style="margin-top:0">${t('chron.newEntry')}</p><div class="add"><input type="text" id="chr-t" maxlength="80" placeholder="${t('chron.titlePh')}" aria-label="${t('chron.title')}"></div><textarea id="chr-x" rows="3" placeholder="${t('chron.textPh')}" aria-label="${t('chron.text')}"></textarea><div class="add"><button class="btn solid" data-a="chronadd">${t('chron.add')}</button></div></div>`;
  const raw = U.CHRONRAW ? `<textarea id="camp-log" rows="14" aria-label="${t('nav.chron')}" placeholder="${t('nav.chronPh')}">${esc(c?.log || '')}</textarea>` : '';
  const shared = (c?.shared || []).map(e => ({ title: e.t, body: e.x, meta: t('dm.kind.' + e.k), cls: 'shared', tags: `<span class="tag t-good sm">${t('chron.fromDm')}</span>` }));
  return `<h2>${t('chron.sharedTitle')}</h2>${shared.length ? timeline(shared) : `<p class="note">${t('chron.sharedNone')}</p>`}<h2>${t('chron.mine')}</h2><p class="note">${t('nav.chronHint')} ${t('chron.syntax')}</p>${form}<div class="chips"><button class="chip" data-a="chronrev" aria-pressed="${!!U.CHRONREV}">${t(U.CHRONREV ? 'chron.newest' : 'chron.oldest')}</button><button class="chip${U.CHRONRAW ? ' on' : ''}" data-a="chronraw" aria-pressed="${!!U.CHRONRAW}">${t('chron.raw')}</button><button class="chip" data-a="crumb" data-t="notes">${t('nav.toNotes')}</button></div>${raw}${timeline(list)}`;
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
  const tr = dmTurn(), local = !tr && S.turn?.on, peers = L.role === 'player' ? players() : [], mine = myTurn();
  const feedHtml = (U.FEED || []).length ? `<ul class="feed" aria-live="polite">${U.FEED.map(f => `<li class="${f.kind}">${esc(f.text)}</li>`).join('')}</ul>` : '';
  const sound = `<button class="tg sm${soundOn() ? ' on' : ''}" data-a="soundtg" aria-pressed="${soundOn()}" title="${t('fight.soundHint')}">${t('fight.sound')}</button>`;
  let head;
  if (tr) {
    const order = (tr.order || []).map(o => {
      const p = o.k && peers.find(x => x.key === o.k), me = o.k && o.k === S.id;
      const hp = p ? `<span class="ib-hp">${p.hp}/${p.hpMax}</span>${bar(p.hp, p.hpMax)}` : o.s ? `<span class="fo-s ${o.s}">${t(HP_WORD[o.s])}</span>` : '';
      const tags = [...(p?.cond || []).map(c => `<span class="tag t-bad sm">${esc(c)}</span>`), p?.conc ? `<span class="tag t-conc sm">${esc(p.conc)}</span>` : ''].join('');
      return `<li class="ib${o.cur ? ' cur' : ''}${o.nx ? ' next' : ''}${o.pc ? ' pc' : ' foe'}${me ? ' me' : ''}"><span class="ib-ic ini">${esc((o.n || '?')[0])}</span><span class="ib-n">${esc(o.n)}${me ? ` <small>(${t('nav.me')})</small>` : ''}</span>${o.i ? `<span class="ib-i">${esc(o.i)}</span>` : ''}${hp}${tags ? `<span class="ib-tags">${tags}</span>` : ''}${o.nx ? `<small class="ib-next">${t('fight.nextShort')}</small>` : ''}</li>`;
    }).join('');
    head = `<div class="fight-state on${mine ? ' mine' : ''}"><div class="fs-top"><span class="fs-badge">${t('fight.active')}</span><b class="fs-round">${t('turn.round', { n: tr.r })}</b><span>${mine ? `<b class="fs-mine">${t('turn.mineTitle')}</b>` : t('turn.now', { n: esc(tr.name || '?') })}${tr.next ? ' · ' + t('turn.next', { n: esc(tr.next) }) : ''}</span>${sound}</div>${order ? `<ol class="ibar fight-order">${order}</ol>` : ''}</div>`;
  } else if (local) {
    head = `<div class="fight-state on"><div class="fs-top"><span class="fs-badge">${t('fight.active')}</span><span>${t('fight.local')}</span></div></div>`;
  } else {
    const room = L.role === 'player' && L.code;
    head = `<div class="fight-state"><div class="fs-top"><span class="fs-badge">${t('fight.prep')}</span><span>${t(room ? 'fight.prepRoom' : 'fight.prepSolo')}</span>${room ? sound : `<button class="btn sm solid" data-a="tstart">${t('fight.startSolo')}</button>`}</div></div>`;
  }
  return head + feedHtml + vMain({ mode: 'combat' });
}
const bar = (hp, max) => { const p = max ? Math.max(0, Math.min(100, hp / max * 100)) : 0; return `<span class="hpbar${p <= 25 ? ' low' : p <= 50 ? ' mid' : ''}" aria-hidden="true"><u style="width:${p}%"></u></span>`; };
export const CAMP_PAGES = { cover: vCover, party: vPartyP, explore: vExplore, trade: vTrade, chron: vChron };
export const CHAR_PAGES = { prof: vProfile, stats: vStats, spells: vSpellBook };
export { vHP };
