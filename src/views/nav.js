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
import { statsRow, concBanner, vFx, vAbil, vSkills, vFeats, vProfs, vSpells, vMain, vHP, acHtml } from './sheet.js';
import { ABK } from '../constants.js';
import { mod, sg } from '../util.js';
import { effects } from '../effects.js';
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

/** Raum der Kampagne: Spielleitung öffnet und teilt den Code, Spieler verbinden sich. */
function vRoom(c) {
  const here = L.code && c.room === L.code, role = L.role;
  if (dmOnly()) {
    if (here && role === 'dm') return `<div class="dm-bar"><div class="live-code"><small>${t('live.code')}</small><b>${esc(L.code)}</b></div>${liveState()}<span class="lbl">${t('camp.players', { n: players().length })}</span><button class="btn sm" data-a="campcopy" data-c="${esc(L.code)}">${t('camp.copy')}</button><button class="btn sm bad" data-a="liveoff">${t('live.close')}</button></div><p class="note">${t('camp.shareHint')}</p>`;
    return `<div class="add" style="margin-top:0"><button class="btn solid" data-a="camproom" data-id="${esc(c.id)}">${c.room ? t('camp.roomOpen', { c: esc(c.room) }) : t('camp.roomNew')}</button></div><p class="note">${t('camp.roomHintDm')}</p>`;
  }
  if (here && role === 'player') return `<div class="dm-bar"><div class="live-code"><small>${t('live.code')}</small><b>${esc(L.code)}</b></div>${liveState()}<span class="lbl">${dmOnline() ? t('live.dmOn') : t('live.dmOff')}</span><button class="btn sm bad" data-a="liveoff">${t('live.leave')}</button></div>`;
  return c.room ? `<div class="add" style="margin-top:0"><button class="btn solid" data-a="camproom" data-id="${esc(c.id)}">${t('camp.connect', { c: esc(c.room) })}</button></div>` : `<p class="note" style="margin-top:0">${t('camp.noRoomP')}</p>`;
}
function vCover() {
  const c = curCamp(), dm = dmOnly();
  if (!c) return vNoCamp();
  const prog = c.planned ? t('camp.sessOf', { a: c.done, b: c.planned }) : t('camp.sess', { n: c.done });
  const place = dm ? hereNote()?.title || '' : dmHere();
  const last = dm ? lastSession() : null;
  const group = dm ? players() : [{ name: S.name, hp: S.hp, hpMax: hpMaxNow(), klass: S.klass, level: S.level, me: true }, ...partyPeers()];
  const info = `${c.desc ? `<p style="margin-top:0">${esc(c.desc)}</p>` : ''}<p class="lbl">${esc(prog)}${c.next ? ' · ' + t('camp.nextAt', { d: esc(c.next.replace('T', ' ')) }) : ''}</p><div class="add"><button class="btn sm" data-a="campedit" data-id="${esc(c.id)}">${t('camp.edit')}</button>${c.status === 'active' ? `<button class="btn sm" data-a="campdone" data-id="${esc(c.id)}">${t('camp.done')}</button>` : ''}</div>`;
  const state = `<p class="lbl" style="margin-top:0">${t('nav.here')}</p><p class="cover-v">${place ? esc(place) : `<span class="note">${t(dm ? 'nav.hereNoneDm' : 'nav.hereNone')}</span>`}</p>${dm ? `<p class="lbl">${t('dm.lastSession')}</p><p class="cover-v">${last ? esc(last.title) : `<span class="note">${t('dm.noSession')}</span>`}</p>` : c.log ? `<p class="lbl">${t('nav.chron')}</p><p class="ptext">${esc(c.log.slice(-300))}</p>` : ''}`;
  const grp = group.length ? group.map(p => `<div class="row"><div class="nm">${esc(p.name || '?')}${p.me ? ` <span class="lbl">${t('nav.me')}</span>` : ''}<small>${esc([p.klass, p.level ? t('feat.level', { n: p.level }) : ''].filter(Boolean).join(' · '))}</small></div><span class="dm-hpv"><b>${p.hp}</b>/${p.hpMax}</span></div>`).join('') : `<p class="note" style="margin-top:0">${t('nav.groupEmpty')}</p>`;
  const quick = `<div class="add" style="margin-top:0">${(dm ? CAMP_DM : CAMP_P).slice(1).map(k => go(k, tabLabel(k))).join('')}</div>`;
  return `<div class="camp-grid"><div>${card(t('nav.cover'), info)}${card(t('nav.room'), vRoom(c))}</div><div>${card(t('nav.now'), state)}${card(t('nav.party'), grp)}</div></div>${card(t('nav.quick'), quick)}`;
}
/** Spielleitung ohne geöffnete Kampagne (früherer Spielleitungsmodus): Kampagne wählen oder anlegen. */
function vNoCamp() {
  const mine = campaigns().filter(c => c.role === 'dm' && c.status === 'active');
  return card(t('nav.noCamp'), `<p class="note" style="margin-top:0">${t('nav.noCampHint')}</p>${mine.map(c => `<div class="row"><div class="nm">${esc(c.name)}<small>${c.room ? esc(c.room) : t('camp.noRoom')}</small></div><button class="btn sm solid" data-a="campopen" data-id="${esc(c.id)}">${t('hub.open')}</button></div>`).join('')}<div class="add"><button class="btn" data-a="hubgo" data-s="gm">${t('hub.nav.gm')}</button></div>`);
}
/** Gruppe (Spieler): eigener Charakter und die verbundenen Mitspieler. Die Spielleitung nutzt dafür den Live-Tisch. */
function vPartyP() {
  const me = `<div class="row camp-mine"><span class="por sm">${S.img ? `<img src="${S.img}" alt="">` : `<span>${esc((S.name || '?').trim()[0] || '?')}</span>`}</span><div class="nm">${esc(S.name)}<small>${esc([S.subrace || S.race, S.klass, S.sub, S.level ? t('feat.level', { n: S.level }) : ''].filter(Boolean).join(' · '))} · ${t('dm.acShort')} ${S.ac} · ${t('head.hpShort')} ${S.hp}/${hpMaxNow()}</small></div><button class="btn sm solid" data-a="crumb" data-t="prof">${t('nav.openChar')}</button></div>`;
  const peers = partyPeers();
  const rest = L.role === 'player' && L.code ? (peers.length ? peers.map(p => partyRow(p)).join('') : `<p class="note">${t('party.none')}</p>`) : `<p class="note">${t('nav.partyOffline')}</p>`;
  return card(t('nav.myChar'), me) + card(t('nav.members'), rest);
}
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

/* ---- Charakterebene ---- */
/** Charakterübersicht: nur das Wichtigste. Alles Weitere liegt auf den eigenen Unterseiten. */
function vProfile() {
  const line = [S.subrace || S.race, S.klass, S.sub].filter(Boolean).join(' · ');
  const camps = campaignsOf(S.id), act = Object.keys(S.cond).filter(c => S.cond[c]), max = hpMaxNow(), pct = max ? Math.min(100, S.hp / max * 100) : 0;
  // Porträt, Name, Volk, Klasse und Stufe stehen im Kopf darüber; hier nur die kurze Beschreibung.
  const head = `<h3 class="ov-name">${esc(S.name)}</h3><p class="ov-line">${esc(line || t('head.pickRace'))}${S.level ? ' · ' + t('feat.level', { n: S.level }) : ''}</p>${S.info ? `<p class="ptext">${esc(S.info.slice(0, 240))}</p>` : ''}`;
  const vitals = `<div class="ov-vitals"><div class="ov-hp${S.hp === 0 ? ' down' : ''}"><small>${t('hp.title')}</small><b>${S.hp}<i>/${max}</i></b>${S.tmp ? `<em>+${S.tmp} ${t('hp.temp')}</em>` : ''}<span class="bar"><u style="width:${pct}%"></u></span></div><div class="ov-ac"><small>${t('stat.ac')}</small><b>${acHtml()}</b></div></div>`;
  const abil = `<div class="ov-abil">${ABK.map(k => `<div><small>${t('abs.' + k)}</small><b>${sg(mod(S.abil[k]))}</b><span>${S.abil[k]}</span></div>`).join('')}</div>`;
  const more = [S.conc ? `<span class="chip on">${t('conc.title')}: ${esc(S.conc)}</span>` : '', ...act.map(c => `<span class="chip on">${esc(c)}</span>`), S.exh ? `<span class="chip">${t('exh.title', { n: S.exh })}</span>` : '', S.insp ? `<span class="chip buff">${t('insp.short')}</span>` : ''].join('');
  const tail = `${more ? `<div class="chips ov-state">${more}</div>` : ''}<p class="lbl">${t('hub.nav.camps')}</p><p style="margin-top:2px">${camps.length ? camps.map(x => esc(x.name)).join(', ') : `<span class="note">${t('nav.noCamps')}</span>`}</p>`;
  return `<div class="card ov">${head}${vitals}${abil}${tail}</div>${statsRow(true)}`;
}
function vStats() {
  return `${statsRow()}${vFx(effects())}<div class="sheet"><aside>${vAbil(false)}</aside><div class="col c1"><div class="c2sk">${vSkills()}</div></div><div class="col c2">${vFeats()}${vProfs()}</div></div>`;
}
const vSpellTab = () => `${concBanner()}<div class="sheet solo">${vSpells()}</div>`;

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
export const CHAR_PAGES = { prof: vProfile, stats: vStats, spells: vSpellTab };
export { vHP };
