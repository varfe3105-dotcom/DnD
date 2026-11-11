import { $, esc } from './util.js';
import { get, slotLabel, slotName, atk, itemView } from './helpers.js';
import { t } from './i18n/index.js';

export const tip = $('tip');
export function hideTip() { tip.hidden = true; }
export function showTip(r, x, y, el) {
  const raw = get(r);
  if (!raw) { hideTip(); return; }
  const it = itemView(raw), a = atk(raw, r === 'eq:off' ? 'off' : 'main');
  const tags = [r.startsWith('eq') ? t('item.equipped', { s: slotLabel(r) }) : t('eq.bag'), it.slot ? t('tip.slot', { s: slotName(it.slot) }) : '', it.cons ? t('inv.consumable') : '', it.att ? (it.tuned ? t('item.attuned') : t('item.needsAttune')) : it.magic ? t('tip.magic') : '', it.price || ''].filter(Boolean).join(' · ');
  tip.innerHTML = `<b>${esc(it.n)}</b><span class="ttag">${esc(tags)}</span>${esc(it.p) || `<i>${t('item.noDesc')}</i>`}${a ? `<span class="ta">${t('tip.attack', { h: a.hit, d: a.dmg, y: esc(a.type) })}</span>` : ''}<span class="tq">${t('tip.count', { n: it.q })}</span>`;
  tip.hidden = false;
  if (el) { const b = el.getBoundingClientRect(); x = b.right; y = b.top; }
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let L = x + 16, T = y + 16;
  if (L + w > innerWidth - 8) L = x - w - 12;
  if (T + h > innerHeight - 8) T = Math.max(8, y - h - 12);
  tip.style.left = Math.max(8, L) + 'px';
  tip.style.top = T + 'px';
}
