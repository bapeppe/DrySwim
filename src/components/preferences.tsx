'use client';
import Link from 'next/link';
import { Download, Moon, ShieldCheck, Sun, Volume2 } from 'lucide-react';
import { useStore } from '@/state/store';
import { STORAGE_KEY } from '@/lib/storage';
import { difficultyLabels, type UserPreferences } from '@/lib/models';
export function Preferences() {
  const store = useStore();
  function exportData() {
    const raw = JSON.stringify(
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
          <h1>Impostazioni</h1>
          <p>Scegli come usare l’app.</p>
        </div>
      </div>
      <div className="preferences-layout">
        <section className="panel form-panel">
          <h2>Come preferisci allenarti?</h2>
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
          <Link href="/account" className="btn btn-primary">
            Account e squadra
          </Link>
          <Link href="/allenatore" className="btn btn-secondary full-width mt">
            <ShieldCheck size={19} />
            Spazio allenatore
          </Link>
        </section>
        <aside>
          <section className="panel">
            <ShieldCheck size={30} className="teal" />
            <h2>I dati della squadra sono condivisi.</h2>
            <p>
              Allenamenti, allievi, tempi e risultati sono salvati nel database della squadra.
              Preferiti e sessione in corso sono conservati su questo dispositivo, separati per
              account.
            </p>
            <p>
              Non inserire dati sanitari o informazioni personali nelle note. Gli archivi locali
              della versione precedente restano sul dispositivo e puoi esportarli.
            </p>
            <button className="btn btn-secondary full-width" onClick={exportData}>
              <Download size={18} />
              Esporta i dati
            </button>
            <button
              className="btn btn-ghost full-width mt"
              onClick={() => {
                const legacy = localStorage.getItem(STORAGE_KEY);
                if (!legacy) {
                  window.alert('Nessun archivio della versione precedente su questo dispositivo.');
                  return;
                }
                const url = URL.createObjectURL(new Blob([legacy], { type: 'application/json' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = 'swimdryland-archivio-locale.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Esporta archivio della versione precedente
            </button>
          </section>
          <section className="panel mt">
            <h3>Portala sempre con te</h3>
            <p>
              Su iPhone: in Safari scegli Condividi → Aggiungi alla schermata Home. Su Android: usa
              Installa app dal menu del browser.
            </p>
            <p className="small muted">
              Account, sincronizzazione e video YouTube richiedono Internet.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
