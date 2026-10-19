'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Clock3, Play, Plus, Repeat2, ShieldCheck } from 'lucide-react';
import { defaultWorkouts } from '@/data/workouts';
import { exerciseById } from '@/data/exercises';
import { useStore } from '@/state/store';
import { doseLabel, estimateWorkoutSeconds } from '@/lib/workouts';
import { WorkoutCard } from './workout-card';
import { categories } from '@/lib/models';
export function WorkoutsView() {
  const workouts = useStore((s) => s.workouts);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ALLENATI CON INTENZIONE</span>
          <h1>
            Un piano per muoverti<span className="teal">.</span>
          </h1>
          <p>Scegli con l’allenatore il lavoro adatto alla tua giornata.</p>
        </div>
        <Link href="/allenatore" className="btn btn-secondary">
          <Plus size={18} />
          Crea allenamento
        </Link>
      </div>
      <h2 className="mb">I programmi di partenza</h2>
      <div className="workout-grid">
        {defaultWorkouts.map((w, i) => (
          <WorkoutCard key={w.id} workout={w} index={i} />
        ))}
      </div>
      <div className="section-heading">
        <h2>Dal tuo allenatore</h2>
        <span className="tag">Salvati su questo dispositivo</span>
      </div>
      {workouts.length ? (
        <div className="workout-grid">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Repeat2 size={30} />
          <h3>Spazio ai tuoi programmi</h3>
          <p>Gli allenamenti creati in modalità allenatore appariranno qui.</p>
          <Link href="/allenatore" className="text-link">
            Apri lo spazio allenatore →
          </Link>
        </div>
      )}
    </>
  );
}
export function WorkoutDetail({ id }: { id: string }) {
  const { workouts, preferences } = useStore();
  const [approved, setApproved] = useState(false);
  const workout = [...defaultWorkouts, ...workouts].find((w) => w.id === id);
  if (!workout)
    return (
      <div className="empty-state">
        <h1>Allenamento non trovato</h1>
        <p>
          Gli allenamenti personalizzati sono disponibili solo nel dispositivo su cui sono stati
          salvati.
        </p>
        <Link href="/allenamenti">Torna agli allenamenti</Link>
      </div>
    );
  const cats = [
    ...new Set(workout.exercises.flatMap((e) => exerciseById[e.exerciseId]?.categories ?? [])),
  ];
  return (
    <>
      <Link href="/allenamenti" className="back-link">
        <ArrowLeft size={17} />
        Tutti gli allenamenti
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{workout.custom ? 'IL TUO PROGRAMMA' : 'IL PROGRAMMA'}</span>
          <h1>{workout.name}</h1>
          <p>{workout.description}</p>
        </div>
        {preferences.role === 'coach' && (
          <Link href={`/allenatore?edit=${id}`} className="btn btn-secondary">
            Personalizza
          </Link>
        )}
      </div>
      <div className="detail-layout">
        <section>
          <div className="workout-overview panel">
            <span>
              <Clock3 />
              {Math.round(estimateWorkoutSeconds(workout) / 60)} minuti stimati
            </span>
            <span>
              <Repeat2 />
              {workout.rounds} giri
            </span>
            <span>{workout.exercises.length} esercizi</span>
          </div>
          <p className="small muted">
            Stima basata sul ritmo delle ripetizioni, entrambi i lati, tutte le posizioni, recuperi
            e 8 secondi per i cambi. Puoi recuperare più a lungo.
          </p>
          <div className="phase-card">
            <span className="phase-number">01</span>
            <div>
              <span className="eyebrow">{Math.round(workout.warmupSeconds / 60)} MINUTI</span>
              <h2>Riscaldamento</h2>
              <p>{workout.warmupInstructions}</p>
            </div>
          </div>
          <div className="section-heading">
            <h2>Il circuito</h2>
            <span className="tag">Ripeti {workout.rounds} volte</span>
          </div>
          <div className="exercise-sequence">
            {workout.exercises.map((item, i) => {
              const e = exerciseById[item.exerciseId];
              return (
                <div key={item.id}>
                  <span className="sequence-num">{String(i + 1).padStart(2, '0')}</span>
                  <Link href={`/esercizi/${e.slug}`}>
                    <strong>{e.name}</strong>
                    <small>
                      {item.sets} serie · {doseLabel(item.dose)}
                    </small>
                  </Link>
                  <span className="small muted">Recupero {item.restSeconds}s</span>
                </div>
              );
            })}
          </div>
          <p className="small muted">
            Recupero tra i giri: {workout.roundRestSeconds} secondi, più il cambio di posizione.
          </p>
          <div className="phase-card">
            <span className="phase-number">03</span>
            <div>
              <span className="eyebrow">{Math.round(workout.cooldownSeconds / 60)} MINUTI</span>
              <h2>Defaticamento</h2>
              <p>{workout.cooldownInstructions}</p>
            </div>
          </div>
        </section>
        <aside className="detail-aside">
          <div className="panel">
            <ShieldCheck className="teal" size={28} />
            <h2>Prima di iniziare</h2>
            <p>
              Trova uno spazio libero, una superficie stabile e tieni dell’acqua vicino. Niente
              attrezzatura da acquistare.
            </p>
            <div className="tag-list">
              {cats.map((c) => (
                <span key={c} className="tag">
                  {categories[c].short}
                </span>
              ))}
            </div>
            {workout.exercises.some(
              (e) => exerciseById[e.exerciseId]?.difficulty === 'advanced',
            ) && (
              <p className="alert">
                Contiene movimenti avanzati. Imparali con l’allenatore e scegli le varianti senza
                salto se non sei pronto.
              </p>
            )}
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />
              <span>Ho concordato questo programma e le varianti con il mio allenatore.</span>
            </label>
            {approved ? (
              <Link href={`/allenamento/${workout.id}`} className="btn btn-primary full-width">
                <Play size={18} />
                Inizia allenamento
              </Link>
            ) : (
              <button disabled className="btn btn-primary full-width">
                <Play size={18} />
                Inizia allenamento
              </button>
            )}
            <p className="small muted">
              Interrompi in caso di dolore. La qualità del gesto viene prima del numero di
              ripetizioni.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
