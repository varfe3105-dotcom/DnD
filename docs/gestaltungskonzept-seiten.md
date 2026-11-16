# RealmCraft – Gestaltungskonzept der Charakter- und Kampagnenseiten (Phase 1)

Stand 16.11.2026. Grundlage: Dashboard als Referenz, Tokens in `src/tokens.css`, Bausteine in `docs/designsystem.md`. Nichts davon ist umgesetzt, bis es freigegeben ist.

## 1. Bestand und Abweichungen

| Seite | Heute | Abweichung zum Ziel |
|---|---|---|
| Charakter · Übersicht | Kopf (Porträt, Name, XP, Stufenaufstieg, Rasten, Sprache) und darunter eine Karte mit TP, RK, sechs Attributen, Zuständen, Kampagnen sowie die Werteleiste | Name steht doppelt; Waffe, Rüstung, aktive Zauber, Ressourcen und letzte Ereignisse fehlen; Sprache und Einheiten gehören in die Einstellungen |
| Werte & Fähigkeiten | Werteleiste, Wirkungen, Medaillons mit Rettungswürfen, Fertigkeiten auf Pergament, Merkmale, Übungen | TP und Trefferwürfel fehlen; Merkmale sind eine lange Liste; Erklärungen der Modifikatoren nur teilweise als Tooltip |
| Inventar | Münzen, Ausrüstungsfigur mit Plätzen, Rucksackraster, Detailfeld beim Antippen, Filter | Ausgerüstetes und Rucksack sind optisch gleichwertig; kein Sortieren; Detail erscheint unter dem Raster statt daneben |
| Zauber | Plätze je Grad als Kästchen, Zauber nach Grad, Wirken, Vorbereiten nur bewusst | Plätze verfügbar/verbraucht nur schwach unterschieden; keine Komponenten-Spalte; Konzentration nicht hervorgehoben |
| Notizen | Seiten mit Titel, ein Textfeld | keine Vorlagen (Hintergrund, Ziele, Beziehungen); Textfeld ohne Buchcharakter |
| Bearbeiten | Einrichten: alle Stammdaten, Ressourcen, Zauberliste, Sicherung, Sprungleiste | erfüllt den Zweck; nur aufräumen |
| Kampagne · Übersicht | vier gleichförmige Karten (Info, Raum, Stand, Gruppe) und Bereichsknöpfe | Bildkopf fehlt; kein Kapitel; keine geplanten Inhalte der nächsten Sitzung; keine letzten Ereignisse |
| Gruppe | Spieler: eigener Charakter und Mitspieler als Zeilen; Spielleitung: Live-Tisch | keine Porträts der Mitspieler; kein Spielername |
| Kampf | zwei Zustände, Reihenfolge, Zeilen mit TP ±, Zustände, Effekte, Vorschläge an Spieler | eine einzige Liste; Gruppe und Gegner nicht getrennt; Schaden und Zustände erst nach Aufklappen; Aktionsbereich des Spielers ist die alte Kampfansicht |
| Erkundung | Ort, bekannte Orte, Handlung, Karte auf Knopfdruck | keine Auswahl „Ort → Details daneben“; Spieler sehen nur den Ortstitel |
| Inventar & Handel | Spieler: Münzen, Gruppenkasse, Hinweis auf Katalogkauf; Spielleitung: Beute | keine Händler |
| Chronik | Spieler: ein Textfeld; Spielleitung: Notizbuch | keine gemeinsame Chronik, die Spieler sehen |

## 2. Layout je Seite

Gemeinsamer Rahmen auf allen Seiten:
- Brotkrumen
- Seitentitel mit Raute und Goldlinie
- die bekannten Knöpfe und Statusmarken
- **neue Statusfarben als Tokens:**
  - negativer Zustand: gedämpftes Rot
  - positive Wirkung: gedämpftes Grün
  - Konzentration oder Magie: gedämpftes Blau
  - Ressource: Messing

### Charakter (Navigation links als Lesezeichenleiste, am Tablet oben, am Handy unten)
- **Übersicht – „Titelblatt“:**
  - Breiter Kopf mit Kampagnenbild, großem Porträt im Messingring, Name, Volk, Klasse, Unterklasse und Stufe, Kampagne als Marke, kurzer Beschreibung.
  - Darunter **eine** Leiste mit vier Hauptwerten: TP mit Balken (am größten), RK, Initiative, Tempo. XP steht klein unter der Stufe.
  - Daneben zwei schmale Spalten. Links „Jetzt“: Zustände, Wirkungen, Konzentration, Ressourcen als Punkte. Rechts „Gerüstet“: Hauptwaffe mit Angriff und Schaden, Rüstung, vorbereitete Zauber mit Konzentration.
  - Unten „Zuletzt“: die letzten Zeilen der Kampagnenchronik.
  - Stufenaufstieg ist ein Knopf im Kopf. Porträt und Beschreibung lassen sich direkt im Kopf ändern.
- **Werte & Fähigkeiten:**
  - Oben sechs Attributstafeln als Medaillons, jeweils mit Rettungswurf darunter.
  - Rechts davon ein schmaler Block mit Übung, Initiative, RK, Tempo, TP und Trefferwürfeln sowie den passiven Werten.
  - Darunter Fertigkeiten in vier Gruppen nach Attribut auf Pergament. Übungsgrade als ○ ● ★.
  - Unten Merkmale nach Herkunft (Klasse, Volk, Talent), aufklappbar.
  - Tooltip an jedem Wert: Attribut, Übung und Wirkungen.
- **Inventar – „Ausrüstungsbuch“:**
  - Links eine Spalte mit Münzen, Traglast und der Figur mit den ausgerüsteten Gegenständen.
  - Mitte die Gegenstandsliste mit Filterchips (Waffen, Rüstung, Verbrauch, Magie, Sonstiges) und Sortierung (Name, Gewicht, Wert).
  - Rechts die Detailseite des gewählten Gegenstands mit Regeltext, Werten und Aktionen (ausrüsten, benutzen, bearbeiten, verkaufen, entfernen mit Bestätigung).
  - Das bestehende Raster bleibt als Ansicht „Raster“ erhalten.
- **Zauber – „Zauberbuch“:**
  - Oben die Zauberplätze je Grad als Siegel: voll = verfügbar, hohl = verbraucht. Daneben Zauberrettungswurf und Angriff.
  - Die aktive Konzentration steht als blaues Band ganz oben.
  - Darunter Grade als Kapitel. Jeder Zauber ist eine Zeile mit Zeitaufwand, Reichweite, Dauer, Komponenten und Marken K/R. Antippen öffnet den Text daneben (Desktop) oder darunter (Handy).
  - Kein Löschknopf; „Vorbereitung ändern“ bleibt der bewusste Modus.
- **Notizen – „Tagebuch“:**
  - Seitenliste links mit Vorlagen „Hintergrund“, „Ziele“, „Beziehungen“, „Erlebnisse“, die beim ersten Öffnen als leere Seiten angelegt werden können.
  - Rechts ein Pergamentblatt mit großer Lesetypografie.
  - Hinweis, dass Kampagnenchronik und Notizen der Spielleitung getrennt sind.
- **Bearbeiten:** bleibt funktional, mit Sprungleiste, Formularblöcken in zwei Spalten und Sicherung am Ende. Keine Atmosphäre nötig.

### Kampagne
- **Übersicht – „Lagebericht“:**
  - Großer Bildkopf mit Kampagnenbild, Name, Status, Kapitel und Ort.
  - Hauptspalte „Aktuelle Lage“: Ort mit Kurztext, aktuelles Kapitel, offene Aufgaben aus Notizen der Art Handlung, wichtige Ereignisse.
  - Seitenspalte „Nächste Sitzung“: Datum und geplante Inhalte.
  - Darunter eine Porträtreihe der Gruppe mit TP-Balken (ein Klick führt zu Gruppe) und „Zuletzt in der Chronik“.
  - Werkzeuge der Spielleitung (Raum, Code, Ort setzen, Kapitel) stehen gesammelt in einer Leiste, die nur sie sieht.
- **Gruppe – „Abenteurergruppe“:**
  - Hochformatige Porträtkarten nebeneinander wie Spielkarten, mit Name, Spielername, Volk und Klasse, Stufe, TP-Balken, RK und Zustandsmarken.
  - Die eigene Karte ist hervorgehoben und öffnet den Charakter.
  - Die Spielleitung bekommt auf jeder Karte die Aktionen aus dem Live-Tisch (Schaden, Heilung, Zustand, Wirkung, Inspiration, XP).

### Kampf – eigene Oberfläche für den Tisch
- **Vorbereitung:**
  - Links „Begegnungen“ als Liste mit Schwierigkeit. Laden übernimmt sie.
  - Mitte die Aufstellung, getrennt in Gruppe (automatisch aus dem Raum) und Gegner (Suche, Anzahl), mit Initiativefeld je Zeile und Prüfwerten RK und TP.
  - Rechts großer Knopf „Kampf starten“.
- **Laufender Kampf:**
  - Oben eine waagrechte Initiativeleiste mit Porträt oder Kreatursymbol, Name, Initiative und TP-Balken. Der aktive Teilnehmer ist groß und in Messing gerahmt, der nächste markiert. Ein Fortschrittspunkt zeigt die Stelle in der Runde. Daneben Runde, Zurück und Nächster Zug.
  - Darunter zwei Spalten: links die Gruppe, rechts die Gegner, jeweils als Karten mit TP-Balken, RK, Zustandsmarken und Konzentration.
  - Schaden und Heilung stehen direkt auf jeder Karte: Zahlenfeld mit −/+ und Schnellwerten. Ein Tippen auf die Karte öffnet einen kompakten Dialog mit Zuständen, Effekten mit Runden, Konzentration, Initiative, Entfernen und Werten.
  - Unten der Aktionsbereich des aktiven Spielercharakters.
    - Spieler sehen ihre eigenen Angriffe, Zauber, Fähigkeiten und Ressourcen mit Aktionszählung.
    - Die Spielleitung sieht bei einem Monster dessen Werteblock und Aktionen.
- **Am Tablet** wird die Initiativeleiste waagrecht scrollbar. Gruppe und Gegner stehen als zwei Reiter statt untereinander. Die Klickflächen sind mindestens 44 px groß.
- **Meldungen:** Statt einzelner Toasts gibt es einen schmalen Meldungsstreifen unten mit den letzten drei Meldungen. „Du bist an der Reihe“ ist hervorgehoben und vibriert.

### Erkundung – „Atlas“
- Links die Ortsliste (aktueller Ort oben, dann bekannte Orte, dann Handlung und Quests).
- Rechts der gewählte Ort: Beschreibung, NSCs als Verweise, Hinweise, Gegner (nur die Spielleitung) und „Hier sind wir“.
- Die Karte liegt als breites Band darüber, aufklappbar wie heute.
- Spieler sehen nur, was die Spielleitung freigibt (siehe Datenpunkt D2).

### Inventar & Handel – „Schatzkammer“
- Oben die Gruppenkasse als Münzreihe.
- Darunter zwei Spalten: links die gemeinsame Beute mit Wert und „An … geben“, rechts die Händler.
- Händler sind ein eigenes Buch (Name, Ort, Waren mit Preis und Bestand), siehe D3.

### Chronik – „Kampagnenbuch“
- Zeitleiste nach Sitzungen: Sitzungskarte mit Datum, Zusammenfassung und hervorgehobenen Ereignissen (Entdeckung, Quest, Entscheidung, Begegnung).
- Filter nach Art.
- Gemeinsame Einträge und private Einträge der Spielleitung sind farblich und mit Schloss klar getrennt. Private Einträge verlassen das Gerät der Spielleitung nie.

## 3. Wiederverwendbare Bausteine (zentral in areas.css / tokens.css)

- **Porträt** `.hub-por`: in den Größen sm/md/lg/xl, mit Kreatursymbol als Ersatz.
- **Statusmarke** `.tag` mit den Varianten bad/good/conc/res. Ersetzt die verschiedenen Chip-Sonderfälle.
- **TP-Balken** `.hpbar`: ein Baustein für Übersicht, Gruppe, Kampf und Startseite.
- **Wertetafel** `.stat` in groß und klein, Attributsmedaillon `.medal`, Platzsiegel `.slot`.
- **Seitenaufbau** `.page-2col` / `.page-3col` mit festen Umbrüchen für Tablet und Handy, statt alles zu stapeln.
- **Listen-Detail-Muster** `.ld`: für Inventar, Zauber, Erkundung und Chronik.
- **Kompaktdialog** `.dlg.sm` und **Meldungsstreifen** `.notes-strip`.

## 4. Fehlende Funktionen und Datenpunkte

Ohne Rücksprache wird nichts davon migriert. Die Punkte mit ⚠ verändern Speicher- oder Datenbankstrukturen und brauchen deine Freigabe.

| Nr. | Thema | Befund | Vorschlag |
|---|---|---|---|
| D1 ⚠ | Spielleitungsdaten je Kampagne | `D` ist eins pro Gerät (Vorschlag in `docs/dm-daten-je-kampagne.md`, wartet auf deine zwei Entscheidungen) | vor Händlern, Kapitel und Chronik umsetzen, weil diese sonst wieder global landen |
| D2 ⚠ | Gemeinsame Chronik, Ortsbeschreibungen für Spieler | Spieler bekommen heute nur Ortstitel und Handouts. Die Online-Tabelle erlaubt nur `kind` `char` und `dm`. | Die Spielleitung markiert Einträge als „geteilt“. Diese gehen als eigener Datensatz `kind: 'camp'` in die Online-Speicherung. Dafür muss die Datenbankregel um `'camp'` erweitert werden (SQL-Änderung, die du in Supabase ausführst). Alternative ohne SQL: geteilte Einträge als zuverlässige Nachricht wie Handouts; das ist einfacher, aber nur für Spieler, die irgendwann online waren. |
| D3 | Händler | gibt es nicht | `D.merchants` (je Kampagne, also nach D1): Name, Ort, Waren aus dem Katalog oder eigene mit Preis und Bestand. Spieler sehen die Händler über denselben Weg wie D2. Kaufen ist ein Vorschlag an die Spielleitung (wie heute Wünsche an die Gruppenkasse), die bestätigt. Erst die Oberfläche, dann die Funktion; nichts wird nur vorgetäuscht. |
| D4 | Kapitel / Handlungsabschnitt, geplante Inhalte der nächsten Sitzung | gibt es nicht | zwei Textfelder an der Kampagne (`chapter`, `plan`) in `charbogen-campaigns`, also nur neue Felder ohne Migration. Die Spielleitung teilt das Kapitel über die Presence wie den Ort. |
| D5 | Spielername | gibt es nicht | ein Feld in den Einstellungen (`charbogen-player`), das in der Presence mitgeht. Neues Feld, keine Migration. |
| D6 | Porträts der Mitspieler und in der Initiative | Bilder gehen nicht über die Presence (zu groß) | ein kleines Vorschaubild (64 px, ≈ 3 KB) nur einmal pro Verbindung als Nachricht senden, beim Empfänger nur im Speicher halten. Bis dahin Initiale. |
| D7 | „Initiative würfeln“ | Würfeln ist bewusst ausgeschlossen (Grundsatz des Projekts) | Felder zum Eintragen der am Tisch gewürfelten Werte. Gegnerinitiative optional mit dem Bonus aus dem Werteblock als Hinweis, ohne Zufallszahl. Bitte bestätigen. |
| D8 | Kreaturenbilder | keine Bilder; es gibt Symbole je Kreaturtyp | Symbole verwenden; keine fremden Bilder |
| D9 | Gegner-TP für Spieler | Spieler sehen bewusst nur „angeschlagen / schwer verletzt“ | so lassen (Tischregel), auf Wunsch abschaltbar |

Doppelte Datenhaltung entsteht nicht: TP, Zustände, Konzentration und Ressourcen stammen immer aus dem Charakter (`S`) oder bei Mitspielern aus ihrer Presence. Die Kampfliste der Spielleitung hält wie heute nur Gegner und Begleiter selbst.

## 5. Reihenfolge

1. **Grundlagen:** Status-Tokens und Bausteine aus Abschnitt 3 zentral anlegen. Keine sichtbare Seitenänderung außer den einheitlichen Marken.
2. **Charakterbereich vollständig**, in der Reihenfolge Übersicht, Zauber, Werte & Fähigkeiten, Inventar, Notizen, Bearbeiten. Danach Tests, Screenshots und deine Abnahme.
3. **Kampagnenübersicht und Gruppe**, mit D4 und D5 (nur neue Felder).
4. **Kampf**, Vorbereitung und laufender Kampf, mit Meldungsstreifen. D6 nur, wenn freigegeben.
5. **Nach Freigabe von D1 und D2:** Spielleitungsdaten je Kampagne, dann Erkundung, Chronik, Inventar & Handel mit Händlern (D3).

Nach jeder Stufe: `npm test`, beide Builds, Screenshots für Desktop, Tablet (1024 × 768) und Handy, Prüfung auf der echten Seite, Bericht, und erst nach deiner Abnahme die nächste Stufe.

## Entscheidungen des Nutzers (16.11.2026)

- **Kampf:**
  - Keine Vibration voraussetzen. Der aktive Zug wird mit dezenter Animation und goldener Hervorhebung gekennzeichnet.
  - Ein akustisches Signal ist optional und abschaltbar.
- **Charakter-Übersicht:** „Jetzt“ und „Gerüstet“ zeigen nur das Wichtigste; die Details stehen auf den Unterseiten.
- **Kampagnenübersicht:**
  - Die letzten Ereignisse kommen automatisch aus der Chronik.
  - Offene Aufgaben haben keine eigene Datenhaltung.
- **D4:**
  - Kapitel und Sitzungsplanung werden dauerhaft an der Kampagne gespeichert.
  - Die Presence trägt sie nur vorübergehend weiter.
- **D1:** Wird vor weiteren kampagnenbezogenen Funktionen der Spielleitung gelöst. Mehrere Kampagnen auf einem Gerät haben vollständig getrennte Daten.
- **D2:**
  - Es kommt eine richtige gemeinsame Chronik mit SQL-Erweiterung.
  - Vorher erkläre ich genau, welche Datenbankregel sich ändert und wie private Notizen der Spielleitung ausgeschlossen bleiben.
  - Ohne Freigabe wird nichts an Supabase geändert.
- **D6:** zurückgestellt; Initialen reichen.
- **D7 und D9:** wie vorgeschlagen.

## Stand

- Stufe 1 (Bausteine) und Stufe 2 (Charakterbereich) sind umgesetzt.
- Abnahme durch den Nutzer steht aus.
- Tests: `tests/charpages.spec.js`. Ältere Inventartests laufen mit der Fixture-Option `invGrid` in der Rasteransicht.

## Stand Stufe 3 (16.11.2026)

**Kampagnenübersicht als Lagebericht**
- Der Kopf zeigt Status, Rolle, Sitzungen und das Kapitel.
- Hauptspalte:
  - aktueller Ort, für die Spielleitung mit Notizauszug
  - offene Aufgaben
  - zuletzt in der Chronik
- Seitenspalte: nächste Sitzung mit geplanten Inhalten, Porträtreihe der Gruppe, Raum.

**Datenquellen ohne Kopien**
- **Spielleitung:** Aufgaben sind Notizen der Art „Handlung“, Chronik sind Sitzungsnotizen, der Ort ist „Hier sind wir“ (alles aus `D.notes`).
- **Spieler:** Aufgaben sind Zeilen der eigenen Chronik, die mit `[ ]` beginnen; die Chronik ist die eigene Chronik (`log`).

**Dauerhaft an der Kampagne** (`charbogen-campaigns`): `chapter`, `plan`, `next`, bei Spielern zusätzlich `place`.
- Die Spielleitung pflegt diese Felder in ihrer Werkzeugleiste. Die Leiste wird für Spieler nicht erzeugt.
- Die Felder gehen vorübergehend über die Presence (`camp.c/p/x`, `here` nur als Titel).
- Spieler übernehmen sie in ihren Kampagneneintrag (`syncCampFromDm()` in `events.js`). Danach bleiben sie offline sichtbar.

**Spielername**
- Gespeichert in `charbogen-player` (Gerät, in der Sicherung).
- Wird in den Einstellungen und beim Beitreten eingetragen.
- Geht als Presence-Feld `pl` mit, zusammen mit `race`.

**Gruppe**
- Porträtkarten (`memberCard()` in `views/party.js`) mit Spielername, Volk, Klasse, Stufe, TP-Balken, RK, Zuständen, Konzentration, Wirkungen, Todesrettungswürfen und Begleitern.
- Die Spielleitung sieht dieselben Karten mit ihren Werkzeugen darunter.

Tests: `tests/campaign.spec.js`. Abnahme durch den Nutzer steht aus.
