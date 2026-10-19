import Link from 'next/link';
import { ArrowRight, Clock3, Dumbbell, Waves, Zap } from 'lucide-react';
import type { Workout } from '@/lib/models';
import { estimateWorkoutSeconds } from '@/lib/workouts';
const descriptions: Record<string, string> = {
  'forza-core': 'Rinforza gambe, braccia e addominali.',
  'esplosivita-stabilita': 'Salti controllati ed esercizi di equilibrio.',
  'mobilita-controllo': 'Muovi meglio spalle e anche, con calma.',
};
export function WorkoutCard({ workout }: { workout: Workout; index?: number }) {
  const Icon =
    workout.id === 'esplosivita-stabilita'
      ? Zap
      : workout.id === 'mobilita-controllo'
        ? Waves
        : Dumbbell;
  return (
    <Link className="workout-card" href={`/allenamenti/${workout.id}`}>
      <span
        className={`workout-symbol ${workout.id === 'esplosivita-stabilita' ? 'symbol-orange' : ''}`}
      >
        <Icon size={26} />
      </span>
      <div className="workout-card-body">
        <h3>{workout.name}</h3>
        <p>
          {descriptions[workout.id] ||
            workout.description ||
            'Un programma creato dal tuo allenatore.'}
        </p>
        <div className="card-meta">
          <span>
            <Clock3 size={16} />
            {Math.round(estimateWorkoutSeconds(workout) / 60)} min
          </span>
          <span>{workout.exercises.length} esercizi</span>
        </div>
      </div>
      <ArrowRight className="workout-card-arrow" size={22} />
    </Link>
  );
}
