# RealmCraft – Informationsarchitektur (Stand 16.11.2026)

RealmCraft begleitet eine Runde am selben Tisch und ist kein virtueller Spieltisch. Die Anwendung hat drei Ebenen, und am Rand ist immer sichtbar, auf welcher man sich befindet.

## Phase 1 – Bestand vor dem Umbau

| Bereich | Wo es vorher war | Technik |
|---|---|---|
| Startseite | `views/hub.js`: Home, Meine Kampagnen, Charaktere, Regeln & Wissen, Weltkarte, Rundenplanung, Einstellungen | `U.HUB` |
| Kampagnen | Startseite. Lokale Einträge mit Name, Beschreibung, Status, Charakteren, Raumcode, Termin und Sitzungszähler. „Spielen“ öffnete direkt den Charakterbogen. | `campaigns.js`, localStorage `charbogen-campaigns` |
| Charakter | Spielbereich mit den Reitern Karte, Inventar, Wiki, Notizen, Einrichten. Die Karte bündelte Kampf, Werte, Zauber und Merkmale; ein Umschalter Alles/Kampf/Erkundung filterte sie. | `S`, `views/sheet.js` u. a. |
| Spielleitung | Schalter „Spielleitungsmodus“ (`D.only`) für das ganze Gerät, mit den Reitern Kampf, Begegnungen, Beute, Notizbuch, Live-Tisch und Spickzettel | `dm.js`, `views/dm.js`, `views/dm-mode.js` |
| Gruppe und Raum | Raumcode (Supabase Realtime, Presence und Broadcast). Spieler traten in Einrichten bei, die Spielleitung öffnete den Raum im Reiter Live-Tisch. Online-Speicherung je Raum. | `live.js`, `cloud.js` |
| Kampf | Spielleitung: Tracker mit Initiative, Runde, Zug, TP, Zuständen, Effekten, Begleitern und Live-Spielern. Spieler: Zuganzeige in der Live-Leiste, Zugübersicht mit Aktionszählung, Angriffe, Zauber, Ressourcen auf der Karte. | `dm.js`, `turn-state.js`, `views/turn.js` |
| Statusmeldungen | Vorschläge der Spielleitung (Schaden, Heilung, Zustand, Gegenstand, Gold, XP, Inspiration) werden angenommen, mit Toast und Vibration. Wirkungen von Mitspielern stehen im Kasten „Wirkt gerade“. | `live.js`, `buffs.js`, `views/live-ui.js` |
| Inventar und Handel | Persönliches Inventar beim Charakter. Kaufen im Wiki, Verkaufen im Inventar. Gruppenkasse und Beute bei der Spielleitung. | `shop.js`, `stash.js` |
| Erkundung | Weltkarte (aidedd.org) auf der Startseite. Orte, „Hier sind wir“ und Handlung im Notizbuch der Spielleitung. | `views/hub.js`, `dm.js` |
| Notizen | Charakternotizen mit Seiten. Notizbuch der Spielleitung mit Sitzungen, Orten, NSCs, Handlung und Verweisen `[[…]]`. | `views/notes.js`, `views/dm.js` |
| Rollen | Keine Konten. Die Rolle hing am Gerät (`D.only`), nicht an der Kampagne. Wer den Raumcode kennt, ist im Raum. | – |

## Phase 2 – Zielstruktur

```
Globale Ebene (Startseite)
├─ Dashboard           zuletzt geöffnete Kampagnen, nächste Sitzung, eigene Charaktere, Schnellzugriff, „Kampagne beitreten“
├─ Kampagnen           alle Kampagnen mit Rolle, Neu, Beitreten, Termine
├─ Spielleiterbereich  eigene Kampagnen leiten: anlegen, Code erzeugen/kopieren, „Leiten“
├─ Charaktere          alle Charaktere, Neu, Import
├─ Weltkarte
├─ Regeln & Wissen     Zauber, Klassen, Völker, Talente, Gegenstände, Monster, Zustände, Regeln
└─ Einstellungen       Sprache, Einheiten, Darstellung, Spielleitungsmodus, Sicherung
   (nicht in der Seitenleiste: Beitreten, Termine)

Kampagnenebene
├─ Übersicht           Beschreibung, Sitzungen, Raum (öffnen/verbinden, Code teilen), aktueller Ort, letzte Sitzung, Gruppe
├─ Gruppe              Spieler: eigener Charakter + Mitspieler | Spielleitung: Live-Tisch (senden, Bogen ansehen)
├─ Kampf               Spieler: Spielansicht im Kampfzuschnitt | Spielleitung: Kampfverlauf, Begegnungen, Spickzettel
├─ Erkundung           aktueller Ort, Karte auf Wunsch | Spielleitung zusätzlich: bekannte Orte, Handlung
├─ Inventar & Handel   Spieler: Münzen, Gruppenkasse, Einkauf | Spielleitung: Beute und Gruppenkasse
└─ Chronik             Spieler: eigene Kampagnen-Aufzeichnungen | Spielleitung: Notizbuch (privat)

Charakterebene (über Gruppe → eigener Charakter, oder ohne Kampagne direkt)
├─ Übersicht           kompakt: TP, RK, sechs Attribute, Zustände, Konzentration, Kampagnen (seitliche Navigation ab 900 px)
├─ Werte & Fähigkeiten Attribute, Rettungswürfe, Fertigkeiten, passive Werte, Merkmale, Übungen
├─ Inventar            Ausrüstungsplätze, Rucksack, Münzen, Traglast
├─ Zauber              Zauberplätze, Zauber nach Grad, Konzentration
├─ Notizen             Charakternotizen mit Seiten
├─ Bearbeiten          Einrichten (Werte, Ressourcen, Zauberliste mit Entfernen nur nach Bestätigung, Sicherung), Assistent
└─ Kampf               nur ohne Kampagne; in einer Kampagne ist der Kampf ein Bereich der Kampagne
```

**Kampfmodus (seit 16.11.2026, zweiter Schritt):** Es gibt zwei sichtbare Zustände, „Vorbereitung“ und „Kampf läuft“.
- **Spielleitung:**
  - In der Vorbereitung lädt sie Begegnungen, fügt Gegner und Spieler hinzu, trägt die Initiative ein und klickt „Kampf starten“.
  - Im laufenden Kampf sieht sie Runde, wer am Zug ist und wer danach kommt. Dazu gehören: Zurück und Nächster Zug, Schaden und Heilung, Zustände, Effekte mit Runden, Konzentration der Gegner, Vorschläge und Wirkungen an verbundene Spieler direkt in deren Zeile, „Konzentration beenden“, XP verteilen und „Kampf beenden“ (Gegner raus, Spieler bleiben).
- **Spieler:**
  - Sie sehen dieselben zwei Zustände.
  - Im laufenden Kampf sehen sie Runde und Reihenfolge aus der Presence (`turn.order`). Mitspieler stehen mit TP, Zuständen und Konzentration darin, Gegner nur mit grobem Zustand (unverletzt, angeschlagen, schwer verletzt, besiegt).
  - Darunter folgen eigene TP, Zustände, Wirkungen, Angriffe mit Aktionszählung, Ressourcen und Zauber.
  - Ohne Spielleitung können sie die Zählung selbst beginnen und beenden.
- **Meldungen:** „Du bist am Zug“ (Toast und Vibration). Vorschläge wie Schaden oder Konzentrationsende erscheinen als Toast und im Posteingang zum Annehmen. Bei einer neuen Wirkung kommt „Shield of Faith wurde auf dich gewirkt (Mira)“.

**Abweichungen vom Vorschlag und warum**

- **Rolle je Kampagne statt je Gerät.** „Leiten“ schaltet den Spielleitungsmodus ein, eine Spielerkampagne schaltet ihn aus und öffnet den zugeordneten Charakter. So kann dieselbe Person in einer Runde leiten und in einer anderen mitspielen. Der Schalter in den Einstellungen bleibt für Spielleitung ohne Kampagne.
- **„Charaktere“ bleibt global.** Charaktere entstehen vor einer Kampagne und können in mehreren Kampagnen spielen.
- **Kampf des Spielers = bisherige Spielansicht.** Angriffe, Zugübersicht, Ressourcen, Zauber zum Wirken und Zustände stehen dort schon mit allen Zählern. Ein zweiter Kampfbildschirm würde dieselben Daten doppelt pflegen. Im Charakter bleiben die Grunddaten (Profil, Werte, Inventar, Zauber, Notizen).
- **Regeln & Wissen gibt es nur einmal (global).** In Kampagne und Charakter erreicht man es über den Knopf „Regeln“ im Kopf, ohne die Ebene zu wechseln.
- **Persönliches Inventar bleibt beim Charakter.** „Inventar & Handel“ in der Kampagne zeigt Gemeinsames: Gruppenkasse, Beute, Einkauf. So gibt es keine zweite Inventarverwaltung.
- **Chronik und Notizen getrennt.** Die Chronik der Kampagne und die Notizen des Charakters sind getrennt. Das Notizbuch der Spielleitung bleibt privat. Gemeinsame Informationen gehen wie bisher als Handout an die Spieler.
- **Beitrittsanfragen entfallen.** Es gibt keine Konten, der Raumcode ist der Schlüssel. Wer ihn kennt, ist drin. Die Spielleitung sieht im Bereich Gruppe, wer verbunden ist.

## Phase 3 – Zuordnung

| Funktion | Ergebnis |
|---|---|
| Karte (Spielansicht) | bleibt; in der Kampagne der Bereich **Kampf**, ohne Umschalter. Ohne Kampagne weiter mit Alles/Kampf/Erkundung |
| Werte, Fertigkeiten, Merkmale, Übungen | zusätzlich eigene Seite **Werte & Fähigkeiten** (dieselben Bausteine, keine Datenkopie) |
| Zauberliste | zusätzlich eigene Seite **Zauber**; Wirken bleibt auch im Kampf |
| Inventar, Notizen, Einrichten | bleiben beim Charakter (Einrichten heißt dort „Bearbeiten“) |
| Wiki | verschoben: global „Regeln & Wissen“, im Spiel über den Kopf |
| Spielleitungsmodus-Reiter | neu gruppiert: Live-Tisch → Gruppe, Kampf + Begegnungen + Spickzettel → Kampf (Unterleiste), Beute → Inventar & Handel, Notizbuch → Chronik |
| „Hier sind wir“, Orte, Handlung | zusätzlich in **Erkundung** (dieselben Notizen) |
| Raum öffnen/beitreten | zusammengeführt in **Übersicht** der Kampagne und im Ablauf **Beitreten**; der alte Weg in Einrichten bleibt |
| Rundenplanung | in Kampagnen eingeordnet (Knopf „Termine“) |
| Gruppenansicht auf der Karte | bleibt; zusätzlich Seite **Gruppe** |
| Weltkarte | global und zusätzlich auf Wunsch in **Erkundung** (dieselbe Ebene, lädt einmal) |

**Gemeinsam genutzte Daten:** Charakter `S` (Gruppe, Kampf, Charakterseiten), Kampagnen `charbogen-campaigns` (Startseite, Kampagnenebene), Spielleitung `D` (Kampf, Erkundung, Chronik, Handel), Presence im Raum (Gruppe, Kampf, Übersicht, Beitreten).

**Neu gebaut:** Rolle, Chronik (`log`) und „zuletzt geöffnet“ (`seen`) je Kampagne. Spielleiterbereich mit Code erzeugen und kopieren. Ablauf „Beitreten“ (Code und Charakter, dann verbinden, Kampagne der Spielleitung ansehen, bestätigen). Die Presence der Spielleitung trägt Name und Beschreibung der geöffneten Kampagne (`camp`) und den Titel des aktuellen Orts (`here`), nie den Notiztext. Dazu Brotkrumen mit Ebene und Rolle.

**Spielleitungsdaten je Kampagne:** Vorschlag mit Migration in `docs/dm-daten-je-kampagne.md`, noch nicht umgesetzt.

**Fehlt noch (bewusst nicht gebaut, Kandidaten für später):**
- Händler mit eigenem Sortiment der Spielleitung (heute: Einkauf zum Listenpreis im Katalog)
- Gemeinsame, von allen bearbeitbare Kampagnennotizen (bräuchte eine gemeinsame Speicherung; heute Handouts)
- Questfortschritt als eigene Liste (heute: Notizart „Handlung“)
- Getrennte Spielleitungsdaten je Kampagne: `D` ist weiterhin eins pro Gerät. Wer zwei Kampagnen leitet, teilt Notizbuch, Begegnungen und Kampf zwischen beiden.
- Co-Spielleitung: Der Raum kennt genau eine Spielleitung. Eine zweite würde Nachrichtenausgang und Zuganzeige doppeln und braucht ein eigenes Konzept.
- Einladungen ohne Code (es gibt keine Konten)

**Begleiter (Ranger-Tiergefährte, Vertrauter, Beschwörungen):** Sie bleiben Teil des Charakters (`S.pets`, Einrichten) und erscheinen im Kampf über die Presence unter ihrem Spieler. Eigenständige Kreaturen ohne Spieler sind Gegner bzw. eigene Monster der Spielleitung. Eine dritte Verwaltung ist nicht nötig.

## Technik

- Ebenen und Reiter: `src/views/nav.js` (`navTabs`, `validTabs`, `vCrumbs`, Seiten der Kampagne und des Charakters). Die bisherigen Reiterkennungen bleiben gültig.
- Geöffnete Kampagne: `U.CAMP`, beim Neuladen aus sessionStorage `charbogen-camp`; Öffnen über `openCamp()` in `events.js`.
- Startseite: `views/hub.js` (`vGm`, `vJoin`).
- Tests: `tests/structure.spec.js`.
