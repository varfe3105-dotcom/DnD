// Meldungsstreifen im Kampf: die letzten Meldungen (Zug, Vorschläge der Spielleitung, Wirkungen) sichtbar halten,
// zusätzlich als kurzer Toast. Keine Vibration vorausgesetzt; ein Ton ist optional und abschaltbar (localStorage charbogen-sound).
import { U, toast } from './state.js';

const SOUND = 'charbogen-sound';
let hook = () => {};
export const setFeedHook = fn => { hook = fn; };
/** Meldung aufnehmen: kind = turn | bad | good | conc | '' (Farbe im Streifen). */
export function feed(text, kind = '') {
  U.FEED = [{ text, kind, at: Date.now() }, ...(U.FEED || [])].slice(0, 3);
  toast(text);
  hook();
}
export const soundOn = () => { try { return localStorage.getItem(SOUND) === 'on'; } catch (e) { return false; } };
export const setSound = on => { try { if (on) localStorage.setItem(SOUND, 'on'); else localStorage.removeItem(SOUND); } catch (e) { /* Datenschutzmodus */ } };
/** Kurzer, leiser Glockenton ohne Audiodatei (WebAudio). */
export function beep() {
  try {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    const ctx = new A(), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.55);
  } catch (e) { /* kein Ton möglich */ }
}
