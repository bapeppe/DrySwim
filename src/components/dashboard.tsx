'use client';

import Link from 'next/link';
import { ArrowRight, Check, Clock3, Dumbbell, Play, Waves } from 'lucide-react';
import { defaultWorkouts } from '@/data/workouts';
import { useStore } from '@/state/store';
import { estimateWorkoutSeconds, localDateKey, weekDays } from '@/lib/workouts';

export function Dashboard() {
  const { sessions, active } = useStore();
  const done = sessions.filter((s) => s.completed);
  const days = weekDays();
  const week = done.filter((s) =>
    days.some((d) => localDateKey(d) === localDateKey(new Date(s.completedAt))),
  );
  const workout = defaultWorkouts[Math.floor(((new Date().getDay() + 6) % 7) / 2) % 3];
  const last = done.at(-1);
  return (
    <div className="home-page">
      <div className="page-heading">
        <div>
          <h1>Ciao! Ti va di allenarti?</h1>
          <p>Un po’ di spazio, il tuo corpo e il programma concordato con l’allenatore.</p>
        </div>
      </div>
      {active ? (
        <section className="today-card">
          <span className="section-kicker">
            {active.finished ? 'Ti manca solo il salvataggio' : 'Hai un allenamento in corso'}
          </span>
          <h2>{active.workout.name}</h2>
          <p>
            {active.finished
              ? 'Salva il risultato per ritrovarlo nei tuoi progressi.'
              : 'Puoi continuare dal punto in cui ti sei fermato.'}
          </p>
          <Link href={`/allenamento/${active.workout.id}`} className="btn btn-primary full-width">
            <Play size={20} />
            {active.finished ? 'Salva il risultato' : 'Riprendi allenamento'}
            <ArrowRight size={20} />
          </Link>
        </section>
      ) : (
        <section className="today-card">
          <span className="section-kicker">Un programma per oggi</span>
          <h2>{workout.name}</h2>
          <div className="today-meta">
            <span>
              <Clock3 size={18} />
              {Math.round(estimateWorkoutSeconds(workout) / 60)} minuti
            </span>
            <span>
              <Dumbbell size={18} />
              {workout.exercises.length} esercizi
            </span>
          </div>
          <p>Ti guidiamo un esercizio alla volta, dal riscaldamento al recupero finale.</p>
          <Link href={`/allenamenti/${workout.id}`} className="btn btn-primary full-width">
            <Play size={20} />
            Vai all’allenamento
            <ArrowRight size={20} />
          </Link>
          <Link href="/allenamenti" className="secondary-choice">
            Scegli un altro programma
          </Link>
        </section>
      )}
      <section className="home-week panel" aria-label="La tua settimana">
        <div className="section-title">
          <h2>Questa settimana</h2>
          <span>
            {week.length} {week.length === 1 ? 'allenamento' : 'allenamenti'}
          </span>
        </div>
        <div className="week-days">
          {days.map((d) => {
            const key = localDateKey(d),
              trained = week.some((s) => localDateKey(new Date(s.completedAt)) === key);
            return (
              <div
                key={key}
                aria-label={`${d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}${trained ? ', allenamento completato' : ''}`}
                className={`week-day ${key === localDateKey(new Date()) ? 'today' : ''} ${trained ? 'trained' : ''}`}
              >
                <span>{d.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                <strong>{d.getDate()}</strong>
                <span className="day-check">{trained ? <Check size={14} /> : <span />}</span>
              </div>
            );
          })}
        </div>
        <p className="recovery-note">
          <Waves size={18} />
          Nei giorni di riposo recuperi: segui il piano dell’allenatore.
        </p>
      </section>
      <Link className="home-progress-link panel" href="/progressi">
        <span>
          <strong>{last ? `${done.length} allenamenti completati` : 'I tuoi progressi'}</strong>
          <small>
            {last ? `Ultimo: ${last.workoutName}` : 'Dopo il primo allenamento, li trovi qui.'}
          </small>
        </span>
        <ArrowRight size={22} />
      </Link>
    </div>
  );
}
