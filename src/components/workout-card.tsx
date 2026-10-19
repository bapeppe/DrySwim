'use client';
import Link from 'next/link';
import { ArrowRight, Clock3, Dumbbell } from 'lucide-react';
import type { Workout } from '@/lib/models';
import { estimateWorkoutSeconds, exerciseMap } from '@/lib/workouts';
import { useStore } from '@/state/store';
export function WorkoutCard({ workout }: { workout: Workout; index?: number }) {
  const { exercises, member } = useStore();
  return (
    <Link className="workout-card" href={`/allenamenti/${workout.id}`}>
      <span className="workout-symbol">
        <Dumbbell size={26} />
      </span>
      <div className="workout-card-body">
        <h3>{workout.name}</h3>
        <p>{workout.description || 'Un programma del tuo allenatore.'}</p>
        {member?.role === 'coach' && (
          <small>{'published' in workout && workout.published ? 'Pubblicato' : 'Bozza'}</small>
        )}
        <div className="card-meta">
          <span>
            <Clock3 size={16} />
            {Math.round(estimateWorkoutSeconds(workout, exerciseMap(exercises)) / 60)} min
          </span>
          <span>{workout.exercises.length} esercizi</span>
        </div>
      </div>
      <ArrowRight size={22} />
    </Link>
  );
}
