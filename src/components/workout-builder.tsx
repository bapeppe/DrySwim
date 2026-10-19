'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Edit3,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useStore } from '@/state/store';
import { defaultWorkouts } from '@/data/workouts';
import { exercises, exerciseById } from '@/data/exercises';
import { workoutSchema, type Workout } from '@/lib/models';
import { createWorkoutExercise, estimateWorkoutSeconds } from '@/lib/workouts';
const emptyWorkout = (): Workout => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  rounds: 2,
  roundRestSeconds: 75,
  warmupSeconds: 300,
  warmupInstructions:
    'Marcia, Cat-Cow, circonduzioni delle spalle e squat leggeri. Aumenta gradualmente l’ampiezza.',
  cooldownSeconds: 180,
  cooldownInstructions: 'Stretch leggero e respirazione tranquilla, senza forzare le posizioni.',
  exercises: [],
  custom: true,
  targetAthleteIds: [],
});
export function WorkoutBuilder({ editId, addId }: { editId?: string; addId?: string }) {
  const { preferences, setPreferences, workouts, saveWorkout, deleteWorkout } = useStore();
  const [draft, setDraft] = useState<Workout>(() => {
    const found = [...workouts, ...defaultWorkouts].find((w) => w.id === editId);
    const w = found ? structuredClone(found) : emptyWorkout();
    if (found && !found.custom) {
      w.id = crypto.randomUUID();
      w.name = `${w.name} · personalizzato`;
    }
    w.custom = true;
    if (addId && exerciseById[addId]) w.exercises.push(createWorkoutExercise(addId));
    return w;
  });
  const [selected, setSelected] = useState(addId ?? 'squat'),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const patch = (value: Partial<Workout>) => {
    setDraft((d) => ({ ...d, ...value }));
    setMessage('');
  };
  const updateItem = (index: number, value: Partial<Workout['exercises'][number]>) =>
    patch({ exercises: draft.exercises.map((e, i) => (i === index ? { ...e, ...value } : e)) });
  const reorder = (index: number, offset: number) => {
    const items = [...draft.exercises];
    [items[index], items[index + offset]] = [items[index + offset], items[index]];
    patch({ exercises: items });
  };
  if (preferences.role !== 'coach')
    return (
      <div className="coach-gate panel">
        <ShieldCheck size={42} />
        <span className="eyebrow">SPAZIO ALLENATORE</span>
        <h1>Costruisci il prossimo passo.</h1>
        <p>Crea programmi, adatta dosi e recuperi, scegli le varianti per i tuoi atleti.</p>
        <div className="info-banner">
          <p>
            Questa modalità è locale e accessibile a chi usa il dispositivo. Non è un sistema di
            autenticazione o di autorizzazione. I programmi non vengono assegnati o condivisi
            automaticamente.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setPreferences({ role: 'coach' })}>
          Entra in modalità allenatore
        </button>
      </div>
    );
  function save() {
    const result = workoutSchema.safeParse(draft);
    if (!result.success) {
      setError(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · '));
      return;
    }
    if (result.data.exercises.some((e) => !exerciseById[e.exerciseId])) {
      setError('Un esercizio non è più disponibile.');
      return;
    }
    saveWorkout(result.data);
    setError('');
    setMessage('Allenamento salvato su questo dispositivo.');
  }
  let estimated = 0;
  try {
    estimated = estimateWorkoutSeconds(draft);
  } catch {}
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MODALITÀ ALLENATORE · LOCALE</span>
          <h1>
            Dai forma all’allenamento<span className="teal">.</span>
          </h1>
          <p>Adatta il programma al livello e alla giornata dei tuoi atleti.</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            if (
              !draft.name ||
              window.confirm('Aprire un nuovo programma? Le modifiche non salvate andranno perse.')
            ) {
              setDraft(emptyWorkout());
              setError('');
              setMessage('');
            }
          }}
        >
          <Plus size={18} />
          Nuovo
        </button>
      </div>
      <div className="info-banner">
        <ShieldCheck size={22} />
        <p>
          Modalità locale senza autenticazione. L’allenatore deve approvare tecnica, dosi e varianti
          prima dell’assegnazione. I dati rimangono su questo dispositivo.
        </p>
      </div>
      <div className="builder-layout">
        <div>
          <section className="panel form-panel">
            <h2>Il programma</h2>
            <label>
              Nome dell’allenamento
              <input
                maxLength={80}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Es. Stabilità per il gruppo junior"
              />
            </label>
            <label>
              Descrizione
              <textarea
                maxLength={600}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Obiettivo e indicazioni per gli atleti"
              />
            </label>
            <div className="form-grid">
              <label>
                Numero di giri
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={draft.rounds}
                  onChange={(e) => patch({ rounds: Number(e.target.value) })}
                />
              </label>
              <label>
                Recupero tra i giri (sec)
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={draft.roundRestSeconds}
                  onChange={(e) => patch({ roundRestSeconds: Number(e.target.value) })}
                />
              </label>
            </div>
            <h3>Prima e dopo il circuito</h3>
            <div className="form-grid">
              <label>
                Riscaldamento (secondi)
                <input
                  type="number"
                  min={60}
                  max={900}
                  value={draft.warmupSeconds}
                  onChange={(e) => patch({ warmupSeconds: Number(e.target.value) })}
                />
              </label>
              <label>
                Defaticamento (secondi)
                <input
                  type="number"
                  min={60}
                  max={600}
                  value={draft.cooldownSeconds}
                  onChange={(e) => patch({ cooldownSeconds: Number(e.target.value) })}
                />
              </label>
            </div>
            <label>
              Istruzioni riscaldamento
              <textarea
                value={draft.warmupInstructions}
                onChange={(e) => patch({ warmupInstructions: e.target.value })}
              />
            </label>
            <label>
              Istruzioni defaticamento
              <textarea
                value={draft.cooldownInstructions}
                onChange={(e) => patch({ cooldownInstructions: e.target.value })}
              />
            </label>
          </section>
          <section className="panel form-panel mt">
            <div className="section-title">
              <h2>Il circuito</h2>
              <span className="tag">{draft.exercises.length} esercizi</span>
            </div>
            <div className="add-exercise-row">
              <label className="grow">
                <span className="sr-only">Seleziona esercizio</span>
                <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                  {[...exercises]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="btn btn-primary"
                onClick={() =>
                  patch({ exercises: [...draft.exercises, createWorkoutExercise(selected)] })
                }
              >
                <Plus size={18} />
                Aggiungi
              </button>
            </div>
            {!draft.exercises.length && (
              <div className="empty-state compact">
                <p>Scegli il primo esercizio per iniziare.</p>
              </div>
            )}
            {draft.exercises.map((item, i) => {
              const ex = exerciseById[item.exerciseId];
              return (
                <div className="builder-exercise" key={item.id}>
                  <div className="builder-exercise-title">
                    <span className="sequence-num">{i + 1}</span>
                    <Link href={`/esercizi/${ex.slug}`}>
                      <strong>{ex.name}</strong>
                    </Link>
                    <div className="reorder-buttons">
                      <button
                        className="icon-button"
                        disabled={i === 0}
                        aria-label={`Sposta su ${ex.name}`}
                        onClick={() => reorder(i, -1)}
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        className="icon-button"
                        disabled={i === draft.exercises.length - 1}
                        aria-label={`Sposta giù ${ex.name}`}
                        onClick={() => reorder(i, 1)}
                      >
                        <ArrowDown size={17} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label={`Rimuovi ${ex.name}`}
                        onClick={() =>
                          patch({ exercises: draft.exercises.filter((_, n) => n !== i) })
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                  <div className="dose-inputs">
                    <label>
                      Serie
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={item.sets}
                        onChange={(e) => updateItem(i, { sets: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      Modalità
                      <select
                        value={item.dose.mode}
                        onChange={(e) =>
                          updateItem(i, {
                            dose: {
                              ...item.dose,
                              mode: e.target.value as 'reps' | 'time',
                              reps: item.dose.reps ?? 10,
                              durationSeconds: item.dose.durationSeconds ?? 20,
                            },
                          })
                        }
                      >
                        <option value="reps">Ripetizioni</option>
                        <option value="time">A tempo</option>
                      </select>
                    </label>
                    <label>
                      {item.dose.mode === 'time' ? 'Durata (sec)' : 'Ripetizioni'}
                      <input
                        type="number"
                        min={item.dose.mode === 'time' ? 5 : 1}
                        max={item.dose.mode === 'time' ? 600 : 100}
                        value={
                          item.dose.mode === 'time' ? item.dose.durationSeconds : item.dose.reps
                        }
                        onChange={(e) =>
                          updateItem(i, {
                            dose: {
                              ...item.dose,
                              [item.dose.mode === 'time' ? 'durationSeconds' : 'reps']: Number(
                                e.target.value,
                              ),
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      Recupero (sec)
                      <input
                        type="number"
                        min={0}
                        max={300}
                        value={item.restSeconds}
                        onChange={(e) => updateItem(i, { restSeconds: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      Lati / direzioni
                      <select
                        value={item.dose.sides}
                        onChange={(e) =>
                          updateItem(i, {
                            dose: { ...item.dose, sides: Number(e.target.value) as 1 | 2 },
                          })
                        }
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </label>
                    <label>
                      Posizioni
                      <input
                        type="number"
                        min={1}
                        max={3}
                        value={item.dose.positions}
                        onChange={(e) =>
                          updateItem(i, {
                            dose: { ...item.dose, positions: Number(e.target.value) },
                          })
                        }
                      />
                    </label>
                    <label>
                      Sec / ripetizione
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={item.dose.secondsPerRep}
                        onChange={(e) =>
                          updateItem(i, {
                            dose: { ...item.dose, secondsPerRep: Number(e.target.value) },
                          })
                        }
                      />
                    </label>
                  </div>
                  {ex.categories.includes('esplosivita') && item.restSeconds < 60 && (
                    <p className="alert small">
                      Per i salti prevedi almeno 60–90 secondi di recupero e aumenta se necessario.
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        </div>
        <aside className="detail-aside">
          <section className="panel builder-summary">
            <span className="eyebrow">IL QUADRO COMPLETO</span>
            <h2>
              {estimated ? Math.round(estimated / 60) : 0}
              <small>minuti stimati</small>
            </h2>
            <p>
              {draft.exercises.length} esercizi · {draft.rounds} giri
            </p>
            <p className="small muted">
              Comprende lati, posizioni, serie, recuperi e transizioni. La durata reale dipende dal
              ritmo dell’atleta.
            </p>
            {error && (
              <p role="alert" className="alert">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="success-message">
                <Check size={16} />
                {message}
              </p>
            )}
            <button className="btn btn-primary full-width" onClick={save}>
              <Save size={18} />
              Salva allenamento
            </button>
            {workouts.some((w) => w.id === draft.id) && (
              <Link href={`/allenamenti/${draft.id}`} className="btn btn-secondary full-width mt">
                Apri programma
              </Link>
            )}
          </section>
          <section className="panel mt">
            <h3>I tuoi programmi</h3>
            {workouts.length === 0 ? (
              <p className="muted small">Nessun programma personalizzato salvato.</p>
            ) : (
              workouts.map((w) => (
                <div className="saved-workout" key={w.id}>
                  <strong>{w.name}</strong>
                  <div>
                    <button
                      className="icon-button"
                      aria-label={`Modifica ${w.name}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            'Aprire il programma? Le modifiche non salvate andranno perse.',
                          )
                        ) {
                          setDraft(structuredClone(w));
                          setMessage('');
                          setError('');
                        }
                      }}
                    >
                      <Edit3 size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Duplica ${w.name}`}
                      onClick={() => {
                        const copy = {
                          ...structuredClone(w),
                          id: crypto.randomUUID(),
                          name: `${w.name} · copia`.slice(0, 80),
                          exercises: w.exercises.map((e) => ({ ...e, id: crypto.randomUUID() })),
                        };
                        saveWorkout(copy);
                        setDraft(copy);
                        setMessage('Copia salvata.');
                      }}
                    >
                      <Copy size={17} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`Elimina ${w.name}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Eliminare “${w.name}”? Lo storico delle sessioni sarà conservato.`,
                          )
                        ) {
                          deleteWorkout(w.id);
                          if (draft.id === w.id) setDraft(emptyWorkout());
                        }
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
          <section className="panel mt">
            <h3>Parti da un programma</h3>
            {defaultWorkouts.map((w) => (
              <button
                key={w.id}
                className="template-button"
                onClick={() => {
                  if (!draft.name || window.confirm('Sostituire la bozza con questo modello?'))
                    setDraft({
                      ...structuredClone(w),
                      id: crypto.randomUUID(),
                      custom: true,
                      name: `${w.name} · personalizzato`,
                    });
                }}
              >
                <Copy size={16} />
                {w.name}
              </button>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
