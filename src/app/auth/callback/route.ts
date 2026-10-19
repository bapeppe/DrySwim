import { NextResponse } from 'next/server';
import { serverDatabase, databaseConfig } from '@/lib/server/supabase';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get('code');
  let next = '/account';
  const proposed = url.searchParams.get('next');
  if (proposed) {
    try {
      const parsed = new URL(proposed, url.origin);
      if (parsed.origin === url.origin && parsed.pathname === '/account')
        next = parsed.pathname + parsed.search;
    } catch {}
  }
  if (code && databaseConfig()) {
    const db = await serverDatabase();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/account?errore=conferma', url.origin));
}
