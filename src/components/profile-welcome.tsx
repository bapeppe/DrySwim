'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Search, UserRound, Users, Waves } from 'lucide-react';
import { useStore } from '@/state/store';
import { currentProfile, greetingName, nameKey, newProfileSchema } from '@/lib/profiles';

export function ProfileWelcome() {
  const {
    athletes,
    selectedAthleteId,
    choosingProfile,
    selectProfile,
    registerProfile,
    cancelProfileChoice,
    syncing,
    refresh,
  } = useStore();
  const profile = currentProfile(athletes, selectedAthleteId);
  const [mode, setMode] = useState<'new' | 'list'>(choosingProfile ? 'list' : 'new');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [query, setQuery] = useState('');
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const profiles = athletes
    .filter((a) => !a.archived)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'it'));
  const terms = nameKey(query).split(' ').filter(Boolean);
  const filtered = profiles.filter((a) =>
    terms.every((term) => nameKey(a.displayName).includes(term)),
  );
  function show(next: 'new' | 'list') {
    setMode(next);
    setError('');
    setNotice('');
  }
  return (
    <section className="profile-welcome" aria-labelledby="profile-title">
      <div className="profile-intro">
        <span className="profile-symbol">
          <Waves size={32} />
        </span>
        <span className="section-kicker">La tua squadra, il tuo spazio</span>
        <h1 id="profile-title">{mode === 'new' ? 'Come ti chiami?' : 'Trova il tuo nome'}</h1>
        <p>
          {mode === 'new'
            ? 'Bastano nome e cognome per ritrovare i tuoi allenamenti e i tuoi progressi.'
            : 'Hai già usato l’app? Scegli il tuo nome e ritrova i tuoi progressi anche su questo dispositivo.'}
        </p>
      </div>
      <div className="profile-card panel form-panel">
        {selectedAthleteId && !profile && (
          <p className="info-banner">
            Il profilo scelto non è più attivo. Scegli un altro nome o chiedi all’allenatore di
            riattivarlo.
          </p>
        )}
        {notice && (
          <p className="info-banner" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        {mode === 'new' ? (
          <>
            <form
              className="profile-form form-panel"
              onSubmit={async (event) => {
                event.preventDefault();
                const input = newProfileSchema.safeParse({ id: requestId, firstName, lastName });
                if (!input.success) {
                  setError(input.error.issues[0].message);
                  return;
                }
                setBusy(true);
                setError('');
                try {
                  const reply = await registerProfile(input.data);
                  if (reply.kind === 'existing') {
                    setMode('list');
                    setQuery(`${input.data.firstName} ${input.data.lastName}`);
                    setNotice(
                      'Questo nome è già presente. Selezionalo qui sotto per continuare senza creare un duplicato.',
                    );
                  }
                } catch (reason) {
                  setError(
                    reason instanceof Error
                      ? reason.message
                      : 'Non riusciamo a salvare il nome. Riprova.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="profile-name-fields">
                <label>
                  Nome
                  <input
                    name="given-name"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    maxLength={40}
                    required
                    disabled={busy}
                  />
                </label>
                <label>
                  Cognome
                  <input
                    name="family-name"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    maxLength={40}
                    required
                    disabled={busy}
                  />
                </label>
              </div>
              <button className="btn btn-primary full-width" disabled={busy || syncing}>
                {busy ? 'Salvataggio…' : 'Inizia'}
                <ArrowRight size={19} />
              </button>
            </form>
            <div className="profile-divider">
              <span>Hai già un profilo?</span>
            </div>
            <button
              className="btn btn-secondary full-width"
              disabled={busy}
              onClick={() => show('list')}
            >
              <Users size={19} />
              Scegli il tuo nome dalla lista
            </button>
          </>
        ) : (
          <>
            <label className="profile-search">
              <span>
                <Search size={18} />
                Cerca il tuo nome
              </span>
              <input
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setNotice('');
                  setError('');
                }}
                placeholder="Nome o cognome"
              />
            </label>
            {filtered.length ? (
              <ul className="profile-list" aria-label="Nomi della squadra">
                {filtered.map((athlete) => (
                  <li key={athlete.id}>
                    <button
                      className="profile-choice"
                      onClick={() => {
                        try {
                          selectProfile(athlete.id);
                        } catch (reason) {
                          setError(
                            reason instanceof Error ? reason.message : 'Scegli un altro nome.',
                          );
                        }
                      }}
                    >
                      <UserRound size={22} />
                      <span>{athlete.displayName}</span>
                      <ArrowRight size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status" className="quiet-note">
                {profiles.length
                  ? 'Nessun nome trovato. Prova con nome o cognome, oppure aggiungi il tuo.'
                  : 'Non ci sono ancora nomi nella squadra. Puoi aggiungere il tuo.'}
              </p>
            )}
            <button
              className="btn btn-ghost full-width"
              disabled={syncing}
              onClick={() => void refresh()}
            >
              {syncing ? 'Aggiornamento…' : 'Aggiorna la lista'}
            </button>
            <button className="btn btn-secondary full-width" onClick={() => show('new')}>
              <ArrowLeft size={18} />
              Inserisci nome e cognome
            </button>
          </>
        )}
        {choosingProfile && profile && (
          <button className="btn btn-ghost full-width" onClick={cancelProfileChoice}>
            Continua come {greetingName(profile.displayName)}
          </button>
        )}
      </div>
      <p className="profile-footnote">
        Nessuna password. Questo dispositivo ricorderà la tua scelta. Potrai cambiarla dalle
        impostazioni.
      </p>
    </section>
  );
}
