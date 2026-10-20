# Convenzioni SwimDryland

- TypeScript strict; separare dati, logica, storage e UI. Usare componenti riutilizzabili.
- Layout mobile-first, controlli accessibili, interfaccia e messaggi in italiano; supportare i temi chiaro e scuro.
- Tutti gli esercizi richiedono contenuti specifici e dosi modificabili. Non duplicare i record condivisi tra categorie.
- Utenti 14–17 anni: niente classifiche, dati sensibili, cedimento o massimali. Salti con prerequisiti e atterraggi controllati. Programmi da approvare dall’allenatore.
- Accesso condiviso senza login, account o ruoli personali: tutte le funzioni sono aperte a chi conosce il link. Limitare con RLS l’accesso anonimo al solo spazio condiviso e al catalogo base; mai una service-role key nel runtime. Non salvare roster o tempi in LocalStorage o nella cache PWA.
- Video base revisionati nel registro; video personalizzati scelti e revisionati dall’allenatore con URL YouTube validato. In caso di errore offrire fallback. Non scaricare video.
- Prima di ogni commit: typecheck, lint, test e build. Per modifiche UI verificare anche i test responsive pertinenti.
- Mai commit diretti su main. Usare feature branch, Conventional Commits, push e PR verso main. Niente force push o merge senza autorizzazione esplicita.
- Compatibilità Next.js/Vercel. GitHub Actions verifica il codice; Git Integration Vercel gestisce i deployment. Nessun deploy diretto in produzione senza autorizzazione.
- Non versionare segreti, file .env o .vercel. Mantenere README e test coerenti.

- Nessun programma predefinito in produzione: solo programmi creati dagli allenatori, bozze condivise e pubblicazione per squadra o allievi. Le bozze non si possono avviare nel player.
- Tempi in centesimi interi, confronti separati per distanza/stile/vasca. Preservare lo storico e gli archivi locali v1.
- Migrazioni SQL versionate; verificare RLS come anon e con account di squadre diverse e test PostgreSQL prima di distribuire.
