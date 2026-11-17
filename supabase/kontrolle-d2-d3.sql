-- ============================================================================
-- Kontrollabfragen für D2 und D3 (NUR LESEND – ändern nichts). Einzeln im Supabase SQL Editor ausführen.
-- Erwartete Ergebnisse stehen jeweils darüber. Ablauf: docs/d3-rechte-serverseitig.md
-- ============================================================================

-- K0 – Ausgangslage vor D2 --------------------------------------------------
-- Erwartet: tabelle = true, die vier alten Funktionen = true, zeilen = Anzahl deiner Stände (z. B. 17).
select to_regclass('public.charbogen_saves') is not null as tabelle,
       to_regprocedure('public.charbogen_put(text,text,text,text,jsonb,timestamptz)') is not null as put_v1,
       to_regprocedure('public.charbogen_get(text,text,text)') is not null as get_v1,
       to_regprocedure('public.charbogen_list(text)') is not null as list_v1,
       to_regprocedure('public.charbogen_del(text,text,text)') is not null as del_v1,
       (select count(*) from public.charbogen_saves) as zeilen;

-- K0b – Bestand je Raum und Art (ohne Inhalte); dient später zum Vergleich: die Zahlen dürfen sich durch D2/D3 nicht ändern.
select room, kind, count(*) as zeilen, max(updated_at) as zuletzt
from public.charbogen_saves group by room, kind order by room, kind;

-- K1 – D2 vollständig? -------------------------------------------------------
-- Erwartet direkt nach D2: alle Zeilen ok = true. (Nach D3 Teil 1 ist „del2 sperrt Spielleitungszeile“ gewollt false.)
select pruefung, ok from (values
  ('Spalte owner_hash', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'charbogen_saves' and column_name = 'owner_hash')),
  ('Prüfregel erlaubt chron', coalesce((select pg_get_constraintdef(c.oid) like '%chron%' from pg_constraint c where c.conrelid = 'public.charbogen_saves'::regclass and c.conname = 'charbogen_saves_kind_check'), false)),
  ('pgcrypto installiert', exists (select 1 from pg_extension where extname = 'pgcrypto')),
  ('Funktion put2', to_regprocedure('public.charbogen_put2(text,text,text,text,jsonb,timestamptz,text)') is not null),
  ('Funktion get2', to_regprocedure('public.charbogen_get2(text,text,text,text)') is not null),
  ('Funktion del2', to_regprocedure('public.charbogen_del2(text,text,text,text)') is not null),
  ('anon darf put2', coalesce(has_function_privilege('anon', to_regprocedure('public.charbogen_put2(text,text,text,text,jsonb,timestamptz,text)'), 'execute'), false)),
  ('anon darf get2', coalesce(has_function_privilege('anon', to_regprocedure('public.charbogen_get2(text,text,text,text)'), 'execute'), false)),
  ('anon darf del2', coalesce(has_function_privilege('anon', to_regprocedure('public.charbogen_del2(text,text,text,text)'), 'execute'), false)),
  ('anon liest Tabelle NICHT', not has_table_privilege('anon', 'public.charbogen_saves', 'select')),
  ('put2 prüft p_kind (überarbeitete Fassung)', coalesce((select prosrc like '%bad kind%' from pg_proc where oid = to_regprocedure('public.charbogen_put2(text,text,text,text,jsonb,timestamptz,text)')), false)),
  ('del2 ohne Löschen von Altbestand durch Dritte', coalesce((select prosrc not like '%owner_hash is null%' from pg_proc where oid = to_regprocedure('public.charbogen_del2(text,text,text,text)')), false)),
  ('put2 erlaubt nur dm/dm und chron/shared', coalesce((select prosrc like '%''shared''%' from pg_proc where oid = to_regprocedure('public.charbogen_put2(text,text,text,text,jsonb,timestamptz,text)')), false)),
  -- Nur direkt nach D2 true; D3 Teil 1 ersetzt del2 bewusst durch eine Fassung ohne diese Sperre.
  ('del2 sperrt Spielleitungszeile (nur D2)', coalesce((select prosrc like '%not (s.kind = ''dm'' and s.id = ''dm'')%' from pg_proc where oid = to_regprocedure('public.charbogen_del2(text,text,text,text)')), false)),
  ('Suchpfad enthält extensions', coalesce((select array_to_string(proconfig, ',') like '%extensions%' from pg_proc where oid = to_regprocedure('public.charbogen_put2(text,text,text,text,jsonb,timestamptz,text)')), false))
) as t(pruefung, ok);

-- K1b – Wo liegt pgcrypto? Erwartet: public oder extensions (beides funktioniert mit dem Suchpfad der Funktionen).
select n.nspname as pgcrypto_schema from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pgcrypto';

-- K1c – Altbestand: nach D2 haben alle früher gespeicherten Zeilen noch keinen Besitzer (owner_hash null).
-- Erwartet direkt nach D2: ohne_besitzer = gesamt (z. B. 17); nach dem ersten Speichern der Geräte sinkt die Zahl.
select count(*) as gesamt, count(*) filter (where owner_hash is null) as ohne_besitzer from public.charbogen_saves;

-- K2 – D3 Teil 1 vollständig? ------------------------------------------------
-- Erwartet: alle Zeilen ok = true.
select pruefung, ok from (values
  ('Tabelle charbogen_rooms', to_regclass('public.charbogen_rooms') is not null),
  ('RLS auf charbogen_rooms', coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.charbogen_rooms')), false)),
  ('anon liest charbogen_rooms NICHT', coalesce(not has_table_privilege('anon', 'public.charbogen_rooms', 'select'), false)),
  ('Funktion claim', to_regprocedure('public.charbogen_claim(text,text,jsonb)') is not null),
  ('Funktion room_key', to_regprocedure('public.charbogen_room_key(text)') is not null),
  ('Funktion list2', to_regprocedure('public.charbogen_list2(text,text)') is not null),
  ('anon darf claim', coalesce(has_function_privilege('anon', to_regprocedure('public.charbogen_claim(text,text,jsonb)'), 'execute'), false)),
  ('anon darf room_key', coalesce(has_function_privilege('anon', to_regprocedure('public.charbogen_room_key(text)'), 'execute'), false)),
  ('anon darf list2', coalesce(has_function_privilege('anon', to_regprocedure('public.charbogen_list2(text,text)'), 'execute'), false)),
  ('anon darf is_dm NICHT', coalesce(not has_function_privilege('anon', to_regprocedure('public.charbogen_is_dm(text,text)'), 'execute'), false)),
  ('anon darf hash NICHT', coalesce(not has_function_privilege('anon', to_regprocedure('public.charbogen_hash(text)'), 'execute'), false)),
  ('get2 ist D3-Fassung', coalesce((select prosrc like '%charbogen_is_dm%' from pg_proc where oid = to_regprocedure('public.charbogen_get2(text,text,text,text)')), false)),
  ('put2 trägt Spielleitung ein', coalesce((select prosrc like '%insert into charbogen_rooms%' from pg_proc where oid = to_regprocedure('public.charbogen_put2(text,text,text,text,jsonb,timestamptz,text)')), false))
) as t(pruefung, ok);

-- K2b – Räume mit eingetragener Spielleitung (ohne Hash). Direkt nach Teil 1 nur Räume, deren Spielleitungszeile schon
-- einen Besitzer hat; Altbestandsräume erscheinen, sobald die Spielleitung einmal gespeichert hat.
select room, dm_key is not null as hat_schluessel, created_at from public.charbogen_rooms order by created_at;

-- K3 – D3 Teil 2 (alte Funktionen entfernt)? -------------------------------
-- Erwartet: alle true.
select to_regprocedure('public.charbogen_put(text,text,text,text,jsonb,timestamptz)') is null as put_v1_weg,
       to_regprocedure('public.charbogen_get(text,text,text)') is null as get_v1_weg,
       to_regprocedure('public.charbogen_list(text)') is null as list_v1_weg,
       to_regprocedure('public.charbogen_del(text,text,text)') is null as del_v1_weg;

-- K4 – Bestand unverändert? K0b erneut ausführen und vergleichen: gleiche Räume, Arten und Anzahlen.
