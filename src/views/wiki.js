import { esc } from '../util.js';
import { tok, itTone } from '../icons.js';
import { CLN, ABK } from '../constants.js';
import { S, U } from '../state.js';
import { get, refs, classOpts, raceTraits, abName, itemView, spellView, resText } from '../helpers.js';
import { CLASSES, RACES, CAT, BYN, COND, featText, SUBCLASSES } from '../catalog.js';
import { schoolName, srcNote, restLabel, featSrc } from './sheet.js';
import { t, loc, dice, dist, deName, nameLine } from '../i18n/index.js';

export const WFS = ['all', 'mine', 'spell', 'class', 'race', 'feat', 'potion', 'magic', 'item', 'cond', 'rule'];
export function myEntries() {
  return [...S.spells.map(spellView).map(s => Object.assign({ k: 'spell', mine: 1, c: s.lvl ? t('spell.level', { n: s.lvl }) : t('spell.cantrips') }, s)),
    ...refs().map(r => { const it = itemView(get(r)); return { k: 'item', mine: 1, n: it.n, ic: it.ic, artKey: it.ref, tone: itTone(it), p: it.p, c: r.startsWith('eq') ? t('wiki.equipped') : t('eq.bag') }; }),
    ...S.res.map(r => ({ k: 'res', mine: 1, n: r.n, ic: r.ic, p: resText(r), c: t('wiki.resOf', { r: restLabel(r.rest) }) })),
    ...[...raceTraits(), ...S.feats].map(f => ({ k: 'feat', mine: 1, n: f.n, ic: 'star', p: f.race ? f.p : featText(f), c: t('wiki.featOf', { s: featSrc(f) }) })),
    ...COND.filter(c => S.cond[c.n]).map(c => BYN['cond:' + c.n])].map((e, i) => Object.assign({}, e, { artKey: e.artKey || e.key || (e.k === 'spell' && e.src !== 'own' ? 'spell:' + e.n : ''), key: 'my:' + i + ':' + e.n }));
}
export function wList() {
  let L2 = U.WF === 'mine' ? myEntries() : CAT.filter(e => U.WF === 'all' || e.k === U.WF);
  if (U.WC) L2 = L2.filter(e => e.k !== 'spell' || (e.cls || '').includes(U.WC));
  const q = U.WQ.trim().toLowerCase();
  if (q) {
    const rank = e => { const n = e.n.toLowerCase(); return n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : String(e.de || '').toLowerCase().includes(q) ? 3 : 4; };
    L2 = L2.filter(e => [e.n, e.p, e.eff, e.de, e.aka, e.school, e.c, e.hay, e.school ? schoolName(e.school) : ''].join(' ').toLowerCase().includes(q)).map((e, i) => [rank(e), i, e]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]);
  }
  return L2;
}
export const wSub = e => e.k === 'spell' ? `${deName(e.n, e.de) ? e.de + ' · ' : ''}${e.lvl ? t('spell.level', { n: e.lvl }) : t('spell.cantrip')}${e.school ? ' · ' + schoolName(e.school) : ''}${e.conc ? ' · ' + t('spell.concShort') : ''}${e.ritual ? ' · ' + t('spell.ritual') : ''}` : e.k === 'cond' ? (deName(e.n, e.de) || e.c) : e.c + (e.att ? ' · ' + t('item.attuneTag') : '');
const CASTK = { full: 'cast.full', half: 'cast.half', pact: 'cast.pact', '': 'cast.none' };
const feat = (f, x) => `<p><b>${esc(f.n)}.</b> ${esc(dice(loc(f.text)))}</p>${x || ''}`;
const srcFoot = s => `<p class="src">${srcNote(s)}</p>`;
export const reqText = r => [...Object.entries(r.abil || {}).map(([k, v]) => `${abName(k)} ${v}`), r.prof || '', r.spell ? t('wiki.reqSpell') : ''].filter(Boolean).join(', ');
export function wDetail(e, inline) {
  if (!e) return `<p class="empty">${t('wiki.pick')}</p>`;
  const known = new Set(S.spells.map(s => s.n));
  let btn = '';
  if (!e.mine && e.k === 'spell') btn = known.has(e.n) ? `<button class="btn sm" disabled>${t('wiki.known')}</button>` : `<button class="btn sm solid" data-a="wadd" data-key="${esc(e.key)}">${t('wiki.addSpell')}</button>`;
  if (!e.mine && ['potion', 'magic', 'item'].includes(e.k)) btn = `<button class="btn sm solid" data-a="wadd" data-key="${esc(e.key)}">${t('inv.add')}</button>`;
  let body = '';
  if (e.k === 'spell') body = `${e.time || e.range || e.dur ? `<dl class="sm"><div><dt>${t('spell.time')}</dt><dd>${esc(e.time)}</dd></div><div><dt>${t('spell.range')}</dt><dd>${esc(e.range)}</dd></div><div><dt>${t('spell.dur')}</dt><dd>${esc(e.dur)}</dd></div></dl>` : ''}${e.aka ? `<p class="cls">PHB: ${esc(e.aka)}</p>` : ''}<p class="ptext">${esc(e.eff)}</p>${e.higher ? `<p class="ptext"><b>${t('spell.higher')}:</b> ${esc(e.higher)}</p>` : ''}${e.comp ? `<p class="cls">${t('spell.comp')}: ${esc(e.comp)}${e.material ? ' (' + esc(e.material) + ')' : ''}</p>` : ''}${e.cls ? `<p class="cls">${t('wiki.classes')}: ${e.cls.split('').map(c => CLN[c]).join(', ')}</p>` : ''}${srcFoot(e.src === 'own' ? 'own' : e.source)}`;
  else if (e.k === 'class') {
    const C = CLASSES[e.n];
    body = `<dl class="sm"><div><dt>${t('hd.title')}</dt><dd>${dice('W' + C.hd)}</dd></div><div><dt>${t('ab.saves')}</dt><dd>${C.sv.map(abName).join(', ')}</dd></div><div><dt>${t('wiki.casting')}</dt><dd>${t(CASTK[C.cast])}</dd></div></dl><p><b>${C.subN}</b> ${t('wiki.fromLevel', { n: C.subL })}: ${C.subs.join(', ')}.</p><div class="lvl">${Object.entries(C.f).map(([l, fs]) => `<h4>${t('feat.level', { n: l })}</h4>${fs.map(f => feat(f)).join('')}`).join('')}<p class="cls">${t('wiki.asiLevels', { a: C.asi.join(', '), b: C.sl.join(', ') })}</p></div>${Object.entries(SUBCLASSES[e.n] || {}).map(([sn, lv]) => `<details class="subc"><summary>${esc(sn)}</summary><div class="lvl">${Object.entries(lv).map(([l, fs]) => `<h4>${t('feat.level', { n: l })}</h4>${fs.map(f => feat(f)).join('')}`).join('')}</div></details>`).join('')}${srcFoot('summary')}`;
  } else if (e.k === 'race') {
    const R = RACES[e.n], subs = Object.entries(R.subs);
    body = `<dl class="sm"><div><dt>${t('wiki.abilities')}</dt><dd>${esc(loc(R.asi))}</dd></div><div><dt>${t('stat.speed')}</dt><dd>${dist(R.sp)}</dd></div><div><dt>${t('wiki.subraces')}</dt><dd>${subs.length || t('common.none')}</dd></div></dl><div class="lvl">${R.tr.map(f => feat(f)).join('')}${subs.map(([sn, sb]) => `<h4>${esc(nameLine(sn))}</h4><p class="cls">${esc(loc(sb.asi))}${sb.sp ? ' · ' + t('stat.speed') + ' ' + dist(sb.sp) : ''}</p>${sb.tr.map(f => feat(f)).join('')}`).join('')}</div>${srcFoot('summary')}`;
  } else if (e.k === 'feat') {
    body = `${e.req ? `<p class="cls">${t('wiki.prereq')}: ${esc(reqText(e.req))}</p>` : ''}<p class="ptext">${esc(dice(e.p))}</p>${srcFoot(e.source)}`;
  } else body = `${e.rarity ? `<p class="cls">${t('wiki.rarity')}: ${esc(e.rarity)}${e.att ? ' · ' + t('item.needsAttune') : ''}</p>` : ''}<p class="ptext">${esc(e.p)}</p>${e.source ? srcFoot(e.source) : ''}`;
  const de = (e.k === 'class' || e.k === 'race' || e.k === 'cond' || e.k === 'feat') && deName(e.n, e.de);
  return `<article class="wd${inline ? ' inl' : ' pane'}"><div class="wdh">${tok(e.ic, e.tone || (e.magic ? 'arcane' : ['item', 'potion'].includes(e.k) ? 'leather' : undefined), e.artKey || e.key)}<div><h3>${esc(e.n)}</h3><small>${esc(de && e.k !== 'cond' ? de + ' · ' + e.c : wSub(e))}</small></div></div>${btn ? `<div class="add" style="margin-top:0">${btn}</div>` : ''}${body}</article>`;
}
export function wikiBody() {
  const L2 = wList();
  if (!L2.length) return `<p class="empty">${t('wiki.nothing')}${U.WF === 'mine' ? t('wiki.nothingMine') : t('wiki.nothingAll')}</p>`;
  const max = 80, shown = L2.slice(0, max), sel = L2.find(e => e.key === U.WSEL), cur = sel || shown[0];
  return `<div class="wiki"><div class="wl" role="list">${shown.map(e => `<button class="wli" role="listitem" data-a="wsel" data-key="${esc(e.key)}" aria-current="${e === cur}">${tok(e.ic, e.tone || (e.magic ? 'arcane' : ['item', 'potion'].includes(e.k) ? 'leather' : undefined), e.artKey || e.key)}<span><b>${esc(e.n)}</b><small>${esc(wSub(e))}</small></span></button>${sel && e === sel ? wDetail(e, true) : ''}`).join('')}${L2.length > max ? `<p class="more" style="padding:0 10px">${t('wiki.more', { n: L2.length - max })}</p>` : ''}</div>${wDetail(cur, false)}</div>`;
}
export function vWiki() {
  return `<h2>${t('tab.wiki')}</h2><div class="wtools"><input type="search" id="wq" placeholder="${t('wiki.search')}" value="${esc(U.WQ)}" aria-label="${t('wiki.searchLabel')}"><select id="wc" aria-label="${t('wiki.classFilter')}">${classOpts(U.WC, t('wiki.allClasses'))}</select></div><div class="chips">${WFS.map(k => `<button class="chip${U.WF === k ? ' on' : ''}" data-a="wf" data-f="${k}" aria-pressed="${U.WF === k}">${t('wf.' + k)}</button>`).join('')}</div><div id="wres">${wikiBody()}</div>`;
}
