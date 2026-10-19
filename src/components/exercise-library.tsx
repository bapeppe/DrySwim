'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, Search, SlidersHorizontal } from 'lucide-react';
import { CustomExerciseForm } from './custom-exercise-form';
import { categories, difficultyLabels, type Exercise } from '@/lib/models';
import { doseLabel, filterExercises } from '@/lib/workouts';
import { useStore } from '@/state/store';

export function ExerciseCard({ exercise: e }: { exercise: Exercise }) {
  const { favorites, toggleFavorite } = useStore();
  return (
    <article className="exercise-card">
      <div className="exercise-card-body">
        <h3>
          <Link href={`/esercizi/${e.slug}`}>{e.name}</Link>
        </h3>
        <p>
          {e.categories.map((c) => categories[c].short).join(' · ')}
          <span className="level-separator"> · </span>
          {difficultyLabels[e.difficulty]}
        </p>
        <span className="exercise-dose">{doseLabel(e.dose, e.id)}</span>
        <Link
          className="text-link"
          href={`/esercizi/${e.slug}`}
          aria-label={`Guarda esercizio ${e.name}`}
        >
          Come si fa
          <ArrowRight size={17} />
        </Link>
      </div>
      <button
        className={`favorite ${favorites.includes(e.id) ? 'selected' : ''}`}
        aria-label={`${favorites.includes(e.id) ? 'Rimuovi dai' : 'Aggiungi ai'} preferiti: ${e.name}`}
        aria-pressed={favorites.includes(e.id)}
        onClick={() => toggleFavorite(e.id)}
      >
        <Heart size={21} fill={favorites.includes(e.id) ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}
export function ExerciseLibrary({ startAdding = false }: { startAdding?: boolean }) {
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState(''),
    [difficulty, setDifficulty] = useState(''),
    [muscle, setMuscle] = useState(''),
    [equipment, setEquipment] = useState(''),
    [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { favorites, exercises, member } = useStore();
  const [adding, setAdding] = useState(startAdding);
  const filtered = filterExercises(
    query,
    category,
    difficulty,
    muscle,
    equipment,
    onlyFavorites ? favorites : undefined,
    exercises,
  );
  const filterCount = [category, difficulty, muscle, equipment].filter(Boolean).length;
  const reset = () => {
    setQuery('');
    setCategory('');
    setDifficulty('');
    setMuscle('');
    setEquipment('');
    setOnlyFavorites(false);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Esercizi</h1>
          <p>Non conosci un movimento? Cerca qui come farlo.</p>
        </div>
      </div>
      {member?.role === 'coach' && (
        <>
          <button className="btn btn-primary" onClick={() => setAdding(!adding)}>
            {adding ? 'Chiudi' : 'Aggiungi esercizio'}
          </button>
          {adding && <CustomExerciseForm onSaved={() => setAdding(false)} />}
        </>
      )}
      <div className="library-search">
        <label className="search-field">
          <Search size={21} />
          <input
            aria-label="Cerca un esercizio"
            placeholder="Cerca un esercizio"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="library-tools">
          <button
            className={`btn ${onlyFavorites ? 'btn-primary' : 'btn-secondary'}`}
            aria-pressed={onlyFavorites}
            onClick={() => setOnlyFavorites(!onlyFavorites)}
          >
            <Heart size={18} />
            Preferiti
          </button>
          <button
            className={`btn ${showFilters || filterCount ? 'btn-primary' : 'btn-secondary'}`}
            aria-expanded={showFilters}
            aria-controls="exercise-filters"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={18} />
            Filtri{filterCount > 0 ? ` (${filterCount})` : ''}
          </button>
          {filterCount > 0 && (
            <button className="btn btn-ghost" onClick={reset}>
              Azzera filtri
            </button>
          )}
        </div>
      </div>
      {showFilters && (
        <div id="exercise-filters" className="filter-panel panel">
          <div className="filter-selects">
            <label>
              Tipo di esercizio
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Tutti i tipi</option>
                {Object.entries(categories).map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Difficoltà
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="">Tutti i livelli</option>
                {Object.entries(difficultyLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Gruppo muscolare
              <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
                <option value="">Tutti i muscoli</option>
                {[...new Set(exercises.flatMap((e) => e.muscleGroups))].sort().map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label>
              Occorrente
              <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
                <option value="">Qualsiasi</option>
                {[...new Set(exercises.flatMap((e) => e.equipment))].sort().map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
          <button className="btn btn-secondary mt" onClick={() => setShowFilters(false)}>
            Mostra i risultati
          </button>
        </div>
      )}
      <div className="results-label" role="status">
        {filtered.length === 1 ? '1 esercizio trovato' : `${filtered.length} esercizi trovati`}
      </div>
      {filtered.length ? (
        <div className="exercise-grid">
          {filtered.map((e) => (
            <ExerciseCard key={e.id} exercise={e} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={32} />
          <h2>Nessun esercizio trovato</h2>
          <p>Prova un altro nome o togli qualche filtro.</p>
          <button className="btn btn-secondary" onClick={reset}>
            Mostra tutti gli esercizi
          </button>
        </div>
      )}
    </>
  );
}
