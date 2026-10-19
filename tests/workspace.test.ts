import { describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/workspace/route';

const { database } = vi.hoisted(() => ({ database: vi.fn() }));
vi.mock('@/lib/server/supabase', () => ({
  databaseConfig: () => ({ url: 'https://database.test', key: 'publishable' }),
  serverDatabase: database,
}));

function archivedWorkspace(studentError: { code: string } | null = null) {
  database.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'athlete-account' } }, error: null }) },
    from: (table: string) => {
      const reply =
        table === 'memberships'
          ? { data: { team_id: 'team-a', role: 'athlete' }, error: null }
          : table === 'teams'
            ? { data: null, error: { code: 'PGRST116' } }
            : { data: [], error: table === 'athletes' ? studentError : null };
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        single: () => query,
        maybeSingle: () => query,
        then: (resolve: (value: typeof reply) => unknown) => Promise.resolve(reply).then(resolve),
      };
      return query;
    },
  });
}

describe('Accesso allievi archiviati', () => {
  it('restituisce 403 anche quando RLS nasconde la squadra', async () => {
    archivedWorkspace();
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Il tuo accesso non è attivo. Contatta l’allenatore.',
    });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('mantiene un errore di database se non può verificare l’allievo', async () => {
    archivedWorkspace({ code: '08006' });
    const response = await GET();
    expect(response.status).toBe(503);
  });
});
