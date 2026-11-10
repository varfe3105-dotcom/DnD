import { $, esc } from './util.js';
import { get, slotLabel, slotName, atk } from './helpers.js';

export const tip=$('tip');
export function hideTip(){tip.hidden=true}
export function showTip(r,x,y,el){
  const it=get(r);if(!it){hideTip();return}
  const a=atk(it),tags=[r.startsWith('eq')?'Ausgerüstet: '+slotLabel(r):'Rucksack',it.slot?'Platz: '+slotName(it.slot):'',it.cons?'Verbrauchbar':'',it.att?(it.tuned?'Eingestimmt':'Braucht Einstimmung'):it.magic?'Magisch':''].filter(Boolean).join(' · ');
  tip.innerHTML=`<b>${esc(it.n)}</b><span class="ttag">${esc(tags)}</span>${esc(it.p)||'<i>Keine Beschreibung.</i>'}${a?`<span class="ta">Treffer ${a.hit} · Schaden ${a.dmg} ${a.type}</span>`:''}<span class="tq">Anzahl ${it.q} · Klicken für Aktionen</span>`;
  tip.hidden=false;
  if(el){const b=el.getBoundingClientRect();x=b.right;y=b.top}
  const w=tip.offsetWidth,h=tip.offsetHeight;
  let L=x+16,T=y+16;if(L+w>innerWidth-8)L=x-w-12;if(T+h>innerHeight-8)T=Math.max(8,y-h-12);
  tip.style.left=Math.max(8,L)+'px';tip.style.top=T+'px'}
