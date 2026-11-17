# D2 – Gemeinsame Chronik und Schutz der Spielleitungsdaten (Vorschlag, NICHT ausgeführt)

Stand 17.11.2026. **Freigegeben.** Die App-Seite ist umgesetzt (`src/cloud.js`: Geheimnis je Raum, `*_put2/_get2/_del2` mit Rückfall auf die alten Funktionen; Kampagnenbuch „Mit der Gruppe teilen“). Das SQL steht auch am Ende von `supabase/charbogen-saves.sql` und muss **von dir** im Supabase SQL Editor ausgeführt werden; ich habe keinen Zugang mit Schreibrechten und soll auch keinen geheimen Schlüssel bekommen.

## Befund: bestehende Lücke

Die Online-Speicherung (`supabase/charbogen-saves.sql`) schützt nur über den Raumcode. Jede Person mit dem Code (also jeder Spieler) könnte über die öffentliche Schnittstelle, nicht über die Oberfläche:

- `charbogen_get(Raum, 'dm', 'dm')` aufrufen und damit **das komplette Notizbuch der Spielleitung** lesen, einschließlich privater Notizen, Begegnungen und Händler;
- mit `charbogen_put` oder `charbogen_del` Stände anderer überschreiben oder löschen.

Die Oberfläche tut das nie. Wer die Schnittstelle von Hand aufruft, kommt aber an diese Daten. Für eine Runde unter Freunden ist das Risiko klein, es widerspricht aber der Zusage „private Notizen sind nie für Spieler sichtbar“. **Deshalb gehört diese Korrektur zur gemeinsamen Chronik dazu.**

## Was sich ändert

1. **Geheimnis je Gerät und Raum:**
   - Jedes Gerät erzeugt pro Raum ein zufälliges Geheimnis (32 Zeichen) und speichert es lokal (`charbogen-cloud-secret`).
   - In der Tabelle steht nur sein Hash (`owner_hash`, SHA-256 mit `pgcrypto`), nie das Geheimnis selbst.
2. **Schreiben und Löschen** einer Zeile geht nur mit dem Geheimnis, das die Zeile angelegt hat.
   - Zeilen ohne `owner_hash` (Altbestand) übernimmt das erste Gerät, das sie mit Geheimnis speichert.
3. **Lesen:**
   - `char` (Spielerbögen, für „Bogen ansehen“) bleibt für alle mit Raumcode lesbar.
   - `chron` (gemeinsame Chronik) bleibt für alle mit Raumcode lesbar.
   - `dm` (Spielleitungsbereich) ist **nur noch mit dem Geheimnis der Spielleitung** lesbar.
4. **Neue Art `chron`:**
   - Die Spielleitung schreibt eine Zeile `chron`/`shared` mit **nur den freigegebenen Einträgen**: Titel, Datum, Text der Einträge, die sie im Kampagnenbuch als „mit der Gruppe teilen“ markiert hat.
   - Private Notizen werden für diese Zeile gar nicht erst zusammengestellt. Die Zeile wird auf dem Gerät der Spielleitung aus einer Positivliste gebaut (`pub === true`, nur die Felder `title`, `date`, `shared`).

## SQL (zum Ausführen im Supabase SQL Editor, erst nach Freigabe)

```sql
create extension if not exists pgcrypto;

alter table public.charbogen_saves add column if not exists owner_hash text;
alter table public.charbogen_saves drop constraint if exists charbogen_saves_kind_check;
alter table public.charbogen_saves add constraint charbogen_saves_kind_check check (kind in ('char', 'dm', 'chron'));

-- Schreiben: nur mit passendem Geheimnis; Altbestand ohne owner_hash wird vom ersten Schreiber übernommen.
create or replace function public.charbogen_put2(p_room text, p_kind text, p_id text, p_name text, p_data jsonb, p_base timestamptz, p_secret text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare cur timestamptz; owner text; h text := encode(digest(coalesce(p_secret, ''), 'sha256'), 'hex'); now_ts timestamptz := clock_timestamp();
begin
  if p_room !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'bad room'; end if;
  if length(coalesce(p_secret, '')) < 24 then raise exception 'no secret'; end if;
  if pg_column_size(p_data) > 3000000 then raise exception 'too large'; end if;
  select updated_at, owner_hash into cur, owner from charbogen_saves where room = p_room and kind = p_kind and id = p_id for update;
  if cur is null then
    if (select count(*) from charbogen_saves where room = p_room) >= 60 then raise exception 'room full'; end if;
    insert into charbogen_saves (room, kind, id, name, data, updated_at, owner_hash) values (p_room, p_kind, p_id, left(coalesce(p_name, ''), 80), p_data, now_ts, h);
    return now_ts;
  end if;
  if owner is not null and owner <> h then raise exception 'not owner'; end if;
  if p_base is not null and cur > p_base then return null; end if;
  update charbogen_saves set name = left(coalesce(p_name, ''), 80), data = p_data, updated_at = now_ts, owner_hash = h where room = p_room and kind = p_kind and id = p_id;
  return now_ts;
end $$;

-- Lesen: 'dm' nur mit dem Geheimnis der Spielleitung; 'char' und 'chron' für alle mit Raumcode.
create or replace function public.charbogen_get2(p_room text, p_kind text, p_id text, p_secret text)
returns table (data jsonb, updated_at timestamptz) language sql security definer set search_path = public as $$
  select data, updated_at from charbogen_saves
  where room = p_room and kind = p_kind and id = p_id
    and (kind <> 'dm' or owner_hash = encode(digest(coalesce(p_secret, ''), 'sha256'), 'hex'));
$$;

-- Löschen: der Besitzer der Zeile oder die Spielleitung des Raums (Besitzerin der Zeile 'dm'/'dm').
create or replace function public.charbogen_del2(p_room text, p_kind text, p_id text, p_secret text)
returns void language sql security definer set search_path = public as $$
  delete from charbogen_saves s where s.room = p_room and s.kind = p_kind and s.id = p_id
    and (s.owner_hash is null or s.owner_hash = encode(digest(coalesce(p_secret, ''), 'sha256'), 'hex')
      or exists (select 1 from charbogen_saves d where d.room = p_room and d.kind = 'dm' and d.id = 'dm' and d.owner_hash = encode(digest(coalesce(p_secret, ''), 'sha256'), 'hex')));
$$;

revoke all on function public.charbogen_put2(text, text, text, text, jsonb, timestamptz, text) from public;
revoke all on function public.charbogen_get2(text, text, text, text) from public;
revoke all on function public.charbogen_del2(text, text, text, text) from public;
grant execute on function public.charbogen_put2(text, text, text, text, jsonb, timestamptz, text) to anon, authenticated;
grant execute on function public.charbogen_get2(text, text, text, text) to anon, authenticated;
grant execute on function public.charbogen_del2(text, text, text, text) to anon, authenticated;

-- Erst wenn alle Geräte die neue Fassung nutzen (Schritt 3 unten): alte, ungeschützte Funktionen entfernen.
-- drop function public.charbogen_put(text, text, text, text, jsonb, timestamptz);
-- drop function public.charbogen_get(text, text, text);
-- drop function public.charbogen_del(text, text, text);
```

## Ablauf nach Freigabe

1. Du führst das SQL oben aus. Die alten Funktionen bleiben vorerst, damit nichts kaputtgeht.
2. Die App wechselt auf `*_put2/_get2/_del2` mit Geheimnis. Dazu kommt:
   - Spielleitung: im Kampagnenbuch „Mit der Gruppe teilen“ je Eintrag.
   - Spieler: im Bereich Chronik eine Spalte „Gemeinsame Chronik“, auch offline aus dem letzten Abruf.
3. Wenn alle Geräte aktualisiert sind (die Web-Fassung lädt sich selbst neu): Die drei auskommentierten `drop function`-Zeilen ausführen. **Erst dann ist die Lücke geschlossen.**

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Spielleitung wechselt das Gerät oder löscht den Browser: Geheimnis weg, eigene Zeile nicht mehr beschreibbar | Das Geheimnis liegt in der Sicherungsdatei. Notfalls kann die Zeile im Supabase-Dashboard gelöscht werden (dort hast du vollen Zugriff). |
| Ein altes Gerät nutzt noch die alten Funktionen | Die alten Funktionen bleiben bis Schritt 3. Erst danach entfernen. |
| Ein Spieler hat den Altbestand einer Zeile vor der Spielleitung „übernommen“ | Zeilen ohne `owner_hash` übernimmt der erste Schreiber. Für `dm` schreibt nur die Spielleitung. Im Zweifel die Zeile vorher im Dashboard löschen; die Spielleitung lädt sie neu hoch. |
| Hash ohne Salz | Die Geheimnisse sind lange Zufallswerte (keine Passwörter). Ein Wörterbuchangriff ist deshalb nicht möglich. |
