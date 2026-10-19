'use client';
import Link from 'next/link';
import { LockKeyhole, Users } from 'lucide-react';
import { useStore } from '@/state/store';
export function AccessGate({ coach = false }: { coach?: boolean }) {
  const { configured, user, member } = useStore();
  return (
    <div className="empty-state">
      <LockKeyhole size={34} />
      <h1>
        {!configured
          ? 'La squadra non è ancora attiva'
          : !user
            ? 'Accedi alla tua squadra'
            : !member
              ? 'Completa il tuo accesso'
              : coach
                ? 'Spazio allenatore'
                : 'Allenamenti della squadra'}
      </h1>
      <p>
        {!configured
          ? 'Il database condiviso deve essere collegato dall’amministratore. Puoi intanto consultare la libreria degli esercizi.'
          : !user
            ? 'Usa il tuo account per ritrovare programmi e progressi su tutti i dispositivi.'
            : !member
              ? 'Crea la tua squadra se sei l’allenatore, oppure usa il codice di invito che hai ricevuto.'
              : 'Questa pagina è riservata agli allenatori della tua squadra.'}
      </p>
      <Link href={!configured ? '/esercizi' : '/account'} className="btn btn-primary">
        <Users size={19} />
        {!configured
          ? 'Esplora gli esercizi'
          : !user
            ? 'Accedi o registrati'
            : 'Apri il tuo account'}
      </Link>
    </div>
  );
}
