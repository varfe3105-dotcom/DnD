import { $, esc } from '../util.js';
import { icon, iconOpts, tok, itTone } from '../icons.js';
import { COINS, EQ, SLOTS } from '../constants.js';
import { S, U } from '../state.js';
import { numIn, get, refs, slotLabel } from '../helpers.js';
import { CAT } from '../catalog.js';

export function cell(r,label,area){
  const it=get(r),k=r.split(':')[1];
  return `<div class="cell${label?' eqc':''}${U.SEL===r?' sel':''}" data-slot="${r}"${area?` style="grid-area:${area}"`:''}>${label?`<small>${label}</small>`:''}${it?`<div class="it tok t-${itTone(it)}" data-drag="${r}" tabindex="0" role="button" aria-label="${esc(it.n)}${it.q>1?', '+it.q+' Stück':''}">${icon(it.ic)}${it.q>1?`<b class="q">${it.q}</b>`:''}${it.tuned?'<i class="t"></i>':''}</div>`:(label?`<span class="ph">${icon((EQ.find(e=>e[0]===k)||[])[2])}</span>`:'')}</div>`}
export function vSel(){
  const it=U.SEL&&get(U.SEL);if(!it)return '';
  const eqd=U.SEL.startsWith('eq');
  return `<h2>${esc(it.n)}</h2><div class="card selp">${tok(it.ic,itTone(it))}<div><p>${esc(it.p)||'<i>Keine Beschreibung.</i>'}</p><p class="lbl">${eqd?'Ausgerüstet: '+slotLabel(U.SEL):'Im Rucksack'}${it.att?' · braucht Einstimmung':''}</p></div>
  <div class="acts"><div class="qty"><button data-a="qty" data-d="-1" aria-label="Weniger">−</button><span>${it.q}</span><button data-a="qty" data-d="1" aria-label="Mehr">+</button></div>
  ${it.cons?`<button class="btn sm solid" data-a="use" data-r="${U.SEL}">Benutzen</button>`:''}
  ${eqd?`<button class="btn sm" data-a="unequip">In den Rucksack</button>`:(it.slot?`<button class="btn sm" data-a="equip">Ausrüsten</button>`:'')}
  ${it.att?`<button class="btn sm${it.tuned?' solid':''}" data-a="tune">${it.tuned?'Eingestimmt':'Einstimmen'}</button>`:''}
  <select id="sel-slot" data-p="${U.SEL.replace(':','.')}.slot" aria-label="Ausrüstungsplatz">${SLOTS.map(([k,l])=>`<option value="${k}"${k===it.slot?' selected':''}>${l}</option>`).join('')}</select>
  <button class="btn sm ${U.CONF==='rm'?'warn':'bad'}" data-a="rm">${U.CONF==='rm'?'Wirklich entfernen?':'Entfernen'}</button>
  <button class="btn sm" data-a="unsel">Schließen</button></div></div>`}
export function catSelect(id,kinds){
  const by={};CAT.filter(e=>kinds.includes(e.k)).forEach(e=>{(by[e.c]=by[e.c]||[]).push(e)});
  return `<select id="${id}" aria-label="Aus Katalog wählen"><option value="">Aus Katalog wählen …</option>${Object.keys(by).map(c=>`<optgroup label="${esc(c)}">${by[c].map(e=>`<option value="${esc(e.key)}">${esc(e.n)}</option>`).join('')}</optgroup>`).join('')}</select>`}
export function vInv(){
  const tuned=refs().filter(r=>get(r).tuned).length,n=Math.ceil(S.bag.length/6)*6;
  while(S.bag.length<n)S.bag.push(null);
  return `<h2>Geld</h2><div class="card"><div class="coins">${COINS.map(([c,l])=>`<div class="coin"><small class="lbl">${l}</small><div class="qty"><button data-a="gold" data-c="${c}" data-d="-1" aria-label="${l} weniger">−</button>${numIn('gold.'+c,S.gold[c],l)}<button data-a="gold" data-c="${c}" data-d="1" aria-label="${l} mehr">+</button></div></div>`).join('')}</div></div>
  <div class="invg"><div><h2>Ausrüstung<em>Einstimmung ${tuned}/3</em></h2><div class="doll">${EQ.map(([k,l])=>cell('eq:'+k,l,k)).join('')}</div></div>
  <div><h2>Rucksack</h2><div class="bag">${S.bag.map((_,i)=>cell('bag:'+i)).join('')}</div><p class="note">Maus darüber zeigt die Eigenschaften. Ziehen verschiebt, rüstet aus oder stapelt. Am Handy: antippen, dann ein freies Feld antippen.</p></div></div>
  ${vSel()}
  <h2>Gefunden oder gekauft</h2><div class="card"><div class="add">${catSelect('inv-sel',['potion','magic','item'])}<input type="number" class="n" id="inv-q" min="1" placeholder="Anzahl" aria-label="Anzahl"><button class="btn solid" data-a="addinv">Ins Inventar</button></div><p class="hint" id="inv-sel-h"></p>
  <details><summary>Eigenen Gegenstand anlegen (z. B. von der Spielleitung)</summary><div class="add"><input type="text" id="own-n" placeholder="Name"><select id="own-ic" aria-label="Symbol">${iconOpts('box')}</select><select id="own-slot" aria-label="Ausrüstungsplatz">${SLOTS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></div><div class="add"><input type="text" id="own-p" class="wide" placeholder="Was macht es? (Regeln, Schaden, Wirkung)"></div><div class="add"><label class="ck"><input type="checkbox" id="own-c"> Verbrauchbar</label><label class="ck"><input type="checkbox" id="own-a"> Magisch, braucht Einstimmung</label><input type="number" class="n" id="own-q" min="1" value="1" aria-label="Anzahl"><button class="btn solid" data-a="addown">Anlegen</button></div></details></div>`}
