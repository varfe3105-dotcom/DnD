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
export const timeline = items => items.length ? `<ol class="chron">${items.map(x => `<li class="chron-e${x.cls ? ' ' + x.cls : ''}"><div class="chron-h"><h3>${esc(x.title || t('dm.untitled'))}</h3>${x.tags || ''}${x.act || ''}</div>${x.meta ? `<p class="lbl">${x.meta}</p>` : ''}<div class="chron-b">${bodyHtml(x.body) || `<p class="note">${t('chron.empty')}</p>`}</div>${x.extra || ''}</li>`).join('')}</ol>` : `<p class="note">${t('chron.none')}</p>`;
/** Chronik des Spielers aus dem Text: Abschnitte beginnen mit „## Titel“. Text davor ist ein eigener Abschnitt. */
export function logEntries(log) {
  const out = [], parts = String(log || '').split(/^## /m);
  parts.forEach((p, i) => { if (!p.trim()) return; if (i === 0 && !/^## /.test(String(log))) { out.push({ title: t('chron.earlier'), body: p }); return; } const nl = p.indexOf('\n'); out.push({ title: (nl < 0 ? p : p.slice(0, nl)).trim(), body: nl < 0 ? '' : p.slice(nl + 1) }); });
  return out;
}

/** Chronik als Buch: Deckel mit Titel, links das Inhaltsverzeichnis mit Lesezeichen, rechts die aufgeschlagene Seite.
 * entries: [{ id, title, meta, body, pub, act }] – pub true: Siegel „veröffentlicht“, false: „privat“, undefined: kein Vermerk. */
export function book({ title, sub = '', entries, sel, empty, cls = '' }) {
  const i = Math.max(0, entries.findIndex(e => e.id === sel)), cur = entries[i];
  const toc = entries.map((e, k) => `<li><button data-a="bksel" data-id="${esc(e.id)}" aria-current="${k === i}">${k === i ? '<i class="bk-mark" aria-hidden="true"></i>' : ''}<span>${esc(e.title || t('dm.untitled'))}</span>${e.meta ? `<small>${e.meta}</small>` : ''}</button></li>`).join('');
  const seal = cur && cur.pub === true ? `<span class="bk-seal" title="${t('chron.sealHint')}">${t('chron.seal')}</span>` : cur && cur.pub === false ? `<span class="bk-priv">${t('chron.private')}</span>` : '';
  const nav = (d, l) => { const e = entries[i + d]; return e ? `<button class="btn sm" data-a="bksel" data-id="${esc(e.id)}">${l}</button>` : '<span></span>'; };
  const page = cur ? `<article class="bk-page"><div class="bk-head"><p class="bk-meta">${cur.meta || ''}</p><h3>${esc(cur.title || t('dm.untitled'))}</h3>${seal}</div><div class="bk-body">${bodyHtml(cur.body) || `<p class="note">${t('chron.emptyPage')}</p>`}</div>${cur.act ? `<div class="bk-act">${cur.act}</div>` : ''}${cur.extra || ''}<footer class="bk-foot">${nav(-1, '‹ ' + t('chron.prevPage'))}<span class="bk-no">${i + 1} / ${entries.length}</span>${nav(1, t('chron.nextPage') + ' ›')}</footer></article>` : `<article class="bk-page"><p class="note">${empty}</p></article>`;
  return `<section class="book ${cls}"><div class="bk-cover"><i class="bk-band" aria-hidden="true"></i><h2>${esc(title)}</h2>${sub ? `<p>${sub}</p>` : ''}</div><div class="bk-spread"><nav class="bk-toc" aria-label="${t('chron.toc')}"><h4>${t('chron.toc')}</h4>${entries.length ? `<ol>${toc}</ol>` : `<p class="note">${empty}</p>`}</nav>${page}</div></section>`;
}
