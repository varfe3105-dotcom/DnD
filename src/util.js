export const $=id=>document.getElementById(id);
export const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const mod=v=>Math.floor((v-10)/2),sg=n=>(n<0?'−':'+')+Math.abs(n);
export const uid=()=>Math.random().toString(36).slice(2,9);
export const fmtM=v=>String(v).replace('.',',');
