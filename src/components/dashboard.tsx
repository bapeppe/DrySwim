'use client';
import Link from 'next/link';
import { ArrowRight, Clock3, Dumbbell, Play, Plus, Users } from 'lucide-react';
import { useStore } from '@/state/store';
import { estimateWorkoutSeconds, exerciseMap } from '@/lib/workouts';
export function Dashboard() {
  const { active, workouts, configured, team, athletes, exercises } = useStore();
  const workout = workouts.find((w) => w.published);
  return (
    <div className="home-page">
      <div className="page-heading">
        <div>
          <h1>Ciao! Ti va di allenarti?</h1>
          <p>{team?.name || 'La tua squadra'} · allenamenti ed esercizi, subito a disposizione.</p>
        </div>
      </div>
      {active ? (
        <section className="today-card">
          <span className="section-kicker">
            {active.finished ? 'Ti manca solo il salvataggio' : 'Hai un allenamento in corso'}
          </span>
          <h2>{active.workout.name}</h2>
          <p>Riprendi dal punto in cui ti sei fermato su questo dispositivo.</p>
          <Link href={`/allenamento/${active.workout.id}`} className="btn btn-primary full-width">
            <Play size={20} />
            {active.finished ? 'Salva il risultato' : 'Riprendi allenamento'}
            <ArrowRight size={20} />
          </Link>
        </section>
      ) : workout ? (
        <section className="today-card">
          <span className="section-kicker">Dal tuo allenatore</span>
          <h2>{workout.name}</h2>
          <div className="today-meta">
            <span>
              <Clock3 size={18} />
              {Math.round(estimateWorkoutSeconds(workout, exerciseMap(exercises)) / 60)} minuti
            </span>
            <span>
              <Dumbbell size={18} />
              {workout.exercises.length} esercizi
            </span>
          </div>
          <p>Un esercizio alla volta, dal riscaldamento al recupero finale.</p>
          <Link href={`/allenamenti/${workout.id}`} className="btn btn-primary full-width">
            <Play size={20} />
            Vai all’allenamento
            <ArrowRight size={20} />
          </Link>
          <Link href="/allenamenti" className="secondary-choice">
            Tutti gli allenamenti
          </Link>
        </section>
      ) : (
        <section className="today-card">
          <Users size={30} className="teal" />
          <h2>
            {configured ? 'Gli allenamenti arriveranno qui' : 'La squadra non è ancora attiva'}
          </h2>
          <p>
            {configured
              ? 'Non ci sono ancora programmi pubblicati. Puoi già esplorare gli esercizi.'
              : 'Il database condiviso deve essere collegato. Puoi già esplorare gli esercizi.'}
          </p>
          <Link href="/esercizi" className="btn btn-primary full-width">
            Esplora gli esercizi
            <ArrowRight size={20} />
          </Link>
        </section>
      )}
      {configured && (
        <section className="panel mt">
          <h2>Lo spazio della squadra</h2>
          <p>
            {athletes.filter((a) => !a.archived).length} allievi ·{' '}
            {workouts.filter((w) => w.published).length} programmi pubblicati
          </p>
          <Link href="/allenatore" className="btn btn-secondary">
            <Plus size={18} />
            Crea allenamento
          </Link>
          <Link href="/allievi" className="secondary-choice">
            Apri il registro allievi
          </Link>
          <Link href="/progressi" className="secondary-choice">
            Progressi della squadra
          </Link>
        </section>
      )}
    </div>
  );
}
