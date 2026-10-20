import { athleteInputSchema } from '@/lib/team-models';
import { endpoint, json, payload, context, databaseError } from '@/lib/server/http';
export async function POST(request: Request) {
  return endpoint(async () => {
    const { db, team } = await context();
    const body = athleteInputSchema.parse(await payload(request));
    const { data: existing, error: readError } = await db
      .from('athletes')
      .select('id')
      .eq('id', body.id)
      .eq('team_id', team.id)
      .maybeSingle();
    databaseError(readError);
    const result = existing
      ? await db
          .from('athletes')
          .update({ display_name: body.displayName, archived: body.archived })
          .eq('id', body.id)
          .eq('team_id', team.id)
      : await db.from('athletes').insert({
          id: body.id,
          team_id: team.id,
          display_name: body.displayName,
          archived: body.archived,
        });
    databaseError(result.error);
    return json({ ok: true });
  });
}
