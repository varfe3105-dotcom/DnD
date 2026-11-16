// „Was kann ich in meinem Zug tun?“ nach den Regeln 2024: allgemeine Möglichkeiten plus das, was dieser Charakter mitbringt.
import spells from '../../data/spells.json';
import mastery from '../../data/mastery.json';
import { S, U } from '../state.js';
import { esc } from '../util.js';
import { refs, get, itemView, featureLevel } from '../helpers.js';
import { BYN } from '../catalog.js';
import { classLevels } from '../tables.js';
import { effects } from '../effects.js';
import { t, loc, dist } from '../i18n/index.js';

const TIME = Object.fromEntries(spells.map(s => [s.n, s.time.en]));
const ACTIONS = ['attack', 'dash', 'disengage', 'dodge', 'help', 'hide', 'influence', 'magic', 'ready', 'search', 'study', 'utilize'];
// Merkmale (Ressourcen oder Talente), die 2024 eine Bonusaktion bzw. Reaktion brauchen
const BONUS = ['Second Wind', 'Rage', 'Cunning Action', 'Bardic Inspiration', 'Flurry of Blows', 'Patient Defense', 'Step of the Wind', 'Lay on Hands', 'Wild Shape', 'Healing Light', 'Fey Step', 'Hunter\'s Mark', 'Martial Arts', 'Steady Aim', 'Wild Companion', 'Divine Spark'];
const REACT = ['Uncanny Dodge', 'Deflect Attacks', 'Deflect Missiles', 'Sentinel', 'War Caster', 'Shield Master', 'Defensive Duelist', 'Interception', 'Protection', 'Warding Flare', 'Tactical Mind', 'Riposte', 'Parry'];
const has = (list, n) => list.find(x => n.toLowerCase().includes(x.toLowerCase()));

/** Anzahl der Waffen mit Meisterschaft (Weapon Mastery, Regeln 2024). 0 = Klasse hat das Merkmal nicht. */
export function masteryCount() {
  const lv = k => featureLevel(k);
  const out = [];
  const b = lv('Barbarian'); if (b) out.push(b >= 10 ? 4 : b >= 4 ? 3 : 2);
  const f = lv('Fighter'); if (f) out.push(f >= 16 ? 6 : f >= 10 ? 5 : f >= 4 ? 4 : 3);
  ['Paladin', 'Ranger', 'Rogue'].forEach(k => { if (lv(k)) out.push(2); });
  return out.length ? Math.max(...out) : 0;
}
export const masteryOf = id => mastery.find(m => m.id === id);
export const masteryText = id => { const m = masteryOf(id); return m ? loc(m.text) : ''; };

function ownLists() {
  const sp = S.spells.filter(s => s.prep !== false || s.always || !s.lvl);
  const byTime = re => sp.filter(s => re.test(TIME[s.n] || s.time || '')).map(s => s.n);
  const feats = [...S.res.map(r => r.n), ...S.feats.map(f => f.n)];
  const bonus = [...new Set(feats.map(n => has(BONUS, n)).filter(Boolean))];
  const react = [...new Set(feats.map(n => has(REACT, n)).filter(Boolean))];
  const bag = refs().map(r => get(r)).filter(Boolean);
  // 2024: Trank trinken (auch Heiltrank, Philter, Elixier) ist eine Bonusaktion; Öle, Säure und Gift sind es nicht
  const potions = bag.filter(x => /^potion:(potions?-of-|philter-|elixir-)|^potion:antitoxin/.test(x.ref || '') || (!x.ref && /^(potion|trank|heiltrank)/i.test(x.n || '')));
  const poison = bag.some(x => x.ref === 'potion:poison-basic');
  const light = k => { const r = S.eq[k], e = r && r.ref && BYN[r.ref]; return /\b(Light|Leicht)\b/.test((e && e.p) || (r && r.p) || ''); };
  const twf = !!(S.eq.main && S.eq.off && light('main') && light('off'));
  // Nick greift nur, wenn die Meisterschaft dieser Waffe gewählt ist
  const nick = twf && masteryCount() > 0 && ['main', 'off'].some(k => { const r = S.eq[k]?.ref; return BYN[r]?.mastery === 'nick' && (S.mastery || []).includes(r); });
  return { act: byTime(/^1 action/i), bonusSp: byTime(/^1 bonus action/i), reactSp: byTime(/^1 reaction/i), bonus, react, potions, poison, twf, nick };
}

export function vTurnHelp() {
  const o = ownLists(), fx = effects(), li = (h, txt) => `<li><b>${h}</b>${txt ? ` <span>${txt}</span>` : ''}</li>`;
  const own = (label, list) => (list.length ? `<p class="tv-own"><span class="lbl">${label}</span> ${list.map(esc).join(', ')}</p>` : '');
  const attacks = Math.max(1, classLevels().some(c => ['Fighter', 'Barbarian', 'Paladin', 'Ranger', 'Monk'].includes(c.k) && c.lvl >= 5) ? 2 : 1, featureLevel('Fighter') >= 20 ? 4 : featureLevel('Fighter') >= 11 ? 3 : 0);
  const act = `<div class="tv-sec"><h4>${t('tv.action')}</h4><ul>${ACTIONS.map(k => li(t('tv.a.' + k), k === 'attack' ? t('tv.d.attack', { n: attacks }) : t('tv.d.' + k))).join('')}</ul>${own(t('tv.ownSpells'), o.act)}</div>`;
  const bonusItems = [
    ...o.bonusSp.map(n => li(esc(n), t('tv.spell'))),
    ...o.bonus.map(n => li(esc(n), t('tv.feature'))),
    o.potions.length ? li(t('tv.potion'), esc(o.potions.map(p => itemView(p).n).join(', '))) : '',
    o.poison ? li(t('tv.poison'), t('tv.poisonD')) : '',
    o.twf ? li(t('tv.offhand'), t(o.nick ? 'tv.offhandNick' : 'tv.offhandD')) : '',
  ].filter(Boolean);
  const bonus = `<div class="tv-sec"><h4>${t('tv.bonus')}</h4>${bonusItems.length ? `<ul>${bonusItems.join('')}</ul>` : `<p class="note">${t('tv.bonusNone')}</p>`}<p class="note">${t('tv.bonusRule')}</p></div>`;
  const react = `<div class="tv-sec"><h4>${t('tv.react')}</h4><ul>${li(t('tv.opp'), t('tv.oppD'))}${o.reactSp.map(n => li(esc(n), t('tv.spell'))).join('')}${o.react.map(n => li(esc(n), t('tv.feature'))).join('')}</ul></div>`;
  const move = `<div class="tv-sec"><h4>${t('tv.move')}</h4><ul>${li(t('tv.speed', { n: dist(fx.speed.val) }), t('tv.speedD'))}${li(t('tv.jump'), t('tv.jumpD', { l: dist(Math.round((S.abil.str || 10) * 0.3 * 2) / 2), h: dist(Math.max(0, Math.round((3 + Math.floor(((S.abil.str || 10) - 10) / 2)) * 0.3 * 2) / 2)) }))}${li(t('tv.prone'), t('tv.proneD'))}${li(t('tv.terrain'), t('tv.terrainD'))}</ul></div>`;
  const free = `<div class="tv-sec"><h4>${t('tv.free')}</h4><ul>${li(t('tv.obj'), t('tv.objD'))}${li(t('tv.talk'), t('tv.talkD'))}</ul></div>`;
  return `<details class="card turnov"${U.TURNOV ? ' open' : ''}><summary>${t('tv.title')}</summary><p class="note">${t('tv.intro')}</p><div class="tv-grid">${act}${bonus}${react}${move}${free}</div><p class="note">${t('tv.clarify')}</p><p class="src">${t('tv.src')}</p></details>`;
}
