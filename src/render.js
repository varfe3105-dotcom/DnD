import { $, esc } from './util.js';
import { S, U } from './state.js';
import { vMain } from './views/sheet.js';
import { vInv } from './views/inventory.js';
import { vWiki } from './views/wiki.js';
import { vSetup } from './views/setup.js';
import { vLU } from './views/levelup.js';
import { hideTip } from './tooltip.js';
import { CLASSES } from './catalog.js';

export function vHead(){
  const line=[S.subrace||S.race,S.klass,S.sub].filter(Boolean).join(' · ');
  return `<header class="hd"><label class="por" for="img-in" title="Porträt ändern">${S.img?`<img src="${S.img}" alt="Porträt von ${esc(S.name)}">`:`<span aria-hidden="true">${esc((S.name||'?').trim()[0]||'?')}</span>`}</label><input type="file" id="img-in" accept="image/*" hidden>
  <div class="who"><h1>${esc(S.name)}</h1><p>${esc(line||'Volk und Klasse unter „Einrichten“ wählen')}</p>${S.info?`<p class="sub2">${esc(S.info)}</p>`:''}</div>
  ${S.level?`<div class="seal" title="Charakterstufe"><small>STUFE</small><b>${S.level}</b></div>`:''}
  <div class="hacts"><button class="btn gilt" data-a="lu">${S.level?(S.level>=20?'Stufe 20 erreicht':'Stufenaufstieg'):'Auf Stufe 1 bauen'}</button><div class="rests"><button class="btn ghost" data-a="rest" data-r="short">Kurze Rast</button><button class="btn ghost" data-a="rest" data-r="long">Lange Rast</button></div></div></header>`}
export const TABS=[['main','Karte'],['inv','Inventar'],['wiki','Wiki'],['notes','Notizen'],['setup','Einrichten']];
export const app=$('app');
export function render(){
  hideTip();
  if(!TABS.some(t=>t[0]===S.tab))S.tab='main';
  const t=S.tab,ae=document.activeElement,keep=ae&&ae.id&&app.contains(ae)?ae.id:null;
  let h=vHead();
  h+=`<div class="tabs"><nav role="tablist" aria-label="Bereiche">${TABS.map(([k,l])=>`<button role="tab" aria-selected="${t===k}" data-a="tab" data-t="${k}">${l}</button>`).join('')}</nav><div class="mini${S.hp===0?' down':''}">TP <b>${S.hp}</b>/${S.hpMax}${S.tmp?` +${S.tmp}`:''}</div></div>`;
  if(t==='main')h+=vMain();
  if(t==='inv')h+=vInv();
  if(t==='wiki')h+=vWiki();
  if(t==='notes')h+=`<h2>Notizen</h2><textarea id="notes" placeholder="Hintergrundgeschichte, NPCs, Orte, offene Fragen …" aria-label="Notizen">${esc(S.notes)}</textarea>`;
  if(t==='setup')h+=vSetup();
  h+=`<footer>Regeltexte sind Zusammenfassungen in eigenen Worten nach D&amp;D 5e (2014). Bei Unklarheit im Buch prüfen. Gespeichert wird nur in diesem Browser; unter „Einrichten“ sicherst du den Bogen als Text.</footer>`;
  if(U.LU&&CLASSES[S.klass])h+=vLU();
  document.body.style.overflow=U.LU?'hidden':'';
  app.innerHTML=h;
  if(U.LU&&U.LUfocus){U.LUfocus=false;const f=$('lu-h');if(f)f.focus()}
  else if(keep){const el=$(keep);if(el)el.focus({preventScroll:true})}}
