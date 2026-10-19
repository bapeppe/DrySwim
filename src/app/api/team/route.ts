import { z } from 'zod';
import { endpoint, json, payload, context, databaseError, HttpError } from '@/lib/server/http';
import { serverDatabase, databaseConfig } from '@/lib/server/supabase';
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), name: z.string().trim().min(2).max(80) }),
  z.object({
    action: z.literal('join'),
    token: z.string().regex(/^[a-f0-9]{64}$/, 'Il codice di invito non è valido.'),
  }),
  z.object({
    action: z.literal('invite'),
    athleteId: z.string().uuid().nullable(),
    role: z.enum(['coach', 'athlete']),
  }),
]);
export async function POST(request: Request) {
  return endpoint(async () => {
    const body = input.parse(await payload(request));
    if (body.action === 'invite') {
      const { db } = await context(true);
      const { data, error } = await db.rpc('create_team_invite', {
        p_athlete: body.athleteId,
        p_role: body.role,
      });
      databaseError(error);
      return json({ token: data });
    }
    if (!databaseConfig()) throw new HttpError(503, 'Il database non è configurato.');
    const db = await serverDatabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new HttpError(401, 'Accedi al tuo account.');
    const { data, error } =
      body.action === 'create'
        ? await db.rpc('create_team', { p_name: body.name })
        : await db.rpc('accept_team_invite', { p_token: body.token });
    databaseError(error);
    return json({ teamId: data });
  });
}
