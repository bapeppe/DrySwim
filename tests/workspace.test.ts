import { describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/workspace/route';
import { exercises } from '@/data/exercises';
const { database } = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock('@/lib/server/supabase', () => ({
  databaseConfig: () => ({ url: 'https://database.test', key: 'publishable' }),
  serverDatabase: database,
}));
const id = '10000000-0000-4000-8000-000000000001';
function sharedDatabase(
  team: { id: string; name: string } | null,
  error: { code: string } | null = null,
) {
  const queries: string[] = [];
  // Deliberately no auth API: reading a workspace must never need an account.
  database.mockResolvedValue({
    from: (table: string) => {
      queries.push(table);
      const reply =
        table === 'teams'
          ? { data: team, error }
          : {
              data: table === 'exercises' ? exercises.map((document) => ({ document })) : [],
              error: null,
            };
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        maybeSingle: () => query,
        then: (resolve: (value: typeof reply) => unknown) => Promise.resolve(reply).then(resolve),
      };
      return query;
    },
  });
  return queries;
}
describe('Workspace condiviso senza autenticazione', () => {
  it('legge subito catalogo e squadra senza utenti, membership o account', async () => {
    const queries = sharedDatabase({ id, name: 'DrySwim' });
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.team).toEqual({ id, name: 'DrySwim' });
    expect(body.status).toBe('ready');
    expect(body.exercises).toHaveLength(52);
    expect(body).not.toHaveProperty('user');
    expect(body).not.toHaveProperty('member');
    expect(queries).not.toContain('memberships');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('non simula una squadra se manca la migrazione condivisa', async () => {
    sharedDatabase(null);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Lo spazio condiviso della squadra deve essere configurato.',
    });
  });
  it('segnala gli errori del database senza richiedere login', async () => {
    sharedDatabase(null, { code: '08006' });
    expect((await GET()).status).toBe(503);
  });
});
