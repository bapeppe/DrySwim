'use client';
import Link from 'next/link';
import { ArrowRight, Check, Clock3, Dumbbell, Play, Waves, Users, Plus } from 'lucide-react';
import { useStore } from '@/state/store';
import { estimateWorkoutSeconds, exerciseMap, localDateKey, weekDays } from '@/lib/workouts';
export function Dashboard() {
  const { sessions, active, workouts, member, user, configured, athletes, exercises } = useStore();
  const done = sessions.filter((s) => s.completed),
    days = weekDays();
  const week = done.filter((s) =>
    days.some((d) => localDateKey(d) === localDateKey(new Date(s.completedAt))),
  );
  const workout = workouts.find((w) => w.published);
  const coach = member?.role === 'coach';
  return (
    <div className="home-page">
      <div className="page-heading">
        <div>
          <h1>{coach ? 'La tua squadra, qui.' : 'Ciao! Ti va di allenarti?'}</h1>
          <p>
            {coach
              ? 'Crea i programmi e segui i progressi dei tuoi allievi.'
              : 'Qui trovi gli allenamenti proposti dal tuo allenatore.'}
          </p>
        </div>
      </div>
      {coach ? (
        <section className="today-card">
          <span className="section-kicker">{member.teamName}</span>
          <h2>
            {athletes.filter((a) => !a.archived).length} allievi ·{' '}
            {workouts.filter((w) => w.published).length} programmi pubblicati
          </h2>
          <p>
            Scegli esercizi, quantità e cicli. I programmi pubblicati appariranno ai tuoi allievi.
          </p>
          <Link href="/allenatore" className="btn btn-primary full-width">
            <Plus size={20} />
            Crea allenamento
            <ArrowRight size={20} />
          </Link>
          <Link href="/allievi" className="secondary-choice">
            Apri il registro allievi
          </Link>
        </section>
      ) : active ? (
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
            Tutti i tuoi allenamenti
          </Link>
        </section>
      ) : (
        <section className="today-card">
          <Users size={30} className="teal" />
          <h2>
            {!configured
              ? 'La squadra non è ancora attiva'
              : !user
                ? 'Entra nella tua squadra'
                : !member
                  ? 'Completa il tuo accesso'
                  : 'Gli allenamenti arriveranno qui'}
          </h2>
          <p>
            {!configured
              ? 'Il servizio condiviso deve essere attivato dall’amministratore. Puoi già esplorare gli esercizi.'
              : !user
                ? 'Accedi con il tuo account e usa l’invito ricevuto dall’allenatore.'
                : !member
                  ? 'Usa il codice di invito per collegarti al profilo preparato per te.'
                  : 'Il tuo allenatore non ha ancora pubblicato un programma per te. Intanto puoi conoscere i movimenti.'}
          </p>
          <Link
            href={!configured || member ? '/esercizi' : '/account'}
            className="btn btn-primary full-width"
          >
            {!configured || member
              ? 'Esplora gli esercizi'
              : !user
                ? 'Accedi alla squadra'
                : 'Usa il tuo invito'}
            <ArrowRight size={20} />
          </Link>
        </section>
      )}
      {member && !coach && (
        <>
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
              Anche il recupero conta: segui il piano dell’allenatore.
            </p>
          </section>
          <Link className="home-progress-link panel" href="/progressi">
            <span>
              <strong>I tuoi progressi, a secco e in acqua</strong>
              <small>{done.length} allenamenti completati</small>
            </span>
            <ArrowRight size={22} />
          </Link>
        </>
      )}
    </div>
  );
}
