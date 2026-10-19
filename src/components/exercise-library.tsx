'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Heart, Search, SlidersHorizontal, ExternalLink } from 'lucide-react';
import { exercises } from '@/data/exercises';
import { categories, difficultyLabels, type Exercise } from '@/lib/models';
import { doseLabel, filterExercises } from '@/lib/workouts';
import { useStore } from '@/state/store';
import { CategoryArt } from './visuals';
export function ExerciseCard({ exercise: e }: { exercise: Exercise }) {
  const { favorites, toggleFavorite } = useStore();
  return (
    <article className="exercise-card">
      <div className="exercise-image">
        <Link href={`/esercizi/${e.slug}`} aria-label={`Guarda ${e.name}`}>
          <CategoryArt category={e.categories[0]} />
        </Link>
        <button
          className={`favorite ${favorites.includes(e.id) ? 'selected' : ''}`}
          aria-label={`${favorites.includes(e.id) ? 'Rimuovi dai' : 'Aggiungi ai'} preferiti: ${e.name}`}
          aria-pressed={favorites.includes(e.id)}
          onClick={() => toggleFavorite(e.id)}
        >
          <Heart size={19} fill={favorites.includes(e.id) ? 'currentColor' : 'none'} />
        </button>
        <span className="exercise-video-label">
          <ExternalLink size={12} />
          {e.youtubeVideoId ? 'Video disponibile' : 'Ricerca video'}
        </span>
      </div>
      <div className="exercise-card-body">
        <div className="exercise-tags">
          <span className="eyebrow" style={{ color: categories[e.categories[0]].color }}>
            {e.categories.map((c) => categories[c].short).join(' · ')}
          </span>
          <span className="tag">{difficultyLabels[e.difficulty]}</span>
        </div>
        <h3>
          <Link href={`/esercizi/${e.slug}`}>{e.name}</Link>
        </h3>
        <p>{e.muscleGroups.join(' · ')}</p>
        <div className="exercise-card-footer">
          <span>
            {e.defaultSets} serie · {doseLabel(e.dose)}
          </span>
          <Link href={`/esercizi/${e.slug}`} aria-label={`Guarda esercizio ${e.name}`}>
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function ExerciseLibrary() {
  const [query, setQuery] = useState(''),
    [category, setCategory] = useState(''),
    [difficulty, setDifficulty] = useState(''),
    [muscle, setMuscle] = useState(''),
    [equipment, setEquipment] = useState(''),
    [onlyFavorites, setOnlyFavorites] = useState(false);
  const favorites = useStore((s) => s.favorites);
  const filtered = filterExercises(
    query,
    category,
    difficulty,
    muscle,
    equipment,
    onlyFavorites ? favorites : undefined,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LA TECNICA PRIMA DI TUTTO</span>
          <h1>
            La tua libreria<span className="teal">.</span>
          </h1>
          <p>Conosci ogni movimento. Trova la variante che fa per te.</p>
        </div>
        <span className="count-badge">52 esercizi · 7 categorie</span>
      </div>
      <div className="filter-panel panel">
        <div className="search-row">
          <label className="search-field">
            <Search size={20} />
            <input
              aria-label="Cerca un esercizio"
              placeholder="Cerca un esercizio…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            className={`btn ${onlyFavorites ? 'btn-primary' : 'btn-secondary'}`}
            aria-pressed={onlyFavorites}
            onClick={() => setOnlyFavorites(!onlyFavorites)}
          >
            <Heart size={18} />
            Preferiti
          </button>
        </div>
        <div className="category-filters">
          <button className={!category ? 'selected' : ''} onClick={() => setCategory('')}>
            Tutti
          </button>
          {Object.entries(categories).map(([id, c]) => (
            <button
              className={category === id ? 'selected' : ''}
              key={id}
              onClick={() => setCategory(id)}
            >
              {c.short}
            </button>
          ))}
        </div>
        <div className="filter-selects">
          <SlidersHorizontal size={17} />
          <label>
            <span className="sr-only">Difficoltà</span>
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
            <span className="sr-only">Gruppo muscolare</span>
            <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
              <option value="">Tutti i muscoli</option>
              {[...new Set(exercises.flatMap((e) => e.muscleGroups))].sort().map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Attrezzatura</span>
            <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
              <option value="">Ogni attrezzatura</option>
              {[...new Set(exercises.flatMap((e) => e.equipment))].sort().map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <span className="filter-sort">Ordine: A → Z</span>
        </div>
      </div>
      <div className="results-label" role="status">
        {filtered.length} esercizi trovati
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
          <h2>Nessun movimento trovato</h2>
          <p>Prova un altro nome o rimuovi qualche filtro.</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setQuery('');
              setCategory('');
              setDifficulty('');
              setMuscle('');
              setEquipment('');
              setOnlyFavorites(false);
            }}
          >
            Reimposta filtri
          </button>
        </div>
      )}
    </>
  );
}
