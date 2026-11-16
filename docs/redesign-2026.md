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

- Quelle: `RealmCraft/Design-inbox` (nicht im Repository, steht in `.gitignore`; Originale bleiben dort). Übernahme mit `python -I scripts/import-realmcraft.py` nach `src/assets/realmcraft/` (branding, campaigns, dashboard, textures, ornaments). Ablage unter `src/` statt `public/`, weil Vite nur so die Bilder in die Einzeldatei einbettet. Alle als WebP; Transparenz bei Branding, Ornamenten und Pergament.
- Branding: Monogramm „RC“ (Seitenleiste oben, am Handy im Kopf) und Schriftzug „RealmCraft“ (darunter; Text für Screenreader im h1). Beide Originale sind schwarz auf weiß, das Skript macht Weiß transparent und färbt in Messing.
- Kampagnen: sechs Illustrationen (castle-sunset, castle-valley, fortress-storm, river-city, dungeon-vault, forest-ruins), im Kampagnenformular wählbar (Feld `art` 0–5).
- Dashboard: Willkommensbild = castle-sunset (größer), Seitenleiste = Ausschnitt aus river-city.
- Textur: Pergamentblatt mit Rissrand als border-image (Ecken unverzerrt) für Willkommensbereich und Schnellzugriff.
- Ornamente: vier goldene Trennlinien (Seitenleiste, Willkommensbereich, Zitat).
- Nicht verwendet: Bannerband und „Aktive Gruppe“-Entwurf aus Ornaments (Porträts dort sind Beispielfiguren, Ordner Characters ist leer). Die Gruppenübersicht ist mit echten Daten nachgebaut (Porträt, Klasse, Stufe, TP aus dem gespeicherten Bogen).
- Ersetzt und entfernt: die selbst erzeugten hero.jpg, camp-0…2.jpg, side-night.jpg, logo.svg.
- Startseite: „Deine Gruppe“ statt großer Charakterkarten; Schnellzugriff Charaktere, Regelwerk, Inventar, Notizen, Kampagne erstellen, Import, Live-Tisch. Eine Weltkarte gibt es nicht.
- Tests: 371 von 371 bestanden. Einzeldatei 6,2 MB (vorher 5,0 MB).

## Visuelle Überarbeitung nach der Vorlage (16.11.2026)

Vergleich Vorlage ↔ Stand vorher, jeweils behoben:
- Kopfzeile: Die Suche hat jetzt einen Messingrahmen (`--frame`), und eine Ornamentlinie (divider-4) läuft bis zum Profil (vorher ein schlichter Kasten).
- Willkommensbereich: Das Burgbild nimmt jetzt etwa 70 % ein, mit mehrstufig weichem Übergang ins Pergament; der zweite Knopf ist dunkel statt hell auf Pergament.
- Kampagnenkarten: Die Illustration füllt die Karte, der Text steht auf einem dunklen Verlauf. Es gibt einen Messingrahmen mit Ecken, den Status oben, einen goldenen Fortschrittsbalken und „Spielen“ als Hauptknopf; Bearbeiten und „Session gespielt“ sind Symbolknöpfe. Auch der leere Zustand ist bildfüllend.
- Abschnittsüberschriften mit Goldlinie bis „Alle anzeigen“.
- Panels (nächste Session, Gruppe) mit Zierornament (divider-3) oben am Rahmen.
- Seitenleiste: Das Bild ist größer und weich eingeblendet, mit senkrechtem Ornament (divider-1) am rechten Rand.
- Pergament (Original mit Rissrand, `border-image`) jetzt auch für das Kampagnenformular und die Rundenplanung (`.hub-doc`), zusätzlich zu Willkommensbereich und Schnellzugriff.
- Am Handy werden Ornamente, die über den Rand ragen, ausgeblendet (vorher 14 px Querscrollen).
- Behoben: Die Bildauswahl im Formular lag hinter dem Pergament und war nicht anklickbar.
- Tests: 372 von 372 bestanden (neu: Handybreite ohne Querscrollen, Bilder eingebettet). Beide Builds erfolgreich, Einzeldatei 6,6 MB.

## Offen

- Phase 3 (Charakterbogen): Die im Auftrag erwähnte zweite Referenz für den Charakterbogen liegt noch nicht vor.
- Phase 4 (Inventar, Wiki, Notizen, übrige Ansichten) und Phase 5 (Rendering per Abgleich statt `innerHTML`, `events.js` aufteilen).
- Kampagnen werden nicht online gespeichert (nur Gerät und Sicherungsdatei).
