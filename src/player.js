// Spielername: gehört zur Person am Gerät, nicht zu einem Charakter oder einer Kampagne. Er geht über die Presence
// an die Gruppe und gilt damit in jeder Kampagne. Speicher: localStorage charbogen-player (auch in der Sicherungsdatei).
const KEY = 'charbogen-player';
export const playerName = () => { try { return (localStorage.getItem(KEY) || '').slice(0, 40); } catch (e) { return ''; } };
export const setPlayerName = n => { try { const v = String(n || '').trim().slice(0, 40); if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { /* Datenschutzmodus */ } };
