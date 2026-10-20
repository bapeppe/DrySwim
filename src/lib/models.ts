import { z } from 'zod';
z.config(z.locales.it());
export const categoryIds = [
  'mobilita',
  'flessibilita',
  'gambe',
  'parte-superiore',
  'core',
  'esplosivita',
  'coordinazione',
] as const;
export const exerciseCategorySchema = z.enum(categoryIds);
export type ExerciseCategory = z.infer<typeof exerciseCategorySchema>;
export const categories: Record<
  ExerciseCategory,
  { name: string; short: string; color: string; benefit: string }
> = {
  mobilita: {
    name: 'Mobilità articolare',
    short: 'Mobilità',
    color: '#0ea5a4',
    benefit:
      'Favorisce il movimento controllato di spalle, torace, anche e caviglie per una posizione più allineata in acqua.',
  },
  flessibilita: {
    name: 'Flessibilità e stretching',
    short: 'Flessibilità',
    color: '#8b5cf6',
    benefit:
      'Aiuta a mantenere l’ampiezza di movimento necessaria alla nuotata e a ritrovare una sensazione di rilassamento.',
  },
  gambe: {
    name: 'Forza delle gambe',
    short: 'Gambe',
    color: '#f59e0b',
    benefit:
      'Allena la spinta e il controllo degli arti inferiori utili a partenze, virate e stabilità della nuotata.',
  },
  'parte-superiore': {
    name: 'Forza della parte superiore',
    short: 'Parte superiore',
    color: '#3b82f6',
    benefit:
      'Rinforza i muscoli di spinta e gli stabilizzatori scapolari per sostenere il controllo delle spalle in acqua.',
  },
  core: {
    name: 'Core e stabilità',
    short: 'Core',
    color: '#f97365',
    benefit:
      'Allena il controllo del tronco e il trasferimento della forza mantenendo una posizione idrodinamica.',
  },
  esplosivita: {
    name: 'Esplosività e pliometria',
    short: 'Esplosività',
    color: '#e05a85',
    benefit:
      'Sviluppa la capacità di esprimere forza rapidamente, una qualità utile per partenze e spinte dalle pareti.',
  },
  coordinazione: {
    name: 'Coordinazione e controllo',
    short: 'Coordinazione',
    color: '#6e80d9',
    benefit:
      'Allena equilibrio, percezione del corpo e coordinazione dei movimenti utili al controllo della nuotata.',
  },
};
export const doseSchema = z
  .object({
    mode: z.enum(['reps', 'time']),
    reps: z.number().int().min(1).max(100).optional(),
    durationSeconds: z.number().int().min(5).max(600).optional(),
    sides: z.union([z.literal(1), z.literal(2)]),
    positions: z.number().int().min(1).max(3),
    secondsPerRep: z.number().min(1).max(10),
  })
  .refine(
    (d) => (d.mode === 'time' ? !!d.durationSeconds : !!d.reps),
    'Inserisci una durata o un numero di ripetizioni valido.',
  );
export type Dose = z.infer<typeof doseSchema>;
export const exerciseSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  categories: z.array(exerciseCategorySchema).min(1),
  muscleGroups: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  description: z.string().min(20),
  objective: z.string().min(5),
  swimmingBenefits: z.array(z.string()),
  instructions: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  safetyNotes: z.array(z.string()).min(1),
  prerequisites: z.array(z.string()),
  easierVariation: z.string(),
  harderVariation: z.string(),
  defaultSets: z.number().int().min(1).max(8),
  dose: doseSchema,
  restSeconds: z.number().int().min(0).max(300),
  equipment: z.array(z.string()).min(1),
  youtubeVideoId: z
    .string()
    .regex(/^[\w-]{11}$/)
    .optional(),
  youtubeSearchQuery: z.string(),
  custom: z.boolean().default(false),
});
export type Exercise = z.infer<typeof exerciseSchema>;
export const workoutExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  sets: z.number().int().min(1).max(8),
  dose: doseSchema,
  restSeconds: z.number().int().min(0).max(300),
});
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;
export const workoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(3).max(80),
  description: z.string().max(600),
  rounds: z.number().int().min(1).max(5),
  roundRestSeconds: z.number().int().min(0).max(300),
  warmupSeconds: z.number().int().min(60).max(900),
  warmupInstructions: z.string().min(1),
  cooldownSeconds: z.number().int().min(60).max(600),
  cooldownInstructions: z.string().min(1),
  exercises: z.array(workoutExerciseSchema).min(1).max(30),
  custom: z.boolean(),
  targetAthleteIds: z.array(z.string()).default([]),
});
export type Workout = z.infer<typeof workoutSchema>;
export const exerciseProgressSchema = z.object({
  stepId: z.string(),
  exerciseId: z.string(),
  round: z.number().int(),
  set: z.number().int(),
  status: z.enum(['completed', 'skipped']),
});
export type ExerciseProgress = z.infer<typeof exerciseProgressSchema>;
export const sessionSchema = z.object({
  id: z.string(),
  workoutId: z.string(),
  workoutName: z.string(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  durationSeconds: z.number().min(0),
  completed: z.boolean(),
  progress: z.array(exerciseProgressSchema),
  categories: z.array(exerciseCategorySchema),
});
export type WorkoutSession = z.infer<typeof sessionSchema>;
export const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark']),
  role: z.enum(['athlete', 'coach']),
  sound: z.boolean(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
});
export type UserPreferences = z.infer<typeof preferencesSchema>;
export const difficultyLabels = {
  beginner: 'Base',
  intermediate: 'Intermedio',
  advanced: 'Avanzato',
};
