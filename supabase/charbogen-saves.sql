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
