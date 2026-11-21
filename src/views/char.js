// Seiten der Charakterebene (Übersicht, Werte & Fähigkeiten, Zauber). Inventar und Notizen liegen in ihren eigenen Dateien,
// Bearbeiten ist views/setup.js. Alle Werte kommen direkt aus S und den vorhandenen Berechnungen, nichts wird zusätzlich gespeichert.
import { vPets } from './extras.js';
import { esc, mod, sg } from '../util.js';
import { S, U } from '../state.js';
import { ABK } from '../constants.js';
import { BUFFS } from '../buffs.js';
import { campaignsOf } from '../campaigns.js';
import { effects, hpMaxNow } from '../effects.js';
import { atk, itemView, initBonus, passivePerception, skv } from '../helpers.js';
import { t, dist, dice } from '../i18n/index.js';
import { spellStats } from '../tables.js';
import { concBanner, vFx, vAbil, vSkills, vFeats, vProfs, vSpells, acHtml } from './sheet.js';

const tag = (cls, html, title = '') => `<span class="tag ${cls}"${title ? ` title="${esc(title)}"` : ''}>${html}</span>`;
/** TP-Balken: gemeinsamer Baustein (Übersicht, Gruppe, Kampf). */
export const hpBar = (hp, max) => { const p = max ? Math.max(0, Math.min(100, hp / max * 100)) : 0; return `<span class="hpbar${p <= 25 ? ' low' : p <= 50 ? ' mid' : ''}" aria-hidden="true"><u style="width:${p}%"></u></span>`; };

/* ---- Übersicht: Titelblatt ---- */
function vNow() {
  const out = [];
  if (S.conc) out.push(tag('t-conc', `${t('conc.title')}: ${esc(S.conc)}`));
  Object.keys(S.cond).filter(c => S.cond[c]).forEach(c => out.push(tag('t-bad', esc(c))));
  if (S.exh) out.push(tag('t-bad', esc(t('exh.title', { n: S.exh }))));
  (S.buffs || []).forEach(b => out.push(tag(BUFFS[b.s]?.good === false ? 't-bad' : 't-good', esc(b.s), b.by ? t('buff.from', { s: b.s, n: b.by }) : '')));
  if (S.insp) out.push(tag('t-res', t('insp.short')));
  // Ressourcen: nur die ersten vier, alles Weitere im Kampf
  const res = S.res.filter(r => r.max > 0 && r.max < 99);
  const resHtml = res.slice(0, 4).map(r => `<span class="ov-res"><span>${esc(r.n)}</span><b>${r.max - r.used}<i>/${r.max}</i></b></span>`).join('');
  const more = res.length > 4 ? `<button class="linkbtn" data-a="tab" data-t="main">${t('ov.moreRes', { n: res.length - 4 })}</button>` : '';
  return `<section class="ov-col"><h3 class="ov-h">${t('ov.now')}</h3>${out.length ? `<div class="tags">${out.join('')}</div>` : `<p class="note">${t('ov.nothingNow')}</p>`}${resHtml ? `<div class="ov-resl">${resHtml}</div>${more}` : ''}</section>`;
}
function vGear() {
  const rows = [];
  const w = S.eq.main && atk(S.eq.main, 'main');
  const val = a => `<span class="rc-v s">${a.hit}</span><span class="rc-v s">${esc(a.dmg)}</span><span class="rc-s">${esc(a.type || '')}</span>`;
  if (w) rows.push([t('ov.weapon'), esc(itemView(S.eq.main).n), val(w)]);
  if (S.eq.off) { const o = itemView(S.eq.off), a = atk(S.eq.off, 'off'); rows.push([t('ov.offhand'), esc(o.n), a ? val(a) : '']); }
  if (S.eq.body) rows.push([t('ov.armor'), esc(itemView(S.eq.body).n), `<span class="rc-l">${t('dm.acShort')}</span><span class="rc-v s">${acHtml()}</span>`]);
  const lv = S.spells.filter(s => s.lvl > 0 && (s.always || s.prep !== false)).length, can = S.spells.filter(s => s.lvl === 0).length;
  const slots = S.slots.map((x, i) => (x.max ? `<span class="rc-l">${i + 1}</span><span class="rc-v s">${x.max - x.used}<span class="mx">/${x.max}</span></span>` : '')).filter(Boolean);
  if (S.pact.max) slots.unshift(`<span class="rc-l">${t('mini.pact')}</span><span class="rc-v s">${S.pact.max - S.pact.used}<span class="mx">/${S.pact.max}</span></span>`);
  if (lv || can) rows.push([t('spell.title'), t('ov.spellCount', { a: lv, b: can }), slots.length ? slots.slice(0, 3).join(' ') : '']);
  return `<section class="ov-col"><h3 class="ov-h">${t('ov.gear')}</h3>${rows.length ? `<dl class="ov-gear">${rows.map(([k, n, v]) => `<div><dt>${k}</dt><dd><b>${n}</b>${v ? `<small>${v}</small>` : ''}</dd></div>`).join('')}</dl>` : `<p class="note">${t('ov.nothingGear')}</p>`}</section>`;
}
function vRecent() {
  const c = campaignsOf(S.id).find(x => x.log && x.log.trim());
  if (!c) return '';
  const lines = c.log.split('\n').map(x => x.trim()).filter(Boolean).slice(-3);
  return `<section class="ov-recent"><h3 class="ov-h">${t('ov.recent', { n: esc(c.name) })}</h3><ul>${lines.map(l => `<li>${esc(l.replace(/^(##|!)\s*/, '').replace(/^(-\s*)?\[ \]\s*/, '☐ ').replace(/^(-\s*)?\[x\]\s*/i, '☑ ').slice(0, 200))}</li>`).join('')}</ul></section>`;
}
export function vProfile() {
  const fx = effects(), max = hpMaxNow();
  const desc = U.OVEDIT
    ? `<textarea id="ov-info" data-p="info" rows="3" maxlength="600" aria-label="${t('ov.desc')}" placeholder="${t('setup.backgroundPh')}">${esc(S.info || '')}</textarea><div class="add"><button class="btn sm solid" data-a="ovedit">${t('common.done')}</button></div>`
    : `${S.info ? `<p class="ov-descp">${esc(S.info)}</p>` : `<p class="note">${t('ov.noDesc')}</p>`}<button class="linkbtn" data-a="ovedit">${t('ov.editDesc')}</button>`;
  const vitals = `<div class="ov-vit">
    <div class="ov-v hp${S.hp === 0 ? ' down' : ''}"><small>${t('hp.title')}</small><b>${S.hp}<i>/${max}</i></b>${S.tmp ? `<em>+${S.tmp} ${t('hp.temp')}</em>` : ''}${hpBar(S.hp, max)}</div>
    <div class="ov-v ac"><small>${t('stat.ac')}</small><b>${acHtml()}</b></div>
    <div class="ov-v"><small>${t('stat.init')}</small><b>${sg(initBonus())}</b></div>
    <div class="ov-v"><small>${t('stat.speed')}</small><b>${esc(dist(fx.speed.val))}</b></div>${(() => { const st = spellStats()[0]; return st ? `<div class="ov-v"><small>${t('fight.spellDc')}</small><b>${st.dc}</b><em>${t('fight.spellAtk')} ${sg(st.atk)}</em></div>` : ''; })()}</div>`;
  const abil = `<div class="ov-abil">${ABK.map(k => `<div title="${t('abs.' + k)} ${S.abil[k]}"><small>${t('abs.' + k)}</small><b>${sg(mod(S.abil[k]))}</b></div>`).join('')}</div>`;
  return `<div class="ov2">${vitals}${abil}<div class="page-2">${vNow()}${vGear()}</div>${vPets()}<section class="ov-desc"><h3 class="ov-h">${t('ov.desc')}</h3>${desc}</section>${vRecent()}</div>`;
}

/* ---- Werte & Fähigkeiten ---- */
export function vStats() {
  const fx = effects(), max = hpMaxNow(), hd = S.hd || { max: 0, used: 0, die: 'W8' };
  const row = (l, v, sub = '') => `<div class="sv-row"><span>${l}${sub ? `<small>${sub}</small>` : ''}</span><b>${v}</b></div>`;
  const side = `<aside class="stats-side card">
    ${row(t('stat.prof'), sg(S.prof))}${row(t('stat.init'), sg(initBonus()))}${row(t('stat.ac'), acHtml())}${row(t('stat.speed'), esc(dist(fx.speed.val)))}
    ${row(t('hp.title'), `${S.hp}/${max}${S.tmp ? ` <small>+${S.tmp}</small>` : ''}`)}${row(t('ov.hitDice'), `${Math.max(0, hd.max - hd.used)}/${hd.max}`, esc(dice(hd.die || '')))}
    <p class="lbl sv-sep">${t('ov.passive')}</p>${row(t('stat.pp'), passivePerception())}${row(t('ov.pIns'), 10 + skv('Insight'))}${row(t('ov.pInv'), 10 + skv('Investigation'))}</aside>`;
  return `<div class="stats-top"><div class="stats-main"><section class="stats-medals">${vAbil(false)}</section>${vFx(fx)}${vSkills()}</div>${side}</div><div class="page-2 stats-more"><div>${vFeats()}</div><div>${vProfs()}</div></div>`;
}

/* ---- Zauber: Zauberbuch ---- */
export const vSpellBook = () => `${concBanner()}<div class="sheet solo spellbook">${vSpells()}</div>`;
