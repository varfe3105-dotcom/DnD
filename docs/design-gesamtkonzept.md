# RealmCraft – Gestaltung als Gesamtanwendung (Analyse und Vorschlag zur Abstimmung)

Stand 17.11.2026. Grundlage: „RealmCraft – Übergreifendes Design- und UI-Konzept“ des Nutzers und das bestehende Dashboard als Qualitätsreferenz.

**Noch nichts davon ist im Code umgesetzt.** Die Mockups liegen als eigene Entwurfsseite in `design/mockups/index.html`; sie nutzen die echten Tokens und Grafiken, sind aber nicht Teil der App.

- Screenshots des Ist-Zustands: `screenshots/bestand-2026-11-17/` (25 Seiten, Desktop `-d` und Handy `-m`)
- Mockups: `screenshots/design-mockups/`

## 1. Grafiken: vorhanden, ungenutzt, fehlend

| Grafik | Datei | heute genutzt | Vorschlag |
|---|---|---|---|
| Logo, Monogramm | `branding/wordmark.webp`, `monogram.webp` | Seitenleiste der Startseite, Kopf mobil | zusätzlich oben in der schmalen globalen Leiste (alle Ebenen) |
| Burgpanorama | `dashboard/hero.webp` | Begrüßung Startseite | bleibt nur auf der Startseite (stärkster Hintergrund) |
| Seitenleistenbild | `dashboard/sidebar.webp` | Fuß der Seitenleiste | bleibt |
| 6 Kampagnenbilder | `campaigns/*.webp` | Kampagnenkarten, Kopf von Kampagne und Charakter | **Kampagnenbanner** (Lagebericht, Kampf), Hintergrund im Charakterkopf, Orte in Erkundung (Stadt, Wald/Ruinen, Verlies) |
| Pergament | `textures/parchment-sheet.webp` | Begrüßung, Formular, Fertigkeiten, Tagebuch, Wiki-Text | Ortsbeschreibung, Chronikseite, Beschreibung im Profil, Regeltexte; nie für Navigation oder Statusflächen |
| Ornamentleisten 1–4 | `ornaments/divider-*.webp` | Seitenleiste, Panels, Überschriften der Startseite | nur an Abschnittsübergängen (Startseite, Profil, Chronik), nicht in Listen |
| Messingrahmen | Token `--frame` | Panels, Karten | Karten mit Hauptinhalt, Initiativeleiste, Chronikbuch |
| **Banner mit Eckornamenten** (Aubergine) | Original `Design-inbox/Ornaments/…(3)` | **ungenutzt** | Kopf des Spielleiterbereichs oder Titelband der Chronik; Übernahme über `scripts/import-realmcraft.py` |

**Fehlen (neue Grafiken nötig, wenn gewünscht):**

| Bedarf laut Konzept | Zweck | Ersatz, bis sie da sind |
|---|---|---|
| Ledertextur (dunkelbraun, zurückhaltend) | globale Leiste, Buchrücken der Chronik und der Regeln | Anthrazit-Verlauf aus den Tokens |
| Steintextur (dunkel) | Hintergrund Kampf und Verlies-Orte | dunkle Fläche |
| Einzelnes Eckornament, transparent | Ecken wichtiger Karten (Lagebericht-Ort, Chronikseite) | Messingrahmen `--frame` |
| Wappen/Heraldik (etwa 6 Varianten) | Kennzeichen je Kampagne in Karten und Bannern | Kampagnenbild als Ausschnitt |
| Siegel/Medaillon (Messing) | Status „geteilt“, Stufe, Raum verbunden | Marken `.tag` |
| Ortsillustrationen (Taverne, Stadt, Wald, Höhle, Ruine, Burg) | Erkundung/Atlas je Ort | die 6 Kampagnenbilder |
| Charakterporträts | Profil, Gruppe, Kampf | **nur hochgeladene Porträts**; sonst Initiale im Messingring (keine erfundenen Gesichter) |
| Kreaturbilder | Kampf | vorhandene Kreatursymbole je Typ |

Die neuen Grafiken würdest du wie bisher erzeugen und in den Design-Eingang legen. Ich übernehme sie mit dem Importskript.

## 2. Gesamtaufbau (alle Ebenen)

- **Globale Leiste**:
  - Desktop: schmale Leiste (76 px) mit Monogramm und Symbolen für Start, Kampagnen, Leiten, Helden, Karte, Regeln, Optionen. Auf der Startseite bleibt die breite Seitenleiste.
  - Tablet: dieselbe schmale Leiste.
  - Handy: Leiste unten mit fünf Zielen und „Mehr“.
  - Heute verschwindet die globale Navigation, sobald man in einer Kampagne ist. Das ist die größte Abweichung vom Konzept (Abschnitt 3.1).
- **Kopf jeder Seite:** Brotkrumen klein und zurückhaltend, darunter das Banner der Ebene.
  - Kampagne: Kampagnenbild mit dunkler Abdunklung nach unten, ohne Farbverlauf hinter dem Namen.
  - Charakter: Porträt im Messingring vor dem Kampagnenbild.
- **Navigation der Ebene:**
  - Kampagne: Reiter unter dem Banner, aktiv mit Messinglinie.
  - Charakter: senkrechte Lesezeichenleiste links.
  - Handy: Leiste unten.
- **Inhalt:** dunkle Grundfläche; Pergament nur für Texte zum Lesen; Messingrahmen nur für den Hauptinhalt einer Seite.

## 3. Seiten: Ist, Ziel, Aufwand

| Seite | Ist | Ziel (Hintergrund · Textur · Ornament · Bausteine) | Aufwand |
|---|---|---|---|
| Startseite | Referenz, gut | unverändert; Überschrift „Wiki“ im Bereich Regeln heißt dort falsch | klein |
| Kampagnen, Spielleiterbereich | Karten wie die Startseite | Spielleiterbereich mit Bannerband (vorhandene Grafik) und Wappen, sobald vorhanden | klein |
| Beitreten | Pergamentformular | bleibt; Schrittanzeige 1 → 2 deutlicher | klein |
| Charakterbibliothek | Karten mit Kampagnenbild | **Heldenakte**: großes Porträt links, Kampagnenstände als Zeilen mit „Spielen“ (M5) | mittel |
| Einstellungen | Panel | bleibt funktional | – |
| **Kampagne · Lagebericht** | drei Köpfe übereinander (Brotkrumen, großer Kampagnenkopf, Lagekopf) | **ein Banner** mit Bild, Status, Kapitel und Hauptaktion; darunter Reiter; Ort auf Pergament, Aufgaben, Chronik, Seite mit Sitzung und Gruppe (M1) | **groß** |
| Gruppe | Porträtkarten | bleibt; Porträt größer, Werkzeuge der Spielleitung einklappbar | klein |
| **Kampf** | Funktion gut, Kopf drückt die Leiste nach unten | Kampfleiste mit Initiative **oben angeheftet**, Kreatursymbole in den Karten, Steinfläche optional (M3, M6b) | mittel |
| Erkundung/Atlas | Liste und Detail | Ortsbild oben im Detail, Text auf Pergament, Eckornament | mittel |
| Inventar & Handel | lange Liste ohne Gliederung (DM) | Schatzkammer: Gruppenkasse als Münzleiste, Händler als Karten, Beutegenerator einklappbar | mittel |
| **Chronik** | Zeitleiste auf dunklen Karten | **aufgeschlagenes Buch**: Sitzungsverzeichnis links (Leder), Seite rechts auf Pergament, Siegel „geteilt/privat“ (M4) | mittel |
| **Charakterkopf** | Aubergine-Verlauf über dem Bild, zu viele Knöpfe (Sprache, Einheiten, Startseite, Regeln, Aufstieg, Rasten) | Porträt im Ring, Name, Zeile, Kampagne; nur Rasten und Stufenaufstieg; Sprache/Einheiten in die Einstellungen (zurückgestellter Punkt) (M2) | **groß** |
| Profil, Werte, Inventar, Zauber, Notizen | Stufe 2, passt | nur angleichen (Knöpfe, Symbole) | klein |
| Bearbeiten | alte Grimoire-Gestaltung (`theme.css`) | funktional, aber neue Knöpfe und Felder | mittel |
| Notizbuch, Begegnungen, Spickzettel (Spielleitung) | alte Gestaltung | an Panels und Knöpfe der neuen Bausteine anpassen | mittel |
| Regeln & Wissen | dunkle Liste, Text auf Pergament (gut) | Archiv: Buchrücken-Leiste für Kategorien statt Chips | klein |
| Weltkarte | gut | bleibt | – |

## 4. Gefundene Inkonsistenzen

1. **Globale Navigation fehlt in Kampagne und Charakter** (Konzept 3.1). Man kommt nur über die Brotkrumen bzw. „Startseite“ zurück.
2. **Doppelte Köpfe** in der Kampagne: Brotkrumen, großer Kopf und Lagekopf zeigen Name und Status mehrfach. Am Handy kostet das über 400 px vor dem ersten Inhalt.
3. **Symbole gemischt:** Die Startseite nutzt Linien-Symbole, Reiter und Kurzleiste nutzen farbige Pixel-Symbole (Shikashi). Vorschlag: Linien-Symbole für alle Navigation, Pixel-Symbole nur für Gegenstände und Zauber.
4. **Drei Knopfarten:**
   - spitze Messingknöpfe der Startseite
   - ältere abgerundete Knöpfe (Bearbeiten, Notizbuch, Beute)
   - Chips
   Vorschlag: einheitlich spitz, drei Arten (Haupt, Neben, Gefahr).
5. **Hauptfarbe für Knöpfe:** Das Konzept will gedecktes Gold, die Startseite nutzt heute Aubergine (siehe Entscheidung A).
6. **Dialoge:** Das Konzept will dunkle Dialoge mit Messing, heute sind sie Pergament (siehe Entscheidung B).
7. **Charakterkopf** mit Farbverlauf hinter dem Namen (vom Konzept ausgeschlossen) und überladener Knopfleiste.
8. **Spielleitung ohne Bild:** Der Kopf hat ein ⚔-Zeichen statt Porträt.
9. **Handy-Leiste unten** mit 6 bis 7 Zielen, Beschriftungen abgeschnitten („Werte & …“). Vorschlag: höchstens 5 Ziele, dazu „Mehr“.
10. **Bereich Regeln** auf der Startseite heißt „Wiki“.
11. **Inventar & Handel der Spielleitung** ist eine lange Seite: Beutegenerator, Gruppenkasse und der Katalog magischer Gegenstände stehen offen untereinander.

## 5. Wiederkehrende Bausteine (Ziel)

| Baustein | Beschreibung | Einsatz |
|---|---|---|
| Globale Leiste | schmal, Monogramm, Linien-Symbole, aktiv mit Messing-Innenkante | alle Seiten außer Startseite (dort breit) |
| Brotkrumen | klein, Ebenenmarke links, Rollenmarke rechts | alle Seiten innerhalb einer Kampagne bzw. eines Charakters |
| Ebenenbanner | Bild, Abdunklung von unten, Name in Cormorant, Marken, eine Hauptaktion | Kampagne (Bild der Kampagne), Charakter (Porträt vor Kampagnenbild) |
| Reiter | Text, aktive Messingunterkante | Kampagne |
| Lesezeichenleiste | senkrecht, aktive Messing-Innenkante | Charakter |
| Panel / Panel mit Rahmen | dunkel; Rahmen `--frame` nur für Hauptinhalt | überall |
| Pergamentfläche | `border-image`, dunkle Tinte | Lesetexte |
| Marke `.tag` | rot, grün, blau, Messing, jeweils mit Zeichen ✕ ＋ ◇ (auch ohne Farbe verständlich) | Zustände, Wirkungen, Status |
| TP-Balken | grün, gelb, rot nach Anteil | Gruppe, Kampf, Profil |
| Initiativeleiste | angeheftet, aktiver Zug golden, nächster gestrichelt | Kampf (Spielleitung und Spieler) |
| Mitgliedskarte | Porträt, Name, Werte, Marken, Aktionen | Gruppe, Kampf |
| Dialog | eine Gestaltung für alle (Entscheidung B), Schließen per Knopf, Escape und daneben | überall |
| Knöpfe | spitz; Haupt (Entscheidung A), Neben (dunkel mit Messingkante), Gefahr (rot) | überall |
| Handy-Leiste unten | 5 Ziele + „Mehr“, Linien-Symbole | Kampagne und Charakter am Handy |

## 6. Bildschirmgrößen

- **Desktop:** schmale globale Leiste, Banner etwa 250 px hoch, mehrspaltig.
- **Tablet (bis 1100 px):**
  - globale Leiste bleibt schmal
  - Lagebericht zweispaltig wird einspaltig mit Seitenbereich darunter
  - im Kampf Gruppe und Gegner als Reiter
- **Handy (bis 520 px):**
  - Kopfzeile 44 px mit Monogramm, Kampagnenname und Rolle
  - Banner nur 150 px
  - Leiste unten mit 5 Zielen
  - Kampf: Initiativeleiste angeheftet, „Zug beenden“ bzw. „Nächster Zug“ immer erreichbar (M6b)

## 7. Offene Entscheidungen

- **A. Farbe der Hauptknöpfe:**
  - *Gold*, wie im Konzept (Mockups), oder *Aubergine*, wie das heutige Dashboard.
  - Empfehlung: **Gold**. Aubergine bleibt für aktive Navigation und Flächen.
  - Die Startseite würde dabei angeglichen.
- **B. Dialoge:**
  - *dunkel mit Messing*, wie im Konzept, oder *Pergament*, wie heute.
  - Empfehlung: **dunkel** für Aktionsdialoge (Kampf, Übernahme), **Pergament** nur für Lesedialoge (Handouts, „Bogen ansehen“).
- **C. Globale Leiste in Kampagne und Charakter** (schmale Leiste wie in M1 bis M5).
  - Empfehlung: **ja**.
- **D. Linien-Symbole für alle Navigation**, Pixel-Symbole nur für Gegenstände und Zauber.
  - Empfehlung: **ja**.
- **E. Neue Grafiken** (Leder, Stein, Eckornament, Wappen, Siegel, Ortsbilder) erstellst du, oder es bleibt bei den vorhandenen.
  - Empfehlung: zuerst ohne neue Grafiken umsetzen. Wappen und Eckornament wären der größte Gewinn, falls du welche erzeugst.

## 8. Vorschlag zur Reihenfolge (nach Freigabe)

1. Bausteine angleichen: Knöpfe, Dialoge, Symbole, Marken mit Zeichen.
2. Gerüst: globale schmale Leiste, Brotkrumen, Ebenenbanner, Handy-Leiste mit 5 Zielen (M1, M6a).
3. Kampagne: Lagebericht mit einem Kopf (M1), Kampf mit angehefteter Leiste (M3, M6b).
4. Charakterkopf entschlacken (M2), Bibliothek als Heldenakte (M5).
5. Chronik als Buch (M4), Atlas mit Ortsbild, Schatzkammer, Spielleitungsseiten im alten Stil.
6. Abschlussprüfung aller Seiten auf drei Bildschirmgrößen.

Nach jeder Stufe gibt es Tests, Screenshots und deine Abnahme.
