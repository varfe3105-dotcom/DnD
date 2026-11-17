# Manueller Test mit zwei echten Geräten

**Stand:** offen, noch nicht durchgeführt. Die automatischen Tests bauen die Verbindung nur nach. Sie decken diesen Ablauf **nicht** ab: echte Supabase-Verbindung, zwei Browser, Handy im Ruhezustand, schlechtes WLAN.

**Aufbau**
- Gerät A ist die Spielleitung (Laptop oder Tablet).
- Gerät B ist der Spieler (Handy).
- Beide öffnen https://varfe3105-dotcom.github.io/DnD/.

Hake jeden Schritt ab, und notiere bei einem Fehler, was du siehst und was du erwartet hast.

## 0. Vorbereitung
- [ ] A und B: Unter Einstellungen → Sicherung eine **Sicherungsdatei herunterladen**, bevor du testest.
- [ ] B: Unter Einstellungen den Spielernamen eintragen (z. B. „Lea“).
- [ ] B: Unter Startseite → Charaktere gibt es einen Charakter (neu oder importiert). Stufe, TP und Gold notieren.

## 1. Kampagne anlegen und beitreten
- [ ] A: Spielleiterbereich → „Neue Kampagne leiten“, Name „Testrunde“, „Code erzeugen“, Speichern.
- [ ] A: „Leiten“. Die Übersicht zeigt „Raum <Code> öffnen“. Raum öffnen. Erwartet: grüne Ampel, „0 Spieler verbunden“.
- [ ] A: „Code kopieren“ und an B schicken.
- [ ] B: Startseite → „Kampagne beitreten“. Code eingeben, Charakter wählen, „Verbinden“. Erwartet: Name „Testrunde“ erscheint, Status „Spielleitung ist online“.
- [ ] B: „Beitreten“. Erwartet: Lagebericht von „Testrunde“, oben „KAMPAGNE · Testrunde · SPIELER“.
- [ ] A: Übersicht bzw. Gruppe zeigt den Charakter von B mit „gespielt von Lea“, TP und RK.

## 2. Lagebericht
- [ ] A: In der Werkzeugleiste Kapitel „Kapitel 1“, Termin und „Geplant“ eintragen. Unter Erkundung einen Ort anlegen und als „Hier sind wir“ setzen.
- [ ] B: Innerhalb weniger Sekunden erscheinen Kapitel, Termin, Planung und der Ortstitel. **Nicht** erscheinen darf der Notiztext des Orts.
- [ ] B: WLAN aus, Seite neu laden. Kapitel und Termin sind weiter sichtbar, weil sie dauerhaft gespeichert sind. WLAN wieder an.

## 3. Charakterstand
- [ ] B: Gruppe → eigener Charakter → Inventar, 5 Gold dazu. Unter Bearbeiten 100 XP dazu.
- [ ] B: Startseite → Charaktere. Der Eintrag „Testrunde“ zeigt den neuen Stand. „Grundbogen“ öffnen: dort gelten Gold und XP **ohne** die Änderung. Erwartet ist außerdem die Meldung „Raum von ‚Testrunde‘ verlassen“.
- [ ] B: Über „Weiter in ‚Testrunde‘“ zurück. Der Raum wird wieder betreten, Gold und XP stehen wie geändert.

## 4. Kampf
- [ ] A: Kampf → Vorbereitung. B unter „Aufstellung“ hinzufügen, zwei Goblin Warrior suchen und hinzufügen. Initiative eintragen (B 15, Goblins 12 und 8).
- [ ] A: „Kampf starten“. Erwartet: Initiativeleiste, B golden markiert, „Goblin 1“ als Nächstes.
- [ ] B: Kampf öffnen. Erwartet: dieselbe Reihenfolge, der eigene Eintrag golden, Meldung „Dein Zug!“ im Streifen. Ton nur, wenn eingeschaltet.
- [ ] B: In der Live-Leiste „Zug beenden“. Erwartet auf A und B: Goblin 1 ist am Zug.
- [ ] A: Goblin 1 4 Schaden geben. Erwartet auf B: Goblin 1 „angeschlagen“, ohne Zahl.
- [ ] A: In der Karte von B 8 Schaden senden. Erwartet auf B: Meldung „8 Schaden“ in Rot, Vorschlag in der Live-Leiste. Erst nach „Annehmen“ sinken die TP.
- [ ] A: Zustand „Prone“ mit 2 Runden senden. B nimmt an. Erwartet: Marke „Prone · 2“ bei A in der Gruppenkarte. Nach zwei Runden endet er.
- [ ] B: Wenn möglich, einen Konzentrationszauber wirken (z. B. Bless). A sieht die blaue Marke und sendet „Konzentration beenden“. B nimmt an, die Marke verschwindet auf beiden Geräten.
- [ ] A: Shield of Faith auf B legen (Gruppe → Wirkung). Erwartet auf B: Meldung „Shield of Faith wurde auf dich gewirkt“ und die RK um +2 grün.
- [ ] B: Handy 1 Minute sperren, währenddessen sendet A Heilung. Nach dem Entsperren muss der Vorschlag ankommen, weil er erneut gesendet wird.
- [ ] A: Kampfdialog eines Gegners öffnen, mit Escape bzw. Tippen daneben schließen. Bei offenem Dialog darf A nicht festsitzen.
- [ ] A: „Kampf beenden“, zweimal tippen. Erwartet: Gegner weg, B zeigt „Vorbereitung“.

## 5. Verlassen und wieder betreten
- [ ] B: Übersicht → „Verlassen“, Seite schließen. A sieht B nicht mehr verbunden.
- [ ] B: Seite neu öffnen → „Weiter in ‚Testrunde‘“. Erwartet: Raum verbunden, Gold, XP, TP und Zustände wie zuletzt.
- [ ] A: Raum schließen, Seite neu laden, „Leiten“. Notizen, Begegnungen und Kapitel sind da, der Raum wird wieder geöffnet.
- [ ] A und B: Zurück-Taste mehrmals drücken. Es geht Ansicht für Ansicht zurück, erst ganz am Anfang wird die Seite verlassen.

## 6. Zweite Kampagne (Trennung)
- [ ] A: eine zweite Kampagne „Nebenrunde“ leiten, Code an B.
- [ ] B: mit **demselben** Charakter beitreten. Erwartet: Der Stand entsteht aus dem Grundbogen, also ohne Gold und XP aus „Testrunde“.
- [ ] B: In „Nebenrunde“ TP ändern, dann zurück zu „Testrunde“. Dort sind die TP unverändert.
- [ ] A: In „Nebenrunde“ ist das Notizbuch leer, die eigenen Monster sind vorhanden.

## Ergebnis
Notiere je Abschnitt: ✓, ✗ (mit Beschreibung) oder „nicht geprüft“.
