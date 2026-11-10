// Importiert SRD-5.1-Daten aus .cache/5e-database (5e-bits/5e-database) nach data/.
// Wiederholbar: node scripts/import-srd.mjs [--check]
// Englisch kommt wörtlich aus dem SRD. Deutsch und alles außerhalb des SRD steht in
// data/translations/ und wird hier nur zusammengeführt.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(root, '.cache/5e-database/src/2014/en');
if (!fs.existsSync(srcDir)) {
  console.error('Fehlt: git clone --depth 1 https://github.com/5e-bits/5e-database .cache/5e-database');
  process.exit(1);
}
const srd = f => JSON.parse(fs.readFileSync(path.join(srcDir, `5e-SRD-${f}.json`), 'utf8'));
const dataFile = f => path.join(root, 'data', f);
const readData = f => JSON.parse(fs.readFileSync(dataFile(f), 'utf8'));
const readTr = f => { const p = dataFile('translations/' + f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {}; };
const writeArr = (f, a) => fs.writeFileSync(dataFile(f), '[\n' + a.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n');
const writeObj = (f, o) => fs.writeFileSync(dataFile(f), JSON.stringify(o, null, 1) + '\n');
export const descText = d => (Array.isArray(d) ? d : [d]).join('\n').replace(/\r/g, '').trim();

const report = { missing: [] };
const miss = (what, name) => report.missing.push(`${what}: ${name}`);

/* ---- Zustände ---- */
function conditions() {
  const by = Object.fromEntries(srd('Conditions').map(c => [c.name, c]));
  const out = readData('conditions.json').map(c => {
    const de = typeof c.text === 'object' ? c.text.de : c.p;
    const s = by[c.n];
    if (!s) miss('Zustand ohne SRD', c.n);
    return { n: c.n, de: c.de, ic: c.ic, text: { en: s ? descText(s.desc).replace(/^- /gm, '') : '', de }, source: s ? 'srd' : 'summary', verified: false };
  });
  writeArr('conditions.json', out);
  const ex = by.Exhaustion;
  return ex;
}

/* ---- Klassen: Englisch aus SRD-Features, sonst Zusammenfassung ---- */
const norm = s => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
function classes() {
  const data = readData('classes.json');
  const en = readTr('en-classes.json');
  const feats = srd('Features').filter(f => !f.subclass);
  for (const [klass, C] of Object.entries(data)) {
    const own = feats.filter(f => f.class.name === klass);
    for (const [lvl, list] of Object.entries(C.f)) {
      C.f[lvl] = list.map(raw => {
        const n = raw.n ?? raw[0];
        const de = raw.text?.de ?? raw[1];
        const candidates = own.filter(f => f.level === +lvl && (norm(f.name) === norm(n) || norm(f.name).startsWith(norm(n))));
        const hit = candidates[0];
        const key = `${klass}|${lvl}|${n}`;
        const summary = en[key];
        if (hit && !summary) return { n, text: { en: descText(hit.desc), de }, source: 'srd', verified: false };
        if (!summary) miss('Klassenmerkmal ohne Englisch', key);
        return { n, text: { en: summary || '', de }, source: 'summary', verified: false };
      });
    }
  }
  writeObj('classes.json', data);
}

/* ---- Völker ---- */
const ASI = [[/alle Attribute \+1/, 'all abilities +1'], [/zwei andere Attribute \+1/, 'two other abilities +1'], [/zwei Attribute \+1 \(statt alle\)/, 'two abilities +1 (instead of all)'], [/KON/g, 'CON'], [/WEI/g, 'WIS'], [/GES/g, 'DEX']];
const asiEn = de => ASI.reduce((s, [a, b]) => s.replace(a, b), de);
function races() {
  const data = readData('races.json');
  const en = readTr('en-races.json');
  const traits = Object.fromEntries(srd('Traits').map(t => [norm(t.name), t]));
  const conv = (owner, raw) => {
    const n = raw.n ?? raw[0];
    const de = raw.text?.de ?? raw[1];
    const key = `${owner}|${n}`;
    const summary = en[key] ?? en[`*|${n}`];
    const hit = traits[norm(n)];
    if (hit && !summary) return { n, text: { en: descText(hit.desc), de }, source: 'srd', verified: false };
    if (!summary) miss('Volksmerkmal ohne Englisch', key);
    return { n, text: { en: summary || '', de }, source: 'summary', verified: false };
  };
  for (const [race, R] of Object.entries(data)) {
    R.tr = R.tr.map(t => conv(race, t));
    if (typeof R.asi === 'string') R.asi = { en: asiEn(R.asi), de: R.asi };
    for (const [sn, sub] of Object.entries(R.subs)) {
      sub.tr = sub.tr.map(t => conv(sn, t));
      if (typeof sub.asi === 'string') sub.asi = { en: asiEn(sub.asi), de: sub.asi };
    }
  }
  writeObj('races.json', data);
}

const steps = { conditions, classes, races };
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
for (const [name, fn] of Object.entries(steps)) if (!only.length || only.includes(name)) fn();
if (report.missing.length) console.log(report.missing.join('\n'));
console.log(`Fehlend: ${report.missing.length}`);
