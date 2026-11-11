// Ersetzt kurze deutsche Texte durch vollständige Übersetzungen.
// Quelle: data/translations/de-full-texts-*.json als { "englischer Text": "deutscher Text" }.
// Jedes Objekt mit { en, de } in den Datendateien, dessen en dort vorkommt, bekommt die volle Fassung.
// Aufruf: node scripts/apply-full.mjs (läuft auch am Ende von import-srd.mjs)
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = f => path.join(root, 'data', f);
const FILES = ['conditions.json', 'exhaustion.json', 'items.json', 'races.json', 'feats.json', 'options.json', 'classes.json', 'subclasses.json', 'multiclass.json', 'rules.json'];

export function applyFull() {
  const dir = data('translations');
  const map = Object.assign({}, ...fs.readdirSync(dir).filter(f => f.startsWith('de-full-texts-')).sort().map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
  let hits = 0;
  const walk = o => {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (!o || typeof o !== 'object') return;
    if (typeof o.en === 'string' && 'de' in o && map[o.en]) { if (o.de !== map[o.en]) o.de = map[o.en]; hits++; }
    Object.values(o).forEach(walk);
  };
  for (const f of FILES) {
    const file = data(f);
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), json = JSON.parse(raw);
    walk(json);
    // Zeilenweise Arrays behalten ihr Format, damit der Git-Unterschied lesbar bleibt.
    const out = Array.isArray(json) && raw.startsWith('[\n  {') ? '[\n' + json.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n'
      : raw.startsWith('{\n"') ? '{\n' + Object.entries(json).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n') + '\n}\n'
      : JSON.stringify(json, null, raw.startsWith('{\n "') ? 1 : 2) + '\n';
    if (out !== raw) fs.writeFileSync(file, out);
  }
  console.log(`Vollständige Texte eingesetzt: ${hits}`);
  return hits;
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) applyFull();
