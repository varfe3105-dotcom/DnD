import { def, S, setS, U, migrate, norm, save, toast, sameItem } from './state.js';
import { get, set, fits, slotLabel, itemView } from './helpers.js';
import { COND } from './catalog.js';
import { render } from './render.js';
import { t, dice } from './i18n/index.js';

export function damage(d) {
  const msg = [], before = S.hp;
  let r = d;
  if (S.tmp) { const x = Math.min(S.tmp, r); S.tmp -= x; r -= x; if (x) msg.push(t('toast.tempAbsorb', { n: x })); }
  if (r > 0) {
    if (before === 0) {
      if (r >= S.hpMax) msg.push(t('toast.deadAt0'));
      else { S.death.f = Math.min(3, S.death.f + 1); msg.push(t('toast.failAt0')); }
    } else {
      S.hp = Math.max(0, before - r);
      if (S.hp === 0) { S.cond.Unconscious = true; msg.push(r - before >= S.hpMax ? t('toast.massive') : t('toast.down')); }
    }
  }
  if (S.conc) {
    if (S.hp === 0) { msg.push(t('toast.concEnds', { s: S.conc })); S.conc = ''; }
    else msg.unshift(t('toast.concSave', { s: S.conc, dc: Math.max(10, Math.floor(d / 2)) }));
  }
  toast(msg.join(' ') || t('toast.damage', { n: d }));
}
export function heal(d) {
  if (S.hp === 0) { S.death = { s: 0, f: 0 }; delete S.cond.Unconscious; }
  S.hp = Math.min(S.hpMax, S.hp + d);
  toast(t('toast.healed', { n: d }));
}
export function rest(long) {
  S.res.forEach(r => { if (r.rest === 'short' || (long && r.rest === 'long')) r.used = 0; });
  S.pact.used = 0;
  if (!long) { toast(S.pact.max ? t('toast.shortPact') : t('toast.short')); return; }
  const back = Math.max(1, Math.floor(S.hd.max / 2));
  S.hd.used = Math.max(0, S.hd.used - back);
  S.slots.forEach(s => { s.used = 0; });
  S.hp = S.hpMax; S.tmp = 0; S.death = { s: 0, f: 0 }; S.conc = '';
  delete S.cond.Unconscious;
  let m = t('toast.long', { n: back });
  if (S.exh > 0) { S.exh--; m += ' ' + t('toast.exhDown'); }
  const left = COND.filter(c => S.cond[c.n]).map(c => c.n);
  if (left.length) m += ' ' + t('toast.condStay', { s: left.join(', ') });
  toast(m);
}
const concMsg = s => (S.conc && S.conc !== s.n ? t('toast.concSwitch', { a: S.conc, b: s.n }) : t('toast.concOn', { s: s.n }));
export function cast(i) {
  const s = S.spells[i];
  if (s.lvl > 0) {
    let msg = '';
    if (S.pact.max && S.pact.used < S.pact.max && S.pact.lvl >= s.lvl) { S.pact.used++; msg = t('toast.pactUsed', { n: S.pact.lvl }); }
    else { for (let l = s.lvl; l <= 9; l++) { const sl = S.slots[l - 1]; if (sl.used < sl.max) { sl.used++; msg = t('toast.slotUsed', { n: l }); break; } } }
    if (!msg) { toast(t('toast.noSlot', { n: s.lvl }) + (s.ritual ? ' ' + t('toast.ritualHint') : '')); return; }
    if (s.conc) { msg += ' ' + concMsg(s); S.conc = s.n; }
    toast(msg);
    return;
  }
  if (s.conc) { toast(concMsg(s)); S.conc = s.n; }
  else toast(t('toast.cast', { s: s.n }));
}
export function move(from, to) {
  if (from === to) return;
  const a = get(from), b = get(to);
  if (!a) return;
  if (!fits(a, to)) { toast(t('toast.noFit', { a: itemView(a).n, s: slotLabel(to) })); return; }
  if (b && a.cons && b.cons && sameItem(a, b) && to.startsWith('bag')) { b.q += a.q; set(from, null); if (U.SEL === from) U.SEL = to; return; }
  if (b && !fits(b, from)) { toast(t('toast.occupied', { a: itemView(b).n, s: slotLabel(from) })); return; }
  set(to, a); set(from, b);
  if (U.SEL === from) U.SEL = to; else if (U.SEL === to) U.SEL = from;
  const m = S.eq.main;
  if (m && /Zweihändig|Two-Handed/i.test(m.p) && S.eq.off) toast(t('toast.twoHanded', { a: itemView(m).n }));
}
export function use(r) {
  const raw = get(r);
  if (!raw) return;
  const it = itemView(raw);
  raw.q--;
  if (raw.q <= 0) { set(r, null); if (U.SEL === r) U.SEL = null; toast(t('toast.usedLast', { a: it.n, p: dice(it.p) })); }
  else toast(t('toast.used', { a: it.n, p: dice(it.p), n: raw.q }));
}
export function importText(txt) {
  let o;
  try { o = JSON.parse(txt); } catch (e) { toast(t('toast.badExport')); return false; }
  if (!o || typeof o !== 'object') { toast(t('toast.badExport2')); return false; }
  if (o.v >= 3) setS(norm(o));
  else if (o.abil || o.hpMax != null) setS(migrate(o));
  else { toast(t('toast.unknownFormat')); return false; }
  S.tab = 'setup'; U.OPEN = {}; U.SEL = null; U.EXP = '';
  toast(t('toast.imported', { n: S.name }));
  return true;
}
export function loadPortrait(file) {
  if (!file || !/^image\//.test(file.type)) { toast(t('toast.notImage')); return; }
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const z = 320, c = document.createElement('canvas');
    c.width = c.height = z;
    const s = Math.min(img.width, img.height);
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 3, s, s, 0, 0, z, z);
    URL.revokeObjectURL(url);
    S.img = c.toDataURL('image/jpeg', 0.85);
    save(); render();
    toast(t('toast.portrait'));
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast(t('toast.badImage')); };
  img.src = url;
}
export { def };
