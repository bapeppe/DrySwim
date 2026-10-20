import { z } from 'zod';
import { resultInputSchema } from '@/lib/team-models';
import { endpoint, json, payload, context, databaseError } from '@/lib/server/http';
export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, team } = await context();
    const body = resultInputSchema.parse(await payload(request));
    const { error } = await db.from('swim_results').upsert({
      id: body.id,
      team_id: team.id,
      athlete_id: body.athleteId,
      distance: body.distance,
      stroke: body.stroke,
      pool_length: body.poolLength,
      date: body.date,
      centiseconds: body.centiseconds,
      kind: body.kind,
      note: body.note,
      recorded_by: null,
    });
    databaseError(error);
    return json({ ok: true });
  });
}
export async function DELETE(request: Request) {
  return endpoint(async () => {
    const { db, team } = await context();
    const { id } = z.object({ id: z.string().uuid() }).parse(await payload(request));
    const { error } = await db.from('swim_results').delete().eq('id', id).eq('team_id', team.id);
    databaseError(error);
    return json({ ok: true });
  });
}
