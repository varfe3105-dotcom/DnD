import { clamp, esc, mod, sg } from '../util.js';
import { tok } from '../icons.js';
import { ABK, CLIC } from '../constants.js';
import { pb, slotsFor, pactFor, cantripsFor, knownFor } from '../tables.js';
import { S, U, toast } from '../state.js';
import { abName, resFor } from '../helpers.js';
import { CLASSES, SUBCLASSES, FEATS, OPTIONS } from '../catalog.js';
import { reqText } from './wiki.js';
import { t, loc, dice, deName, nameLine } from '../i18n/index.js';

export function openLU() {
  if (!CLASSES[S.klass]) { S.tab = 'setup'; toast(t('lu.needClass')); return; }
  const to = (S.level || 0) + 1;
  if (to > 20) { toast(t('lu.max')); return; }
  U.LU = { to, hp: 'avg', roll: '', asi: 'two', a1: '', a2: '', feat: '', sub: S.sub || '' };
  U.LUfocus = true;
}
export function luData() {
  const C = CLASSES[S.klass], to = U.LU.to, con = mod(S.abil.con), dw = (S.subrace === 'Hill Dwarf' ? 1 : 0) + (S.feats.some(f => f.n === 'Tough' && f.src === 'Talent') ? 2 : 0), avg = C.hd / 2 + 1;
  const base = to === 1 ? C.hd : (U.LU.hp === 'roll' ? clamp(Math.floor(+U.LU.roll) || 0, 1, C.hd) : avg);
  const gain = Math.max(1, base + con) + dw;
  const feats = (C.f[to] || []).map(f => ({ n: f.n, text: f.text }));
  const chosen = (to === C.subL ? U.LU.sub : S.sub || '').trim();
  const sd = SUBCLASSES[S.klass]?.[chosen];
  if (sd) (sd[to] || []).forEach(f => feats.push({ n: f.n, text: f.text, sub: true }));
  else if (to === C.subL) feats.push({ n: C.subN, text: { en: t2('en', 'lu.subPick', C), de: t2('de', 'lu.subPick', C) } });
  else if (C.sl.includes(to)) feats.push({ n: (S.sub || C.subN) + ': ' + t('lu.newFeature'), text: { en: t2('en', 'lu.subFeature', C, to), de: t2('de', 'lu.subFeature', C, to) } });
  const extra = [];
  if (S.klass === 'Rogue') extra.push(t('lu.sneak', { d: dice(`${Math.ceil(to / 2)}W6`) }));
  if (S.klass === 'Barbarian' && to === 20) extra.push(t('lu.barb20'));
  return { C, to, gain, base, avg, con, dw, feats, extra, asi: C.asi.includes(to), profOld: S.level ? S.prof : pb(0), profNew: pb(to), slotsOld: S.slots.map(s => s.max), slotsNew: slotsFor(S.klass, to), pact: C.cast === 'pact' ? pactFor(to) : null, res: resFor(S.klass, to), cant: [cantripsFor(S.klass, to - 1), cantripsFor(S.klass, to)], known: [knownFor(S.klass, to - 1), knownFor(S.klass, to)] };
}
import { tl } from '../i18n/index.js';
const t2 = (l, key, C, to) => tl(l, key, { subs: C.subs.join(', '), n: to });

const OPT_SCHEDULE = {
  fightingStyles: { Fighter: { 1: 1 }, Paladin: { 2: 1 }, Ranger: { 2: 1 } },
  metamagic: { Sorcerer: { 3: 2, 10: 1, 17: 1 } },
  invocations: { Warlock: { 2: 2, 5: 1, 7: 1, 9: 1, 12: 1, 15: 1, 18: 1 } },
};
/** Offene Auswahlen dieser Stufe: Kampfstil, Metamagie, Anrufungen. */
function optionSlots(to, chosenSub) {
  const out = [];
  for (const [kind, by] of Object.entries(OPT_SCHEDULE)) {
    let n = by[S.klass]?.[to] || 0;
    if (kind === 'fightingStyles' && S.klass === 'Fighter' && chosenSub === 'Champion' && to === 10) n += 1;
    for (let i = 0; i < n; i++) out.push({ kind, id: `${kind}${i}` });
  }
  return out;
}
function vOptions(d) {
  const slots = optionSlots(d.to, (d.to === d.C.subL ? U.LU.sub : S.sub || '').trim());
  if (!slots.length) return '';
  const known = new Set(S.feats.map(f => f.n));
  return slots.map(s => {
    const list = OPTIONS[s.kind].filter(o => !known.has(o.n) || U.LU[s.id] === o.n);
    const cur = OPTIONS[s.kind].find(o => o.n === U.LU[s.id]);
    return `<h4>${t('lu.opt.' + s.kind)}</h4><div class="add"><select id="lu-${s.id}" data-lu="${s.id}" aria-label="${t('lu.opt.' + s.kind)}"><option value="">${t('common.choose')}</option>${list.map(o => `<option value="${esc(o.n)}"${U.LU[s.id] === o.n ? ' selected' : ''}>${esc(o.n)}</option>`).join('')}</select></div>${cur ? `<p class="note">${esc(dice(loc(cur.text)))}</p>` : ''}`;
  }).join('');
}
const featMet = f => { const r = f.req; if (!r) return true; if (r.abil && Object.entries(r.abil).some(([k, v]) => S.abil[k] < v)) return false; if (r.spell && !CLASSES[S.klass]?.cast) return false; return true; };
function vFeatPick() {
  const cur = FEATS.find(f => f.n === U.LU.feat);
  const own = U.LU.feat === '__own';
  const needAb = cur?.asi?.any || cur?.asi?.anyAbil;
  const abs = cur?.asi?.any || ABK;
  return `<select id="lu-feat" data-lu="feat" aria-label="${t('feat.feat')}"><option value="">${t('lu.featChoose')}</option>${FEATS.map(f => { const ok = featMet(f); return `<option value="${esc(f.n)}"${f.n === U.LU.feat ? ' selected' : ''}${ok ? '' : ' disabled'}>${esc(nameLine(f.n, f.de))}${f.req ? ' (' + esc(reqText(f.req)) + ')' : ''}</option>`; }).join('')}<option value="__own"${own ? ' selected' : ''}>${t('lu.featOwn')}</option></select>${needAb ? `<select id="lu-featab" data-lu="featab" aria-label="${t('lu.ability')}"><option value="">${t('lu.ability')}</option>${abs.map(k => `<option value="${k}"${U.LU.featab === k ? ' selected' : ''}>${abName(k)} (${S.abil[k]})</option>`).join('')}</select>` : ''}${own ? `<input type="text" id="lu-featown" data-lu="featown" value="${esc(U.LU.featown || '')}" placeholder="${t('lu.featPh')}" aria-label="${t('feat.feat')}">` : ''}</div>${cur ? `<p class="note">${esc(dice(loc(cur.text)))}</p>` : ''}<div>`;
}
export function vLU() {
  const d = luData(), C = d.C, abOpt = sel => `<option value="">${t('lu.ability')}</option>` + ABK.map(k => `<option value="${k}"${k === sel ? ' selected' : ''}>${abName(k)} (${S.abil[k]})</option>`).join('');
  const chg = (l, a, b) => String(a) === String(b) ? `<span>${l} ${a}</span>` : `<span class="up">${l} ${a} → ${b}</span>`;
  const sl = d.slotsNew.map((n, i) => [i + 1, d.slotsOld[i], n]).filter(x => x[1] || x[2]);
  const prepared = { Cleric: 'wis', Druid: 'wis', Wizard: 'int', Paladin: 'cha' }[S.klass];
  const prepN = prepared ? Math.max(1, mod(S.abil[prepared]) + (S.klass === 'Paladin' ? Math.floor(d.to / 2) : d.to)) : 0;
  const resOld = Object.fromEntries(S.res.map(r => [r.n, r.max]));
  const dieN = dice('W' + C.hd);
  const dwarf = d.dw ? ` +${d.dw} ${t('lu.perLevel')}` : '';
  return `<div class="ovl" data-a="luclose-bg"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="lu-h">
  <h3 id="lu-h" tabindex="-1">${d.to === 1 ? t('lu.level1') : t('lu.fromTo', { a: d.to - 1, b: d.to })}</h3><p class="lbl" style="margin:4px 0 0">${S.klass}${S.sub ? ' · ' + esc(S.sub) : ''}${S.subrace || S.race ? ' · ' + (S.subrace || S.race) : ''}${deName(S.klass) ? ' · ' + deName(S.klass) : ''}</p>
  <h4>${t('lu.hp')}</h4>
  ${d.to === 1 ? `<p>${t('lu.firstHp', { d: dieN, n: C.hd, m: sg(d.con), x: dwarf })} = <span class="big">${t('lu.hpTotal', { n: d.gain })}</span></p><p class="note">${t('lu.firstHint', { s: C.sv.map(abName).join(t('lu.and')) })}</p>`
    : `<div class="add"><select id="lu-hp" data-lu="hp" aria-label="${t('lu.hp')}"><option value="avg"${U.LU.hp === 'avg' ? ' selected' : ''}>${t('lu.avg', { n: d.avg })}</option><option value="roll"${U.LU.hp === 'roll' ? ' selected' : ''}>${t('lu.rolled', { d: dieN })}</option></select>${U.LU.hp === 'roll' ? `<input type="number" class="n" id="lu-roll" data-lu="roll" min="1" max="${C.hd}" value="${esc(U.LU.roll)}" placeholder="${t('lu.roll')}" aria-label="${t('lu.rollLabel')}">` : ''}</div><p>${d.base} ${sg(d.con)} ${t('abs.con')}${dwarf} = <span class="big">${t('lu.hpGain', { n: d.gain })}</span> <span class="lbl">${t('lu.maxHp', { a: S.hpMax, b: S.hpMax + d.gain })}</span></p>`}
  ${d.profNew !== d.profOld || d.to === 1 ? `<h4>${t('stat.prof')}</h4><div class="chg">${chg('', sg(d.profOld), sg(d.profNew))}</div>` : ''}
  ${d.feats.length || d.extra.length ? `<h4>${t('lu.newFeatures')}</h4>${d.feats.map(f => `<div class="row">${tok(CLIC[S.klass])}<div class="nm">${esc(f.n)}<small>${esc(dice(loc(f.text)))}</small></div></div>`).join('')}${d.extra.map(x => `<div class="row">${tok('star')}<div class="nm">${esc(x)}</div></div>`).join('')}` : ''}
  ${d.to === C.subL ? `<h4>${t('lu.choose', { n: C.subN })}</h4><div class="add"><input type="text" id="lu-sub" data-lu="sub" list="lu-sub-dl" value="${esc(U.LU.sub)}" placeholder="${C.subN}" aria-label="${C.subN}"><datalist id="lu-sub-dl">${C.subs.map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>` : ''}
  ${d.asi ? `<h4>${t('lu.asi')}</h4><div class="add"><select id="lu-asi" data-lu="asi" aria-label="${t('lu.asiKind')}"><option value="two"${U.LU.asi === 'two' ? ' selected' : ''}>${t('lu.asiTwo')}</option><option value="one"${U.LU.asi === 'one' ? ' selected' : ''}>${t('lu.asiOne')}</option><option value="feat"${U.LU.asi === 'feat' ? ' selected' : ''}>${t('lu.asiFeat')}</option></select>
    ${U.LU.asi === 'feat' ? vFeatPick() : `<select id="lu-a1" data-lu="a1" aria-label="${t('lu.a1')}">${abOpt(U.LU.a1)}</select>${U.LU.asi === 'two' ? `<select id="lu-a2" data-lu="a2" aria-label="${t('lu.a2')}">${abOpt(U.LU.a2)}</select>` : ''}`}</div><p class="note">${t('lu.asiNote')}</p>` : ''}
  ${vOptions(d)}
  ${sl.length ? `<h4>${t('setup.slots')}</h4><div class="chg">${sl.map(([g, a, b]) => chg(t('spell.level', { n: g }) + ':', a, b)).join('')}</div>` : ''}
  ${d.pact ? `<h4>${t('spell.pact')}</h4><div class="chg">${chg('', t('lu.pactOf', { a: S.pact.max, b: S.pact.lvl }), t('lu.pactOf', { a: d.pact[0], b: d.pact[1] }))}</div>` : ''}
  ${d.cant[1] || d.known[1] != null || prepared ? `<h4>${t('spell.title')}</h4><div class="chg">${d.cant[1] ? chg(t('spell.cantrips'), d.cant[0], d.cant[1]) : ''}${d.known[1] != null ? chg(t('lu.known'), d.known[0] || 0, d.known[1]) : ''}${prepared && (S.klass !== 'Paladin' || d.to >= 2) ? `<span>${t('lu.prepared', { n: prepN })}</span>` : ''}${S.klass === 'Wizard' ? `<span class="up">${d.to === 1 ? t('lu.book6') : t('lu.book2')}</span>` : ''}</div><p class="note">${t('lu.spellNote')}</p>` : ''}
  ${d.res.length ? `<h4>${t('res.title')}</h4><div class="chg">${d.res.map(r => chg(r.n + ':', resOld[r.n] == null ? t('lu.new') : resOld[r.n] >= 99 ? '∞' : resOld[r.n], r.max >= 99 ? '∞' : r.max)).join('')}</div>` : ''}
  <div class="dlgf"><button class="btn" data-a="luclose">${t('common.cancel')}</button><button class="btn solid" data-a="luapply">${d.to === 1 ? t('lu.apply1') : t('lu.apply')}</button></div></div></div>`;
}
export function applyLU() {
  const d = luData(), C = d.C, to = d.to, L = U.LU;
  if (to > 1 && L.hp === 'roll' && !(+L.roll >= 1)) { toast(t('lu.errRoll')); return false; }
  if (to === C.subL && !L.sub.trim()) { toast(t('lu.errSub', { n: C.subN })); return false; }
  if (d.asi) {
    if (L.asi === 'feat') {
      const picked = FEATS.find(f => f.n === L.feat);
      if (!L.feat || (L.feat === '__own' && !(L.featown || '').trim())) { toast(t('lu.errFeat')); return false; }
      if ((picked?.asi?.any || picked?.asi?.anyAbil) && !L.featab) { toast(t('lu.errOne')); return false; }
    }
    else if (!L.a1 || (L.asi === 'two' && (!L.a2 || L.a2 === L.a1))) { toast(L.asi === 'two' ? t('lu.errTwo') : t('lu.errOne')); return false; }
  }
  if (to === 1) { S.saves = {}; C.sv.forEach(k => { S.saves[k] = true; }); S.feats = S.feats.filter(f => f.src !== 'Klasse'); S.hpMax = 0; S.hp = 0; S.hd.used = 0; }
  S.level = to; S.hpMax += d.gain; S.hp = Math.min(S.hpMax, S.hp + d.gain); S.hd.max = to; S.hd.die = 'W' + C.hd; S.prof = d.profNew; S.cls = C.l;
  if (C.cast === 'full' || C.cast === 'half') d.slotsNew.forEach((m, i) => { S.slots[i].max = m; S.slots[i].used = Math.min(S.slots[i].used, m); });
  if (d.pact) { S.pact.max = d.pact[0]; S.pact.lvl = d.pact[1]; S.pact.used = Math.min(S.pact.used, S.pact.max); }
  if (to === C.subL) S.sub = L.sub.trim();
  d.feats.forEach(f => S.feats.push({ n: f.n, p: loc(f.text), lvl: to, src: f.sub ? 'Unterklasse' : 'Klasse' }));
  optionSlots(to, S.sub).forEach(s => { const o = OPTIONS[s.kind].find(x => x.n === L[s.id]); if (o) S.feats.push({ n: o.n, p: loc(o.text), lvl: to, src: 'Klasse' }); });
  if (d.asi) {
    if (L.asi === 'feat') {
      const f = FEATS.find(x => x.n === L.feat);
      if (!f) S.feats.push({ n: L.featown.trim(), p: t('lu.featText'), lvl: to, src: 'Talent' });
      else {
        S.feats.push({ n: f.n, p: loc(f.text), lvl: to, src: 'Talent' });
        const bump = (k, v) => { S.abil[k] = Math.min(20, S.abil[k] + v); };
        if (f.asi?.fixed) Object.entries(f.asi.fixed).forEach(([k, v]) => bump(k, v));
        if (f.asi?.any || f.asi?.anyAbil) bump(L.featab, 1);
        if (f.n === 'Resilient') S.saves[L.featab] = true;
        if (f.n === 'Tough') { S.hpMax += 2 * to; S.hp += 2 * to; }
      }
    } else { const add = (k, v) => { S.abil[k] = Math.min(20, Math.max(S.abil[k], S.abil[k] + v)); }; if (L.asi === 'one') add(L.a1, 2); else { add(L.a1, 1); add(L.a2, 1); } }
  }
  if (S.klass === 'Barbarian' && to === 20) { S.abil.str = Math.min(24, S.abil.str + 4); S.abil.con = Math.min(24, S.abil.con + 4); }
  d.res.forEach(r => { const ex = S.res.find(x => x.n === r.n); if (ex) { ex.max = r.max; ex.rest = r.rest; ex.p = r.p; ex.used = Math.min(ex.used, r.max); } else S.res.push({ n: r.n, ic: r.ic, max: r.max, used: 0, rest: r.rest, p: r.p }); });
  U.LU = null;
  toast(d.feats.length ? t('lu.doneFeats', { n: to, g: d.gain }) : t('lu.done', { n: to, g: d.gain }));
  return true;
}
