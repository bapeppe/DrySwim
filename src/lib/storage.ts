import { z } from 'zod';
import { preferencesSchema, sessionSchema, workoutSchema } from './models';
import { activeSchema } from './player';
import { exerciseById } from '@/data/exercises';
export const STORAGE_KEY = 'swimdryland:v1';
export const snapshotSchema = z.object({
  version: z.literal(1),
  preferences: preferencesSchema,
  favorites: z.array(z.string()),
  workouts: z.array(
    workoutSchema.refine(
      (w) => w.exercises.every((e) => !!exerciseById[e.exerciseId]),
      'Il programma contiene un esercizio non disponibile.',
    ),
  ),
  sessions: z.array(sessionSchema),
  active: activeSchema.nullable(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export const initialSnapshot: Snapshot = {
  version: 1,
  preferences: { theme: 'light', role: 'athlete', sound: false, level: 'beginner' },
  favorites: [],
  workouts: [],
  sessions: [],
  active: null,
};
export function readSnapshot(storage: Pick<Storage, 'getItem'>): {
  data: Snapshot;
  error?: string;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { data: initialSnapshot };
    return { data: snapshotSchema.parse(JSON.parse(raw)) };
  } catch {
    return {
      data: initialSnapshot,
      error:
        'I dati locali non sono leggibili. Il file originale è stato conservato: esportalo prima di ripristinare il salvataggio.',
    };
  }
}
export function writeSnapshot(
  storage: Pick<Storage, 'setItem'>,
  data: Snapshot,
): string | undefined {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshotSchema.parse(data)));
  } catch {
    return 'Impossibile salvare sul dispositivo. Lo spazio potrebbe essere esaurito o il salvataggio disabilitato. Mantieni aperta l’app ed esporta i dati.';
  }
}
