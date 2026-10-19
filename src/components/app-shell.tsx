'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  Waves,
  LayoutDashboard,
  Dumbbell,
  ChartNoAxesCombined,
  CalendarDays,
  Settings2,
  ArrowUpRight,
  Moon,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '@/state/store';
const nav = [
  { href: '/', label: 'Panoramica', icon: LayoutDashboard },
  { href: '/allenamenti', label: 'Allenamenti', icon: CalendarDays },
  { href: '/esercizi', label: 'Esercizi', icon: Dumbbell },
  { href: '/progressi', label: 'Progressi', icon: ChartNoAxesCombined },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { hydrate, hydrated, preferences, setPreferences, storageError, active } = useStore();
  useEffect(() => {
    hydrate();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [hydrate]);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.style.colorScheme = preferences.theme;
  }, [preferences.theme]);
  const training = path.startsWith('/allenamento/');
  return (
    <div className={`app ${training ? 'training-shell' : ''}`}>
      <a href="#contenuto" className="skip-link">
        Vai al contenuto
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Waves size={25} />
          </span>
          <span>
            swim<span className="brand-light">dryland</span>
            <small>IL TUO ALLENAMENTO, A SECCO.</small>
          </span>
        </Link>
        <div className="team-label">IL TUO SPAZIO</div>
        <nav aria-label="Navigazione principale">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={
                (n.href === '/' ? path === '/' : path.startsWith(n.href)) ? 'page' : undefined
              }
              className={`nav-link ${(n.href === '/' ? path === '/' : path.startsWith(n.href)) ? 'active' : ''}`}
            >
              <n.icon size={20} />
              {n.label}
              {n.href === '/' && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-tip">
          <span className="eyebrow">PICCOLI PASSI, OGNI GIORNO</span>
          <Waves size={32} />
          <p>
            La prossima bracciata
            <br />
            comincia da qui.
          </p>
          <Link href="/allenamenti">
            Trova il tuo allenamento <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <Link href="/allenatore" className="nav-link">
            <ShieldCheck size={20} />
            Spazio allenatore
          </Link>
          <Link href="/impostazioni" className="nav-link">
            <Settings2 size={20} />
            Preferenze
          </Link>
          <div className="local-user">
            <span className="avatar">SD</span>
            <div>
              <strong>
                {preferences.role === 'coach' ? 'Modalità allenatore' : 'Modalità atleta'}
              </strong>
              <small>Profilo locale · su questo dispositivo</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <Link href="/" className="mobile-brand">
            <Waves /> swimdryland
          </Link>
          <span className="top-context">
            SQUADRA IN ACQUA. <strong>FORZA ANCHE FUORI.</strong>
          </span>
          <div className="top-actions">
            <span className="local-badge">
              <span />
              Dati sul dispositivo
            </span>
            <button
              className="icon-button"
              aria-label={
                preferences.theme === 'light' ? 'Attiva tema scuro' : 'Attiva tema chiaro'
              }
              onClick={() =>
                setPreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' })
              }
            >
              {preferences.theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <Link href="/impostazioni" className="avatar" aria-label="Apri preferenze">
              SD
            </Link>
          </div>
        </header>
        <main id="contenuto" className="main-content">
          {storageError && (
            <div className="alert" role="alert">
              {storageError} <Link href="/impostazioni">Gestisci i dati</Link>
            </div>
          )}
          {hydrated && active && !training && (
            <Link className="resume-banner" href={`/allenamento/${active.workout.id}`}>
              Hai una sessione {active.finished ? 'da salvare' : 'in corso'}: {active.workout.name}
              <strong>Riprendi →</strong>
            </Link>
          )}
          {hydrated ? (
            children
          ) : (
            <div role="status" className="loading">
              Prepariamo il tuo spazio…
            </div>
          )}
        </main>
        <footer className="page-footer">
          <Waves size={17} />
          <span>Il lavoro fuori dall’acqua, al servizio del nuoto.</span>
          <span>Ascolta il tuo corpo. Sempre.</span>
        </footer>
      </div>
      {!training && (
        <nav className="mobile-nav" aria-label="Navigazione mobile">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={
                (n.href === '/' ? path === '/' : path.startsWith(n.href)) ? 'page' : undefined
              }
            >
              <n.icon size={21} />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
