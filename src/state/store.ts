'use client';

import { create } from 'zustand';
import { exercises as baseExercises } from '@/data/exercises';
import { type Exercise, type UserPreferences, type WorkoutSession } from '@/lib/models';
import { type ActiveWorkout, toggleRunning } from '@/lib/player';
import { currentProfile, type NewProfile, type ProfileReply } from '@/lib/profiles';
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
  readProfile,
  saveProfile,
} from '@/lib/device';

type Store = Workspace & {
  hydrated: boolean;
  syncing: boolean;
  connectionError?: string;
  storageError?: string;
  preferences: UserPreferences;
  favorites: string[];
  active: ActiveWorkout | null;
  selectedAthleteId: string | null;
  choosingProfile: boolean;
  selectProfile: (id: string) => void;
  startProfileChoice: () => void;
  cancelProfileChoice: () => void;
  registerProfile: (input: NewProfile) => Promise<ProfileReply>;
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
    set({ storageError: saveDevice(s.selectedAthleteId || 'shared', s.favorites, s.active) });
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
    selectedAthleteId: null,
    choosingProfile: false,
    selectProfile: (id) => {
      const s = get();
      if (!currentProfile(s.athletes, id))
        throw new Error('Questo profilo non è più disponibile. Scegline un altro.');
      if (s.active) {
        const active = s.active.running ? toggleRunning(s.active, Date.now()) : s.active;
        const previousError = saveDevice(s.selectedAthleteId || 'shared', s.favorites, active);
        if (previousError)
          throw new Error(
            'Non riusciamo a conservare la sessione in corso. Torna al profilo attuale e salva o scarta la sessione prima di cambiare nome.',
          );
      }
      const device = readDevice(id);
      const error = saveProfile(id);
      set({
        selectedAthleteId: id,
        choosingProfile: false,
        favorites: device.favorites,
        active: device.active,
        storageError: error || device.error,
      });
    },
    startProfileChoice: () => {
      const s = get();
      if (s.active?.running) {
        set({ active: toggleRunning(s.active, Date.now()) });
        persistDevice();
      }
      set({ choosingProfile: true });
    },
    cancelProfileChoice: () => set({ choosingProfile: false }),
    registerProfile: async (input) => {
      const reply = await api<ProfileReply>('profiles', input);
      const profiles = reply.kind === 'selected' ? [reply.athlete] : reply.athletes;
      set((s) => ({
        athletes: [...s.athletes.filter((a) => !profiles.some((p) => p.id === a.id)), ...profiles],
      }));
      if (reply.kind === 'selected') get().selectProfile(reply.athlete.id);
      void refresh();
      return reply;
    },
    hydrate: async () => {
      const selectedAthleteId = readProfile();
      const device = selectedAthleteId ? readDevice(selectedAthleteId) : readDevice('shared');
      set({
        selectedAthleteId,
        preferences: readPreferences(),
        favorites: device.favorites,
        active: selectedAthleteId ? device.active : null,
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
    saveSession: async (session, athleteId = get().selectedAthleteId) => {
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
