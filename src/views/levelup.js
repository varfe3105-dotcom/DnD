import { sg, $, esc, clamp, mod } from '../util.js';
import { tok } from '../icons.js';
import { AB, CLIC } from '../constants.js';
import { pb, slotsFor, pactFor, cantripsFor, knownFor } from '../tables.js';
import { S, U, toast } from '../state.js';
import { resFor } from '../helpers.js';
import { rest } from '../game.js';
import { CLASSES } from '../catalog.js';

export function openLU(){
  if(!CLASSES[S.klass]){S.tab='setup';toast('Erst unter „Einrichten“ eine Klasse wählen.');return}
  const to=(S.level||0)+1;if(to>20){toast('Stufe 20 ist das Maximum.');return}
  U.LU={to,hp:'avg',roll:'',asi:'two',a1:'',a2:'',feat:'',sub:S.sub||''};U.LUfocus=true}
export function luData(){
  const C=CLASSES[S.klass],to=U.LU.to,con=mod(S.abil.con),dw=S.subrace==='Hill Dwarf'?1:0,avg=C.hd/2+1;
  const base=to===1?C.hd:(U.LU.hp==='roll'?clamp(Math.floor(+U.LU.roll)||0,1,C.hd):avg);
  const gain=Math.max(1,base+con)+dw;
  const feats=[...(C.f[to]||[])];
  if(to===C.subL)feats.push([C.subN,`Du wählst deine Unterklasse (${C.subs.join(', ')}). Ihre Merkmale stehen im Buch; trag sie unter „Einrichten“ bei den Merkmalen ein.`]);
  else if(C.sl.includes(to))feats.push([(S.sub||C.subN)+': neues Merkmal',`Auf Stufe ${to} bekommst du ein Merkmal deiner Unterklasse. Im Buch nachlesen und den Text unter „Einrichten“ ergänzen.`]);
  const extra=[];
  if(S.klass==='Rogue')extra.push(`Sneak Attack: ${Math.ceil(to/2)}W6`);
  if(S.klass==='Barbarian'&&to===20)extra.push('STR und KON +4 (Maximum 24)');
  return {C,to,gain,base,avg,con,dw,feats,extra,asi:C.asi.includes(to),profOld:S.level?S.prof:pb(0),profNew:pb(to),slotsOld:S.slots.map(s=>s.max),slotsNew:slotsFor(S.klass,to),pact:C.cast==='pact'?pactFor(to):null,res:resFor(S.klass,to),
    cant:[cantripsFor(S.klass,to-1),cantripsFor(S.klass,to)],known:[knownFor(S.klass,to-1),knownFor(S.klass,to)]}}
export function vLU(){
  const d=luData(),C=d.C,abOpt=sel=>`<option value="">Attribut …</option>`+AB.map(([k,n])=>`<option value="${k}"${k===sel?' selected':''}>${n} (${S.abil[k]})</option>`).join('');
  const chg=(l,a,b)=>String(a)===String(b)?`<span>${l} ${a}</span>`:`<span class="up">${l} ${a} → ${b}</span>`;
  const sl=d.slotsNew.map((n,i)=>[i+1,d.slotsOld[i],n]).filter(x=>x[1]||x[2]);
  const prepared={Cleric:'wis',Druid:'wis',Wizard:'int',Paladin:'cha'}[S.klass];
  const prepN=prepared?Math.max(1,mod(S.abil[prepared])+(S.klass==='Paladin'?Math.floor(d.to/2):d.to)):0;
  const resOld=Object.fromEntries(S.res.map(r=>[r.n,r.max]));
  return `<div class="ovl" data-a="luclose-bg"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="lu-h">
  <h3 id="lu-h" tabindex="-1">${d.to===1?'Stufe 1':'Stufe '+(d.to-1)+' → '+d.to}</h3><p class="lbl" style="margin:4px 0 0">${S.klass}${S.sub?' · '+esc(S.sub):''}${S.subrace||S.race?' · '+(S.subrace||S.race):''}</p>
  <h4>Trefferpunkte</h4>
  ${d.to===1?`<p>Stufe 1: voller Trefferwürfel (W${C.hd} = ${C.hd}) ${sg(d.con)} KON${d.dw?' +1 Hill Dwarf':''} = <span class="big">${d.gain} TP</span></p><p class="note">KON vorher unter „Einrichten“ eintragen, sie zählt hier mit. Rettungswürfe ${C.sv.map(k=>AB.find(a=>a[0]===k)[1]).join(' und ')} werden als geübt markiert.</p>`
  :`<div class="add"><select id="lu-hp" data-lu="hp" aria-label="Trefferpunkte"><option value="avg"${U.LU.hp==='avg'?' selected':''}>Durchschnitt nehmen (${d.avg})</option><option value="roll"${U.LU.hp==='roll'?' selected':''}>Selbst gewürfelt (W${C.hd})</option></select>${U.LU.hp==='roll'?`<input type="number" class="n" id="lu-roll" data-lu="roll" min="1" max="${C.hd}" value="${esc(U.LU.roll)}" placeholder="Wurf" aria-label="Gewürfelter Wert">`:''}</div><p>${d.base} ${sg(d.con)} KON${d.dw?' +1 Hill Dwarf':''} = <span class="big">+${d.gain} TP</span> <span class="lbl">(Max-TP ${S.hpMax} → ${S.hpMax+d.gain})</span></p>`}
  ${d.profNew!==d.profOld||d.to===1?`<h4>Übungsbonus</h4><div class="chg">${chg('',sg(d.profOld),sg(d.profNew))}</div>`:''}
  ${d.feats.length||d.extra.length?`<h4>Neue Merkmale</h4>${d.feats.map(([n,p])=>`<div class="row">${tok(CLIC[S.klass])}<div class="nm">${esc(n)}<small>${esc(p)}</small></div></div>`).join('')}${d.extra.map(x=>`<div class="row">${tok('star')}<div class="nm">${esc(x)}</div></div>`).join('')}`:''}
  ${d.to===C.subL?`<h4>${C.subN} wählen</h4><div class="add"><input type="text" id="lu-sub" data-lu="sub" list="lu-sub-dl" value="${esc(U.LU.sub)}" placeholder="${C.subN}" aria-label="${C.subN}"><datalist id="lu-sub-dl">${C.subs.map(s=>`<option value="${esc(s)}">`).join('')}</datalist></div>`:''}
  ${d.asi?`<h4>Attributserhöhung oder Talent</h4><div class="add"><select id="lu-asi" data-lu="asi" aria-label="Art der Erhöhung"><option value="two"${U.LU.asi==='two'?' selected':''}>+1 auf zwei Attribute</option><option value="one"${U.LU.asi==='one'?' selected':''}>+2 auf ein Attribut</option><option value="feat"${U.LU.asi==='feat'?' selected':''}>Talent statt Erhöhung</option></select>
    ${U.LU.asi==='feat'?`<input type="text" id="lu-feat" data-lu="feat" value="${esc(U.LU.feat)}" placeholder="Name des Talents, z. B. War Caster" aria-label="Talent">`:`<select id="lu-a1" data-lu="a1" aria-label="Erstes Attribut">${abOpt(U.LU.a1)}</select>${U.LU.asi==='two'?`<select id="lu-a2" data-lu="a2" aria-label="Zweites Attribut">${abOpt(U.LU.a2)}</select>`:''}`}</div><p class="note">Maximum 20. Talente stehen im Player's Handbook, Kapitel 6.</p>`:''}
  ${sl.length?`<h4>Zauberplätze</h4><div class="chg">${sl.map(([g,a,b])=>chg(`Grad ${g}:`,a,b)).join('')}</div>`:''}
  ${d.pact?`<h4>Paktmagie</h4><div class="chg">${chg('',`${S.pact.max} Plätze auf Grad ${S.pact.lvl}`,`${d.pact[0]} Plätze auf Grad ${d.pact[1]}`)}</div>`:''}
  ${d.cant[1]||d.known[1]!=null||prepared?`<h4>Zauber</h4><div class="chg">${d.cant[1]?chg('Cantrips',d.cant[0],d.cant[1]):''}${d.known[1]!=null?chg('bekannte Zauber',d.known[0]||0,d.known[1]):''}${prepared&&(S.klass!=='Paladin'||d.to>=2)?`<span>vorbereitbar: ${prepN}</span>`:''}${S.klass==='Wizard'?`<span class="up">${d.to===1?'6 Zauber im Zauberbuch':'+2 Zauber ins Zauberbuch'}</span>`:''}</div><p class="note">Neue Zauber suchst du danach im Wiki (Filter „Zauber“ und deine Klasse) und fügst sie mit einem Klick hinzu.</p>`:''}
  ${d.res.length?`<h4>Klassenfähigkeiten</h4><div class="chg">${d.res.map(r=>chg(r.n+':',resOld[r.n]==null?'neu':resOld[r.n]>=99?'∞':resOld[r.n],r.max>=99?'∞':r.max)).join('')}</div>`:''}
  <div class="dlgf"><button class="btn" data-a="luclose">Abbrechen</button><button class="btn solid" data-a="luapply">${d.to===1?'Stufe 1 übernehmen':'Aufstieg übernehmen'}</button></div></div></div>`}
export function applyLU(){
  const d=luData(),C=d.C,to=d.to;
  if(to>1&&U.LU.hp==='roll'&&!(+U.LU.roll>=1)){toast('Bitte den gewürfelten Wert eintragen oder den Durchschnitt nehmen.');return false}
  if(to===C.subL&&!U.LU.sub.trim()){toast(`Bitte eine Unterklasse (${C.subN}) wählen.`);return false}
  if(d.asi){if(U.LU.asi==='feat'){if(!U.LU.feat.trim()){toast('Bitte den Namen des Talents eintragen.');return false}}
    else if(!U.LU.a1||(U.LU.asi==='two'&&(!U.LU.a2||U.LU.a2===U.LU.a1))){toast(U.LU.asi==='two'?'Bitte zwei verschiedene Attribute wählen.':'Bitte ein Attribut wählen.');return false}}
  if(to===1){S.saves={};C.sv.forEach(k=>S.saves[k]=true);S.feats=S.feats.filter(f=>f.src!=='Klasse');S.hpMax=0;S.hp=0;S.hd.used=0}
  S.level=to;S.hpMax+=d.gain;S.hp=Math.min(S.hpMax,S.hp+d.gain);S.hd.max=to;S.hd.die='W'+C.hd;S.prof=d.profNew;S.cls=C.l;
  if(C.cast==='full'||C.cast==='half')d.slotsNew.forEach((m,i)=>{S.slots[i].max=m;S.slots[i].used=Math.min(S.slots[i].used,m)});
  if(d.pact){S.pact.max=d.pact[0];S.pact.lvl=d.pact[1];S.pact.used=Math.min(S.pact.used,S.pact.max)}
  if(to===C.subL)S.sub=U.LU.sub.trim();
  d.feats.forEach(([n,p])=>S.feats.push({n,p,lvl:to,src:'Klasse'}));
  if(d.asi){if(U.LU.asi==='feat')S.feats.push({n:U.LU.feat.trim(),p:'Talent. Wirkung im Buch nachlesen und hier ergänzen.',lvl:to,src:'Talent'});
    else{const add=(k,v)=>S.abil[k]=Math.min(20,Math.max(S.abil[k],S.abil[k]+v));if(U.LU.asi==='one')add(U.LU.a1,2);else{add(U.LU.a1,1);add(U.LU.a2,1)}}}
  if(S.klass==='Barbarian'&&to===20){S.abil.str=Math.min(24,S.abil.str+4);S.abil.con=Math.min(24,S.abil.con+4)}
  d.res.forEach(r=>{const ex=S.res.find(x=>x.n===r.n);if(ex){ex.max=r.max;ex.rest=r.rest;ex.p=r.p;ex.used=Math.min(ex.used,r.max)}else S.res.push({n:r.n,ic:r.ic,max:r.max,used:0,rest:r.rest,p:r.p})});
  U.LU=null;toast(`Stufe ${to} erreicht: +${d.gain} TP${d.feats.length?', neue Merkmale stehen auf der Karte':''}.`);return true}
