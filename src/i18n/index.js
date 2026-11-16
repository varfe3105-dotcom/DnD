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
  return convUnits(fill(s, params));
}
export const t = (key, params) => tl(lang, key, params);

/** Wählt aus {en,de} die passende Sprache, Strings gehen unverändert durch. */
export function loc(v, l = lang) {
  if (v == null) return '';
  if (typeof v !== 'object') return v;
  const other = l === 'en' ? 'de' : 'en';
  if (v[l]) return convUnits(v[l]);
  if (v[other]) missing.add(`${l}:${v[other].slice(0, 40)}`);
  return convUnits(v[other] || '');
}

/** „Blinded · Blind“: Auf Deutsch die deutsche Bezeichnung als Zusatz. */
export const deName = (n, de = namesDe[n]) => (lang === 'de' && de && de !== n ? de : '');
export const nameLine = (n, de) => { const d = deName(n, de); return d ? `${n} · ${d}` : n; };

/** Würfelschreibweise: 1d8 auf Englisch, 1W8 auf Deutsch. */
export const dice = (s, l = lang) => String(s ?? '').replace(/(^|[^\p{L}])(\d*)[dW](\d+)(?![\p{L}\d])/gu, (m, a, n, d) => `${a}${n}${l === 'en' ? 'd' : 'W'}${d}`);

/** Strecken werden intern in Metern geführt: 1,5 m entsprechen 5 ft. */
export const metersToFeet = m => Math.round(m * 10 / 3);
export const feetToMeters = f => Math.round(f * 0.3 * 2) / 2;
/* Einheiten: Meter (Standard) oder Fuß, unabhängig von der Sprache. Gespeichert pro Gerät. */
const ULS = 'charbogen-units';
export let units = (() => { try { return localStorage.getItem(ULS) === 'ft' ? 'ft' : 'm'; } catch (e) { return 'm'; } })();
export function setUnits(u) { units = u === 'ft' ? 'ft' : 'm'; try { localStorage.setItem(ULS, units); } catch (e) { /* gilt bis zum Neuladen */ } }
const num = v => (lang === 'de' ? String(v).replace('.', ',') : String(v));
const ftWord = () => (lang === 'de' ? 'Fuß' : 'ft.');
export const dist = m => (units === 'ft' ? `${metersToFeet(m)} ${ftWord()}` : `${num(m)} m`);
/** Gewicht intern in Pfund; mit Metern in Kilogramm. */
export const weight = lb => (units === 'ft' ? `${num(Math.round(lb * 10) / 10)} lb` : `${num(Math.round(lb * 0.45 * 10) / 10)} kg`);
export const distValue = m => (units === 'ft' ? metersToFeet(m) : m);
export const distInput = v => (units === 'ft' ? feetToMeters(v) : v);
/** Strecken in Texten umrechnen: englische Fuß-Angaben in Meter oder deutsche Meter-Angaben in Fuß. */
export function convUnits(s) {
  if (typeof s !== 'string' || !s) return s;
  if (units === 'm') {
    return s.replace(/(\d[\d,]*)( |-)(feet|foot|ft\.?)(?![a-z])/gi, (x, n, sep, w) => {
      const m = num(feetToMeters(+n.replace(/,/g, '')));
      // „a 20-foot radius“ → „a 6-meter radius“, „60 feet“/„30 ft.“ → „18 m“/„9 m“
      if (sep === '-' && /^f(oo|ee)t/i.test(w)) return `${m}-meter`;
      return `${m} m`;
    });
  }
  return s.replace(/(\d+(?:,\d+)?)( ?|-)m(?![\p{L}\d])/gu, (x, n, sep) => `${metersToFeet(+n.replace(',', '.'))}${sep === '-' ? '-' : ' '}${lang === 'de' ? 'Fuß' : 'ft.'}`);
}
