import { pageList, curPage, setPageText, setPageTitle, addPage, delPage, pageLabel } from './views/notes.js';
import { uid as newUid } from './util.js';
import { applyProposal, shrinkImage } from './live-actions.js';
import { downloadBackup, parseBackup, loadSnap, restoreBackup, initBackup } from './backup.js';
import { vLootCoins, vLootItems, vBakHist, turnsHidden, setTurnsHidden } from './views/live-ui.js';
import { vRuleList } from './views/dm-rules.js';
import { vPetResults } from './views/extras.js';
import { weaponProf, ammoFor, ammoLeft } from './attacks.js';
import { chargeOf, applyDawn, petFrom, petOwn, petView } from './companions.js';
import { pickBg, applyBg, bgById, toggleStyle, applySubclass } from './backgrounds.js';
import { isSheetFile, readSheets } from './sheet-read.js';
import { importDraft } from './import-play5e.js';
import { isPlay5e } from './import-play5e.js';
import * as live from './live.js';
import * as cloud from './cloud.js';
import { setBright, setSkin } from './bright.js';
import { hpMaxNow } from './effects.js';
import * as dm from './dm.js';
import { vResults, vNoteList, vEncResults, vPlaceResults } from './views/dm.js';
import { t as tr, setLang, distInput } from './i18n/index.js';
import { buildCatalog } from './catalog.js';
import { payCp, addCp, totalCp, cpToGp } from './shop.js';
import { $, clamp } from './util.js';
import { EQ } from './constants.js';
import { def, mk, spFrom, putBag, S, setS, U, save, toast, switchChar, newChar, dupChar, delChar } from './state.js';
import { classLevels } from './tables.js';
import { get, set, refs, fits, applyRace } from './helpers.js';
import { spMeta, setSheetMode } from './views/sheet.js';
import { wikiBody } from './views/wiki.js';
import { openLU, applyLU, vLuSpells } from './views/levelup.js';
import { app, render } from './render.js';
import { castAt, damage, heal, rest, cast, move, use, importText, loadPortrait, loadFigure } from './game.js';
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
  if(a!=='rm'&&a!=='imp'&&a!=='reset'&&a!=='chardel'&&a!=='npdel')U.CONF=null;
  if(!['dmclear','dmndel','dmedel','dmcdel'].includes(a))dm.DU.conf=null;
  if(a!=='cast'&&a!=='castslot')U.CASTPICK=null;
  pend=false;
  switch(a){
    case 'dmfx':{const id=b.dataset.id,n=v('dm-fxn-'+id).trim();if(!n){toast(tr('toast.needName'));return}dm.addEffect(id,n,+v('dm-fxr-'+id));dm.saveD();break}
    case 'dmfxdel':dm.removeEffect(b.dataset.id,b.dataset.f);dm.saveD();break;
    case 'dmla':{const c=dm.find(b.dataset.id);if(c?.la){dm.togglePip(c.la,+b.dataset.j);dm.saveD()}break}
    case 'dmslot':{const c=dm.find(b.dataset.id),o=c?.slots?.[+b.dataset.k];if(o){dm.togglePip(o,+b.dataset.j);dm.saveD()}break}
    case 'dmpadd':dm.D.party.push({count:1,level:1});dm.saveD();break;
    case 'dmprm':dm.D.party.splice(i,1);dm.saveD();break;
    case 'dmenew':dm.newEnc('');dm.saveD();break;
    case 'dmesel':dm.D.encSel=dm.D.encSel===b.dataset.id?null:b.dataset.id;dm.saveD();break;
    case 'dmestart':dm.startEnc(b.dataset.id);dm.saveD();break;
    case 'dmedel':{const k='e'+b.dataset.id;if(dm.DU.conf!==k){dm.DU.conf=k;break}dm.DU.conf=null;dm.delEnc(b.dataset.id);dm.saveD();break}
    case 'dmeadd':dm.encAdd(b.dataset.m);dm.saveD();break;
    case 'dmeqty':dm.encQty(b.dataset.m,+b.dataset.d);dm.saveD();break;
    case 'dmcedit':dm.DU.editMon=b.dataset.id;break;
    case 'dmcnew':dm.DU.editMon=null;break;
    case 'dmcdel':{const k='c'+b.dataset.id;if(dm.DU.conf!==k){dm.DU.conf=k;break}dm.DU.conf=null;dm.delCustom(b.dataset.id);dm.DU.editMon=null;dm.saveD();break}
    case 'dmcsave':{const n=v('dmc-n').trim();if(!n){toast(tr('toast.needName'));return}dm.saveCustom({n,cr:v('dmc-cr'),ac:v('dmc-ac'),hp:v('dmc-hp'),speed:v('dmc-sp'),text:v('dmc-t'),abil:Object.fromEntries(['str','dex','con','int','wis','cha'].map(k=>[k,Math.min(30,Math.max(1,+v('dmc-'+k)||10))]))},dm.DU.editMon);dm.DU.editMon=null;dm.saveD();toast(tr('toast.created',{n}));break}
    case 'dmview':dm.D.view=b.dataset.v;dm.saveD();break;
    case 'shoot':{const ref=ammoFor(S.eq[b.dataset.k]||{}),{at}=ammoLeft(ref);if(!at.length)break;const i=at[0],it=S.bag[i];it.q-=1;if(it.q<=0)S.bag[i]=null;break}
    case 'jump':{const el=document.getElementById(b.dataset.id);if(el)el.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});return}
    case 'livelevel':if(live.sendMsg({type:'levelup',to:'all'}))toast(tr('live.levelSent'));else toast(tr('turn.offline'));break;
    case 'lupick':{if(!U.LU)break;const k=b.dataset.k,n=b.dataset.n,a=U.LU.pick[k],i=a.indexOf(n);if(i>=0)a.splice(i,1);else a.push(n);const el=$('lu-spells');if(el){el.innerHTML=vLuSpells();return}break}
    case 'condopen':U.CONDOPEN=!U.CONDOPEN;break;
    case 'sheetmode':setSheetMode(b.dataset.m);break;
    case 'dmxpopen':dm.DU.xpOpen=!dm.DU.xpOpen;break;
    case 'dmxpsend':{const total=Math.max(0,Math.floor(+v('dm-xpt'))||0),n=Math.max(1,Math.floor(+v('dm-xpn'))||1),per=Math.floor(total/n);if(!per){toast(tr('toast.needAmount'));return}if(live.sendMsg({type:'xp',to:'all',value:per}))toast(tr('xp.sent',{n:per}));else toast(tr('xp.offlineToast',{n:per}));return}
    case 'dmturns':dm.D.turns=!dm.D.turns;dm.saveD();live.refresh();break;
    case 'turnshow':setTurnsHidden(!turnsHidden());break;
    case 'endturn':if(!live.endTurn())toast(tr('turn.offline'));else toast(tr('turn.ended'));break;
    case 'dmstep':{const gone=dm.step(+b.dataset.d);dm.saveD();live.refresh();if(gone&&gone.length)toast(gone.map(x=>tr('dm.fxEnded',x)).join(' '));break}
    case 'dmclear':if(dm.DU.conf!=='clear'){dm.DU.conf='clear';break}dm.DU.conf=null;dm.clearCombat();dm.saveD();break;
    case 'dmadd':dm.addMonster(b.dataset.m,clamp(Math.floor(+v('dm-qty'))||1,1,20));dm.saveD();break;
    case 'dmman':{const n=v('dm-mn').trim();if(!n){toast(tr('toast.needName'));return}dm.addManual(n,v('dm-mac'),v('dm-mhp'));dm.saveD();break}
    case 'dmchars':dm.addChars();dm.saveD();break;
    case 'dmopen':dm.DU.open[b.dataset.id]=!dm.DU.open[b.dataset.id];break;
    case 'dmhp':{const amt=Math.floor(+v('dm-amt-'+b.dataset.id))||1;dm.changeHp(b.dataset.id,amt*+b.dataset.d);dm.saveD();break}
    case 'dmcond':{const c=dm.find(b.dataset.id);if(c){if(c.cond[b.dataset.c])delete c.cond[b.dataset.c];else c.cond[b.dataset.c]=true;dm.saveD()}break}
    case 'dmrm':dm.removeC(b.dataset.id);dm.saveD();break;
    case 'dmnew':dm.newNote(dm.DU.nk||'npc');dm.saveD();break;
    case 'dmnews':dm.DU.nk='';dm.newNote('session');dm.saveD();break;
    case 'dmhere':dm.setHere(dm.D.here===b.dataset.id?null:b.dataset.id);dm.saveD();break;
    case 'dmnewhere':dm.DU.nk='';dm.newNote('place');dm.setHere(dm.D.sel);dm.saveD();break;
    case 'dmnewp':dm.DU.nk='';dm.newNote('place');dm.saveD();break;
    case 'dmnk':dm.DU.nk=k;break;
    case 'dmpladd':dm.placeAdd(b.dataset.m);dm.saveD();break;
    case 'dmplqty':dm.placeQty(b.dataset.m,+b.dataset.d);dm.saveD();break;
    case 'dmplstart':dm.startPlace(b.dataset.id);dm.saveD();break;
    case 'npsel':S.notePage=i;break;
    case 'npadd':addPage();break;
    case 'npdel':{const p=pageList()[curPage()];if(p.text.trim()&&U.CONF!=='npdel'){U.CONF='npdel';break}U.CONF=null;delPage();break}
    case 'dmsel':dm.D.sel=b.dataset.id;dm.saveD();break;
    case 'dmlink':dm.openLink(b.dataset.t);dm.saveD();break;
    case 'dmndel':if(dm.DU.conf!=='note'){dm.DU.conf='note';break}dm.DU.conf=null;dm.delNote(b.dataset.id);dm.saveD();break;
    case 'dmexp':dm.DU.exp=dm.exportD();break;
    case 'dmimp':{const txt=v('dm-imp').trim();if(!txt){toast(tr('toast.needImport'));return}if(!dm.importD(txt)){toast(tr('toast.badExport2'));return}dm.DU.imp='';toast(tr('dm.imported'));break}
    case 'livecreate':live.createRoom();break;
    case 'livedmjoin':{const code=v('live-dmcode').trim().toUpperCase();if(!live.isCode(code)){toast(tr('live.badCode'));return}live.connect(code,'dm');break}
    case 'livejoin':{const code=v('live-code').trim().toUpperCase();if(!live.isCode(code)){toast(tr('live.badCode'));return}live.connect(code,'player');break}
    case 'liveoff':live.disconnect();break;
    case 'cloudrefresh':cloud.refreshList();break;
    case 'cloudnow':cloud.pushNow(false);break;
    case 'cloudforce':cloud.pushNow(true);break;
    case 'cloudpull':{const kind=b.dataset.kind,id=b.dataset.id;cloud.pull(kind,id).then(r=>{if(!r)return;toast(tr('cloud.loaded'+(r==='active'?'Active':r==='new'?'New':r==='dm'?'Dm':'')));render()});break}
    case 'clouddel':{const ck='clouddel:'+b.dataset.kind+':'+b.dataset.id;if(U.CONF!==ck){U.CONF=ck;break}U.CONF=null;cloud.remove(b.dataset.kind,b.dataset.id);break}
    case 'liveadd':dm.addLive(live.players());dm.saveD();toast(tr('live.added'));break;
    case 'sheetcancel':U.SHEET=null;break;
    case 'sheetapply':{if(!U.SHEET.draft.klass){toast(tr('sheet.needClass'));return}const r=importDraft(U.SHEET.draft);if(r.error){toast(r.error);return}U.IMPREP=r.reports;U.SHEET=null;S.tab='setup';toast(tr('imp.done',{n:r.reports.map(x=>x.name).join(', ')}));break}
    case 'sheetspells':{const known=new Set(S.spells.map(x=>x.n));let n=0;U.SHEET.draft.spells.forEach(x=>{if(!known.has(x)&&BYN['spell:'+x]){S.spells.push(spFrom(BYN['spell:'+x]));n++}});U.SHEET=null;toast(tr('sheet.added',{n}));break}
    case 'livesend':{const to=b.dataset.k,type=b.dataset.t;if(type==='levelup'){if(live.sendMsg({type,to}))toast(tr('live.sent'));return}if(type==='cond'){const cond=v('lv-c-'+to);if(!cond){toast(tr('live.pickCond'));return}if(live.sendMsg({type,to,cond}))toast(tr('live.sent'));return}const value=Math.floor(+v('lv-a-'+to));if(!(value>0)){toast(tr('toast.needAmount'));return}if(live.sendMsg({type,to,value}))toast(tr('live.sent'));return}
    case 'liveyes':{const m=live.answer(b.dataset.id,true);if(m){if(m.type==='levelup')openLU();else applyProposal(m)}break}
    case 'liveno':live.answer(b.dataset.id,false);break;
    case 'hoclose':live.L.handouts.shift();break;
    case 'honote':{const m=live.L.handouts.shift();if(m){S.notes=(S.notes?S.notes+'\n\n':'')+[m.title,m.text].filter(Boolean).join('\n');toast(tr('live.noted'))}break}
    case 'hoimgdel':dm.DU.hoImg='';break;
    case 'hosend':{const D=dm.DU,title=(D.hoT||'').trim(),text=(D.hoX||'').trim();if(!title&&!text&&!D.hoImg){toast(tr('live.hoEmpty'));return}if(!live.sendMsg({type:'handout',to:D.hoTo||'all',title,text,img:D.hoImg||''})){toast(tr('live.notOn'));return}D.hoT='';D.hoX='';D.hoImg='';toast(tr('live.sent'));break}
    case 'lootsend':{const c=BYN[b.dataset.key];if(c&&live.sendMsg({type:'item',to:dm.DU.lto||'all',key:c.key,q:1}))toast(tr('live.sent'));return}
    case 'lootgold':{const coins={};['pp','gp','ep','sp','cp'].forEach(k=>{coins[k]=Math.max(0,Math.floor(+v('lc-'+k))||0)});if(!Object.values(coins).some(Boolean)){toast(tr('toast.needAmount'));return}if(live.sendMsg({type:'gold',to:dm.DU.lto||'all',coins})){toast(tr('live.sent'));break}return}
    case 'lootown':{const n=v('lo-n').trim();if(!n){toast(tr('toast.needName'));return}if(live.sendMsg({type:'item',to:dm.DU.lto||'all',n,p:v('lo-p').trim(),q:1})){toast(tr('live.sent'));break}return}
    case 'split':{const it=get(U.SEL);if(it&&it.q>1){it.q--;putBag(S,{...it,id:newUid(),q:1})}break}
    case 'figdel':S.fig='';break;
    case 'bakdl':downloadBackup();toast(tr('bak.saved'));break;
    case 'baklater':U.NAGOFF=true;break;
    case 'baksnap':loadSnap(b.dataset.at).then(x=>{if(x){U.RESTORE=x;render()}});return;
    case 'bakno':U.RESTORE=null;break;
    case 'bakyes':restoreBackup(U.RESTORE).then(ok=>{if(!ok)toast(tr('toast.saveFailed'))});return;
    case 'wprof':{const it=S.eq[k];if(it)it.prof=!weaponProf(it);break}
    case 'style':toggleStyle(b.dataset.n);break;
    case 'chg':{const it=get(b.dataset.r),c=chargeOf(it);if(c)it.chUsed=clamp(+b.dataset.j<c.max-c.used?c.used+1:c.used-1,0,c.max);break}
    case 'chgd':{const it=get(b.dataset.r),c=chargeOf(it);if(c)it.chUsed=clamp(c.used+ +b.dataset.d,0,c.max);break}
    case 'dawn':U.DAWN=!U.DAWN;break;
    case 'dawnapply':{const n=applyDawn([...document.querySelectorAll('[data-dawn]')].map(x=>[x.dataset.dawn,x.value]));U.DAWN=false;toast(tr('chg.dawnDone',{n}));break}
    case 'pethp':{const p=S.pets[i];if(p){p.hp=clamp(petView(p).hp+ +b.dataset.d,0,petView(p).hpMax)}break}
    case 'petadd':{const m=dm.findMonster(b.dataset.m);if(!m)break;S.pets.push(petFrom(m));U.petQ='';toast(tr('toast.added',{n:m.n}));break}
    case 'petown':{const n=v('pet-n').trim();if(!n){toast(tr('toast.needName'));return}S.pets.push(petOwn(n,v('pet-ac'),v('pet-hp'),v('pet-sp').trim(),v('pet-t').trim()));toast(tr('toast.created',{n}));break}
    case 'bgcancel':U.BGPICK=null;break;
    case 'bgapply':{const bg=bgById(U.BGPICK);if(!bg)break;const sel=[...document.querySelectorAll('[data-bgl]')].map(x=>x.value);const tool=v('bg-tool');if(sel.some(x=>!x)||(bg.choose.tool&&!tool)){toast(tr('bg.needPick'));return}U.BGPICK=null;applyBg(bg,sel,tool);break}
    case 'insp':S.insp=!S.insp;break;
    case 'castslot':castAt(i,b.dataset.l);break;
    case 'prep':{const s=S.spells[i];if(s&&!s.always)s.prep=s.prep===false;break}
    case 'spall':U.SPALL=!U.SPALL;break;
    case 'charsw':switchChar(b.dataset.id);break;
    case 'charnew':newChar();toast(tr('toast.charNew'));break;
    case 'chardup':dupChar();toast(tr('toast.charDup'));break;
    case 'chardel':{const id=b.dataset.id;if(U.CONF!=='chardel:'+id){U.CONF='chardel:'+id;break}U.CONF=null;delChar(id);break}
    case 'print':S.tab='main';render();setTimeout(()=>window.print(),50);return;
    case 'lang':setLang(b.dataset.l);buildCatalog();break;
    case 'mbtab':
    case 'tab':S.tab=b.dataset.t;U.SEL=null;window.scrollTo({top:0});break;
    case 'lu':openLU();break;
    case 'luclose':case 'luclose-bg':U.LU=null;break;
    case 'luapply':if(!applyLU())return;window.scrollTo({top:0});break;
    case 'rest':rest(b.dataset.r==='long');break;
    case 'mbhp':
    case 'hp':{const was=S.hp;S.hp=clamp(S.hp+ +b.dataset.d,0,hpMaxNow());if(was===0&&S.hp>0){S.death={s:0,f:0};delete S.cond.Unconscious}if(was>0&&S.hp===0)S.cond.Unconscious=true;break}
    case 'dmg':case 'heal':case 'temp':{const d=Math.floor(+v('hpv'));if(!(d>0)){toast(tr('toast.needAmount'));return}
      if(a==='dmg')damage(d);else if(a==='heal')heal(d);else{if(d<=S.tmp)toast(tr('toast.tempNoStack'));else{S.tmp=d;toast(tr('toast.tempSet',{n:d}))}}break}
    case 'ds':{const t=b.dataset.t,j=+b.dataset.j,cur=S.death[t];S.death[t]=j+1===cur?j:j+1;
      if(S.death.s>=3)toast(tr('toast.stable'));if(S.death.f>=3)toast(tr('toast.dead'));break}
    case 'pip':{const o=k==='hd'?S.hd:k==='pact'?S.pact:S[k][i];o.used=clamp(+b.dataset.j<o.max-o.used?o.used+1:o.used-1,0,o.max);break}
    case 'resd':{const r=S.res[i];if(r&&r.max<99)r.used=clamp(r.used+ +b.dataset.d,0,r.max);break}
    case 'cond':S.cond[b.dataset.c]=!S.cond[b.dataset.c];if(!S.cond[b.dataset.c])delete S.cond[b.dataset.c];break;
    case 'exh':S.exh=clamp(S.exh+ +b.dataset.d,0,6);break;
    case 'cast':cast(i);break;
    case 'spopen':U.OPEN[i]=!U.OPEN[i];break;
    case 'concend':toast(tr('toast.concEnded',{s:S.conc}));S.conc='';break;
    case 'use':use(b.dataset.r);break;
    case 'gold':{const c2=b.dataset.c;S.gold[c2]=Math.max(0,(+S.gold[c2]||0)+ +b.dataset.d);break}
    case 'buy':{const c2=BYN[b.dataset.key],v=parseFloat(String($('buy-p')?.value||'').replace(',','.'));if(!c2)break;if(!(v>=0)){toast(tr('shop.noPrice'));return}const cp=Math.round(v*100);if(!payCp(S.gold,cp)){toast(tr('shop.poor',{n:cpToGp(totalCp(S.gold)).toLocaleString()}));return}putBag(S,mk(c2));toast(tr('shop.bought',{n:c2.n,p:v.toLocaleString()}));break}
    case 'sell':{const it=get(U.SEL),v=parseFloat(String($('sell-p')?.value||'').replace(',','.'));if(!it)break;if(!(v>=0)){toast(tr('shop.noPrice'));return}addCp(S.gold,Math.round(v*100));toast(tr('shop.sold',{n:it.n,p:v.toLocaleString()}));if(it.q>1)it.q--;else{set(U.SEL,null);U.SEL=null}break}
    case 'qty':{const it=get(U.SEL);if(it)it.q=Math.max(1,it.q+ +b.dataset.d);break}
    case 'equip':{const it=get(U.SEL);if(!it)break;const c2=EQ.map(e=>'eq:'+e[0]).filter(r=>fits(it,r));const t=c2.find(r=>!get(r))||c2[0];if(!t){toast(tr('toast.noSlotFit'));break}move(U.SEL,t);break}
    case 'unequip':{let j=S.bag.indexOf(null);if(j<0){j=S.bag.length;for(let x=0;x<6;x++)S.bag.push(null)}move(U.SEL,'bag:'+j);break}
    case 'tune':{const it=get(U.SEL);if(!it)break;if(!it.tuned&&refs().filter(r=>get(r).tuned).length>=3){toast(tr('toast.maxAttune'));break}it.tuned=!it.tuned;if(it.tuned)toast(tr('toast.attuneTime'));break}
    case 'rm':if(U.CONF!=='rm'){U.CONF='rm';break}set(U.SEL,null);U.SEL=null;U.CONF=null;break;
    case 'unsel':U.SEL=null;break;
    case 'addinv':{const key=v('inv-sel');if(!key){toast(tr('toast.pickItem'));return}const c2=BYN[key];const q=Math.floor(+v('inv-q'))||c2.q||1;putBag(S,mk(c2,q));toast(tr('toast.toBag',{n:c2.n}));break}
    case 'addown':{const n=v('own-n').trim();if(!n){toast(tr('toast.needName'));return}const att=$('own-a').checked;putBag(S,mk({n,ic:v('own-ic'),p:v('own-p').trim(),slot:v('own-slot'),cons:$('own-c').checked,att,magic:att},Math.floor(+v('own-q'))||1));toast(tr('toast.created',{n}));break}
    case 'wf':U.WF=b.dataset.f;U.WSEL=null;U.resetWl=true;break;
    case 'wsel':U.anchor={key:b.dataset.key,top:b.getBoundingClientRect().top};U.WSEL=U.WSEL===b.dataset.key&&innerWidth<900?null:b.dataset.key;break;
    case 'wadd':{const c2=BYN[b.dataset.key];if(!c2)break;if(c2.k==='spell'){S.spells.push(spFrom(c2));toast(tr('toast.spellAdded',{n:c2.n}))}else{putBag(S,mk(c2));toast(tr('toast.toBag',{n:c2.n}))}break}
    case 'tsave':S.saves[k]=!S.saves[k];break;
    case 'tskill':S.skills[k]=((S.skills[k]||0)+1)%3;break;
    case 'imgdel':S.img='';break;
    case 'addfeat':{const n=v('feat-n').trim();if(!n){toast(tr('toast.needName'));return}S.feats.push({n,p:v('feat-p').trim(),lvl:0,src:'Eigener Eintrag'});break}
    case 'addres':{const n=v('res-n').trim();if(!n){toast(tr('toast.needName'));return}S.res.push({n,ic:v('res-ic')||'star',max:Math.max(1,Math.floor(+v('res-m'))||1),used:0,rest:v('res-r')||'long',p:v('res-p').trim()});break}
    case 'addsp':{const n=v('sp-sel');if(!n){toast(tr('toast.pickSpell'));return}if(S.spells.some(s=>s.n===n)){toast(tr('toast.alreadySpell',{n}));return}S.spells.push(spFrom(BYN['spell:'+n]));toast(tr('toast.added',{n}));break}
    case 'addspown':{const n=v('osp-n').trim();if(!n){toast(tr('toast.needName'));return}S.spells.push({n,ic:'star',lvl:clamp(Math.floor(+v('osp-l'))||0,0,9),time:v('osp-t').trim(),range:v('osp-r').trim(),dur:v('osp-d').trim(),eff:v('osp-e').trim(),conc:$('osp-c').checked,ritual:$('osp-ri').checked,school:'',cls:'',src:'own'});toast(tr('toast.created',{n}));break}
    case 'del':{const it=S[k][i];if(k==='spells'){U.OPEN={};if(it&&S.conc===it.n)S.conc=''}S[k].splice(i,1);break}
    case 'exp':{const o=JSON.parse(JSON.stringify(S));o.tab='main';U.EXP=JSON.stringify(o);break}
    case 'copy':{const ta=$('exp');const p=navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(U.EXP):Promise.reject();p.then(()=>toast(tr('toast.copied'))).catch(()=>{if(ta){ta.focus();ta.select()}toast(tr('toast.selected'))});return}
    case 'imp':{const txt=v('imp').trim();if(!txt){toast(tr('toast.needImport'));return}let foreign=false;try{foreign=isPlay5e(JSON.parse(txt))}catch(e){/* importText meldet den Fehler */}if(!foreign&&U.CONF!=='imp'){U.CONF='imp';break}U.CONF=null;if(importText(txt))U.IMP='';break}
    case 'reset':if(U.CONF!=='reset'){U.CONF='reset';break}{const keepId=S.id;setS(def());S.id=keepId}S.tab='setup';U.OPEN={};U.SEL=null;U.EXP='';U.CONF=null;toast(tr('toast.reset'));break;
  }
  save();render()});
app.addEventListener('change',ev=>{
  const el=ev.target;
  if((el.id==='img-in'||el.id==='img-in2')&&el.files&&el.files[0]){loadPortrait(el.files[0]);return}
  if(el.dataset.sh){setDraft(el);return}
  if(el.id==='impf'&&el.files&&[...el.files].some(isSheetFile)){startSheets([...el.files].filter(isSheetFile));return}
  if(el.id==='impf'&&el.files&&el.files[0]){const fr=new FileReader();fr.onload=()=>{const bak=parseBackup(String(fr.result));if(bak){U.RESTORE=bak;render();return}U.IMP=String(fr.result);const ta=$('imp');if(ta)ta.value=U.IMP;U.CONF=null;toast(tr('toast.fileLoaded'))};fr.readAsText(el.files[0]);return}
  if(el.id==='inv-sel'||el.id==='sp-sel'){const c=el.id==='inv-sel'?BYN[el.value]:BYN['spell:'+el.value];const h=$(el.id+'-h');if(h)h.textContent=c?(c.k==='spell'?spMeta(c)+' — '+c.eff:c.p+(c.att?' · '+tr('item.needsAttune'):'')):'';return}
  if(el.id==='wc'){U.WC=el.value;$('wres').innerHTML=wikiBody();return}
  if(el.dataset.lu){U.LU[el.dataset.lu]=el.value;if(el.dataset.lu==='k'){const c=classLevels().find(x=>x.k===el.value);U.LU.sub=c?c.sub:''}later();return}
  if(el.id==='bak-f'&&el.files&&el.files[0]){const fr=new FileReader();fr.onload=()=>{const bak=parseBackup(String(fr.result));el.value='';if(!bak){toast(tr('bak.bad'));return}U.RESTORE=bak;render()};fr.readAsText(el.files[0]);return}
  if(el.id==='ho-f'&&el.files&&el.files[0]){shrinkImage(el.files[0]).then(d=>{if(!d){toast(tr('live.hoBadImage'));return}dm.DU.hoImg=d;render()});return}
  if(el.id==='ho-to'){dm.DU.hoTo=el.value;return}
  if(el.id==='dm-lto'||el.id==='dm-lto2'){dm.DU.lto=el.value;later();return}
  if(el.id==='dm-lock'){dm.D.lootLock=el.checked;dm.saveD();live.refresh();return}
  if(el.id==='fig-in'&&el.files&&el.files[0]){loadFigure(el.files[0]);return}
  if(el.id==='dm-lt'){dm.DU.lt=el.value;dm.DU.lrar='';later();return}
  if(el.id==='dm-lrar'){dm.DU.lrar=el.value;$('dm-li').innerHTML=vLootItems();return}
  if(el.id==='bg-sel'){pickBg(el.value);later();return}
  if(el.dataset.petbm!=null){const p=S.pets[+el.dataset.petbm];if(p){p.bm=el.checked;save()}later();return}
  if(el.id==='char-switch'){switchChar(el.value);render();return}
  if(el.id==='bright'){setBright(el.value);return}
  if(el.id==='skin'){setSkin(el.value);later();return}
  if(el.id==='dm-here'){dm.setHere(el.value);dm.saveD();later();return}
  if(el.id==='dm-only'){dm.D.on=true;dm.D.only=el.checked;dm.saveD();S.tab=el.checked?'dmnotes':'setup';later();return}
  if(el.id==='ac-auto'){S.acMode=el.checked?'auto':'manual';save();later();return}
  if(el.dataset.dp){const p=dm.D.party[+el.dataset.i];if(p){p[el.dataset.dp]=Math.max(el.dataset.dp==='level'?1:0,Math.min(el.dataset.dp==='level'?20:99,Math.floor(+el.value)||0));dm.saveD()}later();return}
  if(el.dataset.de){const e=dm.curEnc();if(e){e.name=el.value;dm.saveD()}later();return}
  if(el.dataset.dm){const c=dm.find(el.dataset.id);if(c){c[el.dataset.dm]=el.dataset.dm==='init'?(+el.value||0):el.value;dm.saveD()}later();return}
  if(el.dataset.dmn){const n=dm.curNote();if(n){n[el.dataset.dmn]=el.value;dm.saveD()}later();return}
  const p=el.dataset.p;if(!p)return;
  let val=el.value;
  if(el.dataset.t==='n'){val=Math.max(+el.min||0,+String(val).replace(',','.')||0);if(el.max)val=Math.min(+el.max,val);if(el.dataset.u==='dist')val=distInput(val);if(p!=='speed')val=Math.floor(val)}
  if(el.dataset.list)val=val.split(',').map(x=>x.trim()).filter(Boolean);
  const oldSub=S.sub;
  setPath(p,val);
  if(p==='sub')applySubclass(oldSub);
  if(p==='race'){S.subrace='';applyRace()}
  if(p==='subrace')applyRace();
  if(p==='klass'){const C=CLASSES[S.klass];S.cls=C?C.l:'';if(C){S.hd.die='W'+C.hd;if(!C.subs.includes(S.sub))S.sub=''}}
  save();later()});
app.addEventListener('input',ev=>{
  const el=ev.target;
  if(el.id==='inv-filter'){U.invQ=el.value;later();return}
  if(el.id==='ho-t'){dm.DU.hoT=el.value;return}
  if(el.id==='ho-x'){dm.DU.hoX=el.value;return}
  if(el.id==='dm-lr'){dm.DU.lr=el.value;$('dm-lc').innerHTML=vLootCoins();return}
  if(el.id==='dm-lq'){dm.DU.lq=el.value;$('dm-li').innerHTML=vLootItems();return}
  if(el.id==='pet-q'){U.petQ=el.value;$('pet-res').innerHTML=vPetResults();return}
  if(el.id==='dm-rq'){dm.DU.rq=el.value;$('dm-rlist').innerHTML=vRuleList();return}
  if(el.id==='dm-pq'){dm.DU.pq=el.value;$('dm-pres').innerHTML=vPlaceResults();return}
  if(el.id==='dm-eq'){dm.DU.eq=el.value;$('dm-eres').innerHTML=vEncResults();return}
  if(el.id==='dm-mq'){dm.DU.mq=el.value;$('dm-results').innerHTML=vResults();return}
  if(el.id==='dm-nq'){dm.DU.nq=el.value;$('dm-nlist').innerHTML=vNoteList();return}
  if(el.id==='dm-imp'){dm.DU.imp=el.value;return}
  if(el.dataset&&el.dataset.dmn){const n=dm.curNote();if(n){n[el.dataset.dmn]=el.value;dm.saveD()}return}
  if(el.id==='notes'){setPageText(el.value);save()}
  if(el.id==='np-title'){setPageTitle(el.value);save();const c=document.querySelector('.notepages .chip.on');if(c)c.textContent=pageLabel(pageList()[curPage()],curPage());return}
  if(el.id==='imp'){U.IMP=el.value;if(U.CONF==='imp')U.CONF=null}
  if(el.dataset&&el.dataset.lu&&el.tagName==='INPUT'&&U.LU){U.LU[el.dataset.lu]=el.value;if(el.id==='lu-q'){const box=$('lu-spells');if(box)box.innerHTML=vLuSpells();}}
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

app.addEventListener('toggle',e=>{if(e.target.classList&&e.target.classList.contains('dm-custom'))dm.DU.customOpen=e.target.open;if(e.target.dataset&&e.target.dataset.rid){dm.DU.ropen=dm.DU.ropen||{};dm.DU.ropen[e.target.dataset.rid]=e.target.open}},true);

/* Live-Tisch: Beim Tippen nicht neu zeichnen, damit Eingaben nicht verloren gehen */
let livePending=false;
const typing=()=>{const a=document.activeElement;return !!a&&app.contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)};
live.setPeerHook(()=>dm.syncLive(live.players()));
live.setJoinHook(cloud.onJoin);
cloud.setCloudListener(()=>{if(!S.tab.startsWith('dm')&&S.tab!=='setup')return;if(typing()){livePending=true;return}later()});
live.setDmFlags(()=>({lock:!!dm.D.lootLock,turn:dm.turnInfo()}));
dm.dmHooks.live=()=>live.refresh();
live.setEndTurnHook(key=>{const gone=dm.endTurnFrom(key);if(gone===null)return;dm.saveD();live.refresh();if(gone.length)toast(gone.map(x=>tr('dm.fxEnded',x)).join(' '));later()});
live.setTurnHook(mine=>{if(!mine||turnsHidden())return;toast(tr('turn.yours'));try{navigator.vibrate&&navigator.vibrate([120,60,120])}catch(e){/* nicht unterstützt */}});
live.setAckHook(m=>toast(tr(m.ok?'live.ackYes':'live.ackNo',{n:m.name})));
initBackup(()=>{const el=$('bak-hist');if(el)el.innerHTML=vBakHist()});
let lastLock=false;
live.setLiveListener(force=>{const lk=live.lootLocked(),lockChanged=lk!==lastLock;lastLock=lk;if(!force&&!lockChanged&&!S.tab.startsWith('dm')&&S.tab!=='setup')return;if(typing()){livePending=true;return}later()});
app.addEventListener('focusout',()=>{if(livePending)setTimeout(()=>{if(livePending&&!typing()){livePending=false;later()}},0)});

/* Charakterbogen aus PDF oder Bild */
async function startSheets(files){
  U.SHEET={busy:'reading'};render();
  try{
    const draft=await readSheets(files,st=>{U.SHEET={busy:st};render()});
    if(!draft.hasSheet&&!draft.spells.length){U.SHEET=null;toast(tr('sheet.nothing'));render();return}
    U.SHEET={draft};
  }catch(e){U.SHEET=null;toast(tr(e.message==='ocr-load'?'sheet.ocrLoad':'sheet.failed'))}
  render();
}
function setDraft(el){
  const d=U.SHEET.draft,f=el.dataset.sh;let v=el.value;
  if(el.dataset.shnum)v=v===''?null:+v;
  const list=el.dataset.shlist?v.split(',').map(x=>x.trim()).filter(Boolean):null;
  if(f==='skillList'){d.skills={};list.forEach(x=>{const m=x.match(/^(.*?)(?:\s*\((\d)\))?$/);d.skills[m[1]]=m[2]?+m[2]:1});return}
  if(f==='itemList'){d.items=list.map(x=>{const m=x.match(/^(\d+)\s+(.+)$/);return m?{name:m[2],q:+m[1]}:{name:x,q:1}});return}
  if(f==='saves'){d.saves=list.map(x=>x.toLowerCase().slice(0,3));return}
  if(f.includes('.')){const [a,b]=f.split('.');d[a][b]=v;return}
  d[f]=list||v;
}
