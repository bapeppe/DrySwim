import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { exerciseById } from '@/data/exercises';
const ids = {
  coach: '10000000-0000-4000-8000-000000000001',
  other: '10000000-0000-4000-8000-000000000002',
  student: '10000000-0000-4000-8000-000000000003',
  student2: '10000000-0000-4000-8000-000000000004',
  stranger: '10000000-0000-4000-8000-000000000005',
  athlete: '20000000-0000-4000-8000-000000000001',
  athlete2: '20000000-0000-4000-8000-000000000002',
  foreignAthlete: '20000000-0000-4000-8000-000000000003',
  workout: '30000000-0000-4000-8000-000000000001',
  draft: '30000000-0000-4000-8000-000000000002',
};
let db: PGlite, team: string, otherTeam: string, usedToken: string;
async function actor(id: string) {
  await db.exec('reset role;');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated;');
}
async function rows<T>(sql: string, args: unknown[] = []) {
  return (await db.query<T>(sql, args)).rows;
}
const document = (id: string) => ({
  id,
  name: 'Allenamento creato dal coach',
  description: '',
  rounds: 2,
  roundRestSeconds: 60,
  warmupSeconds: 60,
  warmupInstructions: 'Marcia controllata.',
  cooldownSeconds: 60,
  cooldownInstructions: 'Respirazione tranquilla.',
  exercises: [
    { id: 'set-1', exerciseId: 'squat', sets: 1, dose: exerciseById.squat.dose, restSeconds: 30 },
  ],
  custom: true,
  targetAthleteIds: [ids.athlete],
  published: true,
});
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;",
  );
  for (const id of Object.values(ids).slice(0, 5))
    await db.query('insert into auth.users(id) values($1)', [id]);
  await db.exec(readFileSync('supabase/migrations/202610200001_workspace.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/202610200002_catalog.sql', 'utf8'));
  await actor(ids.coach);
  team = (await rows<{ id: string }>("select public.create_team('Squadra A') as id"))[0].id;
  await db.query(
    'insert into public.athletes(id,team_id,display_name) values($1,$2,$3),($4,$2,$5)',
    [ids.athlete, team, 'Allievo A', ids.athlete2, 'Allievo B'],
  );
  usedToken = (
    await rows<{ token: string }>('select public.create_team_invite($1) as token', [ids.athlete])
  )[0].token;
  await actor(ids.student);
  await db.query('select public.accept_team_invite($1)', [usedToken]);
  await actor(ids.coach);
  const token = (
    await rows<{ token: string }>('select public.create_team_invite($1) as token', [ids.athlete2])
  )[0].token;
  await actor(ids.student2);
  await db.query('select public.accept_team_invite($1)', [token]);
  await actor(ids.other);
  otherTeam = (await rows<{ id: string }>("select public.create_team('Squadra B') as id"))[0].id;
  await db.query('insert into public.athletes(id,team_id,display_name) values($1,$2,$3)', [
    ids.foreignAthlete,
    otherTeam,
    'Allievo C',
  ]);
  await actor(ids.coach);
  await db.query(
    'insert into public.workouts(id,team_id,document,published,created_by) values($1,$2,$3,true,$4)',
    [ids.workout, team, JSON.stringify(document(ids.workout)), ids.coach],
  );
  await db.query(
    'insert into public.workouts(id,team_id,document,published,created_by) values($1,$2,$3,false,$4)',
    [ids.draft, team, JSON.stringify(document(ids.draft)), ids.coach],
  );
  await db.query(
    "insert into public.swim_results(id,team_id,athlete_id,distance,stroke,pool_length,date,centiseconds,kind,recorded_by) values('40000000-0000-4000-8000-000000000001',$1,$2,100,'medley',25,'2026-10-20',7200,'race',$3),('40000000-0000-4000-8000-000000000002',$1,$4,100,'medley',25,'2026-10-20',7500,'training',$3)",
    [team, ids.athlete, ids.coach, ids.athlete2],
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe('PostgreSQL, migrazioni e isolamento reale con RLS', () => {
  it('inizializza 52 esercizi e nessun programma predefinito', async () => {
    await actor(ids.coach);
    expect((await rows<{ n: number }>('select count(*)::int n from public.exercises'))[0].n).toBe(
      52,
    );
    expect(
      await rows("select id from public.workouts where document->>'custom'='false'"),
    ).toHaveLength(0);
  });
  it('l’atleta vede solo se stesso, i propri tempi e i programmi pubblicati a lui', async () => {
    await actor(ids.student);
    expect((await rows<{ id: string }>('select id from public.athletes')).map((r) => r.id)).toEqual(
      [ids.athlete],
    );
    expect(await rows('select * from public.swim_results')).toHaveLength(1);
    expect((await rows<{ id: string }>('select id from public.workouts')).map((r) => r.id)).toEqual(
      [ids.workout],
    );
    await actor(ids.student2);
    expect(await rows('select * from public.workouts')).toHaveLength(0);
  });
  it('l’atleta non può creare programmi, correggere tempi o modificare il proprio ruolo', async () => {
    await actor(ids.student);
    await expect(
      db.query('insert into public.workouts(id,team_id,document,created_by) values($1,$2,$3,$4)', [
        '30000000-0000-4000-8000-000000000009',
        team,
        JSON.stringify(document('30000000-0000-4000-8000-000000000009')),
        ids.student,
      ]),
    ).rejects.toThrow();
    await expect(
      db.query("update public.memberships set role='coach' where user_id=$1", [ids.student]),
    ).rejects.toThrow();
    const result = await db.query(
      'update public.swim_results set centiseconds=1 where athlete_id=$1',
      [ids.athlete],
    );
    expect(result.affectedRows).toBe(0);
  });
  it('i coach non leggono o modificano dati di altre squadre e non possono assegnare allievi esterni', async () => {
    await actor(ids.other);
    expect(await rows('select * from public.swim_results')).toHaveLength(0);
    expect((await rows<{ id: string }>('select id from public.athletes')).map((r) => r.id)).toEqual(
      [ids.foreignAthlete],
    );
    await actor(ids.coach);
    const invalid = {
      ...document('30000000-0000-4000-8000-000000000008'),
      targetAthleteIds: [ids.foreignAthlete],
    };
    await expect(
      db.query('insert into public.workouts(id,team_id,document,created_by) values($1,$2,$3,$4)', [
        invalid.id,
        team,
        JSON.stringify(invalid),
        ids.coach,
      ]),
    ).rejects.toThrow();
  });
  it('un invito usato non è riutilizzabile e non permette di scegliere un altro allievo', async () => {
    await actor(ids.stranger);
    await expect(db.query('select public.accept_team_invite($1)', [usedToken])).rejects.toThrow();
    expect(await rows('select * from public.athletes')).toHaveLength(0);
    await expect(
      db.query("insert into public.memberships(user_id,team_id,role) values($1,$2,'coach')", [
        ids.stranger,
        team,
      ]),
    ).rejects.toThrow();
  });
  it('il coach non può collegare direttamente un account o cambiare il catalogo base', async () => {
    await actor(ids.coach);
    await expect(
      db.query('update public.athletes set user_id=$1 where id=$2', [ids.stranger, ids.athlete2]),
    ).rejects.toThrow();
    expect(
      (
        await db.query(
          "update public.exercises set document=jsonb_set(document,'{name}','\"Alterato\"') where id='squat'",
        )
      ).affectedRows,
    ).toBe(0);
  });
  it('le chiavi composte impediscono tempi associati a un allievo di un’altra squadra', async () => {
    await actor(ids.coach);
    await expect(
      db.query(
        "insert into public.swim_results(id,team_id,athlete_id,distance,stroke,pool_length,date,centiseconds,kind,recorded_by) values('40000000-0000-4000-8000-000000000009',$1,$2,100,'medley',25,'2026-10-20',7200,'race',$3)",
        [team, ids.foreignAthlete, ids.coach],
      ),
    ).rejects.toThrow();
  });
  it('archiviare un allievo revoca la lettura senza eliminare lo storico del coach', async () => {
    await actor(ids.coach);
    await db.query('update public.athletes set archived=true where id=$1', [ids.athlete2]);
    await actor(ids.student2);
    expect(await rows('select * from public.exercises where team_id is not null')).toHaveLength(0);
    expect(await rows('select * from public.swim_results')).toHaveLength(0);
    await actor(ids.coach);
    expect(
      await rows('select * from public.swim_results where athlete_id=$1', [ids.athlete2]),
    ).toHaveLength(1);
    await db.query('update public.athletes set archived=false where id=$1', [ids.athlete2]);
  });
});

describe('Catalogo della squadra e sessioni private', () => {
  const customId = 'custom-50000000-0000-4000-8000-000000000001';
  const sessionId = '60000000-0000-4000-8000-000000000001';
  it('condivide gli esercizi solo con la propria squadra e blocca gli inserimenti degli atleti', async () => {
    await actor(ids.coach);
    const custom = { ...exerciseById.squat, id: customId, slug: customId, custom: true };
    await db.query(
      'insert into public.exercises(id,team_id,document,created_by) values($1,$2,$3,$4)',
      [customId, team, JSON.stringify(custom), ids.coach],
    );
    await actor(ids.student);
    expect(await rows('select id from public.exercises where id=$1', [customId])).toHaveLength(1);
    await expect(
      db.query('insert into public.exercises(id,team_id,document,created_by) values($1,$2,$3,$4)', [
        customId + 'x',
        team,
        JSON.stringify({ ...custom, id: customId + 'x', slug: customId + 'x' }),
        ids.student,
      ]),
    ).rejects.toThrow();
    await actor(ids.other);
    expect(await rows('select id from public.exercises where id=$1', [customId])).toHaveLength(0);
    const foreign = {
      ...document('30000000-0000-4000-8000-000000000007'),
      targetAthleteIds: [],
      exercises: [{ ...document(ids.workout).exercises[0], exerciseId: customId }],
    };
    await expect(
      db.query('insert into public.workouts(id,team_id,document,created_by) values($1,$2,$3,$4)', [
        foreign.id,
        otherTeam,
        JSON.stringify(foreign),
        ids.other,
      ]),
    ).rejects.toThrow();
  });
  it('salva la propria sessione ma impedisce di attribuirla a un altro allievo', async () => {
    await actor(ids.student);
    await db.query(
      'insert into public.workout_sessions(id,team_id,user_id,athlete_id,workout_id,document) values($1,$2,$3,$4,$5,$6)',
      [sessionId, team, ids.student, ids.athlete, ids.workout, JSON.stringify({ id: sessionId })],
    );
    await expect(
      db.query(
        'insert into public.workout_sessions(id,team_id,user_id,athlete_id,workout_id,document) values($1,$2,$3,$4,$5,$6)',
        [
          '60000000-0000-4000-8000-000000000002',
          team,
          ids.student,
          ids.athlete2,
          ids.workout,
          JSON.stringify({ id: '60000000-0000-4000-8000-000000000002' }),
        ],
      ),
    ).rejects.toThrow();
    await expect(
      db.query('update public.workout_sessions set document=$1 where id=$2', [
        JSON.stringify({ id: sessionId, altered: true }),
        sessionId,
      ]),
    ).rejects.toThrow();
    await actor(ids.student2);
    expect(await rows('select * from public.workout_sessions')).toHaveLength(0);
    await actor(ids.other);
    expect(await rows('select * from public.workout_sessions')).toHaveLength(0);
    await actor(ids.coach);
    expect(await rows('select * from public.workout_sessions')).toHaveLength(1);
  });
  it('rifiuta inviti scaduti e non espone gli hash ai client', async () => {
    await actor(ids.coach);
    const token = (
      await rows<{ token: string }>("select public.create_team_invite(null,'coach') as token")
    )[0].token;
    await db.exec('reset role;');
    await db.exec(
      "update public.team_invites set expires_at=now()-interval '1 minute' where used_at is null",
    );
    await actor(ids.stranger);
    await expect(db.query('select public.accept_team_invite($1)', [token])).rejects.toThrow();
    await expect(db.query('select * from public.team_invites')).rejects.toThrow();
  });
});
