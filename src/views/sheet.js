import { unarmed, ammoFor, ammoLeft } from '../attacks.js';
import { vCharges, vPets } from './extras.js';
import { castOptions } from '../game.js';
import { prepCap, spellStats, classLevels } from '../tables.js';
import { esc, clamp, mod, sg } from '../util.js';
import { tok, itTone } from '../icons.js';
import { CLN, SK, ABK, CLIC } from '../constants.js';
import { S, U } from '../state.js';
import { initBonus, passivePerception, featureLevel } from '../helpers.js';
import { hdText, skv, pips, numIn, get, refs, atk, raceTraits, abName, abShort, itemView, spellView, resText } from '../helpers.js';
import { COND, EXH, featText, byName, CLASSES, BYN } from '../catalog.js';
import { t, loc, dice, dist, lang, nameLine, deName } from '../i18n/index.js';
import { effects, hpMaxNow, rollState, anyEffect } from '../effects.js';

/* ---- Wirkungen von Zuständen, Erschöpfung und Rüstung ---- */
const why = list => [...new Set(list)].join(', ');
/** Kurzmarke (V/N/✕) mit Begründung im Tooltip. */
function fxMark(adv, dis, fail) {
  if (fail && fail.length) return `<b class="fxm fail" title="${esc(t('fx.fail') + ': ' + why(fail))}">${t('fx.failShort')}</b>`;
  const st = rollState(adv || [], dis || []);
  if (!st || st === 'both') return '';
  return `<b class="fxm ${st}" title="${esc(t('fx.' + st) + ': ' + why(st === 'adv' ? adv : dis))}">${t(st === 'adv' ? 'fx.advShort' : 'fx.disShort')}</b>`;
}
/** Ausgeschriebener Vor-/Nachteil mit Gründen. */
function fxText(adv, dis) {
  const st = rollState(adv, dis);
  if (!st) return '';
  return st === 'both' ? `${t('fx.both')} (${esc(why([...adv, ...dis]))})` : `<b class="fxw ${st}">${t('fx.' + st)}</b> (${esc(why(st === 'adv' ? adv : dis))})`;
}
export function vFx(e) {
  if (!anyEffect(e)) return '';
  const L = [], line = (k, v) => L.push(`<li><span class="lbl">${k}</span> ${v}</li>`);
  if (e.noAct.length) line(t('fx.noAct'), `(${esc(why(e.noAct))})`);
  const a = fxText(e.atk.adv, e.atk.dis); if (a) line(t('fx.atk'), a);
  if (e.checks.length) line(t('fx.checks'), fxText([], e.checks));
  if (e.checkAb.str.length) line(t('fx.checkStrDex'), fxText([], e.checkAb.str));
  if (e.stealth.length) line(t('fx.stealth'), fxText([], e.stealth));
  if (e.sight.length) line(t('fx.sight'), `(${esc(why(e.sight))})`);
  if (e.hear.length) line(t('fx.hear'), `(${esc(why(e.hear))})`);
  ABK.forEach(k => {
    const s = e.saves[k];
    if (s.fail.length) line(`${t('fx.saves')} ${abName(k)}`, `<b class="fxw fail">${t('fx.fail')}</b> (${esc(why(s.fail))})`);
    else if (s.dis.length) line(`${t('fx.saves')} ${abName(k)}`, fxText([], s.dis));
  });
  if (e.speed.val !== e.speed.norm) line(t('fx.speed'), `<b class="fxw dis">${dist(e.speed.val)}</b> (${esc(why([...e.speed.zero, ...e.speed.half, ...e.speed.minus]))})`);
  if (e.hpHalf) line(t('fx.hp'), `(${esc(e.hpHalf)})`);
  if (e.noCast.length) line(t('fx.noCast'), `(${esc(why(e.noCast))})`);
  const vs = [];
  if (e.vs.adv.length) vs.push(`${t('fx.adv')} (${esc(why(e.vs.adv))})`);
  if (e.vs.meleeAdv.length) vs.push(`${t('fx.vsMelee')}, ${t('fx.vsRanged')} (${esc(why(e.vs.meleeAdv))})`);
  if (e.vs.dis.length) vs.push(`${t('fx.dis')} (${esc(why(e.vs.dis))})`);
  if (e.vs.crit.length) vs.push(`${t('fx.crit')} (${esc(why(e.vs.crit))})`);
  if (vs.length) line(t('fx.vs'), vs.join(' · '));
  return `<div class="fx card"><b class="fxh">${t('fx.title')}</b><ul>${L.join('')}</ul><p class="note">${t('fx.note')}</p></div>`;
}

export const schoolName =s => { const k = { Hervorrufung: 'evocation', Bannmagie: 'abjuration', Beschwörung: 'conjuration', Wahrsagung: 'divination', Verzauberung: 'enchantment', Illusion: 'illusion', Nekromantie: 'necromancy', Verwandlung: 'transmutation' }[s] || String(s || '').toLowerCase(); return k ? t('school.' + k) : ''; };
export const srcNote = s => s === 'own' ? t('src.own') : s === 'srd' ? t('src.srd') : t('src.summary');
export const restLabel = r => t('rest.' + (['short', 'long', 'none'].includes(r) ? r : 'long'));

const RUNES = { str: 'M6 2v16M6 3l8 5-8 5', dex: 'M5 2l10 16M15 2L5 18', con: 'M10 2v16M4 6l6 4 6-4', int: 'M4 18V2l12 16V2', wis: 'M10 2l6 8-6 8-6-8z', cha: 'M4 4l6 6 6-6M10 10v8' };
export function vAbil(edit) {
  const fx = edit ? null : effects();
  return `<div class="abs${edit ? ' edit' : ''}">${ABK.map(k => {
    const n = abName(k), m = mod(S.abil[k]), sv = m + (S.saves[k] ? S.prof : 0);
    return `<div class="abw"><div class="ab"><div class="abi"><svg class="rune" viewBox="0 0 20 20" aria-hidden="true"><path d="${RUNES[k]}"/></svg><small>${n}</small><b>${sg(m)}</b></div></div><div class="abv">${edit ? numIn('abil.' + k, S.abil[k], n, 1, 30) : S.abil[k]}</div>${edit ? `<button class="tg${S.saves[k] ? ' on' : ''}" data-a="tsave" data-k="${k}" aria-pressed="${!!S.saves[k]}">${t('ab.saveProf')}</button>` : `<div class="sv${S.saves[k] ? ' p' : ''}" title="${t('ab.save')}"><i></i><span class="svl">${t('ab.save')}</span><span class="svs">${t('ab.saveShort')}</span> ${sg(sv)}${fx ? fxMark([], fx.saves[k].dis, fx.saves[k].fail) : ''}</div>`}</div>`;
  }).join('')}</div>`;
}
export function vHP() {
  const max = hpMaxNow(), pct = max ? clamp(S.hp / max * 100, 0, 100) : 0, tp = max ? clamp(S.tmp / max * 100, 0, 100 - pct) : 0;
  return `<h2>${t('hp.title')}</h2><div class="card">
  <div class="hpt"><button class="sq" data-a="hp" data-d="-1" aria-label="${t('hp.minusOne')}">−</button><div class="hpn${S.hp === 0 ? ' down' : ''}"><b>${S.hp}</b><small>/ ${max}${max !== S.hpMax ? ` <span class="fxw dis" title="${esc(t('fx.hp'))}">(${S.hpMax})</span>` : ''}</small>${S.tmp ? `<span class="tmp">${t('hp.temp', { n: S.tmp })}</span>` : ''}</div><button class="sq" data-a="hp" data-d="1" aria-label="${t('hp.plusOne')}">+</button></div>
  <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i><u style="width:${tp}%"></u></div>
  <div class="hpin"><input type="number" id="hpv" min="1" inputmode="numeric" placeholder="${t('hp.amount')}" aria-label="${t('hp.amountLabel')}"><button class="btn bad" data-a="dmg">${t('hp.damage')}</button><button class="btn good" data-a="heal">${t('hp.heal')}</button><button class="btn" data-a="temp">${t('hp.tempBtn')}</button></div>
  ${S.hp === 0 ? vDeath() : ''}
  <div class="row" style="margin-top:8px"><div class="ic">${tok('dice')}</div><div class="nm">${t('hd.title')}<small>${t('hd.left', { a: S.hd.max - S.hd.used, b: S.hd.max, d: hdText(), m: sg(mod(S.abil.con)) })}</small></div><div class="pips">${pips(S.hd.max, S.hd.used, 'data-a="pip" data-k="hd"')}</div></div></div>`;
}
export function vDeath() {
  const r = (x, l) => `<div class="dsr${x === 'f' ? ' f' : ''}"><span>${l}</span>${[0, 1, 2].map(j => `<button class="dot${j < S.death[x] ? ' on' : ''}" data-a="ds" data-t="${x}" data-j="${j}" aria-label="${l} ${j + 1}"></button>`).join('')}</div>`;
  return `<div class="death"><div><b>${t('death.title')}</b><br><span>${dice(t('death.hint'))}</span></div>${r('s', t('death.s'))}${r('f', t('death.f'))}</div>`;
}
export function vCond() {
  const act = COND.filter(c => S.cond[c.n]);
  return `<h2>${t('cond.title')}${act.length ? `<em>${t('cond.active', { n: act.length })}</em>` : ''}</h2><div class="card"><div class="chips">${(U.CONDOPEN ? COND : act).map(c => `<button class="chip${S.cond[c.n] ? ' on' : ''}" data-a="cond" data-c="${c.n}" aria-pressed="${!!S.cond[c.n]}" title="${esc(c.de)}">${esc(nameLine(c.n, c.de))}</button>`).join('')}<button class="chip more" data-a="condopen" aria-expanded="${!!U.CONDOPEN}">${U.CONDOPEN ? t('cond.close') : t('cond.add')}</button></div>${act.map(c => `<div class="row"><div class="ic">${tok(c.ic, undefined, 'cond:' + c.n)}</div><div class="nm">${c.n}${deName(c.n, c.de) ? ` <span class="lbl">${c.de}</span>` : ''}<small>${esc(loc(c.text))}</small></div></div>`).join('')}<div class="row"><div class="ic">${tok('skull')}</div><div class="nm">${t('exh.title', { n: S.exh })}<small>${S.exh ? EXH.slice(0, S.exh).map(e => `${e.level}: ${esc(loc(e.text))}`).join(' · ') : t('exh.none')}</small></div><div class="qty"><button data-a="exh" data-d="-1" aria-label="${t('exh.down')}">−</button><button data-a="exh" data-d="1" aria-label="${t('exh.up')}">+</button></div></div></div>`;
}
/** Munition zur Fernkampfwaffe: Anzahl im Rucksack und ein Knopf für einen Schuss. */
function ammoRow(raw, k) {
  const ref = ammoFor(raw);
  if (!ref) return '';
  const { n } = ammoLeft(ref), c = BYN[ref];
  const name = c ? c.n.replace(/s*(d+)$/, '') : '';
  return `<div class="ammo">${n ? `<span>${esc(name)}: <b>${n}</b></span><button class="btn sm" data-a="shoot" data-k="${k}">${t('ammo.shoot')}</button>` : `<span class="fxw dis">${t('ammo.none', { n: esc(name) })}</span>`}</div>`;
}
export function vAtk() {
  const fx = effects(), st = rollState(fx.atk.adv, fx.atk.dis), fxTag = st && st !== 'both' ? `<span class="lbl fxw ${st}" title="${esc([...fx.atk.adv, ...fx.atk.dis].join(', '))}">${t('fx.' + st)}</span>` : '';
  const rows = ['main', 'off'].filter(k => S.eq[k]).map(k => {
    const raw = S.eq[k], a = atk(raw, k); if (!a) return '';
    const it = itemView(raw);
    return `<div class="row wrow"><div class="ic">${tok(it.ic, itTone(it), it.ref)}</div><div class="nm">${esc(it.n)}<small>${esc(it.p)}</small><span class="atkt"><button class="chip prf${a.prof ? ' on' : ''}" data-a="wprof" data-k="${k}" aria-pressed="${a.prof}">${t(a.prof ? 'atk.prof' : 'atk.noProf')}</button>${a.tags.map(x => `<span class="lbl">${esc(x)}</span>`).join('')}${fxTag}</span></div><div class="atk"><b>${a.hit}</b><small>${t('atk.hit')}</small></div><div class="atk"><b>${a.dmg}</b><small>${esc(a.type)}${a.vers ? ` · 2H ${a.vers}` : ''}</small></div>${ammoRow(raw, k)}</div>`;
  }).join('');
  const u = unarmed();
  const fist = `<div class="row wrow atk-un"><div class="ic">${tok('swirl')}</div><div class="nm">${t('atk.unarmed')}${u.tags.length ? `<small>${esc(u.tags.join(' · '))}</small>` : ''}${fxTag ? `<span class="atkt">${fxTag}</span>` : ''}</div><div class="atk"><b>${u.hit}</b><small>${t('atk.hit')}</small></div><div class="atk"><b>${u.dmg}</b><small>${esc(u.type)}</small></div></div>`;
  return `<h2>${t('atk.title')}</h2><div class="card">${rows}${fist}<p class="note">${rows ? t('atk.note') : t('atk.none')}</p></div>`;
}
export function vQuick() {
  const r = refs().filter(x => get(x).cons);
  if (!r.length) return '';
  return `<h2>${t('quick.title')}</h2><div class="card">${r.map(x => { const it = itemView(get(x)); return `<div class="row"><div class="ic">${tok(it.ic, itTone(it), it.ref)}</div><div class="nm">${esc(it.n)} <span class="lbl">× ${it.q}</span><small>${esc(it.p)}</small></div><button class="btn sm" data-a="use" data-r="${x}">${t('item.use')}</button></div>`; }).join('')}</div>`;
}
export function vRes() {
  if (!S.res.length) return '';
  return `<h2>${t('res.title')}</h2><div class="card">${S.res.map((r, i) => `<div class="row"><div class="ic">${tok(r.ic)}</div><div class="nm">${esc(r.n)}<small>${restLabel(r.rest)}${r.p ? ' · ' + esc(resText(r)) : ''}</small></div>${r.max > 12 ? `<div class="qty"><button data-a="resd" data-i="${i}" data-d="1" aria-label="${t('res.useOne')}">−</button><span>${r.max >= 99 ? '∞' : (r.max - r.used) + ' / ' + r.max}</span><button data-a="resd" data-i="${i}" data-d="-1" aria-label="${t('res.backOne')}">+</button></div>` : `<div class="pips">${pips(r.max, r.used, `data-a="pip" data-k="res" data-i="${i}"`)}</div>`}</div>`).join('')}</div>`;
}
export const featSrc = f => ({ Klasse: t('feat.class'), Unterklasse: t('feat.sub'), Talent: t('feat.feat'), 'Eigener Eintrag': t('feat.own'), Hintergrund: t('feat.bg') }[f.src] || f.src);
export function vFeats() {
  const all = [...raceTraits(), ...S.feats];
  if (!all.length) return '';
  const src = featSrc;
  return `<h2>${t('feat.title')}<em>${all.length}</em></h2><div class="card">${all.map(f => `<details class="feat"><summary>${tok(f.src === 'Talent' ? 'star' : f.race ? 'mask' : (CLIC[S.klass] || 'star'), undefined, f.src === 'Talent' ? 'feat:' + f.n : f.race ? 'race:' + S.race : 'class:' + S.klass)}<span>${esc(f.n)}</span><span class="lbl">${esc(src(f))}${f.lvl ? ' · ' + t('feat.level', { n: f.lvl }) : ''}</span></summary><p>${esc(dice(featText(f)))}</p></details>`).join('')}</div>`;
}
/** Aktueller Schaden eines Zaubertricks nach Charakterstufe, mit Angriff oder Rettungswurf. */
export function cantLine(s, stats) {
  const c = s.cant;
  if (!c || s.lvl !== 0) return '';
  const total = classLevels().reduce((a, x) => a + (x.lvl || 0), 0) || S.level || 1;
  const tier = total >= 17 ? 17 : total >= 11 ? 11 : total >= 5 ? 5 : 1;
  const st = stats.find(x => (s.cls || '').includes(CLASSES[x.k]?.l)) || stats[0];
  let bonus = 0;
  if (s.n === 'Eldritch Blast' && S.feats.some(f => f.n === 'Agonizing Blast')) bonus += mod(S.abil.cha);
  if ((s.cls || '').includes('C') && S.feats.some(f => f.n === 'Potent Spellcasting')) bonus += mod(S.abil.wis);
  const d = dice(c.d[tier] + (bonus ? (bonus > 0 ? '+' : '') + bonus : '')), type = t('dmg.' + c.type), beams = c.beams?.[tier] || 0;
  const parts = [];
  if (st && c.atk) parts.push(t('cant.atk', { n: sg(st.atk) }));
  if (st && c.save) parts.push(t('cant.save', { a: t('saveName.' + c.save), n: st.dc }));
  parts.push(beams > 1 ? `${t('cant.beams', { n: beams, d })} ${type}` : t('cant.dmg', { d, t: type }));
  return `<span class="cant" title="${esc(t('cant.byLevel'))}">${esc(parts.join(' · '))}</span>`;
}
export function spMeta(s) { return [s.time, s.range, s.dur].filter(Boolean).map(esc).join(' · '); }
export function vSpells() {
  const lv = new Set(S.spells.map(s => s.lvl));
  S.slots.forEach((s, i) => { if (s.max) lv.add(i + 1); });
  if (!lv.size && !S.pact.max) return `<h2>${t('spell.title')}</h2><div class="card"><div class="empty">${t('spell.none')}</div></div>`;
  const stats = spellStats(), cap = prepCap(), fx = effects();
  const prepared = S.spells.filter(s => s.lvl > 0 && !s.always && s.prep !== false).length;
  let h = fx.noCast.length ? `<p class="fxnote"><b class="fxw dis">${t('fx.noCast')}</b> (${esc(fx.noCast.join(', '))})</p>` : '';
  h += stats.map(s => `<div class="spstats">${stats.length > 1 ? `<span class="lbl">${s.k}</span>` : ''}<span>${abName(s.a)}</span><b>${t('spell.dc', { n: s.dc })}</b><b>${t('spell.atk', { n: sg(s.atk) })}</b></div>`).join('');
  if (cap != null) h += `<div class="spprep"><span class="${prepared > cap ? 'over' : ''}">${t('spell.prepCount', { a: prepared, b: cap })}</span><button class="btn sm" data-a="spall">${U.SPALL ? t('spell.showPrep') : t('spell.showAll')}</button></div>`;
  if (S.pact.max) h += `<div class="lvh"><b>${t('spell.pact')}</b><small>${t('spell.pactHint', { n: S.pact.lvl })}</small><div class="pips">${pips(S.pact.max, S.pact.used, 'data-a="pip" data-k="pact"')}</div></div>`;
  const hidden = s => cap != null && !U.SPALL && s.lvl > 0 && !s.always && s.prep === false;
  [...lv].sort((a, b) => a - b).forEach(l => {
    const sl = l ? S.slots[l - 1] : null;
    h += `<div class="lvh"><b>${l ? t('spell.level', { n: l }) : t('spell.cantrips')}</b><small>${l ? (sl.max ? t('spell.free', { a: sl.max - sl.used, b: sl.max }) : t('spell.noSlots')) : t('spell.atWill')}</small>${sl && sl.max ? `<div class="pips">${pips(sl.max, sl.used, `data-a="pip" data-k="slots" data-i="${l - 1}"`)}</div>` : ''}</div>`;
    S.spells.map((s, i) => [s, i]).filter(x => x[0].lvl === l && !hidden(x[0])).sort((a, b) => a[0].n.localeCompare(b[0].n)).forEach(([raw, i]) => {
      const o = U.OPEN[i], s = spellView(raw), can = cap != null && s.lvl > 0, off = can && !s.always && raw.prep === false, picking = U.CASTPICK === i;
      h += `<div class="sp${S.conc === s.n ? ' cc' : ''}${can ? ' pr' : ''}${off ? ' off' : ''}">${can ? `<button class="prepck${off ? '' : ' on'}" data-a="prep" data-i="${i}" aria-pressed="${!off}" aria-label="${t('spell.prepared')}" title="${s.always ? t('spell.always') : t('spell.prepared')}"${s.always ? ' disabled' : ''}></button>` : ''}<button class="sph" data-a="spopen" data-i="${i}" aria-expanded="${!!o}">${tok(s.ic, undefined, s.src === 'own' ? '' : 'spell:' + s.n)}<span class="nm">${esc(s.n)}${deName(s.n, s.de) ? ` <span class="lbl">${esc(s.de)}</span>` : ''}<small>${spMeta(s) || t('spell.details')}</small>${cantLine(s, stats)}</span></button>${off ? '<span></span>' : `<button class="btn sm" data-a="cast" data-i="${i}" aria-expanded="${picking}">${S.conc === s.n ? t('spell.active') : t('spell.cast')}</button>`}${picking ? `<div class="castpick"><span class="lbl">${t('spell.pickLevel')}</span>${castOptions(raw).map(c => `<button class="btn sm solid" data-a="castslot" data-i="${i}" data-l="${c}">${c === 'pact' ? t('spell.pactShort', { n: S.pact.lvl }) : t('spell.level', { n: c })}</button>`).join('')}</div>` : ''}${o ? `<div class="spb"><p class="ptext">${esc(s.eff)}</p>${s.higher ? `<p class="ptext"><b>${t('spell.higher')}:</b> ${esc(s.higher)}</p>` : ''}${s.comp ? `<p class="cls">${t('spell.comp')}: ${esc(s.comp)}${s.material ? ' (' + esc(s.material) + ')' : ''}</p>` : ''}${s.school ? `<p class="cls">${esc(schoolName(s.school))}${s.cls ? ' · ' + s.cls.split('').map(c => CLN[c]).join(', ') : ''}</p>` : ''}<p class="src">${srcNote(s.src === 'own' ? 'own' : s.source)}</p></div>` : ''}</div>`;
    });
  });
  return `<h2>${t('spell.title')}</h2><div class="card">${h}<p class="note">${t('spell.castNote')}</p></div>`;
}
export function vSkills() {
  const star = p => (p ? `<i class="skstar" title="${t('skill.p' + p)}">${'★'.repeat(p)}</i>` : '');
  const fx = effects(), dis = a => [...fx.checks, ...(fx.checkAb[a] || [])];
  const group = a => `<section class="skg"><h3>${abName(a)} <span>(${sg(mod(S.abil[a]))})</span>${fxMark([], dis(a))}</h3>${SK.filter(s => s[1] === a).map(([k, , de]) => `<div class="skr"><span>${k}${lang === 'de' ? `<small>${de}</small>` : ''}</span>${star(S.skills[k] || 0)}${k === 'Stealth' && !dis(a).length ? fxMark([], fx.stealth) : ''}<b>${sg(skv(k))}</b></div>`).join('')}</section>`;
  // Vier gleich hohe Spalten: Stärke und Geschicklichkeit teilen sich eine (4 Fertigkeiten), dann 5, 5, 4.
  const rel = featureLevel('Rogue') >= 11 ? `<p class="note fxnote"><b>Reliable Talent:</b> ${t('skill.reliable')}</p>` : '';
  return `<h2>${t('skill.title')}</h2>${rel}<div class="skgrid">${[['str', 'dex'], ['int'], ['wis'], ['cha']].map(c => `<div class="skcol">${c.map(group).join('')}</div>`).join('')}</div>`;
}
export function vProfs() {
  if (!S.tools.length && !S.langs.length) return '';
  const chips = list => `<div class="chips">${list.map(x => { const c = byName(x); return `<span class="chip" ${c ? `title="${esc(c.p)}"` : ''}>${esc(c ? c.n : x)}</span>`; }).join('')}</div>`;
  return `<h2>${t('setup.profs')}</h2><div class="card">${S.tools.length ? `<p class="lbl" style="margin:0 0 4px">${t('setup.tools')}</p>${chips(S.tools)}` : ''}${S.langs.length ? `<p class="lbl" style="margin:10px 0 4px">${t('setup.langs')}</p>${chips(S.langs)}` : ''}</div>`;
}
/** Schmale Leiste, die beim Scrollen oben stehen bleibt: TP mit −/+, RK, freie Zauberplätze, Konzentration. */
export function vMiniBar(tabsHtml = '') {
  const max = hpMaxNow(), slots = S.slots.map((x, i) => (x.max ? `${i + 1}: ${x.max - x.used}/${x.max}` : '')).filter(Boolean);
  if (S.pact.max) slots.unshift(`${t('mini.pact')} ${S.pact.max - S.pact.used}/${S.pact.max}`);
  return `<div class="minibar" aria-label="${t('mini.label')}"><div class="mb-hp"><button class="sq" data-a="mbhp" data-d="-1" aria-label="${t('hp.minusOne')}">−</button><span><small>${t('head.hpShort')}</small><b${S.hp === 0 ? ' class="down"' : ''}>${S.hp}</b>/${max}${S.tmp ? ` <i>+${S.tmp}</i>` : ''}</span><button class="sq" data-a="mbhp" data-d="1" aria-label="${t('hp.plusOne')}">+</button></div><span class="mb-v"><small>${t('mini.ac')}</small><b>${S.ac}</b></span>${slots.length ? `<span class="mb-v mb-slots"><small>${t('mini.slots')}</small><b>${esc(slots.join(' · '))}</b></span>` : ''}${S.conc ? `<span class="mb-v mb-conc"><small>${t('conc.title')}</small><b>${esc(S.conc)}</b></span>` : ''}<nav class="mb-tabs" aria-label="${t('head.areas')}">${tabsHtml}</nav></div>`;
}
const MODE_LS = 'charbogen-mode';
export const sheetMode = () => { try { const m = localStorage.getItem(MODE_LS); return ['combat', 'explore'].includes(m) ? m : 'all'; } catch (e) { return 'all'; } };
export const setSheetMode = m => { try { if (m === 'all') localStorage.removeItem(MODE_LS); else localStorage.setItem(MODE_LS, m); } catch (e) { /* Datenschutzmodus */ } };
export function vMain() {
  const a = S.abil, st = (l, v, x = '') => `<div class="st"><small>${l}</small><b>${v}</b>${x}</div>`, fx = effects();
  const worse = fx.speed.val < fx.speed.norm, why2 = [...fx.speed.plus.map(x => '+ ' + x), ...fx.speed.zero, ...fx.speed.half, ...fx.speed.minus].join(', ');
  const spd = fx.speed.val !== fx.speed.base ? st(t('stat.speed'), `<span class="fxw ${worse ? 'dis' : 'adv'}">${dist(fx.speed.val)}</span>`, `<small class="fxsub">${esc(dist(fx.speed.base))} · ${esc(why2)}</small>`) : st(t('stat.speed'), dist(S.speed));
  let h = '';
  if (S.conc) h += `<div class="conc"><div><small>${t('conc.title')}</small><b>${esc(S.conc)}</b><span>${t('conc.hint')}</span></div><button class="btn" data-a="concend">${t('conc.end')}</button></div>`;
  h += `<div class="stats">${st(t('stat.ac'), S.ac)}${st(t('stat.init'), sg(initBonus()) + (featureLevel('Barbarian') >= 7 ? fxMark(['Feral Instinct'], []) : ''))}${spd}${st(t('stat.prof'), sg(S.prof))}${st(t('stat.pp'), passivePerception(), `<small class="fxsub">${t('pp.more', { i: 10 + skv('Insight'), v: 10 + skv('Investigation') + (S.feats.some(f => f.n === 'Observant') ? 5 : 0) })}</small>`)}</div>`;
  h += vFx(fx);
  const mode = sheetMode(), show = k => mode === 'all' || (mode === 'combat' ? !['feats', 'skills', 'profs'].includes(k) : !['atk', 'charges', 'pets'].includes(k));
  h += `<div class="modes" role="group" aria-label="${t('mode.label')}">${['all', 'combat', 'explore'].map(m => `<button class="tg${mode === m ? ' on' : ''}" data-a="sheetmode" data-m="${m}" aria-pressed="${mode === m}">${t('mode.' + m)}</button>`).join('')}</div>`;
  h += `<div class="sheet"><aside>${vAbil(false)}</aside><div class="col c1">${vHP()}${vCond()}${show('atk') ? vAtk() : ''}${vQuick()}${show('charges') ? vCharges() : ''}${vRes()}${show('pets') ? vPets() : ''}</div><div class="col c2">${vSpells()}${show('feats') ? vFeats() : ''}${show('skills') ? `<div class="c2sk">${vSkills()}</div>` : ''}${show('profs') ? vProfs() : ''}</div></div>`;
  return h;
}
