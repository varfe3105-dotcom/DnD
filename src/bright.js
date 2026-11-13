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

// Darstellung pro Gerät: Grimoire (Standard), Schlicht, Modern.
const SKIN_LS = 'charbogen-skin';
export const SKINS = ['grimoire', 'plain', 'modern'];
export const skin = () => { try { const v = localStorage.getItem(SKIN_LS); return SKINS.includes(v) ? v : 'grimoire'; } catch (e) { return 'grimoire'; } };
export function setSkin(v) {
  if (!SKINS.includes(v)) v = 'grimoire';
  try { if (v === 'grimoire') localStorage.removeItem(SKIN_LS); else localStorage.setItem(SKIN_LS, v); } catch (e) { /* Datenschutzmodus */ }
  applySkin();
}
export function applySkin() { const v = skin(); if (v === 'grimoire') delete document.documentElement.dataset.skin; else document.documentElement.dataset.skin = v; }
/** Auswahl für Einrichten: Darstellung und (nur im Grimoire) Helligkeit. */
export function skinControls(t) {
  const s = skin();
  return `<label class="ck">${t('skin.label')} <select id="skin">${SKINS.map(k => `<option value="${k}"${s === k ? ' selected' : ''}>${t('skin.' + k)}</option>`).join('')}</select></label>${s === 'grimoire' ? `<label class="ck">${t('bright.label')} <select id="bright">${LEVELS.map(l => `<option value="${l}"${bright() === l ? ' selected' : ''}>${t('bright.' + l)}</option>`).join('')}</select></label>` : ''}`;
}
