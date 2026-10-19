'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  Flag,
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';

import { exerciseMap } from '@/lib/workouts';
import { useStore } from '@/state/store';
import {
  advance,
  elapsed,
  endWorkout,
  previous,
  remaining,
  startWorkout,
  toggleRunning,
  toSession,
} from '@/lib/player';
import { doseLabel, expandWorkout, formatTime } from '@/lib/workouts';
import { unlockSound, beep } from '@/lib/audio';

import { YouTubePlayer } from './youtube-player';

export function WorkoutPlayer({ id }: { id: string }) {
  const { active, setActive, workouts, saveSession, preferences, setPreferences, exercises } =
    useStore();
  const exerciseById = { ...exerciseMap(exercises), ...active?.catalog };
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [approved, setApproved] = useState(false);
  const [saved, setSaved] = useState<'saved' | 'discarded' | null>(null);
  const workout =
    workouts.find((w) => w.id === id) ?? (active?.workout.id === id ? active.workout : undefined);
  function begin() {
    if (!workout) return;
    unlockSound();
    setActive(toggleRunning(startWorkout(workout, now, crypto.randomUUID(), exerciseById), now));
  }
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 200);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  useEffect(() => {
    if (!active || active.finished || !active.running) return;
    const step = expandWorkout(active.workout, { ...exerciseMap(exercises), ...active.catalog })[
      active.index
    ];
    if ((step.kind !== 'exercise' || step.dose?.mode === 'time') && remaining(active, now) <= 0) {
      if (preferences.sound) beep();
      setActive(advance(active, now));
    }
  }, [active, now, preferences.sound, setActive, exercises]);

  if (saved)
    return (
      <div className="completion empty-state">
        <span className="completion-icon">
          <Check size={38} />
        </span>
        <h1>{saved === 'saved' ? 'Allenamento salvato!' : 'Sessione scartata'}</h1>
        <p>Ora bevi un po’ d’acqua e recupera.</p>
        <Link className="btn btn-primary" href="/">
          Torna alla Home
        </Link>
        <Link href="/progressi" className="text-link">
          Guarda i tuoi progressi
        </Link>
      </div>
    );
  if (!workout)
    return (
      <div className="empty-state">
        <h1>Programma non disponibile</h1>
        <Link href="/allenamenti" className="btn btn-primary">
          Scegli un allenamento
        </Link>
      </div>
    );
  if (!active || active.workout.id !== id)
    return (
      <div className="player-start panel">
        <Waves size={36} />
        <h1>{workout.name}</h1>
        {active ? (
          <>
            <p>Prima di iniziare un altro programma, termina o salva quello in corso.</p>
            <Link href={`/allenamento/${active.workout.id}`} className="btn btn-primary">
              Riprendi allenamento
            </Link>
          </>
        ) : (
          <>
            <p>Cominciamo dal riscaldamento. Poi ti guidiamo un esercizio alla volta.</p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />
              <span>Ho concordato questo programma con il mio allenatore.</span>
            </label>
            <button className="btn btn-primary full-width" disabled={!approved} onClick={begin}>
              <Play size={20} />
              Inizia allenamento
            </button>
          </>
        )}
        <Link className="text-link" href={`/allenamenti/${id}`}>
          Guarda il programma
        </Link>
      </div>
    );

  const steps = expandWorkout(active.workout, { ...exerciseMap(exercises), ...active.catalog }),
    step = steps[active.index],
    ex = step.exerciseId ? exerciseById[step.exerciseId] : undefined;
  const result = toSession(active, now);
  const completed = active.progress.filter((p) => p.status === 'completed');
  const totalSets = steps.filter((s) => s.kind === 'exercise').length;
  const timed = step.kind !== 'exercise' || step.dose?.mode === 'time';
  const next = steps.slice(active.index + 1).find((s) => s.kind === 'exercise');
  const phase = step.kind === 'warmup' ? 0 : step.kind === 'cooldown' ? 2 : 1;
  const move = (skip = false) => {
    if (preferences.sound) beep();
    setActive(advance(active, Date.now(), skip));
  };
  const pauseOrResume = () => {
    unlockSound();
    setActive(toggleRunning(active, Date.now()));
  };
  if (active.finished)
    return (
      <div className="session-summary">
        <span className="completion-icon">
          <Check size={38} />
        </span>
        <h1>{result.completed ? 'Allenamento finito!' : 'Ti sei fermato. Va bene così.'}</h1>
        <p>{active.workout.name}</p>
        <div className="summary-stats">
          <div>
            <strong>{formatTime(result.durationSeconds)}</strong>
            <span>Tempo di allenamento</span>
          </div>
          <div>
            <strong>{new Set(completed.map((p) => p.exerciseId)).size}</strong>
            <span>Esercizi fatti</span>
          </div>
          <div>
            <strong>
              {completed.length} / {totalSets}
            </strong>
            <span>Serie completate</span>
          </div>
          <div>
            <strong>{active.progress.filter((p) => p.status === 'skipped').length}</strong>
            <span>Serie saltate</span>
          </div>
        </div>
        <p className="muted">
          {result.completed
            ? 'Salva il risultato, poi prenditi una pausa.'
            : 'Puoi salvare quello che hai fatto. Lo troverai nei progressi come allenamento interrotto.'}
        </p>
        {saveError && (
          <p role="alert" className="alert">
            {saveError}
          </p>
        )}
        <button
          className="btn btn-primary full-width"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setSaveError('');
            try {
              await saveSession(toSession(active, Date.now()));
              setSaved('saved');
            } catch (error) {
              setSaveError(
                error instanceof Error ? error.message : 'Salvataggio non riuscito. Riprova.',
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <Check size={20} />
          Salva il risultato
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (window.confirm('Vuoi uscire senza salvare questo allenamento?')) {
              setActive(null);
              setSaved('discarded');
            }
          }}
        >
          Esci senza salvare
        </button>
      </div>
    );

  return (
    <div className="player">
      <div className="player-phase" aria-label="Fasi dell’allenamento">
        {['Riscaldamento', 'Esercizi', 'Recupero finale'].map((label, i) => (
          <span
            key={label}
            aria-current={phase === i ? 'step' : undefined}
            className={phase === i ? 'current' : phase > i ? 'done' : ''}
          >
            {phase > i ? <Check size={15} /> : <span>{i + 1}</span>}
            {label}
          </span>
        ))}
      </div>
      <div className="player-top">
        <span>{active.workout.name}</span>
        <button
          className="icon-button"
          aria-label={preferences.sound ? 'Disattiva segnali sonori' : 'Attiva segnali sonori'}
          aria-pressed={preferences.sound}
          onClick={() => {
            unlockSound();
            setPreferences({ sound: !preferences.sound });
          }}
        >
          {preferences.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>
      <div className="player-progress">
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Avanzamento allenamento"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={active.index}
        >
          <span style={{ width: `${(active.index / steps.length) * 100}%` }} />
        </div>
        <span>
          {step.round > 0 && phase === 1 ? `Giro ${step.round} di ${active.workout.rounds} · ` : ''}
          {completed.length} di {totalSets} serie fatte
        </span>
      </div>
      <section className={`player-stage ${step.kind === 'rest' ? 'rest-stage' : ''}`}>
        {!active.running && (
          <div className="paused-label" role="status">
            <Pause size={17} />
            In pausa
          </div>
        )}
        <h1 aria-live="polite">{step.title}</h1>
        {timed ? (
          <div className="timer-display" role="timer" aria-label="Tempo rimanente">
            {formatTime(remaining(active, now) / 1000)}
          </div>
        ) : (
          <div className="rep-display">
            <strong>{step.dose?.reps}</strong>
            <span>
              ripetizioni
              {step.dose?.sides === 2
                ? step.exerciseId === 'shoulder-circles'
                  ? ' per direzione'
                  : ' per lato'
                : ''}
              {step.dose && step.dose.positions > 1 ? ' per posizione (Y, T, W)' : ''}
            </span>
          </div>
        )}
        {timed && step.dose?.sides === 2 && (
          <p className="side-cue">
            {remaining(active, now) / 1000 > (step.dose.durationSeconds ?? 0)
              ? 'Primo lato'
              : 'Cambia: secondo lato'}{' '}
            · {step.dose.durationSeconds} secondi per lato
          </p>
        )}
        {step.kind === 'rest' ? (
          <>
            <p>Respira e recupera. Il prossimo esercizio parte quando finisce il timer.</p>
            {next && (
              <div className="next-exercise">
                <span>Tra poco</span>
                <strong>{next.title}</strong>
                <small>{doseLabel(next.dose!)}</small>
              </div>
            )}
          </>
        ) : ex ? (
          <>
            <p className="movement-cue">
              {ex.instructions[1] ??
                ex.instructions[0] ??
                'Segui la dimostrazione e le indicazioni del tuo allenatore.'}
            </p>
            {ex.categories.includes('esplosivita') && (
              <p className="player-safety">
                Atterra piano, piega le ginocchia e tienile in linea con i piedi. Se perdi il
                controllo, fermati e recupera.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="phase-instructions">{step.text}</p>
          </>
        )}
        <div className="player-primary-controls">
          {step.kind === 'exercise' && !timed && active.running ? (
            <>
              <button className="btn btn-primary full-width" onClick={() => move()}>
                <Check size={22} />
                Ho finito
              </button>
              <button className="btn btn-secondary full-width" onClick={pauseOrResume}>
                <Pause size={19} />
                Pausa
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn ${active.running ? 'btn-secondary' : 'btn-primary'} full-width`}
                onClick={pauseOrResume}
              >
                {active.running ? <Pause size={20} /> : <Play size={20} />}
                {active.running ? 'Pausa' : 'Riprendi'}
              </button>
              {timed && active.running && (
                <p className="auto-next-note">Il timer ti porta alla fase successiva.</p>
              )}
            </>
          )}
        </div>
        {step.kind === 'rest' && (
          <button className="btn btn-ghost" onClick={() => move()}>
            Salta recupero
            <SkipForward size={17} />
          </button>
        )}
      </section>
      {ex && (
        <div className="player-help">
          <details className="disclosure panel">
            <summary>Come si fa? Guarda i passaggi</summary>
            <ol className="instruction-list">
              {ex.instructions.map((instruction, i) => (
                <li key={instruction}>
                  <span>{i + 1}</span>
                  <p>{instruction}</p>
                </li>
              ))}
            </ol>
            <div className="easier-box">
              <h3>Se è troppo difficile</h3>
              <p>{ex.easierVariation}</p>
            </div>
            {ex.safetyNotes.map((n) => (
              <p className="small muted" key={n}>
                {n}
              </p>
            ))}
            {ex.prerequisites.length > 0 && (
              <>
                <h3>Prima di provarlo</h3>
                <ul>
                  {ex.prerequisites.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </>
            )}
          </details>
          <details className="disclosure panel">
            <summary>Vuoi vedere una dimostrazione?</summary>
            <YouTubePlayer key={ex.id} exercise={ex} />
          </details>
        </div>
      )}
      <details className="disclosure player-options">
        <summary>Altre opzioni</summary>
        <div className="player-secondary-controls">
          <button
            className="btn btn-secondary"
            disabled={active.index === 0}
            onClick={() => setActive(previous(active, Date.now()))}
          >
            <ChevronLeft size={18} />
            Esercizio precedente
          </button>
          <button className="btn btn-secondary" onClick={() => move(step.kind === 'exercise')}>
            <SkipForward size={18} />
            {step.kind === 'rest'
              ? 'Salta questa pausa'
              : step.kind === 'exercise'
                ? 'Salta esercizio'
                : 'Salta fase'}
          </button>
          {step.kind === 'exercise' && timed && (
            <button className="btn btn-secondary" disabled={!active.running} onClick={() => move()}>
              Termina la tenuta
            </button>
          )}
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (active.running) setActive(toggleRunning(active, Date.now()));
              setConfirmEnd(true);
            }}
          >
            <Flag size={18} />
            Termina allenamento
          </button>
        </div>
        <p className="muted small">
          Tempo di allenamento: {formatTime(elapsed(active, now) / 1000)}
        </p>
      </details>
      {confirmEnd && (
        <div className="confirm-row panel" role="alert">
          <h2>Vuoi fermarti qui?</h2>
          <p>Puoi salvare gli esercizi che hai già fatto.</p>
          <button
            className="btn btn-danger full-width"
            onClick={() => setActive(endWorkout(active, Date.now()))}
          >
            Sì, termina
          </button>
          <button
            className="btn btn-secondary full-width"
            onClick={() => {
              setConfirmEnd(false);
              setActive(toggleRunning(active, Date.now()));
            }}
          >
            Continua ad allenarti
          </button>
        </div>
      )}
    </div>
  );
}
