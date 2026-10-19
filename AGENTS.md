# Convenzioni SwimDryland

- TypeScript strict; separare dati, logica, storage e UI. Usare componenti riutilizzabili.
- Layout mobile-first, controlli accessibili, interfaccia e messaggi in italiano; supportare i temi chiaro e scuro.
- Tutti gli esercizi richiedono contenuti specifici e dosi modificabili. Non duplicare i record condivisi tra categorie.
- Utenti 14–17 anni: niente classifiche, dati sensibili, cedimento o massimali. Salti con prerequisiti e atterraggi controllati. Programmi da approvare dall’allenatore.
- Il ruolo allenatore locale non è autenticazione. LocalStorage va validato e gli errori vanno mostrati.
- Video esclusivamente da ID verificati nel registro centralizzato, altrimenti ricerca YouTube. Non scaricare video.
- Prima di ogni commit: typecheck, lint, test e build. Per modifiche UI verificare anche i test responsive pertinenti.
- Mai commit diretti su main. Usare feature branch, Conventional Commits, push e PR verso main. Niente force push o merge senza autorizzazione esplicita.
- Compatibilità Next.js/Vercel. GitHub Actions verifica il codice; Git Integration Vercel gestisce i deployment. Nessun deploy diretto in produzione senza autorizzazione.
- Non versionare segreti, file .env o .vercel. Mantenere README e test coerenti.
