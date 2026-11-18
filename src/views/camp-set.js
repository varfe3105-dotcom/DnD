// Kampagneneinstellungen der Spielleitung (Reiter dmset): Allgemeines, Regelwerk mit Hausregeln, Fortschritt
// (Meilensteine Standard, XP wahlweise; XP-Werte bleiben beim Wechsel erhalten), Sichtbarkeit, Mitglieder, Verwaltung.
// Gespeichert wird in der Kampagne (charbogen-campaigns) bzw. die Hausregeln im Spielleitungsbereich der Kampagne (D.house).
import { esc } from '../util.js';
import { U } from '../state.js';
import { D } from '../dm.js';
import { L, players } from '../live.js';
import { ART } from '../campaigns.js';
import { curCamp } from './nav.js';
import { corners } from './orn.js';
import { t } from '../i18n/index.js';
import { skinControls } from '../bright.js';
import { vBackup } from './live-ui.js';
import { vSecState } from './dm.js';

/** Fortschritt einer Kampagne: 'xp' nur, wenn ausdrücklich gewählt; sonst Meilensteine. */
export const progOf = c => (c && c.prog === 'xp' ? 'xp' : 'ms');

const panel = (h, body, cls = '') => `<section class="hub-panel cs-sec ${cls}"><h3 class="cs-h">${h}</h3>${body}</section>`;
const f = (l, h) => `<label class="cs-f"><span class="rc-l">${l}</span>${h}</label>`;

/** Hausregeln: Liste mit Bearbeiten; klar als eigene Regeln der Kampagne gekennzeichnet. */
export function vHouseList(list, edit) {
  if (!list.length) return `<p class="note">${t('house.none')}</p>`;
  return `<div class="house-list">${list.map(r => `<article class="house-r" id="hr-${esc(r.id)}"><header><span class="tag t-res">${t('house.tag')}</span><b class="rc-n">${esc(r.t)}</b>${edit ? `<button class="btn sm" data-a="hredit" data-id="${esc(r.id)}">${t('common.edit')}</button><button class="btn sm bad" data-a="hrdel" data-id="${esc(r.id)}">${U.CONF === 'hrdel:' + r.id ? t('chars.delConfirm') : t('common.deleteBtn')}</button>` : ''}</header><p>${esc(r.x).replace(/\n/g, '<br>')}</p></article>`).join('')}</div>`;
}

export function vCampSet() {
  const c = curCamp();
  if (!c) return '';
  const ed = U.HREDIT && (D.house || []).find(r => r.id === U.HREDIT);
  const art = U.CAMPART ?? c.art ?? 0;
  const general = panel(t('cs.general'), `<div class="cs-grid">${f(t('camp.name'), `<input type="text" id="cs-name" value="${esc(c.name)}" maxlength="80">`)}${f(t('lb.chapter'), `<input type="text" id="cs-chapter" value="${esc(c.chapter || '')}" maxlength="120">`)}</div>${f(t('camp.desc'), `<textarea id="cs-desc" rows="3" maxlength="400">${esc(c.desc)}</textarea>`)}<span class="rc-l">${t('camp.art')}</span><div class="hub-artpick">${Array.from({ length: ART }, (_, i) => `<button class="hub-camp-art a${i}${art === i ? ' on' : ''}" data-a="campart" data-i="${i}" aria-pressed="${art === i}" aria-label="${t('camp.artN', { n: i + 1 })}"></button>`).join('')}</div><div class="cs-act"><button class="btn gold" data-a="cssave">${t('camp.save')}</button></div>`);
  const prog = progOf(c);
  const rules = panel(t('cs.rules'), `<p><span class="rc-l">${t('cs.version')}</span> <b class="rc-n">${t('cs.version24')}</b></p><p class="note">${t('cs.versionNote')}</p>
  <h4 class="cs-h4">${t('house.title')}</h4>${vHouseList(D.house || [], true)}
  <div class="house-form">${f(t('house.name'), `<input type="text" id="hr-t" maxlength="120" value="${esc(ed ? ed.t : '')}">`)}${f(t('house.text'), `<textarea id="hr-x" rows="3" maxlength="2000">${esc(ed ? ed.x : '')}</textarea>`)}<div class="cs-act">${ed ? `<button class="btn" data-a="hrcancel">${t('common.cancel')}</button>` : ''}<button class="btn solid" data-a="hrsave">${ed ? t('house.update') : t('house.add')}</button></div><p class="note">${t('house.note')}</p></div>`);
  const progress = panel(t('cs.prog'), `<div class="cs-radio" role="radiogroup" aria-label="${t('cs.prog')}">${['ms', 'xp'].map(k => `<button class="chip${prog === k ? ' on' : ''}" role="radio" aria-checked="${prog === k}" data-a="csprog" data-v="${k}">${t('cs.prog.' + k)}</button>`).join('')}</div><p class="note">${t(prog === 'xp' ? 'cs.progXpNote' : 'cs.progMsNote')}</p>`);
  const pub = (D.notes || []).filter(n => n.pub).length, priv = (D.notes || []).filter(n => !n.pub).length;
  const vis = panel(t('cs.vis'), `<dl class="cs-dl"><div><dt class="rc-l">${t('cs.visPub')}</dt><dd class="rc-v s">${pub}</dd></div><div><dt class="rc-l">${t('cs.visPriv')}</dt><dd class="rc-v s">${priv}</dd></div><div><dt class="rc-l">${t('cs.visHouse')}</dt><dd class="rc-v s">${(D.house || []).length}</dd></div></dl><p class="note">${t('cs.visNote')}</p><button class="btn sm" data-a="tab" data-t="dmnotes">${t('cs.toBook')}</button>`);
  const ps = L.code === c.room ? players() : [];
  const members = panel(t('cs.members'), `${vSecState()}${ps.length ? `<ul class="cs-mem">${ps.map(p => `<li><b class="rc-n">${esc(p.name || '?')}</b><span class="rc-s">${esc([p.pl, p.klass, p.level ? t('head.seal') + ' ' + p.level : ''].filter(Boolean).join(' · '))}</span><span class="tag t-good">${t('camp.role.player')}</span></li>`).join('')}</ul>` : `<p class="note">${t(c.room ? 'cs.memOffline' : 'cs.memNoRoom')}</p>`}<p class="note">${t('cs.memNote', { c: esc(c.room || '–') })}</p>`);
  const conf = U.CONF === 'csdel:' + c.id;
  const admin = panel(t('cs.admin'), `<div class="cs-act left"><button class="btn" data-a="csarch">${t(c.status === 'archived' ? 'cs.unarchive' : 'cs.archive')}</button></div><p class="note">${t('cs.archNote')}</p>
  <div class="cs-danger"><h4 class="cs-h4">${t('cs.delTitle')}</h4><p class="note">${t('cs.delNote')}</p>${conf ? `${f(t('cs.delType', { n: esc(c.name) }), `<input type="text" id="cs-delname" autocomplete="off">`)}<div class="cs-act left"><button class="btn" data-a="csdelno">${t('common.cancel')}</button><button class="btn bad" data-a="csdel">${t('cs.delFinal')}</button></div>` : `<button class="btn bad" data-a="csdel">${t('cs.delStart')}</button>`}</div>`, 'cs-adm');
  const dev = panel(t('cs.device'), `<p class="note">${t('cs.deviceNote')}</p><div class="cs-act left"><button class="btn" data-a="dmleave">${t('cs.leave')}</button></div><span class="rc-l">${t('cs.look')}</span><div class="add">${skinControls(t)}</div><span class="rc-l">${t('cs.backup')}</span>${vBackup()}`, 'cs-dev');
  return `<section class="cs"><header class="cs-top rc-aub">${corners({ left: true })}<h2>${t('cs.title')}</h2><p>${esc(c.name)}</p></header><div class="cs-cols"><div>${general}${progress}${vis}</div><div>${rules}${members}${dev}${admin}</div></div></section>`;
}
