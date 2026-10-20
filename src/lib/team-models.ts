import { z } from 'zod';
import { exerciseSchema, sessionSchema, workoutSchema } from './models';

export const athleteSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(80),
  archived: z.boolean(),
});
export type Athlete = z.infer<typeof athleteSchema>;
export const athleteInputSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().trim().min(1, 'Inserisci il nome dell’allievo.').max(80),
  archived: z.boolean().default(false),
});
export const strokes = {
  freestyle: 'Stile libero',
  backstroke: 'Dorso',
  breaststroke: 'Rana',
  butterfly: 'Farfalla',
  medley: 'Misti',
} as const;
export const distances = [25, 50, 100, 200, 400, 800, 1500] as const;
export const resultInputSchema = z.object({
  id: z.string().uuid(),
  athleteId: z.string().uuid(),
  distance: z
    .number()
    .int()
    .refine((v) => distances.some((d) => d === v), 'Scegli una distanza valida.'),
  stroke: z.enum(['freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley']),
  poolLength: z.union([z.literal(25), z.literal(50)]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) &&
        new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v,
      'Data non valida.',
    ),
  centiseconds: z.number().int().min(1).max(360000),
  kind: z.enum(['training', 'race']),
  note: z.string().trim().max(300).default(''),
});
export const swimResultSchema = resultInputSchema.extend({ recordedAt: z.string() });
export type SwimResult = z.infer<typeof swimResultSchema>;
export const teamWorkoutSchema = workoutSchema.extend({
  published: z.boolean().default(false),
});
export type TeamWorkout = z.infer<typeof teamWorkoutSchema>;
export const sharedSessionSchema = sessionSchema.extend({
  athleteId: z.string().uuid().nullable().default(null),
});
export const workspaceSchema = z.object({
  configured: z.boolean(),
  status: z.enum(['setup-required', 'ready']),
  team: z.object({ id: z.string().uuid(), name: z.string() }).nullable(),
  exercises: z.array(exerciseSchema),
  workouts: z.array(teamWorkoutSchema),
  athletes: z.array(athleteSchema),
  results: z.array(swimResultSchema),
  sessions: z.array(sharedSessionSchema),
});
export type Workspace = z.infer<typeof workspaceSchema>;
