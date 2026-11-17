/* global btoa, atob, TextEncoder, TextDecoder */
// D3: Genaue Spielerwerte (TP, Maximum, Temp-TP, TP der Begleiter) gehen im Live-Tisch nur verschlüsselt hinaus –
// lesbar ausschließlich für die Spielleitung des Raums. Die Spielleitung erzeugt je Raum ein ECDH-Schlüsselpaar
// (P-256); der öffentliche Schlüssel liegt serverseitig beim Raum (charbogen_rooms, nur die Spielleitung darf ihn
// setzen). Spieler leiten mit einem Einmal-Schlüssel einen AES-GCM-Schlüssel ab und verschlüsseln damit.
// Mitspieler erhalten im Klartext nur die grobe Stufe (ok / hurt / bad / down).

const LS = 'charbogen-dm-ecdh';
const subtle = () => (typeof crypto !== 'undefined' && crypto.subtle) || null;
const ALG = { name: 'ECDH', namedCurve: 'P-256' };
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const pubOnly = j => ({ kty: 'EC', crv: 'P-256', x: j.x, y: j.y });

export const supported = () => !!subtle();

/** Grobe Stufe aus genauen Werten (gleiche Grenzen wie die Anzeige in views/party.js). */
export function hpLevel(hp, max) {
  if (!max) return 'ok';
  if (hp <= 0) return 'down';
  const r = hp / max;
  return r >= 0.75 ? 'ok' : r >= 0.4 ? 'hurt' : 'bad';
}

/** Schlüsselpaar der Spielleitung für einen Raum (bleibt auf dem Gerät; nur der öffentliche Teil geht hinaus). */
export async function dmKeys(room) {
  const s = subtle();
  if (!s) return null;
  let all = {};
  try { all = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { all = {}; }
  if (!all[room]) {
    const kp = await s.generateKey(ALG, true, ['deriveKey']);
    all[room] = { pub: pubOnly(await s.exportKey('jwk', kp.publicKey)), priv: await s.exportKey('jwk', kp.privateKey) };
    try { localStorage.setItem(LS, JSON.stringify(all)); } catch (e) { /* Datenschutzmodus */ }
  }
  return all[room];
}

async function aesFrom(privKey, pubJwk) {
  const s = subtle();
  const pub = await s.importKey('jwk', pubOnly(pubJwk), ALG, false, []);
  return s.deriveKey({ name: 'ECDH', public: pub }, privKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Spieler: Objekt für die Spielleitung verschlüsseln. Liefert { e: {x,y}, iv, ct } oder null. */
export async function seal(dmPub, obj) {
  const s = subtle();
  if (!s || !dmPub || !dmPub.x) return null;
  const eph = await s.generateKey(ALG, true, ['deriveKey']);
  const key = await aesFrom(eph.privateKey, dmPub);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await s.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  const e = await s.exportKey('jwk', eph.publicKey);
  return { e: { x: e.x, y: e.y }, iv: b64(iv), ct: b64(ct) };
}

/** Spielleitung: entschlüsseln. Liefert das Objekt oder null (falscher Schlüssel, verändert). */
export async function unseal(room, box) {
  const s = subtle();
  if (!s || !box || !box.e) return null;
  try {
    const k = await dmKeys(room);
    const priv = await s.importKey('jwk', k.priv, ALG, false, ['deriveKey']);
    const key = await aesFrom(priv, { x: box.e.x, y: box.e.y });
    const pt = await s.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch (e) { return null; }
}
