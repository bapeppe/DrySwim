import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readDevice, saveDevice, clearDevice, readPreferences } from '@/lib/device';
import { startWorkout } from '@/lib/player';
import { defaultWorkouts } from './fixtures/workouts';
beforeEach(() => {
  const items = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  });
});
describe('Archivio dispositivo separato per account', () => {
  it('mantiene la sessione per il suo account e non registra allievi o tempi', () => {
    const active = startWorkout(defaultWorkouts[0], 0, 'session');
    expect(saveDevice('user-a', ['squat'], active)).toBeUndefined();
    expect(readDevice('user-a').active).toEqual(active);
    expect(readDevice('user-b')).toEqual({ favorites: [], active: null });
    clearDevice('user-a');
    expect(readDevice('user-a').active).toBeNull();
  });
  it('conserva il vecchio archivio senza caricarne programmi o ruoli come autorizzazione', () => {
    const legacy = JSON.stringify({
      preferences: { theme: 'dark', role: 'coach', sound: false, level: 'beginner' },
      workouts: defaultWorkouts,
    });
    localStorage.setItem('swimdryland:v1', legacy);
    expect(readPreferences().theme).toBe('dark');
    expect(readDevice('user-a').active).toBeNull();
    expect(localStorage.getItem('swimdryland:v1')).toBe(legacy);
  });
  it('gestisce dati non validi senza sovrascriverli', () => {
    localStorage.setItem('swimdryland:device:user-a:v2', 'invalid');
    expect(readDevice('user-a').error).toBeTruthy();
    expect(localStorage.getItem('swimdryland:device:user-a:v2')).toBe('invalid');
  });
});
