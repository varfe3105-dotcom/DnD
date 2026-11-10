// Spickzettel für die Spielleitung: Kurzfassung oben, SRD-Text in aufklappbaren Unterabschnitten, Suche markiert Treffer.
import sections from '../../data/rule-sections.json';
import { esc } from '../util.js';
import { DU } from '../dm.js';
import { t, lang, dice } from '../i18n/index.js';

const GROUPS = ['combat', 'adventuring', 'using-ability-scores', 'spellcasting', 'equipment', 'appendix'];
const nameOf = s => (lang === 'de' && s.n.de) || s.n.en;
const sumOf = s => (s.sum && (s.sum[lang] || (lang === 'en' ? '' : ''))) || '';
const inline = x => x.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Markiert den Suchbegriff in bereits entschärftem Text. */
const mark = (html, q) => (q ? html.replace(new RegExp(reEsc(esc(q)), 'gi'), m => `<mark>${m}</mark>`) : html);

function blocks(lines, q) {
  const out = [];
  let i = 0;
  const f = x => mark(inline(x), q);
  while (i < lines.length) {
    const l = lines[i].trim();
    if (!l) { i++; continue; }
    if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim());
      const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => f(c.trim()));
      const body = rows.filter(r => !/^\|[\s:|-]+\|?$/.test(r));
      out.push(`<div class="rs-t"><table><thead><tr>${cells(body[0]).map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.slice(1).map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^[-*]\s/.test(l)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^[-*]\s+/, ''));
      out.push(`<ul>${items.map(x => `<li>${f(x)}</li>`).join('')}</ul>`);
      continue;
    }
    out.push(`<p>${f(l)}</p>`);
    i++;
  }
  return out.join('');
}

/** Teilt den SRD-Text an seinen Überschriften in Unterabschnitte. */
export function subsections(src, title) {
  const parts = [{ h: '', lines: [] }];
  esc(src).split('\n').forEach(l => {
    const h = l.trim().match(/^#+\s*(.+)/);
    if (h) { if (h[1] !== esc(title)) parts.push({ h: h[1], lines: [] }); }
    else parts[parts.length - 1].lines.push(l);
  });
  return parts.filter(p => p.h || p.lines.some(x => x.trim()));
}
export function md(src, title, q = '') {
  const low = q.toLowerCase();
  return subsections(src, title).map(p => {
    const body = blocks(p.lines, q);
    if (!p.h) return body;
    const hit = low && (p.h.toLowerCase().includes(low) || p.lines.join(' ').toLowerCase().includes(low));
    return `<details class="rs-sub"${hit ? ' open' : ''}><summary>${mark(inline(p.h), q)}</summary>${body}</details>`;
  }).join('');
}

/** Kurzfassung: „Begriff: Wert“ wird zur Zeile mit fettem Begriff. */
export function summary(text, q = '') {
  return `<div class="rs-sum">${text.split('\n').map(l => {
    const m = l.match(/^([^:]{2,40}):\s+(.+)$/);
    const f = x => mark(esc(dice(x)), q);
    return m ? `<div class="rs-kv"><b>${f(m[1])}</b><span>${f(m[2])}</span></div>` : `<p>${f(l)}</p>`;
  }).join('')}</div>`;
}

function body(s, q) {
  const orig = md(s.text.en, s.n.en, q), sum = sumOf(s);
  if (!sum) return `${lang === 'de' ? `<p class="note">${t('dm.cheatNoDe')}</p>` : ''}<div class="rs">${orig}</div>`;
  const hitOrig = q && s.text.en.toLowerCase().includes(q.toLowerCase());
  return `${summary(sum, q)}<p class="note">${t('src.summary')}</p><details class="rs-orig"${hitOrig ? ' open' : ''}><summary>${t('dm.cheatOrig')}</summary><div class="rs">${orig}</div></details>`;
}
const topics = s => [...new Set(subsections(s.text.en, s.n.en).filter(p => p.h).map(p => p.h.replace(/\*/g, '')))];

export function vRuleList() {
  const q = (DU.rq || '').trim(), low = q.toLowerCase();
  const match = s => !low || [s.n.en, s.n.de, s.sum?.de, s.sum?.en, s.text.en].some(x => x && x.toLowerCase().includes(low));
  const html = GROUPS.map(g => {
    const list = sections.filter(s => s.group === g && match(s));
    if (!list.length) return '';
    return `<h2>${t('dm.rg.' + g)}</h2><div class="card">${list.map(s => {
      const tp = topics(s), open = low ? true : DU.ropen?.[s.id];
      return `<details class="feat dm-rs" data-rid="${s.id}"${open ? ' open' : ''}><summary><span>${esc(nameOf(s))}${tp.length ? `<small class="rs-topics">${esc(tp.slice(0, 5).join(' · '))}${tp.length > 5 ? ' …' : ''}</small>` : ''}</span></summary>${body(s, q)}</details>`;
    }).join('')}</div>`;
  }).join('');
  return html || `<p class="empty">${t('wiki.nothing')}</p>`;
}

export function vCheat() {
  return `<div class="card"><input type="search" id="dm-rq" value="${esc(DU.rq || '')}" placeholder="${t('dm.cheatSearch')}" aria-label="${t('dm.cheatSearch')}"><p class="note">${t('dm.cheatNote')}</p></div><div id="dm-rlist">${vRuleList()}</div>`;
}

const STAT_HEAD = /^(Traits|Actions|Reactions|Legendary Actions)$/;
/** Monsterwerte gegliedert: Abschnittstitel und fette Fähigkeitsnamen statt eines Textblocks. */
export function statText(text) {
  return String(text || '').split('\n').filter(l => l.trim()).map(l => {
    if (STAT_HEAD.test(l.trim())) return `<h5>${esc(l.trim())}</h5>`;
    const m = l.match(/^([^.:\n]{2,60}?)\.\s+(.+)$/);
    return m ? `<p><b>${esc(m[1])}.</b> ${esc(m[2])}</p>` : `<p>${esc(l)}</p>`;
  }).join('');
}
