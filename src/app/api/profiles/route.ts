import { newProfileSchema, nameKey } from '@/lib/profiles';
import { athleteSchema } from '@/lib/team-models';
import { context, databaseError, endpoint, HttpError, json, payload } from '@/lib/server/http';

export async function POST(request: Request) {
  return endpoint(async () => {
    const body = newProfileSchema.parse(await payload(request));
    const { db, team } = await context();
    const displayName = `${body.firstName} ${body.lastName}`;
    const { data, error } = await db
      .from('athletes')
      .select('id,display_name,archived')
      .eq('team_id', team.id);
    databaseError(error);
    const profiles = (data || []).map((row) =>
      athleteSchema.parse({
        id: row.id,
        teamId: team.id,
        displayName: row.display_name,
        archived: row.archived,
      }),
    );
    const sameId = profiles.find((profile) => profile.id === body.id);
    if (sameId && (sameId.archived || nameKey(sameId.displayName) !== nameKey(displayName)))
      throw new HttpError(409, 'Questo profilo non è disponibile. Aggiorna la pagina e riprova.');
    if (sameId) return json({ kind: 'selected', athlete: sameId });
    const matches = profiles.filter(
      (profile) => nameKey(profile.displayName) === nameKey(displayName),
    );
    if (matches.length) {
      const active = matches.filter((profile) => !profile.archived);
      if (!active.length)
        throw new HttpError(
          409,
          'Questo nome è già nel registro ma è archiviato. Chiedi all’allenatore di riattivarlo.',
        );
      return json({ kind: 'existing', athletes: active });
    }
    const { error: insertError } = await db.from('athletes').insert({
      id: body.id,
      team_id: team.id,
      display_name: displayName,
    });
    // Due tentativi dello stesso dispositivo possono arrivare insieme dopo un retry.
    if (insertError?.code === '23505') {
      const { data: saved, error: readError } = await db
        .from('athletes')
        .select('display_name,archived')
        .eq('id', body.id)
        .eq('team_id', team.id)
        .maybeSingle();
      databaseError(readError);
      if (!saved || saved.archived || nameKey(saved.display_name) !== nameKey(displayName))
        throw new HttpError(409, 'Il profilo è cambiato. Aggiorna la pagina e riprova.');
    } else databaseError(insertError);
    return json({
      kind: 'selected',
      athlete: { id: body.id, teamId: team.id, displayName, archived: false },
    });
  });
}
