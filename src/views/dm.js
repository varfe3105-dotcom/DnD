import { vLiveSend, vHandoutForm, vLoot, vCloud } from './live-ui.js';
import { memberCard } from './party.js';
import { BYN } from '../catalog.js';
import { SK } from '../constants.js';
import { vCheat, statText } from './dm-rules.js';
import { esc, mod, sg } from '../util.js';
import { U } from '../state.js';
import { catSelect } from './inventory.js';
import { timeline } from './chron.js';
import { cpToGp } from '../shop.js';
import { glyph } from '../icons.js';
import { COND } from '../catalog.js';
import { t, nameLine, dist } from '../i18n/index.js';
import { L, players, pendingFor } from '../live.js';
import { defeatedXp, hereNote, lastSession, inCombat } from '../dm.js';
import { D, DU, allMonsters, findMonster, thresholds, partySize, rate, curEnc, xpOf, ordered, searchMonsters, KINDS, curNote, linksOf, noteByTitle, backlinks, searchNotes, fighting, nowNext } from '../dm.js';

const ABK = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const crText = c => (c === 0.125 ? '1/8' : c === 0.25 ? '1/4' : c === 0.5 ? '1/2' : c);

export function vResults() {
  const hits = searchMonsters(DU.mq);
  if (!DU.mq.trim()) return '';
  if (!hits.length) return `<p class="empty">${t('wiki.nothing')}</p>`;
  return hits.map(m => `<div class="row"><div class="nm">${esc(m.n)}<small>${esc([m.size, m.type].filter(Boolean).join(' '))}${m.size || m.type ? ' · ' : ''}CR ${crText(m.cr)} · ${t('dm.acShort')} ${m.ac} · ${t('head.hpShort')} ${m.hp}</small></div><button class="btn sm solid" data-a="dmadd" data-m="${esc(m.id)}">${t('common.add')}</button></div>`).join('');
}
function statBlock(c) {
  const m = findMonster(c.mon);
  if (!m) return '';
  return `<div class="dm-stat"><dl class="sm">${ABK.map(k => `<div><dt>${t('abs.' + k)}</dt><dd>${m.abil[k]} (${sg(mod(m.abil[k]))})</dd></div>`).join('')}</dl><p class="cls">${esc([m.size, m.type].filter(Boolean).join(' '))}${m.size || m.type ? ' · ' : ''}CR ${crText(m.cr)} · ${esc(m.speed)}${m.hd ? ' · ' + esc(m.hd) : ''}</p><div class="ptext stat">${statText(m.text)}</div><p class="src">${m.custom ? t('src.own') : t('dm.srcMonster')}</p></div>`;
}
const pipsOf = (o, attr) => Array.from({ length: o.max }, (_, j) => `<button class="pip ${j < o.max - o.used ? 'on' : ''}" ${attr} data-j="${j}" aria-label="${t(j < o.max - o.used ? 'pip.use' : 'pip.reset')}"></button>`).join('');
const who = c => { const m = c.kind === 'mon' && findMonster(c.mon); return m && m.type ? `<span class="ib-ic">${glyph('skull', 'mt:' + String(m.type).toLowerCase().split(' ')[0])}</span>` : `<span class="ib-ic ini">${esc((c.name || '?').trim()[0] || '?')}</span>`; };
const hpb = (hp, max) => { const p = max ? Math.max(0, Math.min(100, hp / max * 100)) : 0; return `<span class="hpbar${p <= 25 ? ' low' : p <= 50 ? ' mid' : ''}" aria-hidden="true"><u style="width:${p}%"></u></span>`; };
/** Initiativeleiste: Reihenfolge waagrecht, aktiver Zug golden, der nächste markiert, Fortschritt in der Runde. */
function vInitBar(list, cur, next) {
  const live = list.filter(x => !(x.kind === 'mon' && x.hp <= 0) && x.kind !== 'pet'), i = live.findIndex(x => x.id === cur?.id);
  return `<div class="ibar" role="list" aria-label="${t('fight.order')}">${list.map(x => `<button role="listitem" class="ib${x.id === cur?.id ? ' cur' : ''}${x.id === next?.id ? ' next' : ''}${x.kind === 'mon' ? ' foe' : ' pc'}${x.kind === 'mon' && x.hp <= 0 ? ' down' : ''}${x.kind === 'pet' ? ' pet' : ''}" data-a="dmfocus" data-id="${x.id}" aria-current="${x.id === cur?.id}">${who(x)}<span class="ib-n">${esc(x.name)}</span><span class="ib-i">${x.kind === 'pet' ? '↳' : x.init}</span>${hpb(x.hp, x.hpMax)}${x.id === next?.id ? `<small class="ib-next">${t('fight.nextShort')}</small>` : ''}</button>`).join('')}</div>${live.length ? `<div class="ib-prog" aria-hidden="true">${live.map((x, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('')}</div>` : ''}`;
}
/** Aktionsbereich: Werte des aktiven Gegners bzw. Hinweis beim Spielercharakter (der handelt am eigenen Gerät). */
function vActive(c) {
  if (!c) return '';
  if (c.kind === 'mon') return `<section class="fight-act"><h3 class="ov-h">${t('fight.actFoe', { n: esc(c.name) })}</h3>${statBlock(c) || `<p class="note">${t('fight.noStat')}</p>`}</section>`;
  const p = c.live && players().find(x => x.key === c.live);
  return `<section class="fight-act"><h3 class="ov-h">${t('fight.actPc', { n: esc(c.name) })}</h3><p class="note">${t(p ? 'fight.pcLive' : 'fight.pcLocal')}</p>${p ? vLiveSend(p) : ''}</section>`;
}
function row(c, active) {
  const open = DU.open[c.id], down = c.kind === 'mon' && c.hp <= 0, conds = COND.filter(x => c.cond[x.n]);
  const wait = c.live && L.role === 'dm' && pendingFor(c.live, c.pet || ''), sub = [c.kind === 'pet' ? t('live.petTag', { n: esc(c.owner || '') }) : '', `${t('dm.acShort')} ${c.acB ? `<span class="${c.acB > 0 ? 'buff' : 'debuff'}" title="${esc((c.fx || []).map(x => t('buff.from', { s: x.s, n: x.by })).join('; '))}">${c.ac}</span>` : c.ac}`, ...conds.map(x => `<span class="tag t-bad sm">${esc(x.n)}</span>`), ...(c.fx || []).filter(x => x.s).map(x => `<span class="tag ${x.good ? 't-good' : 't-bad'} sm">${esc(x.s)}</span>`), c.conc ? `<span class="tag t-conc sm dm-conc">${t('live.concShort', { n: esc(c.conc) })}</span>` : '', wait ? `<span class="dm-wait">${t('live.waitAck')}</span>` : ''].filter(Boolean).join(' · ');
  return `<div class="dm-row${active ? ' on' : ''}${down ? ' down' : ''}${c.kind === 'pet' ? ' pet' : ''}${c.live ? ' live' : ''}">
    <div class="dm-main">
      <input type="number" class="n dm-init" id="dm-init-${c.id}" data-dm="init" data-id="${c.id}" value="${c.init}" aria-label="${t('stat.init')} ${esc(c.name)}">
      <button class="dm-name" data-a="dmopen" data-id="${c.id}" aria-expanded="${!!open}"><b>${esc(c.name)}</b><small>${sub}</small></button>${(c.fx || []).length ? `<div class="chips dm-fx">${c.fx.map(f => `<button class="chip" data-a="dmfxdel" data-id="${c.id}" data-f="${f.id}" title="${t('item.remove')}">${esc(f.n)} <b>${f.r}</b></button>`).join('')}</div>` : ''}${c.la ? `<div class="dm-la"><span class="lbl">LA</span><div class="pips">${pipsOf(c.la, `data-a="dmla" data-id="${c.id}"`)}</div></div>` : ''}
      <div class="dm-hp"><button data-a="dmhp" data-id="${c.id}" data-d="-1" aria-label="${t('hp.damage')} ${esc(c.name)}">−</button><input type="number" class="n" id="dm-amt-${c.id}" min="1" placeholder="1" aria-label="${t('hp.amount')}"><button data-a="dmhp" data-id="${c.id}" data-d="1" aria-label="${t('hp.heal')} ${esc(c.name)}">+</button><span class="dm-hpv"><b>${c.hp}</b>/${c.hpMax}${c.tmp ? ' +' + c.tmp : ''}</span></div>
    </div>
    ${open ? `<div class="ovl dm-ovl"><div class="dlg dm-dlg" role="dialog" aria-modal="true" aria-labelledby="dmd-${c.id}"><div class="dm-dlg-h"><h3 id="dmd-${c.id}">${esc(c.name)}</h3><span class="dm-hpv"><b>${c.hp}</b>/${c.hpMax}</span><button class="btn sm" data-a="dmclose">${t('common.close')}</button></div><div class="dm-more"><div class="chips">${COND.map(x => `<button class="chip${c.cond[x.n] ? ' on' : ''}" data-a="dmcond" data-id="${c.id}" data-c="${x.n}" aria-pressed="${!!c.cond[x.n]}">${esc(nameLine(x.n, x.de))}</button>`).join('')}</div>
      ${c.live ? '' : `<input type="text" id="dm-conc-${c.id}" data-dm="conc" data-id="${c.id}" value="${esc(c.conc || '')}" placeholder="${t('fight.concPh')}" aria-label="${t('conc.title')}">`}${c.kind === 'pc' && c.live && players().find(p => p.key === c.live) ? vLiveSend(players().find(p => p.key === c.live)) : ''}
      <input type="text" class="wide" id="dm-note-${c.id}" data-dm="note" data-id="${c.id}" value="${esc(c.note)}" placeholder="${t('dm.rowNote')}" aria-label="${t('dm.rowNote')}">
      <div class="add" style="margin:0"><input type="text" id="dm-fxn-${c.id}" placeholder="${t('dm.fxName')}" aria-label="${t('dm.fxName')}"><input type="number" class="n" id="dm-fxr-${c.id}" min="1" value="10" aria-label="${t('dm.fxRounds')}" title="${t('dm.fxRounds')}"><button class="btn sm" data-a="dmfx" data-id="${c.id}">${t('dm.fxAdd')}</button></div>
      ${(c.slots || []).map((s, k) => `<div class="lvh" style="padding:2px 0;border:0"><small>${s.lbl ? esc(s.lbl) : t('spell.level', { n: s.lvl })}</small><div class="pips">${pipsOf(s, `data-a="dmslot" data-id="${c.id}" data-k="${k}"`)}</div></div>`).join('')}
      ${c.kind === 'pc' && c.live ? `<button class="btn sm" data-a="peek" data-k="${esc(c.live)}" data-n="${esc(c.name)}">${t('peek.btn')}</button>` : ''}
      ${statBlock(c)}
      <button class="btn sm bad" data-a="dmrm" data-id="${c.id}">${t('item.remove')}</button></div></div></div>` : ''}
  </div>`;
}
/** Verbundene Spieler, die noch nicht im Kampf sind, einzeln hinzufügen. */
function vLiveAdd() {
  if (L.role !== 'dm') return '';
  const rest = players().filter(p => !inCombat(p.key));
  if (!rest.length) return '';
  return `<div class="card"><p class="lbl" style="margin:0 0 6px">${t('live.addPlayers')}</p><div class="chips">${rest.map(p => `<button class="chip" data-a="liveadd1" data-k="${esc(p.key)}">+ ${esc(p.name || '?')}${(p.pets || []).length ? ` <small>(${p.pets.map(x => esc(x.n)).join(', ')})</small>` : ''}</button>`).join('')}${rest.length > 1 ? `<button class="chip" data-a="liveadd">${t('live.addAll')}</button>` : ''}</div></div>`;
}
function vCombat() {
  const c = D.combat, list = ordered(), on = fighting(), nn = nowNext();
  const turns = `<button class="tg${D.turns !== false ? ' on' : ''}" data-a="dmturns" aria-pressed="${D.turns !== false}" title="${t('dm.turnsHint')}">${t('dm.turns')}</button>`;
  const clear = `<button class="btn ${DU.conf === 'clear' ? 'warn' : 'bad'}" data-a="dmclear">${DU.conf === 'clear' ? t('dm.clearConfirm') : t('fight.clearAll')}</button>`;
  const add = `<div class="add"><input type="search" id="dm-mq" value="${esc(DU.mq)}" placeholder="${t('dm.search')}" aria-label="${t('dm.search')}"><input type="number" class="n" id="dm-qty" min="1" max="20" value="1" aria-label="${t('common.count')}"></div><div id="dm-results">${vResults()}</div>
  <div class="add"><input type="text" id="dm-mn" placeholder="${t('common.name')}"><input type="number" class="n" id="dm-mac" min="0" placeholder="${t('dm.acShort')}" aria-label="${t('stat.ac')}"><input type="number" class="n" id="dm-mhp" min="0" placeholder="${t('head.hpShort')}" aria-label="${t('setup.maxHp')}"><button class="btn" data-a="dmman">${t('common.add')}</button><button class="btn" data-a="dmchars">${t('dm.addChars')}</button></div>`;
  const pcs = list.filter(x => x.kind !== 'mon'), foes = list.filter(x => x.kind === 'mon');
  if (!on) {
    const encs = D.encounters.map(e => { const q = rate(e); return `<div class="row prep-enc"><div class="nm">${esc(e.name || t('dm.untitled'))}<small>${e.monsters.map(m => `${m.qty}× ${esc(findMonster(m.id)?.n || '?')}`).join(', ') || t('dm.encEmpty')}</small></div>${badge(q)}<button class="btn sm" data-a="dmestart" data-id="${e.id}"${q.n ? '' : ' disabled'}>${t('fight.loadShort')}</button></div>`; }).join('');
    return `<div class="fight-state"><div class="fs-top"><span class="fs-badge">${t('fight.prep')}</span><span>${t('fight.prepDm')}</span></div></div>
    <div class="prep3"><section class="prep-col"><h3 class="ov-h">${t('dm.encounters')}</h3>${encs || `<p class="note">${t('dm.encNone')}</p>`}<button class="linkbtn" data-a="crumb" data-t="dmenc">${t('fight.toEnc')}</button></section>
    <section class="prep-col"><h3 class="ov-h">${t('fight.lineup')}</h3>${vLiveAdd()}${list.length ? `<p class="note">${t('fight.initHint')}</p><div class="dm-list">${list.map(x => row(x, false)).join('')}</div>` : `<div class="empty">${t('dm.empty')}</div>`}<h3 class="ov-h" style="margin-top:14px">${t('dm.addTitle')}</h3>${add}</section>
    <aside class="prep-col prep-go"><button class="btn solid big" data-a="dmstep" data-d="1"${list.length ? '' : ' disabled'}>${t('fight.start')}</button><p class="note">${t('fight.startHint', { a: pcs.length, b: foes.length })}</p>${turns}${clear}<button class="btn" data-a="dmxpopen" aria-expanded="${!!DU.xpOpen}">${t('xp.share')}</button>${vXpShare()}</aside></div>`;
  }
  const side = U.FSIDE === 'foes' ? 'foes' : 'pcs';
  const col = (k, title, arr) => `<section class="fight-col ${k}${side === k ? ' show' : ''}"><h3 class="ov-h">${title} <small>${arr.length}</small></h3>${arr.length ? `<div class="dm-list">${arr.map(x => row(x, x.id === c.active)).join('')}</div>` : `<p class="note">${t('fight.none')}</p>`}</section>`;
  return `<div class="fight-state on"><div class="fs-top"><span class="fs-badge">${t('fight.active')}</span><b class="fs-round">${t('turn.round', { n: c.round })}</b><span>${t('turn.now', { n: `<b>${esc(nn.cur?.name || '?')}</b>` })}${nn.next ? ' · ' + t('turn.next', { n: esc(nn.next.name) }) : ''}</span><span class="fs-btns"><button class="btn" data-a="dmstep" data-d="-1">${t('dm.prev')}</button><button class="btn solid big" data-a="dmstep" data-d="1">${t('dm.next')}</button></span></div>${vInitBar(list, nn.cur, nn.next)}</div>
  <div class="seg fight-tabs" role="group">${['pcs', 'foes'].map(k => `<button class="tg${side === k ? ' on' : ''}" data-a="fside" data-k="${k}" aria-pressed="${side === k}">${t('fight.side.' + k)}</button>`).join('')}</div>
  <div class="fight-cols">${col('pcs', t('fight.side.pcs'), pcs)}${col('foes', t('fight.side.foes'), foes)}</div>
  ${vActive(nn.cur)}
  <div class="card fight-ctl"><div class="dm-bar">${turns}<button class="btn" data-a="dmxpopen" aria-expanded="${!!DU.xpOpen}">${t('xp.share')}</button><button class="btn ${DU.conf === 'end' ? 'warn' : 'bad'}" data-a="dmfightend">${DU.conf === 'end' ? t('fight.endConfirm') : t('fight.end')}</button>${clear}</div>${vXpShare()}<details class="fight-add"><summary>${t('dm.addTitle')}</summary>${vLiveAdd()}${add}</details><p class="note">${t('dm.hint')}</p></div>`;
}
function noteBody(n) {
  const links = linksOf(n), back = backlinks(n);
  return `<div class="dm-edit"><div class="add" style="margin-top:0"><input type="text" id="dm-ntitle" data-dmn="title" value="${esc(n.title)}" placeholder="${t('dm.noteTitle')}" aria-label="${t('dm.noteTitle')}"><select id="dm-nkind" data-dmn="kind" aria-label="${t('dm.noteKind')}">${KINDS.map(k => `<option value="${k}"${n.kind === k ? ' selected' : ''}>${t('dm.kind.' + k)}</option>`).join('')}</select></div>
  <textarea id="dm-nbody" data-dmn="body" placeholder="${t('dm.notePh')}" aria-label="${t('dm.noteBody')}">${esc(n.body)}</textarea>${n.kind === 'place' ? `<div class="add"><button class="btn sm${D.here === n.id ? ' solid' : ''}" data-a="dmhere" data-id="${n.id}" aria-pressed="${D.here === n.id}">${D.here === n.id ? t('dm.isHere') : t('dm.setHere')}</button></div>` + vPlace(n) : ''}
  ${links.length ? `<p class="lbl">${t('dm.links')}</p><div class="chips">${links.map(l => `<button class="chip${noteByTitle(l) ? '' : ' dm-new'}" data-a="dmlink" data-t="${esc(l)}">${esc(l)}</button>`).join('')}</div>` : ''}
  ${back.length ? `<p class="lbl">${t('dm.backlinks')}</p><div class="chips">${back.map(o => `<button class="chip" data-a="dmsel" data-id="${o.id}">${esc(o.title || t('dm.untitled'))}</button>`).join('')}</div>` : ''}
  <div class="add"><button class="btn sm ${DU.conf === 'note' ? 'warn' : 'bad'}" data-a="dmndel" data-id="${n.id}">${DU.conf === 'note' ? t('item.removeConfirm') : t('item.remove')}</button></div></div>`;
}
export function vNoteList() {
  const list = searchNotes(DU.nq);
  return list.length ? list.map(n => `<button class="wli" data-a="dmsel" data-id="${n.id}" aria-current="${n.id === D.sel}"><span><b>${esc(n.title || t('dm.untitled'))}</b><small>${t('dm.kind.' + n.kind)}${n.monsters?.length ? ' · ' + t('dm.monsterCount', { n: n.monsters.reduce((a, m) => a + m.qty, 0) }) : ''}</small></span></button>`).join('') : `<p class="empty" style="padding:0 10px">${t('wiki.nothing')}</p>`;
}
export function vPlaceResults() {
  const q = (DU.pq || '').trim();
  if (!q) return '';
  const hits = searchMonsters(q);
  return hits.length ? hits.map(m => `<div class="row"><div class="nm">${esc(m.n)}<small>CR ${crText(m.cr)} · ${xpOf(m.cr)} XP</small></div><button class="btn sm solid" data-a="dmpladd" data-m="${esc(m.id)}">${t('common.add')}</button></div>`).join('') : `<p class="empty">${t('wiki.nothing')}</p>`;
}
function vPlace(n) {
  const list = n.monsters || [], r = rate({ monsters: list });
  return `<div class="dm-place"><p class="lbl">${t('dm.placeMon')}</p>${list.map(e => { const m = findMonster(e.id); return m ? `<div class="row"><div class="nm">${esc(m.n)}<small>CR ${crText(m.cr)} · ${xpOf(m.cr)} XP</small></div><div class="qty"><button data-a="dmplqty" data-m="${esc(e.id)}" data-d="-1" aria-label="${t('common.less')}">−</button><span>${e.qty}</span><button data-a="dmplqty" data-m="${esc(e.id)}" data-d="1" aria-label="${t('common.more')}">+</button></div></div>` : ''; }).join('') || `<p class="empty">${t('dm.placeEmpty')}</p>`}
  ${list.length ? `<p class="dm-total">${badge(r)} <span>${t('dm.xpLine24', { a: r.xp, b: r.budget, l: t('dm.diff.' + (r.level === 'none' ? 'low' : r.level)) })}</span></p><div class="add" style="margin-top:0"><button class="btn solid" data-a="dmplstart" data-id="${n.id}">${t('dm.start')}</button></div>` : ''}
  <div class="add"><input type="search" id="dm-pq" value="${esc(DU.pq || '')}" placeholder="${t('dm.search')}" aria-label="${t('dm.search')}"></div><div id="dm-pres">${vPlaceResults()}</div></div>`;
}
/** Kopf des Notizbuchs: wo die Gruppe gerade ist und die letzte Sitzung. */
export function vHere() {
  const h = hereNote(), ses = lastSession(), places = D.notes.filter(n => n.kind === 'place');
  const excerpt = raw => { const s = (raw || '').replace(/\[\[([^\]\n]+)\]\]/g, '$1'); return esc(s.slice(0, 420)) + (s.length > 420 ? ' …' : ''); };
  const pick = `<select id="dm-here" aria-label="${t('dm.hereSet')}"><option value="">${t('dm.herePick')}</option>${places.map(p => `<option value="${p.id}"${h && h.id === p.id ? ' selected' : ''}>${esc(p.title || t('dm.untitled'))}</option>`).join('')}</select>`;
  const links = h ? linksOf(h) : [], mons = h?.monsters || [];
  return `<div class="here"><div class="here-place"><p class="lbl">${t('dm.here')}</p>${h ? `<h3>${esc(h.title || t('dm.untitled'))}</h3>${h.body ? `<p class="ptext">${excerpt(h.body)}</p>` : ''}${links.length ? `<div class="chips">${links.map(l => `<button class="chip${noteByTitle(l) ? '' : ' dm-new'}" data-a="dmlink" data-t="${esc(l)}">${esc(l)}</button>`).join('')}</div>` : ''}<div class="add"><button class="btn sm" data-a="dmsel" data-id="${h.id}">${t('dm.open')}</button>${mons.length ? `<button class="btn sm solid" data-a="dmplstart" data-id="${h.id}">${t('dm.startHere', { n: mons.reduce((a, m) => a + m.qty, 0) })}</button>` : ''}${pick}</div>` : `<p class="note">${places.length ? t('dm.hereNone') : t('dm.hereNoPlaces')}</p><div class="add">${places.length ? pick : ''}<button class="btn sm solid" data-a="dmnewhere">${t('dm.newPlace')}</button></div>`}</div><div class="here-session"><p class="lbl">${t('dm.lastSession')}</p>${ses ? `<h3>${esc(ses.title)}</h3>${ses.body ? `<p class="ptext">${excerpt(ses.body)}</p>` : `<p class="note">${t('dm.sessionEmpty')}</p>`}<div class="add"><button class="btn sm" data-a="dmsel" data-id="${ses.id}">${t('dm.open')}</button><button class="btn sm solid" data-a="dmnews">${t('dm.newSession')}</button></div>` : `<p class="note">${t('dm.noSession')}</p><div class="add"><button class="btn sm solid" data-a="dmnews">${t('dm.newSession')}</button></div>`}</div></div>`;
}
/** Kampagnenbuch der Spielleitung: Einträge des Notizbuchs als Zeitleiste, nach Art gefiltert. Alles privat, bis die gemeinsame Chronik freigegeben ist. */
function vBook() {
  const f = DU.bookF || 'session', list = D.notes.filter(n => f === 'all' || n.kind === f);
  const items = (DU.bookRev ? list : [...list].reverse()).map(n => ({ title: n.title, meta: t('dm.kind.' + n.kind), body: n.body, tags: `<span class="tag sm" title="${t('chron.privHint')}">🔒 ${t('chron.private')}</span>`, act: `<button class="btn sm" data-a="dmsel" data-id="${n.id}" data-v="notes">${t('dm.open')}</button>` }));
  return `<div class="chips">${['session', 'plot', 'place', 'npc', 'all'].map(k => `<button class="chip${f === k ? ' on' : ''}" data-a="bookf" data-k="${k}" aria-pressed="${f === k}">${k === 'all' ? t('dm.kindAll') : t('dm.kind.' + k)}</button>`).join('')}<button class="chip" data-a="bookrev" aria-pressed="${!!DU.bookRev}">${t(DU.bookRev ? 'chron.newest' : 'chron.oldest')}</button><button class="btn sm solid" data-a="dmnews">${t('dm.newSession')}</button></div>
  <p class="note">${t('chron.dmHint')}</p>${timeline(items)}`;
}
function vNotes() {
  const tabs = `<div class="seg chron-tabs" role="group">${['book', 'notes'].map(k => `<button class="tg${(DU.chronV || 'notes') === k ? ' on' : ''}" data-a="chronv" data-k="${k}" aria-pressed="${(DU.chronV || 'notes') === k}">${t('chron.v.' + k)}</button>`).join('')}</div>`;
  if (DU.chronV === 'book') return tabs + vBook();
  return tabs + vNotesInner();
}
function vNotesInner() {
  const n = curNote();
  return `${vHere()}<div class="wtools"><input type="search" id="dm-nq" value="${esc(DU.nq)}" placeholder="${t('dm.noteSearch')}" aria-label="${t('dm.noteSearch')}"><button class="btn solid" data-a="dmnew">${t('dm.newNote')}</button><button class="btn solid" data-a="dmnewp">${t('dm.newPlace')}</button><button class="btn solid" data-a="dmnews">${t('dm.newSession')}</button></div>
  <div class="chips dm-nk">${['', ...KINDS].map(k => `<button class="chip${(DU.nk || '') === k ? ' on' : ''}" data-a="dmnk" data-k="${k}" aria-pressed="${(DU.nk || '') === k}">${k ? t('dm.kind.' + k) : t('dm.kindAll')}</button>`).join('')}</div>
  <div class="wiki"><div class="wl" id="dm-nlist">${vNoteList()}</div><div class="wd pane notebook">${n ? noteBody(n) : `<p class="empty">${t('dm.noteNone')}</p>`}</div></div>`;
}
/** XP verteilen: besiegte Monster zusammenzählen, durch die Spieler teilen, an alle schicken. */
function vXpShare() {
  if (!DU.xpOpen) return '';
  const { list, xp } = defeatedXp(), n = players().length || D.combat.list.filter(c => c.kind === 'pc').length || 1;
  return `<div class="card xpshare"><p class="lbl" style="margin:0 0 6px">${t('xp.share')}</p><p>${list.length ? t('xp.defeated', { m: list.map(c => esc(c.name)).join(', '), n: xp }) : t('xp.noneDefeated')}</p><div class="add"><label class="ck">${t('xp.total')} <input type="number" class="n" id="dm-xpt" min="0" value="${xp}"></label><label class="ck">${t('xp.players')} <input type="number" class="n" id="dm-xpn" min="1" value="${n}"></label><button class="btn solid" data-a="dmxpsend">${t('xp.send')}</button></div><p class="note">${L.role === 'dm' && L.status === 'on' ? t('xp.sendNote') : t('xp.offline')}</p></div>`;
}
function vLive() {
  if (L.role !== 'dm') return `<div class="card"><p class="note" style="margin-top:0">${t('live.dmIntro')}</p>${L.role === 'player' ? `<p class="note">${t('live.dmBusy')}</p>` : ''}<div class="add"><button class="btn solid" data-a="livecreate">${t('live.create')}</button></div><div class="add"><input type="text" id="live-dmcode" maxlength="6" autocomplete="off" placeholder="${t('live.codePh')}" aria-label="${t('live.code')}"><button class="btn" data-a="livedmjoin">${t('live.dmReopen')}</button></div><p class="note">${t('live.dmReopenHint')}</p></div>`;
  const list = players();
  return `<div class="card"><div class="dm-bar"><div class="live-code"><small>${t('live.code')}</small><b>${esc(L.code)}</b></div>${liveState()}<button class="btn" data-a="liveadd"${list.length ? '' : ' disabled'}>${t('live.addAll')}</button><button class="btn bad" data-a="liveoff">${t('live.close')}</button></div>
  ${list.length ? '<div class="party-grid dm">' + list.map(p => { const inC = inCombat(p.key); return `<div class="dm-prow">${memberCard(p, `<div class="mc-act"><div class="add" style="margin:4px 0">${inC ? `<span class="chip on">${t('live.inCombat')}</span>` : `<button class="btn sm" data-a="liveadd1" data-k="${esc(p.key)}">${t('live.addOne')}</button>`}<button class="btn sm" data-a="peek" data-k="${esc(p.key)}" data-n="${esc(p.name)}">${t('peek.btn')}</button></div>${vLiveSend(p)}</div>`)}</div>`; }).join('') + '</div>' : `<div class="empty">${t('live.waiting')}</div>`}${vCloud()}</div>${vHandoutForm(list)}`;
}
export function liveState() {
  const k = { on: 'live.on', connecting: 'live.connecting', error: 'live.error' }[L.status];
  return k ? `<span class="live-state ${L.status}">${t(k)}</span>` : '';
}
const badge = r => `<span class="dm-diff ${r.level}">${t('dm.diff.' + r.level)}</span>`;
export function vEncResults() {
  if (!DU.eq.trim()) return '';
  const hits = searchMonsters(DU.eq);
  return hits.length ? hits.map(m => `<div class="row"><div class="nm">${esc(m.n)}<small>CR ${crText(m.cr)} · ${xpOf(m.cr)} XP</small></div><button class="btn sm solid" data-a="dmeadd" data-m="${esc(m.id)}">${t('common.add')}</button></div>`).join('') : `<p class="empty">${t('wiki.nothing')}</p>`;
}
function vCustomForm() {
  const m = DU.editMon ? findMonster(DU.editMon) : null, a = m?.abil || {};
  const crStr = m ? crText(m.cr) : '';
  return `<details class="dm-custom"${m || DU.customOpen ? ' open' : ''}><summary>${t('dm.customTitle')}</summary>
  ${D.custom.length ? D.custom.map(c => `<div class="row"><div class="nm">${esc(c.n)}<small>CR ${crText(c.cr)} · ${t('dm.acShort')} ${c.ac} · ${t('head.hpShort')} ${c.hp}</small></div><button class="btn sm" data-a="dmcedit" data-id="${c.id}">${t('dm.edit')}</button><button class="btn sm ${DU.conf === 'c' + c.id ? 'warn' : 'bad'}" data-a="dmcdel" data-id="${c.id}">${DU.conf === 'c' + c.id ? t('item.removeConfirm') : t('item.remove')}</button></div>`).join('') : ''}
  <div class="form" style="margin-top:8px"><label><span class="lbl">${t('common.name')}</span><input type="text" id="dmc-n" value="${esc(m?.n || '')}"></label><label><span class="lbl">${t('dm.cr')}</span><input type="text" id="dmc-cr" value="${esc(crStr)}" placeholder="1/4"></label><label><span class="lbl">${t('stat.ac')}</span><input type="number" id="dmc-ac" min="0" value="${m?.ac ?? ''}"></label><label><span class="lbl">${t('setup.maxHp')}</span><input type="number" id="dmc-hp" min="1" value="${m?.hp ?? ''}"></label><label><span class="lbl">${t('stat.speed')}</span><input type="text" id="dmc-sp" value="${esc(m?.speed || '')}" placeholder="30 ft."></label>${ABK.map(k => `<label><span class="lbl">${t('abs.' + k)}</span><input type="number" id="dmc-${k}" min="1" max="30" value="${a[k] ?? 10}"></label>`).join('')}</div>
  <textarea id="dmc-t" rows="5" style="margin-top:8px" placeholder="${t('dm.customText')}" aria-label="${t('dm.customText')}">${esc(m?.text || '')}</textarea>
  <div class="add"><button class="btn solid" data-a="dmcsave">${m ? t('dm.save') : t('common.create')}</button>${m ? `<button class="btn" data-a="dmcnew">${t('common.cancel')}</button>` : ''}</div></details>`;
}
function vEncounters() {
  const th = thresholds(), e = curEnc(), r = e && rate(e);
  return `<div class="card"><p class="lbl" style="margin:0 0 6px">${t('dm.party', { n: partySize() })}</p>${D.party.map((p, i) => `<div class="add" style="margin:0 0 6px"><label class="ck">${t('dm.players')} <input type="number" class="n" id="dmp-c${i}" data-dp="count" data-i="${i}" min="0" value="${p.count}"></label><label class="ck">${t('setup.level')} <input type="number" class="n" id="dmp-l${i}" data-dp="level" data-i="${i}" min="1" max="20" value="${p.level}"></label>${D.party.length > 1 ? `<button class="del" data-a="dmprm" data-i="${i}" aria-label="${t('item.remove')}">✕</button>` : ''}</div>`).join('')}<div class="add" style="margin:0"><button class="btn sm" data-a="dmpadd">${t('dm.partyAdd')}</button></div>
  <div class="dm-th">${['low', 'moderate', 'high'].map((k, i) => `<div><small>${t('dm.diff.' + k)}</small><b>${th[i]}</b><i>XP</i></div>`).join('')}</div><p class="note">${t('dm.budgetNote')}</p></div>
  <h2>${t('dm.encounters')}</h2><div class="card">${D.encounters.map(x => { const q = rate(x); return `<div class="row dm-er"><button class="dm-name" data-a="dmesel" data-id="${x.id}"><b>${esc(x.name || t('dm.untitled'))}</b><small>${x.monsters.map(m => `${m.qty}× ${esc(findMonster(m.id)?.n || '?')}`).join(', ') || t('dm.encEmpty')}</small></button>${badge(q)}<button class="btn sm solid" data-a="dmestart" data-id="${x.id}"${q.n ? '' : ' disabled'}>${t('dm.start')}</button><button class="btn sm ${DU.conf === 'e' + x.id ? 'warn' : 'bad'}" data-a="dmedel" data-id="${x.id}">${DU.conf === 'e' + x.id ? t('item.removeConfirm') : t('item.remove')}</button></div>`; }).join('') || `<div class="empty">${t('dm.encNone')}</div>`}<div class="add"><button class="btn" data-a="dmenew">${t('dm.encNew')}</button></div></div>
  ${e ? `<h2>${esc(e.name || t('dm.untitled'))}</h2><div class="card"><div class="add" style="margin-top:0"><input type="text" id="dme-n" data-de="name" value="${esc(e.name)}" placeholder="${t('dm.encName')}" aria-label="${t('dm.encName')}"></div>${e.monsters.map(m => { const x = findMonster(m.id); return x ? `<div class="row"><div class="nm">${esc(x.n)}<small>CR ${crText(x.cr)} · ${xpOf(x.cr)} XP</small></div><div class="qty"><button data-a="dmeqty" data-m="${esc(m.id)}" data-d="-1" aria-label="${t('common.less')}">−</button><span>${m.qty}</span><button data-a="dmeqty" data-m="${esc(m.id)}" data-d="1" aria-label="${t('common.more')}">+</button></div></div>` : ''; }).join('')}<p class="dm-total">${badge(r)} <span>${t('dm.xpLine24', { a: r.xp, b: r.budget, l: t('dm.diff.' + (r.level === 'none' ? 'low' : r.level)) })}</span></p><div class="add"><input type="search" id="dm-eq" value="${esc(DU.eq)}" placeholder="${t('dm.search')}" aria-label="${t('dm.search')}"></div><div id="dm-eres">${vEncResults()}</div></div>` : ''}
  ${vCustomForm()}`;
}
/** Händler der Kampagne: Sortiment aus dem Katalog oder eigene Waren, Preis (GM) und Bestand; „offen“ zeigt ihn den Spielern. */
function vMerchants() {
  const list = D.merchants || [], sales = (D.sales || []).slice(0, 6);
  const ware = (m, w) => `<div class="row mer-w"><div class="nm">${esc(w.n)}${w.k ? '' : ` <span class="lbl">${t('setup.ownEntry')}</span>`}</div><label class="ck">${t('price.gp')} <input type="number" class="n" min="0" step="0.01" data-mer="cp" data-id="${m.id}" data-w="${w.id}" value="${cpToGp(w.cp)}" aria-label="${t('shop.price')} ${esc(w.n)}"></label><label class="ck">${t('shop.stock')} <input type="number" class="n" min="0" max="999" data-mer="q" data-id="${m.id}" data-w="${w.id}" value="${w.q}" aria-label="${t('shop.stock')} ${esc(w.n)}"></label><button class="del" data-a="merrm" data-id="${m.id}" data-w="${w.id}" aria-label="${t('item.remove')} ${esc(w.n)}">✕</button></div>`;
  const one = m => `<details class="merchant card"${DU.merOpen === m.id || list.length === 1 ? ' open' : ''}><summary><b>${esc(m.n)}</b> <span class="tag ${m.open ? 't-good' : ''} sm">${t(m.open ? 'shop.open' : 'shop.closed')}</span> <small>${t('shop.wares', { n: m.items.length })}</small></summary>
  <div class="add"><input type="text" data-mer="n" data-id="${m.id}" value="${esc(m.n)}" aria-label="${t('common.name')}"><button class="btn sm${m.open ? ' solid' : ''}" data-a="mertg" data-id="${m.id}" aria-pressed="${m.open}">${t(m.open ? 'shop.closeBtn' : 'shop.openBtn')}</button><button class="btn sm ${DU.conf === 'mer' + m.id ? 'warn' : 'bad'}" data-a="merdel" data-id="${m.id}">${DU.conf === 'mer' + m.id ? t('item.removeConfirm') : t('shop.merchantDel')}</button></div>
  ${m.items.map(w => ware(m, w)).join('') || `<p class="note">${t('shop.noWares')}</p>`}
  <div class="add">${catSelect('mer-add-' + m.id, ['item', 'potion', 'magic'])}<input type="number" class="n" id="mer-q-${m.id}" min="1" value="1" aria-label="${t('shop.stock')}"><button class="btn sm solid" data-a="meradd" data-id="${m.id}">${t('common.add')}</button></div>
  <div class="add"><input type="text" id="mer-own-${m.id}" placeholder="${t('shop.ownWare')}" aria-label="${t('shop.ownWare')}"></div></details>`;
  return `<h2>${t('shop.merchants')}</h2><p class="note">${t('shop.dmHint')}</p>${list.map(one).join('')}<div class="add"><input type="text" id="mer-new" placeholder="${t('shop.merchantName')}" aria-label="${t('shop.merchantName')}"><button class="btn" data-a="mernew">${t('shop.merchantAdd')}</button></div>
  ${sales.length ? `<p class="lbl">${t('shop.salesTitle')}</p><ul class="lb-list">${sales.map(x => `<li>${t('shop.saleLine', { p: esc(x.who), n: esc(x.n), g: cpToGp(x.cp) })}</li>`).join('')}</ul>` : ''}<h2>${t('loot.title')}</h2>`;
}
export function vDm(solo = false) {
  const tab = (k, l) => `<button class="chip${D.view === k ? ' on' : ''}" data-a="dmview" data-v="${k}" aria-pressed="${D.view === k}">${l}</button>`;
  const nav = solo ? `<h2>${t('dmm.view.' + D.view)}</h2>` : `<h2>${t('tab.dm')}</h2><div class="chips">${tab('combat', t('dm.combat'))}${tab('enc', t('dm.encounters'))}${tab('loot', t('loot.title'))}${tab('cheat', t('dm.cheat'))}${tab('notes', t('dm.notes'))}${tab('live', t('live.title'))}</div>`;
  return `${nav}<div style="margin-top:14px">${D.view === 'notes' ? vNotes() : D.view === 'live' ? vLive() : D.view === 'enc' ? vEncounters() : D.view === 'cheat' ? vCheat() : D.view === 'loot' ? vMerchants() + vLoot() : vCombat()}</div>
  <details class="dm-backup"><summary>${t('setup.backup')}</summary><p class="note">${t('dm.backupHint')}</p><div class="add"><button class="btn" data-a="dmexp">${t('setup.export')}</button><button class="btn" data-a="dmimp">${t('setup.import')}</button></div>${DU.exp ? `<textarea id="dm-exp" readonly aria-label="${t('setup.exportLabel')}">${esc(DU.exp)}</textarea>` : ''}<textarea id="dm-imp" placeholder="${t('setup.pasteImport')}" aria-label="${t('setup.importLabel')}" style="margin-top:8px">${esc(DU.imp)}</textarea></details>`;
}
export { dist };

/* ---- Spielerbogen lesen (Online-Stand aus der Gruppe) ---- */
const md = n => { const m = Math.floor((+n - 10) / 2); return (m >= 0 ? '+' : '') + m; };
const itemName = r => (r && r.ref && BYN[r.ref] ? BYN[r.ref].n : r && r.n) || '';
export function vPeek() {
  const pk = DU.peek;
  if (!pk) return '';
  const close = `<button class="btn solid" data-a="peekclose">${t('common.close')}</button>`;
  const wrap = body => `<div class="ovl"><div class="dlg peek" role="dialog" aria-modal="true" aria-labelledby="pk-h"><h3 id="pk-h">${t('peek.title', { n: esc(pk.name || '?') })}</h3>${body}<div class="dlgf">${close}</div></div></div>`;
  if (pk.loading) return wrap(`<p class="note">${t('peek.loading')}</p>`);
  const s = pk.data;
  if (!s) return wrap(`<p class="note">${t('peek.none')}</p>`);
  const sec = (title, inner) => inner ? `<p class="lbl pk-sec">${title}</p>${inner}` : '';
  const abil = ABK.map(k => `<div><small>${t('abs.' + k)}</small><b>${md(s.abil?.[k] ?? 10)}</b><span>${s.abil?.[k] ?? 10}${s.saves?.[k] ? ' ●' : ''}</span></div>`).join('');
  const skills = SK.filter(([n]) => s.skills?.[n]).map(([n]) => esc(n) + (s.skills[n] === 2 ? ' (E)' : '')).join(', ');
  const slots = (s.slots || []).map((x, i) => (x.max ? `${i + 1}: ${x.max - x.used}/${x.max}` : '')).filter(Boolean).join(' · ') + (s.pact?.max ? ` · ${t('mini.pact')} ${s.pact.max - s.pact.used}/${s.pact.max}` : '');
  const byLvl = {};
  (s.spells || []).forEach(x => { (byLvl[x.lvl] = byLvl[x.lvl] || []).push(esc(x.n) + (x.prep === false ? '' : '')); });
  const spells = Object.keys(byLvl).sort((x, y) => x - y).map(l => `<p class="pk-l"><span class="lbl">${+l === 0 ? t('spell.cantrips') : t('spell.level', { n: l })}</span> ${byLvl[l].join(', ')}</p>`).join('');
  const eq = Object.values(s.eq || {}).map(itemName).filter(Boolean).map(esc).join(', ');
  const bag = (s.bag || []).filter(Boolean).map(r => esc(itemName(r)) + (r.q > 1 ? ' ×' + r.q : '')).join(', ');
  const res = (s.res || []).map(r => `${esc(r.n)} ${r.max - r.used}/${r.max}`).join(' · ');
  const conds = Object.keys(s.cond || {}).filter(k => s.cond[k]);
  const gold = ['pp', 'gp', 'ep', 'sp', 'cp'].filter(k => s.gold?.[k]).map(k => `${s.gold[k]} ${t('coin.' + k)}`).join(', ');
  return wrap(`<p class="note">${t('peek.ro', { t: esc(new Date(pk.at).toLocaleString()) })}</p>
  <p class="cls">${esc([s.race, s.subrace].filter(Boolean).join(' / '))} · ${esc([s.klass, s.sub].filter(Boolean).join(' / '))} ${s.level || ''}${(s.multi || []).map(m => ' · ' + esc(m.k) + ' ' + m.lvl).join('')}</p>
  <div class="pk-stats"><div><small>${t('stat.ac')}</small><b>${s.ac}</b></div><div><small>${t('head.hpShort')}</small><b>${s.hp}/${s.hpMax}${s.tmp ? ' +' + s.tmp : ''}</b></div><div><small>${t('stat.speed')}</small><b>${esc(dist(s.speed))}</b></div><div><small>${t('stat.prof')}</small><b>+${s.prof}</b></div></div>
  <div class="pk-abil">${abil}</div>
  ${conds.length || s.conc ? `<p>${conds.map(c => `<span class="chip on">${esc(c)}</span>`).join(' ')}${s.conc ? ` <span class="dm-conc">${t('live.concShort', { n: esc(s.conc) })}</span>` : ''}</p>` : ''}
  ${sec(t('skill.title'), skills ? `<p>${skills}</p>` : '')}
  ${sec(t('spell.title'), (slots ? `<p class="pk-l">${esc(slots)}</p>` : '') + spells)}
  ${sec(t('peek.res'), res ? `<p>${res}</p>` : '')}
  ${sec(t('peek.feats'), (s.feats || []).length ? `<p>${s.feats.map(f => esc(f.n)).join(', ')}</p>` : '')}
  ${sec(t('peek.equip'), eq ? `<p>${eq}</p>` : '')}
  ${sec(t('peek.bag'), bag || gold ? `<p>${bag}${gold ? (bag ? ' · ' : '') + esc(gold) : ''}</p>` : '')}`);
}
