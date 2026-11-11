import { render } from './render.js';
import { applyBright } from './bright.js';
applyBright();
import './events.js';
import { resume } from './live.js';

render();
resume();

// Web-Fassung: Kommt eine neue Version an, einmal neu laden (nur wenn vorher schon eine aktiv war).
try {
  const sw = navigator.serviceWorker;
  if (sw && sw.controller) { let done = false; sw.addEventListener('controllerchange', () => { if (!done) { done = true; location.reload(); } }); }
} catch (e) { /* keine Service Worker, etwa als Datei geöffnet */ }
