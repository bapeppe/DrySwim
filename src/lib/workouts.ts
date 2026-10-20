import { exerciseById, exercises as baseExercises } from '@/data/exercises';
import { type Dose, type Workout, type WorkoutExercise, type Exercise } from './models';
export const TRANSITION_SECONDS = 8;
export const doseSeconds = (dose: Dose) =>
  Math.ceil(
    (dose.mode === 'time' ? dose.durationSeconds! : dose.reps! * dose.secondsPerRep) *
      dose.sides *
      dose.positions,
  );
export function doseLabel(dose: Dose, exerciseId?: string) {
  return `${dose.mode === 'time' ? `${dose.durationSeconds} secondi` : `${dose.reps} ripetizioni`}${dose.sides === 2 ? (exerciseId === 'shoulder-circles' ? ' per direzione' : ' per lato') : ''}${dose.positions > 1 ? ` per posizione (${dose.positions} posizioni)` : ''}`;
}
export type WorkoutStep = {
  id: string;
  kind: 'warmup' | 'exercise' | 'rest' | 'cooldown';
  durationSeconds: number;
  exerciseId?: string;
  round: number;
  set: number;
  dose?: Dose;
  text: string;
  title: string;
};
export function expandWorkout(
  workout: Workout,
  catalog: Record<string, Exercise> = exerciseById,
): WorkoutStep[] {
  const steps: WorkoutStep[] = [
    {
      id: 'warmup',
      kind: 'warmup',
      durationSeconds: workout.warmupSeconds,
      round: 0,
      set: 0,
      text: workout.warmupInstructions,
      title: 'Prepariamo il corpo',
    },
  ];
  for (let r = 1; r <= workout.rounds; r++) {
    workout.exercises.forEach((item, i) => {
      const ex = catalog[item.exerciseId];
      if (!ex) throw new Error(`Esercizio non disponibile: ${item.exerciseId}`);
      for (let s = 1; s <= item.sets; s++) {
        const id = `${r}-${item.id}-${s}`;
        steps.push({
          id,
          kind: 'exercise',
          durationSeconds: doseSeconds(item.dose),
          exerciseId: ex.id,
          round: r,
          set: s,
          dose: item.dose,
          text: ex.instructions.join(' '),
          title: ex.name,
        });
        const last = s === item.sets && i === workout.exercises.length - 1;
        if (!last)
          steps.push({
            id: `${id}-rest`,
            kind: 'rest',
            durationSeconds: item.restSeconds + TRANSITION_SECONDS,
            round: r,
            set: s,
            text: `Respira e prepara il prossimo movimento. Sono inclusi ${TRANSITION_SECONDS} secondi per il cambio posizione. Puoi prolungare il recupero mettendo in pausa.`,
            title: 'Riprendi fiato',
          });
      }
    });
    if (r < workout.rounds)
      steps.push({
        id: `round-${r}`,
        kind: 'rest',
        durationSeconds: workout.roundRestSeconds + TRANSITION_SECONDS,
        round: r,
        set: 0,
        text: 'Recupera tra i giri. Riparti solo quando riesci a mantenere una tecnica controllata.',
        title: 'Recupero tra i giri',
      });
  }
  steps.push({
    id: 'cooldown',
    kind: 'cooldown',
    durationSeconds: workout.cooldownSeconds,
    round: workout.rounds,
    set: 0,
    text: workout.cooldownInstructions,
    title: 'Rallenta, respira, recupera',
  });
  return steps;
}
export const estimateWorkoutSeconds = (
  workout: Workout,
  catalog: Record<string, Exercise> = exerciseById,
) => expandWorkout(workout, catalog).reduce((sum, s) => sum + s.durationSeconds, 0);
export function createWorkoutExercise(
  exerciseId: string,
  catalog: Record<string, Exercise> = exerciseById,
): WorkoutExercise {
  const ex = catalog[exerciseId];
  if (!ex) throw new Error('Esercizio non trovato');
  return {
    id: crypto.randomUUID(),
    exerciseId,
    sets: 1,
    dose: { ...ex.dose },
    restSeconds: ex.restSeconds,
  };
}
export function filterExercises(
  query: string,
  category: string,
  difficulty: string,
  muscle: string,
  equipment: string,
  favorites?: string[],
  catalog: Exercise[] = baseExercises,
) {
  const normalized = query.trim().toLocaleLowerCase('it');
  return catalog
    .filter(
      (e) =>
        (!normalized || e.name.toLocaleLowerCase('it').includes(normalized)) &&
        (!category || e.categories.some((c) => c === category)) &&
        (!difficulty || e.difficulty === difficulty) &&
        (!muscle || e.muscleGroups.includes(muscle)) &&
        (!equipment || e.equipment.includes(equipment)) &&
        (!favorites || favorites.includes(e.id)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}
export function weekDays(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}
export const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function formatTime(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export const exerciseMap = (items: Exercise[]): Record<string, Exercise> =>
  Object.fromEntries(items.map((e) => [e.id, e]));
