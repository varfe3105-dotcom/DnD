import { vLiveSend, vHandoutForm, vLoot, vCloud } from './live-ui.js';
import { memberCard } from './party.js';
import { BYN, byName } from '../catalog.js';
import { parseMonster } from '../mon-parse.js';
import { corners, flag } from './orn.js';
import { SK } from '../constants.js';
import { vCheat, statText } from './dm-rules.js';
import { esc, mod, sg } from '../util.js';
import { U } from '../state.js';
import { campaignById } from '../campaigns.js';
import { progOf } from './camp-set.js';
import { catSelect } from './inventory.js';
import { timeline, book } from './chron.js';
import { V2 } from '../cloud.js';
import { cpToGp } from '../shop.js';
import { glyph } from '../icons.js';
import { COND } from '../catalog.js';
import { t, nameLine, dist, loc, convUnits, lang } from '../i18n/index.js';
const cName = x => esc(lang === 'de' && x.de ? x.de : x.n);
import { L, players, pendingFor, SEC } from '../live.js';
import { defeatedXp, hereNote, lastSession, inCombat } from '../dm.js';
import { recharges } from '../dm.js';
import { D, DU, allMonsters, findMonster, thresholds, partySize, rate, curEnc, xpOf, ordered, searchMonsters, KINDS, curNote, linksOf, noteByTitle, backlinks, searchNotes, fighting, nowNext } from '../dm.js';

const ABK = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const crText = c => (c === 0.125 ? '1/8' : c === 0.25 ? '1/4' : c === 0.5 ? '1/2' : c);

export function vResults() {
  const hits = searchMonsters(DU.mq);
  if (!DU.mq.trim()) return '';
  if (!hits.length) return `<p class="empty">${t('wiki.nothing')}</p>`;
  return hits.map(m => `<div class="row"><div class="nm">${esc(m.n)}<small>${esc([m.size, m.type].filter(Boolean).join(' '))}${m.size || m.type ? ' · ' : ''}CR ${crText(m.cr)} · ${t('dm.acShort')} ${m.ac} · ${t('head.hpShort')} ${m.hp} · <span class="msrc">${monSrc(m)}</span></small></div><button class="btn sm solid" data-a="dmadd" data-m="${esc(m.id)}">${t('common.add')}</button></div>`).join('');
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
/* ---- Kampf der Spielleitung (Gestaltungskonzept, Abschnitte 10 und 11) ---- */
const tShort = iso => { const d = new Date(iso); return Number.isNaN(+d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
/** „Am Zug“ für einen Gegner: Werteblock kompakt, Aktionen als Tabelle. Werte nur aus dem festen Muster (mon-parse.js). */
/** Treffer auf ein Ziel: Betrag (vorbelegt, z. B. Durchschnittsschaden) und ein Knopf je möglichem Ziel.
 * Schaden läuft wie „− Schaden“ (verbundene Spieler: Vorschlag; sonst direkt). Kein Würfeln: der Betrag ist änderbar. */
function vHit(from, key, avg, label, only) {
  const others = ordered().filter(x => x.id !== from.id && (!only || (only === 'foes' ? x.kind === 'mon' : x.kind !== 'mon')));
  if (!others.length) return '';
  const pcs = others.filter(x => x.kind !== 'mon'), foes = others.filter(x => x.kind === 'mon');
  const id = `dm-hit-${from.id}-${key}`;
  const chip = x => `<button class="chip${x.hp === 0 ? ' off' : ''}" data-a="dmhit" data-id="${x.id}" data-src="${id}" data-from="${esc(from.name)}" data-w="${esc(label || '')}">${esc(x.name)}</button>`;
  return `<div class="hit-on"><span class="rc-l">${t('fight.hitOn')}</span><input type="number" class="n" id="${id}" min="1" value="${esc(String(avg || ''))}" placeholder="${t('hp.amount')}" aria-label="${t('hp.amount')}"><div class="chips">${[...(from.kind === 'mon' ? pcs : foes), ...(from.kind === 'mon' ? foes : pcs)].map(chip).join('')}</div></div>`;
}
/** Aufladen (Recharge): je Fähigkeit „bereit“ oder „verbraucht“; verbraucht zeigt den Hinweis, zu Beginn des Zugs zu würfeln. */
function vRech(c, m) {
  const list = recharges(m);
  if (!list.length) return '';
  const used = c.rechUsed || {};
  return `<div class="rech"><span class="rc-l">${t('fight.recharge')}</span><div class="chips">${list.map(x => `<button class="chip tgl${used[x.n] ? '' : ' on'}" data-a="dmrech" data-id="${c.id}" data-n="${esc(x.n)}" aria-pressed="${!used[x.n]}" title="${t('fight.rechHint', { r: x.r })}">${esc(x.n)} · ${t(used[x.n] ? 'fight.rechUsed' : 'fight.rechReady')}</button>`).join('')}</div>${list.some(x => used[x.n]) ? `<p class="note">${t('fight.rechRoll', { r: list.filter(x => used[x.n]).map(x => `${esc(x.n)} ${x.r}`).join(', ') })}</p>` : ''}</div>`;
}
function vTurnFoe(c) {
  const m = findMonster(c.mon);
  const head = (sub, ic) => `<div class="tp-head rc-aub">${corners({ top: true, sm: true })}${ic}<div><span class="rc-l">${t('fight.atTurn')} · ${t('fight.statblock')}</span><h3>${esc(c.name)}</h3>${sub}</div></div>`;
  if (!m) return `<section class="turnp">${head('', who(c))}<div class="tp-body"><div class="srow">${sv(t('dm.acShort'), c.ac)}${sv(t('head.hpShort'), `${c.hp}<span class="mx"> / ${c.hpMax}</span>`)}${sv(t('fight.initShort'), c.init)}</div><p class="note">${t('fight.noStat')}</p></div></section>`;
  const ents = parseMonster(m.text), pb = m.cr < 1 ? 2 : 2 + Math.floor((m.cr - 1) / 4);
  const aRow = e => {
    const a = e.atk, s = e.save, ok = a || s;
    const hit = a ? cv(esc(a.hit), t('fight.atk')) : s ? cv(`${t('fight.dc')} ${s.dc}`, t('fight.saveOf', { a: t('abs.' + s.ab) })) : '<span class="rc-v q">–</span>';
    const dmg = a ? cv(esc(a.dice), `Ø ${esc(a.avg)} · ${esc(a.type)}`, 'rc-dt') : s && s.dice ? cv(esc(s.dice), `Ø ${esc(s.avg)} · ${esc(s.type)}`, 'rc-dt') : '<span class="rc-v q">–</span>';
    const kind = a ? t(a.kind === 'Ranged' ? 'fight.ranged' : a.kind === 'Melee' ? 'fight.melee' : 'fight.meleeRanged') : '';
    const sub = a ? `${kind} · ${esc(a.reach)}${a.note ? ' · ' + esc(a.note) : ''}` : s ? '' : t('fight.textOnly');
    return `<details class="arow-d"><summary class="arow"><span class="rc-n">${esc(e.name)}${ok ? ` <span class="ok" title="${t('fight.parsed')}">✓</span>` : ''}<small class="rc-s">${sub}</small></span>${hit}${dmg}<span class="chev" aria-hidden="true">▸</span></summary><p class="arow-x">${esc(convUnits(e.text))}</p>${vHit(c, 'a' + ents.indexOf(e), a ? a.avg : s && s.avg ? s.avg : '', e.name)}</details>`;
  };
  const SEC = { Actions: 'fight.secAct', 'Bonus Actions': 'fight.secBonus', Reactions: 'fight.secReact', 'Legendary Actions': 'fight.secLeg', 'Lair Actions': 'fight.secLair' };
  const groups = Object.keys(SEC).map(k => { const l = ents.filter(e => e.sec === k && e.name); return l.length ? `<p class="grp2"><span class="rc-l">${t(SEC[k])}</span></p>${l.map(aRow).join('')}` : ''; }).join('');
  const traits = ents.filter(e => e.sec === 'Traits' && e.name);
  const sub = `<span class="rc-s">${esc(m.n)} · ${esc([m.size, m.type].filter(Boolean).join(' '))} · ${t('fight.cr')} ${crText(m.cr)} · ${xpOf(m.cr)} XP</span>`;
  return `<section class="turnp">${head(sub, `<span class="tp-ic">${who(c)}</span>`)}<div class="tp-body">
    <div class="srow">${sv(t('dm.acShort'), c.ac)}${sv(t('head.hpShort'), `${c.hp}<span class="mx"> / ${c.hpMax}</span>`)}${sv(t('fight.speed'), esc(convUnits(String(m.speed || '').replace(/^walk /, ''))))}${sv(t('fight.initShort'), c.init)}${sv(t('fight.prof'), '+' + pb)}</div>
    <div class="abil6">${ABK.map(k => `<div><span class="rc-l">${t('abs.' + k)} ${m.abil[k]}</span><b class="rc-v s">${sg(mod(m.abil[k]))}</b></div>`).join('')}</div>${vRech(c, m)}
    <section class="hub-parch rc-pp tp-acts">${groups || `<p class="note">${t('fight.noActions')}</p>`}</section>
    ${traits.length ? `<div class="tp-blk"><p class="rc-l">${t('fight.traits')}</p>${traits.map(e => `<details class="arow-d"><summary class="arow t"><span class="rc-n">${esc(e.name)}</span><span class="chev" aria-hidden="true">▸</span></summary><p class="arow-x">${esc(convUnits(e.text))}</p></details>`).join('')}</div>` : ''}
    <p class="note">${t('fight.parseNote')}</p><details class="tp-full"><summary>${t('fight.fullText')}</summary>${statBlock(c)}</details></div></section>`;
}
const sv = (l, v) => `<div><span class="rc-l">${l}</span><span class="rc-v l">${v}</span></div>`;
const cv = (v, s, cls = 'rc-s') => `<span class="c"><span class="rc-v">${v}</span><small class="${cls}">${s}</small></span>`;
/** „Am Zug“ für einen Spieler (nur lesen): Live-Werte aus der Presence, Bogen aus dem letzten Online-Stand mit Zeitstempel. */
const TIME_GRP = x => { const e = String(x?.time?.en || x?.time || '').toLowerCase(); return /bonus action/.test(e) ? 'b' : /reaction/.test(e) ? 'r' : /^1 action|^action/.test(e) ? 'a' : 'o'; };
function vTurnPc(c) {
  const p = c.live && players().find(x => x.key === c.live), pk = DU.pk && DU.pk.key === c.live ? DU.pk : null, s = pk && pk.data;
  const hp = p ? p.hp : c.hp, hpMax = p ? p.hpMax : c.hpMax, ac = p ? p.ac : c.ac, conds = p ? p.cond || [] : COND.filter(x => c.cond[x.n]).map(x => x.n), conc = p ? p.conc : c.conc;
  const mins = s && pk.at ? Math.max(0, Math.round((Date.now() - new Date(pk.at)) / 60000)) : 0;
  const before = s && pk.at && DU.fightAt && new Date(pk.at) < DU.fightAt, old = s && mins > 10;
  const stamps = !c.live ? `<p class="note">${t('fight.pcRoom')}</p>` : `<div class="tp-stamps"><span class="stamp ok">● ${t('fight.liveStamp')}</span>${pk?.loading ? `<span class="stamp">${t('fight.sheetLoad')}</span>` : s ? `<span class="stamp${before || old ? ' old' : ' ok'}">◷ ${t('fight.sheetAt', { t: tShort(pk.at), m: mins })}</span>` : `<span class="stamp old">${t('fight.sheetNone')}</span>`}</div>${before || old ? `<div class="staleb">⚠ <span>${t(before ? 'fight.staleStart' : 'fight.stale10')}</span></div>` : ''}`;
  let sheet = c.live && !s && !pk?.loading ? `<p class="note">${t('fight.noSheet')}</p>` : '';
  if (s) {
    const spells = (s.spells || []).filter(x => x.lvl === 0 || x.always || x.prep !== false).map(x => ({ x, k: byName(x.n) })), weap = ['main', 'off'].map(k => s.eq?.[k]).filter(Boolean);
    const row = ({ x, k }) => { const r = k || {}; const lv = x.lvl === 0 ? t('fight.cantrips') : t('spell.level', { n: x.lvl }); return `<div class="arow ro"><span class="rc-n">${esc(x.n)}${r.conc ? ` <span class="ck">${t('fight.conc')}</span>` : ''}<small class="rc-s">${[lv, r.range ? esc(loc(r.range)) : '', r.dur ? esc(loc(r.dur)) : ''].filter(Boolean).join(' · ')}</small></span></div>`; };
    const grp = (g, title) => { const l = spells.filter(o => TIME_GRP(o.k) === g); return l.length ? `<p class="grp2"><span class="rc-l">${title}</span></p>${l.map(row).join('')}` : ''; };
    const slots = (s.slots || []).map((o, i) => (o.max ? `${i + 1}: <b>${o.max - o.used}</b><span class="mx">/${o.max}</span>` : '')).filter(Boolean).join(' · ');
    const res = (s.res || []).filter(r => r.max > 0 && r.max < 99).map(r => `<div class="li"><span class="rc-n">${esc(r.n)}</span><span class="rc-v s">${r.max - r.used}<span class="mx">/${r.max}</span></span></div>`).join('');
    sheet = `<section class="hub-parch rc-pp tp-acts">${weap.length ? `<p class="grp2"><span class="rc-l">${t('fight.weapons')}</span></p>${weap.map(w => `<div class="arow ro"><span class="rc-n">${esc(itemName(w))}</span></div>`).join('')}` : ''}${grp('a', t('fight.tAction'))}${grp('b', t('fight.tBonus'))}${grp('r', t('fight.tReact'))}${grp('o', t('fight.tOther'))}</section>
      <div class="tp-two">${slots ? `<div class="tp-blk"><p class="rc-l">${t('fight.slots')}</p><p class="rc-v s">${slots}</p></div>` : ''}${res ? `<div class="tp-blk"><p class="rc-l">${t('fight.res')}</p>${res}</div>` : ''}</div><p class="note">${t('fight.roNote')}</p>`;
  }
  const tags = [...conds.map(n => `<span class="tag t-bad sm">✕ ${esc(n)}</span>`), conc ? `<span class="tag t-conc sm">◇ ${esc(conc)}</span>` : ''].join('');
  return `<section class="turnp">
    <div class="tp-head rc-aub">${corners({ top: true, sm: true })}<span class="tp-ic">${who(c)}</span><div><span class="rc-l">${t('fight.atTurn')}${c.live ? ' · ' + t('peek.roShort') : ''}</span><h3>${esc(c.name)}</h3><span class="rc-s">${p ? esc([p.klass, p.level].filter(Boolean).join(' ')) : ''}</span></div></div>
    ${stamps}<div class="tp-body"><div class="srow">${sv(t('dm.acShort'), ac)}${sv(t('head.hpShort'), `${hp}<span class="mx"> / ${hpMax}</span>`)}${sv(t('fight.initShort'), c.init)}</div>${tags ? `<div class="tags">${tags}</div>` : ''}${(() => { const h = vHit(c, 'pc', '', '', 'foes'); return h ? `<section class="hub-panel tp-hit"><p class="rc-l">${t('fight.pcHits', { n: esc(c.name) })}</p>${h}</section>` : ''; })()}${sheet}</div></section>`;
}
/** Eingreifen (11.4): wirkt auf die ausgewählte Figur, ohne Untermenü. Desktop: feste Spalte; Handy: Blatt, wenn ausgewählt. */
function vEin(c, opened) {
  if (!c) return '';
  const p = c.live && L.role === 'dm' && players().find(x => x.key === c.live), mon = c.kind === 'mon';
  const num = (f, l, v) => `<label><span class="rc-l">${l}</span><input type="number" class="n" id="dm-${f}-${c.id}" data-dm="${f}" data-id="${c.id}" value="${v ?? ''}"></label>`;
  const hp = p ? vLiveSend(p) : `<div class="ein-row"><input type="number" class="n" id="dm-amp-${c.id}" min="1" placeholder="1" aria-label="${t('hp.amount')}"><button class="btn sm bad" data-a="dmhp" data-src="dm-amp-${c.id}" data-id="${c.id}" data-d="-1">− ${t('fight.dmg')}</button><button class="btn sm good" data-a="dmhp" data-src="dm-amp-${c.id}" data-id="${c.id}" data-d="1">+ ${t('hp.heal')}</button><button class="btn sm" data-a="dmtmp" data-src="dm-amp-${c.id}" data-id="${c.id}">${t('live.temp')}</button></div>`;
  const vals = p ? '' : `<p class="rc-l">${t('fight.values')}</p><div class="ein-vals">${num('ac', t('dm.acShort'), c.ac)}${num('hp', t('head.hpShort'), c.hp)}${num('hpMax', t('fight.max'), c.hpMax)}</div>`;
  const vis = mon ? `<p class="rc-l">${t('fight.pubTitle')}</p><div class="chips">${[['cr', !c.hideCr, t('fight.pubCr')], ['ac', !!c.showAc, t('fight.pubAc')], ['gone', !!c.gone, t('fight.gone')]].map(([f, on, l]) => `<button class="chip tgl${on ? ' on' : ''}" data-a="dmpub" data-id="${c.id}" data-f="${f}" aria-pressed="${on}"><i aria-hidden="true"></i>${l}</button>`).join('')}</div>` : '';
  const conds = `<p class="rc-l">${t('fight.conds')}</p><div class="chips">${COND.map(x => `<button class="chip${c.cond[x.n] ? ' on' : ''}" data-a="dmcond" data-id="${c.id}" data-c="${x.n}" aria-pressed="${!!c.cond[x.n]}" title="${esc(x.n)}">${cName(x)}${c.cond[x.n] ? ' ✕' : ''}</button>`).join('')}</div>`;
  const fx = `<p class="rc-l">${t('fight.effects')}</p>${(c.fx || []).length ? `<div class="chips">${c.fx.map(f => `<button class="chip on" data-a="dmfxdel" data-id="${c.id}" data-f="${f.id}" title="${t('item.remove')}">${esc(f.n)} · ${f.r} ✕</button>`).join('')}</div>` : ''}<div class="add" style="margin:4px 0 0"><input type="text" id="dm-fxn-${c.id}" placeholder="${t('dm.fxName')}" aria-label="${t('dm.fxName')}"><input type="number" class="n" id="dm-fxr-${c.id}" min="1" value="10" aria-label="${t('dm.fxRounds')}" title="${t('dm.fxRounds')}"><button class="btn sm" data-a="dmfx" data-id="${c.id}">${t('dm.fxAdd')}</button></div>`;
  const conc = p ? '' : `<p class="rc-l">${t('conc.title')}</p><div class="add" style="margin:0"><input type="text" id="dm-conc-${c.id}" data-dm="conc" data-id="${c.id}" value="${esc(c.conc || '')}" placeholder="${t('fight.concPh')}" aria-label="${t('conc.title')}">${c.conc ? `<button class="btn sm" data-a="dmconcend" data-id="${c.id}">${t('fight.concEnd')}</button>` : ''}</div>`;
  const slots = (c.slots || []).map((s, k) => `<div class="lvh" style="padding:2px 0;border:0"><small>${s.lbl ? esc(s.lbl) : t('spell.level', { n: s.lvl })}</small><div class="pips">${pipsOf(s, `data-a="dmslot" data-id="${c.id}" data-k="${k}"`)}</div></div>`).join('');
  const note = `<input type="text" class="wide" id="dm-note-${c.id}" data-dm="note" data-id="${c.id}" value="${esc(c.note)}" placeholder="${t('dm.rowNote')}" aria-label="${t('dm.rowNote')}">`;
  const foot = `<div class="add">${c.kind === 'pc' && c.live ? `<button class="btn sm" data-a="peek" data-k="${esc(c.live)}" data-n="${esc(c.name)}">${t('peek.btn')}</button>` : ''}<button class="btn sm bad" data-a="dmrm" data-id="${c.id}">${t('item.remove')}</button></div>`;
  const stat = mon && c.id !== D.combat.active ? `<details class="tp-full"><summary>${t('fight.fullText')}</summary>${statBlock(c)}</details>` : '';
  // Ziel wechseln ohne Suchen: alle Figuren als Chips (Gruppe zuerst), die gewählte hervorgehoben
  const all = ordered(), tgts = [...all.filter(x => x.kind !== 'mon'), ...all.filter(x => x.kind === 'mon')];
  const pick = tgts.length > 1 ? `<div class="ein-tgt"><span class="rc-l">${t('fight.target')}</span><div class="chips">${tgts.map(x => `<button class="chip${x.id === c.id ? ' on' : ''}${x.hp === 0 && x.hpMax ? ' off' : ''}" data-a="dmfocus" data-id="${x.id}" aria-pressed="${x.id === c.id}">${esc(x.name)}</button>`).join('')}</div></div>` : '';
  const body = `${pick}<div class="ein-h"><span class="rc-l">${t('fight.ein')}</span><b class="rc-n">${esc(c.name)}</b><span class="rc-v s">${c.hp}<span class="mx">/${c.hpMax}</span></span>${opened ? `<button class="btn sm" data-a="dmclose">${t('common.close')}</button>` : ''}</div>${hp}${vals}${vis}${conds}${fx}${conc}${slots}${note}${stat}${foot}`;
  return opened ? `<div class="ovl dm-ovl ein-wrap"><div class="dlg dm-dlg ein" role="dialog" aria-modal="true" aria-label="${t('fight.ein')}: ${esc(c.name)}">${body}</div></div>` : `<section class="ein ein-inline">${body}</section>`;
}
/** Karte einer Figur: Gruppe und Gegner gleich aufgebaut (10.2). Initiative, Name mit Klasse oder HG, RK und TP, Balken,
 * Zustände und Wirkungen in fester dritter Zeile, schnelle TP-Änderung. Name antippen wählt die Figur für „Eingreifen“. */
function row(c, active, sel) {
  const down = c.kind === 'mon' && c.hp <= 0, conds = COND.filter(x => c.cond[x.n]), m = c.kind === 'mon' && findMonster(c.mon);
  const p = c.live && players().find(x => x.key === c.live), wait = c.live && L.role === 'dm' && pendingFor(c.live, c.pet || '');
  const meta = c.kind === 'pet' ? t('live.petTag', { n: esc(c.owner || '') }) : m ? `${t('fight.cr')} ${crText(m.cr)}` : p ? esc([p.klass, p.level].filter(Boolean).join(' ')) : '';
  const ac = c.acB ? `<span class="rc-v s ${c.acB > 0 ? 'buff' : 'debuff'}" title="${esc((c.fx || []).map(x => t('buff.from', { s: x.s, n: x.by })).join('; '))}">${c.ac}</span>` : `<span class="rc-v s">${c.ac}</span>`;
  const tags = [...conds.map(x => `<span class="tag t-bad sm" title="${esc(x.n)}">✕ ${cName(x)}</span>`), ...(c.fx || []).filter(x => x.s).map(x => `<span class="tag ${x.good ? 't-good' : 't-bad'} sm">${esc(x.s)}</span>`), c.conc ? `<span class="tag t-conc sm dm-conc">${t('live.concShort', { n: esc(c.conc) })}</span>` : '', c.gone ? `<span class="tag sm">${t('fight.gone')}</span>` : '', wait ? `<span class="dm-wait">${t('live.waitAck')}</span>` : ''].filter(Boolean);
  const chips = (c.fx || []).map(f => `<button class="chip sm" data-a="dmfxdel" data-id="${c.id}" data-f="${f.id}" title="${t('item.remove')}">${esc(f.n)} <b>${f.r}</b></button>`).join('');
  const la = c.la ? `<span class="dm-la"><span class="lbl">LA</span><span class="pips">${pipsOf(c.la, `data-a="dmla" data-id="${c.id}"`)}</span></span>` : '';
  return `<div class="dm-row uc${c.kind === 'mon' ? ' foe' : ''}${active ? ' on rc-cur' : ''}${sel && !active ? ' rc-sel' : ''}${down ? ' down' : ''}${c.kind === 'pet' ? ' pet' : ''}${c.live ? ' live' : ''}">${active ? flag(t('fight.flagNow')) : sel ? flag(t('fight.flagSel')) : ''}
    <div class="dm-main">
      <input type="number" class="n dm-init" id="dm-init-${c.id}" data-dm="init" data-id="${c.id}" value="${c.init}" aria-label="${t('stat.init')} ${esc(c.name)}" title="${t('stat.init')}">
      ${who(c)}
      <button class="dm-name" data-a="dmopen" data-id="${c.id}" aria-expanded="${!!sel}"><b>${esc(c.name)}</b><small>${meta}</small></button>
      <span class="u-st"><span class="rc-l">${t('dm.acShort')}</span>${ac}<span class="rc-l">${t('head.hpShort')}</span><span class="dm-hpv rc-v s"><b>${c.hp}</b><span class="mx">/${c.hpMax}${c.tmp ? ' +' + c.tmp : ''}</span></span></span>
      ${hpb(c.hp, c.hpMax)}
      <span class="u-tags">${tags.join('') || `<span class="none">${t('fight.noCond')}</span>`}${chips ? `<span class="chips dm-fx">${chips}</span>` : ''}${la}</span>
      <div class="dm-hp"><button data-a="dmhp" data-id="${c.id}" data-d="-1" aria-label="${t('hp.damage')} ${esc(c.name)}">−</button><input type="number" class="n" id="dm-amt-${c.id}" min="1" placeholder="1" aria-label="${t('hp.amount')}"><button data-a="dmhp" data-id="${c.id}" data-d="1" aria-label="${t('hp.heal')} ${esc(c.name)}">+</button></div>
    </div>
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
    <aside class="prep-col prep-go"><button class="btn gold big" data-a="dmstep" data-d="1"${list.length ? '' : ' disabled'}>${t('fight.start')}</button><p class="note">${t('fight.startHint', { a: pcs.length, b: foes.length })}</p>${turns}${clear}${xpOn() ? `<button class="btn" data-a="dmxpopen" aria-expanded="${!!DU.xpOpen}">${t('xp.share')}</button>${vXpShare()}` : ''}</aside></div>${(() => { const id = Object.keys(DU.open || {}).find(k => DU.open[k]), x = id && list.find(y => y.id === id); return x ? vEin(x, true) : ''; })()}`;
  }
  const side = U.FSIDE === 'foes' ? 'foes' : 'pcs';
  const selId = Object.keys(DU.open || {}).find(k => DU.open[k]), sel = selId && list.find(x => x.id === selId), tgt = sel || nn.cur;
  const col = (k, title, arr) => `<section class="fight-col ${k}${side === k ? ' show' : ''}"><h3 class="ov-h">${title} <small>${arr.length}</small></h3>${arr.length ? `<div class="dm-list">${arr.map(x => row(x, x.id === c.active, x.id === tgt?.id)).join('')}</div>` : `<p class="note">${t('fight.none')}</p>`}</section>`;
  const feedL = (DU.flog || []).length ? `<ul class="feed">${DU.flog.map(f => `<li class="${f.kind}"><span class="r">R${f.r}</span><span>${esc(f.text)}</span></li>`).join('')}</ul>` : `<p class="note">${t('fight.feedNone')}</p>`;
  const turn = nn.cur ? (nn.cur.kind === 'mon' ? vTurnFoe(nn.cur) : vTurnPc(nn.cur)) : '';
  return `<div class="fight-state on rc-aub">${corners({ top: true, sm: true })}<div class="fs-top"><span class="fs-badge">${t('fight.active')}</span><b class="fs-round">${t('turn.round', { n: c.round })}</b><span>${t('turn.now', { n: `<b>${esc(nn.cur?.name || '?')}</b>` })}${nn.next ? ' · ' + t('turn.next', { n: esc(nn.next.name) }) : ''}</span><span class="fs-btns"><button class="btn" data-a="dmstep" data-d="-1">${t('dm.prev')}</button><button class="btn gold big" data-a="dmstep" data-d="1">${t('dm.next')}</button></span></div>${vInitBar(list, nn.cur, nn.next)}</div>
  <div class="fight3"><div class="f3-list"><div class="seg fight-tabs" role="group">${['pcs', 'foes'].map(k => `<button class="tg${side === k ? ' on' : ''}" data-a="fside" data-k="${k}" aria-pressed="${side === k}">${t('fight.side.' + k)}</button>`).join('')}</div>
  <div class="fight-cols">${col('pcs', t('fight.side.pcs'), pcs)}${col('foes', t('fight.side.foes'), foes)}</div></div>
  <div class="f3-turn">${turn}</div>
  <div class="f3-side">${vEin(tgt, !!sel)}<section class="f3-feed hub-panel"><div class="hub-h sm"><h3>${t('fight.feed')}</h3></div>${feedL}</section></div></div>
  <div class="card fight-ctl"><div class="dm-bar">${turns}${xpOn() ? `<button class="btn" data-a="dmxpopen" aria-expanded="${!!DU.xpOpen}">${t('xp.share')}</button>` : ''}<button class="btn ${DU.conf === 'end' ? 'warn' : 'bad'}" data-a="dmfightend">${DU.conf === 'end' ? t('fight.endConfirm') : t('fight.end')}</button>${clear}</div>${xpOn() ? vXpShare() : ''}<details class="fight-add"><summary>${t('dm.addTitle')}</summary>${vLiveAdd()}${add}</details><p class="note">${t('dm.hint')}</p></div>`;
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
  const can = ['session', 'plot'];
  const items = (DU.bookRev ? list : [...list].reverse()).map(n => { const sh = n.pub && can.includes(n.kind); return { id: n.id, pub: can.includes(n.kind) ? !!sh : false, title: n.title, meta: t('dm.kind.' + n.kind), body: n.body, cls: sh ? 'shared' : '', tags: sh ? `<span class="tag t-good sm">${t('chron.sharedTag')}</span>` : `<span class="tag sm" title="${t('chron.privHint2')}">🔒 ${t('chron.private')}</span>`, act: `${can.includes(n.kind) ? `<button class="btn sm${sh ? ' solid' : ''}" data-a="bookpub" data-id="${n.id}" aria-pressed="${!!sh}">${t(sh ? 'chron.unshare' : 'chron.share')}</button>` : ''}<button class="btn sm" data-a="dmsel" data-id="${n.id}" data-v="notes">${t('dm.open')}</button>`, extra: sh ? `<label class="chron-pub"><span class="lbl">${t('chron.groupText')}</span><textarea rows="4" data-bookpub="${n.id}" aria-label="${t('chron.groupText')}">${esc(n.pubText || '')}</textarea></label>` : '' }; });
  return `<div class="chips">${['session', 'plot', 'place', 'npc', 'all'].map(k => `<button class="chip${f === k ? ' on' : ''}" data-a="bookf" data-k="${k}" aria-pressed="${f === k}">${k === 'all' ? t('dm.kindAll') : t('dm.kind.' + k)}</button>`).join('')}<button class="chip" data-a="bookrev" aria-pressed="${!!DU.bookRev}">${t(DU.bookRev ? 'chron.newest' : 'chron.oldest')}</button><button class="btn sm solid" data-a="dmnews">${t('dm.newSession')}</button></div>
  <p class="note">${t('chron.dmHint2')}</p>${V2.on === false ? `<p class="note warnnote">${t('chron.noSql')}</p>` : L.role === 'dm' && L.code ? '' : `<p class="note">${t('chron.offline')}</p>`}${book({ title: (U.CAMP && campaignById(U.CAMP)?.name) || t('chron.bookTitle'), sub: t('chron.bookSubDm'), entries: items, sel: U.BOOKSEL, empty: t('chron.sharedNone') })}`;
}
function vNotes() {
  const v = DU.chronV || 'notes';
  const tabs = `<div class="seg chron-tabs" role="group">${['book', 'notes'].map(k => `<button class="tg${v === k ? ' on' : ''}" data-a="chronv" data-k="${k}" aria-pressed="${v === k}">${t('chron.v.' + k)}</button>`).join('')}</div>`;
  if (v === 'book') return tabs + vBook();
  return tabs + vNotesInner();
}
function vNotesInner() {
  const n = curNote();
  return `${vHere()}<div class="wtools"><input type="search" id="dm-nq" value="${esc(DU.nq)}" placeholder="${t('dm.noteSearch')}" aria-label="${t('dm.noteSearch')}"><button class="btn solid" data-a="dmnew">${t('dm.newNote')}</button><button class="btn solid" data-a="dmnewp">${t('dm.newPlace')}</button><button class="btn solid" data-a="dmnews">${t('dm.newSession')}</button></div>
  <div class="chips dm-nk">${['', ...KINDS].map(k => `<button class="chip${(DU.nk || '') === k ? ' on' : ''}" data-a="dmnk" data-k="${k}" aria-pressed="${(DU.nk || '') === k}">${k ? t('dm.kind.' + k) : t('dm.kindAll')}</button>`).join('')}</div>
  <div class="wiki"><div class="wl" id="dm-nlist">${vNoteList()}</div><div class="wd pane notebook">${n ? noteBody(n) : `<p class="empty">${t('dm.noteNone')}</p>`}</div></div>`;
}
/** XP-System der geöffneten Kampagne (ohne Kampagne wie bisher an). */
const xpOn = () => { const c = U.CAMP && campaignById(U.CAMP); return !c || progOf(c) === 'xp'; };
/** XP verteilen: besiegte Monster zusammenzählen, durch die Spieler teilen, an alle schicken. */
function vXpShare() {
  if (!DU.xpOpen) return '';
  const { list, xp } = defeatedXp(), n = players().length || D.combat.list.filter(c => c.kind === 'pc').length || 1;
  return `<div class="card xpshare"><p class="lbl" style="margin:0 0 6px">${t('xp.share')}</p><p>${list.length ? t('xp.defeated', { m: list.map(c => esc(c.name)).join(', '), n: xp }) : t('xp.noneDefeated')}</p><div class="add"><label class="ck">${t('xp.total')} <input type="number" class="n" id="dm-xpt" min="0" value="${xp}"></label><label class="ck">${t('xp.players')} <input type="number" class="n" id="dm-xpn" min="1" value="${n}"></label><button class="btn solid" data-a="dmxpsend">${t('xp.send')}</button></div><p class="note">${L.role === 'dm' && L.status === 'on' ? t('xp.sendNote') : t('xp.offline')}</p></div>`;
}
/** Stand der serverseitigen Absicherung (D3) für die Spielleitung. */
export function vSecState() {
  const m = SEC.mode, plain = players().some(p => !p.est && !p.sec && p.hpMax > 0 && !p.hq);
  const k = m === 'on' ? (plain ? 'sec.mixed' : 'sec.on') : m === 'foreign' ? 'sec.foreign' : 'sec.off';
  return `<p class="sec-state ${m}${plain ? ' mixed' : ''}" role="status"><b>${t('sec.title')}</b> ${t(k)}</p>`;
}
function vLive() {
  if (L.role !== 'dm') return `<div class="card"><p class="note" style="margin-top:0">${t('live.dmIntro')}</p>${L.role === 'player' ? `<p class="note">${t('live.dmBusy')}</p>` : ''}<div class="add"><button class="btn solid" data-a="livecreate">${t('live.create')}</button></div><div class="add"><input type="text" id="live-dmcode" maxlength="6" autocomplete="off" placeholder="${t('live.codePh')}" aria-label="${t('live.code')}"><button class="btn" data-a="livedmjoin">${t('live.dmReopen')}</button></div><p class="note">${t('live.dmReopenHint')}</p></div>`;
  const list = players();
  return `${vSecState()}<h3 class="cs-h4">${t('dm.roomTitle')}</h3><div class="card"><div class="dm-bar"><div class="live-code"><small>${t('live.code')}</small><b>${esc(L.code)}</b></div>${liveState()}<button class="btn" data-a="liveadd"${list.length ? '' : ' disabled'}>${t('live.addAll')}</button><button class="btn bad" data-a="liveoff">${t('live.close')}</button></div>
  ${list.length ? '<div class="party-grid dm">' + list.map(p => { const inC = inCombat(p.key); return `<div class="dm-prow">${memberCard(p, `<div class="mc-act"><div class="add" style="margin:4px 0">${inC ? `<span class="chip on">${t('live.inCombat')}</span>` : `<button class="btn sm" data-a="liveadd1" data-k="${esc(p.key)}">${t('live.addOne')}</button>`}<button class="btn sm" data-a="peek" data-k="${esc(p.key)}" data-n="${esc(p.name)}">${t('peek.btn')}</button></div>${vLiveSend(p)}</div>`, true)}</div>`; }).join('') + '</div>' : `<div class="empty">${t('live.waiting')}</div>`}${vCloud()}</div>${vHandoutForm(list)}`;
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
/** Startauswahl einer vorbereiteten Begegnung: Gegner an- und abwählen, Anzahl ändern, weitere aus dem Katalog dazu. */
export function vStartPickRes() {
  const q = (DU.spq || '').trim();
  if (!q) return '';
  const hits = searchMonsters(q).slice(0, 8);
  return hits.length ? hits.map(m => `<div class="row"><div class="nm">${esc(m.n)}<small>${t('mon.cr')} ${crText(m.cr)} · ${monSrc(m)}</small></div><button class="btn sm" data-a="spadd" data-m="${esc(m.id)}">${t('common.add')}</button></div>`).join('') : `<p class="empty">${t('wiki.nothing')}</p>`;
}
function vStartPick() {
  const P = DU.startPick;
  if (!P) return '';
  const rows = P.rows.map((r, i) => { const m = findMonster(r.id); return m ? `<div class="sp-row${r.on ? '' : ' off'}"><label class="ck"><input type="checkbox" data-a="spon" data-i="${i}"${r.on ? ' checked' : ''}> <b>${esc(m.n)}</b></label><small>${t('mon.cr')} ${crText(m.cr)} · ${monSrc(m)}</small><div class="qty"><button data-a="spqty" data-i="${i}" data-d="-1" aria-label="${t('common.less')}">−</button><span>${r.qty}</span><button data-a="spqty" data-i="${i}" data-d="1" aria-label="${t('common.more')}">+</button></div></div>` : ''; }).join('');
  const n = P.rows.filter(r => r.on).reduce((a, r) => a + r.qty, 0);
  return `<div class="ovl"><div class="dlg sp-dlg" role="dialog" aria-modal="true" aria-labelledby="sp-h"><h3 id="sp-h">${t('sp.title')}</h3><p class="note">${t('sp.hint')}</p><div class="chips"><button class="chip" data-a="spkall" data-v="1">${t('sp.all')}</button><button class="chip" data-a="spkall" data-v="0">${t('sp.none')}</button></div><div class="sp-list">${rows || `<p class="note">${t('sp.empty')}</p>`}</div>
  <h4>${t('sp.more')}</h4><div class="add"><input type="search" id="sp-q" value="${esc(DU.spq || '')}" placeholder="${t('dm.search')}" aria-label="${t('dm.search')}"></div><div id="sp-res">${vStartPickRes()}</div>
  <div class="dlgf"><button class="btn" data-a="spx">${t('common.cancel')}</button><button class="btn gold" data-a="spgo"${n ? '' : ' disabled'}>${t('sp.go', { n })}</button></div></div></div>`;
}
/** Herkunft eines Monsters: SRD 5.2.1, älterer Datensatz oder eigenes Monster. */
export const monSrc = m => t(D.custom.includes(m) ? 'src.own' : m.source === 'srd52' ? 'src.srd52' : 'src.legacy');
export function vDm(solo = false) {
  const tab = (k, l) => `<button class="chip${D.view === k ? ' on' : ''}" data-a="dmview" data-v="${k}" aria-pressed="${D.view === k}">${l}</button>`;
  const nav = solo ? `<h2>${t('dmm.view.' + D.view)}</h2>` : `<h2>${t('tab.dm')}</h2><div class="chips">${tab('combat', t('dm.combat'))}${tab('enc', t('dm.encounters'))}${tab('loot', t('loot.title'))}${tab('cheat', t('dm.cheat'))}${tab('notes', t('dm.notes'))}${tab('live', t('live.title'))}</div>`;
  return `${vStartPick()}${nav}<div style="margin-top:14px">${D.view === 'notes' ? vNotes() : D.view === 'live' ? vLive() : D.view === 'enc' ? vEncounters() : D.view === 'cheat' ? vCheat() : D.view === 'loot' ? vMerchants() + vLoot() : vCombat()}</div>
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
