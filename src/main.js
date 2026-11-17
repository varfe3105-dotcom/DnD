import { render } from './render.js';
import { syncAlwaysSpells } from './domain-spells.js';
import { save, hooks } from './state.js';
// Domänen- und Eidzauber bestehender Bögen ergänzen
hooks.raceSpells = syncAlwaysSpells;
if (syncAlwaysSpells()) save();
import { applyBright, applySkin } from './bright.js';
applyBright();
applySkin();
import './events.js';
import { resume } from './live.js';

import { U } from './state.js';
import { campaignById } from './campaigns.js';
import { useCamp } from './dm.js';
try { if (sessionStorage.getItem('charbogen-view') !== 'play') U.HUB = 'home'; else U.CAMP = sessionStorage.getItem('charbogen-camp') || null; } catch (e) { U.HUB = 'home'; }
// Neuladen in einer Kampagne der Spielleitung: deren eigene Spielleitungsdaten wieder öffnen (sonst zeigte und speicherte
// die App den alten gemeinsamen Bereich).
if (U.CAMP) { const c = campaignById(U.CAMP); if (c && c.role === 'dm') useCamp(c.split ? c.id : null); }
render();
resume();

// Web-Fassung: Kommt eine neue Version an, einmal neu laden (nur wenn vorher schon eine aktiv war).
try {
  const sw = navigator.serviceWorker;
  if (sw && sw.controller) { let done = false; sw.addEventListener('controllerchange', () => { if (!done) { done = true; location.reload(); } }); }
} catch (e) { /* keine Service Worker, etwa als Datei geöffnet */ }

// Kurzleiste auf der Karte: erscheint, sobald die Werteleiste aus dem Bild gescrollt ist.
const onScroll = () => { const t = document.querySelector('.tabs:not(.side)') || document.querySelector('#app header'); document.body.classList.toggle('scrolled', !!t && t.getBoundingClientRect().bottom < 0); };
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
import { syncMapLayer } from './views/hub.js';
window.addEventListener('resize', syncMapLayer);
