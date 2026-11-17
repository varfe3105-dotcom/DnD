-- Online-Speicherung pro Gruppe für den D&D-Charakterbogen.
-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen. Es ist gefahrlos, das Skript erneut auszuführen.
--
-- Prinzip: Der Raumcode des Live-Tischs ist der Schlüssel. Die Tabelle selbst ist für Besucher gesperrt
-- (Row Level Security ohne Regeln). Lesen und Schreiben geht nur über die Funktionen unten, und die
-- verlangen immer den Raumcode. Wer den Code nicht kennt, sieht nichts.

create table if not exists public.charbogen_saves (
  room text not null check (room ~ '^[A-HJ-NP-Z2-9]{6}$'),
  kind text not null check (kind in ('char', 'dm')),
  id text not null check (length(id) between 1 and 60),
  name text not null default '',
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (room, kind, id)
);
alter table public.charbogen_saves enable row level security;
revoke all on public.charbogen_saves from anon, authenticated;

-- Speichert einen Stand. p_base ist der Zeitstempel, den das Gerät zuletzt kannte.
-- Ist online inzwischen ein neuerer Stand, wird nichts überschrieben und null zurückgegeben.
-- p_base = null überschreibt bewusst.
create or replace function public.charbogen_put(p_room text, p_kind text, p_id text, p_name text, p_data jsonb, p_base timestamptz)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare cur timestamptz; now_ts timestamptz := clock_timestamp();
begin
  if p_room !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'bad room'; end if;
  if pg_column_size(p_data) > 3000000 then raise exception 'too large'; end if;
  select updated_at into cur from charbogen_saves where room = p_room and kind = p_kind and id = p_id for update;
  if cur is null then
    if (select count(*) from charbogen_saves where room = p_room) >= 60 then raise exception 'room full'; end if;
    insert into charbogen_saves (room, kind, id, name, data, updated_at) values (p_room, p_kind, p_id, left(coalesce(p_name, ''), 80), p_data, now_ts);
    return now_ts;
  end if;
  if p_base is not null and cur > p_base then return null; end if;
  update charbogen_saves set name = left(coalesce(p_name, ''), 80), data = p_data, updated_at = now_ts where room = p_room and kind = p_kind and id = p_id;
  return now_ts;
end $$;

-- Übersicht eines Raums ohne die eigentlichen Daten.
create or replace function public.charbogen_list(p_room text)
returns table (kind text, id text, name text, updated_at timestamptz) language sql security definer set search_path = public as $$
  select kind, id, name, updated_at from charbogen_saves where room = p_room order by kind, name;
$$;

-- Ein einzelner Stand mit Daten.
create or replace function public.charbogen_get(p_room text, p_kind text, p_id text)
returns table (data jsonb, updated_at timestamptz) language sql security definer set search_path = public as $$
  select data, updated_at from charbogen_saves where room = p_room and kind = p_kind and id = p_id;
$$;

-- Löscht einen Stand.
create or replace function public.charbogen_del(p_room text, p_kind text, p_id text)
returns void language sql security definer set search_path = public as $$
  delete from charbogen_saves where room = p_room and kind = p_kind and id = p_id;
$$;

revoke all on function public.charbogen_put(text, text, text, text, jsonb, timestamptz) from public;
revoke all on function public.charbogen_list(text) from public;
revoke all on function public.charbogen_get(text, text, text) from public;
revoke all on function public.charbogen_del(text, text, text) from public;
grant execute on function public.charbogen_put(text, text, text, text, jsonb, timestamptz) to anon, authenticated;
grant execute on function public.charbogen_list(text) to anon, authenticated;
grant execute on function public.charbogen_get(text, text, text) to anon, authenticated;
grant execute on function public.charbogen_del(text, text, text) to anon, authenticated;


-- ============================================================================
-- D2 (17.11.2026, überarbeitet nach Sicherheitsprüfung): Schutz je Gerät (Geheimnis) und gemeinsame Chronik ('chron').
-- Begründung: docs/d2-gemeinsame-chronik-sql.md, Ablauf und Kontrollen: docs/d3-rechte-serverseitig.md,
-- supabase/kontrolle-d2-d3.sql. Gefahrlos erneut ausführbar. Löscht und verändert keine gespeicherten Stände.
--
-- Regeln:
--   * Schreiben nur mit Geheimnis (mind. 24 Zeichen); eine Zeile gehört dem Gerät, das sie zuerst mit Geheimnis schreibt.
--   * Altbestand (owner_hash null, vor D2 gespeichert) wird NICHT blind übernommen: nur mit p_base = genau dem
--     gespeicherten updated_at (das Gerät, das zuletzt gespeichert oder geladen hat, kennt ihn). Sonst Konflikt (null).
--     Das ist keine echte Anmeldung – siehe Dokumentation, Abschnitt „Altbestand“.
--   * Gemeinsame Chronik ('chron') schreibt nur die Besitzerin der Spielleitungszeile 'dm'/'dm'.
--   * Löschen nur durch den Besitzer der Zeile oder die Besitzerin der Spielleitungszeile; Altbestand ohne Besitzer
--     kann ohne Spielleitung niemand löschen.
-- ============================================================================

-- pgcrypto (digest). WITH SCHEMA gilt nur bei Neuinstallation; eine schon installierte Erweiterung bleibt in ihrem
-- Schema. Die Funktionen suchen deshalb in public und extensions (pg_temp zuletzt).
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.charbogen_saves add column if not exists owner_hash text;
alter table public.charbogen_saves drop constraint if exists charbogen_saves_kind_check;
alter table public.charbogen_saves add constraint charbogen_saves_kind_check check (kind in ('char', 'dm', 'chron'));

create or replace function public.charbogen_put2(p_room text, p_kind text, p_id text, p_name text, p_data jsonb, p_base timestamptz, p_secret text)
returns timestamptz language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare cur timestamptz; owner text; h text; now_ts timestamptz := clock_timestamp();
begin
  if p_room is null or p_room !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'bad room'; end if;
  if p_kind is null or p_kind not in ('char', 'dm', 'chron') then raise exception 'bad kind'; end if;
  if p_id is null or length(p_id) not between 1 and 60 then raise exception 'bad id'; end if;
  if p_data is null then raise exception 'no data'; end if;
  if length(coalesce(p_secret, '')) < 24 then raise exception 'no secret'; end if;
  if pg_column_size(p_data) > 3000000 then raise exception 'too large'; end if;
  h := encode(digest(p_secret, 'sha256'), 'hex');
  if p_kind = 'chron' and not exists (select 1 from charbogen_saves where room = p_room and kind = 'dm' and id = 'dm' and owner_hash = h) then raise exception 'not dm'; end if;
  select updated_at, owner_hash into cur, owner from charbogen_saves where room = p_room and kind = p_kind and id = p_id for update;
  if not found then
    if (select count(*) from charbogen_saves where room = p_room) >= 60 then raise exception 'room full'; end if;
    insert into charbogen_saves (room, kind, id, name, data, updated_at, owner_hash) values (p_room, p_kind, p_id, left(coalesce(p_name, ''), 80), p_data, now_ts, h);
    return now_ts;
  end if;
  if owner is null then
    -- Altbestand: nur mit dem genauen Zeitstempel übernehmen (kein Überschreiben mit p_base = null)
    if p_base is null or p_base <> cur then return null; end if;
  elsif owner <> h then
    raise exception 'not owner';
  elsif p_base is not null and cur > p_base then
    return null;
  end if;
  update charbogen_saves set name = left(coalesce(p_name, ''), 80), data = p_data, updated_at = now_ts, owner_hash = h where room = p_room and kind = p_kind and id = p_id;
  return now_ts;
end $$;

-- Lesen: 'dm' nur mit dem Geheimnis seiner Besitzerin (Altbestand ohne Besitzer: niemand); 'char' und 'chron' für alle
-- mit Raumcode (D3 schränkt 'char' ein).
create or replace function public.charbogen_get2(p_room text, p_kind text, p_id text, p_secret text)
returns table (data jsonb, updated_at timestamptz) language sql security definer set search_path = public, extensions, pg_temp as $$
  select s.data, s.updated_at from charbogen_saves s
  where s.room = p_room and s.kind = p_kind and s.id = p_id
    and (s.kind <> 'dm' or s.owner_hash = encode(digest(coalesce(p_secret, ''), 'sha256'), 'hex'));
$$;

-- Löschen: Besitzer der Zeile oder Besitzerin der Spielleitungszeile des Raums. Kein Löschen von Altbestand durch Dritte.
create or replace function public.charbogen_del2(p_room text, p_kind text, p_id text, p_secret text)
returns void language sql security definer set search_path = public, extensions, pg_temp as $$
  delete from charbogen_saves s
  where s.room = p_room and s.kind = p_kind and s.id = p_id
    and length(coalesce(p_secret, '')) >= 24
    and (s.owner_hash = encode(digest(p_secret, 'sha256'), 'hex')
      or exists (select 1 from charbogen_saves d where d.room = p_room and d.kind = 'dm' and d.id = 'dm'
                 and d.owner_hash = encode(digest(p_secret, 'sha256'), 'hex')));
$$;

revoke all on function public.charbogen_put2(text, text, text, text, jsonb, timestamptz, text) from public;
revoke all on function public.charbogen_get2(text, text, text, text) from public;
revoke all on function public.charbogen_del2(text, text, text, text) from public;
grant execute on function public.charbogen_put2(text, text, text, text, jsonb, timestamptz, text) to anon, authenticated;
grant execute on function public.charbogen_get2(text, text, text, text) to anon, authenticated;
grant execute on function public.charbogen_del2(text, text, text, text) to anon, authenticated;

-- Die alten Funktionen ohne Geheimnis (charbogen_put/get/list/del) entfernt D3 Teil 2 (supabase/d3-rechte.sql).
