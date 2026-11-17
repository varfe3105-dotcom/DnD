# D3: Rechte serverseitig (17.11.2026, SQL überarbeitet nach Sicherheitsprüfung)

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
| Bestehende Räume | Räume, deren Zeile `dm`/`dm` schon einen Besitzer hat, werden eingetragen (nur Einfügen). Altbestandsräume werden eingetragen, sobald die Spielleitung ihre Zeile übernimmt (siehe Abschnitt 4). `charbogen_saves` wird nicht verändert. |
| `charbogen_claim` | Die Spielleitung beansprucht beim Öffnen den Raum. Gibt es eine Spielleitungszeile, darf nur deren Besitzerin beanspruchen (Altbestand ohne Besitzer: niemand). Nur bei ganz neuen Räumen gilt der erste Anspruch. Der Schlüssel wird geprüft (EC P-256, ohne privaten Teil). |
| `charbogen_room_key` | Liefert nur den öffentlichen Schlüssel. |
| `charbogen_get2` (neu definiert) | Ein Charakterbogen geht nur an seinen Besitzer und an die Spielleitung des Raums; der Spielleitungsbereich nur an die Spielleitung; die gemeinsame Chronik an alle im Raum. |
| `charbogen_put2` (neu definiert) | Prüft Art (`char`/`dm`/`chron`), Kennung, Daten und Geheimnis. Spielleitungsbereich und gemeinsame Chronik schreibt nur die Spielleitung. Altbestand nur mit genauem Zeitstempel. Wer die Spielleitungszeile besitzt, wird Spielleitung des noch nicht eingetragenen Raums. |
| `charbogen_list2` | Übersicht ohne Daten: Spieler sehen nur ihre eigenen Zeilen, die Spielleitung alle. |
| `charbogen_del2` | Löschen nur durch den Besitzer oder die Spielleitung des Raums; kurze oder leere Geheimnisse löschen nie. |
| Teil 2 (direkt nach Teil 1) | Die alten Funktionen ohne Schutz (`charbogen_put/get/list/del`) entfernen. Erst danach ist der Lesezugriff ohne Geheimnis vollständig geschlossen. |

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

## 3. Ausführung in Supabase (Reihenfolge verbindlich)

Projekt `ovkxoqgqocspwjvxhige`, Bereich **SQL Editor**. Die Kontrollabfragen stehen in `supabase/kontrolle-d2-d3.sql` (K0 bis K4) und lesen nur.

**Warum diese Reihenfolge:**
- D3 setzt die Spalte `owner_hash` und die Art `chron` aus D2 voraus. Ohne D2 bricht D3 Teil 1 mit „column owner_hash does not exist“ ab und ändert nichts.
- Teil 2 entfernt die alten Funktionen ohne Geheimnis. Erst danach ist der Zugriff ohne Geheimnis geschlossen, und erst dann ist der Zeitstempel des Altbestands nicht mehr für jeden abrufbar.
- **D2, D3 Teil 1 und D3 Teil 2 deshalb unmittelbar nacheinander ausführen.**

| Schritt | Was | Kontrolle |
|---|---|---|
| 0 | Table Editor → `charbogen_saves` → Export als CSV (Sicherung der 17 Zeilen). Optional zusätzlich eine Kopie in der Datenbank anlegen, siehe unten. | K0: `tabelle` und die vier alten Funktionen `true`, `zeilen` = 17. Ergebnis von K0b aufheben (Notiz oder Bildschirmfoto). |
| 1 | **D2:** `supabase/charbogen-saves.sql` ab der Zeile `-- D2 (17.11.2026, überarbeitet …)` bis zum Dateiende ausführen. | K1: alle `ok = true`. K1b zeigt das Schema von pgcrypto (`public` oder `extensions`, beides funktioniert). K1c: `ohne_besitzer` = 17. |
| 2 | **D3 Teil 1:** `supabase/d3-rechte.sql` von Dateianfang bis vor die Zeile `Teil 2` ausführen. | K2: alle `ok = true`. K2b ist anfangs leer; Altbestandsräume erscheinen erst, wenn die Spielleitung gespeichert hat. |
| 3 | **D3 Teil 2:** die vier `drop function`-Zeilen am Ende von `d3-rechte.sql` ohne `--` ausführen. Die aktuelle App braucht die alten Funktionen nicht mehr. | K3: alle `true`. |
| 4 | **App:** Auf allen Geräten neu laden. Erst die Spielleitung öffnet den Raum und speichert einmal (siehe „Altbestand“), danach die Spieler. Dann einmal neu laden: Unter Gruppe/Live-Tisch steht „Absicherung: aktiv“. | K1c: `ohne_besitzer` sinkt. K2b: Raum mit `hat_schluessel = true`. K4: Räume, Arten und Anzahlen wie in K0b. |

**Optionale Sicherungskopie in der Datenbank** (vor Schritt 1; ändert `charbogen_saves` nicht):
```sql
create table public.charbogen_saves_backup_d2 as select * from public.charbogen_saves;
alter table public.charbogen_saves_backup_d2 enable row level security;
revoke all on public.charbogen_saves_backup_d2 from anon, authenticated;
```

**Rückweg:** D2 und D3 löschen keine Stände.
- D3 Teil 1 lässt sich zurücknehmen, indem du den D2-Abschnitt erneut ausführst und `charbogen_rooms` löschst.
- Die alten Funktionen aus Teil 2 stellt das Grundskript (Anfang von `charbogen-saves.sql`) wieder her.

## 4. Grenzen und verbleibende Risiken

### Altbestand (die 17 Zeilen von vor D2)

Diese Zeilen wurden ohne Geheimnis gespeichert. Die Datenbank kann deshalb nicht feststellen, welchem Gerät sie gehören.

**Regel in D2/D3:**
- Eine solche Zeile wird nur übernommen, wenn das Gerät genau ihren gespeicherten Zeitstempel (`updated_at`, auf die Mikrosekunde) mitschickt.
- Ein blindes Überschreiben (`p_base = null`) oder ein falscher Zeitstempel ergibt „Konflikt“, und es wird nichts geändert.
- Übernimmt die Spielleitung ihre Zeile `dm`/`dm`, wird sie automatisch als Spielleitung des Raums eingetragen. Vorher kann niemand den Raum beanspruchen.

**Warum das keine echte Anmeldung ist:**
- Der Zeitstempel ist kein Geheimnis im kryptografischen Sinn.
- Solange die alten Funktionen bestehen (bis Teil 2), kann ihn jeder mit Raumcode abrufen; nach D2 allein auch über `charbogen_get2` für Charakterbögen.
- Wer in diesem Zeitfenster schneller ist als das richtige Gerät, kann eine Altzeile übernehmen.
- Nach Teil 2 bekommt den Zeitstempel einer Altzeile nur noch die Spielleitung des Raums.

**Gegenmaßnahmen:**
- D2, D3 Teil 1 und Teil 2 unmittelbar nacheinander ausführen.
- Danach zügig alle Geräte einmal speichern lassen.
- Mit K1c prüfen, wie viele Zeilen noch ohne Besitzer sind.

**Wenn ein Gerät nicht übernehmen kann** (Konflikt):
- Das richtige Gerät kennt den Zeitstempel, wenn es zuletzt gespeichert oder den Online-Stand geladen hat. Spieler können den Online-Stand ihrer Altzeile nach D3 nicht mehr selbst laden, weil sie nur die Spielleitung lesen darf.
- Für solche Fälle gibt es den sicheren Weg unten.

**Sicherer Weg (empfohlen für wertvolle Zeilen) – ausdrückliche Zuweisung:**
- Wer das Supabase-Projekt verwaltet, kann den Besitz im SQL Editor fest zuweisen.
- Das Geheimnis eines Geräts steht in seiner Sicherungsdatei (Einstellungen → Sicherung herunterladen, Eintrag `charbogen-cloud-secret`, Wert für den Raumcode).
- Wer die Sicherungsdatei des Geräts hat, beweist damit tatsächlich den Besitz:
```sql
-- Beispiel: Charakterbogen <ID> im Raum <CODE> dem Gerät mit diesem Geheimnis zuweisen (nur, wenn noch ohne Besitzer)
update public.charbogen_saves
   set owner_hash = encode(digest('<GEHEIMNIS AUS DER SICHERUNG>', 'sha256'), 'hex')
 where room = '<CODE>' and kind = 'char' and id = '<ID>' and owner_hash is null;
```
- Für die Spielleitung dasselbe mit `kind = 'dm' and id = 'dm'`. Danach einmal speichern; der Raum wird dann eingetragen.
- Liegt pgcrypto im Schema `extensions`, schreibst du `extensions.digest(…)`.

**Sperren statt übernehmen (optional, nach der Übernahme durch alle Geräte):**
- Zeilen, die dann noch ohne Besitzer sind, gehören zu niemandem mehr.
- Sie lassen sich gegen Übernahme sperren: `update public.charbogen_saves set owner_hash = 'gesperrt' where owner_hash is null;`
- Dabei ändert sich nur die Besitzerspalte, nicht der Inhalt. Lesen kann sie danach nur noch die Spielleitung (Charakterbögen) bzw. niemand (Spielleitungszeile).

### Weitere Grenzen

- **Neuer Raum ohne Spielleitungszeile:** Den ersten Anspruch auf einen ganz neuen Raum kann jeder stellen, der den Code vor der Spielleitung kennt. Das gilt auch für Altbestandsräume ohne Spielleitungszeile (in deinem Bestand prüfbar mit K0b). Die App beansprucht neue Räume sofort beim Öffnen. Die Spielleitung sähe einen fremden Anspruch als „Raum gehört einer anderen Spielleitung“.
- **Realtime selbst** ist weiter ein offener Kanal mit Raumcode. Geschützt sind die *Inhalte*: genaue TP verschlüsselt, Bögen nur über die Funktionen. Auch Nicht-Mitglieder mit Raumcode sehen Namen, Klasse, Stufe, RK, Zustände, Konzentration und die grobe TP-Stufe; das sind die Werte, die Mitspieler laut Auftrag sehen dürfen.
- **Nachrichten der Spielleitung an einzelne Spieler** gehen technisch an alle im Kanal; die App zeigt sie nur dem Empfänger. Gemeint sind Schadenshöhe, Gegenstand und Handout; sie enthalten keine vollständigen Bögen.
- **Geheimnis an das Gerät gebunden:** Auf einem neuen Gerät hilft nur die Sicherungsdatei.
- **Vollständige serverseitige Durchsetzung auch im Realtime-Kanal** bräuchte Supabase Auth und Realtime Authorization mit privaten Kanälen. Das ist nicht umgesetzt.

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

**SQL-Prüfung in einer echten PostgreSQL-Datenbank** (PGlite, PostgreSQL 17 als WebAssembly; Rollen `anon`/`authenticated` und Standardrechte wie bei Supabase nachgebildet):
- Getestet wurden die Dateien aus dem Projekt mit 17 Bestandszeilen: 14 Charakterbögen und 3 Spielleitungsbereiche in 4 Räumen.
- Zwei Ausgangslagen: pgcrypto nicht installiert, und pgcrypto schon in `public`.
- Geprüft: D2, D3 Teil 1 und Teil 2 nacheinander; die Kontrollabfragen K1, K2 und K3; fehlerhafte Eingaben, falsche und leere Geheimnisse, Konflikte, Altbestand, Chronik, Lesen, Übersicht, Löschversuche Unberechtigter und Rechte der Hilfsfunktionen.
- Dazu: D3 ohne D2 bricht ab; nach allen Schritten sind alle 17 Zeilen vorhanden, nicht übernommene unverändert.
- Ergebnis: 128 von 128 Prüfungen bestanden. Das Testskript liegt nicht im Projekt; der Bericht im Chat vom 17.11.2026 beschreibt es.
- Nicht nachgebildet: Supabase-eigene Besonderheiten außerhalb von PostgreSQL (PostgREST, Dashboard-Rollen). Deshalb die Kontrollabfragen nach jedem Schritt.
