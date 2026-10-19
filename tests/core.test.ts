import { describe, expect, it } from 'vitest';
import {
  exercises,
  exerciseById,
  initialCatalogEntries,
  catalogByCategory,
} from '@/data/exercises';
import { defaultWorkouts } from './fixtures/workouts';
import { exerciseSchema, workoutSchema, sessionSchema } from '@/lib/models';
import {
  doseSeconds,
  estimateWorkoutSeconds,
  expandWorkout,
  filterExercises,
  localDateKey,
  weekDays,
} from '@/lib/workouts';
import {
  advance,
  elapsed,
  endWorkout,
  previous,
  remaining,
  startWorkout,
  toggleRunning,
  toSession,
} from '@/lib/player';
import { initialSnapshot, readSnapshot, STORAGE_KEY, writeSnapshot } from '@/lib/storage';
import { videoRegistry, youtubeSearchUrl } from '@/data/videos';
describe('Catalogo completo', () => {
  it('valida 52 record unici e 55 associazioni senza perdere categorie', () => {
    expect(exercises).toHaveLength(52);
    expect(initialCatalogEntries).toHaveLength(55);
    expect(new Set(exercises.map((e) => e.id)).size).toBe(52);
    expect(new Set(exercises.map((e) => e.slug)).size).toBe(52);
    for (const ex of exercises) expect(exerciseSchema.safeParse(ex).success).toBe(true);
    expect(Object.values(catalogByCategory).map((v) => v.length)).toEqual([9, 7, 9, 8, 8, 8, 6]);
  });
  it('condivide scapular push-up, shoulder taps e hollow hold', () => {
    expect(exerciseById['scapular-push-up'].categories).toEqual(['mobilita', 'parte-superiore']);
    expect(exerciseById['shoulder-taps'].categories).toContain('core');
    expect(exerciseById['hollow-hold'].categories).toContain('coordinazione');
  });
  it('ogni salto include prerequisiti, atterraggio e alternativa', () => {
    for (const ex of exercises.filter((e) => e.categories.includes('esplosivita'))) {
      expect(ex.prerequisites.length).toBeGreaterThan(1);
      expect(ex.restSeconds).toBeGreaterThanOrEqual(60);
      expect(ex.instructions[2].toLocaleLowerCase()).toMatch(/atterra|ammortizza/);
      expect(ex.easierVariation).toMatch(/senza salto|senza saltare|senza staccare/);
    }
  });
  it('cerca, filtra e ordina senza modificare i dati', () => {
    expect(filterExercises('  WALL ANGELS ', '', '', '', '').map((e) => e.id)).toEqual([
      'wall-angels',
    ]);
    expect(
      filterExercises('', 'core', 'intermediate', '', '').every(
        (e) => e.categories.includes('core') && e.difficulty === 'intermediate',
      ),
    ).toBe(true);
    expect(filterExercises('', '', '', 'Polpacci', 'Parete').map((e) => e.id)).toContain(
      'calf-stretch',
    );
    expect(filterExercises('', '', '', '', '', ['dead-bug']).map((e) => e.id)).toEqual([
      'dead-bug',
    ]);
    expect(filterExercises('inesistente', '', '', '', '')).toEqual([]);
    const names = filterExercises('', '', '', '', '').map((e) => e.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'it')));
  });
  it('usa solo video registrati o una ricerca con il nome esatto', () => {
    for (const e of exercises) {
      if (e.youtubeVideoId) expect(videoRegistry[e.id]?.youtubeVideoId).toBe(e.youtubeVideoId);
      expect(new URL(youtubeSearchUrl(e.name)).searchParams.get('search_query')).toBe(e.name);
    }
  });
});
describe('Programmi e stime', () => {
  it('valida i programmi e rispetta gli intervalli di durata richiesti', () => {
    const ranges = [
      [25, 28],
      [23, 27],
      [22, 26],
    ];
    defaultWorkouts.forEach((w, i) => {
      expect(workoutSchema.safeParse(w).success).toBe(true);
      const min = estimateWorkoutSeconds(w) / 60;
      expect(min).toBeGreaterThanOrEqual(ranges[i][0]);
      expect(min).toBeLessThanOrEqual(ranges[i][1]);
      expect(expandWorkout(w).filter((s) => s.kind === 'exercise')).toHaveLength(12);
    });
  });
  it('conta lati, posizioni e recuperi senza rest finale duplicato', () => {
    expect(doseSeconds({ ...exerciseById['side-plank'].dose })).toBe(50);
    expect(doseSeconds(exerciseById['prone-ytw'].dose)).toBe(54);
    const w = {
      ...defaultWorkouts[0],
      rounds: 1,
      exercises: [{ ...defaultWorkouts[0].exercises[0], sets: 2 }],
    };
    const steps = expandWorkout(w);
    expect(steps.map((s) => s.kind)).toEqual([
      'warmup',
      'exercise',
      'rest',
      'exercise',
      'cooldown',
    ]);
    expect(estimateWorkoutSeconds(w)).toBe(w.warmupSeconds + 72 + 48 + w.cooldownSeconds);
  });
  it('rifiuta dosi prive di quantità e limiti invalidi', () => {
    expect(workoutSchema.safeParse({ ...defaultWorkouts[0], rounds: 0 }).success).toBe(false);
    expect(workoutSchema.safeParse({ ...defaultWorkouts[0], exercises: [] }).success).toBe(false);
  });
});
describe('Motore allenamento', () => {
  const w = {
    ...defaultWorkouts[0],
    rounds: 1,
    exercises: [{ ...defaultWorkouts[0].exercises[0], sets: 2 }],
  };
  it('usa scadenze e non il numero dei tick', () => {
    let a = startWorkout(w, 1000, 'test');
    a = toggleRunning(a, 1000);
    expect(remaining(a, 151000)).toBe(150000);
    expect(remaining(a, 501000)).toBe(0);
    expect(a.index).toBe(0);
  });
  it('pausa e riprende senza contare la pausa nel tempo attivo', () => {
    let a = toggleRunning(startWorkout(w, 1000, 'test'), 1000);
    a = toggleRunning(a, 11000);
    expect(remaining(a, 100000)).toBe(290000);
    expect(elapsed(a, 100000)).toBe(10000);
    a = toggleRunning(a, 100000);
    expect(remaining(a, 110000)).toBe(280000);
    expect(elapsed(a, 110000)).toBe(20000);
  });
  it('conferma una serie, apre il recupero e permette di tornare indietro', () => {
    let a = toggleRunning(startWorkout(w, 0, 'test'), 0);
    a = advance(a, 300000);
    expect(a.index).toBe(1);
    a = advance(a, 340000);
    expect(a.progress[0].status).toBe('completed');
    expect(expandWorkout(w)[a.index].kind).toBe('rest');
    a = advance(a, 390000);
    a = advance(a, 430000, true);
    expect(a.progress.filter((p) => p.status === 'skipped')).toHaveLength(1);
    a = previous(a, 431000);
    expect(a.progress).toHaveLength(1);
  });
  it('completa e salva una sola sessione coerente', () => {
    let a = toggleRunning(startWorkout(w, 0, 'session-id'), 0);
    let now = 0;
    while (!a.finished) {
      now += 10000;
      a = advance(a, now);
    }
    const s = toSession(a, now);
    expect(sessionSchema.safeParse(s).success).toBe(true);
    expect(s.completed).toBe(true);
    expect(s.progress).toHaveLength(2);
    expect(s.durationSeconds).toBe(50);
    expect(s.categories).toContain('gambe');
    expect(advance(a, now)).toBe(a);
  });
  it('non conta come completata una sessione interrotta nel defaticamento', () => {
    let a = startWorkout(w, 0, 'test');
    while (expandWorkout(w)[a.index].kind !== 'cooldown') a = advance(a, 1000);
    a = endWorkout(a, 2000);
    expect(toSession(a, 2000).completed).toBe(false);
  });
});
describe('Persistenza e calendario', () => {
  it('salva e recupera preferiti, programmi, sessione attiva e preferenze', () => {
    const map = new Map<string, string>();
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
    };
    const snapshot = {
      ...initialSnapshot,
      favorites: ['dead-bug'],
      workouts: [defaultWorkouts[0]],
      active: startWorkout(defaultWorkouts[0], 0, 'active'),
    };
    expect(writeSnapshot(storage, snapshot)).toBeUndefined();
    expect(readSnapshot(storage).data).toEqual(snapshot);
  });
  it('conserva i dati corrotti e segnala storage non disponibile', () => {
    const map = new Map([[STORAGE_KEY, '{broken']]);
    const result = readSnapshot({ getItem: (k) => map.get(k) ?? null });
    expect(result.error).toBeTruthy();
    expect(map.get(STORAGE_KEY)).toBe('{broken');
    expect(
      writeSnapshot(
        {
          setItem: () => {
            throw new Error('quota');
          },
        },
        initialSnapshot,
      ),
    ).toBeTruthy();
  });
  it('genera settimane locali da lunedì e mantiene la data', () => {
    const days = weekDays(new Date(2026, 9, 25, 23, 30));
    expect(days[0].getDay()).toBe(1);
    expect(localDateKey(days[0])).toBe('2026-10-19');
    expect(days[6].getDay()).toBe(0);
  });
});
