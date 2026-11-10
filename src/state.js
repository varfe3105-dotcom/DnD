import { $, uid } from './util.js';
import { icFrom } from './icons.js';
import { CLN } from './constants.js';
import { t } from './i18n/index.js';
import { BYN, CLASSES, byName, findRef } from './catalog.js';
import { loc } from './i18n/index.js';

export const KEY='charbogen-v4',OLD='charbogen-v2';
export const def=()=>({v:4,id:uid(),multi:[],tools:[],langs:[],acMode:'auto',name:t('char.new'),info:'',img:'',race:'',subrace:'',klass:'',sub:'',level:0,cls:'',hp:10,hpMax:10,tmp:0,ac:10,speed:9,prof:2,
 abil:{str:10,dex:10,con:10,int:10,wis:10,cha:10},saves:{},skills:{},hd:{max:1,used:0,die:'W8'},death:{s:0,f:0},conc:'',
 slots:Array.from({length:9},()=>({max:0,used:0})),pact:{max:0,used:0,lvl:1},res:[],spells:[],feats:[],bag:Array(24).fill(null),eq:{},
 gold:{pp:0,gp:0,ep:0,sp:0,cp:0},cond:{},exh:0,notes:'',tab:'main'});
export const mk=(c,q)=>({id:uid(),n:c.n,ic:c.ic||'box',p:c.p||'',q:Math.max(1,q||c.q||1),slot:c.slot||'',cons:!!c.cons,att:!!c.att,magic:!!c.magic,tuned:false,...(c.key?{ref:c.key}:{})});
export const spFrom=c=>({n:c.n,ic:c.ic,lvl:c.lvl,time:c.time||'',range:c.range||'',dur:c.dur||'',eff:c.eff||'',conc:!!c.conc,ritual:!!c.ritual,school:c.school||'',cls:c.cls||'',comp:c.comp||'',src:c.src||'sum'});
export const sameItem=(a,b)=>a.ref&&b.ref?a.ref===b.ref:(a.n===b.n&&a.p===b.p);
const spellEntry=n=>BYN['spell:'+n];
export function putBag(s,it){
  if(it.cons){const st=s.bag.find(x=>x&&x.cons&&sameItem(x,it));if(st){st.q+=it.q;return st}}
  let i=s.bag.indexOf(null);if(i<0){i=s.bag.length;for(let k=0;k<6;k++)s.bag.push(null)}
  s.bag[i]=it;return it}
export function norm(o){
  o=o&&typeof o==='object'?o:{};const s=Object.assign(def(),o);
  ['abil','gold','hd','pact'].forEach(k=>s[k]=Object.assign(def()[k],o[k]||{}));
  s.death=Object.assign({s:0,f:0},o.death||{});
  if(!Array.isArray(s.slots)||s.slots.length!==9)s.slots=def().slots;
  ['saves','skills','cond','eq'].forEach(k=>{if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))s[k]={}});
  s.acMode=o.acMode==='auto'?'auto':'manual';
  ['res','spells','feats','multi','tools','langs'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=[]});
  if(!Array.isArray(s.bag))s.bag=[];while(s.bag.length<24)s.bag.push(null);
  ['hp','hpMax','tmp','ac','speed','prof','exh','level'].forEach(k=>{s[k]=+s[k]||0});
  if(s.info==='Volk · Klasse · Stufe')s.info='';
  if(!s.klass&&s.cls&&CLN[s.cls])s.klass=CLN[s.cls];
  if(CLASSES[s.klass])s.cls=CLASSES[s.klass].l;
  // Ältere Gegenstände dem Katalog zuordnen, damit sie der Sprache folgen. Eigene Einträge bleiben, wie sie sind.
  [...s.bag,...Object.values(s.eq)].forEach(it=>{if(it&&!it.ref){const r=findRef(it.n,it.p);if(r)it.ref=r}});
  s.v=4;return s}
export function migrate(o){
  const s=norm({name:o.name,info:o.info,hp:o.hp,hpMax:o.hpMax,ac:o.ac,speed:o.speed,prof:o.prof,abil:o.abil,hd:o.hd?{max:o.hd.max,used:o.hd.used}:undefined,slots:o.slots,gold:o.gold,cond:o.cond,exh:o.exh,notes:o.notes});
  (o.res||[]).forEach(r=>{
    if(r.rest==='none'){const q=Math.max(0,(r.max||1)-(r.used||0));if(q){const c=byName(r.n);putBag(s,mk(c||{n:r.n,ic:icFrom(r.i),p:r.p||'',cons:true},q))}}
    else s.res.push({n:r.n,ic:icFrom(r.i),max:r.max||1,used:r.used||0,rest:r.rest||'long',p:r.p||''})});
  (o.spells||[]).forEach(x=>{const c=spellEntry(x.n);s.spells.push(c?spFrom(c):{n:x.n,ic:icFrom(x.i)||'star',lvl:x.lvl||0,time:'',range:'',dur:'',eff:x.p||'',conc:/Konz/.test(x.p||''),ritual:false,school:'',cls:'',src:'own'})});
  (o.items||[]).forEach(x=>{const c=byName(x.n);if((x.q??1)>0)putBag(s,mk(c||{n:x.n,ic:icFrom(x.i),p:x.p||''},x.q??1))});
  return s}
export function load(){
  for(const k of [KEY,'charbogen-v3']){let r=null;try{r=localStorage.getItem(k)}catch(e){}if(r){try{return norm(JSON.parse(r))}catch(e){}}}
  let o=null;try{o=JSON.parse(localStorage.getItem(OLD)||'null')}catch(e){}
  return o?migrate(o):def()}
export let S=load();
export function setS(v){S=v}
export const U={OPEN:{},SEL:null,CONF:null,WF:'all',WQ:'',WC:'',WSEL:null,EXP:'',IMP:'',LU:null,LUfocus:false,IMPREP:null,invQ:'',resetWl:false,anchor:null,SHEET:null};
export const hooks={onSave:null,beforeSave:null};
export const save=()=>{if(hooks.beforeSave)hooks.beforeSave();try{localStorage.setItem(KEY,JSON.stringify(S));localStorage.setItem(IDX,JSON.stringify(roster()))}catch(e){toast(t('toast.saveFailed'))}if(hooks.onSave)hooks.onSave()};

/* Mehrere Charaktere: Der aktive liegt unter KEY, alle anderen in eigenen Schlüsseln, IDX hält die Übersicht. */
const IDX='charbogen-index',slotKey=id=>'charbogen-char-'+id;
const get=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){toast(t('toast.saveFailed'));return false}};
const drop=k=>{try{localStorage.removeItem(k)}catch(e){/* Datenschutzmodus */}};
export const roster=()=>{const list=get(IDX)||[],me={id:S.id,name:S.name,klass:S.klass,level:S.level},i=list.findIndex(x=>x.id===S.id);if(i<0)list.unshift(me);else list[i]=me;return list};
const fresh=()=>{U.OPEN={};U.SEL=null;U.EXP='';U.CONF=null};
const park=()=>{const list=roster();if(!put(slotKey(S.id),S))return null;return list};
export const charSnapshot=id=>id===S.id?S:get(slotKey(id));
export function switchChar(id){if(id===S.id)return false;const o=get(slotKey(id));if(!o||!park())return false;setS(norm(o));drop(slotKey(id));fresh();save();return true}
const pristine=()=>!S.klass&&!S.level&&!S.spells.length&&!S.notes&&!S.bag.some(Boolean)&&!Object.keys(S.eq).length;
/** Platz für einen importierten Charakter: Ein noch leerer Bogen wird ersetzt, alle anderen bleiben. */
export function openFresh(){if(pristine()){const list=roster().filter(x=>x.id!==S.id);put(IDX,list);setS(def());fresh();return true}if(!park())return false;const list=roster();setS(def());fresh();put(IDX,list);return true}
export function newChar(){if(!park())return;const list=roster();setS(def());S.tab='setup';fresh();put(IDX,list);save()}
export function dupChar(){if(!park())return;const list=roster();const c=JSON.parse(JSON.stringify(S));c.id=uid();c.name=S.name+' (2)';setS(norm(c));fresh();put(IDX,list);save()}
export function delChar(id){const list=roster().filter(x=>x.id!==id);drop(slotKey(id));put(IDX,list);if(id!==S.id)return;const next=list[0]&&get(slotKey(list[0].id));if(next){setS(norm(next));drop(slotKey(list[0].id))}else{setS(def());S.tab='setup'}fresh();save()}
export let tt;
export function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>{t.hidden=true},4600)}
