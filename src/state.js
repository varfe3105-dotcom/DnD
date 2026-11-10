import { $, uid } from './util.js';
import { icFrom } from './icons.js';
import { CLN } from './constants.js';
import { t } from './i18n/index.js';
import { BYN, CLASSES } from './catalog.js';

export const KEY='charbogen-v4',OLD='charbogen-v2';
export const def=()=>({v:4,name:t('char.new'),info:'',img:'',race:'',subrace:'',klass:'',sub:'',level:0,cls:'',hp:10,hpMax:10,tmp:0,ac:10,speed:9,prof:2,
 abil:{str:10,dex:10,con:10,int:10,wis:10,cha:10},saves:{},skills:{},hd:{max:1,used:0,die:'W8'},death:{s:0,f:0},conc:'',
 slots:Array.from({length:9},()=>({max:0,used:0})),pact:{max:0,used:0,lvl:1},res:[],spells:[],feats:[],bag:Array(24).fill(null),eq:{},
 gold:{pp:0,gp:0,ep:0,sp:0,cp:0},cond:{},exh:0,notes:'',tab:'main'});
export const mk=(c,q)=>({id:uid(),n:c.n,ic:c.ic||'box',p:c.p||'',q:Math.max(1,q||c.q||1),slot:c.slot||'',cons:!!c.cons,att:!!c.att,magic:!!c.magic,tuned:false,...(c.key?{ref:c.key}:{})});
export const spFrom=c=>({n:c.n,ic:c.ic,lvl:c.lvl,time:c.time||'',range:c.range||'',dur:c.dur||'',eff:c.eff||'',conc:!!c.conc,ritual:!!c.ritual,school:c.school||'',cls:c.cls||'',src:c.src||'sum'});
export function putBag(s,it){
  if(it.cons){const st=s.bag.find(x=>x&&x.cons&&x.n===it.n&&x.p===it.p);if(st){st.q+=it.q;return st}}
  let i=s.bag.indexOf(null);if(i<0){i=s.bag.length;for(let k=0;k<6;k++)s.bag.push(null)}
  s.bag[i]=it;return it}
export function norm(o){
  o=o&&typeof o==='object'?o:{};const s=Object.assign(def(),o);
  ['abil','gold','hd','pact'].forEach(k=>s[k]=Object.assign(def()[k],o[k]||{}));
  s.death=Object.assign({s:0,f:0},o.death||{});
  if(!Array.isArray(s.slots)||s.slots.length!==9)s.slots=def().slots;
  ['saves','skills','cond','eq'].forEach(k=>{if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))s[k]={}});
  ['res','spells','feats'].forEach(k=>{if(!Array.isArray(s[k]))s[k]=[]});
  if(!Array.isArray(s.bag))s.bag=[];while(s.bag.length<24)s.bag.push(null);
  ['hp','hpMax','tmp','ac','speed','prof','exh','level'].forEach(k=>{s[k]=+s[k]||0});
  if(s.info==='Volk · Klasse · Stufe')s.info='';
  if(!s.klass&&s.cls&&CLN[s.cls])s.klass=CLN[s.cls];
  if(CLASSES[s.klass])s.cls=CLASSES[s.klass].l;
  s.v=4;return s}
export function migrate(o){
  const s=norm({name:o.name,info:o.info,hp:o.hp,hpMax:o.hpMax,ac:o.ac,speed:o.speed,prof:o.prof,abil:o.abil,hd:o.hd?{max:o.hd.max,used:o.hd.used}:undefined,slots:o.slots,gold:o.gold,cond:o.cond,exh:o.exh,notes:o.notes});
  (o.res||[]).forEach(r=>{
    if(r.rest==='none'){const q=Math.max(0,(r.max||1)-(r.used||0));if(q){const c=BYN['potion:'+r.n];putBag(s,mk(c||{n:r.n,ic:icFrom(r.i),p:r.p||'',cons:true},q))}}
    else s.res.push({n:r.n,ic:icFrom(r.i),max:r.max||1,used:r.used||0,rest:r.rest||'long',p:r.p||''})});
  (o.spells||[]).forEach(x=>{const c=BYN['spell:'+x.n];s.spells.push(c?spFrom(c):{n:x.n,ic:icFrom(x.i)||'star',lvl:x.lvl||0,time:'',range:'',dur:'',eff:x.p||'',conc:/Konz/.test(x.p||''),ritual:false,school:'',cls:'',src:'own'})});
  (o.items||[]).forEach(x=>{const c=BYN['item:'+x.n]||BYN['magic:'+x.n]||BYN['potion:'+x.n];if((x.q??1)>0)putBag(s,mk(c||{n:x.n,ic:icFrom(x.i),p:x.p||''},x.q??1))});
  return s}
export function load(){
  for(const k of [KEY,'charbogen-v3']){let r=null;try{r=localStorage.getItem(k)}catch(e){}if(r){try{return norm(JSON.parse(r))}catch(e){}}}
  let o=null;try{o=JSON.parse(localStorage.getItem(OLD)||'null')}catch(e){}
  return o?migrate(o):def()}
export let S=load();
export function setS(v){S=v}
export const U={OPEN:{},SEL:null,CONF:null,WF:'all',WQ:'',WC:'',WSEL:null,EXP:'',IMP:'',LU:null,LUfocus:false};
export const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast(t('toast.saveFailed'))}};
export let tt;
export function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>{t.hidden=true},4600)}
