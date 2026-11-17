// Kampagnenbuch: Darstellung von Chronikeinträgen als Zeitleiste. Quelle bleibt das Notizbuch der Spielleitung bzw. die Chronik (log)
// des Spielers; hier wird nur gelesen und gegliedert. Zeilen mit „!“ sind wichtige Ereignisse, „[ ]“ offene und „[x]“ erledigte Aufgaben.
import { esc } from '../util.js';
import { t } from '../i18n/index.js';

export function bodyHtml(text) {
  return String(text || '').replace(/\[\[([^\]\n]+)\]\]/g, '$1').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    if (/^!\s*/.test(l)) return `<p class="chron-hl">${esc(l.replace(/^!\s*/, ''))}</p>`;
    if (/^(-\s*)?\[ \]/.test(l)) return `<p class="chron-task"><span class="tag t-res sm">${t('chron.open')}</span> ${esc(l.replace(/^(-\s*)?\[ \]\s*/, ''))}</p>`;
    if (/^(-\s*)?\[x\]/i.test(l)) return `<p class="chron-task done"><span class="tag t-good sm">${t('chron.done')}</span> ${esc(l.replace(/^(-\s*)?\[x\]\s*/i, ''))}</p>`;
    return `<p>${esc(l)}</p>`;
  }).join('');
}
/** Zeitleiste: [{title, meta, body, tags, act}] */
export const timeline = items => items.length ? `<ol class="chron">${items.map(x => `<li class="chron-e${x.cls ? ' ' + x.cls : ''}"><div class="chron-h"><h3>${esc(x.title || t('dm.untitled'))}</h3>${x.tags || ''}${x.act || ''}</div>${x.meta ? `<p class="lbl">${x.meta}</p>` : ''}<div class="chron-b">${bodyHtml(x.body) || `<p class="note">${t('chron.empty')}</p>`}</div></li>`).join('')}</ol>` : `<p class="note">${t('chron.none')}</p>`;
/** Chronik des Spielers aus dem Text: Abschnitte beginnen mit „## Titel“. Text davor ist ein eigener Abschnitt. */
export function logEntries(log) {
  const out = [], parts = String(log || '').split(/^## /m);
  parts.forEach((p, i) => { if (!p.trim()) return; if (i === 0 && !/^## /.test(String(log))) { out.push({ title: t('chron.earlier'), body: p }); return; } const nl = p.indexOf('\n'); out.push({ title: (nl < 0 ? p : p.slice(0, nl)).trim(), body: nl < 0 ? '' : p.slice(nl + 1) }); });
  return out;
}
