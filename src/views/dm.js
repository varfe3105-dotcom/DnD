import { esc, mod, sg } from '../util.js';
import { COND } from '../catalog.js';
import { t, nameLine, dist } from '../i18n/index.js';
import { L, players } from '../live.js';
import { D, DU, MONSTERS, ordered, searchMonsters, KINDS, curNote, linksOf, noteByTitle, backlinks, searchNotes } from '../dm.js';

const ABK = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const crText = c => (c === 0.125 ? '1/8' : c === 0.25 ? '1/4' : c === 0.5 ? '1/2' : c);

export function vResults() {
  const hits = searchMonsters(DU.mq);
  if (!DU.mq.trim()) return '';
  if (!hits.length) return `<p class="empty">${t('wiki.nothing')}</p>`;
  return hits.map(m => `<div class="row"><div class="nm">${esc(m.n)}<small>${esc(m.size)} ${esc(m.type)} · CR ${crText(m.cr)} · ${t('dm.acShort')} ${m.ac} · ${t('head.hpShort')} ${m.hp}</small></div><button class="btn sm solid" data-a="dmadd" data-m="${esc(m.id)}">${t('common.add')}</button></div>`).join('');
}
function statBlock(c) {
  const m = MONSTERS.find(x => x.id === c.mon);
  if (!m) return '';
  return `<div class="dm-stat"><dl class="sm">${ABK.map(k => `<div><dt>${t('abs.' + k)}</dt><dd>${m.abil[k]} (${sg(mod(m.abil[k]))})</dd></div>`).join('')}</dl><p class="cls">${esc(m.size)} ${esc(m.type)} · CR ${crText(m.cr)} · ${esc(m.speed)}${m.hd ? ' · ' + esc(m.hd) : ''}</p><p class="ptext">${esc(m.text)}</p><p class="src">${t('dm.srcMonster')}</p></div>`;
}
function row(c, active) {
  const open = DU.open[c.id], down = c.kind === 'mon' && c.hp <= 0, conds = COND.filter(x => c.cond[x.n]);
  return `<div class="dm-row${active ? ' on' : ''}${down ? ' down' : ''}">
    <div class="dm-main">
      <input type="number" class="n dm-init" id="dm-init-${c.id}" data-dm="init" data-id="${c.id}" value="${c.init}" aria-label="${t('stat.init')} ${esc(c.name)}">
      <button class="dm-name" data-a="dmopen" data-id="${c.id}" aria-expanded="${!!open}"><b>${esc(c.name)}</b><small>${t('dm.acShort')} ${c.ac}${conds.length ? ' · ' + conds.map(x => esc(x.n)).join(', ') : ''}</small></button>
      <div class="dm-hp"><button data-a="dmhp" data-id="${c.id}" data-d="-1" aria-label="${t('hp.damage')} ${esc(c.name)}">−</button><input type="number" class="n" id="dm-amt-${c.id}" min="1" placeholder="1" aria-label="${t('hp.amount')}"><button data-a="dmhp" data-id="${c.id}" data-d="1" aria-label="${t('hp.heal')} ${esc(c.name)}">+</button><span class="dm-hpv"><b>${c.hp}</b>/${c.hpMax}</span></div>
    </div>
    ${open ? `<div class="dm-more"><div class="chips">${COND.map(x => `<button class="chip${c.cond[x.n] ? ' on' : ''}" data-a="dmcond" data-id="${c.id}" data-c="${x.n}" aria-pressed="${!!c.cond[x.n]}">${esc(nameLine(x.n, x.de))}</button>`).join('')}</div>
      <input type="text" class="wide" id="dm-note-${c.id}" data-dm="note" data-id="${c.id}" value="${esc(c.note)}" placeholder="${t('dm.rowNote')}" aria-label="${t('dm.rowNote')}">
      ${statBlock(c)}
      <button class="btn sm bad" data-a="dmrm" data-id="${c.id}">${t('item.remove')}</button></div>` : ''}
  </div>`;
}
function vCombat() {
  const c = D.combat, list = ordered();
  return `<div class="card"><div class="dm-bar"><div class="dm-round"><small>${t('dm.round')}</small><b>${c.round}</b></div><button class="btn" data-a="dmstep" data-d="-1">${t('dm.prev')}</button><button class="btn solid" data-a="dmstep" data-d="1">${t('dm.next')}</button><button class="btn ${DU.conf === 'clear' ? 'warn' : 'bad'}" data-a="dmclear">${DU.conf === 'clear' ? t('dm.clearConfirm') : t('dm.clear')}</button></div>
  ${list.length ? `<div class="dm-list">${list.map(x => row(x, x.id === c.active)).join('')}</div><p class="note">${t('dm.hint')}</p>` : `<div class="empty">${t('dm.empty')}</div>`}</div>
  <h2>${t('dm.addTitle')}</h2><div class="card"><div class="add"><input type="search" id="dm-mq" value="${esc(DU.mq)}" placeholder="${t('dm.search')}" aria-label="${t('dm.search')}"><input type="number" class="n" id="dm-qty" min="1" max="20" value="1" aria-label="${t('common.count')}"></div><div id="dm-results">${vResults()}</div>
  <div class="add"><input type="text" id="dm-mn" placeholder="${t('common.name')}"><input type="number" class="n" id="dm-mac" min="0" placeholder="${t('dm.acShort')}" aria-label="${t('stat.ac')}"><input type="number" class="n" id="dm-mhp" min="0" placeholder="${t('head.hpShort')}" aria-label="${t('setup.maxHp')}"><button class="btn" data-a="dmman">${t('common.add')}</button><button class="btn" data-a="dmchars">${t('dm.addChars')}</button></div></div>`;
}
function noteBody(n) {
  const links = linksOf(n), back = backlinks(n);
  return `<div class="dm-edit"><div class="add" style="margin-top:0"><input type="text" id="dm-ntitle" data-dmn="title" value="${esc(n.title)}" placeholder="${t('dm.noteTitle')}" aria-label="${t('dm.noteTitle')}"><select id="dm-nkind" data-dmn="kind" aria-label="${t('dm.noteKind')}">${KINDS.map(k => `<option value="${k}"${n.kind === k ? ' selected' : ''}>${t('dm.kind.' + k)}</option>`).join('')}</select></div>
  <textarea id="dm-nbody" data-dmn="body" placeholder="${t('dm.notePh')}" aria-label="${t('dm.noteBody')}">${esc(n.body)}</textarea>
  ${links.length ? `<p class="lbl">${t('dm.links')}</p><div class="chips">${links.map(l => `<button class="chip${noteByTitle(l) ? '' : ' dm-new'}" data-a="dmlink" data-t="${esc(l)}">${esc(l)}</button>`).join('')}</div>` : ''}
  ${back.length ? `<p class="lbl">${t('dm.backlinks')}</p><div class="chips">${back.map(o => `<button class="chip" data-a="dmsel" data-id="${o.id}">${esc(o.title || t('dm.untitled'))}</button>`).join('')}</div>` : ''}
  <div class="add"><button class="btn sm ${DU.conf === 'note' ? 'warn' : 'bad'}" data-a="dmndel" data-id="${n.id}">${DU.conf === 'note' ? t('item.removeConfirm') : t('item.remove')}</button></div></div>`;
}
export function vNoteList() {
  const list = searchNotes(DU.nq);
  return list.length ? list.map(n => `<button class="wli" data-a="dmsel" data-id="${n.id}" aria-current="${n.id === D.sel}"><span><b>${esc(n.title || t('dm.untitled'))}</b><small>${t('dm.kind.' + n.kind)}</small></span></button>`).join('') : `<p class="empty" style="padding:0 10px">${t('wiki.nothing')}</p>`;
}
function vNotes() {
  const n = curNote();
  return `<div class="wtools"><input type="search" id="dm-nq" value="${esc(DU.nq)}" placeholder="${t('dm.noteSearch')}" aria-label="${t('dm.noteSearch')}"><button class="btn solid" data-a="dmnew">${t('dm.newNote')}</button></div>
  <div class="wiki"><div class="wl" id="dm-nlist">${vNoteList()}</div><div class="wd">${n ? noteBody(n) : `<p class="empty">${t('dm.noteNone')}</p>`}</div></div>`;
}
function vLive() {
  if (L.role !== 'dm') return `<div class="card"><p class="note" style="margin-top:0">${t('live.dmIntro')}</p>${L.role === 'player' ? `<p class="note">${t('live.dmBusy')}</p>` : ''}<div class="add"><button class="btn solid" data-a="livecreate">${t('live.create')}</button></div></div>`;
  const list = players();
  return `<div class="card"><div class="dm-bar"><div class="live-code"><small>${t('live.code')}</small><b>${esc(L.code)}</b></div>${liveState()}<button class="btn" data-a="liveadd"${list.length ? '' : ' disabled'}>${t('live.addAll')}</button><button class="btn bad" data-a="liveoff">${t('live.close')}</button></div>
  ${list.length ? list.map(p => { const pct = p.hpMax ? Math.min(100, p.hp / p.hpMax * 100) : 0; return `<div class="dm-row${p.hp === 0 ? ' down' : ''}"><div class="dm-main"><div class="dm-name"><b>${esc(p.name)}</b><small>${esc(p.klass)}${p.level ? ' · ' + t('feat.level', { n: p.level }) : ''} · ${t('dm.acShort')} ${p.ac}${p.conc ? ' · ' + t('conc.title') + ': ' + esc(p.conc) : ''}${p.insp ? ' · ' + t('insp.title') : ''}</small></div><span class="dm-hpv"><b>${p.hp}</b>/${p.hpMax}${p.tmp ? ' +' + p.tmp : ''}</span></div><div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>${p.cond.length || p.exh ? `<div class="chips">${p.cond.map(c => `<span class="chip on">${esc(c)}</span>`).join('')}${p.exh ? `<span class="chip">${t('exh.title', { n: p.exh })}</span>` : ''}</div>` : ''}${p.hp === 0 ? `<p class="lbl">${t('death.s')} ${p.death.s} · ${t('death.f')} ${p.death.f}</p>` : ''}</div>`; }).join('') : `<div class="empty">${t('live.waiting')}</div>`}</div>`;
}
export function liveState() {
  const k = { on: 'live.on', connecting: 'live.connecting', error: 'live.error' }[L.status];
  return k ? `<span class="live-state ${L.status}">${t(k)}</span>` : '';
}
export function vDm() {
  const tab = (k, l) => `<button class="chip${D.view === k ? ' on' : ''}" data-a="dmview" data-v="${k}" aria-pressed="${D.view === k}">${l}</button>`;
  return `<h2>${t('tab.dm')}</h2><div class="chips">${tab('combat', t('dm.combat'))}${tab('notes', t('dm.notes'))}${tab('live', t('live.title'))}</div><div style="margin-top:14px">${D.view === 'notes' ? vNotes() : D.view === 'live' ? vLive() : vCombat()}</div>
  <details class="dm-backup"><summary>${t('setup.backup')}</summary><p class="note">${t('dm.backupHint')}</p><div class="add"><button class="btn" data-a="dmexp">${t('setup.export')}</button><button class="btn" data-a="dmimp">${t('setup.import')}</button></div>${DU.exp ? `<textarea id="dm-exp" readonly aria-label="${t('setup.exportLabel')}">${esc(DU.exp)}</textarea>` : ''}<textarea id="dm-imp" placeholder="${t('setup.pasteImport')}" aria-label="${t('setup.importLabel')}" style="margin-top:8px">${esc(DU.imp)}</textarea></details>`;
}
export { dist };
