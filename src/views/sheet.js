import { unarmed } from '../attacks.js';
import { vCharges, vPets } from './extras.js';
import { castOptions } from '../game.js';
import { prepCap, spellStats } from '../tables.js';
import { esc, clamp, mod, sg } from '../util.js';
import { tok, itTone } from '../icons.js';
import { CLN, SK, ABK, CLIC } from '../constants.js';
import { S, U } from '../state.js';
import { hdText, skv, pips, numIn, get, refs, atk, raceTraits, abName, abShort, itemView, spellView, resText } from '../helpers.js';
import { COND, EXH, featText, byName } from '../catalog.js';
import { t, loc, dice, dist, lang, nameLine, deName } from '../i18n/index.js';

export const schoolName = s => { const k = { Hervorrufung: 'evocation', Bannmagie: 'abjuration', Beschwörung: 'conjuration', Wahrsagung: 'divination', Verzauberung: 'enchantment', Illusion: 'illusion', Nekromantie: 'necromancy', Verwandlung: 'transmutation' }[s] || String(s || '').toLowerCase(); return k ? t('school.' + k) : ''; };
export const srcNote = s => s === 'own' ? t('src.own') : s === 'srd' ? t('src.srd') : t('src.summary');
export const restLabel = r => t('rest.' + (['short', 'long', 'none'].includes(r) ? r : 'long'));

const RUNES = { str: 'M6 2v16M6 3l8 5-8 5', dex: 'M5 2l10 16M15 2L5 18', con: 'M10 2v16M4 6l6 4 6-4', int: 'M4 18V2l12 16V2', wis: 'M10 2l6 8-6 8-6-8z', cha: 'M4 4l6 6 6-6M10 10v8' };
export function vAbil(edit) {
  return `<div class="abs${edit ? ' edit' : ''}">${ABK.map(k => {
    const n = abName(k), m = mod(S.abil[k]), sv = m + (S.saves[k] ? S.prof : 0);
    return `<div class="abw"><div class="ab"><div class="abi"><svg class="rune" viewBox="0 0 20 20" aria-hidden="true"><path d="${RUNES[k]}"/></svg><small>${n}</small><b>${sg(m)}</b></div></div><div class="abv">${edit ? numIn('abil.' + k, S.abil[k], n, 1, 30) : S.abil[k]}</div>${edit ? `<button class="tg${S.saves[k] ? ' on' : ''}" data-a="tsave" data-k="${k}" aria-pressed="${!!S.saves[k]}">${t('ab.saveProf')}</button>` : `<div class="sv${S.saves[k] ? ' p' : ''}" title="${t('ab.save')}"><i></i><span class="svl">${t('ab.save')}</span><span class="svs">${t('ab.saveShort')}</span> ${sg(sv)}</div>`}</div>`;
  }).join('')}</div>`;
}
export function vHP() {
  const pct = S.hpMax ? clamp(S.hp / S.hpMax * 100, 0, 100) : 0, tp = S.hpMax ? clamp(S.tmp / S.hpMax * 100, 0, 100 - pct) : 0;
  return `<h2>${t('hp.title')}</h2><div class="card">
  <div class="hpt"><button class="sq" data-a="hp" data-d="-1" aria-label="${t('hp.minusOne')}">−</button><div class="hpn${S.hp === 0 ? ' down' : ''}"><b>${S.hp}</b><small>/ ${S.hpMax}</small>${S.tmp ? `<span class="tmp">${t('hp.temp', { n: S.tmp })}</span>` : ''}</div><button class="sq" data-a="hp" data-d="1" aria-label="${t('hp.plusOne')}">+</button></div>
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
  return `<h2>${t('cond.title')}${act.length ? `<em>${t('cond.active', { n: act.length })}</em>` : ''}</h2><div class="card"><div class="chips">${COND.map(c => `<button class="chip${S.cond[c.n] ? ' on' : ''}" data-a="cond" data-c="${c.n}" aria-pressed="${!!S.cond[c.n]}" title="${esc(c.de)}">${esc(nameLine(c.n, c.de))}</button>`).join('')}</div>${act.map(c => `<div class="row"><div class="ic">${tok(c.ic, undefined, 'cond:' + c.n)}</div><div class="nm">${c.n}${deName(c.n, c.de) ? ` <span class="lbl">${c.de}</span>` : ''}<small>${esc(loc(c.text))}</small></div></div>`).join('')}<div class="row"><div class="ic">${tok('skull')}</div><div class="nm">${t('exh.title', { n: S.exh })}<small>${S.exh ? EXH.slice(0, S.exh).map(e => `${e.level}: ${esc(loc(e.text))}`).join(' · ') : t('exh.none')}</small></div><div class="qty"><button data-a="exh" data-d="-1" aria-label="${t('exh.down')}">−</button><button data-a="exh" data-d="1" aria-label="${t('exh.up')}">+</button></div></div></div>`;
}
export function vAtk() {
  const rows = ['main', 'off'].filter(k => S.eq[k]).map(k => {
    const raw = S.eq[k], a = atk(raw, k); if (!a) return '';
    const it = itemView(raw);
    return `<div class="row wrow"><div class="ic">${tok(it.ic, itTone(it), it.ref)}</div><div class="nm">${esc(it.n)}<small>${esc(it.p)}</small><span class="atkt"><button class="chip prf${a.prof ? ' on' : ''}" data-a="wprof" data-k="${k}" aria-pressed="${a.prof}">${t(a.prof ? 'atk.prof' : 'atk.noProf')}</button>${a.tags.map(x => `<span class="lbl">${esc(x)}</span>`).join('')}</span></div><div class="atk"><b>${a.hit}</b><small>${t('atk.hit')}</small></div><div class="atk"><b>${a.dmg}</b><small>${esc(a.type)}${a.vers ? ` · 2H ${a.vers}` : ''}</small></div></div>`;
  }).join('');
  const u = unarmed();
  const fist = `<div class="row wrow atk-un"><div class="ic">${tok('swirl')}</div><div class="nm">${t('atk.unarmed')}${u.tags.length ? `<small>${esc(u.tags.join(' · '))}</small>` : ''}</div><div class="atk"><b>${u.hit}</b><small>${t('atk.hit')}</small></div><div class="atk"><b>${u.dmg}</b><small>${esc(u.type)}</small></div></div>`;
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
  return `<h2>${t('feat.title')}<em>${all.length}</em></h2><div class="card">${all.map(f => `<details class="feat"><summary>${tok(f.src === 'Talent' ? 'star' : f.race ? 'mask' : (CLIC[S.klass] || 'star'))}<span>${esc(f.n)}</span><span class="lbl">${esc(src(f))}${f.lvl ? ' · ' + t('feat.level', { n: f.lvl }) : ''}</span></summary><p>${esc(dice(featText(f)))}</p></details>`).join('')}</div>`;
}
export function spMeta(s) { return [s.time, s.range, s.dur].filter(Boolean).map(esc).join(' · '); }
export function vSpells() {
  const lv = new Set(S.spells.map(s => s.lvl));
  S.slots.forEach((s, i) => { if (s.max) lv.add(i + 1); });
  if (!lv.size && !S.pact.max) return `<h2>${t('spell.title')}</h2><div class="card"><div class="empty">${t('spell.none')}</div></div>`;
  const stats = spellStats(), cap = prepCap();
  const prepared = S.spells.filter(s => s.lvl > 0 && !s.always && s.prep !== false).length;
  let h = stats.map(s => `<div class="spstats">${stats.length > 1 ? `<span class="lbl">${s.k}</span>` : ''}<span>${abName(s.a)}</span><b>${t('spell.dc', { n: s.dc })}</b><b>${t('spell.atk', { n: sg(s.atk) })}</b></div>`).join('');
  if (cap != null) h += `<div class="spprep"><span class="${prepared > cap ? 'over' : ''}">${t('spell.prepCount', { a: prepared, b: cap })}</span><button class="btn sm" data-a="spall">${U.SPALL ? t('spell.showPrep') : t('spell.showAll')}</button></div>`;
  if (S.pact.max) h += `<div class="lvh"><b>${t('spell.pact')}</b><small>${t('spell.pactHint', { n: S.pact.lvl })}</small><div class="pips">${pips(S.pact.max, S.pact.used, 'data-a="pip" data-k="pact"')}</div></div>`;
  const hidden = s => cap != null && !U.SPALL && s.lvl > 0 && !s.always && s.prep === false;
  [...lv].sort((a, b) => a - b).forEach(l => {
    const sl = l ? S.slots[l - 1] : null;
    h += `<div class="lvh"><b>${l ? t('spell.level', { n: l }) : t('spell.cantrips')}</b><small>${l ? (sl.max ? t('spell.free', { a: sl.max - sl.used, b: sl.max }) : t('spell.noSlots')) : t('spell.atWill')}</small>${sl && sl.max ? `<div class="pips">${pips(sl.max, sl.used, `data-a="pip" data-k="slots" data-i="${l - 1}"`)}</div>` : ''}</div>`;
    S.spells.map((s, i) => [s, i]).filter(x => x[0].lvl === l && !hidden(x[0])).sort((a, b) => a[0].n.localeCompare(b[0].n)).forEach(([raw, i]) => {
      const o = U.OPEN[i], s = spellView(raw), can = cap != null && s.lvl > 0, off = can && !s.always && raw.prep === false, picking = U.CASTPICK === i;
      h += `<div class="sp${S.conc === s.n ? ' cc' : ''}${can ? ' pr' : ''}${off ? ' off' : ''}">${can ? `<button class="prepck${off ? '' : ' on'}" data-a="prep" data-i="${i}" aria-pressed="${!off}" aria-label="${t('spell.prepared')}" title="${s.always ? t('spell.always') : t('spell.prepared')}"${s.always ? ' disabled' : ''}></button>` : ''}<button class="sph" data-a="spopen" data-i="${i}" aria-expanded="${!!o}">${tok(s.ic, undefined, s.src === 'own' ? '' : 'spell:' + s.n)}<span class="nm">${esc(s.n)}${deName(s.n, s.de) ? ` <span class="lbl">${esc(s.de)}</span>` : ''}<small>${spMeta(s) || t('spell.details')}</small></span></button>${off ? '<span></span>' : `<button class="btn sm" data-a="cast" data-i="${i}" aria-expanded="${picking}">${S.conc === s.n ? t('spell.active') : t('spell.cast')}</button>`}${picking ? `<div class="castpick"><span class="lbl">${t('spell.pickLevel')}</span>${castOptions(raw).map(c => `<button class="btn sm solid" data-a="castslot" data-i="${i}" data-l="${c}">${c === 'pact' ? t('spell.pactShort', { n: S.pact.lvl }) : t('spell.level', { n: c })}</button>`).join('')}</div>` : ''}${o ? `<div class="spb"><p class="ptext">${esc(s.eff)}</p>${s.higher ? `<p class="ptext"><b>${t('spell.higher')}:</b> ${esc(s.higher)}</p>` : ''}${s.comp ? `<p class="cls">${t('spell.comp')}: ${esc(s.comp)}${s.material ? ' (' + esc(s.material) + ')' : ''}</p>` : ''}${s.school ? `<p class="cls">${esc(schoolName(s.school))}${s.cls ? ' · ' + s.cls.split('').map(c => CLN[c]).join(', ') : ''}</p>` : ''}<p class="src">${srcNote(s.src === 'own' ? 'own' : s.source)}</p></div>` : ''}</div>`;
    });
  });
  return `<h2>${t('spell.title')}</h2><div class="card">${h}<p class="note">${t('spell.castNote')}</p></div>`;
}
export function vSkills() {
  const star = p => (p ? `<i class="skstar" title="${t('skill.p' + p)}">${'★'.repeat(p)}</i>` : '');
  const group = a => `<section class="skg"><h3>${abName(a)} <span>(${sg(mod(S.abil[a]))})</span></h3>${SK.filter(s => s[1] === a).map(([k, , de]) => `<div class="skr"><span>${k}${lang === 'de' ? `<small>${de}</small>` : ''}</span>${star(S.skills[k] || 0)}<b>${sg(skv(k))}</b></div>`).join('')}</section>`;
  // Vier gleich hohe Spalten: Stärke und Geschicklichkeit teilen sich eine (4 Fertigkeiten), dann 5, 5, 4.
  return `<h2>${t('skill.title')}</h2><div class="skgrid">${[['str', 'dex'], ['int'], ['wis'], ['cha']].map(c => `<div class="skcol">${c.map(group).join('')}</div>`).join('')}</div>`;
}
export function vProfs() {
  if (!S.tools.length && !S.langs.length) return '';
  const chips = list => `<div class="chips">${list.map(x => { const c = byName(x); return `<span class="chip" ${c ? `title="${esc(c.p)}"` : ''}>${esc(c ? c.n : x)}</span>`; }).join('')}</div>`;
  return `<h2>${t('setup.profs')}</h2><div class="card">${S.tools.length ? `<p class="lbl" style="margin:0 0 4px">${t('setup.tools')}</p>${chips(S.tools)}` : ''}${S.langs.length ? `<p class="lbl" style="margin:10px 0 4px">${t('setup.langs')}</p>${chips(S.langs)}` : ''}</div>`;
}
export function vMain() {
  const a = S.abil, st = (l, v) => `<div class="st"><small>${l}</small><b>${v}</b></div>`;
  let h = '';
  if (S.conc) h += `<div class="conc"><div><small>${t('conc.title')}</small><b>${esc(S.conc)}</b><span>${t('conc.hint')}</span></div><button class="btn" data-a="concend">${t('conc.end')}</button></div>`;
  h += `<div class="stats">${st(t('stat.ac'), S.ac)}${st(t('stat.init'), sg(mod(a.dex)))}${st(t('stat.speed'), dist(S.speed))}${st(t('stat.prof'), sg(S.prof))}${st(t('stat.pp'), 10 + skv('Perception'))}</div>`;
  h += `<div class="sheet"><aside>${vAbil(false)}</aside><div class="col c1">${vHP()}${vCond()}${vAtk()}${vQuick()}${vCharges()}${vRes()}${vPets()}</div><div class="col c2">${vSpells()}${vFeats()}<div class="c2sk">${vSkills()}</div>${vProfs()}</div></div>`;
  return h;
}
