-- Un solo spazio condiviso senza account. Le squadre precedenti rimangono private.
begin;
alter table public.teams add column shared_access boolean not null default false;
create unique index one_shared_team on public.teams(shared_access) where shared_access;
create index results_team_date on public.swim_results(team_id,date);
create index sessions_team_created on public.workout_sessions(team_id,created_at);
alter table public.teams alter column created_by drop not null;
alter table public.workouts alter column created_by drop not null;
alter table public.swim_results alter column recorded_by drop not null;
alter table public.workout_sessions alter column user_id drop not null;
insert into public.teams(name,shared_access) values('DrySwim',true);

grant select(id,name,shared_access) on public.teams to anon;
create policy shared_team_read on public.teams for select to anon using(shared_access);

grant select,insert on public.athletes to anon;
grant update(display_name,archived) on public.athletes to anon;
create policy shared_athlete_read on public.athletes for select to anon using(team_id=(select id from public.teams where shared_access));
create policy shared_athlete_insert on public.athletes for insert to anon with check(team_id=(select id from public.teams where shared_access) and user_id is null);
create policy shared_athlete_update on public.athletes for update to anon using(team_id=(select id from public.teams where shared_access)) with check(team_id=(select id from public.teams where shared_access) and user_id is null);

grant select,insert,update on public.exercises to anon;
create policy shared_exercise_read on public.exercises for select to anon using(team_id is null or team_id=(select id from public.teams where shared_access));
create policy shared_exercise_insert on public.exercises for insert to anon with check(team_id=(select id from public.teams where shared_access) and created_by is null);
create policy shared_exercise_update on public.exercises for update to anon using(team_id=(select id from public.teams where shared_access)) with check(team_id=(select id from public.teams where shared_access) and created_by is null);

grant select,insert,update,delete on public.workouts,public.swim_results to anon;
create policy shared_workout_read on public.workouts for select to anon using(team_id=(select id from public.teams where shared_access));
create policy shared_workout_insert on public.workouts for insert to anon with check(team_id=(select id from public.teams where shared_access) and created_by is null);
create policy shared_workout_update on public.workouts for update to anon using(team_id=(select id from public.teams where shared_access)) with check(team_id=(select id from public.teams where shared_access) and created_by is null);
create policy shared_workout_delete on public.workouts for delete to anon using(team_id=(select id from public.teams where shared_access));
create policy shared_result_read on public.swim_results for select to anon using(team_id=(select id from public.teams where shared_access));
create policy shared_result_insert on public.swim_results for insert to anon with check(team_id=(select id from public.teams where shared_access) and recorded_by is null and exists(select 1 from public.athletes a where a.id=athlete_id and a.team_id=swim_results.team_id and not a.archived));
create policy shared_result_update on public.swim_results for update to anon using(team_id=(select id from public.teams where shared_access)) with check(team_id=(select id from public.teams where shared_access) and recorded_by is null and exists(select 1 from public.athletes a where a.id=athlete_id and a.team_id=swim_results.team_id and not a.archived));
create policy shared_result_delete on public.swim_results for delete to anon using(team_id=(select id from public.teams where shared_access));

grant select,insert on public.workout_sessions to anon;
create policy shared_session_read on public.workout_sessions for select to anon using(team_id=(select id from public.teams where shared_access));
create policy shared_session_insert on public.workout_sessions for insert to anon with check(team_id=(select id from public.teams where shared_access) and user_id is null and (athlete_id is null or exists(select 1 from public.athletes a where a.id=athlete_id and a.team_id=workout_sessions.team_id and not a.archived)) and exists(select 1 from public.workouts w where w.id=workout_id and w.team_id=workout_sessions.team_id and w.published));

-- Nessun accesso anonimo a iscrizioni, inviti o RPC del vecchio flusso account.
revoke all on public.memberships,public.team_invites from anon;
revoke execute on function public.create_team(text),public.create_team_invite(uuid,text),public.accept_team_invite(text) from anon;
commit;
