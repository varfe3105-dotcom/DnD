import { sg, $, esc, mod } from './util.js';
import { CLN, SK, EQ, SLOTS } from './constants.js';
import { S, toast } from './state.js';
import { rest } from './game.js';
import { RACES } from './catalog.js';

export const skv=k=>{const s=SK.find(x=>x[0]===k);return mod(S.abil[s[1]])+S.prof*(S.skills[k]||0)};
export const pips=(max,used,attr)=>Array.from({length:max},(_,j)=>`<button class="pip ${j<max-used?'on':''}" ${attr} data-j="${j}" aria-label="${j<max-used?'Verfügbar, als verbraucht markieren':'Verbraucht, zurücksetzen'}"></button>`).join('');
export const fid=p=>'f-'+p.replace(/\./g,'-');
export const numIn=(p,v,l,min=0,max,step)=>`<input type="number" class="n" id="${fid(p)}" data-p="${p}" data-t="n" value="${v}" min="${min}"${max!=null?` max="${max}"`:''}${step?` step="${step}"`:''} inputmode="decimal" aria-label="${esc(l)}">`;
export const txtIn=(p,v,l,ph,extra='')=>`<input type="text" id="${fid(p)}" data-p="${p}" value="${esc(v)}" aria-label="${esc(l)}"${ph?` placeholder="${esc(ph)}"`:''} ${extra}>`;
export const classOpts=(sel,first)=>`<option value="">${first}</option>`+Object.entries(CLN).map(([k,v])=>`<option value="${k}"${k===sel?' selected':''}>${v}</option>`).join('');
export const get=r=>{const [a,b]=r.split(':');return a==='bag'?S.bag[+b]||null:S.eq[b]||null};
export const set=(r,v)=>{const [a,b]=r.split(':');if(a==='bag')S.bag[+b]=v||null;else if(v)S.eq[b]=v;else delete S.eq[b]};
export const refs=()=>[...EQ.map(e=>'eq:'+e[0]),...S.bag.map((_,i)=>'bag:'+i)].filter(r=>get(r));
export const fits=(it,r)=>{if(!it)return false;if(r.startsWith('bag'))return true;const base=r.split(':')[1].replace(/\d$/,'');const s=it.slot;if(!s)return false;if(s==='hand')return base==='main'||base==='off';return s===base};
export const slotLabel=r=>r.startsWith('bag')?'Rucksack':(EQ.find(e=>'eq:'+e[0]===r)||[])[1];
export const slotName=s=>(SLOTS.find(x=>x[0]===s)||['',''])[1];
export function atk(it){
  const m=it.p.match(/(\d+W\d+|\b1\b) (Hieb|Stich|Wucht)/);if(!m)return null;
  const st=mod(S.abil.str),dx=mod(S.abil.dex);
  const am=/Munition/.test(it.p)?dx:/Finesse/.test(it.p)?Math.max(st,dx):st;
  const plus=+((it.n.match(/\+(\d)/)||[])[1]||0),dm=am+plus;
  const v=it.p.match(/Vielseitig \((\d+W\d+)\)/);
  return {hit:sg(am+S.prof+plus),dmg:m[1]+(dm?sg(dm):''),type:m[2],vers:v?v[1]+(dm?sg(dm):''):''}}
export function raceTraits(){const R=RACES[S.race];if(!R)return [];const sb=R.subs[S.subrace];return [...R.tr,...(sb?sb.tr:[])].map(([n,p])=>({n,p,src:S.subrace||S.race}))}
export function applyRace(){
  const R=RACES[S.race];if(!R)return;const sb=R.subs[S.subrace];
  S.speed=(sb&&sb.sp)||R.sp;
  const add=(n,max,rest,p,ic)=>{if(!S.res.some(r=>r.n===n))S.res.push({n,ic,max,used:0,rest,p})};
  if(S.race==='Dragonborn')add('Breath Weapon',1,'short','Odemwaffe deines Volkes','flame');
  if(S.race==='Half-Orc')add('Relentless Endurance',1,'long','Bei 0 TP stattdessen 1 TP','heart');
  toast(`Volksbonus: ${(sb?sb.asi+', ':'')+R.asi}. Diese Boni bitte in die Attributswerte einrechnen.`)}
export function resFor(k,l){
  const o=[],cha=mod(S.abil.cha),R=(n,max,rest,p,ic)=>o.push({n,max,rest,p,ic});
  switch(k){
    case 'Barbarian':R('Rage',l>=20?99:l>=17?6:l>=12?5:l>=6?4:l>=3?3:2,'long',l>=20?`unbegrenzt · Bonusschaden +4`:`Bonusschaden +${l>=16?4:l>=9?3:2}`,'flame');break;
    case 'Bard':R('Bardic Inspiration',Math.max(1,cha),l>=5?'short':'long',`Inspirationswürfel W${l>=15?12:l>=10?10:l>=5?8:6}`,'music');break;
    case 'Cleric':if(l>=2)R('Channel Divinity',l>=18?3:l>=6?2:1,'short','Turn Undead oder Effekt deiner Domäne','star');break;
    case 'Druid':if(l>=2)R('Wild Shape',l>=20?99:2,'short',`Tiergestalt bis HG ${l>=8?'1':l>=4?'1/2':'1/4'}`,'leaf');break;
    case 'Fighter':R('Second Wind',1,'short',`Bonusaktion: 1W10+${l} TP heilen`,'heart');if(l>=2)R('Action Surge',l>=17?2:1,'short','Eine zusätzliche Aktion','bolt');if(l>=9)R('Indomitable',l>=17?3:l>=13?2:1,'long','Misslungenen Rettungswurf wiederholen','shield');break;
    case 'Monk':if(l>=2)R('Ki',l,'short',`Kampfwürfel W${l>=17?10:l>=11?8:l>=5?6:4}`,'swirl');break;
    case 'Paladin':R('Divine Sense',1+Math.max(0,cha),'long','Himmlische, Unholde und Untote spüren','eye');R('Lay on Hands',5*l,'long','Heilpool in TP','heart');if(l>=3)R('Channel Divinity',1,'short','Effekt deines Eides','star');break;
    case 'Rogue':if(l>=20)R('Stroke of Luck',1,'short','Fehlschlag wird Treffer','star');break;
    case 'Sorcerer':if(l>=2)R('Sorcery Points',l,'long','Font of Magic','gem');break;
    case 'Warlock':if(l>=11)R('Mystic Arcanum',l>=17?4:l>=15?3:l>=13?2:1,'long','Je ein hoher Zauber ohne Platz','gem');if(l>=20)R('Eldritch Master',1,'long','Alle Paktplätze zurück','eye');break;
    case 'Wizard':R('Arcane Recovery',1,'long',`Bei kurzer Rast Plätze bis Gesamtgrad ${Math.ceil(l/2)} zurück`,'book');break;
  }
  return o}
