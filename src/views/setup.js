import { sg, $, esc } from '../util.js';
import { iconOpts, tok } from '../icons.js';
import { SK, REST } from '../constants.js';
import { S, U } from '../state.js';
import { skv, fid, numIn, txtIn } from '../helpers.js';
import { vAbil } from './sheet.js';
import { CAT, CLASSES, RACES } from '../catalog.js';

export function vSetup(){
  const sel=(p,opts,v,l)=>`<select id="${fid(p)}" data-p="${p}" aria-label="${l}">${opts.map(([k,t])=>`<option value="${k}"${String(k)===String(v)?' selected':''}>${t}</option>`).join('')}</select>`;
  const R=RACES[S.race],C=CLASSES[S.klass];
  let h=`<p class="note">Hier trägst du deinen Charakter ein. Gespielt wird auf der Karte, Gegenstände verwaltest du im Inventar.</p>
  <h2>Charakter</h2><div class="card"><div class="porsetup"><label class="por" for="img-in2" title="Porträt wählen">${S.img?`<img src="${S.img}" alt="">`:`<span>${esc((S.name||'?').trim()[0]||'?')}</span>`}</label><input type="file" id="img-in2" accept="image/*" hidden><div class="add" style="margin:0"><label class="btn sm" for="img-in2">Porträt wählen</label>${S.img?'<button class="btn sm bad" data-a="imgdel">Porträt entfernen</button>':''}</div></div>
  <div class="form" style="margin-top:12px">
   <label><span class="lbl">Name</span>${txtIn('name',S.name,'Name')}</label>
   <label><span class="lbl">Volk</span>${sel('race',[['','Wählen …'],...Object.keys(RACES).map(k=>[k,k])],S.race,'Volk')}</label>
   ${R&&Object.keys(R.subs).length?`<label><span class="lbl">Untervolk</span>${sel('subrace',[['','Keins'],...Object.keys(R.subs).map(k=>[k,k])],S.subrace,'Untervolk')}</label>`:''}
   <label><span class="lbl">Klasse</span>${sel('klass',[['','Wählen …'],...Object.keys(CLASSES).map(k=>[k,k])],S.klass,'Klasse')}</label>
   <label><span class="lbl">Unterklasse</span>${txtIn('sub',S.sub,'Unterklasse',C?C.subN+' (ab Stufe '+C.subL+')':'',`list="sub-dl"`)}<datalist id="sub-dl">${(C?C.subs:[]).map(s=>`<option value="${esc(s)}">`).join('')}</datalist></label>
   <label><span class="lbl">Stufe</span>${numIn('level',S.level,'Stufe',0,20)}</label>
   <label><span class="lbl">Hintergrund, Gesinnung</span>${txtIn('info',S.info,'Hintergrund und Gesinnung','z. B. Sage · Chaotic Good')}</label>
  </div>${R?`<p class="note">Volksbonus: ${(R.subs[S.subrace]?R.subs[S.subrace].asi+', ':'')+R.asi}. Bitte in die Attributswerte unten einrechnen.</p>`:''}
  <p class="note">${S.level?'Neue Stufen holst du dir oben mit „Stufenaufstieg“. Dort werden TP, Übungsbonus, Zauberplätze, Fähigkeiten und Merkmale automatisch eingetragen.':'Wähle Klasse und Attributswerte, dann oben „Auf Stufe 1 bauen“. Für einen höheren Start danach mehrmals aufsteigen.'}</p></div>
  <h2>Werte</h2><div class="card"><div class="form">
   <label><span class="lbl">Rüstungsklasse</span>${numIn('ac',S.ac,'Rüstungsklasse')}</label>
   <label><span class="lbl">Tempo (m)</span>${numIn('speed',S.speed,'Tempo in Metern',0,null,'1.5')}</label>
   <label><span class="lbl">Übungsbonus</span>${numIn('prof',S.prof,'Übungsbonus',0,6)}</label>
   <label><span class="lbl">Max-TP</span>${numIn('hpMax',S.hpMax,'Maximale Trefferpunkte',1)}</label>
   <label><span class="lbl">Trefferwürfel (Anzahl)</span>${numIn('hd.max',S.hd.max,'Anzahl Trefferwürfel',0,30)}</label>
   <label><span class="lbl">Trefferwürfel (Art)</span>${sel('hd.die',['W6','W8','W10','W12'].map(x=>[x,x]),S.hd.die,'Art der Trefferwürfel')}</label>
  </div></div>
  <h2>Attribute und Rettungswürfe</h2>${vAbil(true)}
  <h2>Fertigkeiten</h2><div class="card"><p class="note" style="margin-top:0">Antippen wechselt: nicht geübt, geübt, Expertise.</p><div class="skl">${SK.map(([k,a,de])=>{const p=S.skills[k]||0;return `<button class="sk" data-a="tskill" data-k="${k}" style="background:none;border:0;border-bottom:1px dotted var(--line);text-align:left"><i class="m m${p}"></i><span>${k}<small>${de} · ${['nicht geübt','geübt','Expertise'][p]}</small></span><b>${sg(skv(k))}</b></button>`}).join('')}</div></div>
  <h2>Merkmale und Talente</h2><div class="card">${S.feats.map((f,i)=>`<div class="edrow">${txtIn(`feats.${i}.n`,f.n,'Name')}<span class="lbl">${esc(f.src)}${f.lvl?' · Stufe '+f.lvl:''}</span><button class="del" data-a="del" data-k="feats" data-i="${i}" aria-label="${esc(f.n)} löschen">✕</button><input type="text" class="wide" id="f-feats-${i}-p" data-p="feats.${i}.p" value="${esc(f.p)}" aria-label="Beschreibung"></div>`).join('')||'<div class="empty">Kommen mit dem Stufenaufstieg. Eigene Talente oder Unterklassen-Merkmale trägst du hier ein.</div>'}
   <div class="add"><input type="text" id="feat-n" placeholder="Name, z. B. Alert"><input type="text" id="feat-p" placeholder="Was macht es?"><button class="btn solid" data-a="addfeat">Anlegen</button></div></div>
  <h2>Klassenfähigkeiten</h2><div class="card">${S.res.map((r,i)=>`<div class="edrow"><select id="f-res-${i}-ic" data-p="res.${i}.ic" aria-label="Symbol">${iconOpts(r.ic)}</select>${txtIn(`res.${i}.n`,r.n,'Name')}${numIn(`res.${i}.max`,r.max,'Anzahl',1,200)}${sel(`res.${i}.rest`,Object.entries(REST),r.rest,'Erholung')}<button class="del" data-a="del" data-k="res" data-i="${i}" aria-label="${esc(r.n)} löschen">✕</button><input type="text" class="wide" id="f-res-${i}-p" data-p="res.${i}.p" value="${esc(r.p)}" placeholder="Was macht es?" aria-label="Beschreibung"></div>`).join('')||'<div class="empty">Kommen mit dem Stufenaufstieg, z. B. Rage, Bardic Inspiration, Second Wind.</div>'}
   <div class="add"><input type="text" id="res-n" placeholder="Name"><select id="res-ic" aria-label="Symbol">${iconOpts('star')}</select><input type="number" class="n" id="res-m" min="1" placeholder="Anzahl" aria-label="Anzahl"><select id="res-r" aria-label="Erholung"><option value="long">Lange Rast</option><option value="short">Kurze Rast</option><option value="none">Ohne Erholung</option></select></div><div class="add"><input type="text" id="res-p" class="wide" placeholder="Was macht es? (Regeln)"><button class="btn solid" data-a="addres">Anlegen</button></div></div>
  <h2>Zauberplätze</h2><div class="card"><div class="slotg">${S.slots.map((s,i)=>`<label><span class="lbl">Grad ${i+1}</span>${numIn(`slots.${i}.max`,s.max,'Plätze Grad '+(i+1),0,9)}</label>`).join('')}</div>
   <div class="slotg" style="margin-top:12px"><label><span class="lbl">Paktmagie: Plätze</span>${numIn('pact.max',S.pact.max,'Paktmagie Plätze',0,4)}</label><label><span class="lbl">Paktmagie: Grad</span>${numIn('pact.lvl',S.pact.lvl,'Paktmagie Grad',1,5)}</label></div><p class="note">Paktmagie (Warlock) kommt schon bei kurzer Rast zurück.</p></div>
  <h2>Zauber</h2><div class="card">${S.spells.map((s,i)=>[s,i]).sort((a,b)=>a[0].lvl-b[0].lvl||a[0].n.localeCompare(b[0].n)).map(([s,i])=>`<div class="edrow">${tok(s.ic)}<span class="nm">${esc(s.n)}<small>${s.lvl?'Grad '+s.lvl:'Cantrip'}${s.src==='own'?' · eigener Eintrag':''}</small></span><button class="del" data-a="del" data-k="spells" data-i="${i}" aria-label="${esc(s.n)} löschen">✕</button></div>`).join('')||'<div class="empty">Noch keine Zauber.</div>'}
   <div class="add">${spSelect()}<button class="btn solid" data-a="addsp">Hinzufügen</button></div><p class="hint" id="sp-sel-h"></p>
   <details><summary>Eigenen Zauber anlegen</summary><div class="add"><input type="text" id="osp-n" placeholder="Name"><input type="number" class="n" id="osp-l" min="0" max="9" placeholder="Grad" aria-label="Grad"></div><div class="add"><input type="text" id="osp-t" placeholder="Zeit, z. B. 1 Aktion"><input type="text" id="osp-r" placeholder="Reichweite"><input type="text" id="osp-d" placeholder="Dauer"></div><div class="add"><input type="text" id="osp-e" class="wide" placeholder="Wirkung"></div><div class="add"><label class="ck"><input type="checkbox" id="osp-c"> Konzentration</label><label class="ck"><input type="checkbox" id="osp-ri"> Ritual</label><button class="btn solid" data-a="addspown">Anlegen</button></div></details></div>
  <h2>Sichern und übertragen</h2><div class="card"><p class="note" style="margin-top:0">Der Bogen liegt nur in diesem Browser. Zum Sichern oder für ein anderes Gerät: exportieren, Text kopieren und dort importieren.</p>
   <div class="add"><button class="btn" data-a="exp">Export erzeugen</button>${U.EXP?'<button class="btn solid" data-a="copy">Text kopieren</button>':''}</div>${U.EXP?`<textarea id="exp" readonly aria-label="Exportierter Charakter">${esc(U.EXP)}</textarea>`:''}
   <div class="add" style="margin-top:14px"><label class="ck">Datei laden <input type="file" id="impf" accept=".json,application/json,text/plain"></label></div>
   <textarea id="imp" placeholder="Oder exportierten Text hier einfügen …" aria-label="Import-Text" style="margin-top:8px">${esc(U.IMP)}</textarea>
   <div class="add"><button class="btn ${U.CONF==='imp'?'warn':''}" data-a="imp">${U.CONF==='imp'?'Ersetzt den aktuellen Charakter. Nochmal klicken.':'Importieren'}</button><button class="btn ${U.CONF==='reset'?'warn':'bad'}" data-a="reset">${U.CONF==='reset'?'Alles löschen? Nochmal klicken.':'Neuer, leerer Charakter'}</button></div></div>`;
  return h}
export function spSelect(){
  const by={},l=CLASSES[S.klass]?CLASSES[S.klass].l:'';
  CAT.filter(e=>e.k==='spell'&&(!l||e.cls.includes(l))).forEach(e=>{(by[e.c]=by[e.c]||[]).push(e)});
  return `<select id="sp-sel" aria-label="Zauber aus Katalog"><option value="">${l?S.klass+'-Zauber wählen …':'Zauber wählen …'}</option>${Object.keys(by).map(c=>`<optgroup label="${c}">${by[c].map(e=>`<option value="${esc(e.n)}">${esc(e.n)}</option>`).join('')}</optgroup>`).join('')}</select>`}
