import { $, esc, fmtM } from '../util.js';
import { tok, itTone } from '../icons.js';
import { CLN, AB, REST } from '../constants.js';
import { S, U } from '../state.js';
import { classOpts, get, refs, raceTraits } from '../helpers.js';
import { CAT, BYN, CLASSES, RACES, COND } from '../catalog.js';

export const WFS=[['all','Alle'],['mine','Mein Bogen'],['spell','Zauber'],['class','Klassen'],['race','Völker'],['potion','Tränke'],['magic','Magische Gegenstände'],['item','Ausrüstung'],['cond','Zustände'],['rule','Regeln']];
export function myEntries(){
  return [...S.spells.map(s=>Object.assign({k:'spell',mine:1,c:s.lvl?'Grad '+s.lvl:'Cantrips'},s)),
    ...refs().map(r=>{const it=get(r);return {k:'item',mine:1,n:it.n,ic:it.ic,tone:itTone(it),p:it.p,c:r.startsWith('eq')?'Ausgerüstet':'Rucksack'}}),
    ...S.res.map(r=>({k:'res',mine:1,n:r.n,ic:r.ic,p:r.p,c:'Klassenfähigkeit · '+(REST[r.rest]||'')})),
    ...[...raceTraits(),...S.feats].map(f=>({k:'feat',mine:1,n:f.n,ic:'star',p:f.p,c:'Merkmal · '+f.src})),
    ...COND.filter(c=>S.cond[c[0]]).map(c=>BYN['cond:'+c[0]])].map((e,i)=>Object.assign({},e,{key:'my:'+i+':'+e.n}))}
export function wList(){
  let L2=U.WF==='mine'?myEntries():CAT.filter(e=>U.WF==='all'||e.k===U.WF);
  if(U.WC)L2=L2.filter(e=>e.k!=='spell'||(e.cls||'').includes(U.WC));
  const q=U.WQ.trim().toLowerCase();
  if(q)L2=L2.filter(e=>[e.n,e.p,e.eff,e.de,e.school,e.c,e.hay].join(' ').toLowerCase().includes(q));
  return L2}
export const wSub=e=>e.k==='spell'?`${e.lvl?'Grad '+e.lvl:'Cantrip'}${e.school?' · '+e.school:''}${e.conc?' · Konz.':''}${e.ritual?' · Ritual':''}`:e.k==='cond'?e.de:e.c+(e.att?' · Einstimmung':'');
export function wDetail(e,inline){
  if(!e)return '<p class="empty">Links einen Eintrag wählen.</p>';
  const known=new Set(S.spells.map(s=>s.n));
  let btn='';
  if(!e.mine&&e.k==='spell')btn=known.has(e.n)?'<button class="btn sm" disabled>Bekannt</button>':`<button class="btn sm solid" data-a="wadd" data-key="${esc(e.key)}">Zu meinen Zaubern</button>`;
  if(!e.mine&&['potion','magic','item'].includes(e.k))btn=`<button class="btn sm solid" data-a="wadd" data-key="${esc(e.key)}">Ins Inventar</button>`;
  let body='';
  if(e.k==='spell')body=`${e.time||e.range||e.dur?`<dl class="sm"><div><dt>Zeitaufwand</dt><dd>${esc(e.time)}</dd></div><div><dt>Reichweite</dt><dd>${esc(e.range)}</dd></div><div><dt>Dauer</dt><dd>${esc(e.dur)}</dd></div></dl>`:''}<p>${esc(e.eff)}</p>${e.cls?`<p class="cls">Klassen: ${e.cls.split('').map(c=>CLN[c]).join(', ')}</p>`:''}<p class="src">${e.src==='own'?'Eigener Eintrag.':'Zusammenfassung in eigenen Worten, bei Unklarheit im Buch prüfen.'}</p>`;
  else if(e.k==='class'){const C=CLASSES[e.n];body=`<dl class="sm"><div><dt>Trefferwürfel</dt><dd>W${C.hd}</dd></div><div><dt>Rettungswürfe</dt><dd>${C.sv.map(k=>AB.find(a=>a[0]===k)[1]).join(', ')}</dd></div><div><dt>Zaubern</dt><dd>${{full:'Vollzauberer',half:'Halbzauberer',pact:'Paktmagie','':'kein Zaubern'}[C.cast]}</dd></div></dl><p><b>${C.subN}</b> ab Stufe ${C.subL}: ${C.subs.join(', ')}.</p><div class="lvl">${Object.entries(C.f).map(([l,fs])=>`<h4>Stufe ${l}</h4>${fs.map(([n,p])=>`<p><b>${esc(n)}.</b> ${esc(p)}</p>`).join('')}`).join('')}<p class="cls">Talent oder Attributserhöhung auf Stufe ${C.asi.join(', ')}. Unterklassen-Merkmale auf Stufe ${C.sl.join(', ')}.</p></div><p class="src">Zusammenfassung in eigenen Worten, bei Unklarheit im Buch prüfen.</p>`}
  else if(e.k==='race'){const R=RACES[e.n];body=`<dl class="sm"><div><dt>Attribute</dt><dd>${R.asi}</dd></div><div><dt>Tempo</dt><dd>${fmtM(R.sp)} m</dd></div><div><dt>Untervölker</dt><dd>${Object.keys(R.subs).length||'keine'}</dd></div></dl><div class="lvl">${R.tr.map(([n,p])=>`<p><b>${esc(n)}.</b> ${esc(p)}</p>`).join('')}${Object.entries(R.subs).map(([sn,sb])=>`<h4>${sn}</h4><p class="cls">${sb.asi}${sb.sp?' · Tempo '+fmtM(sb.sp)+' m':''}</p>${sb.tr.map(([n,p])=>`<p><b>${esc(n)}.</b> ${esc(p)}</p>`).join('')}`).join('')}</div><p class="src">Zusammenfassung in eigenen Worten, bei Unklarheit im Buch prüfen.</p>`}
  else body=`<p>${esc(e.p)}</p>`;
  return `<article class="wd${inline?' inl':' pane'}"><div class="wdh">${tok(e.ic,e.tone||(e.magic?'arcane':undefined))}<div><h3>${esc(e.n)}</h3><small>${esc(wSub(e))}</small></div></div>${btn?`<div class="add" style="margin-top:0">${btn}</div>`:''}${body}</article>`}
export function wikiBody(){
  const L2=wList();
  if(!L2.length)return `<p class="empty">Nichts gefunden.${U.WF==='mine'?' Auf deinem Bogen steht noch nichts Passendes.':' Fehlt etwas aus dem Buch, leg es als eigenen Eintrag an.'}</p>`;
  const max=80,shown=L2.slice(0,max);
  const sel=L2.find(e=>e.key===U.WSEL);
  const cur=sel||shown[0];
  return `<div class="wiki"><div class="wl" role="list">${shown.map(e=>`<button class="wli" role="listitem" data-a="wsel" data-key="${esc(e.key)}" aria-current="${e===cur}">${tok(e.ic,e.tone||(e.magic?'arcane':undefined))}<span><b>${esc(e.n)}</b><small>${esc(wSub(e))}</small></span></button>${sel&&e===sel?wDetail(e,true):''}`).join('')}${L2.length>max?`<p class="more" style="padding:0 10px">${L2.length-max} weitere. Suche eingrenzen.</p>`:''}</div>${wDetail(cur,false)}</div>`}
export function vWiki(){
  return `<h2>Wiki</h2><div class="wtools"><input type="search" id="wq" placeholder="Suchen: Fireball, Heilung, Grappled, Rage, Elf …" value="${esc(U.WQ)}" aria-label="Wiki durchsuchen"><select id="wc" aria-label="Zauber nach Klasse filtern">${classOpts(U.WC,'Zauber aller Klassen')}</select></div><div class="chips">${WFS.map(([k,l])=>`<button class="chip${U.WF===k?' on':''}" data-a="wf" data-f="${k}" aria-pressed="${U.WF===k}">${l}</button>`).join('')}</div><div id="wres">${wikiBody()}</div>`}
