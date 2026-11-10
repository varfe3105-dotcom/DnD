// Prüft deutsche Texte gegen das englische SRD: Würfel und SG, die nur im Deutschen stehen, sind verdächtig.
// Aufruf: node scripts/check-translations.mjs [--context]
import fs from 'node:fs';

const read = f => JSON.parse(fs.readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const label = n => (typeof n === 'object' ? n.en : n);
const norm = d => d.replace(/^1(?=[Wd])/, '').toLowerCase().replace('w', 'd');
const context = process.argv.includes('--context');
// Im SRD-Datensatz fehlt hier die Würfelangabe, die Werte stimmen laut Buch.
const KNOWN = new Set(['Moonbeam', 'Symbol']);
let bad = 0;
for (const [file, rows] of [['spells', read('spells.json')], ['magic', read('magic-items.json')], ['potions', read('potions.json')]]) {
  for (const r of rows) {
    if (r.source !== 'srd' || !r.text.de || KNOWN.has(label(r.n))) continue;
    const en = r.text.en + ' ' + (r.higher?.en || '');
    const de = r.text.de + ' ' + (r.higher?.de || '');
    const enDice = new Set((en.match(/\b\d*d\d+\b/g) || []).map(norm));
    const onlyDe = [...new Set(de.match(/\b\d*W\d+\b/g) || [])].filter(d => !enDice.has(norm(d)));
    const enDc = new Set((en.match(/DC (\d+)/g) || []).map(x => x.slice(3)));
    const onlyDc = [...new Set(de.replace(/SG 10 \+ Grad/g, '').match(/SG (\d+)/g) || [])].map(x => x.slice(3)).filter(x => !enDc.has(x));
    if (onlyDe.length || onlyDc.length) {
      bad++;
      console.log(`${file}: ${label(r.n)}: nur Deutsch ${onlyDe.join(' ')}${onlyDc.length ? ' SG ' + onlyDc.join(' ') : ''}`);
      if (context) {
        console.log('   DE: ' + de.slice(0, 260));
        const hits = en.match(/[^.]*(?:\b\d*d\d+\b|DC \d+)[^.]*\./g) || [];
        console.log('   EN: ' + hits.map(s => s.trim()).join(' ').slice(0, 620));
      }
    }
  }
}
console.log(`Verdächtig: ${bad}`);
process.exitCode = bad ? 1 : 0;
