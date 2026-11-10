import { $ } from './util.js';
import { norm, migrate, S, setS, U, save, toast } from './state.js';
import { get, set, fits, slotLabel } from './helpers.js';
import { render } from './render.js';
import { COND } from './catalog.js';

export function damage(d){
  const msg=[],before=S.hp;let r=d;
  if(S.tmp){const t=Math.min(S.tmp,r);S.tmp-=t;r-=t;if(t)msg.push(`${t} von temporären TP abgefangen.`)}
  if(r>0){
    if(before===0){if(r>=S.hpMax)msg.push('Schaden bei 0 TP mindestens so hoch wie die Max-TP: sofortiger Tod.');else{S.death.f=Math.min(3,S.death.f+1);msg.push('Schaden bei 0 TP: ein Fehlschlag beim Todesrettungswurf (bei kritischem Treffer zwei).')}}
    else{S.hp=Math.max(0,before-r);if(S.hp===0){S.cond.Unconscious=true;msg.push(r-before>=S.hpMax?'Restschaden mindestens so hoch wie die Max-TP: sofortiger Tod nach Regelwerk.':'0 TP: bewusstlos, Todesrettungswürfe beginnen.')}}}
  if(S.conc){if(S.hp===0){msg.push(`Konzentration auf ${S.conc} endet.`);S.conc=''}else msg.unshift(`Konzentration auf ${S.conc}: KON-Rettungswurf SG ${Math.max(10,Math.floor(d/2))}.`)}
  toast(msg.join(' ')||`${d} Schaden.`)}
export function heal(d){if(S.hp===0){S.death={s:0,f:0};delete S.cond.Unconscious}S.hp=Math.min(S.hpMax,S.hp+d);toast(`${d} TP geheilt.`)}
export function rest(long){
  S.res.forEach(r=>{if(r.rest==='short'||(long&&r.rest==='long'))r.used=0});
  S.pact.used=0;
  if(!long){toast('Kurze Rast: Fähigkeiten mit „kurze Rast“'+(S.pact.max?' und Paktmagie':'')+' sind zurück. Trefferwürfel ausgeben: Kästchen ankreuzen, Ergebnis bei „Heilen“ eintragen.');return}
  const back=Math.max(1,Math.floor(S.hd.max/2));
  S.hd.used=Math.max(0,S.hd.used-back);S.slots.forEach(s=>s.used=0);S.hp=S.hpMax;S.tmp=0;S.death={s:0,f:0};S.conc='';delete S.cond.Unconscious;
  let m=`Lange Rast: TP voll, Zauberplätze und Fähigkeiten zurück, bis zu ${back} Trefferwürfel zurück.`;
  if(S.exh>0){S.exh--;m+=' Exhaustion um 1 gesenkt (gilt nur mit Essen und Trinken).'}
  const left=COND.filter(c=>S.cond[c[0]]).map(c=>c[0]);
  if(left.length)m+=` ${left.join(', ')} bleibt aktiv: Zustände enden nicht durch die Rast, sondern wenn ihre Ursache endet.`;
  toast(m)}
export function cast(i){
  const s=S.spells[i];
  if(s.lvl>0){
    let msg='';
    if(S.pact.max&&S.pact.used<S.pact.max&&S.pact.lvl>=s.lvl){S.pact.used++;msg=`Paktmagie-Platz (Grad ${S.pact.lvl}) verbraucht.`}
    else{for(let l=s.lvl;l<=9;l++){const sl=S.slots[l-1];if(sl.used<sl.max){sl.used++;msg=`Platz Grad ${l} verbraucht.`;break}}}
    if(!msg){toast(`Kein freier Zauberplatz ab Grad ${s.lvl}.${s.ritual?' Als Ritual geht es ohne Platz (10 Min länger).':''}`);return}
    if(s.conc){msg+=S.conc&&S.conc!==s.n?` Konzentration wechselt von ${S.conc} zu ${s.n}.`:` Konzentration auf ${s.n}.`;S.conc=s.n}
    toast(msg);return}
  if(s.conc){toast(S.conc&&S.conc!==s.n?`Konzentration wechselt von ${S.conc} zu ${s.n}.`:`Konzentration auf ${s.n}.`);S.conc=s.n}
  else toast(`${s.n} gewirkt.`)}
export function move(from,to){
  if(from===to)return;const a=get(from),b=get(to);if(!a)return;
  if(!fits(a,to)){toast(`${a.n} passt nicht auf „${slotLabel(to)}“.`);return}
  if(b&&a.cons&&b.cons&&a.n===b.n&&a.p===b.p&&to.startsWith('bag')){b.q+=a.q;set(from,null);if(U.SEL===from)U.SEL=to;return}
  if(b&&!fits(b,from)){toast(`Belegt: ${b.n} kann nicht auf „${slotLabel(from)}“. Erst woanders ablegen.`);return}
  set(to,a);set(from,b);
  if(U.SEL===from)U.SEL=to;else if(U.SEL===to)U.SEL=from;
  const m=S.eq.main;if(m&&/Zweihändig/.test(m.p)&&S.eq.off)toast(`Hinweis: ${m.n} ist zweihändig, die Nebenhand ist aber belegt.`)}
export function use(r){
  const it=get(r);if(!it)return;it.q--;
  if(it.q<=0){set(r,null);if(U.SEL===r)U.SEL=null;toast(`${it.n}: ${it.p} · Das war das letzte Stück.`)}
  else toast(`${it.n}: ${it.p} · Noch ${it.q}.`)}
export function importText(txt){
  let o;try{o=JSON.parse(txt)}catch(e){toast('Das ist kein gültiger Export. Bitte den kompletten Text einfügen.');return false}
  if(!o||typeof o!=='object'){toast('Das ist kein gültiger Export.');return false}
  if(o.v>=3)setS(norm(o));else if(o.abil||o.hpMax!=null)setS(migrate(o));else{toast('Format nicht erkannt. Erwartet wird ein Export aus diesem Bogen.');return false}
  S.tab='setup';U.OPEN={};U.SEL=null;U.EXP='';toast(`${S.name} importiert.`);return true}
export function loadPortrait(file){
  if(!file||!/^image\//.test(file.type)){toast('Bitte eine Bilddatei wählen.');return}
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{const z=320,c=document.createElement('canvas');c.width=c.height=z;const s=Math.min(img.width,img.height);c.getContext('2d').drawImage(img,(img.width-s)/2,(img.height-s)/3,s,s,0,0,z,z);URL.revokeObjectURL(url);S.img=c.toDataURL('image/jpeg',.85);save();render();toast('Porträt gespeichert.')};
  img.onerror=()=>{URL.revokeObjectURL(url);toast('Das Bild ließ sich nicht öffnen. Ein JPG oder PNG versuchen.')};
  img.src=url}
