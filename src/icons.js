import { $ } from './util.js';

export const IC={
sword:'<path d="M19 3h2v2L10 16l-2-2z"/><path d="M6 13l5 5M8 16l-4 4"/>',
axe:'<path d="M5 21 16 8"/><path d="M13 5c2.5-2 6-1.5 7.5 1.5-1.5 1.5-3.5 2-4.5 4.5L12 8z"/>',
hammer:'<path d="M5 20l8.5-8.5"/><path d="M11.5 6.5 15 3l6 6-3.5 3.5z"/>',
spear:'<path d="M4 20 16 8"/><path d="M14 5l7-2-2 7-3-2z"/>',
bow:'<path d="M5 3c9 1 15 7 16 16"/><path d="M5 3l16 16" stroke-dasharray="1.5 2.5"/><path d="M3 12h9M10 10l2 2-2 2"/>',
shield:'<path d="M12 3l7.5 3v5.5c0 4.5-3.2 7.8-7.5 9.5-4.3-1.7-7.5-5-7.5-9.5V6z"/>',
armor:'<path d="M8 3h8l4 3-2.5 4V21h-11V10L4 6z"/><path d="M9 3c0 2 1.3 3 3 3s3-1 3-3M12 6v15"/>',
helm:'<path d="M4.5 15a7.5 7.5 0 0 1 15 0v5h-15z"/><path d="M12 7.5V20M8 15h8"/>',
cloak:'<path d="M9 3h6l1.5 3L20 21H4L7.5 6z"/><path d="M7.5 6h9M12 6v15"/>',
gloves:'<path d="M7 21v-6L4.5 10.5l1.8-1 2.2 2.5V5a1.2 1.2 0 0 1 2.5 0v5V3.8a1.2 1.2 0 0 1 2.5 0V10V5a1.2 1.2 0 0 1 2.5 0v5.5V7.5a1.2 1.2 0 0 1 2.5 0V15l-2 6z"/>',
belt:'<rect x="2.5" y="9" width="19" height="6" rx="1"/><rect x="9.5" y="7.5" width="5.5" height="9" rx="1"/><path d="M12 12h3"/>',
boots:'<path d="M7 3h6.5v9l5.5 2.5c1.5.7 2 1.5 2 3V20H7z"/><path d="M7 17h14"/>',
ring:'<circle cx="12" cy="14.5" r="6"/><path d="M9.5 8.5 12 4.5l2.5 4z"/>',
amulet:'<path d="M5 3c.5 5.5 3.5 8.5 7 8.5S18.5 8.5 19 3"/><path d="M12 11.5l3.5 4.5L12 20.5 8.5 16z"/>',
potion:'<path d="M9.5 3h5M10.5 3v5.5L5.8 15.6A3.6 3.6 0 0 0 8.9 21h6.2a3.6 3.6 0 0 0 3.1-5.4L13.5 8.5V3"/><path d="M7.2 14h9.6"/>',
flame:'<path d="M12 21a6 6 0 0 0 6-6c0-4.5-3.5-7-5-12-1 3-2 4.5-3.5 6C8 10.5 6 12 6 15a6 6 0 0 0 6 6z"/><path d="M12 21a2.5 2.5 0 0 0 2.5-2.5c0-2-2.5-3.5-2.5-5.5-.5 2-2.5 3.5-2.5 5.5A2.5 2.5 0 0 0 12 21z"/>',
skull:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l-2 1V21H8v-3.5z"/><circle cx="9.5" cy="12.5" r="1.4"/><circle cx="14.5" cy="12.5" r="1.4"/><path d="M11 21v-2M13 21v-2"/>',
heart:'<path d="M12 20.5S4 15.8 4 9.8A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8 2.2c0 6-8 10.7-8 10.7z"/>',
scroll:'<path d="M8.5 4h10a2 2 0 0 1 0 4H17v10a2.5 2.5 0 0 1-2.5 2.5h-9a2 2 0 0 1 0-4H7V5.5A1.5 1.5 0 0 1 8.5 4"/><path d="M10 9h4.5M10 12.5h4.5M7 16.5h7.5"/>',
book:'<path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z"/><path d="M5 20a1.5 1.5 0 0 0 1.5 1.5H19V18M9 7h6"/>',
wand:'<path d="M4 20 15 9"/><path d="M17 3v3M17 9v1M14 6h-1M21 6h-3M19.2 3.8l-1 1M15.8 7.2l-1 1"/>',
gem:'<path d="M7 4h10l4 5-9 11.5L3 9z"/><path d="M3 9h18M9.5 9 12 4l2.5 5L12 20.5z"/>',
bag:'<path d="M9 6.5V5a3 3 0 0 1 6 0v1.5"/><path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 12.5h6"/>',
tool:'<path d="M14.5 4.5a4 4 0 0 0 5 5L10 19a2.1 2.1 0 0 1-3-3z"/>',
key:'<circle cx="8" cy="8" r="4.5"/><path d="M11.2 11.2 20 20M16.5 16.5l2-2M18.5 18.5l1.5-1.5"/>',
torch:'<path d="M10 11h4l-1.2 10h-1.6z"/><path d="M12 3c2.2 2.2 3.2 3.8 3.2 5.3a3.2 3.2 0 0 1-6.4 0C8.8 6.8 9.8 5.2 12 3z"/>',
food:'<path d="M4 12.5h16a8 8 0 0 1-16 0z"/><path d="M9 9c0-1.5 1.5-1.5 1.5-3S9 4.5 9 3M14 9c0-1.5 1.5-1.5 1.5-3S14 4.5 14 3"/>',
music:'<path d="M9 18V5.5l11-2.5v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
coin:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/>',
dice:'<path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z"/><path d="M4 7.4l8 4.6 8-4.6M12 12v9.2"/>',
leaf:'<path d="M5 19C5 9.5 10.5 4 20 4c0 9.5-5.5 15-15 15z"/><path d="M5 19 14 10"/>',
mask:'<path d="M4 5h16v6.5a8 8 0 0 1-16 0z"/><path d="M7.5 10h3M13.5 10h3M9 15c2 1.4 4 1.4 6 0"/>',
star:'<path d="M12 3l2 6.5L20.5 12 14 14.5 12 21l-2-6.5L3.5 12 10 9.5z"/>',
eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
swirl:'<path d="M12 12a1.8 1.8 0 1 1 1.8-1.8 4 4 0 1 1-4-4 6.5 6.5 0 1 1-6.3 8"/>',
bolt:'<path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z"/>',
snow:'<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>',
wing:'<path d="M3 19c6 0 11-3 14-8l4-7c-6 1-10 4-12 9"/><path d="M6 15c3 0 6-1 8-3M3 19l5-5"/>',
box:'<path d="M4 8l8-4 8 4v8.5L12 20.5 4 16.5z"/><path d="M4 8l8 4 8-4M12 12v8.5"/>'};
export const ICN={sword:'Schwert',axe:'Axt',hammer:'Hammer',spear:'Speer',bow:'Bogen',shield:'Schild',armor:'Rüstung',helm:'Helm',cloak:'Umhang',gloves:'Handschuhe',belt:'Gürtel',boots:'Stiefel',ring:'Ring',amulet:'Amulett',potion:'Trank',flame:'Feuer',skull:'Totenkopf',heart:'Herz',scroll:'Schriftrolle',book:'Buch',wand:'Stab',gem:'Edelstein',bag:'Beutel',tool:'Werkzeug',key:'Schlüssel',torch:'Licht',food:'Essen',music:'Instrument',coin:'Münze',dice:'Würfel',leaf:'Pflanze',mask:'Maske',star:'Stern',eye:'Auge',swirl:'Wirbel',bolt:'Blitz',snow:'Frost',wing:'Flügel',box:'Kiste'};
export const icon=k=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[k]||IC.box}</svg>`;
export const EM={'🧪':'potion','💉':'potion','🔥':'flame','⚗️':'potion','💧':'potion','☠️':'skull','🔨':'hammer','🗡️':'sword','🪓':'axe','🔱':'spear','🪄':'wand','🏹':'bow','🎯':'spear','🪨':'coin','⛏️':'hammer','🪢':'box','🛡️':'shield','🔦':'torch','🍖':'food','🩹':'heart','🔑':'key','🎒':'bag','🏕️':'box','🔧':'tool','🏮':'torch','🧗':'box','🎭':'mask','🖋️':'scroll','🌿':'leaf','🧭':'eye','🍺':'potion','🍳':'food','🗺️':'scroll','🎲':'dice','🃏':'scroll','🎻':'music','🎵':'music','🥁':'music','🪕':'music','🛢️':'potion','⚪':'coin','🕯️':'torch','📌':'box','🔒':'key','⛓️':'box','🔭':'eye','💡':'torch','🪤':'box','👝':'bag','🔮':'gem','✝️':'amulet','📕':'book','👢':'boots','🛏️':'box','💚':'heart','✨':'star','❄️':'snow','⚡':'bolt','🌠':'star','🚫':'shield','✋':'swirl','🟣':'star','😴':'star','🪽':'wing','☀️':'star','📦':'box','💀':'skull','🌀':'swirl','💫':'star','🦋':'wing'};
export const icFrom=x=>IC[x]?x:(EM[x]||'box');
export const iconOpts=sel=>Object.keys(ICN).map(k=>`<option value="${k}"${k===sel?' selected':''}>${ICN[k]}</option>`).join('');

export const TONE={sword:'steel',axe:'steel',hammer:'steel',spear:'steel',shield:'steel',armor:'steel',helm:'steel',tool:'steel',gloves:'leather',boots:'leather',belt:'leather',cloak:'leather',bag:'leather',scroll:'leather',book:'leather',music:'leather',box:'leather',dice:'leather',food:'leather',bow:'leather',key:'gold',coin:'gold',torch:'gold',ring:'gold',amulet:'gold',potion:'crimson',heart:'crimson',flame:'crimson',leaf:'verdant',gem:'arcane',wand:'arcane',star:'arcane',eye:'arcane',swirl:'arcane',mask:'arcane',wing:'arcane',bolt:'arcane',snow:'arcane',skull:'shadow'};
export const tok=(k,tone)=>`<span class="tok t-${tone||TONE[k]||'leather'}">${icon(k)}</span>`;
export const itTone=it=>(it.att||it.magic)?'arcane':(TONE[it.ic]||'leather');
