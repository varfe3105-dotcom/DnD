// Sprache der Anzeige. Ändert nie die gespeicherten Charakterdaten.
import en from './en.json';
import de from './de.json';
import namesDe from '../../data/names-de.json';

const LS = 'charbogen-lang';
const DICT = { en, de };
const stored = () => { try { return localStorage.getItem(LS); } catch (e) { return null; } };

export let lang = stored() === 'de' ? 'de' : 'en';
export const missing = new Set();
if (typeof window !== 'undefined') window.__i18nMissing = missing;

export function setLang(l) {
  lang = l === 'de' ? 'de' : 'en';
  try { localStorage.setItem(LS, lang); } catch (e) { /* Auswahl gilt dann nur bis zum Neuladen */ }
  document.documentElement.lang = lang;
}
document.documentElement.lang = lang;

const fill = (s, p) => (p ? s.replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? p[k] : m)) : s);

/** Oberflächentext. Fehlt die Übersetzung, gilt die andere Sprache und der Schlüssel wird gemeldet. */
export function tl(l, key, params) {
  let s = DICT[l][key];
  if (s == null) { missing.add(`${l}:${key}`); s = DICT[l === 'en' ? 'de' : 'en'][key] ?? key; }
  return fill(s, params);
}
export const t = (key, params) => tl(lang, key, params);

/** Wählt aus {en,de} die passende Sprache, Strings gehen unverändert durch. */
export function loc(v, l = lang) {
  if (v == null) return '';
  if (typeof v !== 'object') return v;
  const other = l === 'en' ? 'de' : 'en';
  if (v[l]) return v[l];
  if (v[other]) missing.add(`${l}:${v[other].slice(0, 40)}`);
  return v[other] || '';
}

/** „Blinded · Blind“: Auf Deutsch die deutsche Bezeichnung als Zusatz. */
export const deName = (n, de = namesDe[n]) => (lang === 'de' && de && de !== n ? de : '');
export const nameLine = (n, de) => { const d = deName(n, de); return d ? `${n} · ${d}` : n; };

/** Würfelschreibweise: 1d8 auf Englisch, 1W8 auf Deutsch. */
export const dice = (s, l = lang) => String(s ?? '').replace(/(^|[^\p{L}])(\d*)[dW](\d+)(?![\p{L}\d])/gu, (m, a, n, d) => `${a}${n}${l === 'en' ? 'd' : 'W'}${d}`);

/** Strecken werden intern in Metern geführt: 1,5 m entsprechen 5 ft. */
export const metersToFeet = m => Math.round(m * 10 / 3);
export const feetToMeters = f => Math.round(f * 0.3 * 2) / 2;
export const dist = m => (lang === 'en' ? `${metersToFeet(m)} ft.` : `${String(m).replace('.', ',')} m`);
export const distValue = m => (lang === 'en' ? metersToFeet(m) : m);
export const distInput = v => (lang === 'en' ? feetToMeters(v) : v);
