'use client';
import { useState } from 'react';
import { Check, Clock3, CalendarDays, TrendingUp, Waves } from 'lucide-react';
import { SwimProgress } from './roster';
import { AccessGate } from './access-gate';
import { useStore } from '@/state/store';
import { categories } from '@/lib/models';
import { localDateKey, weekDays } from '@/lib/workouts';
export function ProgressDashboard() {
  const { sessions: allSessions, results: allResults, athletes, configured } = useStore();
  const [athleteId, setAthleteId] = useState('');
  const sessions = athleteId ? allSessions.filter((s) => s.athleteId === athleteId) : allSessions;
  const results = athleteId ? allResults.filter((r) => r.athleteId === athleteId) : [];
  if (!configured) return <AccessGate />;
  const done = sessions.filter((s) => s.completed);
  const days = weekDays(),
    keys = days.map(localDateKey);
  const week = done.filter((s) => keys.includes(localDateKey(new Date(s.completedAt))));
  const catCounts = Object.entries(categories).map(([id, c]) => ({
    ...c,
    id,
    count: done.filter((s) => s.categories.some((cat) => cat === id)).length,
  }));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 7 * (7 - i));
    const days = weekDays(date);
    const keys = days.map(localDateKey);
    return {
      label: days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      count: done.filter((s) => keys.includes(localDateKey(new Date(s.completedAt)))).length,
    };
  });
  const max = Math.max(1, ...weeks.map((w) => w.count));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Progressi della squadra</h1>
          <p>Consulta le sessioni condivise o scegli un allievo per i suoi tempi.</p>
        </div>
      </div>
      <label className="panel form-panel">
        Filtra per allievo
        <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
          <option value="">Tutte le sessioni della squadra</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName}
              {a.archived ? ' · archiviato' : ''}
            </option>
          ))}
        </select>
      </label>
      {athleteId ? (
        <SwimProgress results={results} />
      ) : (
        <p className="quiet-note">
          Scegli un allievo per consultare i tempi in vasca. I confronti riguardano sempre la stessa
          persona.
        </p>
      )}
      <div className="stat-grid">
        <div className="stat">
          <span className="stat-icon">
            <Check />
          </span>
          <div>
            <span>Allenamenti completati</span>
            <strong>{done.length}</strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon blue">
            <Clock3 />
          </span>
          <div>
            <span>Minuti di allenamento</span>
            <strong>{Math.floor(done.reduce((sum, s) => sum + s.durationSeconds, 0) / 60)}</strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon purple">
            <CalendarDays />
          </span>
          <div>
            <span>Sessioni della settimana</span>
            <strong>{week.length}</strong>
          </div>
        </div>
      </div>
      {!done.length && (
        <div className="info-banner">
          <Waves size={25} />
          <p>
            Dopo il primo allenamento completato, vedrai qui le sessioni salvate. Segui il tuo
            piano: anche i giorni di riposo contano.
          </p>
        </div>
      )}
      {done.length > 0 && (
        <details className="disclosure progress-details panel">
          <summary>Vedi grafici e calendario</summary>
          <div className="disclosure-body">
            <div className="progress-grid">
              <section className="panel">
                <div className="section-title">
                  <h2>Il ritmo nel tempo</h2>
                  <TrendingUp size={20} />
                </div>
                <p className="muted">Sessioni completate · ultime 8 settimane</p>
                <div
                  className="frequency-chart"
                  role="img"
                  aria-label={weeks.map((w) => `${w.label}: ${w.count} sessioni`).join(', ')}
                >
                  {weeks.map((w) => (
                    <div className="chart-column" key={w.label}>
                      <strong>{w.count}</strong>
                      <div className="chart-bar-wrap">
                        <div
                          className="chart-bar"
                          style={{
                            height: `${(w.count / max) * 100}%`,
                            minHeight: w.count ? 8 : 2,
                          }}
                        />
                      </div>
                      <span>{w.label}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <h2>Un lavoro a tutto tondo</h2>
                <p className="muted">
                  Sessioni per categoria · una sessione può coinvolgere più aree.
                </p>
                <div className="category-chart">
                  {catCounts.map((c) => (
                    <div key={c.id}>
                      <span>{c.short}</span>
                      <div className="progress-track">
                        <span
                          style={{
                            width: `${done.length ? (c.count / done.length) * 100 : 0}%`,
                            background: c.color,
                          }}
                        />
                      </div>
                      <strong>{c.count}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <section className="panel mt">
              <div className="section-title">
                <h2>Calendario delle sessioni</h2>
                <span className="tag">Ultimi 35 giorni</span>
              </div>
              <div className="session-calendar">
                {Array.from({ length: 35 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (34 - i));
                  const count = done.filter(
                    (s) => localDateKey(new Date(s.completedAt)) === localDateKey(d),
                  ).length;
                  return (
                    <div
                      key={i}
                      className={`calendar-cell ${count ? 'has-session' : ''}`}
                      title={`${d.toLocaleDateString('it-IT')}: ${count} sessioni`}
                    >
                      <small>{d.toLocaleDateString('it-IT', { weekday: 'short' })}</small>
                      <strong>{d.getDate()}</strong>
                      <span>{count ? <Check size={14} /> : <span />}</span>
                      <span className="sr-only">{count} sessioni</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </details>
      )}
      <div className="section-heading">
        <h2>Allenamenti salvati</h2>
        <span className="tag">{sessions.length} sessioni salvate</span>
      </div>
      {sessions.length ? (
        <div className="history-list">
          {[...sessions].reverse().map((s) => (
            <article key={s.id} className="history-row">
              <span className="history-icon">
                <Check size={20} />
              </span>
              <div>
                <h3>{s.workoutName}</h3>
                <p>
                  {new Date(s.completedAt).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  · {Math.round(s.durationSeconds / 60)} min ·{' '}
                  {s.progress.filter((p) => p.status === 'completed').length} serie
                </p>
              </div>
              <span className={`tag ${s.completed ? 'success' : ''}`}>
                {s.completed ? 'Completato' : 'Interrotto'}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <CalendarDays size={30} />
          <h3>Ancora nessun allenamento</h3>
          <p>Quando finisci, premi “Salva il risultato” per ritrovarlo qui.</p>
        </div>
      )}
    </>
  );
}
