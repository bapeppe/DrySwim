import { z } from 'zod';
import { exerciseProgressSchema, workoutSchema, type Workout, type WorkoutSession } from './models';
import { expandWorkout } from './workouts';
import { exerciseById } from '@/data/exercises';
export const activeSchema = z
  .object({
    id: z.string(),
    workout: workoutSchema,
    index: z.number().int().min(0),
    startedAt: z.string().datetime(),
    running: z.boolean(),
    deadline: z.number(),
    remainingMs: z.number().min(0),
    elapsedMs: z.number().min(0),
    resumedAt: z.number(),
    progress: z.array(exerciseProgressSchema),
    finished: z.boolean(),
    endedEarly: z.boolean(),
  })
  .refine((a) => a.index < expandWorkout(a.workout).length, 'Fase non valida');
export type ActiveWorkout = z.infer<typeof activeSchema>;
export function startWorkout(workout: Workout, now: number, id: string): ActiveWorkout {
  return {
    id,
    workout,
    index: 0,
    startedAt: new Date(now).toISOString(),
    running: false,
    deadline: now + workout.warmupSeconds * 1000,
    remainingMs: workout.warmupSeconds * 1000,
    elapsedMs: 0,
    resumedAt: now,
    progress: [],
    finished: false,
    endedEarly: false,
  };
}
export const remaining = (a: ActiveWorkout, now: number) =>
  a.running ? Math.max(0, a.deadline - now) : a.remainingMs;
export const elapsed = (a: ActiveWorkout, now: number) =>
  a.elapsedMs + (a.running ? Math.max(0, now - a.resumedAt) : 0);
export function toggleRunning(a: ActiveWorkout, now: number): ActiveWorkout {
  return a.running
    ? { ...a, running: false, remainingMs: remaining(a, now), elapsedMs: elapsed(a, now) }
    : { ...a, running: true, resumedAt: now, deadline: now + a.remainingMs };
}
export function advance(a: ActiveWorkout, now: number, skip = false): ActiveWorkout {
  if (a.finished) return a;
  const steps = expandWorkout(a.workout),
    step = steps[a.index];
  const progress =
    step.kind === 'exercise'
      ? [
          ...a.progress.filter((p) => p.stepId !== step.id),
          {
            stepId: step.id,
            exerciseId: step.exerciseId!,
            round: step.round,
            set: step.set,
            status: skip ? ('skipped' as const) : ('completed' as const),
          },
        ]
      : a.progress;
  const last = a.index === steps.length - 1;
  const ms = last ? 0 : steps[a.index + 1].durationSeconds * 1000;
  return {
    ...a,
    progress,
    index: last ? a.index : a.index + 1,
    finished: last,
    running: last ? false : a.running,
    remainingMs: ms,
    deadline: now + ms,
    elapsedMs: elapsed(a, now),
    resumedAt: now,
  };
}
export function previous(a: ActiveWorkout, now: number): ActiveWorkout {
  const index = Math.max(0, a.index - 1),
    steps = expandWorkout(a.workout),
    valid = new Set(steps.slice(0, index).map((s) => s.id)),
    ms = steps[index].durationSeconds * 1000;
  return {
    ...a,
    index,
    finished: false,
    progress: a.progress.filter((p) => valid.has(p.stepId)),
    remainingMs: ms,
    deadline: now + ms,
    elapsedMs: elapsed(a, now),
    resumedAt: now,
  };
}
export function endWorkout(a: ActiveWorkout, now: number): ActiveWorkout {
  return {
    ...a,
    running: false,
    finished: true,
    endedEarly: true,
    remainingMs: remaining(a, now),
    elapsedMs: elapsed(a, now),
    resumedAt: now,
  };
}
export function toSession(a: ActiveWorkout, now: number): WorkoutSession {
  const steps = expandWorkout(a.workout);
  return {
    id: a.id,
    workoutId: a.workout.id,
    workoutName: a.workout.name,
    startedAt: a.startedAt,
    completedAt: new Date(now).toISOString(),
    durationSeconds: Math.round(elapsed(a, now) / 1000),
    completed:
      !a.endedEarly &&
      a.finished &&
      a.index === steps.length - 1 &&
      a.progress.some((p) => p.status === 'completed'),
    progress: a.progress,
    categories: [
      ...new Set(
        a.progress
          .filter((p) => p.status === 'completed')
          .flatMap((p) => exerciseById[p.exerciseId]?.categories ?? []),
      ),
    ],
  };
}
