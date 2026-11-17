# RealmCraft – Gestaltung als Gesamtanwendung (Analyse und Vorschlag zur Abstimmung)

Stand 17.11.2026, **Fassung 2 nach Rückmeldung** (siehe Abschnitt 9; Abschnitte 1–8 sind die erste Fassung). Grundlage: „RealmCraft – Übergreifendes Design- und UI-Konzept“ des Nutzers und das bestehende Dashboard als Qualitätsreferenz.

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

## 9. Fassung 2 (nach Rückmeldung des Nutzers)

**Rückmeldung zu Fassung 1:** zu flach, zu technisch, zu viel Schwarz mit dünnen Rahmen. Die vorhandenen Elemente aus dem Design-Eingang waren kaum genutzt.

**Entscheidungen des Nutzers:**
- **A:** Gold nur für Hauptaktionen; Nebenaktionen in Aubergine oder dunkel mit Messingkante.
- **B:** Dialoge dunkel mit Messing; Pergament für Lesedialoge und längere Inhalte.
- **C:** schmale globale Leiste, aber lesbar (Symbol mit Beschriftung).
- **D:** Linien-Symbole für die Navigation; Spielinhalte behalten eigene Symbole.
- **E:** noch keine neuen Grafiken; erst alles Vorhandene prüfen und zuordnen.

### 9.1 Vollständige Bestandsaufnahme der Originale (`RealmCraft/Design-inbox`, 12 Dateien)

| Ordner | Datei | Inhalt | verwertbar |
|---|---|---|---|
| Branding | 2 Bilder | Monogramm (quadratisch), Schriftzug | ja, schon in der App |
| Campaigns | 6 Bilder | Burg im Sonnenuntergang, Burg im Tal, Festung im Sturm, Stadt am Fluss, Verlies, Waldruinen | ja, schon in der App; zusätzlich als Ortsbilder |
| Dashboard | 1 Bild | die Referenz selbst (Bildschirmentwurf) | nur als Vorlage, nicht ausschneidbar (enthält Texte und fremde Porträts) |
| Ornaments (2) | 1 Blatt | vier goldene W20-Ornamentleisten | ja, schon in der App (divider-1…4) |
| Ornaments (3) | 1 Blatt | Schwalbenschwanz-Banner (Aubergine, goldenes Eckfiligran), dunkle Seitenleistenfläche mit Rautentrenner und senkrechter Zierleiste, Muster-Panel „Aktive Gruppe“, Zitat mit Ornamenten | **teilweise neu gewonnen**, siehe 9.2 |
| Textures | 1 Bild | Pergament mit Rissrändern | ja, schon in der App |
| Characters | – | leer | – |

**Es gibt keine** Leder- oder Steintextur, keine Wappen und keine Siegel als Grafik, keine einzelnen Ortsillustrationen außer den sechs Kampagnenbildern und keine Charakterporträts. Die Porträts im Muster-Panel sind fremde Beispielgesichter und werden nicht verwendet.

### 9.2 Aus den Originalen gewonnen (`design/mockups/extract.py`, Originale bleiben unverändert)

| Element | Quelle | Einsatz |
|---|---|---|
| Goldenes Eckfiligran (transparent, viermal gespiegelt) | Ecke des Banners | Titelplatten (Kampagne, Heldenakte), Buchdeckel der Chronik, Zugkarte „Du bist am Zug“; klein (34 px) an der aktiven Initiative. Nie an Listen oder gewöhnlichen Karten. |
| Strukturierte Aubergine-Fläche | Innenfläche des Banners | Titelplatten, Chronikdeckel, Initiativeleiste, Randnotiz der Spielleitung, Handy-Titel. Ersetzt die Leder-Rolle der Konzeptvorlage. |
| Dunkle Marmorfläche | Seitenleiste des Blatts | globale Leiste, Lesezeichenleiste des Charakters, Handy-Kopf und -Leiste. Ersetzt die Stein-Rolle. |
| Schwalbenschwanz-Band | ganzes Banner | Kapitel-Band im Kampagnentitel, Titelband „Das Buch von …“ der Chronik, später Kopf des Spielleiterbereichs. |
| Kleiner Rautentrenner | Seitenleiste des Blatts | unter dem Monogramm, mobil zwischen kleinen Abschnitten. |
| Senkrechte Zierleiste | Rand der Seitenleiste | Kante der globalen Leiste, wie in der Referenz. |

Der feine Panelrahmen des Muster-Panels war zu kontrastarm zum Ausschneiden; diese Rolle übernimmt der vorhandene Messingrahmen `--frame`.

### 9.3 Gestaltungssprache je Seite (Mockups `screenshots/design-mockups-v2/`)

- **M0 Materialtafel:** jedes vorhandene Element mit Herkunft und festem Einsatzort.
- **M1 Lagebericht als Titelbereich:**
  - Aubergine-Platte mit Eckfiligran, Kapitel im Schwalbenschwanz-Band, goldene Hauptaktion; die Kampagnenillustration läuft weich aus.
  - Ort auf Pergament mit Initiale und Ortsbild im Messingrahmen.
  - Aufgaben und Chronik als Panels mit Messingrahmen bzw. Ornament.
  - Nächste Sitzung als Panel mit Porträtringen, Gruppe auf Pergament, Zitat mit Ornamentleisten (wie die Referenz).
- **M2 Heldenakte:**
  - Großes Porträt im doppelten Messingring auf der Aubergine-Platte mit Eckfiligran, Kampagnenbild im Hintergrund.
  - Stufenaufstieg in Gold, Rasten zurückhaltend.
  - Lesezeichenleiste mit Schwalbenschwanz für die aktive Seite.
  - Werte im gerahmten Panel, Attribute als Messingmedaillons mit Wertschild.
  - „Gerüstet“ auf Pergament, „Jetzt“ als Panel mit Statusmarken.
- **M3 Kampf:**
  - Übersicht vor Schmuck: Initiativeleiste auf Aubergine.
  - Die aktive Figur bekommt einen doppelten Messingrahmen mit kleinem Eckfiligran und leichtem Leuchten, die nächste einen gestrichelten Rahmen.
  - Gegnerkarten in dunklem Rotbraun, Gruppe in Anthrazit; keine weiteren Ornamente.
- **M4 Kampagnenbuch:**
  - Aubergine-Buchdeckel mit vier Eckfiligranen und Titelband.
  - Zwei Pergamentseiten mit Falz: links das Inhaltsverzeichnis mit Punktlinien und rotem Lesezeichen, rechts der Eintrag mit Initiale, Randvermerk für Wichtiges und Aufgaben.
  - Grünes Siegel heißt „mit der Gruppe geteilt“. Die private Notiz liegt als Aubergine-Zettel mit Schloss deutlich abgesetzt auf der Seite.
  - Lesezeichen-Reiter zum Filtern.
- **M5 Heldenarchiv:**
  - Jede Akte mit Kampagnenbild oben, großem Porträtring, Name, Volk und Klasse, kurzem Zitat und Ornamentleiste.
  - Pro Kampagne eine Zeile mit Stufensiegel, TP-Balken und „Spielen“ in Gold.
  - Leere Akte auf Pergament zum Anlegen.
- **M6a/b Handy:**
  - Gleiche Materialien in kleiner Form: dunkler Kopf mit Monogramm, Titel auf Aubergine mit Eckfiligran und Kapitelband, Ort auf Pergament.
  - Leiste unten mit 5 Zielen.
  - Im Kampf: angeheftete Initiative, Zugkarte mit Filigran, Angriffe auf Pergament, großer goldener Knopf.

### 9.4 Was danach noch fehlen würde (Entscheidung E, zweiter Schritt)

- **Wappen bzw. Heraldik je Kampagne:** größter Gewinn. Sie würden das Statuskästchen im Titel und das Stufensiegel ersetzen.
- **Charakterporträts:** nur, wenn Spieler welche hochladen. Ohne sie bleibt die Initiale im Ring.
- **Ortsbilder** (Taverne, Höhle, Dorf), falls die sechs Kampagnenbilder für den Atlas nicht reichen.
- **Wachssiegel als Grafik:** optional. Das CSS-Siegel funktioniert.

## 10. Fassung 3: Kampfbereich und Lesbarkeit (Rückmeldung 17.11.2026)

Mockups: `screenshots/design-mockups-v3/`. Neu sind M3a, M3b und M6c; überarbeitet M2 und M6b.

### 10.1 Schrifthierarchie (gilt überall)

| Stufe | Wofür | dunkle Fläche | Pergament |
|---|---|---|---|
| 1 Wert | TP, RK, Angriff, Schaden, SG, Zähler | Titelschrift fett, `#f7ebd2` | Titelschrift fett, `#22130a` |
| 2 Name | Gegenstand, Zauber, Figur | UI-Schrift fett, `#efe2c6` | `#2b1a0f` |
| 3 Zusatz | Schadensart, Reichweite, Grad, Formel, Herkunft | .86rem, `#cfbc95` | `#553720` |
| 4 Beschriftung | Kapitälchen über Werten und Spalten | .72rem, `#dcc189` | `#7a3424` |

Werte stehen nie mehr in der gedämpften Farbe `--c-cream-mute`. Für Schadensarten gibt es nur drei zurückhaltende Farben: Gleißend und Feuer rotbraun, Heilung grün, Energie violett, alle anderen Arten in Stufe 3. Zauberplätze und Ressourcen verwenden die Kästchen des Bogens (leer = verfügbar, ✕ = verbraucht) und daneben die Zahl.

### 10.2 Einheitliche Karte für Gruppe und Gegner

Feste Höhe von 104 px, am Handy 78 px, mit gleichem Raster:
- **Zeile 1:** Porträt bzw. Kreatursymbol, Name, Klasse oder HG, rechts RK und TP.
- **Zeile 2:** TP-Balken über die volle Breite.
- **Zeile 3:** Zustände und Wirkungen; ohne Einträge steht „keine Zustände“.

Gegner unterscheiden sich nur durch die Fläche (dunkles Rotbraun), die Namensfarbe und das Symbol. Gold bekommt nur die Figur am Zug (doppelter Rahmen und Fähnchen „AM ZUG“). Die ausgewählte Figur bekommt eine goldene Kante links und das Fähnchen „AUSGEWÄHLT“. Spieler sehen Gegner wie bisher nur grob: Balken und ein Wort wie „angeschlagen“, kein RK und keine TP.

### 10.3 Aufbau des Kampfbereichs

Die Initiativeleiste oben bleibt. Darunter:
- **Spielleitung, Desktop:** drei Spalten
  1. Beteiligte (Gruppe, dann Gegner).
  2. **Am Zug**.
  3. Eingreifen und Kampfmeldungen.
- **Tablet:** zwei Spalten. Eingreifen und Meldungen rutschen unter „Am Zug“.
- **Spieler, Desktop:** zwei Spalten. Links Beteiligte und „Für dich“, rechts „Am Zug“.

**Am Zug: Gegner (M3a)**
- Werteblock kompakt: RK, TP, Tempo, Initiative, Übung und sechs Attribute.
- Aktionen als Tabelle auf Pergament mit Angriff, Treffer und Schadensart; dazu Bonusaktion und Eigenschaften.
- Woher die Werte kommen: Der Monsterkatalog liegt nur auf Englisch vor (`data/monsters.json`). Angriffswert, Reichweite und Schaden werden zur Anzeige aus dem Text gelesen; Namen und Volltext bleiben englisch.
- Zähler wie „3/Day“ gibt es bereits (`monsterExtras`) und erscheinen hier.

**Am Zug: Spieler (M3b)**
- Die bisherige Zugübersicht (`vTurnBoard`, `S.turn`) im neuen Kleid.
- Oben die vier Zähler: Aktion, Bonusaktion, Reaktion, Bewegung.
- Links auf Pergament die Aktion: Waffen und Zauber mit Angriff oder SG, Schaden, Art, Grad, Reichweite und Dauer, jeweils mit Knopf „Angreifen“ oder „Wirken“. Darunter die Standardaktionen als Marken.
- Rechts Bonusaktion, Reaktion, Fähigkeiten und Plätze.
- Ein Hinweis „beendet Bless“ erscheint, wenn ein Konzentrationszauber den laufenden beenden würde.
- Was die Spielleitung sieht, wenn ein Spieler am Zug ist: dieselbe Spalte, nur lesend. Sie zeigt Presence-Werte (TP, RK, Zustände, Wirkungen, Konzentration), dazu Angriffe und Zauber aus dem letzten Online-Stand (`peek`), mit Hinweis auf dessen Alter. Neue Daten werden dafür nicht übertragen.

**Eingreifen (Spielleitung)**
- Wirkt immer auf die ausgewählte Figur; „+ weitere“ erlaubt mehrere Ziele.
- Zahl mit Schaden, Heilung oder Temp-TP.
- Häufige Zustände und Wirkungen als Marken; aktive tragen ✕ zum Entfernen.
- „Konzentration beenden“ ist nur aktiv, wenn das Ziel sich konzentriert; daneben „Werte anpassen“.
- Kein Untermenü.

**Kampfmeldungen:** die neuesten oben, mit Runde und farbiger Kante (Schaden rot, Heilung grün, Wirkung blau, Zug gold). Spieler sehen unter „Für dich“ nur, was sie selbst betrifft, plus Wirkungen auf die Gruppe. Grundlage ist der bestehende Meldungsstreifen (`src/feed.js`); ein vollständiges Protokoll gibt es nicht.

**Handy:** angeheftete Initiative, darunter die Karte „Am Zug“.
- **Spieler (M6b):** Zähler, Meldung zum Annehmen, Reiter Aktion, Bonus, Reaktion und Plätze, großer goldener Knopf „Zug beenden“ über der Leiste.
- **Spielleitung (M6c):** Gegner kompakt, darunter die Beteiligten. Wer ausgewählt ist, öffnet unten ein Eingreif-Feld mit Schaden, Heilung, Zuständen und Wirkungen.

Bewusst nicht vorgesehen sind Spielfeld, Positionen, Animationen und ein Würfelwurf.
