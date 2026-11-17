// Mitgliederkarte: ein Baustein für Gruppe (Spieler und Spielleitung) und Kampagnenübersicht.
// Quelle ist immer der echte Stand: der eigene Bogen (S) oder die Presence der Mitspieler. Nichts wird kopiert gespeichert.
import { esc } from '../util.js';
import { S } from '../state.js';
import { BUFFS, acNow } from '../buffs.js';
import { hpMaxNow } from '../effects.js';
import { playerName } from '../player.js';
import { t } from '../i18n/index.js';

const bar = (hp, max) => { const p = max ? Math.max(0, Math.min(100, hp / max * 100)) : 0; return `<span class="hpbar${p <= 25 ? ' low' : p <= 50 ? ' mid' : ''}" aria-hidden="true"><u style="width:${p}%"></u></span>`; };
/** Grober Zustand für Mitspieler: nur vier Stufen, Balken in festen Schritten, damit sich keine TP zurückrechnen lassen. */
export function hpState(hp, max) {
  if (!max) return { k: 'ok', w: 100 };
  if (hp <= 0) return { k: 'down', w: 0 };
  const r = hp / max;
  return r >= 0.75 ? { k: 'ok', w: 100 } : r >= 0.4 ? { k: 'hurt', w: 60 } : { k: 'bad', w: 25 };
}
export const coarseHp = (hp, max) => { const s = hpState(hp, max); return `<span class="hpq q-${s.k}"><span class="hpbar${s.k === 'bad' ? ' low' : s.k === 'hurt' ? ' mid' : ''}" aria-hidden="true"><u style="width:${s.w}%"></u></span><b>${t('hpq.' + s.k)}</b></span>`; };
const initial = n => esc((n || '?').trim()[0] || '?');

/** Der eigene Charakter in der Form der Presence-Daten. */
export const selfMember = () => ({
  key: S.id, name: S.name, pl: playerName(), race: S.subrace || S.race, klass: S.klass, level: S.level, hp: S.hp, hpMax: hpMaxNow(), tmp: S.tmp, ac: acNow(),
  cond: Object.keys(S.cond).filter(c => S.cond[c]), conc: S.conc, exh: S.exh, insp: !!S.insp, death: S.death || { s: 0, f: 0 },
  fx: (S.buffs || []).map(b => ({ s: b.s, by: b.by, good: BUFFS[b.s]?.good !== false })), pets: [], me: true,
});

/** Karte eines Gruppenmitglieds. act: zusätzliche Knöpfe unten (z. B. Werkzeuge der Spielleitung). */
export function memberCard(p, act = '', full = !!p.me) {
  const down = p.hp === 0 && p.hpMax > 0;
  const tags = [
    p.conc ? `<span class="tag t-conc">${t('live.concShort', { n: esc(p.conc) })}</span>` : '',
    ...(p.cond || []).map(c => `<span class="tag t-bad">${esc(c)}${p.cr?.[c] ? ' · ' + p.cr[c] : ''}</span>`),
    p.exh ? `<span class="tag t-bad">${esc(t('exh.title', { n: p.exh }))}</span>` : '',
    ...(p.fx || []).map(x => `<span class="tag ${x.good ? 't-good' : 't-bad'}" title="${esc(x.by ? t('buff.from', { s: x.s, n: x.by }) : x.s)}">${esc(x.s)}</span>`),
    p.insp ? `<span class="tag t-res">${t('insp.short')}</span>` : '',
  ].filter(Boolean).join('');
  const line = [p.race, p.klass, p.level ? t('feat.level', { n: p.level }) : ''].filter(Boolean).join(' · ');
  return `<article class="mcard${down ? ' down' : ''}${p.me ? ' me' : ''}">
  <div class="mc-top"><span class="mc-por" aria-hidden="true">${initial(p.name)}</span><div class="mc-id"><h3>${esc(p.name || '?')}${p.me ? ` <small>(${t('nav.me')})</small>` : ''}</h3>${p.pl ? `<p class="mc-pl">${t('party.playedBy', { n: esc(p.pl) })}</p>` : ''}${line ? `<p class="mc-line">${esc(line)}</p>` : ''}</div><div class="mc-ac"><small>${t('dm.acShort')}</small><b>${p.ac ?? '–'}</b></div></div>
  ${full ? `<div class="mc-hp"><small>${t('head.hpShort')}</small><b>${p.hp}</b><i>/${p.hpMax}</i>${p.tmp ? `<em>+${p.tmp}</em>` : ''}${bar(p.hp, p.hpMax)}</div>` : `<div class="mc-hp q"><small>${t('head.hpShort')}</small>${coarseHp(p.hp, p.hpMax)}</div>`}
  ${tags ? `<div class="tags">${tags}</div>` : ''}${down ? `<p class="mc-down">${t('party.down')} · ${t('death.s')} ${p.death?.s ?? 0} · ${t('death.f')} ${p.death?.f ?? 0}</p>` : ''}
  ${(p.pets || []).map(x => `<div class="mc-pet"><span>${esc(x.n)}</span><small>${t('dm.acShort')} ${x.ac}</small>${full ? `<b>${x.hp}/${x.hpMax}</b>` : coarseHp(x.hp, x.hpMax)}</div>`).join('')}${act}</article>`;
}
/** Kompakte Porträtreihe für die Übersicht. */
export const memberChip = (p, full = !!p.me) => `<button class="mchip${p.hp === 0 && p.hpMax ? ' down' : ''}" data-a="crumb" data-t="${p.dm ? 'dmlive' : 'party'}"><span class="mc-por sm" aria-hidden="true">${initial(p.name)}</span><span><b>${esc(p.name || '?')}</b>${full ? `<small>${p.hp}/${p.hpMax}</small>${bar(p.hp, p.hpMax)}` : coarseHp(p.hp, p.hpMax)}</span></button>`;
