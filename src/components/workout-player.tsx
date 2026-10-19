'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  FastForward,
  Flag,
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { defaultWorkouts } from '@/data/workouts';
import { exerciseById } from '@/data/exercises';
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
import { YouTubePlayer } from './youtube-player';
let audioContext: AudioContext | undefined;
function unlockSound() {
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
  } catch {}
}
function beep() {
  try {
    if (!audioContext) return;
    const osc = audioContext.createOscillator(),
      gain = audioContext.createGain();
    gain.gain.value = 0.07;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 660;
    osc.start();
    osc.stop(audioContext.currentTime + 0.15);
  } catch {}
}
export function WorkoutPlayer({ id }: { id: string }) {
  const { active, setActive, workouts, saveSession, preferences, setPreferences } = useStore();
  const [now, setNow] = useState(() => Date.now()),
    [confirmEnd, setConfirmEnd] = useState(false),
    [saved, setSaved] = useState<'saved' | 'discarded' | null>(null);
  const workout =
    [...defaultWorkouts, ...workouts].find((w) => w.id === id) ??
    (active?.workout.id === id ? active.workout : undefined);
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
    const step = expandWorkout(active.workout)[active.index];
    if ((step.kind !== 'exercise' || step.dose?.mode === 'time') && remaining(active, now) <= 0) {
      if (preferences.sound) beep();
      setActive(advance(active, now));
    }
  }, [active, now, preferences.sound, setActive]);
  if (saved)
    return (
      <div className="completion empty-state">
        <span className="completion-icon">
          <Check size={42} />
        </span>
        <span className="eyebrow">UN ALTRO PASSO NEL TUO PERCORSO</span>
        <h1>{saved === 'saved' ? 'Sessione salvata.' : 'Sessione scartata.'}</h1>
        <p>Prenditi il tempo per recuperare. Ci vediamo al prossimo allenamento.</p>
        <Link className="btn btn-primary" href="/progressi">
          Guarda i tuoi progressi
        </Link>
        <Link href="/allenamenti" className="text-link">
          Torna agli allenamenti
        </Link>
      </div>
    );
  if (!workout)
    return (
      <div className="empty-state">
        <h1>Programma non disponibile</h1>
        <Link href="/allenamenti">Scegli un allenamento</Link>
      </div>
    );
  if (!active || active.workout.id !== id)
    return (
      <div className="player-start panel">
        <Waves size={40} />
        <span className="eyebrow">IL TUO SPAZIO, IL TUO RITMO</span>
        <h1>{workout.name}</h1>
        <p>
          Il riscaldamento viene prima. Premi Inizia quando sei pronto: i timer funzionano anche
          senza video.
        </p>
        {active ? (
          <>
            <p className="alert">
              Hai già una sessione in corso. Salvala o termina quella sessione prima di iniziarne
              un’altra.
            </p>
            <Link href={`/allenamento/${active.workout.id}`} className="btn btn-primary">
              Riprendi {active.workout.name}
            </Link>
          </>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => setActive(startWorkout(workout, Date.now(), crypto.randomUUID()))}
          >
            <Play size={18} />
            Prepara la sessione
          </button>
        )}
        <Link className="text-link" href={`/allenamenti/${id}`}>
          Torna al programma
        </Link>
      </div>
    );
  const steps = expandWorkout(active.workout),
    step = steps[active.index],
    ex = step.exerciseId ? exerciseById[step.exerciseId] : undefined;
  const result = toSession(active, now);
  const completed = active.progress.filter((p) => p.status === 'completed');
  const totalSets = steps.filter((s) => s.kind === 'exercise').length;
  const timed = step.kind !== 'exercise' || step.dose?.mode === 'time';
  const next = steps.slice(active.index + 1).find((s) => s.kind === 'exercise');
  const move = (skip = false) => {
    if (preferences.sound) beep();
    setActive(advance(active, Date.now(), skip));
  };
  if (active.finished)
    return (
      <div className="session-summary">
        <span className="completion-icon">
          <Check size={38} />
        </span>
        <span className="eyebrow">
          {result.completed ? 'ALLENAMENTO COMPLETATO' : 'SESSIONE INTERROTTA'}
        </span>
        <h1>{result.completed ? 'Ben fatto. Ora recupera.' : 'Ogni movimento conta.'}</h1>
        <p>{active.workout.name}</p>
        <div className="summary-stats">
          <div>
            <strong>{formatTime(result.durationSeconds)}</strong>
            <span>Tempo effettivo</span>
          </div>
          <div>
            <strong>{new Set(completed.map((p) => p.exerciseId)).size}</strong>
            <span>Esercizi eseguiti</span>
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
            ? 'Il risultato sarà aggiunto ai tuoi progressi.'
            : 'La sessione verrà conservata nello storico come interrotta, senza aumentare il conteggio degli allenamenti completati.'}
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            saveSession(toSession(active, Date.now()));
            setSaved('saved');
          }}
        >
          <Check size={18} />
          Salva il risultato
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (window.confirm('Eliminare questa sessione senza salvarla?')) {
              setActive(null);
              setSaved('discarded');
            }
          }}
        >
          Scarta sessione
        </button>
      </div>
    );
  return (
    <div className="player">
      <div className="player-top">
        <div>
          <span className="eyebrow">{active.workout.name}</span>
          <h1>
            {step.kind === 'exercise'
              ? `Giro ${step.round} di ${active.workout.rounds}`
              : step.kind === 'warmup'
                ? 'Prima il riscaldamento'
                : step.kind === 'cooldown'
                  ? 'Il momento di rallentare'
                  : 'Una pausa per ripartire'}
          </h1>
        </div>
        <button
          className="icon-button"
          aria-label={preferences.sound ? 'Disattiva segnali sonori' : 'Attiva segnali sonori'}
          aria-pressed={preferences.sound}
          onClick={() => {
            unlockSound();
            setPreferences({ sound: !preferences.sound });
          }}
        >
          {preferences.sound ? <Volume2 /> : <VolumeX />}
        </button>
      </div>
      <div className="player-progress">
        <div className="progress-track">
          <span style={{ width: `${(active.index / steps.length) * 100}%` }} />
        </div>
        <span>
          Fase {active.index + 1} / {steps.length} · {completed.length} serie completate
        </span>
      </div>
      <div className="player-layout">
        <div className={`player-stage ${step.kind === 'rest' ? 'rest-stage' : ''}`}>
          <span className="stage-label">
            {step.kind === 'exercise'
              ? `SERIE ${step.set} · ${doseLabel(step.dose!)}`
              : step.kind === 'rest'
                ? 'RECUPERO'
                : 'IL TUO TEMPO'}
          </span>
          <h2 aria-live="polite">{step.title}</h2>
          {timed ? (
            <div className="timer-display" role="timer" aria-label="Tempo rimanente">
              {formatTime(remaining(active, now) / 1000)}
            </div>
          ) : (
            <div className="rep-display">
              <strong>{step.dose?.reps}</strong>
              <span>
                ripetizioni{step.dose?.sides === 2 ? ' per lato / direzione' : ''}
                {step.dose?.positions !== 1 ? ` × ${step.dose?.positions} posizioni` : ''}
              </span>
            </div>
          )}
          {timed && step.dose?.sides === 2 && (
            <p className="side-cue">
              {remaining(active, now) / 1000 > (step.dose.durationSeconds ?? 0)
                ? 'Primo lato'
                : 'Secondo lato'}{' '}
              · {step.dose.durationSeconds}s per lato
            </p>
          )}
          <p>{ex ? ex.instructions[1] : step.text}</p>
          {ex && (
            <div className="player-simpler">
              <strong>Puoi semplificare</strong>
              <span>{ex.easierVariation}</span>
            </div>
          )}
          <div className="player-primary-controls">
            <button
              className="btn btn-secondary"
              onClick={() => {
                unlockSound();
                setActive(toggleRunning(active, Date.now()));
              }}
            >
              {active.running ? <Pause size={20} /> : <Play size={20} />}{' '}
              {active.running ? 'Pausa' : elapsed(active, now) > 0 ? 'Riprendi' : 'Inizia'}
            </button>
            {step.kind === 'exercise' && (
              <button disabled={!active.running} className="btn btn-primary" onClick={() => move()}>
                <Check size={20} />
                {timed ? 'Termina la tenuta' : 'Serie completata'}
              </button>
            )}
          </div>
          <div className="player-secondary-controls">
            <button
              className="btn btn-ghost"
              disabled={active.index === 0}
              onClick={() => setActive(previous(active, Date.now()))}
            >
              <ChevronLeft size={17} />
              Precedente
            </button>
            <button className="btn btn-ghost" onClick={() => move(step.kind === 'exercise')}>
              {step.kind === 'rest' ? <FastForward size={17} /> : <SkipForward size={17} />}{' '}
              {step.kind === 'rest'
                ? 'Salta recupero'
                : step.kind === 'exercise'
                  ? 'Salta esercizio'
                  : 'Salta fase'}
            </button>
          </div>
          <div className="player-clock">
            Tempo attivo della sessione: {formatTime(elapsed(active, now) / 1000)}
          </div>
        </div>
        <aside className="player-info">
          {ex ? (
            <>
              <YouTubePlayer key={ex.id} exercise={ex} />
              <details className="panel">
                <summary>Istruzioni e sicurezza</summary>
                <ol>
                  {ex.instructions.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ol>
                <p>{doseLabel(step.dose!)}</p>
                {ex.safetyNotes.map((n) => (
                  <p key={n} className="small">
                    {n}
                  </p>
                ))}
              </details>
            </>
          ) : (
            <div className="panel">
              <Waves size={35} />
              <h3>{step.kind === 'rest' ? 'Recupera davvero' : 'Muoviti con calma'}</h3>
              <p>{step.text}</p>
            </div>
          )}
          {next && (
            <div className="up-next">
              <span className="eyebrow">IL PROSSIMO MOVIMENTO</span>
              <strong>{next.title}</strong>
              <span>{doseLabel(next.dose!)}</span>
            </div>
          )}
          <p className="small muted">
            Recupero successivo:{' '}
            {steps[active.index + 1]?.kind === 'rest'
              ? `${steps[active.index + 1].durationSeconds} secondi`
              : 'segui la prossima fase'}
            . Se serve più tempo, metti in pausa.
          </p>
        </aside>
      </div>
      <div className="player-end">
        {confirmEnd ? (
          <div className="confirm-row" role="alert">
            <span>Terminare adesso? Potrai salvare la sessione parziale.</span>
            <button
              className="btn btn-danger"
              onClick={() => setActive(endWorkout(active, Date.now()))}
            >
              Sì, termina
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirmEnd(false)}>
              Continua
            </button>
          </div>
        ) : (
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (active.running) setActive(toggleRunning(active, Date.now()));
              setConfirmEnd(true);
            }}
          >
            <Flag size={16} />
            Termina allenamento
          </button>
        )}
      </div>
    </div>
  );
}
