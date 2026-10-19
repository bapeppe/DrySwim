import { describe, it, expect } from 'vitest';
import { parseSwimTime, formatSwimTime, groupSwimResults } from '@/lib/swim-times';
import { parseYouTubeUrl } from '@/lib/youtube';
import { customExerciseInputSchema, makeCustomExercise } from '@/lib/custom-exercises';
import { resultInputSchema, type SwimResult } from '@/lib/team-models';
import { startWorkout, advance, toggleRunning, toSession, activeSchema } from '@/lib/player';
import {
  exerciseMap,
  createWorkoutExercise,
  expandWorkout,
  estimateWorkoutSeconds,
  filterExercises,
} from '@/lib/workouts';
import { defaultWorkouts } from './fixtures/workouts';
const id = '10000000-0000-4000-8000-000000000001';
const result: SwimResult = {
  id,
  athleteId: id,
  distance: 100,
  stroke: 'medley',
  poolLength: 25,
  date: '2026-10-20',
  centiseconds: 7200,
  kind: 'training',
  note: '',
  recordedAt: '2026-10-20T12:00:00Z',
};
describe('Tempi e specialità', () => {
  it.each([
    ['1.12', 7200],
    ['1:12.34', 7234],
    ['1:12,3', 7230],
    ['1.12.34', 7234],
    ['72', 7200],
    ['72,34', 7234],
  ])('interpreta %s senza ambiguità', (text, value) => expect(parseSwimTime(text)).toBe(value));
  it.each(['0', '1:60', '-1', 'NaN', '1.2', '12:00:00', '3601', '1:12.345'])('rifiuta %s', (text) =>
    expect(() => parseSwimTime(text)).toThrow(),
  );
  it('mantiene i centesimi e separa vasche e specialità', () => {
    expect(formatSwimTime(7234)).toBe('1:12.34');
    const groups = groupSwimResults([
      result,
      { ...result, date: '2026-10-21', centiseconds: 7000 },
      { ...result, poolLength: 50 },
      { ...result, distance: 200 },
    ]);
    expect(groups).toHaveLength(3);
    expect(groups[0].improvement).toBe(200);
    expect(groups[0].best).toBe(7000);
  });
  it('rifiuta date inesistenti, tempi negativi e distanze non previste', () => {
    for (const patch of [{ date: '2026-02-30' }, { centiseconds: -1 }, { distance: 73 }])
      expect(resultInputSchema.safeParse({ ...result, ...patch }).success).toBe(false);
  });
});
describe('Video scelti dall’allenatore', () => {
  it.each([
    'https://youtu.be/abcdefghijk',
    'https://www.youtube.com/watch?v=abcdefghijk&t=10',
    'https://youtube.com/shorts/abcdefghijk',
    'https://www.youtube-nocookie.com/embed/abcdefghijk',
  ])('riconosce il formato %s', (url) => expect(parseYouTubeUrl(url)).toBe('abcdefghijk'));
  it.each([
    'https://youtube.com.evil.test/watch?v=abcdefghijk',
    'https://evil.test/abcdefghijk',
    'javascript:alert(1)',
    'https://youtube.com/@channel',
    'https://user@youtube.com/watch?v=abcdefghijk',
    'https://youtube.com/watch?v=short',
  ])('rifiuta URL estranei o non video: %s', (url) => expect(() => parseYouTubeUrl(url)).toThrow());
});
describe('Esercizi e circuiti personalizzati', () => {
  const input = customExerciseInputSchema.parse({
    id: `custom-${id}`,
    name: 'Esercizio allenatore',
    mode: 'time',
    youtubeUrl: 'https://youtu.be/abcdefghijk',
    category: 'core',
    instructions: 'Prima posizione\nSecondo passaggio',
  });
  const exercise = makeCustomExercise(input),
    catalog = exerciseMap([exercise]);
  it('normalizza nome, modalità, istruzioni e video senza duplicare il catalogo', () => {
    expect(exercise.custom).toBe(true);
    expect(exercise.dose.durationSeconds).toBe(30);
    expect(exercise.instructions).toHaveLength(2);
    expect(filterExercises('allenatore', 'core', '', '', '', undefined, [exercise])).toEqual([
      exercise,
    ]);
  });
  it('conserva un catalogo nella sessione e termina tutte le serie e i giri', () => {
    const item = createWorkoutExercise(exercise.id, catalog);
    const workout = { ...defaultWorkouts[0], id, rounds: 2, exercises: [{ ...item, sets: 2 }] };
    expect(expandWorkout(workout, catalog).filter((s) => s.kind === 'exercise')).toHaveLength(4);
    expect(estimateWorkoutSeconds(workout, catalog)).toBeGreaterThan(120);
    let active = toggleRunning(startWorkout(workout, 0, id, catalog), 0);
    let now = 0;
    while (!active.finished) {
      now += 1000;
      active = advance(active, now);
    }
    expect(activeSchema.safeParse(active).success).toBe(true);
    const saved = toSession(active, now);
    expect(saved.completed).toBe(true);
    expect(saved.progress).toHaveLength(4);
    expect(saved.categories).toEqual(['core']);
    expect(toSession(active, now + 10000)).toEqual(saved);
  });
});
