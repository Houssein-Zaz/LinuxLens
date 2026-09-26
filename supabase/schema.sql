-- LinuxLens : schéma de la base Supabase
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller → Run.
-- Le script est idempotent : on peut le relancer sans erreur.

-- ---------------------------------------------------------------------
-- Tables
-- Chaque ligne appartient à un utilisateur (auth.users). Supprimer le
-- compte supprime ses données (on delete cascade).
-- ---------------------------------------------------------------------

create table if not exists public.exercise_progress (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text        not null check (char_length(exercise_id) <= 100),
  solved_at   timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create table if not exists public.favorites (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  command    text        not null check (char_length(command) <= 100),
  created_at timestamptz not null default now(),
  primary key (user_id, command)
);

create table if not exists public.history (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  command    text        not null check (char_length(command) <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, command)
);

create index if not exists history_user_recent on public.history (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Sécurité : Row Level Security
-- La clé « anon » est publique (elle est dans le code du site) : ce sont
-- ces règles qui empêchent un utilisateur de lire les données d'un autre.
-- ---------------------------------------------------------------------

alter table public.exercise_progress enable row level security;
alter table public.favorites         enable row level security;
alter table public.history           enable row level security;

do $$
declare t text;
begin
  foreach t in array array['exercise_progress', 'favorites', 'history'] loop
    execute format('drop policy if exists "lecture de ses données" on public.%I', t);
    execute format('drop policy if exists "ajout de ses données" on public.%I', t);
    execute format('drop policy if exists "modification de ses données" on public.%I', t);
    execute format('drop policy if exists "suppression de ses données" on public.%I', t);

    execute format('create policy "lecture de ses données" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "ajout de ses données" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "modification de ses données" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "suppression de ses données" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Suppression de compte par l'utilisateur lui-même
-- Le client ne peut pas supprimer auth.users directement : cette fonction
-- s'exécute avec les droits de son propriétaire (security definer) mais ne
-- supprime QUE l'utilisateur connecté (auth.uid()).
-- ---------------------------------------------------------------------

create or replace function public.delete_user()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
