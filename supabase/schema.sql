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

-- Chaque essai (juste ou faux) : sert aux statistiques de la page « Mon compte »
create table if not exists public.exercise_attempts (
  id          bigint      generated always as identity primary key,
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text        not null check (char_length(exercise_id) <= 100),
  kind        text        not null check (kind in ('write', 'quiz', 'perm')),
  correct     boolean     not null,
  answer      text        not null default '' check (char_length(answer) <= 200),
  used_help   boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists exercise_attempts_user_recent on public.exercise_attempts (user_id, created_at desc);

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
alter table public.exercise_attempts enable row level security;
alter table public.favorites         enable row level security;
alter table public.history           enable row level security;

do $$
declare t text;
begin
  foreach t in array array['exercise_progress', 'exercise_attempts', 'favorites', 'history'] loop
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
-- Historique limité à 50 commandes par utilisateur (HISTORY_LIMIT)
-- L'application n'en affiche pas plus ; sans cette limite, un appel direct
-- à l'API avec la clé publique pourrait remplir la base sans fin.
-- ---------------------------------------------------------------------

create or replace function public.trim_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.history
  where user_id = new.user_id
    and id not in (
      select id from public.history where user_id = new.user_id order by created_at desc limit 50
    );
  return null; -- déclencheur « after » : la valeur de retour est ignorée
end;
$$;

revoke all on function public.trim_history() from public, anon, authenticated;

drop trigger if exists history_trim on public.history;
create trigger history_trim after insert or update on public.history
  for each row execute function public.trim_history();

-- ---------------------------------------------------------------------
-- Essais limités à 1000 par utilisateur (ATTEMPTS_LIMIT), pour la même raison
-- ---------------------------------------------------------------------

create or replace function public.trim_attempts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.exercise_attempts
  where user_id = new.user_id
    and id not in (
      select id from public.exercise_attempts where user_id = new.user_id order by created_at desc limit 1000
    );
  return null;
end;
$$;

revoke all on function public.trim_attempts() from public, anon, authenticated;

drop trigger if exists attempts_trim on public.exercise_attempts;
create trigger attempts_trim after insert on public.exercise_attempts
  for each row execute function public.trim_attempts();

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
