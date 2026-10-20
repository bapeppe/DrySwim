import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDatabase, databaseConfig } from './supabase';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' },
  });
}
export async function payload(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    throw new HttpError(403, 'Richiesta non consentita.');
  const text = await request.text();
  if (text.length > 524288) throw new HttpError(413, 'I dati inviati sono troppo grandi.');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'I dati inviati non sono validi.');
  }
}
export function databaseError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '42501') throw new HttpError(403, 'Non hai i permessi per questa operazione.');
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === '42883')
    throw new HttpError(
      503,
      'La configurazione del database deve essere completata dall’amministratore.',
    );
  if (error.code === '23503' || error.code === 'P0001')
    throw new HttpError(
      400,
      'L’operazione non è disponibile. Controlla l’allievo e gli esercizi.',
    );
  if (error.code === '23505')
    throw new HttpError(409, 'Questi dati sono già presenti. Aggiorna la pagina e riprova.');
  throw new HttpError(503, 'Non riusciamo a salvare i dati. Riprova tra poco.');
}
export async function context() {
  if (!databaseConfig())
    throw new HttpError(503, 'Il database della squadra non è ancora configurato.');
  const db = await serverDatabase();
  const { data: team, error } = await db
    .from('teams')
    .select('id,name')
    .eq('shared_access', true)
    .maybeSingle();
  databaseError(error);
  if (!team) throw new HttpError(503, 'Lo spazio condiviso della squadra deve essere configurato.');
  return { db, team };
}
export async function endpoint(work: () => Promise<Response>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError)
      return json({ error: error.issues.map((i) => i.message).join(' · ') }, 400);
    return json({ error: 'Si è verificato un problema. Riprova tra poco.' }, 500);
  }
}
