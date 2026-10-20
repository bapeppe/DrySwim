'use client';

import { create } from 'zustand';
import { exercises as baseExercises } from '@/data/exercises';
import { type Exercise, type UserPreferences, type WorkoutSession } from '@/lib/models';
import { type ActiveWorkout } from '@/lib/player';
import {
  workspaceSchema,
  type Workspace,
  type TeamWorkout,
  type Athlete,
  type SwimResult,
} from '@/lib/team-models';
import { type CustomExerciseInput } from '@/lib/custom-exercises';
import { api } from '@/lib/client-api';
import {
  readPreferences,
  savePreferences,
  defaultPreferences,
  readDevice,
  saveDevice,
} from '@/lib/device';

type Store = Workspace & {
  hydrated: boolean;
  syncing: boolean;
  connectionError?: string;
  storageError?: string;
  preferences: UserPreferences;
  favorites: string[];
  active: ActiveWorkout | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  setPreferences: (p: Partial<UserPreferences>) => void;
  toggleFavorite: (id: string) => void;
  setActive: (a: ActiveWorkout | null) => void;
  saveWorkout: (w: TeamWorkout) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  saveSession: (s: WorkoutSession, athleteId?: string | null) => Promise<void>;
  saveExercise: (e: CustomExerciseInput) => Promise<Exercise>;
  saveAthlete: (a: { id: string; displayName: string; archived: boolean }) => Promise<void>;
  saveResult: (r: Omit<SwimResult, 'recordedAt'>) => Promise<void>;
  deleteResult: (id: string) => Promise<void>;
};
const initial: Workspace = {
  configured: false,
  status: 'setup-required',
  team: null,
  exercises: baseExercises,
  workouts: [],
  athletes: [],
  results: [],
  sessions: [],
};
export const useStore = create<Store>((set, get) => {
  function persistDevice() {
    const s = get();
    set({ storageError: saveDevice('shared', s.favorites, s.active) });
  }
  async function refresh() {
    set({ syncing: true });
    try {
      const data = workspaceSchema.parse(await api<Workspace>('workspace'));
      set({
        ...data,
        connectionError: undefined,
      });
    } catch (error) {
      set({
        connectionError:
          error instanceof Error ? error.message : 'Non riusciamo a caricare i dati. Riprova.',
      });
    } finally {
      set({ syncing: false, hydrated: true });
    }
  }
  async function mutate(path: string, body: unknown, method = 'POST') {
    const result = await api(path, body, method);
    await refresh();
    return result;
  }
  return {
    ...initial,
    hydrated: false,
    syncing: false,
    preferences: defaultPreferences,
    favorites: [],
    active: null,
    hydrate: async () => {
      const device = readDevice('shared');
      set({
        preferences: readPreferences(),
        favorites: device.favorites,
        active: device.active,
        storageError: device.error,
      });
      await refresh();
    },
    refresh,
    setPreferences: (p) => {
      const prefs = { ...get().preferences, ...p, role: 'athlete' as const };
      set({ preferences: prefs, storageError: savePreferences(prefs) });
    },
    toggleFavorite: (id) => {
      set({
        favorites: get().favorites.includes(id)
          ? get().favorites.filter((f) => f !== id)
          : [...get().favorites, id],
      });
      persistDevice();
    },
    setActive: (active) => {
      set({ active });
      persistDevice();
    },
    saveWorkout: async (workout) => {
      await mutate('workouts', workout);
    },
    deleteWorkout: async (id) => {
      await mutate('workouts', { id }, 'DELETE');
    },
    saveSession: async (session, athleteId = null) => {
      await api('sessions', { ...session, athleteId });
      set({ active: null });
      persistDevice();
      await refresh();
    },
    saveExercise: async (input) => {
      const data = await mutate('exercises', input);
      return data.exercise as Exercise;
    },
    saveAthlete: async (athlete) => {
      await mutate('athletes', athlete);
    },
    saveResult: async (result) => {
      await mutate('results', result);
    },
    deleteResult: async (id) => {
      await mutate('results', { id }, 'DELETE');
    },
  };
});
// I dati nominativi degli allievi e i tempi restano in memoria, mai in LocalStorage.
export type { TeamWorkout, Athlete, SwimResult };
