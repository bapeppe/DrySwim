import { exercises } from '@/data/exercises';
import { exerciseSchema, sessionSchema } from '@/lib/models';
import { teamWorkoutSchema, workspaceSchema, type Workspace } from '@/lib/team-models';
import { serverDatabase, databaseConfig } from './supabase';
import { databaseError, HttpError } from './http';

export const emptyWorkspace = (configured: boolean): Workspace => ({
  configured,
  status: configured ? 'signed-out' : 'setup-required',
  user: null,
  member: null,
  exercises,
  workouts: [],
  athletes: [],
  results: [],
  sessions: [],
});
export async function readWorkspace(): Promise<Workspace> {
  if (!databaseConfig()) return emptyWorkspace(false);
  const db = await serverDatabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) return emptyWorkspace(true);
  const own = { id: user.id, email: user.email || '' };
  const { data: membership, error: membershipError } = await db
    .from('memberships')
    .select('team_id,role')
    .eq('user_id', user.id)
    .maybeSingle();
  databaseError(membershipError);
  if (!membership) return { ...emptyWorkspace(true), user: own, status: 'onboarding' };
  const replies = await Promise.all([
    db.from('teams').select('name').eq('id', membership.team_id).single(),
    db.from('exercises').select('document').order('created_at'),
    db
      .from('workouts')
      .select('document,published,created_by')
      .order('created_at', { ascending: false }),
    db.from('athletes').select('id,team_id,display_name,user_id,archived').order('display_name'),
    db
      .from('swim_results')
      .select('*')
      .order('date', { ascending: false })
      .order('recorded_at', { ascending: false }),
    db.from('workout_sessions').select('document').eq('user_id', user.id).order('created_at'),
  ]);
  for (const reply of replies) databaseError(reply.error);
  const [team, catalog, plans, students, times, sessions] = replies;
  const athletes = (students.data || []).map((a) => ({
    id: a.id,
    teamId: a.team_id,
    displayName: a.display_name,
    linked: !!a.user_id,
    archived: a.archived,
  }));
  const ownStudent = (students.data || []).find((a) => a.user_id === user.id && !a.archived);
  if (membership.role === 'athlete' && !ownStudent)
    throw new HttpError(403, 'Il tuo accesso non è attivo. Contatta l’allenatore.');
  return workspaceSchema.parse({
    configured: true,
    status: 'ready',
    user: own,
    member: {
      userId: user.id,
      teamId: membership.team_id,
      role: membership.role,
      athleteId: ownStudent?.id || null,
      teamName: team.data!.name,
    },
    exercises: (catalog.data || []).map((r) => exerciseSchema.parse(r.document)),
    workouts: (plans.data || []).map((r) =>
      teamWorkoutSchema.parse({ ...r.document, published: r.published, createdBy: r.created_by }),
    ),
    athletes,
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
    sessions: (sessions.data || []).map((r) => sessionSchema.parse(r.document)),
  });
}
