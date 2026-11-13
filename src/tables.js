import { S } from './state.js';
import { MULTICLASS, CLASSES, FULL, CANT, KNOWN } from './catalog.js';

export const pb=l=>l<1?2:2+Math.floor((l-1)/4);
const THIRD={Fighter:'Eldritch Knight',Rogue:'Arcane Trickster'};
export const castKind=(k,sub)=>{const C=CLASSES[k];if(!C)return '';if(C.cast==='full'||C.cast==='half')return C.cast;return THIRD[k]&&sub===THIRD[k]?'third':''};
export function slotsFor(k,l,sub){const C=CLASSES[k];let a=[];if(C&&l>0){const c=castKind(k,sub);if(c==='full')a=FULL[l];else if(c==='half')a=FULL[l<2?0:Math.ceil(l/2)];else if(c==='third')a=FULL[l<3?0:Math.ceil(l/3)]}return Array.from({length:9},(_,i)=>a[i]||0)}
export function pactFor(l){if(l<1)return [0,1];return [l>=17?4:l>=11?3:l>=2?2:1,Math.min(5,Math.ceil(l/2))]}
export const cantripsFor=(k,l)=>CANT[k]!=null&&l>0?CANT[k]+(l>=4)+(l>=10):0;
export const knownFor=(k,l)=>KNOWN[k]&&l>0?KNOWN[k][l-1]:null;

/** Alle Klassen des Charakters mit Klassenstufe; die Hauptklasse trägt den Rest der Gesamtstufe. */
export const classLevels=()=>{const multi=S.multi||[];const sum=multi.reduce((a,c)=>a+c.lvl,0);const out=[];if(S.klass)out.push({k:S.klass,sub:S.sub||'',lvl:Math.max(0,(S.level||0)-sum)});return out.concat(multi.map(c=>({...c})))};
/** Zauberplätze nach PHB: eine Zauberklasse nutzt ihre eigene Tabelle, mehrere addieren ihre Zauberstufen. */
export function slotsAll(list){
  const casters=list.filter(c=>castKind(c.k,c.sub)&&c.lvl>0);
  if(casters.length<=1){const c=casters[0];return c?slotsFor(c.k,c.lvl,c.sub):Array(9).fill(0)}
  const lvl=casters.reduce((a,c)=>{const t=castKind(c.k,c.sub);return a+(t==='full'?c.lvl:t==='half'?Math.floor(c.lvl/2):Math.floor(c.lvl/3))},0);
  const row=FULL[Math.min(20,lvl)];return Array.from({length:9},(_,i)=>row[i]||0)}
/** Voraussetzung zum Multiclassing erfüllt? */
export const mcMet=k=>{const r=MULTICLASS[k]?.req||{};const {any,...all}=r;return Object.entries(all).every(([a,v])=>S.abil[a]>=v)&&(!any||Object.entries(any).some(([a,v])=>S.abil[a]>=v))};

const PREP = { Cleric: 'wis', Druid: 'wis', Wizard: 'int', Paladin: 'cha' };
/** Wie viele Zauber vorbereitet werden dürfen; null, wenn keine Klasse vorbereitet. */
export function prepCap() {
  const list = classLevels().filter(c => PREP[c.k] && c.lvl > 0 && (c.k !== 'Paladin' || c.lvl >= 2));
  if (!list.length) return null;
  return list.reduce((a, c) => a + Math.max(1, Math.floor((S.abil[PREP[c.k]] - 10) / 2) + (c.k === 'Paladin' ? Math.floor(c.lvl / 2) : c.lvl)), 0);
}
/** Zauber-SG und Angriffsbonus je Zauberklasse. */
export function spellStats() {
  return classLevels().filter(c => c.lvl > 0 && (castKind(c.k, c.sub) || CLASSES[c.k]?.cast === 'pact')).map(c => {
    const a = CLASSES[c.k].sa || 'int', m = Math.floor((S.abil[a] - 10) / 2);
    return { k: c.k, a, dc: 8 + S.prof + m, atk: S.prof + m };
  });
}

/** XP-Schwellen nach PHB: Index = Stufe, Wert = nötige XP für diese Stufe. */
export const XP_LEVELS = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
/** Gesamtstufe über alle Klassen. */
export const totalLevel = () => classLevels().reduce((a, c) => a + (c.lvl || 0), 0);
