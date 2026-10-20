import { z } from 'zod';
import { exerciseCategorySchema, exerciseSchema, type Exercise } from './models';
import { parseYouTubeUrl } from './youtube';
export const customExerciseInputSchema = z.object({
  id: z.string().regex(/^custom-[0-9a-f-]{36}$/),
  name: z.string().trim().min(2, 'Inserisci il nome dell’esercizio.').max(100),
  mode: z.enum(['reps', 'time']),
  youtubeUrl: z
    .string()
    .max(500)
    .refine((v) => {
      try {
        parseYouTubeUrl(v);
        return true;
      } catch {
        return false;
      }
    }, 'Inserisci il link di un video YouTube.'),
  category: exerciseCategorySchema,
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  instructions: z.string().trim().max(2500).default(''),
});
export type CustomExerciseInput = z.infer<typeof customExerciseInputSchema>;
export function makeCustomExercise(input: CustomExerciseInput): Exercise {
  const steps = input.instructions
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return exerciseSchema.parse({
    id: input.id,
    slug: input.id,
    name: input.name,
    categories: [input.category],
    muscleGroups: [],
    difficulty: input.difficulty,
    description:
      (input.instructions ? `Indicazioni dell’allenatore: ${input.instructions}` : '') ||
      'Esercizio proposto dal tuo allenatore. Segui la dimostrazione e chiedi chiarimenti prima di provarlo.',
    objective: 'Seguire le indicazioni del proprio allenatore.',
    swimmingBenefits: [],
    instructions: steps,
    commonMistakes: [],
    safetyNotes: [
      'Interrompi in caso di dolore e parlane con l’allenatore. Non arrivare al cedimento.',
      ...(input.category === 'esplosivita'
        ? [
            'Impara prima l’atterraggio con l’allenatore. Ginocchia in linea con i piedi e atterraggio ammortizzato. Recupera almeno 60–90 secondi; usa una variante senza salto se non sei pronto.',
          ]
        : []),
    ],
    prerequisites:
      input.difficulty === 'advanced' || input.category === 'esplosivita'
        ? ['Tecnica e variante da approvare con l’allenatore prima dell’uso autonomo.']
        : [],
    easierVariation: 'Chiedi all’allenatore una variante più semplice, se necessaria.',
    harderVariation: 'Aumenta la difficoltà solo con il tuo allenatore.',
    defaultSets: 1,
    dose: {
      mode: input.mode,
      ...(input.mode === 'reps' ? { reps: 10 } : { durationSeconds: 30 }),
      sides: 1,
      positions: 1,
      secondsPerRep: 3,
    },
    restSeconds: input.category === 'esplosivita' ? 75 : 30,
    equipment: ['Da concordare con l’allenatore'],
    youtubeVideoId: parseYouTubeUrl(input.youtubeUrl),
    youtubeSearchQuery: input.name,
    custom: true,
  });
}
