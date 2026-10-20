import { exerciseById } from '@/data/exercises';
import { workoutSchema, type WorkoutExercise } from '@/lib/models';
function item(id: string, reps?: number, rest = 40, secondsPerRep = 3): WorkoutExercise {
  const ex = exerciseById[id];
  return {
    id,
    exerciseId: id,
    sets: 1,
    dose: { ...ex.dose, ...(reps ? { reps } : {}), secondsPerRep },
    restSeconds: rest,
  };
}
const cooldown =
  'Stretch leggero dei flessori dell’anca, pettorali e polpacci, 20–30 secondi per lato. Respira, senza rimbalzare né forzare. Usa il tempo restante per camminare lentamente.';
export const defaultWorkouts = [
  workoutSchema.parse({
    id: 'forza-core',
    name: 'Forza & core',
    description:
      'Una base solida, dentro e fuori dall’acqua. Un circuito completo per la spinta, il controllo e la stabilità.',
    rounds: 2,
    roundRestSeconds: 75,
    warmupSeconds: 300,
    warmupInstructions:
      '1 minuto di marcia veloce, 1 minuto di Cat-Cow lento, 1 minuto di circonduzioni delle spalle, 2 minuti alternando squat leggeri e marcia. Aumenta gradualmente il movimento.',
    cooldownSeconds: 180,
    cooldownInstructions: cooldown,
    exercises: [
      item('squat', 12),
      item('push-up', 10),
      item('reverse-lunges', 8),
      item('dead-bug', 8),
      item('prone-ytw', 6),
      {
        ...item('forearm-plank'),
        dose: { ...exerciseById['forearm-plank'].dose, durationSeconds: 30 },
      },
    ],
    custom: false,
  }),
  workoutSchema.parse({
    id: 'esplosivita-stabilita',
    name: 'Esplosività & stabilità',
    description:
      'Poche ripetizioni, tanta cura del gesto. Allena la spinta e impara a ritrovare l’equilibrio dopo ogni salto.',
    rounds: 2,
    roundRestSeconds: 90,
    warmupSeconds: 360,
    warmupInstructions:
      '2 minuti di marcia e mobilità 90/90 delle anche; 1 minuto di Knee to Wall alternato; 1 minuto di squat leggeri; 2 minuti di prove di atterraggio senza salto e piccole spinte sugli avampiedi. Prima dei salti serve l’approvazione dell’allenatore.',
    cooldownSeconds: 180,
    cooldownInstructions:
      'Mobilità dolce di anche e caviglie e respirazione tranquilla. Nessuna posizione forzata. Cammina lentamente nel tempo restante.',
    exercises: [
      item('squat-jump', 5, 60, 5),
      item('broad-jump', 4, 60, 5),
      item('skater-jumps', 5, 60, 3),
      item('single-glute-bridge', 10, 30, 2),
      item('side-plank', undefined, 30),
      item('bird-dog', 8, 30, 2),
    ],
    custom: false,
  }),
  workoutSchema.parse({
    id: 'mobilita-controllo',
    name: 'Mobilità & controllo',
    description:
      'Trova spazio nel movimento. Mobilità, equilibrio e forza controllata per sentirti più stabile.',
    rounds: 2,
    roundRestSeconds: 75,
    warmupSeconds: 300,
    warmupInstructions:
      '2 minuti di marcia tranquilla con movimenti delle braccia; 1 minuto di Cat-Cow; 1 minuto di mobilità dolce delle caviglie; 1 minuto di squat a piccola ampiezza. Respira regolarmente.',
    cooldownSeconds: 240,
    cooldownInstructions: cooldown,
    exercises: [
      item('wall-angels', 10, 35),
      item('hip-switch', 10, 35),
      item('scapular-push-up', 12, 35),
      item('single-rdl', 8, 35),
      item('hollow-hold', undefined, 35),
      item('glute-bridge', 15, 35),
    ],
    custom: false,
  }),
];
