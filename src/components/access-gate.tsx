'use client';
import Link from 'next/link';
import { Waves } from 'lucide-react';
export function AccessGate() {
  return (
    <div className="empty-state">
      <Waves size={34} />
      <h1>La squadra non è ancora attiva</h1>
      <p>
        Il database condiviso deve essere collegato. Puoi intanto consultare la libreria degli
        esercizi.
      </p>
      <Link href="/esercizi" className="btn btn-primary">
        Esplora gli esercizi
      </Link>
    </div>
  );
}
