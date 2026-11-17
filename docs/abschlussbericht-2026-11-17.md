# Abschlussbericht Gesamtauftrag „Konsistente Überarbeitung“ (17.11.2026)

Grundlage: Gesamtauftrag vom 17.11.2026, Bestandsaufnahme `docs/bestandsaufnahme-2026-11-17.md`.
Commits: `8bd5635`, `60a45c5`, `651805c` und der Abschlusscommit mit diesem Bericht.
Screenshots: `screenshots/umsetzung-2026-11-17/` (76 Aufnahmen, Desktop 1440 px und Handy 390 px; lokal, nicht im Repository). Sie entstehen mit demselben Rundgang wie die Bestandsaufnahme (`screenshots/bestand-2026-11-17b/`), lassen sich also direkt vergleichen.

## 1. Veränderte Bereiche

| Bereich | Änderung |
|---|---|
| Rahmen (Etappe B) | **Globale Leiste** links auf Kampagnen- und Charakterebene (`views/frame.js`, `.rail`). Sie enthält Dashboard, Meine Kampagnen, Spielleiterbereich, Charakterbibliothek, Weltkarte, Wiki und Einstellungen und ist einklappbar (gemerkt in `charbogen-rail`). Zwischen 900 und 1199 px zeigt sie nur Symbole. |
| Live-Leiste | Steht am Desktop unten in der globalen Leiste und verdeckt keine Inhalte mehr. Am Handy erscheint sie nur noch, wenn sie etwas meldet; die Ampel steht in der Kopfleiste. |
| Handy | Schmale **Kopfleiste** mit Monogramm, Ort und Menü. Die Titelplatte ist kompakt (unter einem Viertel des Bildschirms). Kopfknöpfe (Rasten, Stufenaufstieg, Sprache, Einheiten, Einrichten) stehen im **Menü**. Unten stehen fünf Bereiche und „Mehr“. |
| Navigation | **Liniensymbole** für alle Reiter. Kampagne: Lagebericht, Gruppe, Mein Charakter, Kampf, Erkundung, Inventar & Handel, Chronik, Wiki. Spielleitung zusätzlich „Einstellungen“. Im Charakter führt der erste Eintrag „Zur Kampagne“ zurück. Der doppelte Knopf „Startseite“ ist aus den Titelplatten entfallen. |
| Dialoge | **Dunkel mit Messingrahmen** (Entscheidung B). Pergament bleibt nur für Lesedialoge (Handout, `.dlg.read`). |
| Designsystem | Die Tokens aus `realm.css` sind nach `tokens.css` umgezogen; `tokens.css` ist wieder die einzige Quelle. |
| Chronik (Etappe C) | **Buch** mit Deckel, Lesezeichenband, Inhaltsverzeichnis mit Lesezeichen, aufgeschlagener Seite, Blättern und rotem Siegel „Veröffentlicht“ (`book()` in `views/chron.js`). Spieler lesen die gemeinsame Chronik; darunter stehen ihre **privaten Notizen**. Die Spielleitung hat Notizbuch und Kampagnenbuch; private Einträge sind als „privat“ gekennzeichnet. |
| Gruppe / Sichtbarkeit | Mitspieler sehen **keine TP-Zahlen** mehr, sondern einen gestuften Balken und ein Zustandswort: Gesund, Verwundet, Schwer verwundet, Kampfunfähig (`hpState()`/`coarseHp()` in `views/party.js`). Das gilt für Gruppenseite, Lagebericht, Kampfkarten, Initiativleiste und Live-Leiste. Die Spielleitung und der Spieler selbst sehen genaue Werte. |
| Kampf der Spieler | Die Bewegung zeigt **nur die maximale Weite** („bis 9 m“) ohne Zähler und ohne Schrittknöpfe; Spurten verdoppelt die Anzeige. Die Kampfseite der Kampagne zeigt **auch ohne laufenden Kampf** die Aufteilung nach Aktionsarten mit dem Hinweis „Kein Kampf“; der alte Kampfbogen erscheint dort nicht mehr. |
| Begegnungen (Etappe D) | **Startauswahl** vor dem Start einer vorbereiteten Begegnung oder eines Orts. Darin lassen sich Gegner an- und abwählen, die Anzahl ändern und weitere aus dem Katalog oder eigene Monster hinzufügen. Die Vorbereitung bleibt unverändert; ein Neustart setzt die Gegner auf volle Werte zurück. |
| Monster | **Herkunft** in Suche und Startauswahl: „SRD 5.2.1“, „Älterer Datensatz“ oder „Eigenes Monster“. |
| Kampagneneinstellungen | Neuer Reiter der Spielleitung (`views/camp-set.js`):<br>– Allgemeines: Name, Kapitel, Beschreibung, Titelbild.<br>– Regelwerk: 2024 / SRD 5.2.1, dazu **Hausregeln**.<br>– **Fortschritt**: Meilensteine als Standard, XP wahlweise.<br>– Sichtbarkeit (Zähler), Mitglieder (verbundene Spieler).<br>– Archivieren; **Löschen nur nach Eingabe des Namens**. |
| Hausregeln | Liegen in den Spielleitungsdaten der Kampagne (`D.house`) und lassen sich anlegen, bearbeiten und löschen. Sie gehen mit der gemeinsamen Chronikzeile an die Spieler (`rules`) und werden in deren Kampagne gespeichert (`house`). Im Wiki stehen sie als eigene Kategorie „Hausregeln“, sind über die Suche auffindbar und als Hausregel gekennzeichnet. |

## 2. Erhaltene Funktionen

- **Alles bisher Vorhandene bleibt erreichbar:**
  - Raumcodes, Live-Verbindung mit Ausgang und Bestätigung, Online-Speicherung, D2-Geheimnis
  - Import und Export, Sicherung, Charakterinstanzen je Kampagne
  - Spickzettel, Beute, Gruppenkasse, Händler, Atlas, Zugzählung, Wirkungen und Assistent
- **Sprach- und Einheitenschalter:** Am Desktop stehen sie weiter in der Titelplatte, am Handy im Menü.
- **Bewegung:** Die interne Bewegungszählung (`S.turn.mv`, Aktion `tmove`) ist nicht gelöscht, nur nicht mehr angezeigt.
- **XP:** Werte bleiben im Meilensteinmodus gespeichert. Ohne Kampagne (Bibliothek, Raum ohne Kampagne) werden XP wie bisher angezeigt.

## 3. Neue Funktionen

- Globale Leiste, Handymenü und Kampagneneinstellungen
- Fortschrittsmodus je Kampagne und Hausregeln
- Chronik als Buch und grober Gesundheitszustand der Mitspieler
- Startauswahl für Begegnungen und Monsterherkunft

## 4. Angepasste Datenstrukturen (rückwärtsverträglich, keine Migration)

| Ort | Neues Feld | Hinweis |
|---|---|---|
| Kampagne (`charbogen-campaigns`) | `prog` (`'xp'` oder `'ms'`, Standard `ms`) | Ohne Feld gilt Meilenstein. |
| Kampagne (`charbogen-campaigns`) | `house` | Kopie der Hausregeln bei Spielern. |
| Spielleitungsdaten je Kampagne (`charbogen-dm-camp-<id>`) | `house` (Liste `{ id, t, x }`) | — |
| Presence der Spielleitung | `camp.g` (Fortschrittsmodus) | Ältere Spieler-Apps ignorieren das Feld. |
| Chronikzeile `chron/shared` | zusätzlich `rules` | Ältere Spieler-Apps lesen weiter nur `entries`. |
| Gerät | `charbogen-rail` | Leiste eingeklappt oder nicht. |

**Behobener Fehler:** Nach dem Neuladen in einer Kampagne der Spielleitung wurden deren Daten nicht geöffnet. Die App zeigte den alten gemeinsamen Bereich `charbogen-dm` und hätte Änderungen dorthin gespeichert. Seit `main.js` wird beim Start `useCamp()` aufgerufen.

## 5. Supabase und SQL

- **In diesem Auftrag wurde nichts an Supabase geändert.**
- **Weiter offen aus D2:** SQL am Ende von `supabase/charbogen-saves.sql` ausführen; danach später die alten Funktionen entfernen.
- **Rechte nur in der Oberfläche umgesetzt. Hier muss ehrlich unterschieden werden:**

| Recht | Stand |
|---|---|
| Gegner-TP | Werden nie übertragen. Das ist technisch abgesichert. |
| Private Notizen von Spielern und Spielleitung | Liegen nur lokal auf dem Gerät. Die Spielleitungsdaten online schützt D2 mit dem Geheimnis je Raum, sobald das SQL ausgeführt ist. Technisch abgesichert. |
| Unveröffentlichte Chronik und Orte | Verlassen das Gerät der Spielleitung nicht; es gibt eine Positivliste `chronOut()`/`atlasOut()`. Technisch abgesichert. |
| Genaue TP anderer Spieler | Stehen weiterhin in der Realtime-Presence, die jeder im Raum empfängt. Nur die Anzeige ist grob. |
| Charakterbögen anderer Spieler | Mit dem Raumcode über `charbogen_list/get` lesbar (so funktioniert „Bogen ansehen“ der Spielleitung). |

**Vorschlag zur Freigabe (nicht umgesetzt):**
- **Bögen:** Spieler-Bögen bekommen wie die Spielleitungszeile ein Geheimnis. Nur die Spielleitung erhält über eine Freigabe-Nachricht einen Lesezugang. Dafür wären neue Funktionen `charbogen_put3/get3` und eine Spalte `reader` nötig.
- **Genaue TP:** Für TP in der Presence gibt es ohne Anmeldung (Supabase Auth plus Realtime Authorization, private Kanäle) keine serverseitige Lösung. Möglich wäre, die genauen TP nur über einen privaten Broadcast an die Spielleitung zu schicken und in der Presence nur die Stufe (ok/hurt/bad/down) zu senden. Das ist eine Protokolländerung am Live-Tisch und braucht deshalb Freigabe und den Test mit zwei Geräten.

## 6. Erfolgreiche Prüfungen

- `npm test`: ESLint, Vite-Build, Prüfung der Einbettung der Grafiken und 424 Playwright-Tests.
- Neue Tests in `tests/frame.spec.js`:
  - Rahmen am Desktop und am Handy (kein waagrechter Überlauf, Titelplatte unter einem Viertel des Bildschirms)
  - Fortschrittsmodus ohne XP-Verlust
  - Einstellungen, Hausregel im Wiki, XP-Verteilung nur im XP-Modus, Löschen nur mit Namen
  - Startauswahl mit unveränderter Vorbereitung, Gegner mit 0 TP bleibt stehen, Neustart setzt zurück, Neuladen in der Kampagne der Spielleitung
- Angepasste Tests (gewollte Änderungen): Navigation, Chronik als Buch, Bewegung ohne Zähler, Sprachwahl am Handy im Menü, Startauswahl.
- Rundgang mit Screenshots: 38 Seiten und Dialoge, je am Desktop und am Handy.

## 7. Nicht durchgeführte Prüfungen

- **Echte Synchronisation mit Supabase und zwei Geräten:** Im Rundgang ist der Live-Raum nachgebaut, die Online-Speicherung läuft in den Tests gegen einen nachgebauten Server. `docs/testplan-zwei-geraete.md` bleibt offen.
- **PWA-Build (`npm run build:web`):** Er wurde nicht eigens geprüft. Die Veröffentlichung über GitHub Actions baut ihn; der CI-Lauf nach dem Push ist das Ergebnis.
- **PDF-Import mit echten Bögen:** Er wurde nicht erneut geprüft; der Ablauf ist unverändert.

## 8. Bekannte Einschränkungen

- **Seiten mit der älteren Kartenoptik:** Gruppe/Live-Tisch der Spielleitung, Erkundung/Atlas, Inventar & Handel, Beute, Begegnungen und Bearbeiten zeigen weiter Überschrift plus Karte.
  - Material und Rahmen entsprechen den Tafeln.
  - Es fehlen die eigenen Titelplatten im Panel und die Schriftstufen für Werte.
- **„Gegenstände verwalten“:**
  - Vergeben geht zentral über Beute & Handel: Katalog, eigener Gegenstand, Empfänger, Preis und Gold.
  - Entfernen und Übertragen aus fremden Inventaren gibt es nicht. Die Spielleitung kann Spielerbögen nur über Vorschläge ändern; dafür wären neue Nachrichtentypen nötig.
- **Eigene Monster:**
  - Strukturierte Felder: Name, RK, HG, TP, Tempo, Attribute.
  - Angriffe, Fähigkeiten, Resistenzen und Immunitäten stehen im Textfeld.
  - Ein eigenes Bild gibt es nicht.
- **Importprüfung:** Die Prüfansicht gibt es für PDF und Bild. JSON-Importe zeigen einen Bericht, aber keine Feld-für-Feld-Korrektur vor dem Anlegen.
- **Meter und Fuß:** Meter sind Standard. Der Schalter Meter/Fuß ist erhalten, weil ihn die Gruppe früher ausdrücklich gewünscht hat. Wenn ausschließlich Meter gelten sollen, kann er entfallen.
- **Live-Leiste am Handy:** Im Kampf erscheint sie unten über der Leiste. Dafür ist Platz reserviert, sie wiederholt aber „Dein Zug“, das auch auf der Kampfseite steht.
- **Schriftstufen:** `.rc-*` gelten in Kampf, Profil, Lagebericht, Einstellungen und Buch. Ältere Seiten nutzen sie nur teilweise.

## 9. Offene Punkte (Vorschlag für die nächste Runde)

1. Freigabe der Rechte-Absicherung aus Abschnitt 5 (Bögen mit Lesezugang, TP nur an die Spielleitung).
2. Ältere Seiten (siehe 8) auf Panel-Titelplatten und Schriftstufen bringen.
3. Zentrale Gegenstandsverwaltung mit Entfernen und Übertragen (neue, zuverlässige Nachrichten `take`/`move`).
4. Strukturierte Felder für eigene Monster (Angriffe, Resistenzen, Immunitäten, Bild).
5. Feldprüfung auch für JSON-Importe.
6. Test mit zwei Geräten gegen das echte Supabase-Projekt.
7. Aufräumen der Altlasten erst danach:
   - ungenutzte erzeugte Texturen
   - `skins.css` (plain/modern) an den neuen Rahmen anpassen; die Skins wurden in diesem Auftrag nicht nachgezogen
