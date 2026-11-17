-- ============================================================================
-- D3 (17.11.2026, überarbeitet nach Sicherheitsprüfung): Rechte serverseitig.
-- Voraussetzung: D2 (Ende von charbogen-saves.sql) ist vollständig ausgeführt (Spalte owner_hash, Art 'chron').
-- Anleitung, Reihenfolge und Grenzen: docs/d3-rechte-serverseitig.md, Kontrollen: supabase/kontrolle-d2-d3.sql
--
-- Was sich ändert (nichts wird gelöscht, keine gespeicherte Zeile in charbogen_saves wird verändert):
--   * Neue Tabelle charbogen_rooms: wer die Spielleitung eines Raums ist (Hash ihres Geheimnisses) und ihr
--     öffentlicher Schlüssel für verschlüsselte Spielerwerte im Live-Tisch.
--   * Bestehende Räume, deren Spielleitungszeile schon einen Besitzer hat, werden eingetragen (nur Einfügen).
--     Räume mit Spielleitungszeile ohne Besitzer (Altbestand) werden eingetragen, sobald die Spielleitung ihre Zeile
--     übernimmt. Bis dahin kann niemand anderes den Raum beanspruchen.
--   * charbogen_get2: Charakterbögen nur für ihren Besitzer und die Spielleitung des Raums.
--   * charbogen_put2: Spielleitungsbereich und gemeinsame Chronik schreibt nur die Spielleitung; Altbestand wie in D2
--     nur mit genauem Zeitstempel.
--   * charbogen_list2: Übersicht ohne Daten; Spieler sehen nur ihre eigenen Zeilen.
--   * charbogen_del2: nur Besitzer oder Spielleitung.
--   * Teil 2 (separat): alte Funktionen ohne Geheimnis entfernen.
-- Teil 1 ist gefahrlos erneut ausführbar.
-- ============================================================================

-- ---------------------------------------------------------------- Teil 1 ----
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.charbogen_rooms (
  room text primary key check (room ~ '^[A-HJ-NP-Z2-9]{6}$'),
  dm_hash text not null,
  dm_key jsonb,
  created_at timestamptz not null default now()
);
alter table public.charbogen_rooms enable row level security;
-- Keine Policies: Die Tabelle ist nur über die Funktionen unten erreichbar (security definer).
revoke all on table public.charbogen_rooms from anon, authenticated;

-- Übernahme bestehender Räume mit bereits beanspruchter Spielleitungszeile (nur Einfügen)
insert into public.charbogen_rooms (room, dm_hash)
  select room, owner_hash from public.charbogen_saves
  where kind = 'dm' and id = 'dm' and owner_hash is not null and room ~ '^[A-HJ-NP-Z2-9]{6}$'
on conflict (room) do nothing;

create or replace function public.charbogen_hash(p_secret text) returns text
language sql immutable set search_path = public, extensions, pg_temp as $$
  select encode(digest(coalesce(p_secret, ''), 'sha256'), 'hex');
$$;

-- Ist dieses Geheimnis die Spielleitung des Raums? (Kurze Geheimnisse sind nie die Spielleitung.)
create or replace function public.charbogen_is_dm(p_room text, p_secret text) returns boolean
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select length(coalesce(p_secret, '')) >= 24
     and exists (select 1 from charbogen_rooms r where r.room = p_room and r.dm_hash = charbogen_hash(p_secret));
$$;

-- Raum beanspruchen (Spielleitung beim Öffnen des Raums). Liefert true, wenn das Geheimnis die Spielleitung ist.
--   * Raum schon eingetragen: nur dieselbe Spielleitung (sie darf ihren öffentlichen Schlüssel erneuern).
--   * Raum nicht eingetragen, aber mit Spielleitungszeile: nur deren Besitzerin; Altbestand ohne Besitzer: niemand
--     (die Spielleitung übernimmt zuerst ihre Zeile über charbogen_put2, dann wird sie automatisch eingetragen).
--   * Ganz neuer Raum ohne Spielleitungszeile: der erste Anspruch gilt.
create or replace function public.charbogen_claim(p_room text, p_secret text, p_key jsonb) returns boolean
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare h text; cur text; dm_owner text; has_dm boolean;
begin
  if p_room is null or p_room !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'bad room'; end if;
  if length(coalesce(p_secret, '')) < 24 then raise exception 'no secret'; end if;
  if p_key is not null and (jsonb_typeof(p_key) <> 'object' or pg_column_size(p_key) > 2000 or p_key->>'kty' is distinct from 'EC'
      or p_key->>'crv' is distinct from 'P-256' or jsonb_typeof(p_key->'x') <> 'string' or jsonb_typeof(p_key->'y') <> 'string' or p_key ? 'd') then
    raise exception 'bad key';
  end if;
  h := charbogen_hash(p_secret);
  select dm_hash into cur from charbogen_rooms where room = p_room for update;
  if found then
    if cur <> h then return false; end if;
    if p_key is not null then update charbogen_rooms set dm_key = p_key where room = p_room; end if;
    return true;
  end if;
  select true, owner_hash into has_dm, dm_owner from charbogen_saves where room = p_room and kind = 'dm' and id = 'dm';
  if coalesce(has_dm, false) and dm_owner is distinct from h then return false; end if;
  insert into charbogen_rooms (room, dm_hash, dm_key) values (p_room, h, p_key) on conflict (room) do nothing;
  return exists (select 1 from charbogen_rooms where room = p_room and dm_hash = h);
end $$;

-- Öffentlicher Schlüssel der Spielleitung (für Spieler, die ihre genauen Werte nur für sie verschlüsseln)
create or replace function public.charbogen_room_key(p_room text) returns jsonb
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select dm_key from charbogen_rooms where room = p_room;
$$;

-- Schreiben
create or replace function public.charbogen_put2(p_room text, p_kind text, p_id text, p_name text, p_data jsonb, p_base timestamptz, p_secret text)
returns timestamptz language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare cur timestamptz; owner text; h text; now_ts timestamptz := clock_timestamp(); claimed boolean;
begin
  if p_room is null or p_room !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'bad room'; end if;
  if p_kind is null or p_kind not in ('char', 'dm', 'chron') then raise exception 'bad kind'; end if;
  if p_id is null or length(p_id) not between 1 and 60 then raise exception 'bad id'; end if;
  if p_data is null then raise exception 'no data'; end if;
  if length(coalesce(p_secret, '')) < 24 then raise exception 'no secret'; end if;
  if pg_column_size(p_data) > 3000000 then raise exception 'too large'; end if;
  h := charbogen_hash(p_secret);
  claimed := exists (select 1 from charbogen_rooms where room = p_room);
  -- Spielleitungsbereich und Chronik: im eingetragenen Raum nur die Spielleitung
  if p_kind in ('dm', 'chron') and claimed and not charbogen_is_dm(p_room, p_secret) then raise exception 'not dm'; end if;
  -- Chronik im (noch) nicht eingetragenen Raum: nur die Besitzerin der Spielleitungszeile
  if p_kind = 'chron' and not claimed and not exists (select 1 from charbogen_saves where room = p_room and kind = 'dm' and id = 'dm' and owner_hash = h) then raise exception 'not dm'; end if;
  select updated_at, owner_hash into cur, owner from charbogen_saves where room = p_room and kind = p_kind and id = p_id for update;
  if not found then
    if (select count(*) from charbogen_saves where room = p_room) >= 60 then raise exception 'room full'; end if;
    insert into charbogen_saves (room, kind, id, name, data, updated_at, owner_hash) values (p_room, p_kind, p_id, left(coalesce(p_name, ''), 80), p_data, now_ts, h);
  else
    if owner is null then
      -- Altbestand: nur mit dem genauen Zeitstempel übernehmen (kein Überschreiben mit p_base = null)
      if p_base is null or p_base <> cur then return null; end if;
    elsif owner <> h then
      raise exception 'not owner';
    elsif p_base is not null and cur > p_base then
      return null;
    end if;
    update charbogen_saves set name = left(coalesce(p_name, ''), 80), data = p_data, updated_at = now_ts, owner_hash = h where room = p_room and kind = p_kind and id = p_id;
  end if;
  -- Wer die Spielleitungszeile besitzt, wird Spielleitung des noch nicht eingetragenen Raums
  if p_kind = 'dm' and p_id = 'dm' and not claimed then
    insert into charbogen_rooms (room, dm_hash) values (p_room, h) on conflict (room) do nothing;
  end if;
  return now_ts;
end $$;

-- Lesen: 'chron' für alle mit Raumcode; 'dm' nur die Besitzerin; 'char' nur der Besitzer oder die Spielleitung.
create or replace function public.charbogen_get2(p_room text, p_kind text, p_id text, p_secret text)
returns table (data jsonb, updated_at timestamptz) language sql security definer set search_path = public, extensions, pg_temp as $$
  select s.data, s.updated_at from charbogen_saves s
  where s.room = p_room and s.kind = p_kind and s.id = p_id
    and (s.kind = 'chron'
      or (length(coalesce(p_secret, '')) >= 24 and s.owner_hash = charbogen_hash(p_secret))
      or (s.kind = 'char' and charbogen_is_dm(p_room, p_secret)));
$$;

-- Übersicht ohne Daten: die Spielleitung sieht alle Zeilen, alle anderen nur ihre eigenen.
create or replace function public.charbogen_list2(p_room text, p_secret text)
returns table (kind text, id text, name text, updated_at timestamptz) language sql security definer set search_path = public, extensions, pg_temp as $$
  select s.kind, s.id, s.name, s.updated_at from charbogen_saves s
  where s.room = p_room
    and (charbogen_is_dm(p_room, p_secret) or (length(coalesce(p_secret, '')) >= 24 and s.owner_hash = charbogen_hash(p_secret)))
  order by s.kind, s.name;
$$;

-- Löschen: Besitzer der Zeile oder die Spielleitung des Raums. Altbestand ohne Besitzer: nur die Spielleitung.
create or replace function public.charbogen_del2(p_room text, p_kind text, p_id text, p_secret text)
returns void language sql security definer set search_path = public, extensions, pg_temp as $$
  delete from charbogen_saves s
  where s.room = p_room and s.kind = p_kind and s.id = p_id
    and length(coalesce(p_secret, '')) >= 24
    and (s.owner_hash = charbogen_hash(p_secret) or charbogen_is_dm(p_room, p_secret));
$$;

-- Rechte: Hilfsfunktionen nicht von außen aufrufbar; die übrigen nur ausführen.
revoke all on function public.charbogen_hash(text) from public, anon, authenticated;
revoke all on function public.charbogen_is_dm(text, text) from public, anon, authenticated;
revoke all on function public.charbogen_claim(text, text, jsonb) from public;
revoke all on function public.charbogen_room_key(text) from public;
revoke all on function public.charbogen_list2(text, text) from public;
revoke all on function public.charbogen_put2(text, text, text, text, jsonb, timestamptz, text) from public;
revoke all on function public.charbogen_get2(text, text, text, text) from public;
revoke all on function public.charbogen_del2(text, text, text, text) from public;
grant execute on function public.charbogen_claim(text, text, jsonb) to anon, authenticated;
grant execute on function public.charbogen_room_key(text) to anon, authenticated;
grant execute on function public.charbogen_list2(text, text) to anon, authenticated;
grant execute on function public.charbogen_put2(text, text, text, text, jsonb, timestamptz, text) to anon, authenticated;
grant execute on function public.charbogen_get2(text, text, text, text) to anon, authenticated;
grant execute on function public.charbogen_del2(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- Teil 2 ----
-- Unmittelbar nach erfolgreicher Kontrolle von Teil 1 ausführen (die aktuelle App braucht die alten Funktionen nicht
-- mehr). Entfernt nur Funktionen, keine Daten. Erst danach gibt es keinen Zugriff ohne Geheimnis mehr, und erst dann
-- ist der Zeitstempel des Altbestands nicht mehr für jeden abrufbar.
-- drop function if exists public.charbogen_put(text, text, text, text, jsonb, timestamptz);
-- drop function if exists public.charbogen_get(text, text, text);
-- drop function if exists public.charbogen_list(text);
-- drop function if exists public.charbogen_del(text, text, text);
