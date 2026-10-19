-- SwimDryland: PostgreSQL + Supabase Auth. Nessuna service-role key richiesta dall’app.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.teams (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(btrim(name)) between 2 and 80),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.memberships (
 user_id uuid primary key references auth.users(id) on delete cascade, team_id uuid not null references public.teams(id),
 role text not null check(role in ('coach','athlete')), created_at timestamptz not null default now()
);
create table public.athletes (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id),
 display_name text not null check(char_length(btrim(display_name)) between 1 and 80),
 user_id uuid unique references auth.users(id) on delete set null, archived boolean not null default false,
 created_at timestamptz not null default now(), unique(team_id,id)
);
create table public.exercises (
 id text primary key, team_id uuid references public.teams(id), document jsonb not null,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 check(jsonb_typeof(document)='object' and document->>'id'=id and document->>'slug'=id),
 check(team_id is null or (id like 'custom-%' and document->>'custom'='true'))
);
create table public.workouts (
 id uuid primary key, team_id uuid not null references public.teams(id), document jsonb not null,
 published boolean not null default false, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(jsonb_typeof(document)='object' and document->>'id'=id::text and document->>'custom'='true'),
 check(jsonb_typeof(document->'exercises')='array' and jsonb_array_length(document->'exercises') between 1 and 30),
 check(jsonb_typeof(document->'targetAthleteIds')='array')
);
create table public.swim_results (
 id uuid primary key, team_id uuid not null references public.teams(id), athlete_id uuid not null,
 distance integer not null check(distance in (25,50,100,200,400,800,1500)),
 stroke text not null check(stroke in ('freestyle','backstroke','breaststroke','butterfly','medley')),
 pool_length integer not null check(pool_length in (25,50)), date date not null,
 centiseconds integer not null check(centiseconds between 1 and 360000), kind text not null check(kind in ('training','race')),
 note text not null default '' check(char_length(note)<=300), recorded_by uuid not null references auth.users(id),
 recorded_at timestamptz not null default now(), foreign key(team_id,athlete_id) references public.athletes(team_id,id)
);
create table public.workout_sessions (
 id uuid primary key, team_id uuid not null references public.teams(id), user_id uuid not null references auth.users(id),
 athlete_id uuid, workout_id uuid references public.workouts(id) on delete set null, document jsonb not null,
 created_at timestamptz not null default now(), foreign key(team_id,athlete_id) references public.athletes(team_id,id),
 check(jsonb_typeof(document)='object' and document->>'id'=id::text)
);
create table public.team_invites (
 token_hash text primary key, team_id uuid not null references public.teams(id), athlete_id uuid,
 role text not null check(role in ('coach','athlete')), expires_at timestamptz not null, used_at timestamptz,
 created_by uuid not null references auth.users(id), foreign key(team_id,athlete_id) references public.athletes(team_id,id),
 check((role='coach' and athlete_id is null) or (role='athlete' and athlete_id is not null))
);
create index athletes_team on public.athletes(team_id);
create index exercises_team on public.exercises(team_id);
create index workouts_team on public.workouts(team_id);
create index results_athlete_date on public.swim_results(athlete_id,date);
create index sessions_user on public.workout_sessions(user_id);

-- Le funzioni private evitano ricorsione nelle policy e non accettano un user_id dal client.
create function private.is_coach(p_team uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where user_id=(select auth.uid()) and team_id=p_team and role='coach');
$$;
create function private.is_member(p_team uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.team_id=p_team and (m.role='coach' or exists(select 1 from public.athletes a where a.team_id=p_team and a.user_id=(select auth.uid()) and not a.archived)));
$$;
create function private.owns_athlete(p_athlete uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.athletes where id=p_athlete and user_id=(select auth.uid()) and not archived);
$$;
create function private.can_read_workout(p_team uuid,p_published boolean,p_document jsonb) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_coach(p_team) or (p_published and private.is_member(p_team) and
 (jsonb_array_length(p_document->'targetAthleteIds')=0 or exists(select 1 from public.athletes a where a.team_id=p_team and a.user_id=(select auth.uid()) and not a.archived and p_document->'targetAthleteIds' ? a.id::text)));
$$;
revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.athletes enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.swim_results enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.team_invites enable row level security;
create policy team_read on public.teams for select to authenticated using(private.is_member(id));
create policy membership_read on public.memberships for select to authenticated using(user_id=(select auth.uid()));
create policy athlete_read on public.athletes for select to authenticated using(private.is_coach(team_id) or private.owns_athlete(id));
create policy athlete_insert on public.athletes for insert to authenticated with check(private.is_coach(team_id) and user_id is null);
create policy athlete_update on public.athletes for update to authenticated using(private.is_coach(team_id)) with check(private.is_coach(team_id));
create policy exercise_read on public.exercises for select to authenticated using(team_id is null or private.is_member(team_id));
create policy exercise_insert on public.exercises for insert to authenticated with check(team_id is not null and private.is_coach(team_id) and created_by=(select auth.uid()));
create policy exercise_update on public.exercises for update to authenticated using(team_id is not null and private.is_coach(team_id)) with check(team_id is not null and private.is_coach(team_id));
create policy workout_read on public.workouts for select to authenticated using(private.can_read_workout(team_id,published,document));
create policy workout_insert on public.workouts for insert to authenticated with check(private.is_coach(team_id) and created_by=(select auth.uid()));
create policy workout_update on public.workouts for update to authenticated using(private.is_coach(team_id)) with check(private.is_coach(team_id));
create policy workout_delete on public.workouts for delete to authenticated using(private.is_coach(team_id));
create policy result_read on public.swim_results for select to authenticated using(private.is_coach(team_id) or private.owns_athlete(athlete_id));
create policy result_insert on public.swim_results for insert to authenticated with check(private.is_coach(team_id) and recorded_by=(select auth.uid()));
create policy result_update on public.swim_results for update to authenticated using(private.is_coach(team_id)) with check(private.is_coach(team_id));
create policy result_delete on public.swim_results for delete to authenticated using(private.is_coach(team_id));
create policy session_read on public.workout_sessions for select to authenticated using(private.is_coach(team_id) or (user_id=(select auth.uid()) and private.is_member(team_id)));
create policy session_insert on public.workout_sessions for insert to authenticated with check(private.is_member(team_id) and user_id=(select auth.uid()) and (private.is_coach(team_id) or private.owns_athlete(athlete_id)) and exists(select 1 from public.workouts w where w.id=workout_id and w.team_id=workout_sessions.team_id and private.can_read_workout(w.team_id,w.published,w.document)));
-- Nessuna policy di modifica delle sessioni: i risultati salvati sono uno storico immutabile.
-- Gli inviti e le iscrizioni sono gestiti solo dalle RPC seguenti, non con INSERT del client.

create function private.validate_workout() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from jsonb_array_elements(new.document->'exercises') x where not exists(select 1 from public.exercises e where e.id=x->>'exerciseId' and (e.team_id is null or e.team_id=new.team_id))) then raise exception 'Il programma contiene un esercizio non disponibile per questa squadra'; end if;
 if exists(select 1 from jsonb_array_elements_text(new.document->'targetAthleteIds') x where not exists(select 1 from public.athletes a where a.id::text=x and a.team_id=new.team_id and not a.archived)) then raise exception 'Allievo non disponibile per questa squadra'; end if;
 new.updated_at=now(); return new;
end;
$$;
create trigger validate_workout before insert or update on public.workouts for each row execute function private.validate_workout();
-- Il collegamento account è modificabile solo dalle RPC: UPDATE concesso solo a nome/archiviazione.

create function public.create_team(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Accedi prima di creare una squadra'; end if;
 if exists(select 1 from public.memberships where user_id=auth.uid()) then raise exception 'Hai già una squadra'; end if;
 insert into public.teams(name,created_by) values(btrim(p_name),auth.uid()) returning id into v_id;
 insert into public.memberships(user_id,team_id,role) values(auth.uid(),v_id,'coach');
 return v_id;
end;
$$;
create function public.create_team_invite(p_athlete uuid default null,p_role text default 'athlete') returns text language plpgsql security definer set search_path='' as $$
declare v_team uuid; v_token text;
begin
 select team_id into v_team from public.memberships where user_id=auth.uid() and role='coach';
 if v_team is null then raise exception 'Solo gli allenatori possono creare inviti'; end if;
 if p_role not in ('athlete','coach') then raise exception 'Ruolo non valido'; end if;
 if p_role='athlete' then
   if not exists(select 1 from public.athletes where id=p_athlete and team_id=v_team and user_id is null and not archived) then raise exception 'Allievo non disponibile'; end if;
   delete from public.team_invites where athlete_id=p_athlete and used_at is null;
 elsif p_athlete is not null then raise exception 'Invito allenatore non valido'; end if;
 v_token=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.team_invites(token_hash,team_id,athlete_id,role,expires_at,created_by) values(encode(sha256(convert_to(v_token,'UTF8')),'hex'),v_team,p_athlete,p_role,now()+interval '7 days',auth.uid());
 return v_token;
end;
$$;
create function public.accept_team_invite(p_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_inv public.team_invites%rowtype;
begin
 if auth.uid() is null then raise exception 'Accedi prima di usare l’invito'; end if;
 if exists(select 1 from public.memberships where user_id=auth.uid()) then raise exception 'Hai già una squadra'; end if;
 select * into v_inv from public.team_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or v_inv.used_at is not null or v_inv.expires_at<=now() then raise exception 'Invito non valido o scaduto'; end if;
 if v_inv.role='athlete' then
   update public.athletes set user_id=auth.uid() where id=v_inv.athlete_id and team_id=v_inv.team_id and user_id is null and not archived;
   if not found then raise exception 'Allievo non disponibile'; end if;
 end if;
 insert into public.memberships(user_id,team_id,role) values(auth.uid(),v_inv.team_id,v_inv.role);
 update public.team_invites set used_at=now() where token_hash=v_inv.token_hash;
 return v_inv.team_id;
end;
$$;
revoke all on function public.create_team(text) from public;
revoke all on function public.create_team_invite(uuid,text) from public;
revoke all on function public.accept_team_invite(text) from public;
grant execute on function public.create_team(text),public.create_team_invite(uuid,text),public.accept_team_invite(text) to authenticated;
revoke all on all tables in schema public from anon;
grant select on public.teams,public.memberships to authenticated;
grant select,insert on public.athletes to authenticated;
revoke update on public.athletes from authenticated;
grant update(display_name,archived) on public.athletes to authenticated;
grant select,insert,update on public.exercises to authenticated;
grant select,insert,update,delete on public.workouts,public.swim_results to authenticated;
grant select,insert on public.workout_sessions to authenticated;
commit;
