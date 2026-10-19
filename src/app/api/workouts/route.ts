import { z } from 'zod';
import { teamWorkoutSchema } from '@/lib/team-models';
import { endpoint, json, payload, context, databaseError } from '@/lib/server/http';
export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, user, member } = await context(true);
    const body = teamWorkoutSchema.extend({ id: z.string().uuid() }).parse(await payload(request));
    const document = { ...body, custom: true, createdBy: user.id };
    const { error } = await db.from('workouts').upsert({
      id: body.id,
      team_id: member.team_id,
      document,
      published: body.published,
      created_by: user.id,
    });
    databaseError(error);
    return json({ ok: true });
  });
}
export async function DELETE(request: Request) {
  return endpoint(async () => {
    const { db, member } = await context(true);
    const body = z.object({ id: z.string().uuid() }).parse(await payload(request));
    const { error } = await db
      .from('workouts')
      .delete()
      .eq('id', body.id)
      .eq('team_id', member.team_id);
    databaseError(error);
    return json({ ok: true });
  });
}
