import Link from 'next/link';
import { ArrowUpRight, Clock3, Repeat2 } from 'lucide-react';
import { type Workout, categories } from '@/lib/models';
import { estimateWorkoutSeconds } from '@/lib/workouts';
import { exerciseById } from '@/data/exercises';
import { CategoryArt } from './visuals';
export function WorkoutCard({ workout, index = 0 }: { workout: Workout; index?: number }) {
  const cat = exerciseById[workout.exercises[0].exerciseId]?.categories[0] ?? 'core';
  return (
    <Link className="workout-card" href={`/allenamenti/${workout.id}`}>
      <div className="workout-image">
        <CategoryArt category={cat} />
        <span className="program-label">
          {workout.custom ? 'PERSONALIZZATO' : `PROGRAMMA ${String.fromCharCode(65 + index)}`}
        </span>
        <span className="card-arrow">
          <ArrowUpRight size={20} />
        </span>
      </div>
      <div className="workout-card-body">
        <span className="eyebrow" style={{ color: categories[cat].color }}>
          {categories[cat].short} · {workout.exercises.length} esercizi
        </span>
        <h3>{workout.name}</h3>
        <p>{workout.description}</p>
        <div className="card-meta">
          <span>
            <Clock3 size={15} />
            {Math.round(estimateWorkoutSeconds(workout) / 60)} min
          </span>
          <span>
            <Repeat2 size={15} />
            {workout.rounds} giri
          </span>
          <span>Corpo libero</span>
        </div>
      </div>
    </Link>
  );
}
