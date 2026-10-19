'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Clock3, Play, Plus, ShieldCheck, Check } from 'lucide-react';
import { defaultWorkouts } from '@/data/workouts';
import { exerciseById } from '@/data/exercises';
import { useStore } from '@/state/store';
import { doseLabel, estimateWorkoutSeconds } from '@/lib/workouts';
import { unlockSound } from '@/lib/audio';
import { startWorkout, toggleRunning } from '@/lib/player';
import { WorkoutCard } from './workout-card';

export function WorkoutsView() {
  const { workouts, preferences } = useStore();
  return (
    <div className="workouts-page">
      <div className="page-heading">
        <div>
          <h1>Scegli un allenamento</h1>
          <p>Usa il programma concordato con il tuo allenatore.</p>
        </div>
        {preferences.role === 'coach' && (
          <Link href="/allenatore" className="btn btn-secondary">
            <Plus size={18} />
            Crea allenamento
          </Link>
        )}
      </div>
      {workouts.length > 0 && (
        <section>
          <h2 className="list-heading">I tuoi programmi</h2>
          <div className="workout-grid">
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="list-heading">
          {workouts.length ? 'Altri programmi' : 'Da dove vuoi partire?'}
        </h2>
        <div className="workout-grid">
          {defaultWorkouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      </section>
      <p className="quiet-note">
        <ShieldCheck size={18} />
        Prima impari il movimento con l’allenatore, poi lo ripeti a casa.
      </p>
    </div>
  );
}

export function WorkoutDetail({ id }: { id: string }) {
  const { workouts, preferences, active, setActive } = useStore();
  const [approved, setApproved] = useState(false);
  const router = useRouter();
  const workout = [...defaultWorkouts, ...workouts].find((w) => w.id === id);
  if (!workout)
    return (
      <div className="empty-state">
        <h1>Allenamento non trovato</h1>
        <p>I programmi personalizzati sono sul dispositivo dove li hai salvati.</p>
        <Link href="/allenamenti" className="btn btn-primary">
          Torna agli allenamenti
        </Link>
      </div>
    );
  const advanced = workout.exercises.some(
    (e) => exerciseById[e.exerciseId]?.difficulty === 'advanced',
  );

  return (
    <div className="workout-detail-page">
      <Link href="/allenamenti" className="back-link">
        <ArrowLeft size={19} />
        Allenamenti
      </Link>
      <div className="page-heading">
        <div>
          <h1>{workout.name}</h1>
          <div className="today-meta">
            <span>
              <Clock3 size={18} />
              {Math.round(estimateWorkoutSeconds(workout) / 60)} minuti circa
            </span>
            <span>
              {workout.exercises.length} esercizi · {workout.rounds} giri
            </span>
          </div>
        </div>
        {preferences.role === 'coach' && (
          <Link href={`/allenatore?edit=${id}`} className="btn btn-secondary">
            Personalizza
          </Link>
        )}
      </div>
      <section className="ready-card panel" aria-labelledby="ready-title">
        <h2 id="ready-title">Pronto? Basta poco.</h2>
        <ul className="ready-list">
          <li>
            <Check size={18} />
            Uno spazio libero e un pavimento stabile.
          </li>
          <li>
            <Check size={18} />
            Un po’ d’acqua vicino a te.
          </li>
          <li>
            <Check size={18} />
            Segui il timer. Il riscaldamento è già incluso.
          </li>
        </ul>
        {advanced && (
          <div className="alert">
            <strong>Questo programma include salti avanzati.</strong>
            <p>
              Falli solo se li hai già imparati con l’allenatore. In alternativa usa le varianti
              senza salto.
            </p>
          </div>
        )}
        {active ? (
          <>
            <p>
              Hai già un allenamento {active.finished ? 'da salvare' : 'in corso'}. Prima di
              iniziarne un altro, torna a quello.
            </p>
            <Link href={`/allenamento/${active.workout.id}`} className="btn btn-primary full-width">
              {active.finished ? 'Salva il risultato' : 'Riprendi allenamento'}
            </Link>
          </>
        ) : (
          <>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />
              <span>Ho concordato questo programma con il mio allenatore.</span>
            </label>
            <button
              className="btn btn-primary full-width"
              disabled={!approved}
              onClick={() => {
                if (!approved || active) return;
                if (preferences.sound) unlockSound();
                const now = Date.now();
                setActive(toggleRunning(startWorkout(workout, now, crypto.randomUUID()), now));
                router.push(`/allenamento/${workout.id}`);
              }}
            >
              <Play size={20} />
              Inizia allenamento
            </button>
          </>
        )}
        <p className="quiet-note">Se senti dolore, fermati.</p>
      </section>
      <section className="program-preview">
        <h2>Cosa farai</h2>
        <p className="muted">
          {Math.round(workout.warmupSeconds / 60)} minuti di riscaldamento, il circuito qui sotto e{' '}
          {Math.round(workout.cooldownSeconds / 60)} minuti per rallentare.
        </p>
        <div className="exercise-sequence">
          {workout.exercises.map((item, i) => {
            const e = exerciseById[item.exerciseId];
            return (
              <div key={item.id}>
                <span className="sequence-num">{i + 1}</span>
                <Link href={`/esercizi/${e.slug}`}>
                  <strong>{e.name}</strong>
                  <small>
                    {item.sets > 1 ? `${item.sets} serie · ` : ''}
                    {doseLabel(item.dose)}
                  </small>
                </Link>
              </div>
            );
          })}
        </div>
        <p className="quiet-note">
          Ripeti il circuito {workout.rounds} volte. L’app ti guiderà anche nelle pause.
        </p>
      </section>
      <details className="disclosure panel">
        <summary>Riscaldamento, recuperi e altri dettagli</summary>
        <div className="disclosure-body">
          <h3>Riscaldamento</h3>
          <p>{workout.warmupInstructions}</p>
          <h3>Tra i giri</h3>
          <p>
            Recupera {workout.roundRestSeconds} secondi, o più se ti serve. Le pause tra gli
            esercizi appaiono nel timer.
          </p>
          <h3>Recupero finale</h3>
          <p>{workout.cooldownInstructions}</p>
          <p>
            La durata è una stima e include i cambi di posizione. Puoi mettere in pausa in qualsiasi
            momento.
          </p>
        </div>
      </details>
    </div>
  );
}
