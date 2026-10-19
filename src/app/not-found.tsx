import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Questa corsia non c’è.</h1>
      <p>La pagina o l’esercizio che cerchi non è disponibile.</p>
      <Link href="/" className="btn btn-primary">
        Torna alla panoramica
      </Link>
    </div>
  );
}
