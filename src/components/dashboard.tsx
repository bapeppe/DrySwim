'use client';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Flame,
  Play,
  TrendingUp,
  Waves,
} from 'lucide-react';
import { defaultWorkouts } from '@/data/workouts';
import { useStore } from '@/state/store';
import { estimateWorkoutSeconds, localDateKey, weekDays } from '@/lib/workouts';
import { WorkoutCard } from './workout-card';
import { SwimArt } from './visuals';
import { categories } from '@/lib/models';
export function Dashboard() {
  const { sessions, preferences } = useStore();
  const done = sessions.filter((s) => s.completed);
  const days = weekDays();
  const dayKeys = days.map(localDateKey);
  const week = done.filter((s) => dayKeys.includes(localDateKey(new Date(s.completedAt))));
  const count = new Set(week.map((s) => localDateKey(new Date(s.completedAt)))).size;
  const workout = defaultWorkouts[Math.max(0, Math.floor(((new Date().getDay() + 6) % 7) / 2)) % 3];
  const last = done.at(-1);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">IL TUO ALLENAMENTO A SECCO</div>
          <h1>
            La forza nasce
            <br className="mobile-break" /> fuori dall’acqua<span className="teal">.</span>
          </h1>
          <p>Muoviti con intenzione. Nuota con più consapevolezza.</p>
        </div>
        <span className="date-label">
          {new Date().toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
      </div>
      <div className="dashboard-grid">
        <section className="hero-card">
          <SwimArt />
          <div className="hero-shade" />
          <div className="hero-copy">
            <span className="hero-pill">
              <span />
              IL CONSIGLIO DI OGGI
            </span>
            <h2>{workout.name.replace(' & ', ' &\n')}</h2>
            <p>
              Un po’ di spazio. Il tuo corpo.
              <br />
              Il prossimo passo nel tuo percorso.
            </p>
            <div className="hero-meta">
              <span>
                <Clock3 size={17} />
                {Math.round(estimateWorkoutSeconds(workout) / 60)} minuti
              </span>
              <span>2 giri</span>
              <span>Nessun acquisto</span>
            </div>
            <Link href={`/allenamenti/${workout.id}`} className="btn btn-lime">
              <Play size={17} fill="currentColor" />
              Inizia allenamento
              <ArrowRight size={19} />
            </Link>
            <small>Da concordare con il tuo allenatore</small>
          </div>
          <div className="hero-caption">01 / IN ACQUA COMINCIA TUTTO. QUI SI COSTRUISCE.</div>
        </section>
        <section className="week-card panel">
          <div className="section-title">
            <h2>Una settimana alla volta</h2>
            <span className="tag">{count} giorni attivi</span>
          </div>
          <p>Trova il tuo ritmo, lasciando spazio al recupero.</p>
          <div className="week-days">
            {days.map((d) => {
              const key = localDateKey(d),
                trained = week.some((s) => localDateKey(new Date(s.completedAt)) === key);
              return (
                <div
                  key={key}
                  className={`week-day ${key === localDateKey(new Date()) ? 'today' : ''} ${trained ? 'trained' : ''}`}
                >
                  <span>
                    {d.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 1).toUpperCase()}
                  </span>
                  <strong>{d.getDate()}</strong>
                  <span className="day-check">{trained ? <Check size={12} /> : <span />}</span>
                </div>
              );
            })}
          </div>
          <div className="week-progress">
            <span>Presenza nella settimana</span>
            <strong>{count} / 7 giorni</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${(count / 7) * 100}%` }} />
          </div>
          <div className="rest-note">
            <Waves size={21} />
            <span>
              Il recupero fa parte dell’allenamento.
              <br />
              <strong>Segui il calendario del tuo allenatore.</strong>
            </span>
          </div>
        </section>
      </div>
      <section className="stat-grid" aria-label="I tuoi numeri">
        <div className="stat">
          <span className="stat-icon">
            <Flame size={20} />
          </span>
          <div>
            <span>Allenamenti completati</span>
            <strong>
              {done.length}
              <small>sessioni</small>
            </strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon blue">
            <Clock3 size={20} />
          </span>
          <div>
            <span>Tempo dedicato a te</span>
            <strong>
              {Math.floor(done.reduce((s, w) => s + w.durationSeconds, 0) / 60)}
              <small>minuti totali</small>
            </strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon purple">
            <TrendingUp size={20} />
          </span>
          <div>
            <span>Questa settimana</span>
            <strong>
              {week.length}
              <small>sessioni completate</small>
            </strong>
          </div>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">UN OBIETTIVO, UN MOVIMENTO ALLA VOLTA</span>
          <h2>Il tuo prossimo allenamento</h2>
        </div>
        <Link href="/allenamenti" className="text-link">
          Vedi tutti <ArrowRight size={17} />
        </Link>
      </div>
      <div className="workout-grid">
        {defaultWorkouts.map((w, i) => (
          <WorkoutCard key={w.id} workout={w} index={i} />
        ))}
      </div>
      <div className="dashboard-bottom">
        <Link href="/esercizi" className="library-callout">
          <span className="callout-icon">
            <Waves size={30} />
          </span>
          <div>
            <span className="eyebrow">CONOSCI IL MOVIMENTO</span>
            <h3>52 esercizi. Tante possibilità.</h3>
            <p>Esplora tecnica, varianti e consigli per nuotare meglio.</p>
          </div>
          <ArrowUpRight size={25} />
        </Link>
        <div className="last-session panel">
          <span className="eyebrow">L’ULTIMO PASSO</span>
          <h3>{last ? last.workoutName : 'Il tuo percorso inizia qui'}</h3>
          <p>
            {last
              ? `${new Date(last.completedAt).toLocaleDateString('it-IT')} · ${Math.round(last.durationSeconds / 60)} minuti`
              : 'Ancora nessuna sessione salvata. Prenditi il tuo tempo.'}
          </p>
          <Link className="text-link" href="/progressi">
            I tuoi progressi <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <div className="safety-strip">
        <Check size={17} />
        <p>
          {preferences.level === 'beginner' ? 'Parti dalle varianti base. ' : ''}Riscaldati, cura la
          tecnica e interrompi in caso di dolore. I dosaggi sono proposte da adattare con
          l’allenatore.
        </p>
        <span>{Object.keys(categories).length} aree di lavoro</span>
      </div>
    </>
  );
}
