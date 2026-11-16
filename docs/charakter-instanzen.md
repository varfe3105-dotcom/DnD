# Kampagnenspezifische Charakterstände und Spielleitungsdaten – Architekturkonzept

Stand 16.11.2026. **Nichts davon ist umgesetzt.** Grundlage für die Entscheidung des Nutzers. Ergänzt `docs/dm-daten-je-kampagne.md` (D1), weil beides dasselbe Prinzip braucht: Daten gehören einer Kampagne.

## 1. Bestand: was heute wo liegt

Alle Daten liegen im Browser (localStorage). Online gibt es nur die Raumspeicherung je Raumcode.

| Schlüssel | Inhalt | Bezug heute |
|---|---|---|
| `charbogen-v4` | der **gerade geladene** Charakter, vollständig (`S`) | global, ein Charakter |
| `charbogen-char-<id>` | alle **anderen** Charaktere, vollständig. Der geladene wird beim Wechsel aus seinem Platz genommen (`switchChar`, `park`). | global, je Charakter |
| `charbogen-index` | Liste: id, Name, Klasse, Stufe | global |
| `charbogen-campaigns` | Kampagnen: Name, Rolle, Raum, Termin, Kapitel, Planung, Chronik der Spieler (`log`), **Liste der Charakter-IDs** (`chars`) | je Kampagne, aber nur Verweise auf Charaktere |
| `charbogen-dm` | gesamter Spielleitungsbereich `D` | global, **eins pro Gerät** (D1) |
| `charbogen-live`, `-live-in`, `-live-out`, `-live-dmkey` | Raum, Posteingang, Ausgang, Kennung der Spielleitung | je Raumcode |
| `charbogen-cloud` | letzte bekannte Stände der Online-Speicherung | je Raum |
| `charbogen-player`, `-lang`, `-units`, `-skin`, `-bright`, `-mode`, `-invview`, `-turns` | Geräteeinstellungen | global (richtig so) |
| Online `charbogen_saves` | Raum + `char`/`<Charakter-ID>` bzw. `dm`/`dm` | je Raum |
| Sicherungsdatei / IndexedDB | alle Schlüssel nach Muster `KEEP` in `backup.js` | – |

Was `S` enthält: Identität (Name, Porträt `img`, Figurbild `fig`, Beschreibung `info`), Volk, Klasse, Unterklassen, Stufe, XP, Attribute, Rettungswürfe, Fertigkeiten, Talente, Merkmale, Ressourcen, Zauberplätze, Zauber und Vorbereitung, TP, Trefferwürfel, Todesrettungswürfe, Zustände mit Runden, Erschöpfung, Konzentration, Wirkungen, Zugzählung, Rucksack, Ausrüstung, Münzen, Begleiter, Notizen und Notizseiten, Ansichtszustand (`tab`, `notePage`).

**Befund:** Ein Charakter hat genau **einen** Spielstand. Die Kampagne verweist nur auf ihn. Spielt derselbe Charakter in zwei Kampagnen, teilen sich beide alles: Stufe, Gold, TP und Zustände. Die Online-Speicherung trennt schon heute nach Raum, schreibt aber immer diesen einen gemeinsamen Stand hinein.

## 2. Zielbild

**Charakter (Bibliothek)** = Identität + **Grundbogen**
- **Identität:** Name, Porträt, Figurbild, Beschreibung. Sie gilt überall.
- **Grundbogen:** der Bogen, wie er erstellt oder importiert wurde. Er ist die Vorlage, wenn der Charakter einer **neuen** Kampagne beitritt. Laufende Kampagnen verändert er nicht.

**Kampagnenstand (Instanz)** = vollständiger Bogen dieses Charakters **in genau einer Kampagne**
- Alles Spielrelevante liegt hier: Stufe, XP, Attribute, Talente, Zauber, Vorbereitung, Ressourcen, TP, Zustände, Wirkungen, Inventar, Ausrüstung, Münzen, Begleiter und Notizen zur Kampagne.
- Änderungen in Kampagne A berühren Kampagne B nie.

| Feld | Bibliothek | Kampagnenstand |
|---|---|---|
| Name, Porträt, Figurbild, Beschreibung | **führend** | zeigt die Bibliothek an, keine Kopie |
| alle übrigen Felder von `S` | Grundbogen (Vorlage) | **eigener Stand** |
| persönliche Notizen | Grundbogen (z. B. Hintergrundgeschichte) | beim Beitritt kopiert, danach eigener Stand |

## 3. Speicherung (Vorschlag)

- `charbogen-char-<id>` und `charbogen-index` bleiben **unverändert** und werden zur Bibliothek, also Identität und Grundbogen.
- Neu: `charbogen-inst-<Kampagnen-ID>-<Charakter-ID>` mit dem vollständigen Bogen im gewohnten v4-Format, dazu `camp: <Kampagnen-ID>`. Porträt und Figurbild werden nicht mitkopiert, das spart Speicher und hält die Identität einheitlich.
- `charbogen-v4` bleibt der „gerade geladene Bogen“. Ein Feld `S.camp` sagt, ob er der Grundbogen (`null`) oder ein Kampagnenstand ist.
  - Beim Wechsel schreibt `park()` ihn in den richtigen Platz zurück.
  - So arbeiten alle Seiten (Übersicht, Werte, Inventar, Zauber, Kampf) weiter mit `S` und müssen nicht umgebaut werden.
- Die Charakter-ID bleibt in jedem Kampagnenstand dieselbe. Damit bleiben Live-Kennung, Online-Speicherung (`char`/`<id>` je Raum), Wirkungen und Zugzählung unverändert gültig. Die Trennung entsteht über den Raum bzw. die Kampagne.
- **Spielleitungsdaten (D1)** nach demselben Muster: `charbogen-dm-camp-<Kampagnen-ID>`. Global bleiben nur Modus, Ansicht und eigene Monster. Einzelheiten in `dm-daten-je-kampagne.md`.

## 4. Abläufe danach

1. **Start:** Die Startseite zeigt die Kampagnen. „Weiterspielen“ öffnet die zuletzt geöffnete Kampagne.
2. **Kampagne öffnen:** Ihr Kampagnenstand (Spieler) bzw. ihre Spielleitungsdaten werden geladen. Die Brotkrumen zeigen das wie heute.
3. **Gruppe → eigener Charakter:** öffnet die Charakterseiten **mit dem Kampagnenstand**. Die Seiten aus Stufe 2 bleiben, nur die Datenquelle ist der Stand dieser Kampagne.
4. **Beitreten** (Code oder Zuordnung im Formular): Aus dem Grundbogen entsteht ein neuer Kampagnenstand. Gibt es schon einen, wird er nicht überschrieben.
5. **Globale Seite „Charaktere“ wird zur Bibliothek:**
   - erstellen (Assistent), importieren, Identität und Grundbogen bearbeiten
   - einer Kampagne zuordnen
   - sehen, in welchen Kampagnen der Charakter mit welcher Stufe spielt
   - Ein Kampf oder Spielstand gibt es dort nicht. Ein Hinweisband sagt: „Grundbogen – gilt für neue Kampagnen, nicht für laufende.“
6. **Stand übernehmen** (bewusste Aktion mit Bestätigung): „Stand aus Kampagne A als Grundbogen übernehmen“ oder „… in Kampagne B kopieren“, zum Beispiel bei einem Wechsel der Gruppe. Nie automatisch.
7. **Charakter aus Kampagne entfernen:** Der Kampagnenstand wird nur nach Bestätigung gelöscht; vorher kann er exportiert werden.

## 5. Import, Export, Sicherung, Offline, Online

- **Sicherungsdatei und automatische Stände:** `KEEP` nimmt `charbogen-inst-*` und `charbogen-dm-camp-*` auf. Alte Sicherungen ohne diese Schlüssel landen in der Bibliothek und laufen beim ersten Öffnen einer Kampagne durch die Übernahme unten.
- **Export eines Charakters:** exportiert den gerade geladenen Bogen. Das Format bleibt gleich, zusätzlich steht der Kampagnenname im Dateinamen. Beim Import wird nach dem Ziel gefragt: Bibliothek oder Kampagnenstand einer gewählten Kampagne.
- **Bogen aus PDF, Fremdformat und Assistent:** legen immer in der Bibliothek an.
- **Offline:** Es ist alles lokal; nichts ändert sich.
- **Online:** Die Raumspeicherung speichert schon je Raum, künftig eben den Kampagnenstand. **Keine Änderung an Supabase nötig.**

## 6. Übernahme bestehender Daten (Migration) – nur nach Freigabe

Grundsatz: Es wird nichts gelöscht, nichts überschrieben und nichts automatisch zugeordnet, ohne dass du bestätigst.

1. **Sicherung:** automatischer Stand in IndexedDB und Aufforderung, eine Sicherungsdatei zu laden.
2. **Bibliothek bleibt:** Alle `charbogen-char-*` und `charbogen-v4` bleiben unverändert und werden zum Grundbogen.
3. **Dialog „Kampagnenstände anlegen“** je Charakter, der in mindestens einer Kampagne steht:
   - **In einer Kampagne:** „Den aktuellen Stand von Borin als Stand in ‚Grenzland‘ übernehmen?“ Vorbelegt mit Ja.
   - **In mehreren Kampagnen:** Für jede Kampagne gibt es die Wahl „aktueller Stand“ oder „Grundbogen kopieren und dort von vorn“. Ohne Vorbelegung: Weil der heutige Stand eine Mischung aus beiden Kampagnen ist, kann nur der Nutzer sagen, wohin er gehört.
   - **„Später“:** Die Kampagne öffnet dann ohne Stand und fragt beim ersten Öffnen erneut.
4. **Charaktere ohne Kampagne** bleiben nur in der Bibliothek.
5. **Spielleitungsdaten (D1):** derselbe Dialog wie in `dm-daten-je-kampagne.md`.
6. **Rückweg:** Die Übernahme legt nur **neue** Schlüssel an. „Übernahme zurücknehmen“ löscht genau diese wieder. Bibliothek und alter Spielleitungsstand sind dann unverändert da.

## 7. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Stand landet in der falschen Kampagne | keine automatische Zuordnung bei mehreren Kampagnen; Rückweg |
| Speicherplatz (ein Bogen je Kampagne) | Bilder nur in der Bibliothek; Bögen ohne Bilder sind wenige KB; Warnung, wenn Speichern scheitert (gibt es schon) |
| Online-Stand eines Raums enthält noch den Mischstand | beim ersten Verbinden der vorhandene Abgleich „Online-Stand laden / meinen hochladen“; `p_base` schützt |
| Zwei Tabs, einer mit alter Fassung | alte Fassung kennt `S.camp` nicht und schreibt in `charbogen-v4`; beim nächsten Laden fragt die neue Fassung bei unklarer Herkunft nach |
| Live-Kennung gleich in zwei Kampagnen | unkritisch, weil die Räume getrennt sind |
| Begleiter, Wirkungen, Zugzählung | liegen in `S` und sind damit automatisch kampagnengetrennt |
| Tests | `charbogen-v4` bleibt der geladene Bogen; vorhandene Tests laufen weiter, neue Tests für Wechsel, Beitritt, Übernahme und Rückweg |

## 8. Umsetzungsreihenfolge (nach Freigabe)

1. Laden und Ablegen nach Kampagne (`S.camp`, `park` und Laden über die Kampagne), Spielleitungsdaten je Kampagne nach demselben Muster. Dazu Tests für die Trennung (Stufe, Gold, TP in A ändern, B bleibt gleich).
2. Übernahme-Dialog mit Sicherung und Rückweg. Test mit einer Kopie echter Daten.
3. Bibliotheksseite „Charaktere“ und neue Einstiege (Startseite → Kampagne → Gruppe → Charakter); „Stand übernehmen“ als bewusste Aktion.
4. Danach weiter mit Stufe 4 (Kampf), weil der Kampf dann schon auf den Kampagnenständen aufbaut.

## 9. Entscheidungen

1. Gemeinsam über alle Kampagnen sind nur Name, Porträt, Figurbild und Beschreibung. Alles andere ist je Kampagne getrennt. *(Empfehlung: ja)*
2. Der Bibliotheks-Charakter ist ein Grundbogen ohne Spielbetrieb, also ohne Kampf und ohne Rasten. *(Empfehlung: ja)*
3. Migration bei mehreren Kampagnen ohne Vorbelegung, bei nur einer Kampagne mit „aktueller Stand“ vorbelegt; immer mit Bestätigung. *(Empfehlung: ja)*
4. D1 (Spielleitungsdaten je Kampagne) zusammen mit Schritt 1 umsetzen, mit eigenen Monstern weiter global. *(Empfehlung: ja)*
