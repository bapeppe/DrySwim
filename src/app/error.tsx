'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <h1>Qualcosa ha interrotto il caricamento.</h1>
      <p>I dati già salvati restano nel dispositivo. Prova a riaprire la schermata.</p>
      <button className="btn btn-primary" onClick={reset}>
        Riprova
      </button>
    </div>
  );
}
