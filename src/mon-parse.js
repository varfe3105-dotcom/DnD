// Liest Aktionen aus dem englischen SRD-Werteblock (data/monsters.json, Feld text) für die Kampfansicht der Spielleitung.
// Nur feste Muster werden übernommen (Angriffswurf mit Treffer, Rettungswurf mit SG). Passt eine Aktion nicht,
// bleibt sie reiner Text: es wird nichts geschätzt (Gestaltungskonzept, Abschnitt 11.5). Namen und Texte bleiben englisch.
import { dist, lang } from './i18n/index.js';

const DMG_DE = { Slashing: 'Hieb', Piercing: 'Stich', Bludgeoning: 'Wucht', Fire: 'Feuer', Cold: 'Kälte', Lightning: 'Blitz', Thunder: 'Schall', Acid: 'Säure', Poison: 'Gift', Necrotic: 'Nekrotisch', Radiant: 'Gleißend', Force: 'Energie', Psychic: 'Psychisch' };
export const dmgType = en => (lang === 'de' && DMG_DE[en]) || en;
const AB = { Strength: 'str', Dexterity: 'dex', Constitution: 'con', Intelligence: 'int', Wisdom: 'wis', Charisma: 'cha' };
const DICE = String.raw`(\d+) \((\d+d\d+(?: [+-] \d+)?)\) ([A-Z][a-z]+) damage`;
const FT = String.raw`(?:ft\.|feet\.?)`;
const ATK = new RegExp(String.raw`^(Melee or Ranged|Melee|Ranged) Attack Roll: ([+-]\d+)(?: \(([^)]*)\))?, (?:reach (\d+) ${FT}(?: or range (\d+)(?:/(\d+))? ${FT})?|range (\d+)(?:/(\d+))? ${FT}) Hit: (\d+)(?: \((\d+d\d+(?: [+-] \d+)?)\))? ([A-Z][a-z]+) damage(.*)$`);
const SAVE = /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+)/;
const FIRST_DMG = new RegExp(DICE);
const ft = n => dist(Math.round(+n * 0.3 * 10) / 10);
const rng = (a, b) => (b ? `${ft(a)}/${ft(b)}` : ft(a));
const toDice = d => d.replace(/d/g, lang === 'de' ? 'W' : 'd').replace(/ ([+-]) /g, '$1');
const SECTIONS = /^(Traits|Actions|Bonus Actions|Reactions|Legendary Actions|Lair Actions)$/;

/** Werteblock in Abschnitte und Einträge zerlegen. Jeder Eintrag: { sec, name, text, atk?, save? }. */
export function parseMonster(text) {
  let sec = 'Traits';
  const out = [];
  String(text || '').split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    if (SECTIONS.test(line)) { sec = line; return; }
    const m = line.match(/^([^.]{1,70})\. (.+)$/);
    if (!m) { out.push({ sec, name: '', text: line }); return; }
    const e = { sec, name: m[1], text: m[2] };
    const a = m[2].match(ATK);
    if (a) {
      const reach = a[4] ? ft(a[4]) + (a[5] ? ` · ${rng(a[5], a[6])}` : '') : rng(a[7], a[8]);
      e.atk = { kind: a[1], hit: a[2], note: a[3] || '', reach, avg: a[9], dice: a[10] ? toDice(a[10]) : a[9], type: dmgType(a[11]), more: a[12].replace(/^[,.]\s*/, '').trim() };
    } else {
      const s = m[2].match(SAVE);
      if (s) {
        const d = m[2].match(FIRST_DMG);
        e.save = { ab: AB[s[1]], dc: s[2], ...(d ? { avg: d[1], dice: toDice(d[2]), type: dmgType(d[3]) } : {}) };
      }
    }
    out.push(e);
  });
  return out;
}
