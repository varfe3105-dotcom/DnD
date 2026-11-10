// Beute: Münztabellen für einzelne Monster nach CR und Seltenheit nach Stufe.
// Zusammenfassung aus dem DMG, aus dem Gedächtnis übertragen und nicht am Buch geprüft.
export const TIERS = ['0-4', '5-10', '11-16', '17+'];
export const COINS = {
  '0-4': [[30, '5d6 cp'], [60, '4d6 sp'], [70, '3d6 ep'], [95, '3d6 gp'], [100, '1d6 pp']],
  '5-10': [[30, '4d6×100 cp + 1d6×10 ep'], [60, '6d6×10 sp + 2d6×10 gp'], [70, '3d6×10 ep + 2d6×10 gp'], [95, '4d6×10 gp'], [100, '2d6×10 gp + 3d6 pp']],
  '11-16': [[20, '4d6×100 sp + 1d6×100 gp'], [35, '1d6×100 ep + 1d6×100 gp'], [75, '2d6×100 gp + 1d6×10 pp'], [100, '2d6×100 gp + 2d6×10 pp']],
  '17+': [[15, '2d6×1000 ep + 8d6×100 gp'], [55, '1d6×1000 gp + 1d6×100 pp'], [100, '1d6×1000 gp + 2d6×100 pp']],
};
const ORDER = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'];
const UPTO = { '0-4': 2, '5-10': 3, '11-16': 4, '17+': 5 };
export const raritiesFor = tier => ORDER.slice(0, UPTO[tier] || 2);
export function coinRow(tier, roll) {
  const n = Math.floor(+roll);
  if (!(n >= 1 && n <= 100)) return -1;
  return COINS[tier].findIndex(r => n <= r[0]);
}
