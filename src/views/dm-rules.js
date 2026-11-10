// Spickzettel für die Spielleitung: Regelabschnitte aus dem SRD, deutsche Kurzfassung der wichtigsten.
import sections from '../../data/rule-sections.json';
import { esc } from '../util.js';
import { DU } from '../dm.js';
import { t, lang, dice } from '../i18n/index.js';

const GROUPS = ['combat', 'adventuring', 'using-ability-scores', 'spellcasting', 'equipment', 'appendix'];
const nameOf = s => (lang === 'de' && s.n.de) || s.n.en;
const inline = x => x.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');

/** Kleiner Markdown-Leser für die SRD-Texte: Überschriften, Tabellen, Listen, Absätze. */
export function md(src, skipTitle) {
  const out = [], lines = esc(src).split('\n');
  let i = 0;
  while (i < lines.length) {
    const l = lines[i].trim();
    if (!l) { i++; continue; }
    const h = l.match(/^#+\s*(.+)/);
    if (h) { if (h[1] !== skipTitle) out.push(`<h4>${inline(h[1])}</h4>`); i++; continue; }
    if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim());
      const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
      const body = rows.filter(r => !/^\|[\s:|-]+\|?$/.test(r));
      out.push(`<div class="rs-t"><table><thead><tr>${cells(body[0]).map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.slice(1).map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^[-*]\s/.test(l)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^[-*]\s+/, ''));
      out.push(`<ul>${items.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`);
      continue;
    }
    out.push(`<p>${inline(l)}</p>`);
    i++;
  }
  return out.join('');
}

function body(s) {
  const orig = md(s.text.en, s.n.en);
  if (lang !== 'de') return `<div class="rs">${orig}</div>`;
  if (!s.de) return `<p class="note">${t('dm.cheatNoDe')}</p><div class="rs">${orig}</div>`;
  return `<div class="rs">${s.de.split('\n').map(p => `<p>${esc(dice(p))}</p>`).join('')}</div><p class="note">${t('src.summary')}</p><details class="rs-orig"><summary>${t('dm.cheatOrig')}</summary><div class="rs">${orig}</div></details>`;
}

export function vRuleList() {
  const q = (DU.rq || '').trim().toLowerCase();
  const match = s => !q || [s.n.en, s.n.de, s.de, s.text.en].some(x => x && x.toLowerCase().includes(q));
  const html = GROUPS.map(g => {
    const list = sections.filter(s => s.group === g && match(s));
    if (!list.length) return '';
    return `<h2>${t('dm.rg.' + g)}</h2><div class="card">${list.map(s => `<details class="feat dm-rs" data-rid="${s.id}"${DU.ropen?.[s.id] ? ' open' : ''}><summary><span>${esc(nameOf(s))}</span></summary>${body(s)}</details>`).join('')}</div>`;
  }).join('');
  return html || `<p class="empty">${t('wiki.nothing')}</p>`;
}

export function vCheat() {
  return `<div class="card"><input type="search" id="dm-rq" value="${esc(DU.rq || '')}" placeholder="${t('dm.cheatSearch')}" aria-label="${t('dm.cheatSearch')}"><p class="note">${t('dm.cheatNote')}</p></div><div id="dm-rlist">${vRuleList()}</div>`;
}
