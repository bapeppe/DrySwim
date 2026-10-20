import { exercises } from '@/data/exercises';
import { exerciseSchema, sessionSchema } from '@/lib/models';
import { teamWorkoutSchema, workspaceSchema, type Workspace } from '@/lib/team-models';
import { databaseConfig } from './supabase';
import { databaseError, context } from './http';

export const emptyWorkspace = (configured: boolean): Workspace => ({
  configured,
  status: 'setup-required',
  team: null,
  exercises,
  workouts: [],
  athletes: [],
  results: [],
  sessions: [],
});
export async function readWorkspace(): Promise<Workspace> {
  if (!databaseConfig()) return emptyWorkspace(false);
  const { db, team } = await context();
  const replies = await Promise.all([
    db.from('exercises').select('document').order('created_at'),
    db
      .from('workouts')
      .select('document,published')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false }),
    db
      .from('athletes')
      .select('id,team_id,display_name,archived')
      .eq('team_id', team.id)
      .order('display_name'),
    db
      .from('swim_results')
      .select('*')
      .eq('team_id', team.id)
      .order('date', { ascending: false })
      .order('recorded_at', { ascending: false }),
    db
      .from('workout_sessions')
      .select('document,athlete_id')
      .eq('team_id', team.id)
      .order('created_at'),
  ]);
  for (const reply of replies) databaseError(reply.error);
  const [catalog, plans, students, times, sessions] = replies;
  return workspaceSchema.parse({
    configured: true,
    status: 'ready',
    team,
    exercises: (catalog.data || []).map((r) => exerciseSchema.parse(r.document)),
    workouts: (plans.data || []).map((r) =>
      teamWorkoutSchema.parse({ ...r.document, published: r.published }),
    ),
    athletes: (students.data || []).map((a) => ({
      id: a.id,
      teamId: a.team_id,
      displayName: a.display_name,
      archived: a.archived,
    })),
    results: (times.data || []).map((r) => ({
      id: r.id,
      athleteId: r.athlete_id,
      distance: r.distance,
      stroke: r.stroke,
      poolLength: r.pool_length,
      date: r.date,
      centiseconds: r.centiseconds,
      kind: r.kind,
      note: r.note,
      recordedAt: r.recorded_at,
    })),
    sessions: (sessions.data || []).map((r) => ({
      ...sessionSchema.parse(r.document),
      athleteId: r.athlete_id,
    })),
  });
}
