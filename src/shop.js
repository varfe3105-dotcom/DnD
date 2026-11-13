// Einkaufen und Verkaufen: Preise in Kupfer, Bezahlen mit Wechselgeld (PHB: 1 PM = 10 GM = 20 EM = 100 SM = 1000 KM).
export const COIN_CP = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
const ASC = ['cp', 'sp', 'ep', 'gp', 'pp'];

/** Preis aus dem englischen Katalogtext („… · 25 gp“), in Kupfer. */
export function priceCp(en) {
  const m = /(?:^|·\s*)(\d[\d,]*)\s*(cp|sp|ep|gp|pp)\s*$/.exec(String(en || '').trim());
  return m ? +m[1].replace(/,/g, '') * COIN_CP[m[2]] : 0;
}
export const totalCp = g => ASC.reduce((s, k) => s + (+g[k] || 0) * COIN_CP[k], 0);
/** Gibt Kupferbetrag als Münzen zurück (GM, SM, KM; Elektrum und Platin nur, wenn man sie hat). */
export function addCp(g, cp) {
  cp = Math.max(0, Math.round(cp));
  g.gp = (+g.gp || 0) + Math.floor(cp / 100); cp %= 100;
  g.sp = (+g.sp || 0) + Math.floor(cp / 10); cp %= 10;
  g.cp = (+g.cp || 0) + cp;
}
/** Bezahlt cp Kupfer: erst kleine Münzen passend, dann eine größere Münze mit Wechselgeld. false = reicht nicht. */
export function payCp(g, cp) {
  cp = Math.round(cp);
  if (cp <= 0) return true;
  if (totalCp(g) < cp) return false;
  let rem = cp;
  for (const k of ASC) { const use = Math.min(+g[k] || 0, Math.floor(rem / COIN_CP[k])); g[k] = (+g[k] || 0) - use; rem -= use * COIN_CP[k]; }
  if (rem > 0) {
    const k = ASC.find(x => (+g[x] || 0) > 0 && COIN_CP[x] >= rem);
    g[k] -= 1;
    addCp(g, COIN_CP[k] - rem);
  }
  return true;
}
/** Kupfer als Text in Gold (z. B. 2,5 GM). */
export const cpToGp = cp => Math.round(cp) / 100;
