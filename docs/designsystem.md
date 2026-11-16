# RealmCraft – Designsystem

Verbindliche Referenz ist die Startseite (Dashboard). Dieses Dokument hält fest, welche Bausteine es gibt und wo sie definiert sind, damit weitere Bereiche sie wiederverwenden statt neu zu bauen.

## Schichten (Ladereihenfolge in `src/index.html`)

| Datei | Inhalt |
|---|---|
| `tokens.css` | einzige Quelle für Farben, Schriften, Abstände, Flächen, Schatten, Verläufe |
| `styles.css` | Aufbau und Druck (hell), keine Markenoptik |
| `theme.css` | Grimoire-Optik des Spielbereichs auf dem Bildschirm (Karten, Medaillons, Pergament für Regeltexte) |
| `areas.css` | Bereiche mit eigener Identität: Startseite, Charakterbereich, Weltkarte; gemeinsame Bausteine |
| `skins.css` | alternative Darstellungen „Schlicht“ und „Modern“, nur im Spielbereich (`:not([data-hub])`) |

Bereichskennung am `html`-Element (gesetzt in `render.js`): `data-hub` auf der Startseite, `data-area="hub" | "char" | "play"`. `char` ist die Karte des Charakters. Neue Bereiche bekommen einen eigenen Wert, und ihre Regeln hängen daran, damit nicht freigegebene Seiten unverändert bleiben.

## Grundwerte (`tokens.css`)

- **Flächen:** Anthrazit `--c-anth-1…4`, Nacht `--c-night`, Aubergine `--c-aub*` (nur Akzent: aktive Navigation, Hauptknopf, Hervorhebung), Braun.
- **Kontrast:** Pergament `--c-parch*` mit Tinte `--c-parch-ink`, Rubrik `--c-rubric`.
- **Akzent:** Messing `--c-brass-lt / --c-brass / --c-brass-dk`, Linien `--c-brass-a` (deutlich) und `--c-brass-soft` (zart).
- **Text:** `--c-cream`, `--c-cream-2`, `--c-cream-mute`. Status: `--c-good`, `--c-bad`, `--c-warn`.
- **Schriften:**
  - Titel und Zahlen: `--f-title` (Cormorant Garamond 600/700)
  - Text und Bedienung: `--f-body`/`--f-ui` (Alegreya)
  - Kapitälchen-Beschriftungen: `--f-cap` (Cinzel)
- **Flächen fertig gemischt:** `--surface-page`, `--surface-card`, `--surface-raised`, `--surface-parch`.
- **Rahmen:** `--frame` (Messingrahmen mit Ecken, als `border-image`).
- **Schatten:** `--sh-1…3`, `--glow-brass`.
- **Verläufe:** `--grad-pri` (Aubergine, Hauptknopf), `--grad-btn`, `--grad-gold` (Fortschritt).

## Grafiken (`src/assets/realmcraft/`, Übernahme mit `scripts/import-realmcraft.py`)

- **Branding:** `monogram.webp` (Seitenleiste, Kopf mobil), `wordmark.webp`.
- **Illustrationen:** sechs Kampagnenbilder, gemeinsam genutzt über die Klassen `.hub-camp-art.a0 … a5`. Sie werden auch im Charakterkopf (`.hd-art`) und auf Charakterkarten (`.hub-char-art`) eingesetzt, jeweils mit dem Bild der Kampagne des Charakters.
- **Pergament:** `parchment-sheet.webp`, immer als `border-image: url(…) 120 fill / 30–34px stretch`. So bleiben die Rissränder unverzerrt. Nie als einfache Fläche strecken.
- **Ornamente:** `divider-1…4.webp`. Einsatzorte:
  - divider-1: Seitenleiste, senkrechter Rand
  - divider-2: Zitat
  - divider-3: Willkommensbereich und Zierornament oben an Panels (`.hub-panel.orn`)
  - divider-4: Kopfzeile und Zitat

## Bausteine

| Baustein | Klasse / Regel | Einsatz |
|---|---|---|
| Panel mit Messingrahmen | `.hub-panel`, `.card` | Informationsflächen; `.orn` setzt ein Zierornament oben |
| Pergament-Dokument | `.hub-doc`, `.hub-parch`, im Bogen `.skgrid` | Formulare, Listen zum Lesen, Fertigkeiten |
| Bildkarte | `.hub-camp`, `.hub-char` | Illustration oben, dunkler Verlauf, Rahmen mit Ecken, Hover hebt an |
| Abschnittsüberschrift | `.hub-h` (Symbol, Titel, Goldlinie, „Alle anzeigen“), im Bogen `h2` mit Raute und Goldlinie | jede Sektion |
| Knopf | `:is(.hbtn, … .btn)`: spitze Enden, Messingkante; `.pri`/`.solid`/`.gilt` = Aubergine; `.sm`; `.hub-ib` = Symbolknopf | Startseite und Charakterbereich teilen dieselbe Regel |
| Navigation | `.hub-side nav` (senkrecht), `.tabs nav` (waagrecht im Spielbereich): aktiv = Aubergine-Verlauf + Messinglinie | |
| Werte-Kachel | `.stats .st`, hervorgehoben `.st.ac`; Beschriftung in Cinzel-Kapitälchen, Zahl in Cormorant | |
| Status | `.hub-status` (Punkt + Text), Fortschritt `.hub-prog`, TP-Balken `.hub-hp` / `.hub-stats .hp` | |
| Porträt | `.hub-por` (`.md`, `.lg`, `.xl`), Messingring; ohne Bild Initiale | nur echte Porträts aus dem Bogen |
| Eingabefelder | auf dunkel: Grimoire-Regeln in `theme.css`; auf Pergament: `.hub-doc :is(input,select,textarea)` | |

## Regeln

- Pergament gezielt einsetzen: für Inhalte, die man liest oder ausfüllt, nicht für jede Fläche.
- Ornamente nur an Übergängen und Kanten, nicht in Listen.
- Aubergine ist Akzent, die Grundfläche bleibt Anthrazit.
- Zahlen, die im Spiel zählen (TP, RK, Modifikatoren), stehen in `--f-title` und groß. Beschriftungen stehen klein in Kapitälchen.
- Keine erfundenen Inhalte: Bilder von Personen nur aus echten Bögen.
