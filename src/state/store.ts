'use client';
import { create } from 'zustand';
import { initialSnapshot, readSnapshot, writeSnapshot, type Snapshot } from '@/lib/storage';
import { type UserPreferences, type Workout, type WorkoutSession } from '@/lib/models';
import { type ActiveWorkout } from '@/lib/player';
type Store = Snapshot & {
  hydrated: boolean;
  storageError?: string;
  blocked: boolean;
  hydrate: () => void;
  setPreferences: (p: Partial<UserPreferences>) => void;
  toggleFavorite: (id: string) => void;
  saveWorkout: (w: Workout) => void;
  deleteWorkout: (id: string) => void;
  setActive: (a: ActiveWorkout | null) => void;
  saveSession: (s: WorkoutSession) => void;
  resetStorage: () => void;
};
export const useStore = create<Store>((set, get) => {
  function commit(patch: Partial<Snapshot>) {
    set(patch);
    const s = get();
    if (s.blocked) return;
    const data: Snapshot = {
      version: 1,
      preferences: s.preferences,
      favorites: s.favorites,
      workouts: s.workouts,
      sessions: s.sessions,
      active: s.active,
    };
    try {
      set({ storageError: writeSnapshot(localStorage, data) });
    } catch {
      set({
        storageError:
          'Il browser non consente il salvataggio locale. Mantieni aperta l’app ed esporta i dati.',
      });
    }
  }
  return {
    ...initialSnapshot,
    hydrated: false,
    blocked: false,
    hydrate: () => {
      try {
        const result = readSnapshot(localStorage);
        set({
          ...result.data,
          hydrated: true,
          storageError: result.error,
          blocked: !!result.error,
        });
      } catch {
        set({
          hydrated: true,
          storageError:
            'Il browser non consente l’accesso ai dati locali. I progressi non saranno conservati.',
        });
      }
    },
    setPreferences: (p) => commit({ preferences: { ...get().preferences, ...p } }),
    toggleFavorite: (id) =>
      commit({
        favorites: get().favorites.includes(id)
          ? get().favorites.filter((f) => f !== id)
          : [...get().favorites, id],
      }),
    saveWorkout: (w) =>
      commit({ workouts: [...get().workouts.filter((item) => item.id !== w.id), w] }),
    deleteWorkout: (id) => commit({ workouts: get().workouts.filter((w) => w.id !== id) }),
    setActive: (active) => commit({ active }),
    saveSession: (session) =>
      commit({
        sessions: [...get().sessions.filter((s) => s.id !== session.id), session],
        active: null,
      }),
    resetStorage: () => {
      set({ blocked: false });
      commit({});
    },
  };
});
