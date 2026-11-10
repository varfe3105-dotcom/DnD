// Liest aus Textstücken mit Positionen (PDF oder Texterkennung) einen Charakterentwurf.
// Rein rechnerisch, ohne DOM. Das Ergebnis prüft der Nutzer vor dem Anlegen.
// Item: { s: Text, x, y } mit y nach oben, Seiten sind über y getrennt, Seite etwa 595 breit.

const ABIL = [['str', 'STRENGTH'], ['dex', 'DEXTERITY'], ['con', 'CONSTITUTION'], ['int', 'INTELLIGENCE'], ['wis', 'WISDOM'], ['cha', 'CHARISMA']];
const mod = v => Math.floor((v - 10) / 2);
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const isNum = s => /^\d+$/.test(s);
const SIGNED = /^[+\-−–]\s?\d+$/;
const toInt = s => parseInt(String(s).replace(/[−–]/, '-').replace(/\s/g, ''), 10);
const LABEL = /^[A-Z][A-Z &]{3,}$/;

function splitList(text) {
  const out = []; let depth = 0, cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(clean).filter(x => x && x !== '...');
}

/** Überschriften in Kapitälchen kommen oft Buchstabe für Buchstabe; hier werden sie wieder zu Wörtern. */
function joinLetters(items) {
  const rows = new Map();
  items.forEach(i => { const k = Math.round(i.y); (rows.get(k) || rows.set(k, []).get(k)).push(i); });
  const out = [], short = s => /^[A-Za-z'’]{1,3}$/.test(s);
  for (const row of rows.values()) {
    let cur = null;
    for (const it of row.sort((a, b) => a.x - b.x)) {
      const gap = cur && it.w != null && cur.w != null ? it.x - (cur.x + cur.w) : Infinity;
      if (cur && cur.join && short(it.s) && gap < 9) { cur.s += (gap > 1.5 ? ' ' : '') + it.s; cur.w = it.x + it.w - cur.x; }
      else { if (cur) out.push(cur); cur = { ...it, join: short(it.s) }; }
    }
    if (cur) out.push(cur);
  }
  return out;
}

export function parseSheet(items, lists) {
  const all = joinLetters(items.map(i => ({ ...i, s: clean(i.s) })).filter(i => i.s));
  const rowsOf = list => { const m = new Map(); list.forEach(i => { const k = Math.round(i.y / 3); (m.get(k) || m.set(k, []).get(k)).push(i); }); return [...m.entries()].sort((a, b) => b[0] - a[0]).map(([, r]) => r.sort((a, b) => a.x - b.x)); };
  const label = re => all.find(i => re.test(i.s));
  const labels = re => all.filter(i => re.test(i.s));
  const near = (l, { dx = 30, min = 0, max = 30, test = () => true }) => all.filter(i => i !== l && Math.abs(i.x - l.x) <= dx && i.y - l.y >= min && i.y - l.y <= max && test(i)).sort((a, b) => Math.abs(a.y - l.y) - Math.abs(b.y - l.y))[0];
  const notLabel = i => !LABEL.test(i.s);
  const above = (l, o = {}) => l && near(l, { dx: 30, min: 1, max: 26, test: notLabel, ...o })?.s;
  const below = (l, o = {}) => l && near(l, { dx: 30, min: -40, max: -1, test: notLabel, ...o })?.s;

  const d = { name: '', klass: '', sub: '', level: 0, race: '', background: '', alignment: '', ac: null, hpMax: null, speedFt: null, abil: {}, saves: [], skills: {}, spells: [], items: [], tools: [], langs: [], feats: [], coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, features: [], backstory: '', appearance: '' };

  // Kopfzeile
  d.name = above(label(/^CHARACTER NAME$/i)) || '';
  const bgL = label(/^BACKGROUND$/i);
  d.background = above(bgL) || '';
  const clsL = bgL && all.find(i => /^CLASS$/i.test(i.s) && Math.abs(i.y - bgL.y) < 4);
  const clsText = above(clsL) || '';
  d.klass = lists.classes.find(c => new RegExp(`\\b${c}\\b`, 'i').test(clsText)) || lists.classes.find(c => all.some(i => new RegExp(`^${c}\\b`, 'i').test(i.s))) || '';
  const spL = label(/^(SPECIES|RACE)$/i);
  d.race = above(spL) || '';
  d.sub = above(label(/^SUBCLASS$/i)) || '';
  const lvL = label(/^LEVEL$/i);
  d.level = toInt(above(lvL, { dx: 16, test: i => isNum(i.s) }) || '') || 0;
  if (!d.level) { const m = clsText.match(/(\d{1,2})/); if (m) d.level = +m[1]; }

  // Attribute: Wert steht unter oder neben dem Namen, Modifikator hat ein Vorzeichen
  for (const [k, word] of ABIL) {
    const l = label(new RegExp(`^${word}$`, 'i'));
    if (!l) continue;
    const v = all.filter(i => isNum(i.s) && +i.s >= 1 && +i.s <= 30 && i.x >= l.x - 8 && i.x <= l.x + 75 && l.y - i.y >= 5 && l.y - i.y <= 60).sort((a, b) => (l.y - a.y) - (l.y - b.y))[0];
    if (v) d.abil[k] = +v.s;
  }
  const profL = label(/^PROFICIENCY$/i);
  const prof = toInt(profL && near(profL, { dx: 32, min: -45, max: -1, test: i => SIGNED.test(i.s) })?.s) || (2 + Math.floor((Math.max(d.level, 1) - 1) / 4));

  // Fertigkeiten und Rettungswürfe: Übung ergibt sich aus Wert minus Modifikator
  const skillNames = new Map(lists.skills.map(([n, a]) => [n.toLowerCase(), [n, a]]));
  const abLabels = ABIL.map(([k, w]) => [k, label(new RegExp(`^${w}$`, 'i'))]).filter(x => x[1]);
  for (const row of rowsOf(all)) {
    const pairs = [];
    row.forEach((it, i) => {
      const m = it.s.match(/^([+\-−–]\s?\d+)\s+(.+)$/);
      if (m) pairs.push([m[1], m[2], it]);
      else if (SIGNED.test(it.s) && row[i + 1] && row[i + 1].x - it.x < 40) pairs.push([it.s, row[i + 1].s, it]);
    });
    for (const [val, name, it] of pairs) {
      const n = toInt(val);
      if (/^saving throw/i.test(name)) {
        const owner = abLabels.filter(([, l]) => Math.abs(l.x - it.x) < 45 && l.y > it.y).sort((a, b) => a[1].y - b[1].y)[0];
        if (owner && d.abil[owner[0]] && n - mod(d.abil[owner[0]]) >= prof) d.saves.push(owner[0]);
        continue;
      }
      const sk = skillNames.get(name.toLowerCase());
      if (sk && d.abil[sk[1]]) { const diff = n - mod(d.abil[sk[1]]); if (diff >= prof * 2) d.skills[sk[0]] = 2; else if (diff >= prof) d.skills[sk[0]] = 1; }
    }
  }

  // Einzelwerte
  const acL = label(/^ARMOR$/i);
  const ac = acL && near(acL, { dx: 26, min: -55, max: -1, test: i => isNum(i.s) && +i.s >= 5 && +i.s <= 35 });
  if (ac) d.ac = +ac.s;
  const hp = labels(/^MAX$/i).map(l => near(l, { dx: 24, min: 1, max: 20, test: i => isNum(i.s) })).find(Boolean);
  if (hp) d.hpMax = +hp.s;
  const spdL = label(/^SPEED$/i);
  const spd = spdL && near(spdL, { dx: 30, min: -40, max: -1, test: i => /\d+\s*(ft|feet)/i.test(i.s) });
  if (spd) d.speedFt = parseInt(spd.s, 10);
  const alignRe = /^(lawful|neutral|chaotic)\b.*|^true neutral$/i;
  d.alignment = all.find(i => alignRe.test(i.s) && i.s.length < 20)?.s || '';

  // Abschnitte: Zeilen unter einer Überschrift in derselben Spalte
  const section = (l, { left = 12, right = 240, stop = LABEL } = {}) => {
    if (!l) return [];
    const inCol = all.filter(i => i.y < l.y - 2 && i.y > l.y - 420 && i.x >= l.x - left && i.x <= l.x + right);
    const out = []; let last = l.y;
    for (const row of rowsOf(inCol)) {
      if (row.some(i => stop.test(i.s)) || last - row[0].y > 34) break;
      out.push(row.map(i => i.s).join(' '));
      last = row[0].y;
    }
    return out;
  };
  const lang = label(/^LANGUAGES$/i);
  d.langs = splitList(section(lang, { left: 70, right: 120 }).join(', '));
  d.tools = splitList(section(label(/^TOOLS$/i), { left: 5, right: 180 }).join(', '));
  const eqL = label(/^EQUIP[E]?MENT$/i);
  const eqText = section(eqL, { left: 70, right: 130, stop: /^(magic item|attunement|coins)/i }).join(' ').replace(/,\s*$/, '');
  d.items = splitList(eqText.replace(/\s{2,}/g, ' ').replace(/([a-z)])\s+(\d+\s+[A-Z])/g, '$1, $2')).map(n => { const m = n.match(/^(\d+)\s+(.+)$/); return m ? { name: m[2], q: +m[1] } : { name: n, q: 1 }; });
  const featL = label(/^FEATS$/i);
  if (featL) d.feats = all.filter(i => i.y < featL.y && i.y > featL.y - 140 && i.x > featL.x - 90 && lists.feats.includes(i.s)).map(i => i.s);
  const featuresBlock = labels(/^CLASS FEATURES$/i).sort((a, b) => a.x - b.x)[0];
  d.features = section(featuresBlock, { left: 60, right: 170 }).filter(x => x !== '...');
  d.traits = section(label(/^(SPECIES TRAITS|RACIAL TRAITS)$/i), { left: 60, right: 120 });
  const bsL = label(/^BACKSTORY/i);
  d.backstory = section(bsL, { left: 40, right: 200, stop: /^alignment$/i }).filter(x => x !== '...').join('\n');
  d.appearance = section(label(/^APPEARANCE$/i), { left: 60, right: 170 }).filter(x => x !== '...').join('\n');

  // Münzen
  const coinRow = rowsOf(all).find(r => ['CP', 'SP', 'GP'].every(c => r.some(i => i.s === c)));
  if (coinRow) for (const c of coinRow) { const key = c.s.toLowerCase(); if (key in d.coins) { const v = near(c, { dx: 18, min: -40, max: -1, test: i => isNum(i.s) }); if (v) d.coins[key] = +v.s; } }

  // Zauber: Name mit Gradzahl davor, oder Überschrift mit „Level n …“ darunter
  const names = new Map(lists.spells.map(n => [n.toLowerCase(), n]));
  const found = new Set();
  const rows = rowsOf(all);
  rows.forEach((row, ri) => row.forEach((it, i) => {
    const n = names.get(it.s.toLowerCase());
    if (!n) return;
    const prev = row[i - 1];
    const next = all.filter(o => o.y < it.y && o.y > it.y - 22 && Math.abs(o.x - it.x) < 12)[0];
    if ((prev && /^[0-9]$/.test(prev.s) && it.x - prev.x < 60) || (next && /^(level \d|\w+ cantrip|cantrip)/i.test(next.s))) found.add(n);
  }));
  d.spells = [...found];
  d.hasSheet = !!(d.name || d.klass || Object.keys(d.abil).length >= 3);
  return d;
}

/** Führt mehrere Dateien zusammen, etwa Bogen und Zauberliste. */
export function mergeDrafts(list) {
  const main = list.find(d => d.hasSheet) || list[0];
  const spells = [...new Set(list.flatMap(d => d.spells))];
  return { ...main, spells };
}
