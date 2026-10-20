import { z } from 'zod';
import { sessionSchema } from '@/lib/models';
import { endpoint, json, payload, context, databaseError, HttpError } from '@/lib/server/http';
export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, team } = await context();
    const body = sessionSchema
      .extend({
        id: z.string().uuid(),
        workoutId: z.string().uuid(),
        athleteId: z.string().uuid().nullable().default(null),
      })
      .parse(await payload(request));
    const { athleteId, ...document } = body;
    const { error } = await db.from('workout_sessions').insert({
      id: body.id,
      team_id: team.id,
      user_id: null,
      athlete_id: athleteId,
      workout_id: body.workoutId,
      document,
    });
    if (error?.code === '23505') {
      const { data } = await db
        .from('workout_sessions')
        .select('document,athlete_id')
        .eq('id', body.id)
        .eq('team_id', team.id)
        .maybeSingle();
      if (
        data &&
        data.athlete_id === athleteId &&
        JSON.stringify(sessionSchema.parse(data.document)) ===
          JSON.stringify(sessionSchema.parse(body))
      )
        return json({ ok: true });
      throw new HttpError(409, 'Questo risultato è già salvato e non può essere sovrascritto.');
    }
    databaseError(error);
    return json({ ok: true });
  });
}
