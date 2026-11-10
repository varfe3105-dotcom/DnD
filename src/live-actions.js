// Was bei Vorschlägen der Spielleitung auf dem eigenen Bogen passiert, und Bilder für Handouts.
import { S, toast } from './state.js';
import { t } from './i18n/index.js';
import { damage, heal } from './game.js';

export function applyProposal(m) {
  if (m.type === 'dmg') damage(m.value);
  else if (m.type === 'heal') heal(m.value);
  else if (m.type === 'temp') { if (m.value <= S.tmp) toast(t('toast.tempNoStack')); else { S.tmp = m.value; toast(t('toast.tempSet', { n: m.value })); } }
  else if (m.type === 'cond') S.cond[m.cond] = true;
}

const MAX_LEN = 280000;
const toJpeg = (img, side, q) => {
  const k = Math.min(1, side / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
};
/** Verkleinert ein Bild, bis es in eine Nachricht passt. Ergibt '' bei ungeeigneten Dateien. */
export function shrinkImage(file) {
  return new Promise(res => {
    if (!file || !/^image\//.test(file.type)) { res(''); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      for (const [side, q] of [[900, 0.7], [640, 0.6], [420, 0.5]]) { const d = toJpeg(img, side, q); if (d.length < MAX_LEN) { res(d); return; } }
      res('');
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(''); };
    img.src = url;
  });
}
