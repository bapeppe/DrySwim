'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/state/store';
import { AccessGate } from './access-gate';
import { distances, strokes, type SwimResult } from '@/lib/team-models';
import { parseSwimTime, formatSwimTime, groupSwimResults } from '@/lib/swim-times';
import { localDateKey } from '@/lib/workouts';
import { AthleteWorkouts } from './athlete-workouts';
export function Roster() {
  const { configured, athletes, saveAthlete } = useStore();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!configured) return <AccessGate />;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Allievi</h1>
          <p>Allenamenti e tempi, un allievo alla volta.</p>
        </div>
      </div>
      <form
        className="panel form-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const name = String(new FormData(form).get('name'));
          setBusy(true);
          try {
            await saveAthlete({ id: crypto.randomUUID(), displayName: name, archived: false });
            form.reset();
            setError('');
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Errore salvataggio');
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Aggiungi un allievo</h2>
        <label>
          Nome o nome breve
          <input name="name" required maxLength={80} />
        </label>
        <button disabled={busy} className="btn btn-primary">
          Aggiungi allievo
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
      <label className="mt">
        Cerca allievo
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="history-list">
        {athletes
          .filter((a) => a.displayName.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
          .map((a) => (
            <Link className="history-row" href={`/allievi/${a.id}`} key={a.id}>
              <div>
                <h2>{a.displayName}</h2>
                <p>{a.archived ? 'Archiviato' : 'Attivo'}</p>
              </div>
              <span>Apri →</span>
            </Link>
          ))}
      </div>
      {!athletes.length && (
        <p className="empty-state">
          Aggiungi il primo allievo per iniziare a registrare i suoi tempi.
        </p>
      )}
    </>
  );
}
export function SwimProgress({
  results,
  onEdit,
  onDelete,
}: {
  results: SwimResult[];
  onEdit?: (r: SwimResult) => void;
  onDelete?: (id: string) => void;
}) {
  const groups = groupSwimResults(results);
  return (
    <section className="mt">
      <h2>Tempi in vasca</h2>
      {!groups.length && (
        <p className="muted">
          Nessun tempo registrato. I risultati inseriti dall’allenatore compariranno qui.
        </p>
      )}
      {groups.map((g) => (
        <article className="panel mt" key={g.key}>
          <h3>{g.label}</h3>
          <p>
            Migliore: <strong>{formatSwimTime(g.best)}</strong>
            {g.items.length > 1 && (
              <>
                {' '}
                · Variazione dal primo all’ultimo:{' '}
                {g.improvement > 0 ? '−' : g.improvement < 0 ? '+' : ''}
                {(Math.abs(g.improvement) / 100).toFixed(2)} s
              </>
            )}
          </p>
          <ol className="swim-history">
            {g.items.map((r) => (
              <li key={r.id}>
                <div>
                  <time>{new Date(`${r.date}T12:00:00`).toLocaleDateString('it-IT')}</time>
                  <strong>{formatSwimTime(r.centiseconds)}</strong>
                  <small>{r.kind === 'race' ? 'Gara' : 'Allenamento'}</small>
                  {r.note && <p>{r.note}</p>}
                </div>
                {onEdit && (
                  <button className="btn btn-secondary" onClick={() => onEdit(r)}>
                    Modifica
                  </button>
                )}
                {onDelete && (
                  <button className="btn btn-ghost" onClick={() => onDelete(r.id)}>
                    Elimina
                  </button>
                )}
              </li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}
export function AthleteDetail({ id }: { id: string }) {
  const { configured, athletes, workouts, results, saveAthlete, saveResult, deleteResult } =
    useStore();
  const athlete = athletes.find((a) => a.id === id);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<SwimResult | null>(null);
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Operazione non riuscita.');
    } finally {
      setBusy(false);
    }
  }
  if (!configured) return <AccessGate />;
  if (!athlete)
    return (
      <div className="empty-state">
        <h1>Allievo non trovato</h1>
        <Link href="/allievi">Torna agli allievi</Link>
      </div>
    );
  return (
    <>
      <Link className="back-link" href="/allievi">
        ← Allievi
      </Link>
      <div className="page-heading">
        <div>
          <h1>{athlete.displayName}</h1>
          <p>
            {athlete.archived
              ? 'Allievo archiviato'
              : 'Allenamenti e tempi condivisi della squadra'}
          </p>
        </div>
      </div>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <AthleteWorkouts athlete={athlete} workouts={workouts} />
      {!athlete.archived && (
        <form
          key={editing?.id ?? 'new'}
          className="panel form-panel mt"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            void run(async () => {
              const centiseconds = parseSwimTime(String(data.get('time')));
              await saveResult({
                id: editing?.id ?? crypto.randomUUID(),
                athleteId: id,
                distance: Number(data.get('distance')),
                stroke: data.get('stroke') as SwimResult['stroke'],
                poolLength: Number(data.get('pool')) as 25 | 50,
                date: String(data.get('date')),
                centiseconds,
                kind: data.get('kind') as 'training' | 'race',
                note: String(data.get('note')),
              });
              setEditing(null);
              form.reset();
              setMessage('Tempo salvato.');
            });
          }}
        >
          <h2>{editing ? 'Modifica tempo' : 'Registra un tempo'}</h2>
          <div className="form-grid">
            <label>
              Distanza (metri)
              <select name="distance" defaultValue={editing?.distance ?? 100}>
                {distances.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label>
              Stile
              <select name="stroke" defaultValue={editing?.stroke ?? 'medley'}>
                {Object.entries(strokes).map(([id, label]) => (
                  <option value={id} key={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vasca
              <select name="pool" defaultValue={editing?.poolLength ?? 25}>
                <option value="25">25 metri</option>
                <option value="50">50 metri</option>
              </select>
            </label>
            <label>
              Data
              <input
                type="date"
                name="date"
                required
                defaultValue={editing?.date ?? localDateKey(new Date())}
              />
            </label>
            <label>
              Tempo
              <input
                name="time"
                required
                defaultValue={editing ? formatSwimTime(editing.centiseconds) : ''}
                placeholder="Es. 1.12 oppure 1:12.34"
              />
            </label>
            <label>
              Tipo
              <select name="kind" defaultValue={editing?.kind ?? 'training'}>
                <option value="training">Allenamento</option>
                <option value="race">Gara</option>
              </select>
            </label>
          </div>
          <p className="small muted">
            1.12 significa 1 minuto e 12 secondi. Per i centesimi scrivi 1:12.34.
          </p>
          <label>
            Nota (facoltativa)
            <input name="note" maxLength={300} defaultValue={editing?.note ?? ''} />
          </label>
          <button disabled={busy} className="btn btn-primary">
            Salva tempo
          </button>
          {editing && (
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
              Annulla modifica
            </button>
          )}
        </form>
      )}
      <SwimProgress
        results={results.filter((r) => r.athleteId === id)}
        onEdit={
          athlete.archived
            ? undefined
            : (r) => {
                setEditing(r);
                setMessage('');
              }
        }
        onDelete={(resultId) => {
          if (window.confirm('Eliminare questo tempo dallo storico?'))
            void run(() => deleteResult(resultId));
        }}
      />
      <details className="panel disclosure mt">
        <summary>Gestisci allievo</summary>
        <form
          className="form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            const displayName = String(new FormData(e.currentTarget).get('name'));
            void run(() => saveAthlete({ ...athlete, displayName }));
          }}
        >
          <label>
            Nome
            <input name="name" required maxLength={80} defaultValue={athlete.displayName} />
          </label>
          <button disabled={busy} className="btn btn-secondary">
            Aggiorna nome
          </button>
        </form>
        <button
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                athlete.archived
                  ? 'Riattivare l’allievo?'
                  : 'Archiviare l’allievo? Non apparirà fra gli allievi attivi; lo storico resterà conservato.',
              )
            )
              void run(() => saveAthlete({ ...athlete, archived: !athlete.archived }));
          }}
        >
          {athlete.archived ? 'Riattiva allievo' : 'Archivia allievo'}
        </button>
      </details>
    </>
  );
}
