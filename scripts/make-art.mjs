// Erzeugt alle Grafiken der Oberfläche selbst (keine fremden Motive).
// Aufruf: node scripts/make-art.mjs  → schreibt nach src/assets/
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const out = 'src/assets/';
fs.mkdirSync(out, { recursive: true });

// Reproduzierbarer Zufall
let seed = 7341;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function ridge(w, base, amp, step) {
  const pts = [];
  let y = base;
  for (let x = -20; x <= w + 20; x += step) { y += (rnd() - 0.5) * amp; y += (base - y) * 0.12; pts.push(`${x},${y.toFixed(1)}`); }
  return `M-20,1100 L${pts.join(' L')} L${w + 20},1100 Z`;
}
function pines(w, base, spread, size, n) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, b = base + (rnd() - 0.5) * spread, h = size * (0.6 + rnd() * 0.9), hw = h * 0.2;
    d += `M${x.toFixed(0)},${(b - h).toFixed(0)}`;
    for (let t = 1; t <= 5; t++) { const yy = b - h + (h * t) / 5, ww = (hw * t) / 5 + 2; d += `L${(x + ww).toFixed(0)},${yy.toFixed(0)}L${(x + ww * 0.35).toFixed(0)},${(yy - h * 0.03).toFixed(0)}`; }
    d += `L${x.toFixed(0)},${(b + 20).toFixed(0)}`;
    for (let t = 5; t >= 1; t--) { const yy = b - h + (h * t) / 5, ww = (hw * t) / 5 + 2; d += `L${(x - ww * 0.35).toFixed(0)},${(yy - h * 0.03).toFixed(0)}L${(x - ww).toFixed(0)},${yy.toFixed(0)}`; }
    d += 'Z';
  }
  return d;
}
const W = 1800, H = 1100;
const backdrop = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
 <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1417"/><stop offset=".45" stop-color="#1c2b2c"/><stop offset=".7" stop-color="#3c3a30"/><stop offset="1" stop-color="#1a1410"/></linearGradient>
 <radialGradient id="moon" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f2e6c6" stop-opacity=".95"/><stop offset=".09" stop-color="#e9dcb9" stop-opacity=".85"/><stop offset=".12" stop-color="#cfc6a4" stop-opacity=".28"/><stop offset="1" stop-color="#cfc6a4" stop-opacity="0"/></radialGradient>
 <linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9b3a0" stop-opacity="0"/><stop offset=".6" stop-color="#a9b3a0" stop-opacity=".26"/><stop offset="1" stop-color="#a9b3a0" stop-opacity="0"/></linearGradient>
 <filter id="cloud" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".004 .018" numOctaves="4" seed="9"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .6  0 0 0 0 .55  0 0 0 1.6 -.85"/></filter>
 <filter id="soft"><feGaussianBlur stdDeviation="1.4"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect width="${W}" height="620" filter="url(#cloud)" opacity=".55"/>
<circle cx="1320" cy="230" r="520" fill="url(#moon)"/>
<path d="${ridge(W, 560, 34, 18)}" fill="#2c3a3a" filter="url(#soft)"/>
<rect y="470" width="${W}" height="240" fill="url(#fog)"/>
<path d="${ridge(W, 660, 30, 14)}" fill="#1f2a2a"/>
<path d="${pines(W, 690, 40, 90, 150)}" fill="#18211f"/>
<rect y="600" width="${W}" height="220" fill="url(#fog)" opacity=".8"/>
<path d="${ridge(W, 800, 24, 12)}" fill="#111816"/>
<path d="${pines(W, 840, 60, 190, 80)}" fill="#0c1110"/>
<rect y="760" width="${W}" height="260" fill="url(#fog)" opacity=".35"/>
<path d="${ridge(W, 980, 18, 10)}" fill="#080b0a"/>
</svg>`;

const tile = (id, size, filter, bg = '#000') => `<svg xmlns="http://www.w3.org/2000/svg" id="${id}" width="${size}" height="${size}" style="display:block"><defs>${filter}</defs><rect width="${size}" height="${size}" fill="${bg}" filter="url(#f)"/></svg>`;
const leather = tile('t', 320, `<filter id="f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="turbulence" baseFrequency=".09" numOctaves="3" seed="4" stitchTiles="stitch" result="n"/><feDiffuseLighting in="n" surfaceScale="1.7" diffuseConstant="1.05" lighting-color="#7a5234"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting><feColorMatrix values=".55 0 0 0 0  0 .5 0 0 0  0 0 .46 0 0  0 0 0 1 0"/></filter>`);
const stone = tile('t', 256, `<filter id="f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".035 .05" numOctaves="5" seed="11" stitchTiles="stitch" result="n"/><feDiffuseLighting in="n" surfaceScale="3.2" diffuseConstant="1" lighting-color="#7f8079"><feDistantLight azimuth="225" elevation="55"/></feDiffuseLighting></filter>`);
const parchment = tile('t', 420, `<filter id="f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="5" seed="23" stitchTiles="stitch" result="n"/><feColorMatrix in="n" values="0 0 0 0 .84  0 0 0 0 .74  0 0 0 0 .55  .9 0 0 0 .1" result="b"/><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .32  0 0 0 0 .22  0 0 0 0 .1  0 0 0 .3 0" result="s"/><feFlood flood-color="#e6d6b0"/><feMerge><feMergeNode/><feMergeNode in="b"/><feMergeNode in="s"/></feMerge></filter>`);
const wood = tile('t', 256, `<filter id="f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".008 .16" numOctaves="4" seed="31" stitchTiles="stitch" result="n"/><feDiffuseLighting in="n" surfaceScale="2.2" diffuseConstant="1" lighting-color="#5c3f28"><feDistantLight azimuth="200" elevation="60"/></feDiffuseLighting><feColorMatrix values=".6 0 0 0 0  0 .55 0 0 0  0 0 .5 0 0  0 0 0 1 0"/></filter>`);

const b = await chromium.launch();
const shoot = async (svg, w, h, file, quality = 72) => {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<!doctype html><body style="margin:0;background:#000">${svg}</body>`);
  await p.waitForTimeout(150);
  await p.screenshot({ path: out + file, type: 'jpeg', quality });
  await p.close();
};
await shoot(backdrop, W, H, 'backdrop.jpg', 62);
await shoot(leather, 320, 320, 'leather.jpg', 68);
await shoot(stone, 256, 256, 'stone.jpg', 66);
await shoot(parchment, 420, 420, 'parchment.jpg', 70);
await shoot(wood, 256, 256, 'wood.jpg', 66);
await b.close();

// Beschlag-Rahmen als border-image: Eisenband, Eckbeschläge, Nieten, Patina-Ranke
const corner = `<g><path d="M3 3h36v8c-8 0-13 2-17 6s-6 9-6 17v5H3z" fill="url(#iron)" stroke="#0a0a09" stroke-width="1.2"/><path d="M6 6h28M6 6v28" stroke="#a7a395" stroke-opacity=".55" fill="none"/><path d="M12 33c0-11 9-21 21-21" fill="none" stroke="#6c9a89" stroke-width="1.6" stroke-linecap="round"/><path d="M15 23c3 1 5 3 5 7M23 15c1 3 3 5 7 5" fill="none" stroke="#6c9a89" stroke-width="1.2" stroke-linecap="round"/><circle cx="9.5" cy="9.5" r="2.6" fill="url(#rivet)" stroke="#000" stroke-width=".6"/><circle cx="30" cy="8" r="1.8" fill="url(#rivet)" stroke="#000" stroke-width=".5"/><circle cx="8" cy="30" r="1.8" fill="url(#rivet)" stroke="#000" stroke-width=".5"/></g>`;
const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><defs><linearGradient id="iron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#57564f"/><stop offset=".55" stop-color="#2e2d2a"/><stop offset="1" stop-color="#171614"/></linearGradient><radialGradient id="rivet" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#c9c4b4"/><stop offset=".6" stop-color="#55524a"/><stop offset="1" stop-color="#14130f"/></radialGradient></defs>
<rect x="4.5" y="4.5" width="111" height="111" fill="none" stroke="#14110e" stroke-width="5"/><rect x="4.5" y="4.5" width="111" height="111" fill="none" stroke="#5a4a36" stroke-width="1"/><rect x="9.5" y="9.5" width="101" height="101" fill="none" stroke="#3b2f22" stroke-width="1" stroke-dasharray="5 4"/>
${corner}<g transform="translate(120 0) scale(-1 1)">${corner}</g><g transform="translate(0 120) scale(1 -1)">${corner}</g><g transform="translate(120 120) scale(-1 -1)">${corner}</g></svg>`;
fs.writeFileSync(out + 'frame.svg', frame);

// Gravierte Ranke neben Überschriften
fs.writeFileSync(out + 'flourish.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="20" viewBox="0 0 150 20"><g fill="none" stroke="#b08a52" stroke-width="1.2" stroke-linecap="round"><path d="M0 10h98"/><path d="M98 10c10 0 14-7 22-7 6 0 9 3 9 6s-3 5-6 5-4-2-4-4"/><path d="M98 10c10 0 14 7 22 7 8 0 12-3 17-7"/></g><path d="M139 10l5-4 5 4-5 4z" fill="#6c9a89"/></svg>`);

// Gewandete Gestalt für die Figur ohne Porträt
fs.writeFileSync(out + 'figure.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4733"/><stop offset="1" stop-color="#1a130d"/></linearGradient></defs><path fill="url(#g)" d="M100 22c17 0 29 13 31 30 2 15-4 26-8 32 18 7 33 19 39 42l15 86c2 12-4 18-13 19l-11 1 9 76c4 34 12 56 19 72H19c8-18 16-38 19-72l8-76-12-1c-9-1-15-7-13-19l15-86c6-23 21-35 39-42-5-7-10-17-8-32 3-17 16-30 33-30z"/><path fill="none" stroke="#8a6d45" stroke-opacity=".5" d="M76 86c15 10 33 10 48 0M100 96v290M58 128c-8 40-10 80-8 120M142 128c8 40 10 80 8 120"/><path fill="#0c0906" d="M83 44c5-9 29-9 34 0 4 8 3 24-5 31-7 6-17 6-24 0-8-7-9-23-5-31z"/></svg>`);
console.log(Object.fromEntries(fs.readdirSync(out).map(f => [f, Math.round(fs.statSync(out + f).size / 1024) + 'KB'])));
