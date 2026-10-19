import { z } from 'zod';
import { endpoint, json, payload, HttpError } from '@/lib/server/http';
import { databaseConfig, serverDatabase } from '@/lib/server/supabase';
const input = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('signin'),
    email: z.string().email(),
    password: z.string().min(1).max(128),
  }),
  z.object({
    action: z.literal('signup'),
    email: z.string().email(),
    password: z.string().min(10, 'Usa una password di almeno 10 caratteri.').max(128),
    invite: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  }),
  z.object({ action: z.literal('signout') }),
  z.object({ action: z.literal('reset'), email: z.string().email() }),
  z.object({ action: z.literal('password'), password: z.string().min(10).max(128) }),
]);
export async function POST(request: Request) {
  return endpoint(async () => {
    if (!databaseConfig())
      throw new HttpError(503, 'Il database della squadra non è ancora configurato.');
    const body = input.parse(await payload(request));
    const db = await serverDatabase();
    const origin = new URL(request.url).origin;
    if (body.action === 'signin') {
      const result = await db.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (result.error)
        throw new HttpError(
          400,
          'Email o password non corrette, oppure email non ancora confermata.',
        );
      return json({ ok: true });
    }
    if (body.action === 'signup') {
      const next = body.invite ? `/account?invito=${body.invite}` : '/account';
      const result = await db.auth.signUp({
        email: body.email,
        password: body.password,
        options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (result.error)
        throw new HttpError(400, 'Registrazione non riuscita. Verifica i dati o riprova tra poco.');
      return json({ ok: true, confirmationRequired: !result.data.session });
    }
    if (body.action === 'signout') {
      const result = await db.auth.signOut({ scope: 'local' });
      if (result.error) throw new HttpError(503, 'Non riusciamo a chiudere la sessione. Riprova.');
      return json({ ok: true });
    }
    if (body.action === 'reset') {
      const result = await db.auth.resetPasswordForEmail(body.email, {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/account?reset=1')}`,
      });
      if (result.error)
        throw new HttpError(429, 'Attendi qualche minuto prima di richiedere un’altra email.');
      return json({ ok: true });
    }
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new HttpError(401, 'Il collegamento è scaduto. Richiedi una nuova email.');
    const result = await db.auth.updateUser({ password: body.password });
    if (result.error)
      throw new HttpError(
        400,
        'Non riusciamo ad aggiornare la password. Usa una password diversa o richiedi un nuovo collegamento.',
      );
    return json({ ok: true });
  });
}
