// Notizen mit benennbaren Seiten. Die erste Seite liegt weiter in S.notes, so laden alte Bögen und Importe unverändert.
import { esc, uid, clamp } from '../util.js';
import { S, U } from '../state.js';
import { t } from '../i18n/index.js';

export const pageList = () => [{ title: S.noteTitle, text: S.notes }, ...S.notePages];
export const curPage = () => clamp(S.notePage, 0, pageList().length - 1);
export const pageLabel = (p, i) => p.title.trim() || (i === 0 ? t('notes.first') : t('notes.page', { n: i + 1 }));

export function setPageText(text) {
  const i = curPage();
  if (i === 0) S.notes = text; else S.notePages[i - 1].text = text;
}
export function setPageTitle(title) {
  const i = curPage();
  if (i === 0) S.noteTitle = title; else S.notePages[i - 1].title = title;
}
export function addPage() {
  S.notePages.push({ id: uid(), title: '', text: '' });
  S.notePage = S.notePages.length;
}
export function delPage() {
  const list = pageList();
  if (list.length < 2) return;
  list.splice(curPage(), 1);
  S.noteTitle = list[0].title;
  S.notes = list[0].text;
  S.notePages = list.slice(1);
  S.notePage = clamp(S.notePage, 0, list.length - 1);
}

export function vNotesTab() {
  const list = pageList(), i = curPage(), p = list[i];
  return `<h2>${t('tab.notes')}</h2><div class="chips notepages">${list.map((x, j) => `<button class="chip${j === i ? ' on' : ''}" data-a="npsel" data-i="${j}" aria-pressed="${j === i}">${esc(pageLabel(x, j))}</button>`).join('')}<button class="chip" data-a="npadd">+ ${t('notes.addPage')}</button></div>
  <div class="add np-head"><input type="text" id="np-title" value="${esc(p.title)}" placeholder="${esc(pageLabel(p, i))}" aria-label="${t('notes.pageName')}" title="${t('notes.pageName')}">${list.length > 1 ? `<button class="btn sm ${U.CONF === 'npdel' ? 'warn' : 'bad'}" data-a="npdel">${U.CONF === 'npdel' ? t('notes.delConfirm') : t('notes.delPage')}</button>` : ''}</div>
  <textarea id="notes" placeholder="${t('notes.placeholder')}" aria-label="${esc(pageLabel(p, i))}">${esc(p.text)}</textarea>`;
}
