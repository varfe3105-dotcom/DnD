// Vorschläge, Handouts, Sicherung und Beute.
import { esc } from '../util.js';
import { U, S } from '../state.js';
import { C } from '../cloud.js';
import { DU } from '../dm.js';
import { COND, CAT, BYN } from '../catalog.js';
import { L, players, dmTurn, myTurn } from '../live.js';
import { D } from '../dm.js';
import { lastBackup, needsBackup, charCount } from '../backup.js';
import { TIERS, COINS, raritiesFor, coinRow } from '../loot.js';
import { t, lang, dice } from '../i18n/index.js';

const COINK = ['pp', 'gp', 'ep', 'sp', 'cp'];
const coinList = c => COINK.filter(k => c[k]).map(k => `${c[k]} ${t('coin.' + k)}`).join(', ');
const proposalText = m => (m.type === 'levelup' ? t('live.pLevel') : m.type === 'cond' ? t('live.pCond', { c: m.cond }) : m.type === 'item' ? t('live.pItem', { q: m.q, n: m.key && BYN[m.key] ? BYN[m.key].n : m.n }) : m.type === 'gold' ? t('live.pGold', { c: coinList(m.coins) }) : t('live.p.' + m.type, { n: m.value }));

export function vInbox() {
  if (L.role !== 'player' || !L.inbox.length) return '';
  return `<div class="card inbox" role="status">${L.inbox.map(m => `<div class="row wrow"><div class="nm">${t('live.fromDm')}<small>${esc(proposalText(m))}</small></div><button class="btn sm solid" data-a="liveyes" data-id="${esc(m.id)}">${t('live.accept')}</button><button class="btn sm" data-a="liveno" data-id="${esc(m.id)}">${t('live.decline')}</button></div>`).join('')}</div>`;
}

export function vHandout() {
  const m = L.role === 'player' && L.handouts[0];
  if (!m) return '';
  return `<div class="ovl"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="ho-h"><h3 id="ho-h">${esc(m.title || t('live.handout'))}</h3>${m.img ? `<img class="ho-img" src="${esc(m.img)}" alt="">` : ''}${m.text ? `<p class="ho-text">${esc(m.text)}</p>` : ''}<div class="dlgf">${m.text || m.title ? `<button class="btn" data-a="honote">${t('live.toNotes')}</button>` : ''}<button class="btn solid" data-a="hoclose">${t('common.close')}</button></div></div></div>`;
}

export function vLiveSend(p) {
  const key = esc(p.key), bt = (type, cls, label) => `<button class="btn sm ${cls}" data-a="livesend" data-k="${key}" data-t="${type}">${label}</button>`;
  return `<div class="add live-send"><input type="number" class="n" id="lv-a-${key}" min="1" placeholder="${t('hp.amount')}" aria-label="${t('hp.amount')}">${bt('dmg', 'bad', t('hp.damage'))}${bt('heal', 'good', t('hp.heal'))}${bt('temp', '', t('live.temp'))}<select id="lv-c-${key}" aria-label="${t('cond.title')}"><option value="">${t('cond.title')}</option>${COND.map(c => `<option value="${esc(c.n)}">${esc(c.n)}</option>`).join('')}</select>${bt('cond', '', t('live.sendCond'))}</div>`;
}

export function vHandoutForm(list) {
  return `<h2>${t('live.handouts')}</h2><div class="card"><div class="add" style="margin-top:0"><input type="text" id="ho-t" value="${esc(DU.hoT || '')}" placeholder="${t('live.hoTitle')}" aria-label="${t('live.hoTitle')}"><select id="ho-to" aria-label="${t('live.hoTo')}"><option value="all">${t('live.hoAll')}</option>${list.map(p => `<option value="${esc(p.key)}"${DU.hoTo === p.key ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div><textarea id="ho-x" rows="3" placeholder="${t('live.hoText')}" aria-label="${t('live.hoText')}">${esc(DU.hoX || '')}</textarea>${DU.hoImg ? `<img class="ho-img sm" src="${esc(DU.hoImg)}" alt="">` : ''}<div class="add"><label class="btn sm" for="ho-f">${t('live.hoImage')}</label><input type="file" id="ho-f" accept="image/*" hidden>${DU.hoImg ? `<button class="btn sm bad" data-a="hoimgdel">${t('item.remove')}</button>` : ''}<button class="btn solid" data-a="hosend">${t('live.hoSend')}</button></div></div>`;
}

const when = at => { const d = new Date(at); return Number.isNaN(+d) ? at : d.toLocaleString(lang); };
export function vBackupNag() {
  if (!needsBackup()) return '';
  return `<div class="card baknag"><div class="row wrow"><div class="nm">${t('bak.nag')}<small>${t('bak.nagHint')}</small></div><button class="btn sm solid" data-a="bakdl">${t('bak.save')}</button><button class="btn sm" data-a="baklater">${t('bak.later')}</button></div></div>`;
}
export function vBackup() {
  const last = lastBackup(), r = U.RESTORE;
  return `<div class="add"><button class="btn solid" data-a="bakdl">${t('bak.save')}</button><label class="btn" for="bak-f">${t('bak.load')}</label><input type="file" id="bak-f" accept=".json,application/json" hidden></div><p class="note">${t('bak.hint')}${last ? ' ' + t('bak.last', { d: esc(when(last)) }) : ''}</p>
  ${r ? `<div class="bakpanel"><p>${t('bak.confirm', { d: esc(when(r.at)), n: charCount(r) })}</p><div class="add"><button class="btn warn" data-a="bakyes">${t('bak.replace')}</button><button class="btn" data-a="bakno">${t('common.cancel')}</button></div></div>` : ''}
  <div id="bak-hist">${vBakHist()}</div>`;
}
/** Eigener Bereich: Der Verlauf kommt asynchron und darf die übrige Seite nicht neu zeichnen. */
export function vBakHist() {
  const snaps = U.SNAPS || [];
  return snaps.length ? `<details class="bakhist"><summary>${t('bak.history')}</summary>${snaps.map(s => `<div class="row"><div class="nm">${esc(when(s.at))}<small>${t('bak.chars', { n: s.n })}</small></div><button class="btn sm" data-a="baksnap" data-at="${esc(s.at)}">${t('bak.restore')}</button></div>`).join('')}</details>` : '';
}

const coinText = s => (lang === 'de' ? dice(s).replace(/\bcp\b/g, 'KM').replace(/\bsp\b/g, 'SM').replace(/\bep\b/g, 'EM').replace(/\bgp\b/g, 'GM').replace(/\bpp\b/g, 'PM') : s);
const tier = () => DU.lt || '0-4';
export function vLootCoins() {
  const hit = coinRow(tier(), DU.lr);
  let low = 1;
  return COINS[tier()].map(([hi, txt], i) => { const r = `<tr${i === hit ? ' class="on"' : ''}><td>${String(low).padStart(2, '0')}–${hi === 100 ? '00' : hi}</td><td>${esc(coinText(txt))}</td></tr>`; low = hi + 1; return r; }).join('');
}
export function vLootItems() {
  const q = (DU.lq || '').trim().toLowerCase(), allowed = DU.lrar ? [DU.lrar] : raritiesFor(tier());
  const hits = CAT.filter(e => e.k === 'magic' && allowed.some(r => r.toLowerCase() === String(e.rar).toLowerCase()) && (!q || e.n.toLowerCase().includes(q) || (e.hay || '').toLowerCase().includes(q)));
  const online = L.role === 'dm' && L.status === 'on';
  return hits.slice(0, 30).map(e => `<div class="row"><div class="nm">${esc(e.n)}<small>${esc(e.rarity)}</small></div><button class="btn sm solid" data-a="lootsend" data-key="${esc(e.key)}"${online ? '' : ' disabled'}>${t('loot.send')}</button></div>`).join('') + (hits.length > 30 ? `<p class="note">${t('loot.more', { n: hits.length - 30 })}</p>` : '') + (hits.length ? '' : `<p class="empty">${t('wiki.nothing')}</p>`);
}
export function vLoot() {
  const online = L.role === 'dm' && L.status === 'on';
  return `<div class="card"><div class="add" style="margin-top:0"><label class="ck">${t('loot.tier')} <select id="dm-lt" aria-label="${t('loot.tier')}">${TIERS.map(x => `<option value="${x}"${x === tier() ? ' selected' : ''}>CR ${x}</option>`).join('')}</select></label><label class="ck">${t('loot.roll')} <input type="number" class="n" id="dm-lr" min="1" max="100" value="${esc(DU.lr || '')}" aria-label="${t('loot.roll')}"></label></div><div class="rs-t rs"><table class="loot"><tbody id="dm-lc">${vLootCoins()}</tbody></table></div><p class="note">${t('loot.coinHint')} ${t('src.summary')}</p></div>
  <h2>${t('loot.give')}</h2><div class="card"><div class="add" style="margin-top:0"><label class="ck">${t('live.hoTo')} <select id="dm-lto" aria-label="${t('live.hoTo')}"><option value="all">${t('loot.toAll')}</option>${players().map(p => `<option value="${esc(p.key)}"${DU.lto === p.key ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label></div><label class="ck"><input type="checkbox" id="dm-lock"${D.lootLock ? ' checked' : ''}> ${t('loot.lock')}</label><p class="note">${online ? t('loot.lockHint') : t('loot.offline')}</p>
  <div class="coins loot-coins">${COINK.map(k => `<label class="ck">${t('coin.' + k)} <input type="number" class="n" id="lc-${k}" min="0" aria-label="${t('coin.' + k)}"></label>`).join('')}<button class="btn sm solid" data-a="lootgold"${online ? '' : ' disabled'}>${t('loot.giveCoins')}</button></div>
  <details><summary>${t('loot.own')}</summary><div class="add"><input type="text" id="lo-n" placeholder="${t('common.name')}" aria-label="${t('common.name')}"><input type="text" id="lo-p" class="wide" placeholder="${t('inv.ownText')}" aria-label="${t('inv.ownText')}"><button class="btn sm solid" data-a="lootown"${online ? '' : ' disabled'}>${t('loot.give')}</button></div></details></div>
  <h2>${t('loot.items')}</h2><div class="card"><div class="add" style="margin-top:0"><input type="search" id="dm-lq" value="${esc(DU.lq || '')}" placeholder="${t('loot.search')}" aria-label="${t('loot.search')}"><select id="dm-lrar" aria-label="${t('loot.rarity')}"><option value="">${t('loot.allFit')}</option>${raritiesFor(tier()).map(r => `<option value="${r}"${r === DU.lrar ? ' selected' : ''}>${esc(t('rar.' + r.toLowerCase().replace(' ', '')))}</option>`).join('')}</select></div><div id="dm-li">${vLootItems()}</div></div>`;
}

/* ---- Online-Speicherung im Raum ---- */
const fmtAt = at => { try { return new Date(at).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; } };
export function vCloud() {
  if (!L.code || !L.role) return '';
  const mineK = L.role === 'dm' ? 'dm:dm' : 'char:' + S.id;
  const st = { saving: t('cloud.saving'), ok: C.at ? t('cloud.ok', { t: fmtAt(C.at) }) : t('cloud.ready'), conflict: t('cloud.conflict'), setup: t('cloud.setup'), error: t('cloud.error'), off: t('cloud.wait') }[C.status] || '';
  const rows = (C.list || []).filter(r => r.kind === 'char' || L.role === 'dm');
  const row = r => {
    const me = r.kind + ':' + r.id === mineK, ck = 'clouddel:' + r.kind + ':' + r.id;
    return `<div class="edrow"><span class="nm">${esc(r.kind === 'dm' ? t('cloud.dmData') : r.name || '?')}${me ? ` <span class="lbl">${t('cloud.mine')}</span>` : ''}<small>${fmtAt(r.updated_at)}</small></span><button class="btn sm" data-a="cloudpull" data-kind="${esc(r.kind)}" data-id="${esc(r.id)}">${t('cloud.load')}</button>${L.role === 'dm' ? `<button class="btn sm ${U.CONF === ck ? 'warn' : 'bad'}" data-a="clouddel" data-kind="${esc(r.kind)}" data-id="${esc(r.id)}">${U.CONF === ck ? t('chars.delConfirm') : t('common.deleteBtn')}</button>` : ''}</div>`;
  };
  return `<div class="cloud"><p class="lbl" style="margin:10px 0 4px">${t('cloud.title')}</p><p class="cloud-st ${esc(C.status)}">${esc(st)}</p>${C.status === 'conflict' ? `<div class="add" style="margin-top:4px"><button class="btn solid" data-a="cloudpull" data-kind="${mineK.split(':')[0]}" data-id="${esc(mineK.split(':').slice(1).join(':'))}">${t('cloud.takeOnline')}</button><button class="btn" data-a="cloudforce">${t('cloud.keepMine')}</button></div>` : ''}${rows.length ? rows.map(row).join('') : C.list ? `<p class="note">${t('cloud.empty')}</p>` : ''}<div class="add"><button class="btn sm" data-a="cloudrefresh">${t('cloud.refresh')}</button>${C.status !== 'conflict' ? `<button class="btn sm" data-a="cloudnow">${t('cloud.now')}</button>` : ''}</div><p class="note">${t('cloud.note')}</p></div>`;
}

/* ---- Zuganzeige für Spieler ---- */
const TURN_LS = 'charbogen-turns';
export const turnsHidden = () => { try { return localStorage.getItem(TURN_LS) === 'off'; } catch (e) { return false; } };
export const setTurnsHidden = off => { try { if (off) localStorage.setItem(TURN_LS, 'off'); else localStorage.removeItem(TURN_LS); } catch (e) { /* Datenschutzmodus */ } };
export function vTurn() {
  if (L.role !== 'player' || L.status !== 'on' || turnsHidden()) return '';
  const tr = dmTurn();
  if (!tr) return '';
  const who = (n, enemy, cr) => `<b class="${enemy ? 'foe' : 'ally'}">${esc(n || (enemy ? t('turn.enemy') : '?'))}</b>${cr ? ` (${t('turn.cr', { n: esc(cr) })})` : ''}`;
  const next = tr.next || tr.nextEnemy ? ` · ${t('turn.next', { n: who(tr.next, tr.nextEnemy, tr.nextCr) })}` : '';
  if (myTurn()) return `<div class="turn mine" role="status"><div><b>${t('turn.mineTitle')}</b><small>${t('turn.round', { n: tr.r })}${next}</small></div><button class="btn solid" data-a="endturn">${t('turn.end')}</button></div>`;
  return `<div class="turn" role="status"><span class="lbl">${t('turn.round', { n: tr.r })}</span><span>${t('turn.now', { n: who(tr.name, tr.enemy, tr.cr) })}${next}</span></div>`;
}
