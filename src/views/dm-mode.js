// Spielleitungsmodus: eigenes Dashboard ohne eigenen Charakter (Kopf, Reiter, Kurzleiste, Einrichten).
import { esc } from '../util.js';
import { D, ordered } from '../dm.js';
import { L, players } from '../live.js';
import { skinControls } from '../bright.js';
import { t, lang } from '../i18n/index.js';

/** Reiter im Spielleitungsmodus → Unteransicht des DM-Bereichs. */
export const DM_TABS = { dmnotes: 'notes', dmcombat: 'combat', dmenc: 'enc', dmloot: 'loot', dmlive: 'live', dmcheat: 'cheat' };
export const DM_TAB_IC = { dmcombat: 'sword', dmenc: 'skull', dmloot: 'coin', dmnotes: 'scroll', dmlive: 'dice', dmcheat: 'torch' };
export const dmOnly = () => !!(D.on && D.only);

export function vDmHead() {
  const langBtn = l => `<button data-a="lang" data-l="${l}" aria-pressed="${lang === l}" lang="${l}">${l.toUpperCase()}</button>`;
  const ps = players();
  const status = L.role === 'dm' && L.code ? t('dmm.room', { c: esc(L.code), n: ps.length }) : t('dmm.noRoom');
  return `<header class="hd dmhd"><span class="por" aria-hidden="true"><span>⚔</span></span><div class="who"><h1>${t('dmm.title')}</h1><p>${status}</p>${D.combat.list.length ? `<p class="sub2">${t('dmm.combatLine', { r: D.combat.round, n: D.combat.list.length })}</p>` : ''}</div><div class="hacts"><div class="langs" role="group" aria-label="${t('head.language')}">${langBtn('en')}${langBtn('de')}</div></div></header>`;
}

/** Kurzleiste beim Scrollen: Runde, wer dran ist, TP der verbundenen Spieler. */
export function vDmBar(tabsHtml) {
  const list = ordered(), cur = list.find(c => c.id === D.combat.active);
  const ps = players().map(p => `<span class="mb-p${p.hp === 0 ? ' down' : ''}">${esc(p.name)} <b>${p.hp}</b>/${p.hpMax}</span>`).join('');
  return `<div class="minibar dmbar" aria-label="${t('mini.label')}">${D.combat.list.length ? `<span class="mb-v"><small>${t('dm.round')}</small><b>${D.combat.round}</b></span><span class="mb-v"><small>${t('dmm.now')}</small><b>${esc(cur ? cur.name : '–')}</b></span>` : ''}${ps ? `<span class="mb-v mb-party"><small>${t('dmm.party')}</small><b>${ps}</b></span>` : ''}<nav class="mb-tabs" aria-label="${t('head.areas')}">${tabsHtml}</nav></div>`;
}

/** Einrichten im Spielleitungsmodus: nur, was die Spielleitung braucht. */
export function vDmSetup() {
  return `<h2>${t('dmm.setup')}</h2><div class="card"><p class="note" style="margin-top:0">${t('dmm.intro')}</p><div class="add"><label class="ck"><input type="checkbox" id="dm-only" checked> ${t('dmm.toggle')}</label></div><div class="add">${skinControls(t)}</div><p class="note">${t('dmm.hint')}</p></div>`;
}
