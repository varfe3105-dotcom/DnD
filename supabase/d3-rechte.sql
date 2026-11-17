-- ============================================================================
-- D3 (17.11.2026): Rechte serverseitig. Voraussetzung: D2 (Ende von charbogen-saves.sql) ist ausgeführt.
-- Anleitung und Begründung: docs/d3-rechte-serverseitig.md
--
-- Was sich ändert (nichts wird gelöscht, keine Zeile in charbogen_saves wird verändert):
--   * Neue Tabelle charbogen_rooms: wer die Spielleitung eines Raums ist (Hash ihres Geheimnisses) und ihr
--     öffentlicher Schlüssel für verschlüsselte Spielerwerte im Live-Tisch.
--   * Bestehende Räume: Die Besitzerin der Zeile 'dm'/'dm' wird als Spielleitung eingetragen (nur Einfügen).
--   * charbogen_get2: Charakterbögen nur noch für ihren Besitzer und die Spielleitung des Raums.
--   * charbogen_put2: Spielleitungsbereich und gemeinsame Chronik schreibt nur die Spielleitung des Raums.
--   * charbogen_list2: Übersicht ohne Daten; Spieler sehen nur ihre eigenen Zeilen.
--   * Teil 2 (separat, erst nach dem Update der App auf allen Geräten): alte Funktionen ohne Schutz entfernen.
-- Gefahrlos erneut ausführbar.
-- ============================================================================

-- ---------------------------------------------------------------- Teil 1 ----
create extension if not exists pgcrypto;

create table if not exists public.charbogen_rooms (
  room text primary key check (room ~ '^[A-HJ-NP-Z2-9]{6}$'),
  dm_hash text not null,
  dm_key jsonb,
  created_at timestamptz not null default now()
);
alter table public.charbogen_rooms enable row level security;
-- Keine Policies: Die Tabelle ist nur über die Funktionen unten erreichbar (security definer).
revoke all on table public.charbogen_rooms from anon, authenticated;

-- Übernahme bestehender Räume (nur Einfügen, vorhandene Einträge bleiben)
insert into public.charbogen_rooms (room, dm_hash)
  select room, owner_hash from public.charbogen_saves
  where kind = 'dm' and id = 'dm' and owner_hash is not null and room ~ '^[A-HJ-NP-Z2-9]{6}$'
on conflict (room) do nothing;

create or replace function public.charbogen_hash(p_secret text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(digest(coalesce(p_secret, ''), 'sha256'), 'hex');
$$;

-- Ist dieses Geheimnis die Spielleitung des Raums?
create or replace function public.charbogen_is_dm(p_room text, p_secret text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from charbogen_rooms r where r.room = p_room and r.dm_hash = charbogen_hash(p_secret));
$$;

-- Raum beanspruchen (Spielleitung beim Öffnen des Raums). Der erste Anspruch gilt; danach darf nur dieselbe
-- Spielleitung ihren öffentlichen Schlüssel erneuern. Liefert true, wenn das Geheimnis die Spielleitung ist.
create or replace function public.charbogen_claim(p_room text, p_secret text, p_key jsonb) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare h text := charbogen_hash(p_secret); cur text;
begin
  if p_room !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'bad room'; end if;
  if length(coalesce(p_secret, '')) < 24 then raise exception 'no secret'; end if;
  if p_key is not null and (pg_column_size(p_key) > 2000 or p_key->>'kty' <> 'EC' or p_key ? 'd') then raise exception 'bad key'; end if;
  select dm_hash into cur from charbogen_rooms where room = p_room for update;
  if cur is null then
    -- Ein Raum mit fremdem Spielleitungsbereich kann nicht übernommen werden
    if exists (select 1 from charbogen_saves where room = p_room and kind = 'dm' and id = 'dm' and owner_hash is not null and owner_hash <> h) then return false; end if;
    insert into charbogen_rooms (room, dm_hash, dm_key) values (p_room, h, p_key);
    return true;
  end if;
  if cur <> h then return false; end if;
  if p_key is not null then update charbogen_rooms set dm_key = p_key where room = p_room; end if;
  return true;
end $$;

-- Öffentlicher Schlüssel der Spielleitung (für Spieler, die ihre genauen Werte nur für sie verschlüsseln)
create or replace function public.charbogen_room_key(p_room text) returns jsonb
language sql stable security definer set search_path = public as $$
  select dm_key from charbogen_rooms where room = p_room;
$$;

-- Schreiben: wie D2; zusätzlich 'dm' und 'chron' nur durch die Spielleitung, sobald der Raum beansprucht ist.
create or replace function public.charbogen_put2(p_room text, p_kind text, p_id text, p_name text, p_data jsonb, p_base timestamptz, p_secret text)
returns timestamptz language plpgsql security definer set search_path = public, extensions as $$
declare cur timestamptz; owner text; h text := charbogen_hash(p_secret); now_ts timestamptz := clock_timestamp();
begin
  if p_room !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'bad room'; end if;
  if length(coalesce(p_secret, '')) < 24 then raise exception 'no secret'; end if;
  if pg_column_size(p_data) > 3000000 then raise exception 'too large'; end if;
  if p_kind in ('dm', 'chron') and exists (select 1 from charbogen_rooms where room = p_room) and not charbogen_is_dm(p_room, p_secret) then raise exception 'not dm'; end if;
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

-- Lesen: 'chron' für alle mit Raumcode; 'dm' nur die Besitzerin; 'char' nur der Besitzer oder die Spielleitung.
create or replace function public.charbogen_get2(p_room text, p_kind text, p_id text, p_secret text)
returns table (data jsonb, updated_at timestamptz) language sql security definer set search_path = public, extensions as $$
  select s.data, s.updated_at from charbogen_saves s
  where s.room = p_room and s.kind = p_kind and s.id = p_id
    and (s.kind = 'chron'
      or s.owner_hash = charbogen_hash(p_secret)
      or (s.kind = 'char' and charbogen_is_dm(p_room, p_secret)));
$$;

-- Übersicht ohne Daten: die Spielleitung sieht alle Zeilen, alle anderen nur ihre eigenen.
create or replace function public.charbogen_list2(p_room text, p_secret text)
returns table (kind text, id text, name text, updated_at timestamptz) language sql security definer set search_path = public, extensions as $$
  select s.kind, s.id, s.name, s.updated_at from charbogen_saves s
  where s.room = p_room and (charbogen_is_dm(p_room, p_secret) or s.owner_hash = charbogen_hash(p_secret))
  order by s.kind, s.name;
$$;

-- Löschen: Besitzer der Zeile oder die Spielleitung des Raums.
create or replace function public.charbogen_del2(p_room text, p_kind text, p_id text, p_secret text)
returns void language sql security definer set search_path = public, extensions as $$
  delete from charbogen_saves s where s.room = p_room and s.kind = p_kind and s.id = p_id
    and (s.owner_hash = charbogen_hash(p_secret) or charbogen_is_dm(p_room, p_secret));
$$;

revoke all on function public.charbogen_hash(text) from public;
revoke all on function public.charbogen_is_dm(text, text) from public;
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
-- Erst ausführen, wenn alle Geräte die neue App-Version geladen haben (einmal neu laden).
-- Entfernt nur Funktionen, keine Daten. Danach gibt es keinen Lesezugriff ohne Geheimnis mehr.
-- drop function if exists public.charbogen_put(text, text, text, text, jsonb, timestamptz);
-- drop function if exists public.charbogen_get(text, text, text);
-- drop function if exists public.charbogen_list(text);
-- drop function if exists public.charbogen_del(text, text, text);
