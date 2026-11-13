import { render } from './render.js';
import { syncAlwaysSpells } from './domain-spells.js';
import { save } from './state.js';
// Domänen- und Eidzauber bestehender Bögen ergänzen
if (syncAlwaysSpells()) save();
import { applyBright, applySkin } from './bright.js';
applyBright();
applySkin();
import './events.js';
import { resume } from './live.js';

render();
resume();

// Web-Fassung: Kommt eine neue Version an, einmal neu laden (nur wenn vorher schon eine aktiv war).
try {
  const sw = navigator.serviceWorker;
  if (sw && sw.controller) { let done = false; sw.addEventListener('controllerchange', () => { if (!done) { done = true; location.reload(); } }); }
} catch (e) { /* keine Service Worker, etwa als Datei geöffnet */ }

// Kurzleiste auf der Karte: erscheint, sobald die Werteleiste aus dem Bild gescrollt ist.
const onScroll = () => { const t = document.querySelector('.tabs'); document.body.classList.toggle('scrolled', !!t && t.getBoundingClientRect().bottom < 0); };
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
