'use client';

import Link from 'next/link';
import { ArrowLeft, Heart, Plus, ShieldCheck } from 'lucide-react';
import { type Exercise, categories, difficultyLabels } from '@/lib/models';
import { doseLabel } from '@/lib/workouts';
import { useStore } from '@/state/store';
import { YouTubePlayer } from './youtube-player';

export function ExerciseDetail({ exercise: e }: { exercise: Exercise }) {
  const { favorites, toggleFavorite, member } = useStore();
  return (
    <div className="exercise-detail-page">
      <Link href="/esercizi" className="back-link">
        <ArrowLeft size={19} />
        Esercizi
      </Link>
      <div className="page-heading">
        <div>
          <h1>{e.name}</h1>
          <p>
            {e.categories.map((c) => categories[c].short).join(' · ')} ·{' '}
            {difficultyLabels[e.difficulty]}
          </p>
        </div>
        <button
          className="icon-button favorite-toggle"
          aria-label={favorites.includes(e.id) ? 'Rimuovi dai preferiti' : 'Salva esercizio'}
          aria-pressed={favorites.includes(e.id)}
          onClick={() => toggleFavorite(e.id)}
        >
          <Heart size={22} fill={favorites.includes(e.id) ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="exercise-dose-panel panel">
        <strong>
          {e.defaultSets} serie · {doseLabel(e.dose, e.id)}
        </strong>
        <span>Recupera {e.restSeconds} secondi tra le serie.</span>
        <small>Adatta le quantità con il tuo allenatore.</small>
      </div>
      {e.prerequisites.length > 0 && (
        <section className="safety-card">
          <h2>
            <ShieldCheck size={22} />
            Prima di provarlo
          </h2>
          <ul>
            {e.prerequisites.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="detail-section">
        <h2>Come si fa</h2>
        {!e.instructions.length && (
          <p>
            Guarda il video scelto dall’allenatore e chiedigli una dimostrazione prima di provarlo.
          </p>
        )}
        <ol className="instruction-list">
          {e.instructions.map((s, i) => (
            <li key={s}>
              <span>{i + 1}</span>
              <p>{s}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="easier-box">
        <h2>Se è troppo difficile</h2>
        <p>{e.easierVariation}</p>
      </section>
      <div className="detail-section">
        <h2>Vuoi vedere il movimento?</h2>
        <YouTubePlayer exercise={e} />
      </div>
      <section className="disclosure panel">
        <details>
          <summary>Errori da evitare e sicurezza</summary>
          <div className="disclosure-body">
            <h3>Attenzione a…</h3>
            {e.commonMistakes.map((m) => (
              <p key={m}>{m}</p>
            ))}
            {e.safetyNotes.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
        </details>
      </section>
      <details className="disclosure panel">
        <summary>A cosa serve nel nuoto?</summary>
        <div className="disclosure-body">
          <p>{e.description}</p>
          <h3>Obiettivo</h3>
          <p>{e.objective}</p>
          {e.swimmingBenefits.map((b) => (
            <p key={b}>{b}</p>
          ))}
          <h3>Muscoli coinvolti</h3>
          <p>{e.muscleGroups.join(', ')}</p>
          <h3>Occorrente</h3>
          <p>{e.equipment.join(', ')}</p>
        </div>
      </details>
      <details className="disclosure panel">
        <summary>Una variante più impegnativa</summary>
        <div className="disclosure-body">
          <p>{e.harderVariation}</p>
          <p>Provala solo quando il tuo allenatore ti dà l’ok.</p>
        </div>
      </details>
      <p className="quiet-note">
        <ShieldCheck size={18} />
        Se senti dolore, fermati e parlane con l’allenatore.
      </p>
      {member?.role === 'coach' && (
        <Link href={`/allenatore?add=${e.id}`} className="btn btn-primary">
          <Plus size={18} />
          Aggiungi a un allenamento
        </Link>
      )}
    </div>
  );
}

export function ExerciseResolver({ slug }: { slug: string }) {
  const { exercises, hydrated } = useStore();
  const exercise = exercises.find((e) => e.slug === slug);
  if (!hydrated) return <p role="status">Caricamento esercizio…</p>;
  return exercise ? (
    <ExerciseDetail exercise={exercise} />
  ) : (
    <div className="empty-state">
      <h1>Esercizio non disponibile</h1>
      <Link href="/esercizi">Torna agli esercizi</Link>
    </div>
  );
}
