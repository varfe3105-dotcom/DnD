import { esc, clamp, mod, sg } from '../util.js';
import { tok, itTone } from '../icons.js';
import { CLN, SK, ABK, CLIC } from '../constants.js';
import { S, U } from '../state.js';
import { skv, pips, numIn, get, refs, atk, raceTraits, abName, abShort, itemView, spellView, resText } from '../helpers.js';
import { COND, EXH, featText } from '../catalog.js';
import { t, loc, dice, dist, lang, nameLine, deName } from '../i18n/index.js';

export const schoolName = s => { const k = { Hervorrufung: 'evocation', Bannmagie: 'abjuration', Beschwörung: 'conjuration', Wahrsagung: 'divination', Verzauberung: 'enchantment', Illusion: 'illusion', Nekromantie: 'necromancy', Verwandlung: 'transmutation' }[s] || String(s || '').toLowerCase(); return k ? t('school.' + k) : ''; };
export const srcNote = s => s === 'own' ? t('src.own') : s === 'srd' ? t('src.srd') : t('src.summary');
export const restLabel = r => t('rest.' + (['short', 'long', 'none'].includes(r) ? r : 'long'));

export function vAbil(edit) {
  return `<div class="abs">${ABK.map(k => {
    const n = abName(k), m = mod(S.abil[k]), sv = m + (S.saves[k] ? S.prof : 0);
    return `<div class="abw"><div class="ab"><div class="abi"><small>${n}</small><b>${sg(m)}</b></div></div><div class="abv">${edit ? numIn('abil.' + k, S.abil[k], n, 1, 30) : S.abil[k]}</div>${edit ? `<button class="tg${S.saves[k] ? ' on' : ''}" data-a="tsave" data-k="${k}" aria-pressed="${!!S.saves[k]}">${t('ab.saveProf')}</button>` : `<div class="sv${S.saves[k] ? ' p' : ''}" title="${t('ab.save')}"><i></i><span class="svl">${t('ab.save')}</span><span class="svs">${t('ab.saveShort')}</span> ${sg(sv)}</div>`}</div>`;
  }).join('')}</div>`;
}
export function vHP() {
  const pct = S.hpMax ? clamp(S.hp / S.hpMax * 100, 0, 100) : 0, tp = S.hpMax ? clamp(S.tmp / S.hpMax * 100, 0, 100 - pct) : 0;
  return `<h2>${t('hp.title')}</h2><div class="card">
  <div class="hpt"><button class="sq" data-a="hp" data-d="-1" aria-label="${t('hp.minusOne')}">−</button><div class="hpn${S.hp === 0 ? ' down' : ''}"><b>${S.hp}</b><small>/ ${S.hpMax}</small>${S.tmp ? `<span class="tmp">${t('hp.temp', { n: S.tmp })}</span>` : ''}</div><button class="sq" data-a="hp" data-d="1" aria-label="${t('hp.plusOne')}">+</button></div>
  <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i><u style="width:${tp}%"></u></div>
  <div class="hpin"><input type="number" id="hpv" min="1" inputmode="numeric" placeholder="${t('hp.amount')}" aria-label="${t('hp.amountLabel')}"><button class="btn bad" data-a="dmg">${t('hp.damage')}</button><button class="btn good" data-a="heal">${t('hp.heal')}</button><button class="btn" data-a="temp">${t('hp.tempBtn')}</button></div>
  ${S.hp === 0 ? vDeath() : ''}
  <div class="row" style="margin-top:8px"><div class="ic">${tok('dice')}</div><div class="nm">${t('hd.title')}<small>${t('hd.left', { a: S.hd.max - S.hd.used, b: S.hd.max, d: dice(S.hd.die), m: sg(mod(S.abil.con)) })}</small></div><div class="pips">${pips(S.hd.max, S.hd.used, 'data-a="pip" data-k="hd"')}</div></div></div>`;
}
export function vDeath() {
  const r = (x, l) => `<div class="dsr${x === 'f' ? ' f' : ''}"><span>${l}</span>${[0, 1, 2].map(j => `<button class="dot${j < S.death[x] ? ' on' : ''}" data-a="ds" data-t="${x}" data-j="${j}" aria-label="${l} ${j + 1}"></button>`).join('')}</div>`;
  return `<div class="death"><div><b>${t('death.title')}</b><br><span>${dice(t('death.hint'))}</span></div>${r('s', t('death.s'))}${r('f', t('death.f'))}</div>`;
}
export function vCond() {
  const act = COND.filter(c => S.cond[c.n]);
  return `<h2>${t('cond.title')}${act.length ? `<em>${t('cond.active', { n: act.length })}</em>` : ''}</h2><div class="card"><div class="chips">${COND.map(c => `<button class="chip${S.cond[c.n] ? ' on' : ''}" data-a="cond" data-c="${c.n}" aria-pressed="${!!S.cond[c.n]}" title="${esc(c.de)}">${esc(nameLine(c.n, c.de))}</button>`).join('')}</div>${act.map(c => `<div class="row"><div class="ic">${tok(c.ic)}</div><div class="nm">${c.n}${deName(c.n, c.de) ? ` <span class="lbl">${c.de}</span>` : ''}<small>${esc(loc(c.text))}</small></div></div>`).join('')}<div class="row"><div class="ic">${tok('skull')}</div><div class="nm">${t('exh.title', { n: S.exh })}<small>${S.exh ? EXH.slice(0, S.exh).map(e => `${e.level}: ${esc(loc(e.text))}`).join(' · ') : t('exh.none')}</small></div><div class="qty"><button data-a="exh" data-d="-1" aria-label="${t('exh.down')}">−</button><button data-a="exh" data-d="1" aria-label="${t('exh.up')}">+</button></div></div></div>`;
}
export function vAtk() {
  const rows = ['main', 'off'].map(k => S.eq[k]).filter(Boolean).map(raw => {
    const a = atk(raw); if (!a) return '';
    const it = itemView(raw);
    return `<div class="row"><div class="ic">${tok(it.ic, itTone(it))}</div><div class="nm">${esc(it.n)}<small>${esc(it.p)}</small></div><div class="atk"><b>${a.hit}</b><small>${t('atk.hit')}</small></div><div class="atk"><b>${a.dmg}</b><small>${esc(a.type)}${a.vers ? ` · 2H ${a.vers}` : ''}</small></div></div>`;
  }).join('');
  return `<h2>${t('atk.title')}</h2><div class="card">${rows || `<div class="empty">${t('atk.none')}</div>`}${rows ? `<p class="note">${t('atk.note')}</p>` : ''}</div>`;
}
export function vQuick() {
  const r = refs().filter(x => get(x).cons);
  if (!r.length) return '';
  return `<h2>${t('quick.title')}</h2><div class="card">${r.map(x => { const it = itemView(get(x)); return `<div class="row"><div class="ic">${tok(it.ic, itTone(it))}</div><div class="nm">${esc(it.n)} <span class="lbl">× ${it.q}</span><small>${esc(it.p)}</small></div><button class="btn sm" data-a="use" data-r="${x}">${t('item.use')}</button></div>`; }).join('')}</div>`;
}
export function vRes() {
  if (!S.res.length) return '';
  return `<h2>${t('res.title')}</h2><div class="card">${S.res.map((r, i) => `<div class="row"><div class="ic">${tok(r.ic)}</div><div class="nm">${esc(r.n)}<small>${restLabel(r.rest)}${r.p ? ' · ' + esc(resText(r)) : ''}</small></div>${r.max > 12 ? `<div class="qty"><button data-a="resd" data-i="${i}" data-d="1" aria-label="${t('res.useOne')}">−</button><span>${r.max >= 99 ? '∞' : (r.max - r.used) + ' / ' + r.max}</span><button data-a="resd" data-i="${i}" data-d="-1" aria-label="${t('res.backOne')}">+</button></div>` : `<div class="pips">${pips(r.max, r.used, `data-a="pip" data-k="res" data-i="${i}"`)}</div>`}</div>`).join('')}</div>`;
}
export const featSrc = f => ({ Klasse: t('feat.class'), Unterklasse: t('feat.sub'), Talent: t('feat.feat'), 'Eigener Eintrag': t('feat.own') }[f.src] || f.src);
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
  let h = '';
  if (S.pact.max) h += `<div class="lvh"><b>${t('spell.pact')}</b><small>${t('spell.pactHint', { n: S.pact.lvl })}</small><div class="pips">${pips(S.pact.max, S.pact.used, 'data-a="pip" data-k="pact"')}</div></div>`;
  [...lv].sort((a, b) => a - b).forEach(l => {
    const sl = l ? S.slots[l - 1] : null;
    h += `<div class="lvh"><b>${l ? t('spell.level', { n: l }) : t('spell.cantrips')}</b><small>${l ? (sl.max ? t('spell.free', { a: sl.max - sl.used, b: sl.max }) : t('spell.noSlots')) : t('spell.atWill')}</small>${sl && sl.max ? `<div class="pips">${pips(sl.max, sl.used, `data-a="pip" data-k="slots" data-i="${l - 1}"`)}</div>` : ''}</div>`;
    S.spells.map((s, i) => [s, i]).filter(x => x[0].lvl === l).sort((a, b) => a[0].n.localeCompare(b[0].n)).forEach(([raw, i]) => {
      const o = U.OPEN[i], s = spellView(raw);
      h += `<div class="sp${S.conc === s.n ? ' cc' : ''}"><button class="sph" data-a="spopen" data-i="${i}" aria-expanded="${!!o}">${tok(s.ic)}<span class="nm">${esc(s.n)}${deName(s.n, s.de) ? ` <span class="lbl">${esc(s.de)}</span>` : ''}<small>${spMeta(s) || t('spell.details')}</small></span></button><button class="btn sm" data-a="cast" data-i="${i}">${S.conc === s.n ? t('spell.active') : t('spell.cast')}</button>${o ? `<div class="spb"><p class="ptext">${esc(s.eff)}</p>${s.higher ? `<p class="ptext"><b>${t('spell.higher')}:</b> ${esc(s.higher)}</p>` : ''}${s.comp ? `<p class="cls">${t('spell.comp')}: ${esc(s.comp)}${s.material ? ' (' + esc(s.material) + ')' : ''}</p>` : ''}${s.school ? `<p class="cls">${esc(schoolName(s.school))}${s.cls ? ' · ' + s.cls.split('').map(c => CLN[c]).join(', ') : ''}</p>` : ''}<p class="src">${srcNote(s.src === 'own' ? 'own' : s.source)}</p></div>` : ''}</div>`;
    });
  });
  return `<h2>${t('spell.title')}</h2><div class="card">${h}<p class="note">${t('spell.castNote')}</p></div>`;
}
export function vSkills() {
  return `<h2>${t('skill.title')}</h2><div class="card"><div class="skl">${SK.map(([k, a, de]) => { const p = S.skills[k] || 0; return `<div class="sk"><i class="m m${p}" title="${t('skill.p' + p)}"></i><span>${k}<small>${lang === 'de' ? de + ' · ' : ''}${abShort(a)}</small></span><b>${sg(skv(k))}</b></div>`; }).join('')}</div></div>`;
}
export function vMain() {
  const a = S.abil, st = (l, v) => `<div class="st"><small>${l}</small><b>${v}</b></div>`;
  let h = '';
  if (S.conc) h += `<div class="conc"><div><small>${t('conc.title')}</small><b>${esc(S.conc)}</b><span>${t('conc.hint')}</span></div><button class="btn" data-a="concend">${t('conc.end')}</button></div>`;
  h += `<div class="stats">${st(t('stat.ac'), S.ac)}${st(t('stat.init'), sg(mod(a.dex)))}${st(t('stat.speed'), dist(S.speed))}${st(t('stat.prof'), sg(S.prof))}${st(t('stat.pp'), 10 + skv('Perception'))}</div>`;
  h += `<div class="sheet"><aside>${vAbil(false)}</aside><div class="col">${vHP()}${vCond()}${vAtk()}${vQuick()}${vRes()}${vSpells()}${vFeats()}${vSkills()}</div></div>`;
  return h;
}
