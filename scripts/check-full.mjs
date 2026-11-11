// Prüft vollständige Übersetzungen: Jeder Würfel und jeder SG aus dem Englischen muss im Deutschen stehen.
// Aufruf: node scripts/check-full.mjs
import fs from 'node:fs';

const read = f => JSON.parse(fs.readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const dir = new URL('../data/translations/', import.meta.url);
const load = prefix => Object.assign({}, ...fs.readdirSync(dir).filter(f => f.startsWith(prefix)).sort().map(f => JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8'))));
const norm = d => d.replace(/^1(?=[Wd])/i, '').toLowerCase().replace('w', 'd');
const dice = s => new Set((s.match(/\b\d*[dW]\d+(?=s?\b)/g) || []).map(norm));
const dcs = s => new Set((s.match(/(?:DC|SG) (\d+)/g) || []).map(x => x.slice(3)));
// Tippfehler im SRD („1dl0“, „10d 10“), die deutsche Fassung nennt den richtigen Würfel.
const KNOWN = new Set(['Zauber Moonbeam', 'Zauber Symbol']);
let bad = 0, n = 0;
function check(label, en, de) {
  n++;
  if (KNOWN.has(label)) return;
  const missD = [...dice(en)].filter(d => !dice(de).has(d)), missS = [...dcs(en)].filter(d => !dcs(de).has(d));
  const extraD = [...dice(de)].filter(d => !dice(en).has(d));
  if (missD.length || missS.length || extraD.length) { bad++; console.log(`${label}: fehlt ${missD.join(' ')}${missS.length ? ' SG ' + missS.join(' ') : ''}${extraD.length ? ' | nur DE ' + extraD.join(' ') : ''}`); }
}
const sp = load('de-full-spells-');
for (const s of read('spells.json')) if (sp[s.n]) check('Zauber ' + s.n, s.text.en + ' ' + (s.higher?.en || ''), sp[s.n].join(' '));
const it = load('de-full-items-');
for (const r of [...read('magic-items.json'), ...read('potions.json'), ...read('items.json')]) if (it[r.id]) check('Gegenstand ' + r.id, r.text.en, it[r.id]);
const tx = load('de-full-texts-');
for (const [en, de] of Object.entries(tx)) check('Text ' + en.slice(0, 50), en, de);
console.log(`Geprüft: ${n}, auffällig: ${bad}`);
process.exitCode = bad ? 1 : 0;
