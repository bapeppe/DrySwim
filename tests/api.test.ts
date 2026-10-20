import { describe, it, expect, vi } from 'vitest';
import { payload, endpoint, HttpError } from '@/lib/server/http';
import { POST as workoutPost } from '@/app/api/workouts/route';
import { GET as workspaceGet } from '@/app/api/workspace/route';
import { POST as authPost } from '@/app/api/auth/route';
vi.mock('@/lib/server/supabase', () => ({
  databaseConfig: () => null,
  serverDatabase: vi.fn(() => {
    throw new Error('Must not access an unconfigured database');
  }),
}));
describe('API e fallback configurazione', () => {
  it('non propone programmi o salvataggi fittizi senza un database', async () => {
    const response = await workspaceGet();
    const data = await response.json();
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(data.configured).toBe(false);
    expect(data.workouts).toEqual([]);
    expect(data.athletes).toEqual([]);
    expect(data.exercises).toHaveLength(52);
  });
  it('rifiuta salvataggi quando il database non è configurato', async () => {
    for (const call of [workoutPost]) {
      const response = await call(
        new Request('https://app.test/api/test', {
          method: 'POST',
          body: JSON.stringify({ role: 'coach' }),
        }),
      );
      expect(response.status).toBe(503);
      expect(await response.json()).not.toHaveProperty('ok', true);
    }
  });
  it('ritira il vecchio endpoint login senza creare account', async () => {
    expect(authPost().status).toBe(410);
  });
  it('blocca invii da un’altra origine e JSON non valido', async () => {
    await expect(
      payload(
        new Request('https://app.test/api/test', {
          method: 'POST',
          headers: { Origin: 'https://other.test' },
          body: '{}',
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      payload(new Request('https://app.test/api/test', { method: 'POST', body: 'not-json' })),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('non espone errori interni o credenziali', async () => {
    const error = await endpoint(async () => {
      throw new Error('secret-token-db-host');
    });
    expect(error.status).toBe(500);
    expect(await error.text()).not.toContain('secret-token');
    const denied = await endpoint(async () => {
      throw new HttpError(403, 'Accesso negato');
    });
    expect(denied.status).toBe(403);
  });
});
