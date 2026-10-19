'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LogIn, Users, LogOut, Copy, ShieldCheck } from 'lucide-react';
import { useStore } from '@/state/store';
import { api } from '@/lib/client-api';
export function Account({
  invitation = '',
  reset = false,
  confirmationError = false,
}: {
  invitation?: string;
  reset?: boolean;
  confirmationError?: boolean;
}) {
  const { configured, user, member, refresh, logout, active } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [teamName, setTeamName] = useState(''),
    [invite, setInvite] = useState(invitation),
    [inviteLink, setInviteLink] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(
      confirmationError
        ? 'Il collegamento non è valido o è scaduto. Prova ad accedere o richiedi una nuova email.'
        : '',
    ),
    [message, setMessage] = useState('');
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operazione non riuscita. Riprova.');
    } finally {
      setBusy(false);
    }
  }
  const notices = (
    <>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="success-message">
          {message}
        </p>
      )}
    </>
  );
  if (!configured)
    return (
      <div className="account-page panel">
        <ShieldCheck size={32} className="teal" />
        <h1>Attiviamo la tua squadra</h1>
        <p>
          Programmi, esercizi e tempi saranno condivisi tramite un database. Il collegamento
          Supabase deve essere completato dall’amministratore prima di creare gli account.
        </p>
        <Link href="/esercizi" className="btn btn-secondary">
          Intanto esplora gli esercizi
        </Link>
      </div>
    );
  if (user && reset)
    return (
      <form
        className="account-page panel form-panel"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api('auth', { action: 'password', password });
            setPassword('');
            setMessage('Password aggiornata. Puoi tornare agli allenamenti.');
          });
        }}
      >
        <h1>Nuova password</h1>
        <label>
          Password
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {notices}
        <button className="btn btn-primary full-width mt" disabled={busy}>
          Salva password
        </button>
        <Link href="/allenamenti" className="text-link">
          Torna agli allenamenti
        </Link>
      </form>
    );
  if (user && member)
    return (
      <div className="account-page panel">
        <Users size={32} className="teal" />
        <h1>La tua squadra</h1>
        <h2>{member.teamName}</h2>
        <p>
          {member.role === 'coach' ? 'Account allenatore' : 'Account allievo'} · {user.email}
        </p>
        {notices}
        <Link
          href={member.role === 'coach' ? '/allievi' : '/allenamenti'}
          className="btn btn-primary full-width"
        >
          {member.role === 'coach' ? 'Vai agli allievi' : 'Vai agli allenamenti'}
        </Link>
        {member.role === 'coach' && (
          <section className="mt">
            <h3>Lavora con un altro allenatore</h3>
            <p>
              Crea un invito da condividere personalmente. Scade dopo 7 giorni e si può usare una
              sola volta.
            </p>
            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const token = await useStore.getState().createInvite(null, 'coach');
                  setInviteLink(`${window.location.origin}/account?invito=${token}`);
                })
              }
            >
              Crea invito allenatore
            </button>
            {inviteLink && (
              <div className="invite-box">
                <label>
                  Link di invito
                  <input value={inviteLink} readOnly onFocus={(e) => e.target.select()} />
                </label>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    void run(async () => {
                      await navigator.clipboard.writeText(inviteLink);
                      setMessage('Invito copiato. Condividilo solo con l’allenatore.');
                    })
                  }
                >
                  <Copy size={18} />
                  Copia invito
                </button>
              </div>
            )}
          </section>
        )}
        <button
          className="btn btn-ghost mt"
          disabled={busy}
          onClick={() => {
            if (
              active &&
              !window.confirm(
                'Hai una sessione in corso. Se esci, il salvataggio sul dispositivo verrà rimosso. Vuoi continuare?',
              )
            )
              return;
            void run(logout);
          }}
        >
          <LogOut size={18} />
          Esci dal tuo account
        </button>
      </div>
    );
  if (user)
    return (
      <div className="account-page">
        <div className="page-heading">
          <div>
            <h1>Entra nella tua squadra</h1>
            <p>Hai effettuato l’accesso come {user.email}.</p>
          </div>
        </div>
        {notices}
        <form
          className="panel form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              let token = invite.trim();
              try {
                const url = new URL(token);
                token = url.searchParams.get('invito') || token;
              } catch {}
              await api('team', { action: 'join', token });
              await refresh();
            });
          }}
        >
          <h2>Ho ricevuto un invito</h2>
          <p>Il codice ti collega al profilo preparato dal tuo allenatore.</p>
          <label>
            Codice o link di invito
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              autoComplete="off"
              required
            />
          </label>
          <button className="btn btn-primary full-width mt" disabled={busy}>
            Entra nella squadra
          </button>
        </form>
        <details className="disclosure panel">
          <summary>Sono un allenatore: crea una nuova squadra</summary>
          <form
            className="disclosure-body form-panel"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api('team', { action: 'create', name: teamName });
                await refresh();
              });
            }}
          >
            <label>
              Nome della squadra
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
            <p className="small muted">
              Crea una nuova squadra solo se non devi entrare in una squadra già esistente.
            </p>
            <button className="btn btn-secondary full-width mt" disabled={busy}>
              Crea squadra
            </button>
          </form>
        </details>
        <button className="btn btn-ghost" disabled={busy} onClick={() => void run(logout)}>
          Esci
        </button>
      </div>
    );
  return (
    <div className="account-page panel form-panel">
      <LogIn size={30} className="teal" />
      <h1>
        {mode === 'signup'
          ? 'Crea il tuo account'
          : mode === 'reset'
            ? 'Recupera la password'
            : 'Accedi alla squadra'}
      </h1>
      <p>
        {mode === 'signup'
          ? 'Un account personale per ritrovare programmi e progressi.'
          : mode === 'reset'
            ? 'Ti invieremo un collegamento per scegliere una nuova password.'
            : 'Usa email e password. Se sei un allievo, tieni pronto l’invito dell’allenatore.'}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const result = await api<{ confirmationRequired?: boolean }>('auth', {
              action: mode,
              email,
              ...(mode === 'reset' ? {} : { password }),
              ...(mode === 'signup' && /^[a-f0-9]{64}$/.test(invite) ? { invite } : {}),
            });
            if (mode === 'reset') {
              setMessage('Se l’account esiste, riceverai un’email con le istruzioni.');
              return;
            }
            if (mode === 'signup' && result.confirmationRequired) {
              setMessage(
                'Controlla la tua email e conferma l’account, poi torna qui per accedere.',
              );
              return;
            }
            setPassword('');
            await refresh();
          });
        }}
      >
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {mode !== 'reset' && (
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={mode === 'signup' ? 10 : 1}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        )}
        {mode === 'signup' && (
          <p className="small muted mt">
            Usa almeno 10 caratteri. Per entrare come allievo servirà l’invito del tuo allenatore.
          </p>
        )}
        {notices}
        <button className="btn btn-primary full-width mt" disabled={busy}>
          {busy
            ? 'Un momento…'
            : mode === 'signup'
              ? 'Registrati'
              : mode === 'reset'
                ? 'Invia collegamento'
                : 'Accedi'}
        </button>
      </form>
      <button
        className="btn btn-ghost full-width"
        disabled={busy}
        onClick={() => {
          setMode(mode === 'signup' ? 'signin' : 'signup');
          setError('');
          setMessage('');
        }}
      >
        {mode === 'signup' ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
      </button>
      {mode !== 'reset' ? (
        <button
          className="btn btn-ghost full-width"
          disabled={busy}
          onClick={() => {
            setMode('reset');
            setError('');
            setMessage('');
          }}
        >
          Password dimenticata?
        </button>
      ) : (
        <button className="btn btn-ghost full-width" onClick={() => setMode('signin')}>
          Torna all’accesso
        </button>
      )}
    </div>
  );
}
