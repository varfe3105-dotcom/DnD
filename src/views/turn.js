// „Dein Zug“ nach den Regeln 2024: alle Möglichkeiten offen als Liste (wie die Zauber), jede mit Knopf zum Ausführen.
// Was ausgeführt ist, verbraucht Aktion, Bonusaktion, Reaktion oder Bewegung (S.turn, src/turn-state.js).
import spells from '../../data/spells.json';
import mastery from '../../data/mastery.json';
import { S } from '../state.js';
import { esc } from '../util.js';
import { refs, get, itemView, featureLevel } from '../helpers.js';
import { tok } from '../icons.js';
import { BYN } from '../catalog.js';
import { turn, speedMax, attacksPerAction } from '../turn-state.js';
import { t, loc, dist } from '../i18n/index.js';

const TIME = Object.fromEntries(spells.map(s => [s.n, s.time.en]));
const ACTIONS = [['attack', 'sword'], ['dash', 'boots'], ['disengage', 'wing'], ['dodge', 'shield'], ['help', 'heart'], ['hide', 'cloak'], ['influence', 'mask'], ['magic', 'wand'], ['ready', 'bolt'], ['search', 'eye'], ['study', 'book'], ['utilize', 'tool']];
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

function own() {
  const sp = S.spells.map((s, i) => [s, i]).filter(([s]) => s.prep !== false || s.always || !s.lvl);
  const byTime = re => sp.filter(([s]) => re.test(TIME[s.n] || s.time || ''));
  // Merkmal mit Ressource: Index in S.res, damit Ausführen eine Anwendung verbraucht
  const feats = [...S.res.map((r, i) => ({ n: r.n, res: i })), ...S.feats.map(f => ({ n: f.n, res: -1 }))];
  const pick = list => { const seen = new Set(); return feats.map(f => ({ ...f, k: has(list, f.n) })).filter(f => f.k && !seen.has(f.k) && seen.add(f.k)); };
  const bag = refs().map(r => ({ r, it: get(r) })).filter(x => x.it);
  // 2024: Trank trinken (auch Heiltrank, Philter, Elixier) ist eine Bonusaktion; Öle, Säure und Gift sind es nicht
  const potions = bag.filter(({ it: x }) => /^potion:(potions?-of-|philter-|elixir-)|^potion:antitoxin/.test(x.ref || '') || (!x.ref && /^(potion|trank|heiltrank)/i.test(x.n || '')));
  const poison = bag.find(({ it: x }) => x.ref === 'potion:poison-basic');
  const light = k => { const r = S.eq[k], e = r && r.ref && BYN[r.ref]; return /\b(Light|Leicht)\b/.test((e && e.p) || (r && r.p) || ''); };
  const twf = !!(S.eq.main && S.eq.off && light('main') && light('off'));
  const nick = twf && masteryCount() > 0 && ['main', 'off'].some(k => { const r = S.eq[k]?.ref; return BYN[r]?.mastery === 'nick' && (S.mastery || []).includes(r); });
  return { act: byTime(/^1 action/i), bonusSp: byTime(/^1 bonus action/i), reactSp: byTime(/^1 reaction/i), bonus: pick(BONUS), react: pick(REACT), potions, poison, twf, nick };
}

const btn = (a, attrs, label, off) => `<button class="btn sm${off ? '' : ' solid'}" data-a="${a}" ${attrs}${off ? ' disabled' : ''}>${label}</button>`;
const row = (ic, name, small, button, extra = '') => `<div class="row tv-row${extra}"><div class="ic">${tok(ic)}</div><div class="nm">${name}${small ? `<small>${small}</small>` : ''}</div>${button}</div>`;
/** Kopf jeder Gruppe wie bei den Zaubergraden: Name, frei/verbraucht. */
const head = (label, free, note) => `<div class="lvh tv-h"><b>${label}</b><small>${note}</small><span class="tv-tok${free ? ' on' : ''}" aria-label="${free ? t('turn.free') : t('turn.used')}">${free ? t('turn.free') : t('turn.used')}</span></div>`;

/** Kleine Marken für die Kurzleiste: A, B, R, Bewegung. */
export function turnChips() {
  const T = turn();
  if (!T.on) return '';
  const c = (on, l, title) => `<i class="tv-chip${on ? ' on' : ''}" title="${title}">${l}</i>`;
  return `<span class="mb-v mb-turn"><small>${t('turn.title')}</small><b>${c(T.a < T.aMax, t('turn.abbrA'), t('tv.action'))}${c(!T.b, t('turn.abbrB'), t('tv.bonus'))}${c(!T.r, t('turn.abbrR'), t('tv.react'))} ${esc(dist(speedMax()))}</b></span>`;
}

/** Teile der Zugübersicht einzeln (für die Reiter im Kampfbereich der Kampagne): top, act, bonus, react, move, free. */
export function turnParts() {
  const o = own(), T = turn(), aFree = T.a < T.aMax, n = attacksPerAction();
  const step = 1.5;
  const surge = S.res.findIndex(r => r.n === 'Action Surge');
  const top = `<div class="tv-bar">${[[aFree, t('tv.action') + (T.aMax > 1 ? ` ${T.aMax - T.a}/${T.aMax}` : '')], [!T.b, t('tv.bonus')], [!T.r, t('tv.react')], [!T.obj, t('turn.objShort')]].map(([on, l]) => `<span class="tv-tok${on ? ' on' : ''}">${l}</span>`).join('')}<span class="tv-tok on">${t('turn.moveMax', { n: dist(speedMax()) })}</span>${btn('tnew', '', T.on ? t('turn.new') : t('turn.start'))}${T.on ? '<button class="btn sm" data-a="tend">' + t('turn.endCombat') + '</button>' : ''}</div><p class="note">${t(T.on ? 'turn.introOn' : 'turn.intro')}</p>`;

  // Aktion
  const atkLeft = T.atkMax - T.atk, inAttack = T.atkMax > 0;
  const atkPips = inAttack ? ` <span class="tv-pips">${Array.from({ length: T.atkMax }, (_, j) => `<i class="${j < T.atk ? '' : 'on'}"></i>`).join('')}</span>` : '';
  const canAtk = atkLeft > 0 || aFree;
  const actRows = ACTIONS.map(([k, ic]) => {
    if (k === 'attack') {
      const label = inAttack && atkLeft > 0 ? t('turn.nextAttack') : t('turn.do');
      return row(ic, t('tv.a.attack') + atkPips, t('turn.s.attack', { n }), btn('tatk', 'data-k="attack"', label, !canAtk)) +
        row('hammer', t('turn.shove'), t('turn.s.shove'), btn('tatk', 'data-k="shove"', t('turn.do'), !canAtk), ' tv-sub') +
        row('gloves', t('turn.grapple'), t('turn.s.grapple'), btn('tatk', 'data-k="grapple"', t('turn.do'), !canAtk), ' tv-sub');
    }
    const small = k === 'magic' && o.act.length ? t('turn.s.magicOwn', { n: o.act.map(([s]) => esc(s.n)).join(', ') }) : t('turn.s.' + k);
    return row(ic, t('tv.a.' + k), small, btn('tact', `data-k="${k}"`, t('turn.do'), !aFree), '" title="' + esc(t('tv.d.' + k)));
  }).join('');
  const surgeRow = surge >= 0 ? row('bolt', 'Action Surge', t('turn.s.surge'), btn('tsurge', `data-i="${surge}"`, t('turn.do'), S.res[surge].used >= S.res[surge].max)) : '';
  const act = head(t('tv.action'), aFree, inAttack ? t('turn.attacksLeft', { a: atkLeft, b: T.atkMax }) : t('turn.oneAction')) + actRows + surgeRow;

  // Bonusaktion
  const bFree = !T.b;
  const resLeft = i => i < 0 || S.res[i].used < S.res[i].max;
  const bRows = [
    ...o.bonusSp.map(([s, i]) => row('star', esc(s.n), t('tv.spell') + (s.lvl ? ' · ' + t('spell.level', { n: s.lvl }) : ''), btn('tcast', `data-i="${i}"`, t('turn.cast'), !bFree))),
    ...o.bonus.map(f => row('swirl', esc(f.n), t('tv.feature') + (f.res >= 0 ? ' · ' + t('turn.usesLeft', { n: S.res[f.res].max - S.res[f.res].used }) : ''), f.n === 'Bardic Inspiration' ? btn('tbigive', `data-i="${f.res}"`, t('buff.biGive'), !bFree || !resLeft(f.res)) : btn('tbonus', `data-res="${f.res}" data-n="${esc(f.n)}"`, t('turn.do'), !bFree || !resLeft(f.res)))),
    ...o.potions.map(({ r, it }) => row('potion', esc(itemView(it).n) + ` <span class="lbl">× ${it.q}</span>`, t('turn.s.potion'), btn('tpotion', `data-r="${r}"`, t('turn.drink'), !bFree))),
    o.poison ? row('skull', t('tv.poison'), t('tv.poisonD'), btn('tbonus', 'data-res="-1"', t('turn.do'), !bFree)) : '',
    o.twf && !o.nick ? row('sword', t('tv.offhand'), t('tv.offhandD'), btn('tbonus', 'data-res="-1"', t('turn.do'), !bFree || !inAttack)) : '',
  ].filter(Boolean);
  const bonus = head(t('tv.bonus'), bFree, t('turn.oneBonus')) + (bRows.join('') || `<p class="note tv-empty">${t('tv.bonusNone')}</p>`) + (o.nick ? `<p class="note">${t('tv.offhandNick')}</p>` : '');

  // Reaktion
  const rFree = !T.r;
  const react = head(t('tv.react'), rFree, t('turn.oneReact')) + [
    row('sword', t('tv.opp'), t('tv.oppD'), btn('treact', 'data-res="-1"', t('turn.do'), !rFree)),
    ...o.reactSp.map(([s, i]) => row('star', esc(s.n), t('tv.spell') + (s.lvl ? ' · ' + t('spell.level', { n: s.lvl }) : ''), btn('tcast', `data-i="${i}"`, t('turn.cast'), !rFree))),
    ...o.react.map(f => row('shield', esc(f.n), t('tv.feature') + (f.res >= 0 ? ' · ' + t('turn.usesLeft', { n: S.res[f.res].max - S.res[f.res].used }) : ''), btn('treact', `data-res="${f.res}"`, t('turn.do'), !rFree || !resLeft(f.res)))),
  ].join('');

  // Bewegung
  const str = S.abil.str || 10, jumpL = dist(Math.round(str * 0.3 * 2) / 2), jumpH = dist(Math.max(0, Math.round((3 + Math.floor((str - 10) / 2)) * 0.3 * 2) / 2));
  const half = Math.round(speedMax() / (1 + T.dash) / 2 / step) * step;
  // Bewegung: nur die maximale Weite (kein Zähler, keine Positionen; Wunsch der Gruppe). Spurten verdoppelt die Anzeige.
  const move = head(t('tv.move'), true, t('turn.moveMax', { n: dist(speedMax()) })) +
    `<div class="row tv-row"><div class="ic">${tok('boots')}</div><div class="nm">${t('turn.walk')}<small>${t('tv.speedD')}</small></div><b class="rc-v s">${esc(dist(speedMax()))}</b></div>` +
    row('wing', t('tv.jump'), t('tv.jumpD', { l: jumpL, h: jumpH }), '') +
    row('leaf', t('turn.standUp'), t('turn.s.standUp', { n: dist(half) }), '') +
    row('leaf', t('tv.terrain'), t('tv.terrainD'), '');

  // Nebenbei
  const free = head(t('tv.free'), !T.obj, t('turn.oneObj')) +
    row('key', t('tv.obj'), t('tv.objD'), btn('tobj', '', t('turn.do'), !!T.obj)) +
    row('music', t('tv.talk'), t('tv.talkD'), '');

  return { top, act, bonus, react, move, free };
}
export function vTurnBoard() {
  const { top, act, bonus, react, move, free } = turnParts();
  return `<h2>${t('turn.title')}</h2><div class="card turnboard">${top}${act}${bonus}${react}${move}${free}<p class="note">${t('tv.clarify')}</p><p class="src">${t('tv.src')}</p></div>`;
}
