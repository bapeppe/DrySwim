import { z } from 'zod';
import { preferencesSchema, type UserPreferences } from './models';
import { activeSchema, type ActiveWorkout } from './player';
const PREFERENCES = 'swimdryland:preferences:v2';
const deviceSchema = z.object({ favorites: z.array(z.string()), active: activeSchema.nullable() });
export const defaultPreferences: UserPreferences = {
  theme: 'light',
  role: 'athlete',
  sound: false,
  level: 'beginner',
};
export function readPreferences() {
  try {
    const current = localStorage.getItem(PREFERENCES);
    const legacy = localStorage.getItem('swimdryland:v1');
    return preferencesSchema.parse(
      current ? JSON.parse(current) : legacy ? JSON.parse(legacy).preferences : defaultPreferences,
    );
  } catch {
    return defaultPreferences;
  }
}
export function savePreferences(value: UserPreferences) {
  try {
    localStorage.setItem(PREFERENCES, JSON.stringify(value));
    return undefined;
  } catch {
    return 'Il browser non consente di salvare le preferenze su questo dispositivo.';
  }
}
export function readDevice(userId: string): {
  favorites: string[];
  active: ActiveWorkout | null;
  error?: string;
} {
  try {
    const raw = localStorage.getItem(`swimdryland:device:${userId}:v2`);
    return raw ? deviceSchema.parse(JSON.parse(raw)) : { favorites: [], active: null };
  } catch {
    return {
      favorites: [],
      active: null,
      error:
        'Non riusciamo a riprendere i dati del dispositivo. I risultati già salvati nel database sono conservati.',
    };
  }
}
export function saveDevice(userId: string, favorites: string[], active: ActiveWorkout | null) {
  try {
    localStorage.setItem(`swimdryland:device:${userId}:v2`, JSON.stringify({ favorites, active }));
    return undefined;
  } catch {
    return 'Non riusciamo a conservare la sessione in corso sul dispositivo. Non chiudere l’app prima di salvare il risultato.';
  }
}
export function clearDevice(userId: string) {
  try {
    localStorage.removeItem(`swimdryland:device:${userId}:v2`);
  } catch {}
}
