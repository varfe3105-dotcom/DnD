-- ============================================================================
-- D3 Teil 2 (17.11.2026): alte Funktionen ohne Geheimnis entfernen.
-- Voraussetzung: D2 (Ende von charbogen-saves.sql) und D3 Teil 1 (d3-rechte.sql) sind ausgeführt.
-- Ablauf und Kontrollen: docs/d3-rechte-serverseitig.md, supabase/kontrolle-d2-d3.sql (K3).
--
-- Entfernt ausschließlich die vier Funktionen des Grundskripts (Anfang von charbogen-saves.sql):
--   charbogen_put(text, text, text, text, jsonb, timestamptz)
--   charbogen_get(text, text, text)
--   charbogen_list(text)
--   charbogen_del(text, text, text)
-- Tabellen, gespeicherte Stände und Raumzuordnungen (charbogen_rooms) bleiben unverändert.
-- Gefahrlos erneut ausführbar (drop … if exists). Bricht ab, ohne etwas zu entfernen, wenn D2 oder D3 Teil 1 fehlen.
-- Rückweg: das Grundskript am Anfang von charbogen-saves.sql erneut ausführen (legt die alten Funktionen wieder an).
-- ============================================================================

begin;

-- Sicherung gegen falsche Reihenfolge: ohne die neuen Funktionen nichts entfernen
do $$
begin
  if to_regprocedure('public.charbogen_put2(text,text,text,text,jsonb,timestamptz,text)') is null
     or to_regprocedure('public.charbogen_get2(text,text,text,text)') is null
     or to_regprocedure('public.charbogen_del2(text,text,text,text)') is null
     or to_regprocedure('public.charbogen_list2(text,text)') is null
     or to_regprocedure('public.charbogen_claim(text,text,jsonb)') is null
     or to_regprocedure('public.charbogen_room_key(text)') is null
     or to_regclass('public.charbogen_rooms') is null then
    raise exception 'D3 Teil 2 abgebrochen: D2 und D3 Teil 1 müssen zuerst ausgeführt sein (nichts wurde entfernt).';
  end if;
end $$;

drop function if exists public.charbogen_put(text, text, text, text, jsonb, timestamptz);
drop function if exists public.charbogen_get(text, text, text);
drop function if exists public.charbogen_list(text);
drop function if exists public.charbogen_del(text, text, text);

commit;
