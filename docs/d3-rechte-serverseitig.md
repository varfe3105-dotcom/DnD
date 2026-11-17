# D3: Rechte serverseitig (17.11.2026)

## 1. Ausgangslage

**Online-Speicherung:** Tabelle `charbogen_saves`, nur über Funktionen erreichbar, Schlüssel ist der Raumcode.
- Mit D2 hat jedes Gerät ein Geheimnis je Raum; die Datenbank speichert nur dessen Hash.
- Schreiben darf nur der Besitzer einer Zeile.
- Lesen ist bisher geschützt nur für die Zeile der Spielleitung (`dm`).
- Jeder mit dem Raumcode konnte alle Charakterbögen lesen, über `charbogen_get2` und die alten Funktionen `charbogen_get`/`charbogen_list`.

**Live-Tisch:** Supabase Realtime ohne Anmeldung, ein Kanal je Raum.
- Die Presence jedes Geräts geht an alle im Kanal.
- Spieler senden darin genaue TP, Maximum, Temp-TP und die TP ihrer Begleiter. Attribute, Zauberlisten und Ausrüstung waren nie in der Presence.
- Gegner-TP sendet die Spielleitung seit Etappe 2 nicht mehr.
- Realtime kann ohne Anmeldung (Supabase Auth) nicht je Empfänger filtern.

**Geheim war schon vor D3** (kein Handlungsbedarf):
- Gegner-TP und -Zustandsstufen
- private Notizen der Spieler und der Spielleitung (verlassen das Gerät nie)
- unveröffentlichte Chronik und Orte (Positivliste)

## 2. Umsetzung

**Datenbank** (`supabase/d3-rechte.sql`, von dir auszuführen):

| Teil | Wirkung |
|---|---|
| Neue Tabelle `charbogen_rooms` | Hält je Raum, wer die Spielleitung ist (Hash ihres Geheimnisses), und ihren **öffentlichen** Schlüssel. Keine Policies, also nur über Funktionen erreichbar. |
| Bestehende Räume | Werden übernommen: Die Besitzerin der Zeile `dm`/`dm` wird als Spielleitung eingetragen. Das ist nur ein Einfügen; `charbogen_saves` wird nicht verändert. |
| `charbogen_claim` | Die Spielleitung beansprucht beim Öffnen des Raums den Raum. Der erste Anspruch gilt. Ein Raum mit fremdem Spielleitungsbereich kann nicht übernommen werden. |
| `charbogen_room_key` | Liefert nur den öffentlichen Schlüssel. |
| `charbogen_get2` (neu definiert) | Ein Charakterbogen geht nur an seinen Besitzer und an die Spielleitung des Raums; der Spielleitungsbereich nur an die Spielleitung; die gemeinsame Chronik an alle im Raum. |
| `charbogen_put2` (neu definiert) | Spielleitungsbereich und gemeinsame Chronik schreibt nur die Spielleitung. |
| `charbogen_list2` | Übersicht ohne Daten: Spieler sehen nur ihre eigenen Zeilen, die Spielleitung alle. |
| `charbogen_del2` | Löschen nur durch den Besitzer oder die Spielleitung. |
| Teil 2 (später) | Die alten Funktionen ohne Schutz (`charbogen_put/get/list/del`) entfernen. Erst danach ist der Lesezugriff ohne Geheimnis vollständig geschlossen. |

**App:**

| Datei | Änderung |
|---|---|
| `src/secure.js` | Die Spielleitung erzeugt je Raum ein ECDH-Schlüsselpaar (P-256). Der private Schlüssel bleibt auf dem Gerät (`charbogen-dm-ecdh`, auch in der Sicherungsdatei); der öffentliche geht an `charbogen_claim`. |
| `src/live.js` | **Spieler** senden genaue TP nur noch verschlüsselt (AES-GCM mit Einmal-Schlüssel, nur mit dem privaten Schlüssel der Spielleitung zu öffnen). Im Klartext steht nur die grobe Stufe (`hq`: ok/hurt/bad/down). Bevor feststeht, ob der Raum abgesichert ist, gehen gar keine genauen Werte hinaus. **Die Spielleitung** entschlüsselt und arbeitet wie bisher mit genauen Werten (Gruppe, Kampf, Bogen ansehen). |
| `src/cloud.js` | Raum beanspruchen, Schlüssel holen, Übersicht über `charbogen_list2`. |
| Anzeige | Bei der Spielleitung unter Gruppe/Live-Tisch: „Absicherung: aktiv / nicht aktiv / Raum gehört einer anderen Spielleitung“. Läuft ein Gerät noch mit der alten Version, steht dort ein Hinweis. |
| Ohne D3 | Fehlt D3 in der Datenbank, bleibt alles wie bisher, und die Spielleitung sieht „nicht aktiv“. |

**Live-Tisch-Funktionen bleiben erhalten:**
- Vorschläge (Schaden, Heilung, Zustände, Gegenstände)
- Zuganzeige, Gruppenkasse, Wirkungen und Begleiter
- Bogen ansehen durch die Spielleitung

## 3. Was du in Supabase ausführen musst

Projekt `ovkxoqgqocspwjvxhige`, Bereich **SQL Editor**.

1. **Sicherung (empfohlen):** Im Table Editor die Tabelle `charbogen_saves` als CSV exportieren. Zusätzlich in der App „Sicherung herunterladen“ auf dem Gerät der Spielleitung.
2. **D2 prüfen:** Falls noch nicht geschehen, zuerst den Abschnitt „D2“ am Ende von `supabase/charbogen-saves.sql` ausführen. Prüfen kannst du das so: Unter Database → Functions muss `charbogen_put2` existieren.
3. **D3 Teil 1:** Den Inhalt von `supabase/d3-rechte.sql` **bis zur Zeile „Teil 2“** einfügen und **Run** drücken. Die Abfrage ist wiederholbar.
4. **Kontrolle** (im SQL Editor):
   ```sql
   select count(*) from public.charbogen_rooms;            -- Räume mit eingetragener Spielleitung
   select room, dm_key is not null as hat_schluessel from public.charbogen_rooms;
   select proname from pg_proc where proname like 'charbogen_%' order by 1;
   ```
   Die Liste muss `charbogen_claim`, `charbogen_room_key`, `charbogen_list2`, `charbogen_is_dm` und `charbogen_hash` enthalten.
5. **App neu laden:** Auf allen Geräten die Seite einmal neu laden. Am Handy die App schließen und wieder öffnen, damit die neue Version aktiv wird. Danach den Raum öffnen; die Spielleitung sieht dann „Absicherung: aktiv“.
6. **D3 Teil 2, erst danach:** Wenn alle Geräte die neue Version haben, die vier `drop function`-Zeilen am Ende der Datei ausführen (ohne `--` davor). Das löscht nur Funktionen, keine Daten. Ältere App-Versionen können danach nicht mehr online speichern.

**Rückweg:** Teil 1 ändert keine Daten. Willst du ihn zurücknehmen, stelle den Abschnitt D2 aus `charbogen-saves.sql` wieder her (erneut ausführen) und lösche `charbogen_rooms`. Die App fällt dann auf das bisherige Verhalten zurück.

## 4. Grenzen (ehrlich)

- **Realtime selbst** ist weiter ein offener Kanal mit Raumcode. Geschützt sind die *Inhalte*: genaue TP verschlüsselt, Bögen nur über die Funktionen. Auch Nicht-Mitglieder mit Raumcode sehen Namen, Klasse, Stufe, RK, Zustände, Konzentration und die grobe TP-Stufe; das sind die Werte, die Mitspieler laut Auftrag sehen dürfen.
- **Nachrichten der Spielleitung an einzelne Spieler** gehen technisch an alle im Kanal; die App zeigt sie nur dem Empfänger. Gemeint sind Schadenshöhe, Gegenstand und Handout. Sie enthalten keine vollständigen Bögen. Eine Verschlüsselung je Spieler wäre der nächste Schritt.
- **Wer zuerst beansprucht, ist Spielleitung:**
  - Bestehende Räume sind über ihre Spielleitungszeile geschützt, neue Räume beansprucht die App sofort beim Öffnen.
  - Ein Spieler, der den Code eines neuen Raums kennt, *bevor* die Spielleitung ihn je geöffnet hat, könnte ihn beanspruchen; die Spielleitung sähe dann „Raum gehört einer anderen Spielleitung“ und legt einen neuen Raum an.
- **Geheimnis an das Gerät gebunden:** Bögen sind online nur mit dem Geheimnis des Geräts lesbar, das sie gespeichert hat. Auf einem neuen Gerät gilt das erst nach dem Einspielen der Sicherungsdatei. Das galt schon mit D2 für das Schreiben.
- **Vollständige serverseitige Durchsetzung auch im Realtime-Kanal** bräuchte Supabase Auth (z. B. anonyme Anmeldung) und Realtime Authorization mit privaten Kanälen. Das ist eine größere Umstellung und nicht umgesetzt.

## 5. Prüfungen

**Automatisch** (`tests/d3.spec.js`): drei getrennte Browser-Profile (Spielleitung, zwei Spieler) mit einem Nachbau der D3-Funktionen und einem gemeinsamen nachgebauten Live-Kanal. Geprüft wird, was tatsächlich gesendet wird:
- Spieler senden keine TP-Zahlen, keine Attribute und keine Zauber.
- Die Spielleitung entschlüsselt die genauen TP.
- Ein Spieler sieht beim anderen nur „Schwer verwundet“.
- Die Datenbank gibt fremde Bögen nicht heraus, eigene und der Spielleitung schon.
- Ein Spieler kann sich nicht als Spielleitung eintragen.

Ohne D3 bleibt das bisherige Verhalten, und die Spielleitung sieht „nicht aktiv“.

**Nicht geprüft:**
- Das echte SQL in Supabase (darf ich nicht ausführen).
- Der echte Realtime-Kanal mit zwei Geräten.

Beides deckt der manuelle Testplan ab: `docs/testplan-zwei-geraete.md`, Abschnitt 7.
