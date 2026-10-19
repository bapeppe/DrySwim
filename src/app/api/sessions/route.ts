import { z } from 'zod';
import { sessionSchema } from '@/lib/models';
import { endpoint, json, payload, context, databaseError, HttpError } from '@/lib/server/http';
export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, user, member, athlete } = await context();
    const body = sessionSchema
      .extend({ id: z.string().uuid(), workoutId: z.string().uuid() })
      .parse(await payload(request));
    const { error } = await db.from('workout_sessions').insert({
      id: body.id,
      team_id: member.team_id,
      user_id: user.id,
      athlete_id: athlete?.id || null,
      workout_id: body.workoutId,
      document: body,
    });
    if (error?.code === '23505') {
      const { data } = await db
        .from('workout_sessions')
        .select('document')
        .eq('id', body.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (
        data &&
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
