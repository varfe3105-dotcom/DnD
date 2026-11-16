# Neugestaltung „RealmCraft“ (zuerst „Roll & Tale“) (ab 16.11.2026)

Ziel: eigenständige Fantasy-Plattform mit Startseite (Dashboard) und überarbeitetem Spielbereich. Architektur bleibt: HTML, CSS, JavaScript-Module, Vite, Einzeldatei und Offline-Fassung. Keine Migration zu React, Next.js oder TypeScript.

Hauptreferenz: Dashboard-Bild der Nutzerin bzw. des Nutzers (Seitenleiste mit Würfel-Logo, Pergament-Willkommensbereich mit Burg, Kampagnenkarten, nächste Session, Schnellzugriff auf Pergament, Zitat).

## Phase 1: Designsystem (fertig)

- `src/tokens.css` ist die einzige Quelle für Farben, Schriften, Abstände, Rundungen, Linien, Flächen, Schatten und Bausteine (Knopf-Verläufe, Balken).
  - Palette: Anthrazit (`--c-anth-*`), Aubergine (`--c-aub*`), Braun, Pergament (`--c-parch*`), Messing (`--c-brass*`), Cremeweiß (`--c-cream*`), Statusfarben.
  - Schriften: Cormorant Garamond (Titel, Überschriften), Alegreya (Text und Bedienung), Cinzel (Logo, Kapitälchen). Lokal über Fontsource eingebettet.
  - Flächen: `--surface-page`, `--surface-card`, `--surface-raised`, `--surface-parch`, `--frame` (Messingrahmen), `--flourish`.
- CSS-Schichten in dieser Reihenfolge: `tokens.css` (Werte), `styles.css` (Aufbau, Druck), `theme.css` (Grimoire-Optik auf dem Bildschirm), `areas.css` (Bereiche mit eigener Identität, zuerst das Dashboard), `skins.css` (Alternativen „Schlicht“ und „Modern“).
- `theme.css`: Variablen auf Tokens umgestellt, feste Farben von 260 auf 128 reduziert (übrig sind Effektfarben wie Seltenheitsleuchten und Glut). Doppelte Blöcke zusammengeführt (Runensteine, Reiter, Überschriften). Ochsenblut-Rot wurde Aubergine mit Messingkante, das Stufensiegel ist Messing.
- Grafiken: `scripts/make-art-2.mjs` erzeugt Hintergrund (`bg-dark.jpg`), Kartenfläche (`slate.jpg`), Messingrahmen, Ornament, Logo (W20) sowie die Landschaften `hero.jpg`, `camp-0…2.jpg` und `side-night.jpg`. Es sind stilisierte Vektorlandschaften, keine gemalten Bilder; fremde Motive werden nicht verwendet.
- Tests: 363 von 363 bestanden.

## Phase 2: Dashboard (fertig)

- Start: Beim Öffnen erscheint die Startseite (`U.HUB`). Wer in dieser Browsersitzung schon im Spielbereich war, bleibt dort auch nach dem Neuladen (`sessionStorage` `charbogen-view`).
- `src/views/hub.js` mit diesen Bereichen:
  - Home
  - Meine Kampagnen
  - Charaktere
  - Regeln & Wissen (das Wiki)
  - Rundenplanung
  - Einstellungen (Sprache, Einheiten, Darstellung, Spielleitungsmodus, Sicherung)
- Suche über Charaktere, Kampagnen und den Katalog.
- `src/campaigns.js`: Kampagnen als echte Daten (localStorage `charbogen-campaigns`, Teil der Sicherungsdatei).
  - Felder: Name, Beschreibung, Status aktiv/archiviert, Charaktere, optional Live-Raumcode, nächster Termin, gespielte und geplante Sessions.
  - „Zum Live-Tisch“ öffnet den zugeordneten Charakter und betritt den Raum.
  - Wird ein Charakter gelöscht, verschwindet er aus allen Kampagnen.
- Schnellzugriff:
  - Regelwerk
  - Charakter erstellen (mit Assistent)
  - Charakter importieren (öffnet die vorhandene Dateiauswahl für JSON und PDF in Einrichten)
  - Kampagne erstellen
  - Inventar
  - Live-Tisch bzw. Spielleitung
- Bewusst weggelassen:
  - Würfeln (frühere Entscheidung der Gruppe: kein Würfeln im Bogen)
  - Community, Forum und Benachrichtigungen (gibt es nicht)
- Spielbereich: Knopf „Übersicht“ im Kopf (auch im Spielleitungsmodus) führt zurück.
- Tests: `tests/hub.spec.js` (8 Tests). Bestehende Tests starten über die Option `hub` im Test-Fixture direkt im Spielbereich. Gesamt 371 von 371 bestanden.
- Nebenbei behoben: „Entfernen“ in der Gruppenkasse verlor seine Bestätigung, weil jeder Klick sie zurücksetzte.

## RealmCraft: Originalgrafiken (16.11.2026)

- Quelle:  (nicht im Repository, Originale bleiben dort). Übernahme mit  nach  (branding, campaigns, dashboard, textures, ornaments). Ablage unter  statt , weil Vite nur so die Bilder in die Einzeldatei einbettet. Alle als WebP; Transparenz bei Branding, Ornamenten und Pergament.
- Branding: Monogramm „RC“ (Seitenleiste oben, am Handy im Kopf) und Schriftzug „RealmCraft“ (darunter; Text für Screenreader im h1). Beide Originale sind schwarz auf weiß, das Skript macht Weiß transparent und färbt in Messing.
- Kampagnen: sechs Illustrationen (castle-sunset, castle-valley, fortress-storm, river-city, dungeon-vault, forest-ruins), im Kampagnenformular wählbar (Feld  0–5).
- Dashboard: Willkommensbild = castle-sunset (größer), Seitenleiste = Ausschnitt aus river-city.
- Textur: Pergamentblatt mit Rissrand als border-image (Ecken unverzerrt) für Willkommensbereich und Schnellzugriff.
- Ornamente: vier goldene Trennlinien (Seitenleiste, Willkommensbereich, Zitat).
- Nicht verwendet: Bannerband und „Aktive Gruppe“-Entwurf aus Ornaments (Porträts dort sind Beispielfiguren, Ordner Characters ist leer). Die Gruppenübersicht ist mit echten Daten nachgebaut (Porträt, Klasse, Stufe, TP aus dem gespeicherten Bogen).
- Ersetzt und entfernt: die selbst erzeugten hero.jpg, camp-0…2.jpg, side-night.jpg, logo.svg.
- Startseite: „Deine Gruppe“ statt großer Charakterkarten; Schnellzugriff Charaktere, Regelwerk, Inventar, Notizen, Kampagne erstellen, Import, Live-Tisch. Eine Weltkarte gibt es nicht.
- Tests: 371 von 371 bestanden. Einzeldatei 6,2 MB (vorher 5,0 MB).

## Offen

- Phase 3 (Charakterbogen): Die im Auftrag erwähnte zweite Referenz für den Charakterbogen liegt noch nicht vor.
- Phase 4 (Inventar, Wiki, Notizen, übrige Ansichten) und Phase 5 (Rendering per Abgleich statt `innerHTML`, `events.js` aufteilen).
- Kampagnen werden nicht online gespeichert (nur Gerät und Sicherungsdatei).
