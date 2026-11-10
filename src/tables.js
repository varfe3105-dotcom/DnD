import { CLASSES, FULL, CANT, KNOWN } from './catalog.js';

export const pb=l=>l<1?2:2+Math.floor((l-1)/4);
export function slotsFor(k,l){const C=CLASSES[k];let a=[];if(C&&l>0){if(C.cast==='full')a=FULL[l];else if(C.cast==='half')a=FULL[l<2?0:Math.ceil(l/2)]}return Array.from({length:9},(_,i)=>a[i]||0)}
export function pactFor(l){if(l<1)return [0,1];return [l>=17?4:l>=11?3:l>=2?2:1,Math.min(5,Math.ceil(l/2))]}
export const cantripsFor=(k,l)=>CANT[k]!=null&&l>0?CANT[k]+(l>=4)+(l>=10):0;
export const knownFor=(k,l)=>KNOWN[k]&&l>0?KNOWN[k][l-1]:null;
