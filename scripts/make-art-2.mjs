// Grafiken des Designsystems 2026 (Dark Fantasy: Anthrazit, Aubergine, Pergament, Messing). Alles selbst erzeugt.
// Aufruf: node scripts/make-art-2.mjs  → schreibt nach src/assets/
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const out = 'src/assets/';
let seed = 2026;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const reseed = s => { seed = s; };

/** Bergkamm als Fläche. jag = Zacken, smooth = Rückzug zur Grundlinie. */
function ridge(w, h, base, amp, step, jag = 0.5, smooth = 0.12) {
  const pts = [];
  let y = base;
  for (let x = -40; x <= w + 40; x += step) { y += (rnd() - 0.5) * amp; y += (base - y) * smooth; const peak = rnd() < jag * 0.1 ? -amp * (0.25 + rnd() * 0.35) : 0; pts.push(`${x},${(y + peak).toFixed(1)}`); }
  return `M-40,${h + 40} L${pts.join(' L')} L${w + 40},${h + 40} Z`;
}
function pines(w, base, spread, size, n, x0 = 0, x1 = w) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0), b = base + (rnd() - 0.5) * spread, h = size * (0.55 + rnd() * 0.9), hw = h * 0.2;
    d += `M${x.toFixed(1)},${(b - h).toFixed(1)}`;
    for (let t = 1; t <= 5; t++) { const yy = b - h + (h * t) / 5, ww = (hw * t) / 5 + 1.5; d += `L${(x + ww).toFixed(1)},${yy.toFixed(1)}L${(x + ww * 0.35).toFixed(1)},${(yy - h * 0.03).toFixed(1)}`; }
    d += `L${x.toFixed(1)},${(b + 12).toFixed(1)}`;
    for (let t = 5; t >= 1; t--) { const yy = b - h + (h * t) / 5, ww = (hw * t) / 5 + 1.5; d += `L${(x - ww * 0.35).toFixed(1)},${(yy - h * 0.03).toFixed(1)}L${(x - ww).toFixed(1)},${yy.toFixed(1)}`; }
    d += 'Z';
  }
  return d;
}
/** Burg aus Türmen mit Kegeldächern. s = Maßstab, x/y = Fußpunkt Mitte. */
function castle(x, y, s, fill, lit) {
  const T = [[-62, 60, 13, 1], [-40, 92, 15, 1], [-14, 128, 18, 1], [10, 160, 16, 1], [34, 110, 15, 1], [56, 76, 12, 1], [78, 52, 10, 0]];
  let d = '', win = '';
  d += `M${x - 80 * s},${y} L${x - 80 * s},${y - 34 * s} L${x + 92 * s},${y - 34 * s} L${x + 92 * s},${y} Z`;
  for (let k = -78; k < 90; k += 9) d += `M${(x + k * s).toFixed(1)},${(y - 34 * s).toFixed(1)}h${(5 * s).toFixed(1)}v${(-5 * s).toFixed(1)}h${(-5 * s).toFixed(1)}Z`;
  T.forEach(([dx, h, w, roof]) => {
    const l = x + (dx - w / 2) * s, r = x + (dx + w / 2) * s, top = y - h * s;
    d += `M${l.toFixed(1)},${y} L${l.toFixed(1)},${top.toFixed(1)} L${r.toFixed(1)},${top.toFixed(1)} L${r.toFixed(1)},${y} Z`;
    if (roof) d += `M${(l - 2.5 * s).toFixed(1)},${top.toFixed(1)} L${((l + r) / 2).toFixed(1)},${(top - w * 1.7 * s).toFixed(1)} L${(r + 2.5 * s).toFixed(1)},${top.toFixed(1)} Z M${((l + r) / 2).toFixed(1)},${(top - w * 1.7 * s).toFixed(1)} v${(-6 * s).toFixed(1)} l${(5 * s).toFixed(1)},${(2 * s).toFixed(1)} l${(-5 * s).toFixed(1)},${(2 * s).toFixed(1)}`;
    else for (let k = 0; k < 3; k++) d += `M${(l + k * w / 3 * s).toFixed(1)},${top.toFixed(1)}h${(w / 6 * s).toFixed(1)}v${(-4 * s).toFixed(1)}h${(-w / 6 * s).toFixed(1)}Z`;
    for (let k = 0; k < 3; k++) if (rnd() < 0.7) win += `<rect x="${((l + r) / 2 - 1.2 * s).toFixed(1)}" y="${(top + (14 + k * 22) * s).toFixed(1)}" width="${(2.4 * s).toFixed(1)}" height="${(4.5 * s).toFixed(1)}" rx="${s}"/>`;
  });
  return `<path d="${d}" fill="${fill}"/><g fill="${lit}" opacity=".9">${win}</g>`;
}
/** Wolkenschicht aus Rauschen, eingefärbt und horizontal gestreckt. */
const clouds = (id, w, h, fx, fy, oct, color, alpha, sd) => `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${fx} ${fy}" numOctaves="${oct}" seed="${sd}"/><feColorMatrix values="0 0 0 0 ${color[0]}  0 0 0 0 ${color[1]}  0 0 0 0 ${color[2]}  ${alpha} 0 0 0 ${-alpha * 0.42}"/></filter><rect width="${w}" height="${h}" filter="url(#${id})"/>`;
const grainF = `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .4  0 0 0 0 .3  0 0 0 .07 0"/></filter>`;

/** Landschaft im Abendlicht. pal: Himmel oben/Mitte/Horizont, Sonne, Bergschichten fern→nah, Burg, Fensterlicht. */
function scene(W, H, pal, opt = {}) {
  reseed(opt.seed || 11);
  const hz = H * (opt.horizon || 0.6), [s0, s1, s2] = pal.sky, sun = pal.sun;
  const layers = pal.hills.map((c, i) => {
    const base = hz + H * (0.02 + i * 0.09), amp = H * (0.11 - i * 0.018);
    return `<path d="${ridge(W, H, base, amp * (i < 2 ? 1.25 : 0.8), W / (70 - i * 12), i === 0 ? 1.6 : 0.5, i < 2 ? 0.06 : 0.14)}" fill="${c}"/>` + (i < pal.hills.length - 1 ? `<rect y="${base - amp}" width="${W}" height="${amp * 2.4}" fill="url(#haze)" opacity="${0.5 - i * 0.1}"/>` : '');
  });
  const cx = W * (opt.castleX || 0.56), cy = hz + H * 0.13;
  const hill = `<path d="M${cx - W * 0.2},${H} C${cx - W * 0.12},${cy + 10} ${cx - W * 0.06},${cy - 6} ${cx},${cy - 4} S${cx + W * 0.14},${cy + 8} ${cx + W * 0.24},${H} Z" fill="${pal.castleHill}"/>`;
  const forest = `<path d="${pines(W, hz + H * 0.24, H * 0.06, H * 0.08, Math.round(W / 14))}" fill="${pal.forest}"/><path d="${pines(W, H * 0.97, H * 0.05, H * 0.12, Math.round(W / 22))}" fill="${pal.near}"/>`;
  const cliff = opt.cliff ? `<path d="M${W * 0.68},${H} L${W * 0.7},${H * 0.83} L${W * 0.74},${H * 0.78} L${W * 0.8},${H * 0.765} L${W * 0.9},${H * 0.77} L${W},${H * 0.74} L${W},${H} Z" fill="${pal.near}"/>
    <g fill="${pal.near}" transform="translate(${W * 0.79},${H * 0.765}) scale(${H / 600})"><path d="M-6,0 L-5,-34 C-6,-44 -4,-52 0,-56 C4,-52 6,-44 5,-34 L7,0 Z"/><circle cx="0" cy="-62" r="6.5"/><path d="M-4,-50 C-18,-40 -26,-20 -30,2 L-6,0 Z"/><path d="M4,-48 C14,-36 24,-18 34,4 L8,0 Z"/><path d="M9,-46 L11,-100 L13,-46 Z"/><path d="M9,-100 l2,-8 l2,8 z"/></g>
    <path d="M${W * 0.985},${H} C${W * 0.975},${H * 0.6} ${W * 0.95},${H * 0.4} ${W * 0.9},${H * 0.22} M${W * 0.955},${H * 0.42} C${W * 0.9},${H * 0.36} ${W * 0.86},${H * 0.32} ${W * 0.82},${H * 0.3} M${W * 0.93},${H * 0.3} C${W * 0.9},${H * 0.2} ${W * 0.86},${H * 0.12} ${W * 0.84},${H * 0.05}" fill="none" stroke="${pal.near}" stroke-width="${H * 0.018}" stroke-linecap="round"/>
    <g fill="${pal.near}" filter="url(#rag)">${[[0.84, 0.06], [0.82, 0.3], [0.9, 0.2], [0.96, 0.1], [0.93, 0.34]].map(([cx0, cy0]) => Array.from({ length: 26 }, () => `<circle cx="${(W * (cx0 + (rnd() - 0.5) * 0.07)).toFixed(0)}" cy="${(H * (cy0 + (rnd() - 0.5) * 0.12)).toFixed(0)}" r="${(H * (0.008 + rnd() * 0.016)).toFixed(1)}"/>`).join('')).join('')}</g>` : '';
  const birds = Array.from({ length: 7 }, () => { const x = W * (0.3 + rnd() * 0.3), y = H * (0.12 + rnd() * 0.16), s = H / 300 * (0.6 + rnd() * 0.6); return `<path d="M${x},${y} q${4 * s},${-3 * s} ${8 * s},0 q${4 * s},${-3 * s} ${8 * s},0" fill="none" stroke="${pal.hills[1]}" stroke-width="${1.1 * s}"/>`; }).join('');
  const lake = opt.lake ? `<rect y="${hz + H * 0.16}" width="${W}" height="${H}" fill="url(#lake)"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s0}"/><stop offset=".55" stop-color="${s1}"/><stop offset="${(opt.horizon || 0.6) + 0.02}" stop-color="${s2}"/></linearGradient>
    <radialGradient id="sun" cx="${opt.sunX || 0.58}" cy="${(opt.horizon || 0.6) - 0.04}" r=".5"><stop offset="0" stop-color="${sun}" stop-opacity=".95"/><stop offset=".25" stop-color="${sun}" stop-opacity=".45"/><stop offset="1" stop-color="${sun}" stop-opacity="0"/></radialGradient>
    <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s2}" stop-opacity="0"/><stop offset=".5" stop-color="${s2}" stop-opacity=".55"/><stop offset="1" stop-color="${s2}" stop-opacity="0"/></linearGradient>
    <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s2}" stop-opacity=".7"/><stop offset="1" stop-color="${pal.near}" stop-opacity=".9"/></linearGradient>
    ${grainF}<filter id="rag"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="8"/><feDisplacementMap in="SourceGraphic" scale="${H * 0.03}"/></filter></defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    ${clouds('c1', W, H * 0.5, 0.0014, 0.008, 4, pal.cloud, 1.5, opt.seed || 3)}
    ${clouds('c2', W, H * 0.4, 0.003, 0.018, 3, pal.cloud2 || pal.cloud, 1.1, (opt.seed || 3) + 7)}
    <rect width="${W}" height="${H}" fill="url(#sun)"/>${opt.moon ? `<circle cx="${W * opt.moon[0]}" cy="${H * opt.moon[1]}" r="${H * opt.moon[2]}" fill="${sun}" opacity=".9"/>` : ''}
    ${birds}${layers.slice(0, 2).join('')}${lake}${hill}${castle(cx, cy, H / 520 * (opt.castleS || 1), pal.castle, pal.lit)}${layers.slice(2).join('')}${forest}${cliff}
    <rect width="${W}" height="${H}" filter="url(#grain)"/></svg>`;
}

const DUSK = { sky: ['#3a2639', '#b0706e', '#f6c27e'], sun: '#ffe2ad', cloud: [0.97, 0.78, 0.62], cloud2: [0.62, 0.44, 0.52], hills: ['#a4788a', '#7b586c', '#5b4152', '#3c2b37'], castle: '#6b4d5d', castleHill: '#4a3543', lit: '#ffcf7a', forest: '#2f222b', near: '#1a1218' };
const RUIN = { sky: ['#2c2433', '#6c5a72', '#b99a9c'], sun: '#f4d6b4', cloud: [0.7, 0.62, 0.68], cloud2: [0.42, 0.36, 0.44], hills: ['#76667a', '#5a4c60', '#433848', '#2b2330'], castle: '#4c4052', castleHill: '#352c3a', lit: '#f6c77a', forest: '#221c26', near: '#141116' };
const GROVE = { sky: ['#1d1a1c', '#3b3a33', '#7d7350'], sun: '#e8d38f', cloud: [0.55, 0.52, 0.4], cloud2: [0.3, 0.3, 0.26], hills: ['#5f5a46', '#46432f', '#33311f', '#211f14'], castle: '#3e3a2a', castleHill: '#2a281b', lit: '#e9e08c', forest: '#171610', near: '#0e0d09' };
const HARBOR = { sky: ['#3a2b3c', '#9c6a6a', '#eaa96d'], sun: '#ffd79a', cloud: [0.95, 0.72, 0.55], cloud2: [0.55, 0.4, 0.45], hills: ['#9a7480', '#735668', '#4f3a48', '#30222c'], castle: '#5e4252', castleHill: '#3f2d39', lit: '#ffc56b', forest: '#261a22', near: '#150e13' };
const NIGHT = { sky: ['#140f18', '#2d2235', '#4a3a4e'], sun: '#f3e3b8', cloud: [0.55, 0.45, 0.6], cloud2: [0.3, 0.25, 0.35], hills: ['#3d3045', '#2c2233', '#1f1824', '#140f18'], castle: '#241b2a', castleHill: '#1a131e', lit: '#f2b65a', forest: '#120d15', near: '#0a080c' };

// Rahmen: dünne Messinglinie mit Eckornamenten (für border-image, 120×120, Schnitt 40)
const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8c987"/><stop offset=".5" stop-color="#a77d3e"/><stop offset="1" stop-color="#6e4f24"/></linearGradient></defs>
<g fill="none" stroke="url(#b)"><rect x="6.5" y="6.5" width="107" height="107" stroke-width="1.4"/><rect x="10.5" y="10.5" width="99" height="99" stroke-width=".6" opacity=".55"/></g>
${[[0, 0, 0], [120, 0, 90], [120, 120, 180], [0, 120, 270]].map(([x, y, r]) => `<g transform="translate(${x},${y}) rotate(${r})" fill="url(#b)"><path d="M2,2 L26,2 L26,4.5 L8,4.5 C6,4.5 4.5,6 4.5,8 L4.5,26 L2,26 Z"/><path d="M12,12 m-4,0 l4,-4 l4,4 l-4,4 z"/><path d="M16,6.5 h14 l2,1.5 l-2,1.5 h-14 z M6.5,16 v14 l1.5,2 l1.5,-2 v-14 z" opacity=".8"/></g>`).join('')}</svg>`;
const flourish = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20" viewBox="0 0 160 20"><g fill="none" stroke="#b9914f" stroke-width="1.1" stroke-linecap="round"><path d="M0 10h104"/><path d="M104 10c8 0 12-6 19-6 5 0 8 3 8 6s-3 5-6 5-4-2-4-4"/><path d="M104 10c8 0 12 6 19 6 7 0 11-3 15-6"/></g><path d="M146 10l5-5 5 5-5 5z" fill="none" stroke="#d6b06a" stroke-width="1.2"/><circle cx="151" cy="10" r="1.4" fill="#d6b06a"/></svg>`;
// Logo: W20 als Ikosaeder in Messing mit Strahlen
const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2d99a"/><stop offset=".5" stop-color="#c49a52"/><stop offset="1" stop-color="#7d5a28"/></linearGradient></defs>
<g stroke="url(#g)" fill="none" stroke-linecap="round" stroke-linejoin="round">${Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8, r1 = i % 2 ? 50 : 46, r2 = i % 2 ? 57 : 60; return `<path d="M${60 + Math.cos(a) * r1},${60 + Math.sin(a) * r1} L${60 + Math.cos(a) * r2},${60 + Math.sin(a) * r2}" stroke-width="${i % 2 ? 0.8 : 1.3}"/>`; }).join('')}
<circle cx="60" cy="60" r="43" stroke-width=".8" opacity=".6"/><path d="M60 22 93 41v38L60 98 27 79V41z" stroke-width="2.4"/><path d="M60 22 42 66h36z M27 41 42 66 M93 41 78 66 M42 66 60 98 78 66 M27 79 42 66 M93 79 78 66 M60 22 27 41 M60 22 93 41" stroke-width="1.5"/></g>
<text x="60" y="60.5" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="700" fill="#f2d99a">20</text></svg>`;
// Hintergrund: Anthrazit mit Aubergine, feine Körnung, leichte Vignette
const bg = (W, H) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><radialGradient id="v" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#231d21"/><stop offset=".6" stop-color="#171316"/><stop offset="1" stop-color="#0c0a0c"/></radialGradient><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="9" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .5  0 0 0 .06 0"/></filter><filter id="m"><feTurbulence type="fractalNoise" baseFrequency=".002 .004" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 .24  0 0 0 0 .16  0 0 0 0 .22  .35 0 0 0 -.12"/></filter></defs><rect width="100%" height="100%" fill="url(#v)"/><rect width="100%" height="100%" filter="url(#m)"/><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
// Fläche der Karten: Anthrazit mit kaum sichtbarer Struktur (kachelbar)
const slate = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".02 .03" numOctaves="4" seed="17" stitchTiles="stitch" result="a"/><feColorMatrix in="a" values="0 0 0 0 .16  0 0 0 0 .13  0 0 0 0 .16  0 0 0 .5 0" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .4  0 0 0 0 .34  0 0 0 0 .38  0 0 0 .08 0" result="g"/><feFlood flood-color="#1c181b"/><feMerge><feMergeNode/><feMergeNode in="c"/><feMergeNode in="g"/></feMerge></filter><rect width="320" height="320" filter="url(#f)"/></svg>`;

const b = await chromium.launch();
async function shoot(svg, w, h, name, q) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await p.screenshot({ path: out + name, type: 'jpeg', quality: q, clip: { x: 0, y: 0, width: w, height: h } });
  await p.close();
}
fs.writeFileSync(out + 'frame-brass.svg', frame);
fs.writeFileSync(out + 'flourish-gold.svg', flourish);
fs.writeFileSync(out + 'logo.svg', logo);
await shoot(bg(1600, 1000), 1600, 1000, 'bg-dark.jpg', 70);
await shoot(slate, 320, 320, 'slate.jpg', 72);
await shoot(scene(1400, 520, DUSK, { seed: 11, cliff: true, castleX: 0.5, sunX: 0.55 }), 1400, 520, 'hero.jpg', 74);
await shoot(scene(640, 280, RUIN, { seed: 21, castleX: 0.6, castleS: 0.85 }), 640, 280, 'camp-0.jpg', 70);
await shoot(scene(640, 280, GROVE, { seed: 31, castleX: 0.5, castleS: 0.7 }), 640, 280, 'camp-1.jpg', 70);
await shoot(scene(640, 280, HARBOR, { seed: 41, castleX: 0.62, castleS: 0.8, lake: true }), 640, 280, 'camp-2.jpg', 70);
await shoot(scene(280, 340, NIGHT, { seed: 51, castleX: 0.45, castleS: 0.8, horizon: 0.66, moon: [0.72, 0.28, 0.09], sunX: 0.72 }), 280, 340, 'side-night.jpg', 70);
await b.close();
console.log('ok');
