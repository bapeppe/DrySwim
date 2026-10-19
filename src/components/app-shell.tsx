'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  Waves,
  House,
  Dumbbell,
  ChartNoAxesCombined,
  Play,
  Settings2,
  Moon,
  Sun,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useStore } from '@/state/store';

const nav = [
  { href: '/', label: 'Home', icon: House },
  { href: '/allenamenti', label: 'Allenati', icon: Play },
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
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <div className={`app ${training ? 'training-shell' : ''}`}>
      <a href="#contenuto" className="skip-link">
        Vai al contenuto
      </a>
      {!training && (
        <aside className="sidebar">
          <Link href="/" className="brand">
            <span className="brand-icon">
              <Waves size={25} />
            </span>
            <span>
              swim<span className="brand-light">dryland</span>
            </span>
          </Link>
          <nav aria-label="Navigazione principale">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? 'page' : undefined}
                className={`nav-link ${isActive(n.href) ? 'active' : ''}`}
              >
                <n.icon size={21} />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            {preferences.role === 'coach' && (
              <Link href="/allenatore" className="nav-link">
                <ShieldCheck size={20} />
                Spazio allenatore
              </Link>
            )}
            <Link href="/impostazioni" className="nav-link">
              <Settings2 size={20} />
              Impostazioni
            </Link>
            <p>
              Un passo alla volta.
              <br />
              Anche il recupero conta.
            </p>
          </div>
        </aside>
      )}
      <div className="main-wrap">
        <header className="topbar">
          {training ? (
            <Link href="/allenamenti" className="back-link">
              <ArrowLeft size={20} />
              Allenamenti
            </Link>
          ) : (
            <Link href="/" className="header-brand">
              <Waves size={25} />
              swimdryland
            </Link>
          )}
          <div className="top-actions">
            <button
              className="icon-button"
              aria-label={
                preferences.theme === 'light' ? 'Attiva tema scuro' : 'Attiva tema chiaro'
              }
              onClick={() =>
                setPreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' })
              }
            >
              {preferences.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            {!training && (
              <Link href="/impostazioni" className="icon-button" aria-label="Apri impostazioni">
                <Settings2 size={20} />
              </Link>
            )}
          </div>
        </header>
        <main id="contenuto" className="main-content" tabIndex={-1}>
          {storageError && (
            <div className="alert" role="alert">
              {storageError} <Link href="/impostazioni">Gestisci i dati</Link>
            </div>
          )}
          {hydrated && active && !training && path !== '/' && (
            <Link className="resume-banner" href={`/allenamento/${active.workout.id}`}>
              <span>
                <strong>
                  {active.finished ? 'Salva il tuo allenamento' : 'Riprendi da dove eri rimasto'}
                </strong>
                <small>{active.workout.name}</small>
              </span>
              <ArrowRight size={22} />
            </Link>
          )}
          {hydrated ? (
            children
          ) : (
            <div role="status" className="loading">
              Caricamento…
            </div>
          )}
        </main>
        {!training && (
          <footer className="page-footer">
            <Waves size={18} />
            <span>Se senti dolore, fermati e parlane con l’allenatore.</span>
          </footer>
        )}
      </div>
      {!training && (
        <nav className="mobile-nav" aria-label="Navigazione mobile">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}>
              <n.icon size={22} />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
