# Spielleitungsdaten je Kampagne – Vorschlag (noch nicht umgesetzt)

Stand 16.11.2026. Nichts davon ist gebaut. Dieses Dokument ist die Grundlage für die Entscheidung.

## Heutiger Stand

Alle Daten der Spielleitung liegen in **einem** Eintrag `localStorage['charbogen-dm']` (Objekt `D` in `src/dm.js`), egal welche Kampagne offen ist. Sie werden an vier Stellen gespeichert oder übertragen:

| Weg | Was | Schlüssel |
|---|---|---|
| Browser | ganzes `D` | `charbogen-dm` |
| Sicherungsdatei und automatische Stände (IndexedDB) | ganzes `D` | `charbogen-dm` im Feld `data` |
| Online-Speicherung je Raum (`cloud.js`) | ganzes `D` als `kind: 'dm', id: 'dm'` | **Raumcode** |
| „Exportieren“ im DM-Bereich | ganzes `D` als Text | – |

**Schon heute ein echtes Risiko:** Wer zwei Kampagnen mit zwei Raumcodes leitet, lädt beim Öffnen der zweiten Kampagne das Notizbuch der ersten in den Online-Speicher des zweiten Raums. Umgekehrt kann „Online-Stand laden“ das ganze `D` durch den Stand des anderen Raums ersetzen.

## Welche Daten gehören wohin

| Feld in `D` | Inhalt | Zuordnung |
|---|---|---|
| `notes`, `here`, `sel` | Notizbuch: Sitzungen, Orte, NSCs, Handlung, aktueller Ort | **je Kampagne** |
| `encounters`, `encSel` | vorbereitete Begegnungen | **je Kampagne** |
| `combat` (Liste, Runde, aktiver Zug, Effekte) | laufender Kampf | **je Kampagne** |
| `party` (Spielerzahl und Stufe für das XP-Budget) | Gruppengröße | **je Kampagne** |
| `stash` | Gruppenkasse | **je Kampagne** |
| `lootLock`, `buffsOut`, `turns` | Beutesperre, Wirkungen der Spielleitung, Züge senden | **je Kampagne** |
| `custom` | eigene Monster | **global** (Bibliothek, in jeder Kampagne nutzbar) |
| `on`, `only`, `view` | Modus und Ansicht | **global** (Bedienung) |

## Geplante Speicherung

- `charbogen-dm` bleibt bestehen und enthält danach nur noch die globalen Felder (`on`, `only`, `view`, `custom`).
- Neu: `charbogen-dm-camp-<Kampagnen-ID>` mit den Feldern „je Kampagne“.
- Die Spielleitung ohne Kampagne (Schalter in den Einstellungen) bekommt einen eigenen Eintrag `charbogen-dm-camp-none`, damit auch sie nichts mit einer Kampagne vermischt.
- `D` bleibt im Code ein Objekt. Es wird beim Öffnen einer Kampagne aus „global + Kampagne“ zusammengesetzt und beim Speichern wieder aufgeteilt. So ändert sich in den übrigen Dateien kaum etwas.
- Sicherungsdatei: Das Muster `KEEP` in `backup.js` nimmt `charbogen-dm-camp-*` mit auf. Alte Sicherungen mit nur `charbogen-dm` laufen durch dieselbe Übernahme wie unten.
- Online-Speicherung: Der Raum speichert nur noch den Teil seiner Kampagne (und die eigenen Monster). Der Datensatz heißt weiter `kind: 'dm'`. Ein Feld `camp` mit dem Kampagnennamen macht sichtbar, wozu er gehört.

## Übernahme der bestehenden Daten (Migration)

Grundsatz: **Nichts wird automatisch einer Kampagne zugeordnet, nichts wird gelöscht.**

1. **Vorher sichern.** Beim ersten Start mit der neuen Fassung wird automatisch ein Sicherungsstand in IndexedDB angelegt. Zusätzlich gibt es den Hinweis, eine Sicherungsdatei herunterzuladen.
2. **Altbestand bleibt unverändert.** Die bisherigen Daten werden als `charbogen-dm-legacy` kopiert und nie verändert, bis du sie ausdrücklich löschst.
3. **Zuordnung durch dich.** Beim ersten „Leiten“ einer Kampagne fragt ein Dialog: „Bisherige Spielleitungsdaten (12 Notizen, 3 Begegnungen, laufender Kampf mit 4 Beteiligten) gehören zu …“
   - **dieser Kampagne:** alles wird kopiert, Häkchen bei „aus dem Altbestand entfernen“ ist aus.
   - **einer anderen Kampagne:** Auswahl aus deinen geleiteten Kampagnen.
   - **aufteilen:** Liste der Notizen und Begegnungen mit je einer Kampagne pro Eintrag. Der Kampf geht nur an eine.
   - **später:** die Kampagne startet leer, der Altbestand bleibt.
   Eine Vorbelegung gibt es nur, wenn du genau **eine** Kampagne leitest, und auch dann erst nach Bestätigung.
4. **Raumabgleich.** Beim ersten Öffnen nach der Übernahme vergleicht die App den Online-Stand im Raum mit der neuen Zuordnung. Weicht er ab (zum Beispiel weil dort noch die Notizen der anderen Kampagne liegen), erscheint die vorhandene Wahl „Online-Stand laden / meinen Stand hochladen“. Es wird nicht stillschweigend überschrieben; `p_base` schützt zusätzlich.
5. **Rückweg.** Solange `charbogen-dm-legacy` existiert, kann „Zuordnung zurücknehmen“ den alten Zustand wiederherstellen.

## Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Daten landen in der falschen Kampagne | keine automatische Zuordnung; Altbestand bleibt; Rückweg |
| Online-Stand eines Raums überschreibt die neue Aufteilung | Abgleich mit Rückfrage (vorhandener Konfliktdialog), `p_base` |
| Zwei Tabs gleichzeitig offen, einer mit alter Fassung | alte Fassung schreibt nur `charbogen-dm`; die neue liest diesen Eintrag nach der Übernahme nicht mehr als Kampagnendaten, nur noch die globalen Felder |
| Laufender Kampf während des Updates | der Kampf geht mit der Zuordnung mit; ohne Zuordnung bleibt er im Altbestand sichtbar |
| Ältere Sicherungsdatei wird später eingespielt | sie landet als Altbestand und durchläuft denselben Dialog |
| Speicher voll (Notizen doppelt, solange der Altbestand bleibt) | Notizen sind Text, also klein; Hinweis, den Altbestand nach erfolgreicher Zuordnung zu löschen |
| Eigene Monster in Begegnungen | `custom` bleibt global, Begegnungen finden ihre Monster weiter |

## Offene Entscheidungen für dich

1. Sollen eigene Monster global bleiben (Vorschlag) oder auch je Kampagne sein?
2. Soll es den Schritt „aufteilen“ von Anfang an geben, oder reicht zunächst „alles zu einer Kampagne / später“?
