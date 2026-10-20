import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/profiles/route';
const { sharedContext } = vi.hoisted(() => ({ sharedContext: vi.fn() }));
vi.mock('@/lib/server/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/http')>()),
  context: sharedContext,
}));
const id = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
type Row = { id: string; display_name: string; archived: boolean };
let rows: Row[];
let insert: ReturnType<typeof vi.fn>;
beforeEach(() => {
  sharedContext.mockReset();
  rows = [];
  insert = vi.fn(async (row: { id: string; display_name: string }) => {
    rows.push({ ...row, archived: false });
    return { error: null };
  });
  sharedContext.mockResolvedValue({
    team: { id, name: 'DrySwim' },
    db: {
      from: () => {
        const filters: Record<string, string> = {};
        const query = {
          select: () => query,
          eq: (key: string, value: string) => {
            filters[key] = value;
            return query;
          },
          maybeSingle: async () => ({
            data: rows.find((row) => row.id === filters.id) || null,
            error: null,
          }),
          then: (resolve: (reply: { data: Row[]; error: null }) => unknown) =>
            Promise.resolve({ data: rows, error: null }).then(resolve),
          insert,
        };
        return query;
      },
    },
  });
});
const request = (body = {}) =>
  new Request('https://app.test/api/profiles', {
    method: 'POST',
    headers: { origin: 'https://app.test' },
    body: JSON.stringify({ id, firstName: ' Luca ', lastName: ' Rossi ', ...body }),
  });
describe('Creazione profili nello stesso registro allievi', () => {
  it('crea il nome nel registro e un retry non crea duplicati', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      kind: 'selected',
      athlete: { id, displayName: 'Luca Rossi' },
    });
    expect((await POST(request())).status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('propone un nome già presente senza modificarlo o attribuirlo automaticamente', async () => {
    rows.push({ id: other, display_name: 'Luca Rossi', archived: false });
    const response = await POST(request({ firstName: 'luca', lastName: 'ROSSI' }));
    expect(await response.json()).toMatchObject({ kind: 'existing', athletes: [{ id: other }] });
    expect(insert).not.toHaveBeenCalled();
  });
  it('non riattiva nomi archiviati e non sovrascrive un ID appartenente a un altro nome', async () => {
    rows.push({ id: other, display_name: 'Luca Rossi', archived: true });
    expect((await POST(request())).status).toBe(409);
    rows.push({ id, display_name: 'Anna Bianchi', archived: false });
    expect((await POST(request())).status).toBe(409);
    expect(insert).not.toHaveBeenCalled();
  });
  it('riconosce un inserimento riuscito quando due retry arrivano insieme', async () => {
    insert.mockImplementationOnce(async () => {
      rows.push({ id, display_name: 'Luca Rossi', archived: false });
      return { error: { code: '23505' } };
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: 'selected', athlete: { id } });
  });
  it('rifiuta nomi incompleti e richieste di un’altra origine prima del database', async () => {
    expect((await POST(request({ lastName: '' }))).status).toBe(400);
    const foreign = request();
    foreign.headers.set('origin', 'https://other.test');
    expect((await POST(foreign)).status).toBe(403);
    expect(sharedContext).not.toHaveBeenCalled();
  });
});
