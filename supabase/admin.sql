-- LinuxLens : tableau de bord administrateur et journal des erreurs
-- À exécuter APRÈS schema.sql : SQL Editor → New query → coller → Run.
-- Le script est idempotent : on peut le relancer sans erreur.
--
-- Pour vous déclarer administrateur, une fois votre compte créé sur le site :
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'votre@adresse.fr';

-- ---------------------------------------------------------------------
-- Administrateurs
-- Aucune règle RLS n'autorise la lecture : la table n'est lisible que par
-- les fonctions ci-dessous. Personne ne peut s'ajouter depuis le site.
-- ---------------------------------------------------------------------

create table if not exists public.admins (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Journal des erreurs
-- Le site y enregistre les plantages et les erreurs inattendues, même pour
-- les visiteurs sans compte. Seul un administrateur peut le lire.
-- ---------------------------------------------------------------------

create table if not exists public.error_logs (
  id         bigint      generated always as identity primary key,
  user_id    uuid        default auth.uid() references auth.users (id) on delete set null,
  source     text        not null check (char_length(source) <= 50),
  message    text        not null check (char_length(message) <= 500),
  detail     text        not null default '' check (char_length(detail) <= 2000),
  path       text        not null default '' check (char_length(path) <= 300),
  user_agent text        not null default '' check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists error_logs_recent on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;

drop policy if exists "signaler une erreur" on public.error_logs;
create policy "signaler une erreur" on public.error_logs
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- Au plus 1000 erreurs conservées : un script qui boucle ne remplit pas la base
create or replace function public.trim_error_logs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.error_logs
  where id not in (select id from public.error_logs order by created_at desc limit 1000);
  return null;
end;
$$;

revoke all on function public.trim_error_logs() from public, anon, authenticated;

drop trigger if exists error_logs_trim on public.error_logs;
create trigger error_logs_trim after insert on public.error_logs
  for each statement execute function public.trim_error_logs();

-- ---------------------------------------------------------------------
-- Messages des visiteurs
-- Envoyés depuis la page d'explication (« Un problème ? »), même sans compte.
-- Seul un administrateur peut les lire.
-- ---------------------------------------------------------------------

create table if not exists public.feedback (
  id         bigint      generated always as identity primary key,
  user_id    uuid        default auth.uid() references auth.users (id) on delete set null,
  message    text        not null check (char_length(message) between 1 and 1000),
  command    text        not null default '' check (char_length(command) <= 500),
  path       text        not null default '' check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);

create index if not exists feedback_recent on public.feedback (created_at desc);

-- Réponse de l'administrateur, lue par l'auteur du message dans « Mon compte »
alter table public.feedback
  add column if not exists reply      text check (char_length(reply) between 1 and 2000),
  add column if not exists replied_at timestamptz;

create index if not exists feedback_user on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

-- Personne ne peut écrire lui-même une « réponse » : seule admin_reply_feedback() le fait
drop policy if exists "envoyer un message" on public.feedback;
create policy "envoyer un message" on public.feedback
  for insert to anon, authenticated
  with check ((user_id is null or user_id = (select auth.uid())) and reply is null and replied_at is null);

drop policy if exists "lire ses messages" on public.feedback;
create policy "lire ses messages" on public.feedback
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Au plus 1000 messages conservés : un robot qui en envoie en boucle ne remplit pas la base
create or replace function public.trim_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.feedback
  where id not in (select id from public.feedback order by created_at desc limit 1000);
  return null;
end;
$$;

revoke all on function public.trim_feedback() from public, anon, authenticated;

drop trigger if exists feedback_trim on public.feedback;
create trigger feedback_trim after insert on public.feedback
  for each statement execute function public.trim_feedback();

-- ---------------------------------------------------------------------
-- Fonctions du tableau de bord
-- Chacune vérifie d'abord que l'appelant est administrateur : c'est la vraie
-- protection. La page /admin du site n'est qu'un affichage.
-- ---------------------------------------------------------------------

create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.require_admin() from public, anon, authenticated;

-- Les comptes administrateurs sont exclus des statistiques : vos propres tests ne les faussent pas
create or replace function public.is_admin_user(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = uid);
$$;

revoke all on function public.is_admin_user(uuid) from public, anon, authenticated;

create or replace function public.admin_overview()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return json_build_object(
    'users',       (select count(*) from auth.users u where not public.is_admin_user(u.id)),
    'users_7d',    (select count(*) from auth.users u where not public.is_admin_user(u.id) and u.created_at > now() - interval '7 days'),
    'confirmed',   (select count(*) from auth.users u where not public.is_admin_user(u.id) and u.email_confirmed_at is not null),
    'active_7d',   (select count(*) from auth.users u where not public.is_admin_user(u.id) and u.last_sign_in_at > now() - interval '7 days'),
    'attempts',    (select count(*) from public.exercise_attempts a where not public.is_admin_user(a.user_id)),
    'attempts_7d', (select count(*) from public.exercise_attempts a where not public.is_admin_user(a.user_id) and a.created_at > now() - interval '7 days'),
    'correct_7d',  (select count(*) from public.exercise_attempts a where not public.is_admin_user(a.user_id) and a.correct and a.created_at > now() - interval '7 days'),
    'errors_7d',   (select count(*) from public.error_logs where created_at > now() - interval '7 days')
  );
end;
$$;

create or replace function public.admin_users()
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  confirmed boolean,
  attempts bigint,
  solved bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
    select u.id,
           u.email::text,
           u.raw_user_meta_data ->> 'display_name',
           u.created_at,
           u.last_sign_in_at,
           u.email_confirmed_at is not null,
           (select count(*) from public.exercise_attempts a where a.user_id = u.id),
           (select count(*) from public.exercise_progress p where p.user_id = u.id)
    from auth.users u
    where not public.is_admin_user(u.id)
    order by u.created_at desc;
end;
$$;

-- Réponses aux exercices de tous les utilisateurs, pour les scores par utilisateur
-- (calculés dans le site). L'historique des commandes expliquées n'y figure pas : il reste privé.
drop function if exists public.admin_activity(int);

create or replace function public.admin_attempts(max_rows int default 5000)
returns table (user_id uuid, exercise_id text, kind text, correct boolean, used_help boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
    select a.user_id, a.exercise_id, a.kind, a.correct, a.used_help, a.created_at
    from public.exercise_attempts a
    where not public.is_admin_user(a.user_id)
    order by a.created_at desc
    limit least(greatest(max_rows, 1), 20000);
end;
$$;

create or replace function public.admin_errors()
returns table (
  id bigint,
  email text,
  source text,
  message text,
  detail text,
  path text,
  user_agent text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
    select e.id, u.email::text, e.source, e.message, e.detail, e.path, e.user_agent, e.created_at
    from public.error_logs e left join auth.users u on u.id = e.user_id
    order by e.created_at desc
    limit 200;
end;
$$;

create or replace function public.admin_clear_errors()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  delete from public.error_logs where true;
end;
$$;

-- Le type de retour a changé (réponses) : la fonction doit être recréée
drop function if exists public.admin_feedback();

create or replace function public.admin_feedback()
returns table (
  id bigint,
  email text,
  can_reply boolean,
  message text,
  command text,
  path text,
  created_at timestamptz,
  reply text,
  replied_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
    select f.id, u.email::text, u.id is not null, f.message, f.command, f.path, f.created_at, f.reply, f.replied_at
    from public.feedback f left join auth.users u on u.id = f.user_id
    order by f.created_at desc
    limit 200;
end;
$$;

create or replace function public.admin_clear_feedback()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  delete from public.feedback where true;
end;
$$;

-- Réponse vide : la réponse est retirée
create or replace function public.admin_reply_feedback(feedback_id bigint, reply_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare answer text := nullif(btrim(reply_text), '');
begin
  perform public.require_admin();
  update public.feedback
  set reply = answer,
      replied_at = case when answer is null then null else now() end
  where id = feedback_id;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_overview()', 'admin_users()', 'admin_attempts(int)', 'admin_errors()', 'admin_clear_errors()',
    'admin_feedback()', 'admin_clear_feedback()', 'admin_reply_feedback(bigint, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Recharge la liste des fonctions de l’API, pour que le site voie tout de suite les changements
notify pgrst, 'reload schema';
