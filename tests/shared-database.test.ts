import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { exerciseById } from '@/data/exercises';

let db: PGlite, team: string;
const owner = '10000000-0000-4000-8000-000000000001';
const privateTeam = '20000000-0000-4000-8000-000000000001';
const privateAthlete = '30000000-0000-4000-8000-000000000001';
const athlete = '30000000-0000-4000-8000-000000000002';
const workout = '40000000-0000-4000-8000-000000000001';
const session = '50000000-0000-4000-8000-000000000001';
const result = '60000000-0000-4000-8000-000000000001';
const document = {
  id: workout,
  custom: true,
  name: 'Programma condiviso',
  targetAthleteIds: [athlete],
  exercises: [
    { id: 'set', exerciseId: 'squat', sets: 1, dose: exerciseById.squat.dose, restSeconds: 30 },
  ],
};
async function rows<T = Record<string, unknown>>(sql: string, args: unknown[] = []) {
  return (await db.query<T>(sql, args)).rows;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;",
  );
  for (const file of ['202610200001_workspace.sql', '202610200002_catalog.sql'])
    await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'));
  await db.query('insert into auth.users(id) values($1)', [owner]);
  await db.query('insert into public.teams(id,name,created_by) values($1,$2,$3)', [
    privateTeam,
    'Privata precedente',
    owner,
  ]);
  await db.query('insert into public.memberships(user_id,team_id,role) values($1,$2,$3)', [
    owner,
    privateTeam,
    'coach',
  ]);
  await db.query('insert into public.athletes(id,team_id,display_name) values($1,$2,$3)', [
    privateAthlete,
    privateTeam,
    'Nome privato',
  ]);
  await db.exec(readFileSync('supabase/migrations/20261020102443_shared_team_access.sql', 'utf8'));
  await db.exec('set role anon');
  team = (await rows<{ id: string }>('select id from public.teams'))[0].id;
}, 30000);
afterAll(async () => {
  await db?.close();
});

describe('Accesso condiviso senza account, migrazione e RLS', () => {
  it('apre un solo spazio e 52 esercizi, senza convertire dati privati o creare account', async () => {
    expect(await rows('select id from public.teams')).toHaveLength(1);
    expect(await rows('select id from public.athletes')).toHaveLength(0);
    expect(await rows('select id from public.workouts')).toHaveLength(0);
    expect(await rows('select id from public.exercises')).toHaveLength(52);
    await db.exec('reset role');
    expect(await rows('select id from auth.users')).toHaveLength(1);
    expect(
      await rows('select id from public.athletes where team_id=$1', [privateTeam]),
    ).toHaveLength(1);
    await db.exec('set role anon');
  });
  it('permette di creare e modificare allievi senza membership', async () => {
    await db.query('insert into public.athletes(id,team_id,display_name) values($1,$2,$3)', [
      athlete,
      team,
      'Allievo condiviso',
    ]);
    await db.query('update public.athletes set display_name=$1 where id=$2', [
      'Nome breve',
      athlete,
    ]);
    expect((await rows('select display_name from public.athletes'))[0].display_name).toBe(
      'Nome breve',
    );
    await expect(
      db.query('insert into public.athletes(team_id,display_name) values($1,$2)', [
        privateTeam,
        'Intrusione',
      ]),
    ).rejects.toThrow();
    await expect(
      db.query('update public.athletes set user_id=$1 where id=$2', [owner, athlete]),
    ).rejects.toThrow();
  });
  it('condivide gli esercizi personalizzati ma conserva immutabile il catalogo base', async () => {
    const id = 'custom-70000000-0000-4000-8000-000000000001';
    await db.query('insert into public.exercises(id,team_id,document) values($1,$2,$3)', [
      id,
      team,
      JSON.stringify({ ...exerciseById.squat, id, slug: id, custom: true }),
    ]);
    expect(await rows('select id from public.exercises')).toHaveLength(53);
    expect(
      (
        await db.query(
          "update public.exercises set document=jsonb_set(document,'{name}','\"Alterato\"') where id='squat'",
        )
      ).affectedRows,
    ).toBe(0);
    await expect(
      db.query('insert into public.exercises(id,team_id,document) values($1,$2,$3)', [
        id + 'x',
        privateTeam,
        JSON.stringify({ id: id + 'x', slug: id + 'x', custom: true }),
      ]),
    ).rejects.toThrow();
  });
  it('permette bozze condivise e pubblicazione, ma non sessioni su bozze', async () => {
    await db.query('insert into public.workouts(id,team_id,document) values($1,$2,$3)', [
      workout,
      team,
      JSON.stringify(document),
    ]);
    expect(await rows('select id from public.workouts')).toHaveLength(1);
    await expect(
      db.query(
        'insert into public.workout_sessions(id,team_id,athlete_id,workout_id,document) values($1,$2,$3,$4,$5)',
        [session, team, athlete, workout, JSON.stringify({ id: session })],
      ),
    ).rejects.toThrow();
    await db.query('update public.workouts set published=true where id=$1', [workout]);
    await db.query(
      'insert into public.workout_sessions(id,team_id,athlete_id,workout_id,document) values($1,$2,$3,$4,$5)',
      [session, team, athlete, workout, JSON.stringify({ id: session })],
    );
    await expect(
      db.query('update public.workout_sessions set document=$1 where id=$2', ['{}', session]),
    ).rejects.toThrow();
    await expect(
      db.query('delete from public.workout_sessions where id=$1', [session]),
    ).rejects.toThrow();
  });
  it('salva, corregge ed elimina tempi in centesimi senza mescolare squadre', async () => {
    const sql =
      "insert into public.swim_results(id,team_id,athlete_id,distance,stroke,pool_length,date,centiseconds,kind) values($1,$2,$3,100,'freestyle',25,'2026-10-20',7234,'training')";
    await db.query(sql, [result, team, athlete]);
    await db.query('update public.swim_results set centiseconds=7123 where id=$1', [result]);
    expect((await rows('select centiseconds from public.swim_results'))[0].centiseconds).toBe(7123);
    await expect(
      db.query(sql, ['60000000-0000-4000-8000-000000000002', team, privateAthlete]),
    ).rejects.toThrow();
    await expect(
      db.query(sql, ['60000000-0000-4000-8000-000000000002', privateTeam, privateAthlete]),
    ).rejects.toThrow();
    await db.query('delete from public.swim_results where id=$1', [result]);
    expect(await rows('select id from public.swim_results')).toHaveLength(0);
    await db.query(sql, [result, team, athlete]);
  });
  it('archivia senza perdere storico e impedisce nuovi tempi o sessioni per archiviati', async () => {
    await db.query('update public.athletes set archived=true where id=$1', [athlete]);
    expect(await rows('select id from public.swim_results')).toHaveLength(1);
    expect(await rows('select id from public.workout_sessions')).toHaveLength(1);
    await expect(
      db.query(
        'insert into public.workout_sessions(id,team_id,athlete_id,workout_id,document) values($1,$2,$3,$4,$5)',
        [
          '50000000-0000-4000-8000-000000000002',
          team,
          athlete,
          workout,
          JSON.stringify({ id: '50000000-0000-4000-8000-000000000002' }),
        ],
      ),
    ).rejects.toThrow();
    await db.query('update public.athletes set archived=false where id=$1', [athlete]);
  });
  it('non permette di cambiare squadra o accedere a inviti, membership e vecchie RPC', async () => {
    for (const table of ['team_invites', 'memberships'])
      await expect(db.query('select * from public.' + table)).rejects.toThrow();
    await expect(db.query("select public.create_team('Altra squadra')")).rejects.toThrow();
    await expect(db.query("select public.create_team_invite(null,'coach')")).rejects.toThrow();
    await expect(db.query("select public.accept_team_invite('token')")).rejects.toThrow();
    await expect(
      db.query('update public.teams set shared_access=true where id=$1', [privateTeam]),
    ).rejects.toThrow();
    await expect(
      db.query('insert into public.teams(name,shared_access) values($1,true)', ['Altra']),
    ).rejects.toThrow();
    await expect(
      db.query('update public.workouts set team_id=$1 where id=$2', [privateTeam, workout]),
    ).rejects.toThrow();
  });
});
