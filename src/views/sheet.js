import { sg, $, esc, clamp, mod, fmtM } from '../util.js';
import { tok, itTone } from '../icons.js';
import { CLN, AB, ABS, SK, REST, CLIC } from '../constants.js';
import { S, U } from '../state.js';
import { skv, pips, numIn, get, refs, atk, raceTraits } from '../helpers.js';
import { COND, EXH } from '../catalog.js';

export function vAbil(edit){
  return `<div class="abs">${AB.map(([k,n])=>{const m=mod(S.abil[k]),sv=m+(S.saves[k]?S.prof:0);
    return `<div class="abw"><div class="ab"><div class="abi"><small>${n}</small><b>${sg(m)}</b></div></div><div class="abv">${edit?numIn('abil.'+k,S.abil[k],n,1,30):S.abil[k]}</div>${edit?`<button class="tg${S.saves[k]?' on':''}" data-a="tsave" data-k="${k}" aria-pressed="${!!S.saves[k]}">RW geübt</button>`:`<div class="sv${S.saves[k]?' p':''}" title="Rettungswurf"><i></i><span class="svl">Rettungswurf</span><span class="svs">RW</span> ${sg(sv)}</div>`}</div>`}).join('')}</div>`}
export function vHP(){
  const pct=S.hpMax?clamp(S.hp/S.hpMax*100,0,100):0,tp=S.hpMax?clamp(S.tmp/S.hpMax*100,0,100-pct):0;
  return `<h2>Lebenspunkte</h2><div class="card">
  <div class="hpt"><button class="sq" data-a="hp" data-d="-1" aria-label="Einen TP abziehen">−</button><div class="hpn${S.hp===0?' down':''}"><b>${S.hp}</b><small>/ ${S.hpMax}</small>${S.tmp?`<span class="tmp">+${S.tmp} temporäre TP</span>`:''}</div><button class="sq" data-a="hp" data-d="1" aria-label="Einen TP dazu">+</button></div>
  <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i><u style="width:${tp}%"></u></div>
  <div class="hpin"><input type="number" id="hpv" min="1" inputmode="numeric" placeholder="Betrag" aria-label="Betrag für Schaden, Heilung oder temporäre TP"><button class="btn bad" data-a="dmg">Schaden</button><button class="btn good" data-a="heal">Heilen</button><button class="btn" data-a="temp">Temp-TP</button></div>
  ${S.hp===0?vDeath():''}
  <div class="row" style="margin-top:8px"><div class="ic">${tok('dice')}</div><div class="nm">Trefferwürfel<small>${S.hd.max-S.hd.used} von ${S.hd.max} übrig · je ${S.hd.die} ${sg(mod(S.abil.con))} bei kurzer Rast</small></div><div class="pips">${pips(S.hd.max,S.hd.used,'data-a="pip" data-k="hd"')}</div></div></div>`}
export function vDeath(){
  const r=(t,l)=>`<div class="dsr${t==='f'?' f':''}"><span>${l}</span>${[0,1,2].map(j=>`<button class="dot${j<S.death[t]?' on':''}" data-a="ds" data-t="${t}" data-j="${j}" aria-label="${l} ${j+1}"></button>`).join('')}</div>`;
  return `<div class="death"><div><b>Todesrettungswürfe</b><br><span>W20 zu Beginn deines Zuges: ab 10 Erfolg. Eine 1 zählt doppelt, eine 20 bringt 1 TP.</span></div>${r('s','Erfolge')}${r('f','Fehlschläge')}</div>`}
export function vCond(){
  const act=COND.filter(c=>S.cond[c[0]]);
  return `<h2>Zustände${act.length?`<em>${act.length} aktiv</em>`:''}</h2><div class="card"><div class="chips">${COND.map(([n,de])=>`<button class="chip${S.cond[n]?' on':''}" data-a="cond" data-c="${n}" aria-pressed="${!!S.cond[n]}" title="${de}">${n}</button>`).join('')}</div>${act.map(([n,de,ic,tx])=>`<div class="row"><div class="ic">${tok(ic)}</div><div class="nm">${n} <span class="lbl">${de}</span><small>${tx}</small></div></div>`).join('')}<div class="row"><div class="ic">${tok('skull')}</div><div class="nm">Exhaustion · Stufe ${S.exh}<small>${S.exh?EXH.slice(0,S.exh).join(' · '):'Keine. Die Stufen wirken zusammen.'}</small></div><div class="qty"><button data-a="exh" data-d="-1" aria-label="Exhaustion senken">−</button><button data-a="exh" data-d="1" aria-label="Exhaustion erhöhen">+</button></div></div></div>`}
export function vAtk(){
  const rows=['main','off'].map(k=>S.eq[k]).filter(Boolean).map(it=>{const a=atk(it);if(!a)return '';
    return `<div class="row"><div class="ic">${tok(it.ic,itTone(it))}</div><div class="nm">${esc(it.n)}<small>${esc(it.p)}</small></div><div class="atk"><b>${a.hit}</b><small>Treffer</small></div><div class="atk"><b>${a.dmg}</b><small>${a.type}${a.vers?` · 2H ${a.vers}`:''}</small></div></div>`}).join('');
  return `<h2>Angriffe</h2><div class="card">${rows||'<div class="empty">Keine Waffe in der Hand. Zieh im Inventar eine Waffe auf Haupt- oder Nebenhand.</div>'}${rows?'<p class="note">Treffer = Attributsmodifikator + Übungsbonus (Übung mit der Waffe angenommen).</p>':''}</div>`}
export function vQuick(){
  const r=refs().filter(x=>get(x).cons);if(!r.length)return '';
  return `<h2>Schnellzugriff</h2><div class="card">${r.map(x=>{const it=get(x);return `<div class="row"><div class="ic">${tok(it.ic,itTone(it))}</div><div class="nm">${esc(it.n)} <span class="lbl">× ${it.q}</span><small>${esc(it.p)}</small></div><button class="btn sm" data-a="use" data-r="${x}">Benutzen</button></div>`}).join('')}</div>`}
export function vRes(){
  if(!S.res.length)return '';
  return `<h2>Klassenfähigkeiten</h2><div class="card">${S.res.map((r,i)=>`<div class="row"><div class="ic">${tok(r.ic)}</div><div class="nm">${esc(r.n)}<small>${REST[r.rest]||REST.long}${r.p?' · '+esc(r.p):''}</small></div>${r.max>12?`<div class="qty"><button data-a="resd" data-i="${i}" data-d="1" aria-label="Eins verbrauchen">−</button><span>${r.max>=99?'∞':(r.max-r.used)+' / '+r.max}</span><button data-a="resd" data-i="${i}" data-d="-1" aria-label="Eins zurück">+</button></div>`:`<div class="pips">${pips(r.max,r.used,`data-a="pip" data-k="res" data-i="${i}"`)}</div>`}</div>`).join('')}</div>`}
export function vFeats(){
  const all=[...raceTraits(),...S.feats];if(!all.length)return '';
  return `<h2>Merkmale<em>${all.length}</em></h2><div class="card">${all.map(f=>`<details class="feat"><summary>${tok(f.src==='Talent'?'star':S.race&&f.src===(S.subrace||S.race)?'mask':(CLIC[S.klass]||'star'))}<span>${esc(f.n)}</span><span class="lbl">${esc(f.src)}${f.lvl?' · Stufe '+f.lvl:''}</span></summary><p>${esc(f.p)}</p></details>`).join('')}</div>`}
export function spMeta(s){return [s.time,s.range,s.dur].filter(Boolean).map(esc).join(' · ')}
export function vSpells(){
  const lv=new Set(S.spells.map(s=>s.lvl));S.slots.forEach((s,i)=>{if(s.max)lv.add(i+1)});
  if(!lv.size&&!S.pact.max)return `<h2>Zauber</h2><div class="card"><div class="empty">Keine Zauber eingetragen. Im Wiki oder unter „Einrichten“ fügst du welche hinzu.</div></div>`;
  let h='';
  if(S.pact.max)h+=`<div class="lvh"><b>Paktmagie</b><small>Plätze auf Grad ${S.pact.lvl} · zurück nach kurzer Rast</small><div class="pips">${pips(S.pact.max,S.pact.used,'data-a="pip" data-k="pact"')}</div></div>`;
  [...lv].sort((a,b)=>a-b).forEach(l=>{
    const sl=l?S.slots[l-1]:null;
    h+=`<div class="lvh"><b>${l?'Grad '+l:'Cantrips'}</b><small>${l?(sl.max?`${sl.max-sl.used} von ${sl.max} Plätzen frei`:'keine eigenen Plätze'):'beliebig oft'}</small>${sl&&sl.max?`<div class="pips">${pips(sl.max,sl.used,`data-a="pip" data-k="slots" data-i="${l-1}"`)}</div>`:''}</div>`;
    S.spells.map((s,i)=>[s,i]).filter(x=>x[0].lvl===l).sort((a,b)=>a[0].n.localeCompare(b[0].n)).forEach(([s,i])=>{
      const o=U.OPEN[i];
      h+=`<div class="sp${S.conc===s.n?' cc':''}"><button class="sph" data-a="spopen" data-i="${i}" aria-expanded="${!!o}">${tok(s.ic)}<span class="nm">${esc(s.n)}<small>${spMeta(s)||'Details antippen'}</small></span></button><button class="btn sm" data-a="cast" data-i="${i}">${S.conc===s.n?'Aktiv':'Wirken'}</button>${o?`<div class="spb"><p>${esc(s.eff)}</p>${s.school?`<p class="cls">${esc(s.school)}${s.cls?' · '+s.cls.split('').map(c=>CLN[c]).join(', '):''}</p>`:''}<p class="src">${s.src==='own'?'Eigener Eintrag.':'Zusammenfassung in eigenen Worten, bei Unklarheit im Buch prüfen.'}</p></div>`:''}</div>`})});
  return `<h2>Zauber</h2><div class="card">${h}<p class="note">„Wirken“ kreuzt den niedrigsten passenden Platz an (Paktmagie zuerst) und setzt bei Konzentrationszaubern die Konzentration.</p></div>`}
export function vSkills(){
  return `<h2>Fertigkeiten</h2><div class="card"><div class="skl">${SK.map(([k,a,de])=>{const p=S.skills[k]||0;return `<div class="sk"><i class="m m${p}" title="${['nicht geübt','geübt','Expertise'][p]}"></i><span>${k}<small>${de} · ${ABS[a]}</small></span><b>${sg(skv(k))}</b></div>`}).join('')}</div></div>`}
export function vMain(){
  const a=S.abil,st=(l,v)=>`<div class="st"><small>${l}</small><b>${v}</b></div>`;
  let h='';
  if(S.conc)h+=`<div class="conc"><div><small>Konzentration</small><b>${esc(S.conc)}</b><span>Bei Schaden: KON-Rettungswurf, SG 10 oder halber Schaden.</span></div><button class="btn" data-a="concend">Beenden</button></div>`;
  h+=`<div class="stats">${st('Rüstungsklasse',S.ac)}${st('Initiative',sg(mod(a.dex)))}${st('Tempo',fmtM(S.speed)+' m')}${st('Übungsbonus',sg(S.prof))}${st('Passive Wahrnehmung',10+skv('Perception'))}</div>`;
  h+=`<div class="sheet"><aside>${vAbil(false)}</aside><div class="col">${vHP()}${vCond()}${vAtk()}${vQuick()}${vRes()}${vSpells()}${vFeats()}${vSkills()}</div></div>`;
  return h}
