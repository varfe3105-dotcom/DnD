# D&D-Charakterbogen: Übergabe für Claude Code

Dieses Dokument fasst zusammen, was in einem Chat zu einem digitalen D&D-Charakterbogen besprochen und gebaut wurde. Es ist als Einstieg für Claude Code gedacht. Sprache mit der Nutzerin bzw. dem Nutzer: Deutsch.

## 0. Projektstand (aktuell, geht den Abschnitten unten vor)

**Bauen und prüfen:** `npm run build` erzeugt `dist/charakterbogen.html` (eine Datei, läuft per Doppelklick). `npm test` baut und testet mit Playwright. `npm run test:legacy` lässt dieselben Tests gegen das Original laufen. `npm run lint` findet fehlende Importe. `npm run screens` legt Screenshots in `screenshots/` ab.

**Aufbau:**
- `legacy/`: Original v4 (Quelle war das Artifact „D&D Charakterbogen“) und der ältere v2-Prototyp. Nicht ändern. Die Datei `charakterbogen.html` aus den Downloads ist nur der v2-Prototyp.
- `src/`: `index.html` (Gerüst), `styles.css`, `main.js`, `state.js` (Zustand `S`, UI-Zustand `U`, Laden und Migration), `catalog.js` (baut `CAT`/`BYN` aus `data/`), `tables.js`, `helpers.js`, `game.js` (Regeln), `render.js`, `events.js`, `tooltip.js`, `icons.js`, `constants.js`, `util.js`, `views/` (sheet, inventory, wiki, setup, levelup).
- `data/`: `spells`, `items`, `magic-items`, `potions`, `conditions`, `exhaustion`, `rules`, `classes`, `races`, `tables` als JSON. Datensätze tragen `source` und `verified`.
- `data/translations/`: deutsche Texte (`de-spells-*`, `de-magic`, `de-items`), PHB-/DMG-Zusammenfassungen (`phb-extra-spells`, `dmg-extra-items`). `scripts/import-srd.mjs` führt sie mit dem SRD zusammen (Rohdaten in `.cache/5e-database`, per `git clone --depth 1 https://github.com/5e-bits/5e-database .cache/5e-database`). `scripts/check-translations.mjs` meldet Würfel und SG, die nur im Deutschen stehen. `docs/srd-gaps.md` zeigt den Abgleich mit dem PHB.
- `data/subclasses.json` (`Klasse → Unterklasse → Stufe → Merkmale`), `data/feats.json`, `data/options.json` (Kampfstile, Metamagie, Anrufungen). Quelle: `data/translations/subclasses-*.json`, `feats-options.json`. Die Daten zu Unterklassen und Talenten stammen aus dem Wissen des Assistenten und sind nicht am Buch geprüft (`verified: false`).
- Zweisprachig: `src/i18n/` (Wörterbücher, `t()`, `loc()`, `dice()`, `dist()`). Sprache liegt in localStorage `charbogen-lang`, Strecken intern in Metern. Gespeicherte Gegenstände haben optional `ref` (Katalogschlüssel) und folgen dann der Sprache; eigene Einträge bleiben wörtlich.
- **Stand der Phasen:** Alle Phasen (1 bis 7) sind fertig.
- **Rüstungsklasse:** `S.acMode` (`auto` bei neuen und importierten Charakteren, `manual` bei allen älteren). `computeAc()` in `helpers.js`, Werte aus `ac` in `data/items.json`. Zauber wie Mage Armor werden nicht eingerechnet. **Übungen:** `S.tools`, `S.langs`. Die Runde spielt nur mit PHB, DMG und Monster Manual, also ohne Erweiterungen; `data/translations/other-extra-spells.json` bleibt deshalb leer.
- **Bogen aus PDF oder Bild:** `src/sheet-read.js` (pdf.js, Tesseract aus dem Netz nur bei Bildern) und `src/sheet-parse.js` (positionsbasiert, Layout des WotC-2024-Bogens, Rest Heuristik). Immer Prüfansicht vor dem Anlegen, Übung wird aus Wert minus Modifikator abgeleitet.
- **Import fremder Sicherungen:** `src/import-play5e.js` (Format `kind: dnd-backup`, Prüfung mit Zod). Dort sind die Attribute Grundwerte ohne Volksbonus; der Importer rechnet ihn ein. Sie kommen als neue Charaktere dazu, Nicht-Zuordenbares in die Notizen. Beispieldatei liegt lokal in `import/` (nicht im Repo).
- **Live-Tisch:** `src/live.js`, Supabase Realtime Presence im Projekt `ovkxoqgqocspwjvxhige`. Keine Tabellen, nichts wird gespeichert, verbunden wird erst nach Beitritt. Eingehende Daten laufen durch `clean()`. Der Publishable Key steht bewusst im Code, der Secret Key gehört nie hinein. Tests nutzen `window.__liveFake`, `npm run test:live` prüft gegen das echte Projekt.
- **DM-Begegnungen:** Gruppe `D.party`, gespeicherte Begegnungen `D.encounters`, eigene Monster `D.custom`, Rechner `rate()` in `dm.js` (XP und Faktoren nach DMG). Effekte `c.fx` zählen pro Runde herunter, `c.la` und `c.slots` kommen aus dem Monstertext.
- **Angriffe, Ladungen, Begleiter, Hintergründe:** `src/attacks.js` (Übung nach Klasse/Volk, `raw.prof` überschreibt, Kampfstile aus `S.feats`), `src/companions.js` (`raw.chUsed/chMax/chRe`, Katalogwert aus `chargeInfo()`; `S.pets`), `src/backgrounds.js` (`S.bg`, Daten `data/translations/backgrounds.json`). **Spickzettel:** `data/rule-sections.json`, deutsche Kurzfassungen in `data/translations/rule-sections-de.json`.
- **Live in beide Richtungen, Sicherung, Beute:** `live.js` schickt per Broadcast Vorschläge und Handouts (`cleanMsg`, Spieler nimmt an), `src/backup.js` (Datei `kind: charbogen-backup`, die letzten 5 Stände in IndexedDB), `src/loot.js` (Münzen nach CR, nicht am Buch geprüft). Beute geht als Vorschlag `item`/`gold`, `D.lootLock` blendet das Hinzufügen beim Spieler aus (`lootLocked()`). Figurbild im Inventar `S.fig`. Ein KI-Fenster wurde bewusst nicht gebaut, weil es API-Kosten zusätzlich zum Abo verursacht.
- **Notizseiten:** Die erste Seite bleibt `S.notes` (`S.noteTitle`), weitere in `S.notePages`, Ansicht `src/views/notes.js`. **Orte:** Notizen der Art `place` haben `monsters: [{id, qty}]`, Schwierigkeit über `rate()`, Start über `startPlace()`.
- **DM-Bereich:** `src/dm.js` (Zustand `D` in localStorage `charbogen-dm`, getrennt von den Charakteren) und `src/views/dm.js`. Einschalten unter Einrichten, Standard aus. Monster in `data/monsters.json` (SRD, nur Englisch).
- **Mehrere Charaktere:** Der aktive liegt weiter in `charbogen-v4`, die anderen in `charbogen-char-<id>`, Übersicht in `charbogen-index`. **Multiclassing:** `S.multi = [{k, sub, lvl}]` für weitere Klassen, `S.klass` bleibt Hauptklasse, `classLevels()` und `slotsAll()` in `tables.js`.
- **Web-Fassung:** `npm run build:web` erzeugt `dist-web/` (installierbar, offline per Service Worker). Öffentliches Repository https://github.com/varfe3105-dotcom/DnD, `.github/workflows/pages.yml` veröffentlicht `dist-web/` nach https://varfe3105-dotcom.github.io/DnD/. Commits nur mit der GitHub-noreply-Adresse (in der lokalen git-Konfiguration hinterlegt), nie mit der privaten Mail.
- **Icons:** `src/assets/icons.png` (Shikashi-Pack, 32 × 32) mit Zuordnung in `src/icon-art.js` (`BY_KEY` je Katalogschlüssel, `MAGIC` nach Muster, `BY_IC` allgemein). Ohne Treffer zeigt `glyph()` das eigene SVG.
- **Volle deutsche Texte:** Zauber (`de-full-spells-*`), Gegenstände (`de-full-items-*`) und alles Übrige (`de-full-texts-*`, Zuordnung englischer Text → deutscher Text für Zustände, Ausrüstung, Völker, Talente, Optionen, Klassen, Unterklassen, Multiclass, Regeln). Kampfstile, Metamagie und Anrufungen kommen im Englischen aus dem SRD. Talente und Unterklassen außerhalb des SRD sind ausführliche eigene Zusammenfassungen (Englisch und Deutsch direkt in `feats-options.json` und `subclasses-*.json`). `scripts/apply-full.mjs` setzt die Übersetzungen ein und läuft am Ende von `import-srd.mjs` mit. Ändert sich ein englischer Text, greift seine Übersetzung nicht mehr; `scripts/check-full.mjs` vergleicht Würfel und SG.
- **Offene Datenqualität:** Bei 112 Einträgen fehlen in der deutschen Fassung Nebenwerte (`.cache/de-check.txt` nach dem Import). Unterklassen und Talente außerhalb des SRD sind nicht am Buch geprüft.
- `S` ist eine Live-Bindung aus `state.js`. Neu zuweisen geht nur über `setS()`. Oberflächenzustand liegt in `U` (`U.SEL`, `U.LU` …).


## 1. Ziel

Ein digitaler Charakterbogen für **D&D 5e, Edition 2014** (nur Player's Handbook und Dungeon Master's Guide, **kein Homebrew-Regelwerk**), der beim Spielen am Laptop statt Stift und Papier genutzt wird. D&D Beyond ist für den Charakter hinter einer Paywall, deshalb der Eigenbau.

Der Bogen soll auch an Freunde aus der Spielgruppe weitergegeben werden (privater Kreis, nicht öffentlich beworben). Manche nutzen vielleicht weiter Papier, andere wollen ihn digital und mit Speicherung.

Kernidee: Man will **beim Spielen nachschlagen können, was ein Zauber, ein Trank, ein Item oder ein Angriff macht, ohne zu googeln**, und Verbrauchtes einfach abhaken.

## 2. Anforderungen (so wurden sie genannt)

- **Nichts vorbelegt.** Jeder trägt seinen eigenen Charakter ein (Klasse ist nicht festgelegt).
- **Seiten:** `Karte` (Spielansicht), `Inventar`, `Notizen`, `Einrichten` (alles anlegen und bearbeiten). Spielansicht nur mit Plus/Minus und Ankreuzfeldern, keine Bearbeitung.
- **Karte:** RK, Initiative, Tempo, Übungsbonus, die sechs Attribute mit Modifikator (+x) und Wert, Lebenspunkte nur mit +/- Buttons, Trefferwürfel, Tränke/Fähigkeiten, Zauberplätze, Zauberliste, Zustände.
- **Verbrauch:** Wird etwas eingesetzt, wird das Kästchen mit ✕ markiert und ist sichtbar blockiert.
- **Globale Rasten:** Ein Button „Kurze Rast“ und einer „Lange Rast“ setzen zurück, was nach Regelwerk zurückkommt.
- **Geld:** Platin, Gold, Elektrum, Silber, Kupfer, anpassbar (Einkauf, Beute).
- **Katalog:** Alles Standardmäßige aus PHB/DMG per **Dropdown** wählbar (Zauber, Tränke, Waffen, Rüstungen, Werkzeuge, Pakete, Ausrüstung) mit **Regeltext direkt sichtbar** (Auswahlvorschau und dauerhaft unter dem Eintrag). Dazu **eigene Einträge** für Dinge, die sich die Spielleitung ausdenkt.
- **Zustände im Kampf:** gefesselt, gelähmt usw. markierbar, mit Regeltext, damit man nichts vergisst.
- **Design:** Angelehnt an offizielle Charakterbögen, aber **übersichtlicher** und ausdrücklich **nicht „generischer KI-Look“**.
- **Icons:** Für Waffen, Tränke, Kits usw. gewünscht. Aktuell Emojis, ein richtiges Icon-Set wäre ein Upgrade.
- **Nutzer hat Bücher auf Englisch.** Deshalb Zaubernamen auf Englisch, Beschreibungen auf Deutsch.

## 3. Aktueller Stand (Version 4)

Datei: `charakterbogen.html`. Eine einzelne, selbstständige HTML-Datei ohne Build, ohne Backend. Mit Playwright im Headless-Chrome durchgeklickt (Schaden/Heilung, Todesrettungswürfe, Wirken mit Platzverbrauch, Paktmagie, Konzentration, Rasten, Drag-and-drop, Export/Import, Handybreite 390 px ohne Querscrollen).

**Tabs:** Karte (Spielansicht), Inventar, Nachschlagen (Wiki), Notizen, Einrichten.

**Technik:** Vanilla JS, globaler Zustand `S`, `render()` baut das DOM per String-Templates neu, Event-Delegation über `data-a` (Aktionen) und `data-p` (Pfad für Eingabefelder, z. B. `abil.str`, `slots.0.max`). Speicherung per `localStorage`, Schlüssel `charbogen-v3`; alte Daten aus `charbogen-v2` werden beim ersten Laden automatisch übernommen (`migrate()`). Render nach `change` wird verzögert (`later()`), damit Klicks auf Buttons nicht verloren gehen.

**Zustandsmodell (`S`, v: 3):**

```
name, info, cls (Klassenkürzel B/C/D/P/R/S/K/W), hp, hpMax, tmp, ac, speed, prof
abil {str..cha}, saves {str:true}, skills {Stealth: 0|1|2}   // 2 = Expertise
hd {max, used, die}, death {s, f}, conc (Name des Konzentrationszaubers)
slots [9 × {max, used}], pact {max, used, lvl}               // Paktmagie: zurück bei kurzer Rast
res   [{n, ic, max, used, rest:'long'|'short'|'none', p}]   // Klassenfähigkeiten
spells[{n, ic, lvl, time, range, dur, eff, conc, ritual, school, cls, src:'sum'|'own'}]
bag   [Item|null, …]  (Rucksackraster, 6 Spalten)
eq    {head, neck, cloak, body, main, off, hands, waist, feet, ring1, ring2}
Item  {id, n, ic, p, q, slot:''|'hand'|'off'|'body'|'head'|…|'ring', cons, att, tuned}
gold {pp,gp,ep,sp,cp}, cond {Blinded:true}, exh, notes, tab
```

**Neu in Version 3:**
- Schaden/Heilen/Temp-TP per Zahl; Temp-TP fangen zuerst ab; bei 0 TP Unconscious + Todesrettungswürfe; Konzentrations-SG wird bei Schaden angezeigt.
- „Wirken“ verbraucht den niedrigsten passenden Platz (Paktmagie zuerst) und setzt die Konzentration. Zauber nach Grad gruppiert, Plätze direkt im Gradkopf.
- Angriffe aus der ausgerüsteten Haupt-/Nebenhand berechnet (Finesse = max(ST, GE), Munition = GE, Übung angenommen, „+1“ im Namen zählt mit).
- Rettungswürfe, 18 Fertigkeiten (geübt/Expertise), passive Wahrnehmung.
- Inventar wie ein Spielinventar: Figur mit Ausrüstungsplätzen + Rucksackraster, Ziehen per Maus/Touch (Pointer Events), Stapeln von Verbrauchsgütern, Antippen = Detailfeld (Benutzen, Ausrüsten, Einstimmen max. 3, Platz ändern, Entfernen mit Bestätigung).
- Nachschlagen: Suche über Zauber, Tränke, magische Gegenstände, Ausrüstung, Zustände, Regeln (Rasten, Todesrettungswürfe, Konzentration, Aktionen, Deckung …); Filter „Mein Bogen“ und Klassenfilter; direkt hinzufügen.
- Eigene SVG-Icons (keine Emojis mehr), Schriften IM Fell English SC / Alegreya / Alegreya Sans SC über Google Fonts mit Fallback.
- Export als JSON-Text (kopieren), Import per Text oder Datei, Reset mit Bestätigung.
- Lange Rast senkt Exhaustion um 1 (mit Hinweis auf Essen/Trinken).

**Neu in Version 4 (Speicherschlüssel `charbogen-v4`, übernimmt v3 und v2 automatisch):**
- Mittelalter-Look: Lederband-Kopf mit Porträtmedaillon und Stufensiegel, Schrift Grenze Gotisch für Überschriften, Pergament-Körnung (SVG-Noise), Attribute als Wappenschilde, Reiter als Karteikarten.
- Icons: eigene SVG-Strichsymbole in „Seltenheitsrahmen“ (`tok()`, Töne steel/crimson/arcane/gold/leather/verdant/shadow), magische Gegenstände leuchten violett. Platzhalter, bis echte Icon-Pakete eingebunden sind.
- Inventar-Tooltip beim Überfahren (Name, Platz, Einstimmung, Regeltext, berechneter Angriff).
- Wiki (vorher „Nachschlagen“): Desktop zweispaltig (Liste | Eintrag), Handy aufklappbar. Neue Kategorien Klassen und Völker.
- Porträt: Bild wird auf 320 × 320 px JPEG verkleinert und in `S.img` gespeichert (auch im Export).
- Volk/Untervolk (alle PHB-Völker, `RACES`), Klasse (alle 12, `CLASSES`), Unterklasse, Stufe. Volksmerkmale erscheinen unter „Merkmale“; Tempo wird gesetzt; Odemwaffe bzw. Relentless Endurance als Fähigkeit.
- Stufenaufstieg (Dialog): TP (Durchschnitt oder gewürfelt, Hill Dwarf +1), Übungsbonus, Klassenmerkmale mit Kurztext, Unterklassenwahl, ASI oder Talent, Zauberplätze (voll/halb nach PHB-Tabelle), Paktmagie, Cantrips/bekannte/vorbereitbare Zauber, Klassenressourcen (`resFor()`). Stufe 1 setzt außerdem die Rettungswurf-Übungen.
- Unterklassen-Merkmale sind nur als Platzhalter eingetragen (Name der Unterklasse + Stufe). Ihre Texte fehlen noch.
- Lange Rast weist darauf hin, dass Zustände wie Blinded nicht durch die Rast enden.
- Bekannter Stolperstein: CSS-Klasse `.ghost` ist der helle Kopf-Button; das gezogene Inventar-Symbol heißt `.dragghost`.

**Weiter offen:** Unterklassen-Merkmale und Talente als Daten, echtes Icon-Set (Kandidaten: Shikashi's Fantasy Icons Pack, CC BY 4.0; drummyfish „fantasy rpg icons“, CC0; Painterly Spell Icons, Lizenz prüfen), Katalog in JSON auslagern und mit SRD 5.1 auffüllen, Multiclassing, mehrere Charaktere, Spielleiter-Ansicht, Charakterdatei aus dem anderen Tool importieren.

## 4. Daten und Rechtliches (wichtig)

Entscheidung aus dem Gespräch, so beibehalten:

- Der vollständige PHB/DMG-Text ist urheberrechtlich geschützt und **nirgends legal als freie Datenquelle** erhältlich.
- Frei verfügbar ist der **SRD 5.1 unter CC-BY 4.0** (Namensnennung nötig; Open5e und dnd5eapi.co spiegeln ihn, z. B. als JSON im GitHub-Repo `5e-bits/5e-database`). Daraus die Basis laden und **die Quelle im Bogen nennen**.
- Der SRD enthält nur einen Teil: nach Wissen des Assistenten nur eine Unterklasse pro Klasse, wenige Völker/Untervölker (z. B. kein Wood Elf), kaum Hintergründe und Talente, etwa 320 von etwa 360 PHB-Zaubern, nicht alle magischen Gegenstände. **Das beim Import prüfen und nicht blind glauben.**
- Alles **außerhalb des SRD** wird als **Zusammenfassung in eigenen Worten** geschrieben: Spielmechanik ist nicht geschützt, Formulierungen schon. **Keine wörtlichen Buchtexte.** Kein Scrapen inoffizieller Sammlungen (z. B. 5e.tools).
- Die Nutzerin/der Nutzer hat ausdrücklich zugestimmt: Zusammenfassungen sind in Ordnung, **solange alle spielrelevanten Werte drinstehen** (Zeit, Reichweite, Dauer, Schaden, Rettungswurf, Höherstufung, Konzentration, Ritual, Komponenten wenn relevant).
- Jeder Eintrag sollte ein Feld haben, ob er aus dem SRD stammt oder zusammengefasst wurde (z. B. `source: 'srd' | 'summary'`, `verified: false`). In der Oberfläche den Hinweis „Zusammenfassung, bei Unklarheit im Buch prüfen“ anzeigen.

## 5. Nächste Schritte (Reihenfolge)

1. **Lokales Projekt anlegen** und `charakterbogen.html` testen. Fehler aus dem Durchklicken beheben.
2. **Katalog auslagern** in eigene JSON-Dateien (`spells.json`, `items.json`, `potions.json`, `conditions.json`), damit er unabhängig vom Code wächst. Per Build-Skript oder Import in die HTML einbetten, sodass es weiterhin ohne Server läuft.
3. **SRD-Basis importieren** (Zauber, Ausrüstung, magische Gegenstände), Lizenzhinweis einbauen.
4. **Lücken füllen, klassenweise:** zuerst alle PHB-Zauber nach Klasse (Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard), dann die restlichen magischen Gegenstände aus dem DMG, danach Unterklassen-Features, Völker, Hintergründe, Talente (wird für die Weiterentwicklung gebraucht). Pro Zauber: Grad, Schule, Zeit, Reichweite, Dauer, Konzentration/Ritual, Komponenten, Wirkung, Höherstufung, Klassenliste.
5. **Zauberauswahl nach Klasse filtern** (Klasse im Einrichten-Tab wählen, Dropdown zeigt dann deren Zauber).
6. **Import der Charakterdatei (.json):** Die Nutzerin/der Nutzer hat den Charakter in einem anderen Tool gebaut und als .json exportiert. Die Datei ist **noch nicht hochgeladen, das Format ist unbekannt.** Erst die Datei ansehen, dann einen Importer schreiben, der Werte, Ausrüstung, Zauber, Gold übernimmt. Die Hintergrundgeschichte fehlt noch, gehört in die Notizen.
7. **Export/Import des eigenen Blatts** als JSON-Text zum Sichern und für Gerätewechsel (wichtig, weil `localStorage` pro Browser gilt).
8. Danach: Rettungswürfe und Fertigkeiten, Angriffsliste, Todesrettungswürfe, Konzentration, Warlock-Plätze, mehrere Charaktere, echtes Icon-Set statt Emojis, Druckansicht.

## 6. Architekturempfehlung (Stand Gespräch)

Eine ältere Empfehlung (Next.js, Supabase, Vercel) wurde besprochen und als **zu groß** eingestuft. Gründe: ein einzelner Charakter pro Person braucht kein Login und keine Datenbank. **Bleibt bei statischer Seite + `localStorage` + JSON-Katalog.** Hosting später z. B. als statische Seite (GitHub Pages) oder einfach als Datei weitergeben. Server/Datenbank erst, wenn mehrere Personen dieselben Daten teilen sollen.

## 7. Design-Richtlinien

**Aktuell gilt:** eigenes Motiv „Grimoire“ in `src/theme.css`: geprägtes Leder mit Eisenbeschlägen, Runensteine, Regeltexte auf Pergament, Lesezeichen als Reiter, nächtliche Landschaft. Mood wie klassische Rollenspiele, aber ohne Grafiken, Logos oder Layout eines bestimmten Spiels; alle Bilder erzeugt `scripts/make-art.mjs`. Die Druckansicht bleibt hell.

- Pergament-Optik: warmes Beige (`#efe4cc` Hintergrund, `#f8f1de` Karten), dunkle Tinte (`#2b2118`), Akzent Dunkelrot (`#8a2a2a`); **Dunkelmodus** als Lederton (`#17130f`, Akzent Gold `#d9a441`). Farben als CSS-Variablen auf `:root`.
- Serifenschrift (Iowan Old Style/Palatino/Georgia), Überschriften in Großbuchstaben mit Linie, doppelte Rahmen an Karten, Attribute als „Wappenfelder“ mit Modifikator groß und Wert in einer Kapsel darunter.
- Ankreuzfelder: leeres Quadrat = verfügbar, Quadrat mit ✕ = verbraucht.
- Am Laptop: Attribute als Spalte links, Inhalt rechts. Am Handy: Raster.
- Wichtig: übersichtlicher als die offiziellen Bögen, nicht alles auf einer Seite zusammenpressen.

## 8. Arbeitsweise mit dem Nutzer

- Deutsch, knapp, ohne langes Drumherum. Fachbegriffe aus den englischen Büchern (Zaubernamen, Zustände) auf Englisch lassen.
- Maximal eine Rückfrage pro Antwort. Erst machen, dann erklären.
- Ehrlich sagen, was nicht getestet oder nicht sicher ist. Bei Regelwerten im Zweifel auf das Buch verweisen.
- Die Nutzerin/der Nutzer diktiert Nachrichten per Sprache, Formulierungen sind daher teils holprig; auf die Absicht achten.
