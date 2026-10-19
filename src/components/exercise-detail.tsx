'use client';
import Link from 'next/link';
import { ArrowLeft, Heart, Plus, ShieldCheck, Waves } from 'lucide-react';
import { type Exercise, categories, difficultyLabels } from '@/lib/models';
import { doseLabel } from '@/lib/workouts';
import { useStore } from '@/state/store';
import { YouTubePlayer } from './youtube-player';
export function ExerciseDetail({ exercise: e }: { exercise: Exercise }) {
  const { favorites, toggleFavorite, preferences } = useStore();
  return (
    <>
      <Link href="/esercizi" className="back-link">
        <ArrowLeft size={17} />
        Torna alla libreria
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{e.categories.map((c) => categories[c].name).join(' / ')}</span>
          <h1>{e.name}</h1>
          <p>{e.muscleGroups.join(' · ')}</p>
        </div>
        <button
          className="btn btn-secondary"
          aria-pressed={favorites.includes(e.id)}
          onClick={() => toggleFavorite(e.id)}
        >
          <Heart size={18} fill={favorites.includes(e.id) ? 'currentColor' : 'none'} />
          {favorites.includes(e.id) ? 'Salvato' : 'Salva esercizio'}
        </button>
      </div>
      <div className="detail-layout">
        <div>
          <YouTubePlayer exercise={e} />
          <section className="detail-section">
            <h2>Il movimento</h2>
            <p>{e.description}</p>
            <h3>Obiettivo</h3>
            <p>{e.objective}</p>
            <div className="benefit-box">
              <Waves size={25} />
              <div>
                <h3>Come aiuta il tuo nuoto</h3>
                {e.swimmingBenefits.map((b) => (
                  <p key={b}>{b}</p>
                ))}
              </div>
            </div>
          </section>
          <section className="detail-section">
            <h2>Un passo alla volta</h2>
            <ol className="instruction-list">
              {e.instructions.map((s, i) => (
                <li key={s}>
                  <span>{i + 1}</span>
                  <p>{s}</p>
                </li>
              ))}
            </ol>
          </section>
          <section className="detail-section">
            <h2>Attenzione a…</h2>
            {e.commonMistakes.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </section>
          <section className="variation-grid">
            <div className="panel">
              <span className="eyebrow">PER COMINCIARE</span>
              <h3>Una variante più semplice</h3>
              <p>{e.easierVariation}</p>
            </div>
            <div className="panel">
              <span className="eyebrow">QUANDO SEI PRONTO</span>
              <h3>Un passo in più</h3>
              <p>{e.harderVariation}</p>
              <small>Da concordare con l’allenatore.</small>
            </div>
          </section>
        </div>
        <aside className="detail-aside">
          <section className="panel">
            <span className="eyebrow">LA TUA SCHEDA</span>
            <h2>Qualità, prima di quantità.</h2>
            <dl className="dose-list">
              <div>
                <dt>Livello</dt>
                <dd>{difficultyLabels[e.difficulty]}</dd>
              </div>
              <div>
                <dt>Serie</dt>
                <dd>{e.defaultSets}</dd>
              </div>
              <div>
                <dt>Dosaggio</dt>
                <dd>{doseLabel(e.dose)}</dd>
              </div>
              <div>
                <dt>Recupero</dt>
                <dd>{e.restSeconds} secondi</dd>
              </div>
              <div>
                <dt>Occorrente</dt>
                <dd>{e.equipment.join(', ')}</dd>
              </div>
            </dl>
            <p className="muted small">
              Valori iniziali modificabili. Non sono un obiettivo obbligatorio.
            </p>
            {preferences.role === 'coach' ? (
              <Link href={`/allenatore?add=${e.id}`} className="btn btn-primary full-width">
                <Plus size={17} />
                Aggiungi a un allenamento
              </Link>
            ) : (
              <Link href="/allenatore" className="text-link">
                <Plus size={17} />
                Apri il builder allenatore
              </Link>
            )}
          </section>
          <section className="safety-card">
            <ShieldCheck size={24} />
            <h3>Allenati con cura</h3>
            {e.prerequisites.length > 0 && (
              <>
                <h4>Prima di cominciare</h4>
                <ul>
                  {e.prerequisites.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </>
            )}
            <ul>
              {e.safetyNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
