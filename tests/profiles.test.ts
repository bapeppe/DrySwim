import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newProfileSchema, nameKey, isAssignedTo } from '@/lib/profiles';
import { readProfile, saveProfile, readDevice, saveDevice } from '@/lib/device';
import { useStore } from '@/state/store';
import { startWorkout, toggleRunning } from '@/lib/player';
import { defaultWorkouts } from './fixtures/workouts';
const first = '10000000-0000-4000-8000-000000000001';
const second = '10000000-0000-4000-8000-000000000002';
let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  useStore.setState({
    selectedAthleteId: null,
    choosingProfile: false,
    favorites: [],
    active: null,
    athletes: [first, second].map((id, i) => ({
      id,
      teamId: first,
      displayName: i ? 'Anna Bianchi' : 'Luca Rossi',
      archived: false,
    })),
  });
});
describe('Nomi e personalizzazione senza account', () => {
  it('gestisce nomi composti, accenti e apostrofi senza perdere la forma originale', () => {
    const value = newProfileSchema.parse({
      id: first,
      firstName: '  Maria   José ',
      lastName: ' D’Angelo ',
    });
    expect(value.firstName).toBe('Maria José');
    expect(value.lastName).toBe('D’Angelo');
    expect(nameKey(' LUCa   Rossi ')).toBe(nameKey('Luca Rossi'));
  });
  it.each(['', '   ', '123', '<script>', 'a'.repeat(41)])('rifiuta il nome %s', (firstName) => {
    expect(newProfileSchema.safeParse({ id: first, firstName, lastName: 'Rossi' }).success).toBe(
      false,
    );
  });
  it('memorizza solo un ID e gestisce dati locali mancanti o corrotti', () => {
    expect(readProfile()).toBeNull();
    expect(saveProfile(first)).toBeUndefined();
    expect(readProfile()).toBe(first);
    expect(JSON.parse(storage.get('swimdryland:profile:v1')!)).toEqual({ athleteId: first });
    storage.set('swimdryland:profile:v1', '{invalid');
    expect(readProfile()).toBeNull();
  });
  it('separa preferiti e sessioni e mette in pausa il profilo precedente al cambio', () => {
    useStore.getState().selectProfile(first);
    const now = Date.now();
    const active = toggleRunning(startWorkout(defaultWorkouts[0], now, 'in-progress'), now);
    useStore.getState().setActive(active);
    useStore.getState().toggleFavorite('squat');
    useStore.getState().startProfileChoice();
    expect(useStore.getState().active?.running).toBe(false);
    useStore.getState().selectProfile(second);
    expect(useStore.getState().favorites).toEqual([]);
    expect(useStore.getState().active).toBeNull();
    useStore.getState().selectProfile(first);
    expect(useStore.getState().favorites).toEqual(['squat']);
    expect(useStore.getState().active?.id).toBe('in-progress');
    expect(readDevice(first).active?.running).toBe(false);
    expect([...storage.values()].join('')).not.toContain('Luca');
  });
  it('non attribuisce al nuovo profilo la vecchia sessione condivisa', () => {
    saveDevice('shared', ['squat'], startWorkout(defaultWorkouts[0], Date.now(), 'legacy'));
    useStore.getState().selectProfile(first);
    expect(useStore.getState().active).toBeNull();
    expect(readDevice('shared').active?.id).toBe('legacy');
  });
  it('non seleziona profili archiviati e continua in memoria se lo storage è bloccato', () => {
    useStore.setState({
      athletes: [{ id: first, teamId: first, displayName: 'Luca Rossi', archived: true }],
    });
    expect(() => useStore.getState().selectProfile(first)).toThrow('non è più disponibile');
    useStore.setState({
      athletes: [{ id: first, teamId: first, displayName: 'Luca Rossi', archived: false }],
    });
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
    });
    useStore.getState().selectProfile(first);
    expect(useStore.getState().selectedAthleteId).toBe(first);
    expect(useStore.getState().storageError).toContain('non riesce a ricordare');
  });
  it('propone programmi della squadra o assegnati al profilo selezionato', () => {
    const workout = { ...defaultWorkouts[0], published: true };
    expect(isAssignedTo(workout, first)).toBe(true);
    expect(isAssignedTo({ ...workout, targetAthleteIds: [first] }, first)).toBe(true);
    expect(isAssignedTo({ ...workout, targetAthleteIds: [second] }, first)).toBe(false);
  });
});
