// Ornamente aus dem Design-Eingang als kleine Bausteine (Gestaltung in src/realm.css).
import { esc } from '../util.js';
/** Goldenes Eckfiligran: alle vier Ecken oder nur die oberen (top). sm = kleine Fassung für Karten. */
export const corners = (opt = {}) => (opt.top ? ['tl', 'tr'] : opt.left ? ['tl', 'bl'] : ['tl', 'tr', 'bl', 'br']).map(k => `<i class="rc-co ${k}${opt.sm ? ' sm' : ''}" aria-hidden="true"></i>`).join('');
/** Schwalbenschwanz-Band, z. B. für das Kapitel einer Kampagne. */
export const ribbon = text => (text ? `<span class="rc-ribbon">${esc(text)}</span>` : '');
/** Fähnchen über einer hervorgehobenen Karte („AM ZUG“, „AUSGEWÄHLT“). */
export const flag = text => `<span class="rc-flag">${esc(text)}</span>`;
