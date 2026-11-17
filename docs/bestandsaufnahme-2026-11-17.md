# Bestandsaufnahme RealmCraft (17.11.2026, nach Umsetzung der Etappen 1–4)

Grundlage für den nächsten, zusammenhängenden Design- und Umsetzungsauftrag. Stand: Commit 06de4d5 (plus CLAUDE.md-Nachtrag). In diesem Schritt wurde kein Produktivcode geändert.

## 1. Rundgang und Screenshot-Sammlung

**Erstellung**
- Playwright-Rundgang durch den lokalen Build `dist/charakterbogen.html` mit dem Skript `.cache/tour.mjs`.
- Testdaten in einem frischen Browserprofil:
  - Charakter Mirelle (Klerikerin 5)
  - Spielerkampagne „Grenzland“ (eigener Stand, Raum QW3RT9)
  - Spielleiterkampagne „Die letzte Bastion“ mit Orten, Personen, Sitzung, Begegnung, Händler und laufendem Kampf
- Supabase und aidedd sind gesperrt. Darum ist die Weltkarte leer, und der Live-Raum ist nachgebaut (`window.__liveFake`).
- Echte Spielstände bleiben unberührt.

**Ablage**
- `screenshots/bestand-2026-11-17b/` (lokal, wie alle Screenshot-Ordner nicht im Repository).
- Je Seite `-desktop.png` (1440 px) und `-handy.png` (390 px), ganze Seite: 76 Bilder.
- Liste aller Bilder: `liste.txt`.

| Ordner | Inhalt |
|---|---|
| `1-global` | Dashboard, Kampagnen, Spielleiterbereich, Charakterbibliothek, Weltkarte, Regeln (Wiki), Einstellungen, Beitreten |
| `2-kampagne-spieler` | Lagebericht, Gruppe, Kampf (Vorbereitung), Erkundung, Inventar & Handel, Chronik; Lagebericht und Gruppe mit Live-Verbindung |
| `3-charakter` | Profil, Werte & Fähigkeiten, Inventar, Zauber, Notizen, Bearbeiten |
| `4-spielleitung` | Lagebericht, Gruppe/Live-Tisch, Erkundung/Atlas, Beute & Handel, Chronik/Kampagnenbuch, Begegnungen, Spickzettel, Wiki, Einrichten |
| `5-kampf` | Spielleitung: Gegner am Zug, Eingreifen (Gegner ausgewählt), Spieler am Zug; Spieler: eigener Zug, Reiter Bonusaktion, Reiter Bewegung |
| `6-dialoge` | Stufenaufstieg |

**Kontaktabzug** (alle Seiten als Vorschaubilder, oberer Ausschnitt):
- `kontaktabzug-desktop.jpg`
- `kontaktabzug-handy.jpg`

## 2. Seitenübersicht mit Stand gegenüber dem Konzept

Zeichen:
- ✓ entspricht dem Konzept (Fassung 4)
- ◐ teilweise
- ✗ noch alte Gestaltung

| Bereich | Seite (Reiter/Abschnitt) | Ebene, Rolle | Stand | Kurzbefund |
|---|---|---|---|---|
| Global | Dashboard (`home`) | Startseite | ✓ | Referenz-Dashboard: Seitenleiste, Pergament-Willkommen, Kampagnenkarten, Schnellzugriff |
| Global | Kampagnen (`camps`), Spielleiterbereich (`gm`) | Startseite | ✓ | Kampagnenkarten mit Bild, Rolle, Fortschritt |
| Global | Charakterbibliothek (`chars`) | Startseite | ◐ | Karte mit Ring und „Spielen“; noch nicht die Heldenarchiv-Akte aus M5 (Kampagnenbild oben, je Kampagne eine Zeile mit Stufensiegel) |
| Global | Weltkarte (`map`), Regeln (`wiki`), Einstellungen, Beitreten | Startseite | ✓ / ◐ | im Hub-Stil; das Wiki nutzt dieselbe Liste wie im Spielbereich |
| Kampagne Spieler | Lagebericht (`cover`) | Kampagne | ◐ | Titelplatte mit Band ✓, Ort auf Pergament ✓, Tafeln ✓. Es fehlen die goldene Hauptaktion, Porträtringe bei „Nächste Sitzung“, die Gruppe auf Pergament und das Zitat |
| Kampagne Spieler | Gruppe (`party`) | Kampagne | ✗ | Mitgliederkarten im alten Kartenstil |
| Kampagne Spieler | Kampf (`main`) | Kampagne | ✓ / ✗ | laufender Kampf nach M3b ✓; Vorbereitung (ohne laufenden Kampf) zeigt den alten Kampfbogen (`vMain`) |
| Kampagne Spieler | Erkundung (`explore`) | Kampagne | ✗ | Atlas als einfache Liste und Textfläche |
| Kampagne Spieler | Inventar & Handel (`trade`) | Kampagne | ✗ | alte Karten (Geld, Gruppenkasse, Händler, Einkaufen) |
| Kampagne Spieler | Chronik (`chron`) | Kampagne | ✗ | Zeitleiste in Karten, kein Buch (M4) |
| Charakter | Profil (`prof`) | Charakter | ◐ | Titelplatte, Ring, Stufensiegel, Gold-Aufstieg, Kampfwerte nach Schriftstufen ✓. Es fehlen die Attribut-Medaillons, die Angriffstabelle auf Pergament und die Kästchen für Plätze |
| Charakter | Werte & Fähigkeiten (`stats`) | Charakter | ◐ | Medaillons ✓, Fertigkeiten auf Pergament ✓; Seitenwerte noch alte Schrift |
| Charakter | Inventar (`inv`) | Charakter | ◐ | dreispaltig mit Messingrahmen und Figur; Beschriftungen gedämpft |
| Charakter | Zauber (`spells`) | Charakter | ◐ | Konzentrationsbanner, Grade mit Kugeln; Zauberkarte noch nicht wie die Detailkarte aus M3b |
| Charakter | Notizen (`notes`) | Charakter | ✓ | Pergamentseite, Vorlagen |
| Charakter | Bearbeiten (`setup`) | Charakter | ✗ | alte Formularkarten |
| Spielleitung | Lagebericht (`cover`) | Kampagne, Spielleitung | ◐ | wie bei Spielern, dazu die Werkzeugleiste (alte Formularoptik) |
| Spielleitung | Gruppe/Live-Tisch (`dmlive`) | Kampagne, Spielleitung | ✗ | Raumcode, Mitgliederkarten, Handouts im alten Stil |
| Spielleitung | Erkundung/Atlas, Beute & Handel, Kampagnenbuch (`dmnotes`) | Kampagne, Spielleitung | ✗ | alte Karten; das Kampagnenbuch ist kein Buch |
| Spielleitung | Begegnungen, Spickzettel, Wiki, Einrichten | Kampagne, Spielleitung | ✗ / ◐ | Unterleiste als Marken; Spickzettel auf Pergament ✓ |
| Kampf | Spielleitung: Gegner am Zug, Eingreifen, Spieler am Zug | Kampagne, Spielleitung | ✓ | M3a und M3c mit Zeitstempel und Geheimhaltung; Vorbereitung (`prep3`) noch alt |
| Kampf | Spieler: eigener Zug | Kampagne, Spieler | ✓ | M3b: Karten, Ressourcen, Reiter, Statusspalte; Standardaktionen als lange Liste statt kompakter Marken |
| Dialoge | Stufenaufstieg, Übernahme, Bogen ansehen, Ziel wählen | überall | ◐ | Pergament-Dialog mit Messingrahmen; Entscheidung B (dunkle Dialoge, Pergament nur zum Lesen) noch nicht umgesetzt |

## 3. Technische Übersicht

### 3.1 Navigation

- **Global (Startseite):** linke Seitenleiste `.hub-side` mit Monogramm, Schriftzug, Bereichen und Bild. Am Handy wird daraus eine obere Leiste mit Reitern (`views/hub.js`).
- **Kampagne:** Brotkrumen `vCrumbs()` mit Ebene und Rolle, Titelplatte (`header.hd`), waagrechte Reiter `navTabs()` (Spieler `CAMP_P`, Spielleitung `CAMP_DM`).
  - Unterleiste im Kampf der Spielleitung: `vDmSub()`.
  - Am Handy feste Leiste unten mit allen Reitern.
- **Charakter:** Brotkrumen, Titelplatte, ab 900 px seitliche Navigation (`.charlayout`), am Handy die Leiste unten.
- **Immer da:**
  - Kurzleiste beim Scrollen (`vMiniBar`, `vDmBar`)
  - Live-Leiste `#live-dock` (unten rechts, fest)
  - Toast oben in der Mitte
- **Abweichung:** Das Konzept (Entscheidung C) sieht die schmale globale Leiste auf allen Ebenen vor. Heute gibt es sie nur auf der Startseite.

### 3.2 CSS-Schichten (Reihenfolge der Ladung)

| Datei | Umfang | Aufgabe |
|---|---|---|
| `tokens.css` | 58 Zeilen | Farben, Schriften, Abstände, Flächen (`--surface-*`), Rahmen (`--frame`), Verläufe; einzige Quelle |
| `styles.css` | 547 Zeilen, ca. 530 Regeln | Grundaufbau aus der Zeit vor RealmCraft (Raster, Formulare, `.btn`, `.card`, `.row`, `.dlg`) |
| `theme.css` | 541 Zeilen, ca. 490 Regeln | Grimoire-Optik (Kopf, Knöpfe, Pergament-Dialoge, Live-Leiste) |
| `areas.css` | 666 Zeilen, ca. 650 Regeln | RealmCraft-Startseite (`hub-*`), Bereiche `html[data-area="hub"|"char"|"play"]`, Lagebericht, Atlas, Kampf (Stufe 4) |
| `realm.css` | 248 Zeilen, ca. 260 Regeln | Fassung 4: Ornamente, Schriftstufen, Gold, Titelplatten, Kampf (M3), Heldenakte |
| `skins.css` | 161 Zeilen | alternative Darstellungen „plain“ und „modern“ (nur im Spielbereich) |

Etwa 2.000 Regeln verteilen sich auf fünf Schichten. Viele Bausteine sind mehrfach überschrieben: `.btn` in styles, theme, areas (Sechseckform im Charakterbereich) und realm (Gold).

### 3.3 Tokens und Schriften

- **Palette:**
  - Anthrazit `--c-anth-1…4`, Aubergine `--c-aub*`, Braun, Pergament `--c-parch*`, Messing `--c-brass*`, Creme `--c-cream*`
  - Status `--st-bad/good/conc/res`
  - neu die Schriftstufen `--t-val/name/sub/lbl-d|p`
- **Schriften** (lokal eingebettet): Cormorant Garamond (Titel, Werte), Alegreya (Text, Bedienung), Cinzel (Kapitälchen-Beschriftungen).
- **Lücke:** Viele Seiten nutzen für Werte noch `--c-cream-mute` (`.lbl`, `.note`, `small`). Das ist die gedämpfte Farbe, die laut Konzept nicht für Werte gedacht ist.

### 3.4 Hintergründe, Texturen, Ornamente

| Grafik | Herkunft | Eingesetzt |
|---|---|---|
| Pergament mit Rissrändern `textures/parchment-sheet.webp` | Design-Eingang | Hub-Pergament, Lagebericht-Ort, Fertigkeiten, Notizen, Kampf-Aktionen |
| Aubergine `textures/aubergine.webp`, Marmor `textures/dark.webp` | Design-Eingang (Etappe 1) | Titelplatten, Kampfleiste, „Am Zug“; Marmor noch nirgends |
| Eckfiligran `ornaments/corner.webp` | Design-Eingang | Titelplatten (nur links), Kampfleiste, „Am Zug“ (oben) |
| Band `ornaments/banner.webp` | Design-Eingang | Kapitel in der Titelplatte |
| Trenner `divider-1…4`, `divider-small`, senkrechte Zierleiste `vertical` | Design-Eingang | Hub, Lagebericht, Tafeln; die Zierleiste wird nirgends genutzt |
| Kampagnenbilder (6), Burgpanorama, Seitenleistenbild, Monogramm, Schriftzug | Design-Eingang | Hub, Titelplatten |
| `bg-dark.jpg`, `slate.jpg`, `parchment.jpg`, `frame-brass.svg`, `flourish-gold.svg` | erzeugt (`make-art`) | Seitenhintergrund, Kartenfläche, Messingrahmen `--frame`, Überschrift-Schnörkel |
| `leather.jpg`, `stone.jpg`, `wood.jpg`, `backdrop.jpg`, `frame.svg`, `flourish.svg` | erzeugt, älteres Grimoire | Variablen zeigen inzwischen auf Schiefer; Dateien liegen ungenutzt im Paket |
| `icons.png` (Shikashi) | Fremdpaket CC BY | Spielinhalte und Reitersymbole der Kampagnen- und Charakterebene |

### 3.5 Wiederverwendbare Bausteine

**Alt:**
- `.card` (60×), `.row` (35×), `.lbl` (103×), `.ov-h`, `.btn` (206×)
- `.chip` (79×), `.tag` (41×), `.dlg`/`.ovl` (15× bzw. 6×), `.pips`, `.lvh` (Gradkopf), `.qty`

**Startseite:**
- `.hbtn` (Sechseck), `.hub-panel` (Messingrahmen, `.orn` mit Ornament oben)
- `.hub-parch`/`.hub-doc` (Pergament), `.hub-h`, `.hub-div.d1–d4`

**Fassung 4:**
- Schriftstufen `.rc-l/.rc-v/.rc-n/.rc-s/.rc-dt`, Materialien `.rc-aub/.rc-dark`
- Ornamente `.rc-co`, `.rc-ribbon`, `.rc-sep`, `.rc-act`, `.rc-cur/.rc-sel/.rc-flag`
- `.btn.gold`
- Kampf: `.dm-row.uc`, `.pcc`, `.turnp/.tp-*`, `.arow`, `.ein`, `.econ`, `.tabs2`, `.stamp/.staleb`, `.f3-feed`

**Schon konzeptgemäß** und als Vorlage für die übrigen Seiten geeignet:
- `hub-panel`, `hub-parch`
- Titelplatte `header.hd`
- `.rc-*`
- die Kampfkarten
- `.turnp` (Tafel mit Aubergine-Kopf)
- `.arow` (Tabelle mit Wert und Zusatz)
- `.econ`, `.tabs2`

**Alte Muster, die noch überwiegen:**
- **Formular- und Listenkarten:** `.card` mit `.row`, gedämpfte `.lbl`-Beschriftungen, `h2` mit Schnörkel als Seitenüberschrift.
- **Dialoge:** Pergament-Dialoge mit SVG-Messingrahmen für alles; Entscheidung B wäre dunkel und nur Lesedialoge auf Pergament.
- **Reitersymbole:** Shikashi-Bilder statt Liniensymbolen (Entscheidung D).
- **Knöpfe:** in drei Formen (rechteckig `.btn`, Sechseck `.hbtn`/Charakterbereich, Gold).

## 4. Abweichungen zwischen App und freigegebenem Konzept

Jeweils Priorität für den nächsten Auftrag (**H** hoch, **M** mittel, **N** niedrig).

**Rahmen und Navigation**
1. **H – Kopfbereich am Handy:** Die Titelplatte mit allen Knöpfen (Startseite, Regeln, Rasten, Sprache, Einheiten) füllt auf jeder Kampagnen-, Charakter- und Spielleitungsseite den ersten Bildschirm. M6 sieht eine schmale Kopfleiste mit Monogramm und eine kompakte Titelplatte vor; die Knöpfe gehören in ein Menü.
2. **H – Globale Leiste:** Sie fehlt auf Kampagnen- und Charakterebene; dort gibt es nur Brotkrumen und Kopfknöpfe (Entscheidung C, M1/M2).
3. **M – Reitersymbole:** Kampagnen- und Charakterreiter nutzen illustrierte Symbole statt Liniensymbolen (Entscheidung D).
4. **M – Live-Leiste und Toast:** Beide liegen am Desktop und am Handy über Inhalten, in den Screenshots unter anderem über „Am Zug“ und dem Lagebericht. Die Live-Leiste braucht im Kampf einen festen Platz oder sollte entfallen, weil Zug und Vorschläge jetzt im Kampfbereich stehen.

**Seiten**

5. **H – Chronik:** Spieler und Spielleitung haben noch kein Buch (M4). Es fehlen Deckel, Lesezeichen, Doppelseite, Siegel „geteilt“ und die abgesetzte private Notiz der Spielleitung.
6. **M – Lagebericht (M1):** Gold-Hauptaktion („Zum Kampf“ bzw. „Sitzung starten“), Porträtringe bei „Nächste Sitzung“, Gruppe auf Pergament und Zitat fehlen. Der Statusblock (Aktiv, Rolle, Sitzungen) steht als eigene Tafel statt in der Titelplatte.
7. **M – Heldenakte (M2):**
   - Medaillons fehlen auf der Profilseite (nur kleine Kästen).
   - „Gerüstet“ und Angriffe stehen nicht als Tabelle auf Pergament.
   - Plätze haben keine Kästchen.
   - Die seitliche Navigation ist noch keine Lesezeichenleiste.
8. **M – Heldenarchiv (M5):** Es fehlen Kampagnenbild oben, die Zeilen je Kampagne mit Stufensiegel und TP und die Akte „Neuer Held“ auf Pergament.
9. **M – Alte Kartenoptik (✗):** Gruppe, Erkundung/Atlas, Inventar & Handel, Live-Tisch, Beute, Begegnungen, Einrichten und Bearbeiten nutzen weiterhin `.card`/`.row` ohne Materialien und Schriftstufen.

**Kampf**

10. **M – Vorbereitung:** Spieler sehen den alten Kampfbogen, die Spielleitung die alte dreispaltige Vorbereitung.
11. **N – Spielerzug:**
    - Standardaktionen stehen als lange Liste mit Knöpfen statt kompakter Marken.
    - Zauberdetails öffnen die bestehende Zauberkarte; Felder wie Ziele, Bereich, Rettungswurf und Schaden sind nicht einheitlich aufgeführt, weil sie bei Zaubern mit Grad nur im Text stehen.
12. **N – Spielleitung, Spieler am Zug:** Der Zugstatus des Spielers (Aktion, Bonusaktion, Reaktion) fehlt. Dafür bräuchte es ein neues Presence-Feld; das ist freigabepflichtig.

**Gestaltung allgemein**

13. **M – Dialoge:** Entscheidung B (dunkel, Pergament nur zum Lesen) ist noch nicht umgesetzt; Stufenaufstieg und Bogen ansehen sind Pergament.
14. **M – Schriftstufen:** Sie gelten erst für Kampf, Profil-Kampfwerte und Lagebericht. Auf den übrigen Seiten stehen Werte und Beschriftungen noch in der gedämpften Farbe.
15. **N – Ornamente:**
    - Senkrechte Zierleiste und Marmorfläche sind nirgends eingesetzt.
    - Eckfiligran nur links an den Titelplatten.
    - `.rc-sep` erst auf dem Lagebericht.
16. **N – Altlasten:** Die ungenutzten erzeugten Texturen (Leder, Stein, Holz, `backdrop`, `frame.svg`, `flourish.svg`) liegen noch im Paket. `skins.css` (plain/modern) ist an die neue Gestaltung nicht angepasst.
17. **N – Knöpfe:** Drei Knopfformen nebeneinander. Vorschlag: Sechseck (`hbtn`) überall, Gold nur für Hauptaktionen.

**Grenzen der Bestandsaufnahme**
- Weltkarte (aidedd) und Supabase waren gesperrt.
- Der Live-Raum ist nachgebaut; ein Test mit zwei echten Geräten steht weiter aus (`docs/testplan-zwei-geraete.md`).

## 5. Vorschlag für den nächsten Auftrag

1. Rahmen: schmale globale Leiste auf allen Ebenen und kompakte Titelplatte am Handy (Punkte 1–4).
2. Gemeinsame Bausteine ersetzen die alte Kartenoptik (`.card`/`.row` auf `hub-panel`, Schriftstufen, Knopfform, dunkle Dialoge): Punkte 9, 13, 14, 17.
3. Seiten in dieser Reihenfolge: Chronik als Buch, Lagebericht und Gruppe, Heldenakte und Archiv, dann Erkundung, Handel und die Werkzeuge der Spielleitung.
4. Aufräumen der Altlasten (Punkt 16) am Ende, nach Freigabe.
