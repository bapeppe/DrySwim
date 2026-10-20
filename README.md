# SwimDryland

Web app in italiano per una squadra di nuoto (14–17 anni), **senza login, registrazione, password o inviti**. Chi apre l’app può consultare e gestire allenamenti, esercizi, allievi e tempi nello stesso spazio condiviso. Non ci sono ruoli personali o programmi predefiniti.

## Avvio

Node.js 24 LTS, npm e il progetto Supabase DrySwim già esistente per i dati condivisi.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Aprire http://localhost:3000. Impostare `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` in `.env.local`; usare una publishable key o una anon key legacy, mai `service_role` o secret key. Il server usa il ruolo PostgreSQL `anon`, senza Supabase Auth, account automatici, cookie di autenticazione o sessioni anonime Auth.

Senza database configurato il catalogo base è consultabile, ma i salvataggi non sono disponibili. L’app non simula operazioni riuscite.

## Database e preview

Le migrazioni vanno applicate in ordine:

1. `supabase/migrations/202610200001_workspace.sql`: schema iniziale e isolamento delle squadre private precedenti.
2. `supabase/migrations/202610200002_catalog.sql`: 52 esercizi base unici, nessun programma.
3. `supabase/migrations/20261020102443_shared_team_access.sql`: crea lo spazio condiviso DrySwim e abilita lettura e gestione senza autenticazione tramite RLS.

Su un database già inizializzato applicare solo le migrazioni mancanti. Non cancellare dati né rieseguire lo schema iniziale. La terza migrazione non converte o pubblica squadre private preesistenti: crea un nuovo spazio unico, senza duplicare il catalogo. Gli eventuali dati privati restano nelle tabelle originali con le policy precedenti.

Configurare le due variabili server anche in Vercel **Preview**, sul branch `feat/coach-workspace-database`, e generare la preview tramite Git Integration. Non servono SMTP, conferme email o configurazione dei redirect Auth. Le vecchie pagine `/account` e `/auth/callback` riportano alla Home; le API di account e inviti restituiscono 410 e non creano utenti.

Chi conosce l’indirizzo può leggere e modificare lo spazio condiviso, inclusi nomi brevi, tempi e bozze. Non esiste distinzione di permessi tra allenatore e atleta: è il modello richiesto dalla squadra. Non inserire dati sanitari o altre informazioni sensibili. Non ci sono classifiche.

La protezione dei deployment di preview di Vercel è distinta dal login dell’app e dipende dalle impostazioni del progetto Vercel.

## Come si usa

- **Home**: ripresa della sessione su questo dispositivo oppure un programma pubblicato. Accesso diretto alla gestione della squadra.
- **Allenati**: programmi condivisi, inclusa l’indicazione delle bozze. Le bozze si possono modificare, ma si possono avviare solo i programmi pubblicati e concordati con l’allenatore.
- **Spazio allenatore**: crea, modifica, duplica, riordina ed elimina programmi. Dosi, serie, giri, ripetizioni, durate, lati, posizioni, pause, riscaldamento e defaticamento sono modificabili. Le assegnazioni indicano a quali allievi è destinato il programma; senza login non limitano la visibilità.
- **Esercizi**: 52 esercizi base condivisi, ricerca e filtri. Preferiti conservati su questo dispositivo. Gli esercizi personalizzati si aggiungono con nome, modalità, quantità modificabili e link YouTube scelto e revisionato dall’allenatore. Non si duplicano gli esercizi comuni fra categorie.
- **Player**: riscaldamento, esercizi, recuperi e defaticamento; timer, pausa, ripresa, precedente e salto. L’avanzamento automatico riguarda solo la fase corrente. La sessione in corso contiene una copia degli esercizi per la ripresa sul dispositivo. Al salvataggio si può scegliere facoltativamente un allievo oppure salvare una sessione della squadra senza nome. Errori di connessione permettono di riprovare senza duplicare la sessione. Le sessioni salvate restano uno storico immutabile.
- **Allievi**: aggiunta, ricerca, modifica del nome breve, archiviazione e riattivazione. Nessun invito, email o collegamento account. L’archiviazione conserva lo storico ed esclude l’allievo dalle nuove sessioni e rilevazioni.
- **Tempi in vasca**: distanza, stile, vasca 25/50 m, data, tempo e gara/allenamento; modifica ed eliminazione. `1.12` significa 1 minuto e 12 secondi; `1:12.34` include i centesimi. I tempi sono salvati in centesimi interi.
- **Progressi**: sessioni della squadra o filtro per allievo, inclusi gli archiviati. I tempi in vasca richiedono la scelta di un allievo e sono confrontati solo per la stessa persona, distanza, stile e vasca. Nessun confronto tra allievi.

L’allenatore deve approvare esercizi, dosi e progressioni. Nessun cedimento o massimale. I salti richiedono prerequisiti e atterraggi controllati. Fermarsi in caso di dolore.

## Dati, RLS e conservazione

Le policy `anon` espongono solo lo spazio con `teams.shared_access=true` e il catalogo base. Un indice unico impedisce di avere più spazi aperti. Le squadre precedenti, membership e inviti non sono accessibili senza autenticazione. Il catalogo base non è modificabile dal client. Le API individuano la squadra nel database e non accettano una squadra arbitraria dal browser; le chiavi esterne composte e i trigger impediscono riferimenti ad allievi o esercizi di altre squadre. RLS resta attivo su tutte le tabelle.

Allievi e tempi rimangono nel database e in memoria, **mai in LocalStorage o nella cache PWA**. Il browser conserva solo preferenze, preferiti e sessione in corso nella chiave del dispositivo `swimdryland:device:shared:v2`; questi dati non sono un account e non assegnano permessi. Le risposte API sono `private, no-store`. Il service worker conserva solo asset statici e pagina offline, mai API o HTML di navigazione.

Gli archivi locali v1 e quelli di precedenti account non vengono cancellati, importati o mescolati automaticamente. Dalle impostazioni si può esportare l’archivio v1. La sincronizzazione dei dati salvati e i video richiedono Internet. La PWA si può aggiungere alla schermata Home da Safari/iOS o installare da Android.

## Video e catalogo

I link personalizzati accettano soltanto URL YouTube validati (watch, youtu.be, shorts, embed, live). La validazione dell’URL non certifica il contenuto o la disponibilità: la revisione spetta all’allenatore. Il player usa YouTube IFrame API e youtube-nocookie solo dopo il comando dell’utente, con fallback per errori e timeout. Non scarica video.

Per aggiornare il catalogo comune modificare `src/data/exercises.ts`, oppure il registro dei video base revisionati `src/data/videos.ts`, e rigenerare il seed:

```sh
npx tsx scripts/generate-catalog-seed.ts
```

Per database già inizializzati distribuire gli aggiornamenti con una nuova migrazione, senza alterare migrazioni già applicate. Il registro video iniziale è vuoto e offre il fallback alla ricerca YouTube.

## Architettura e verifiche

Next.js App Router, React, TypeScript strict, Tailwind CSS, Radix Slot, Lucide, Zustand, Zod e Supabase PostgreSQL. Dati, logica, storage e UI sono separati in `src/data`, `src/lib`, `src/state` e `src/components`. Le API sono in `src/app/api`; le migrazioni versionate in `supabase/migrations`.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Vitest verifica dominio, dosi, player, video, tempi e conservazione degli archivi. I test PostgreSQL PGlite applicano le migrazioni e verificano sia l’isolamento delle vecchie squadre sia le nuove policy anonime: CRUD condiviso, catalogo immutabile, nessuna escalation, riferimenti esterni negati, bozze non avviabili e storico conservato. Non servono Docker o credenziali.

Playwright verifica mobile e desktop, navigazione senza login, gestione programmi/esercizi/allievi/tempi, filtro per persona, preferiti, player e retry. Le API sono intercettate solo nei test browser; RLS è verificato separatamente su PostgreSQL e sulla preview remota con la sola publishable key. Chromium con viewport iPhone non sostituisce una prova su Safari/iOS fisico.

GitHub Actions esegue typecheck, lint, test, build e Playwright. Repository `bapeppe/DrySwim`, PR #3, progetto Vercel `bapeppes-projects/dryswim`. Feature branch, Conventional Commits, push e PR verso `main`; nessun force push, merge o deploy in produzione senza autorizzazione. La Git Integration gestisce i deployment. Non versionare `.env`, `.vercel`, token o credenziali; `.env.example` contiene solo segnaposto.
