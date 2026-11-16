// Prüft nach dem Bauen, dass alle Grafiken eingebettet sind. Fehlt eine Datei im Repository (z. B. durch .gitignore),
// lässt Vite den Verweis stehen und die veröffentlichte Seite zeigt ein leeres Feld. Das soll den Build abbrechen.
import fs from 'node:fs';

const files = process.argv.slice(2).length ? process.argv.slice(2) : ['dist/charakterbogen.html', 'dist-web/index.html'];
let bad = false;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  const dangling = [...new Set(s.match(/url\(\s*["']?(?:\.?\/)?assets\/[^)"']+/g) || [])];
  const webp = (s.match(/data:image\/webp/g) || []).length;
  if (dangling.length) { bad = true; console.error(`${f}: nicht eingebettete Grafiken:\n  ${dangling.join('\n  ')}`); }
  if (webp < 15) { bad = true; console.error(`${f}: nur ${webp} eingebettete WebP-Grafiken (erwartet mindestens 15, RealmCraft-Grafiken fehlen?)`); }
  if (!bad) console.log(`${f}: alle Grafiken eingebettet (${webp} WebP).`);
}
process.exit(bad ? 1 : 0);
