// Helligkeit der Oberfläche pro Gerät: dunkel (ursprünglich), mittel, hell (Standard).
const LS = 'charbogen-bright';
export const LEVELS = ['dark', 'mid', 'light'];
export const bright = () => { try { const v = localStorage.getItem(LS); return LEVELS.includes(v) ? v : 'light'; } catch (e) { return 'light'; } };
export function setBright(v) {
  if (!LEVELS.includes(v)) v = 'light';
  try { localStorage.setItem(LS, v); } catch (e) { /* Datenschutzmodus */ }
  applyBright();
}
export function applyBright() { document.documentElement.dataset.bright = bright(); }
