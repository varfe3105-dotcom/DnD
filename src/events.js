import { $, clamp } from './util.js';
import { EQ } from './constants.js';
import { def, mk, spFrom, putBag, S, setS, U, save, toast } from './state.js';
import { get, set, refs, fits, applyRace } from './helpers.js';
import { spMeta } from './views/sheet.js';
import { wikiBody } from './views/wiki.js';
import { openLU, applyLU } from './views/levelup.js';
import { app, render } from './render.js';
import { damage, heal, rest, cast, move, use, importText, loadPortrait } from './game.js';
import { tip, hideTip, showTip } from './tooltip.js';
import { BYN, CLASSES } from './catalog.js';

export let pressing=false,pend=false;
document.addEventListener('pointerdown',()=>{pressing=true},true);
document.addEventListener('pointerup',()=>{pressing=false;if(pend)setTimeout(()=>{if(pend){pend=false;render()}},0)},true);
export function later(){pend=true;if(!pressing)setTimeout(()=>{if(pend&&!pressing){pend=false;render()}},0)}
export function setPath(p,v){const ks=p.split('.');let o=S;for(let i=0;i<ks.length-1;i++){o=o[ks[i]];if(o==null)return}const k=ks[ks.length-1];o[k]=v;if(o.max!=null&&o.used>o.max)o.used=o.max;if(S.hp>S.hpMax)S.hp=S.hpMax}

app.addEventListener('click',ev=>{
  const c=ev.target.closest('[data-slot]');
  if(c&&!ev.target.closest('[data-drag]')&&U.SEL&&!get(c.dataset.slot)){move(U.SEL,c.dataset.slot);save();render();return}
  const b=ev.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a,i=+b.dataset.i,k=b.dataset.k,v=id=>($(id)||{}).value||'';
  if(a==='luclose-bg'&&ev.target!==b)return;
  if(a!=='rm'&&a!=='imp'&&a!=='reset')U.CONF=null;
  pend=false;
  switch(a){
    case 'tab':S.tab=b.dataset.t;U.SEL=null;window.scrollTo({top:0});break;
    case 'lu':openLU();break;
    case 'luclose':case 'luclose-bg':U.LU=null;break;
    case 'luapply':if(!applyLU())return;break;
    case 'rest':rest(b.dataset.r==='long');break;
    case 'hp':{const was=S.hp;S.hp=clamp(S.hp+ +b.dataset.d,0,S.hpMax);if(was===0&&S.hp>0){S.death={s:0,f:0};delete S.cond.Unconscious}if(was>0&&S.hp===0)S.cond.Unconscious=true;break}
    case 'dmg':case 'heal':case 'temp':{const d=Math.floor(+v('hpv'));if(!(d>0)){toast('Erst einen Betrag eintragen.');return}
      if(a==='dmg')damage(d);else if(a==='heal')heal(d);else{if(d<=S.tmp)toast('Temporäre TP addieren sich nicht. Der höhere Wert bleibt.');else{S.tmp=d;toast(`${d} temporäre TP.`)}}break}
    case 'ds':{const t=b.dataset.t,j=+b.dataset.j,cur=S.death[t];S.death[t]=j+1===cur?j:j+1;
      if(S.death.s>=3)toast('Drei Erfolge: stabil. Bewusstlos, aber keine weiteren Würfe nötig.');if(S.death.f>=3)toast('Drei Fehlschläge: Der Charakter stirbt.');break}
    case 'pip':{const o=k==='hd'?S.hd:k==='pact'?S.pact:S[k][i];o.used=clamp(+b.dataset.j<o.max-o.used?o.used+1:o.used-1,0,o.max);break}
    case 'resd':{const r=S.res[i];if(r&&r.max<99)r.used=clamp(r.used+ +b.dataset.d,0,r.max);break}
    case 'cond':S.cond[b.dataset.c]=!S.cond[b.dataset.c];if(!S.cond[b.dataset.c])delete S.cond[b.dataset.c];break;
    case 'exh':S.exh=clamp(S.exh+ +b.dataset.d,0,6);break;
    case 'cast':cast(i);break;
    case 'spopen':U.OPEN[i]=!U.OPEN[i];break;
    case 'concend':toast(`Konzentration auf ${S.conc} beendet.`);S.conc='';break;
    case 'use':use(b.dataset.r);break;
    case 'gold':{const c2=b.dataset.c;S.gold[c2]=Math.max(0,(+S.gold[c2]||0)+ +b.dataset.d);break}
    case 'qty':{const it=get(U.SEL);if(it)it.q=Math.max(1,it.q+ +b.dataset.d);break}
    case 'equip':{const it=get(U.SEL);if(!it)break;const c2=EQ.map(e=>'eq:'+e[0]).filter(r=>fits(it,r));const t=c2.find(r=>!get(r))||c2[0];if(!t){toast('Kein passender Ausrüstungsplatz. Platz im Auswahlfeld festlegen.');break}move(U.SEL,t);break}
    case 'unequip':{let j=S.bag.indexOf(null);if(j<0){j=S.bag.length;for(let x=0;x<6;x++)S.bag.push(null)}move(U.SEL,'bag:'+j);break}
    case 'tune':{const it=get(U.SEL);if(!it)break;if(!it.tuned&&refs().filter(r=>get(r).tuned).length>=3){toast('Höchstens drei eingestimmte Gegenstände. Erst einen anderen lösen.');break}it.tuned=!it.tuned;if(it.tuned)toast('Einstimmen dauert eine kurze Rast.');break}
    case 'rm':if(U.CONF!=='rm'){U.CONF='rm';break}set(U.SEL,null);U.SEL=null;U.CONF=null;break;
    case 'unsel':U.SEL=null;break;
    case 'addinv':{const key=v('inv-sel');if(!key){toast('Erst einen Gegenstand auswählen.');return}const c2=BYN[key];const q=Math.floor(+v('inv-q'))||c2.q||1;putBag(S,mk(c2,q));toast(`${c2.n} ins Inventar gelegt.`);break}
    case 'addown':{const n=v('own-n').trim();if(!n){toast('Bitte einen Namen eintragen.');return}const att=$('own-a').checked;putBag(S,mk({n,ic:v('own-ic'),p:v('own-p').trim(),slot:v('own-slot'),cons:$('own-c').checked,att,magic:att},Math.floor(+v('own-q'))||1));toast(`${n} angelegt.`);break}
    case 'wf':U.WF=b.dataset.f;U.WSEL=null;break;
    case 'wsel':U.WSEL=U.WSEL===b.dataset.key&&innerWidth<900?null:b.dataset.key;break;
    case 'wadd':{const c2=BYN[b.dataset.key];if(!c2)break;if(c2.k==='spell'){S.spells.push(spFrom(c2));toast(`${c2.n} steht jetzt bei deinen Zaubern.`)}else{putBag(S,mk(c2));toast(`${c2.n} ins Inventar gelegt.`)}break}
    case 'tsave':S.saves[k]=!S.saves[k];break;
    case 'tskill':S.skills[k]=((S.skills[k]||0)+1)%3;break;
    case 'imgdel':S.img='';break;
    case 'addfeat':{const n=v('feat-n').trim();if(!n){toast('Bitte einen Namen eintragen.');return}S.feats.push({n,p:v('feat-p').trim(),lvl:0,src:'Eigener Eintrag'});break}
    case 'addres':{const n=v('res-n').trim();if(!n){toast('Bitte einen Namen eintragen.');return}S.res.push({n,ic:v('res-ic')||'star',max:Math.max(1,Math.floor(+v('res-m'))||1),used:0,rest:v('res-r')||'long',p:v('res-p').trim()});break}
    case 'addsp':{const n=v('sp-sel');if(!n){toast('Erst einen Zauber auswählen.');return}if(S.spells.some(s=>s.n===n)){toast(`${n} steht schon auf deiner Liste.`);return}S.spells.push(spFrom(BYN['spell:'+n]));toast(`${n} hinzugefügt.`);break}
    case 'addspown':{const n=v('osp-n').trim();if(!n){toast('Bitte einen Namen eintragen.');return}S.spells.push({n,ic:'star',lvl:clamp(Math.floor(+v('osp-l'))||0,0,9),time:v('osp-t').trim(),range:v('osp-r').trim(),dur:v('osp-d').trim(),eff:v('osp-e').trim(),conc:$('osp-c').checked,ritual:$('osp-ri').checked,school:'',cls:'',src:'own'});toast(`${n} angelegt.`);break}
    case 'del':{const it=S[k][i];if(k==='spells'){U.OPEN={};if(it&&S.conc===it.n)S.conc=''}S[k].splice(i,1);break}
    case 'exp':{const o=JSON.parse(JSON.stringify(S));o.tab='main';U.EXP=JSON.stringify(o);break}
    case 'copy':{const ta=$('exp');const p=navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(U.EXP):Promise.reject();p.then(()=>toast('Kopiert. Auf dem anderen Gerät unter „Einrichten“ einfügen.')).catch(()=>{if(ta){ta.focus();ta.select()}toast('Text ist markiert. Mit Strg+C (Mac: Cmd+C) kopieren.')});return}
    case 'imp':{const txt=v('imp').trim();if(!txt){toast('Erst den Export-Text einfügen oder eine Datei laden.');return}if(U.CONF!=='imp'){U.CONF='imp';break}U.CONF=null;if(importText(txt))U.IMP='';break}
    case 'reset':if(U.CONF!=='reset'){U.CONF='reset';break}setS(def());S.tab='setup';U.OPEN={};U.SEL=null;U.EXP='';U.CONF=null;toast('Neuer, leerer Charakter angelegt.');break;
  }
  save();render()});
app.addEventListener('change',ev=>{
  const el=ev.target;
  if((el.id==='img-in'||el.id==='img-in2')&&el.files&&el.files[0]){loadPortrait(el.files[0]);return}
  if(el.id==='impf'&&el.files&&el.files[0]){const fr=new FileReader();fr.onload=()=>{U.IMP=String(fr.result);const ta=$('imp');if(ta)ta.value=U.IMP;U.CONF=null;toast('Datei geladen. Jetzt „Importieren“ drücken.')};fr.readAsText(el.files[0]);return}
  if(el.id==='inv-sel'||el.id==='sp-sel'){const c=el.id==='inv-sel'?BYN[el.value]:BYN['spell:'+el.value];const h=$(el.id+'-h');if(h)h.textContent=c?(c.k==='spell'?spMeta(c)+' — '+c.eff:c.p+(c.att?' · braucht Einstimmung':'')):'';return}
  if(el.id==='wc'){U.WC=el.value;$('wres').innerHTML=wikiBody();return}
  if(el.dataset.lu){U.LU[el.dataset.lu]=el.value;later();return}
  const p=el.dataset.p;if(!p)return;
  let val=el.value;
  if(el.dataset.t==='n'){val=Math.max(+el.min||0,+String(val).replace(',','.')||0);if(el.max)val=Math.min(+el.max,val);if(p!=='speed')val=Math.floor(val)}
  setPath(p,val);
  if(p==='race'){S.subrace='';applyRace()}
  if(p==='subrace')applyRace();
  if(p==='klass'){const C=CLASSES[S.klass];S.cls=C?C.l:'';if(C){S.hd.die='W'+C.hd;if(!C.subs.includes(S.sub))S.sub=''}}
  save();later()});
app.addEventListener('input',ev=>{
  const el=ev.target;
  if(el.id==='notes'){S.notes=el.value;save()}
  if(el.id==='imp'){U.IMP=el.value;if(U.CONF==='imp')U.CONF=null}
  if(el.dataset&&el.dataset.lu&&el.tagName==='INPUT'&&U.LU)U.LU[el.dataset.lu]=el.value;
  if(el.id==='wq'){U.WQ=el.value;U.WSEL=null;$('wres').innerHTML=wikiBody()}});
app.addEventListener('keydown',ev=>{
  const it=ev.target.closest&&ev.target.closest('[data-drag]');
  if(it&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();U.SEL=U.SEL===it.dataset.drag?null:it.dataset.drag;U.CONF=null;render();const f=document.querySelector(`[data-drag="${U.SEL}"]`);if(f)f.focus()}
  if(ev.target.id==='hpv'&&ev.key==='Enter')ev.preventDefault();
  if(ev.target.tagName==='LABEL'&&ev.target.classList.contains('por')&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();ev.target.click()}});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&U.LU){U.LU=null;render();const b=document.querySelector('[data-a=lu]');if(b)b.focus()}});

/* Tooltip */
app.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse'||drag)return;const it=e.target.closest('[data-drag]');if(it)showTip(it.dataset.drag,e.clientX,e.clientY)});
app.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||drag||tip.hidden)return;const it=e.target.closest('[data-drag]');if(it)showTip(it.dataset.drag,e.clientX,e.clientY);else hideTip()});
app.addEventListener('pointerout',e=>{const it=e.target.closest&&e.target.closest('[data-drag]');if(it&&!it.contains(e.relatedTarget))hideTip()});
app.addEventListener('focusin',e=>{const it=e.target.closest&&e.target.closest('[data-drag]');if(it)showTip(it.dataset.drag,0,0,it)});
app.addEventListener('focusout',e=>{if(e.target.closest&&e.target.closest('[data-drag]'))hideTip()});

/* Ziehen und Ablegen (Maus und Touch) */
export let drag=null;
app.addEventListener('pointerdown',e=>{const it=e.target.closest('[data-drag]');if(!it||e.button>0)return;drag={from:it.dataset.drag,x:e.clientX,y:e.clientY,moved:false,el:it,g:null,over:null}});
export const clearOver=()=>{if(drag&&drag.over)drag.over.classList.remove('over','no')};
window.addEventListener('pointermove',e=>{
  if(!drag)return;
  if(!drag.moved){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;drag.moved=true;hideTip();const g=document.createElement('div');g.className='dragghost '+drag.el.className.replace('it ','');g.innerHTML=drag.el.innerHTML;document.body.appendChild(g);drag.g=g;drag.el.classList.add('lift')}
  drag.g.style.left=e.clientX+'px';drag.g.style.top=e.clientY+'px';
  const t=document.elementFromPoint(e.clientX,e.clientY),c=t&&t.closest('[data-slot]');
  if(drag.over!==c){clearOver();if(c)c.classList.add(fits(get(drag.from),c.dataset.slot)?'over':'no');drag.over=c}});
window.addEventListener('pointerup',e=>{
  if(!drag)return;const d=drag;clearOver();drag=null;if(d.g)d.g.remove();
  if(d.moved){const t=document.elementFromPoint(e.clientX,e.clientY),c=t&&t.closest('[data-slot]');if(c)move(d.from,c.dataset.slot)}
  else{U.SEL=U.SEL===d.from?null:d.from;U.CONF=null}
  save();render()});
window.addEventListener('pointercancel',()=>{if(!drag)return;clearOver();if(drag.g)drag.g.remove();drag=null;render()});
