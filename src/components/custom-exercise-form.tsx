'use client';
import { useState } from 'react';
import { categories, type ExerciseCategory } from '@/lib/models';
import { useStore } from '@/state/store';
export function CustomExerciseForm({ onSaved }: { onSaved: () => void }) {
  const { saveExercise } = useStore();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel form-panel mt"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
          await saveExercise({
            id: `custom-${crypto.randomUUID()}`,
            name: String(data.get('name')),
            mode: data.get('mode') as 'reps' | 'time',
            youtubeUrl: String(data.get('video')),
            category: data.get('category') as ExerciseCategory,
            difficulty: data.get('difficulty') as 'beginner' | 'intermediate' | 'advanced',
            instructions: String(data.get('instructions')),
          });
          onSaved();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Non è stato possibile salvare.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Nuovo esercizio</h2>
      <label>
        Nome dell’esercizio
        <input name="name" required maxLength={100} />
      </label>
      <label>
        Modalità
        <select name="mode">
          <option value="reps">Ripetizioni</option>
          <option value="time">A tempo</option>
        </select>
      </label>
      <label>
        Link del video YouTube
        <input type="url" name="video" required placeholder="https://www.youtube.com/watch?v=…" />
      </label>
      <p className="small muted">
        Scegli una dimostrazione adatta agli allievi e controlla che il video sia riproducibile.
      </p>
      <label>
        Categoria
        <select name="category">
          {Object.entries(categories).map(([id, c]) => (
            <option key={id} value={id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Difficoltà
        <select name="difficulty">
          <option value="beginner">Base</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzato</option>
        </select>
      </label>
      <label>
        Istruzioni per gli allievi (facoltative)
        <textarea name="instructions" maxLength={2500} placeholder="Un passaggio per riga" />
      </label>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      <button disabled={busy} className="btn btn-primary">
        {busy ? 'Salvataggio…' : 'Salva esercizio'}
      </button>
    </form>
  );
}
