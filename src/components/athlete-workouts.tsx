'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { Athlete, TeamWorkout } from '@/lib/team-models';
import { WorkoutCard } from './workout-card';

export function AthleteWorkouts({
  athlete,
  workouts,
}: {
  athlete: Athlete;
  workouts: TeamWorkout[];
}) {
  const personal = workouts.filter(
    (w) => w.targetAthleteIds.length === 1 && w.targetAthleteIds[0] === athlete.id,
  );
  return (
    <section className="mt" aria-labelledby="athlete-workouts-title">
      <div className="page-heading">
        <div>
          <h2 id="athlete-workouts-title">Schede personali</h2>
          <p>Allenamenti dedicati a {athlete.displayName}, anche per la palestra.</p>
        </div>
        {!athlete.archived && (
          <Link className="btn btn-primary" href={`/allenatore?athlete=${athlete.id}`}>
            <Plus size={18} /> Aggiungi scheda allenamento
          </Link>
        )}
      </div>
      {personal.length ? (
        <div className="workout-grid">
          {personal.map((workout) => (
            <div key={workout.id}>
              <WorkoutCard workout={workout} />
              {!athlete.archived && (
                <Link
                  className="btn btn-secondary full-width mt"
                  href={`/allenatore?athlete=${athlete.id}&edit=${workout.id}`}
                >
                  Modifica {workout.name}
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="quiet-note">
          Nessuna scheda personale. Puoi creare più schede, ad esempio una per ciascun giorno in
          palestra. I programmi di squadra restano nella sezione Allenati.
        </p>
      )}
    </section>
  );
}
