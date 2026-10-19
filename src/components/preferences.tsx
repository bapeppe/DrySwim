'use client';
import { Download, Moon, ShieldCheck, Sun, Volume2 } from 'lucide-react';
import { useStore } from '@/state/store';
import { STORAGE_KEY } from '@/lib/storage';
import { difficultyLabels, type UserPreferences } from '@/lib/models';
export function Preferences() {
  const store = useStore();
  function exportData() {
    const raw = store.blocked
      ? localStorage.getItem(STORAGE_KEY)
      : JSON.stringify(
          {
            version: 1,
            preferences: store.preferences,
            favorites: store.favorites,
            workouts: store.workouts,
            sessions: store.sessions,
            active: store.active,
          },
          null,
          2,
        );
    const url = URL.createObjectURL(new Blob([raw ?? '{}'], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `swimdryland-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A MODO TUO</span>
          <h1>
            Il tuo spazio<span className="teal">.</span>
          </h1>
          <p>Piccole preferenze, un’esperienza più comoda.</p>
        </div>
      </div>
      <div className="preferences-layout">
        <section className="panel form-panel">
          <h2>Preferenze</h2>
          <div className="preference-row">
            <div>
              <h3>Aspetto</h3>
              <p>Un’interfaccia comoda per i tuoi occhi.</p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() =>
                store.setPreferences({
                  theme: store.preferences.theme === 'light' ? 'dark' : 'light',
                })
              }
            >
              {store.preferences.theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}{' '}
              {store.preferences.theme === 'light' ? 'Tema scuro' : 'Tema chiaro'}
            </button>
          </div>
          <div className="preference-row">
            <div>
              <h3>Segnali sonori</h3>
              <p>Un breve suono al cambio di fase.</p>
            </div>
            <button
              className="btn btn-secondary"
              aria-pressed={store.preferences.sound}
              onClick={() => store.setPreferences({ sound: !store.preferences.sound })}
            >
              <Volume2 size={18} />
              {store.preferences.sound ? 'Attivi' : 'Disattivati'}
            </button>
          </div>
          <label>
            Livello di esperienza
            <select
              value={store.preferences.level}
              onChange={(e) =>
                store.setPreferences({ level: e.target.value as UserPreferences['level'] })
              }
            >
              {Object.entries(difficultyLabels).map(([id, l]) => (
                <option key={id} value={id}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <p className="small muted">
            Serve come promemoria. La scelta degli esercizi e delle progressioni rimane da
            concordare con l’allenatore.
          </p>
          <label>
            Modalità locale
            <select
              value={store.preferences.role}
              onChange={(e) =>
                store.setPreferences({ role: e.target.value as UserPreferences['role'] })
              }
            >
              <option value="athlete">Atleta</option>
              <option value="coach">Allenatore</option>
            </select>
          </label>
          <p className="small muted">
            Le modalità non sono account e non proteggono l’accesso ai dati.
          </p>
        </section>
        <aside>
          <section className="panel">
            <ShieldCheck size={30} className="teal" />
            <h2>I dati restano qui.</h2>
            <p>
              Sessioni, preferiti e programmi vengono salvati nel browser di questo dispositivo. Non
              inserire nomi completi o informazioni sensibili nei programmi.
            </p>
            <p>
              La cancellazione dei dati del browser può eliminare i progressi. Esporta regolarmente
              una copia.
            </p>
            <button className="btn btn-secondary full-width" onClick={exportData}>
              <Download size={18} />
              Esporta i dati
            </button>
            {store.blocked && (
              <button
                className="btn btn-danger full-width mt"
                onClick={() => {
                  if (
                    window.confirm(
                      'Hai esportato i dati originali? Ripristinando il salvataggio saranno sostituiti con i dati attualmente visibili.',
                    )
                  )
                    store.resetStorage();
                }}
              >
                Ripristina salvataggio locale
              </button>
            )}
          </section>
          <section className="panel mt">
            <h3>Portala sempre con te</h3>
            <p>
              Su iPhone: in Safari scegli Condividi → Aggiungi alla schermata Home. Su Android: usa
              Installa app dal menu del browser.
            </p>
            <p className="small muted">
              L’interfaccia può riaprirsi offline dopo la prima visita; i video e la ricerca YouTube
              richiedono Internet.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
