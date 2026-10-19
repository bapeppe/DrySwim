# SwimDryland

Web app in italiano per una squadra di nuoto (14–17 anni). L’allenatore crea e pubblica gli allenamenti a secco, aggiunge esercizi e registra i tempi in vasca degli allievi. Gli atleti seguono il player e consultano i propri progressi. **Non sono inclusi programmi predefiniti.**

## Avvio

Node.js 24 LTS, npm e un progetto Supabase gratuito per account e dati condivisi.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Aprire http://localhost:3000. Senza configurazione Supabase è consultabile il catalogo pubblico, ma non si possono creare account o salvare dati della squadra. Non vengono simulati salvataggi riusciti.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
npx playwright install chromium
npm run test:e2e
```

## Configurare il database gratuito

1. Creare un progetto **Free** in Supabase, preferibilmente nella regione europea appropriata per la squadra. Non attivare componenti a pagamento per questa versione. Conservare la password del database nel proprio gestore di password.
2. Nel SQL Editor eseguire, in ordine, `supabase/migrations/202610200001_workspace.sql` e `supabase/migrations/202610200002_catalog.sql`. Sono migrazioni iniziali per un database nuovo; non rieseguire la prima su tabelle già create. Non cancellare un database esistente per applicarle.
3. Dalle impostazioni API recuperare Project URL e **publishable key** (compatibile anche la anon key legacy). Configurare `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` in `.env.local` e nelle variabili server Vercel degli ambienti desiderati. Non usare `service_role` o secret key: tutte le richieste usano l’account autenticato e le policy RLS.
4. In Authentication abilitare Email/password e conferma email. Impostare Site URL e Redirect URLs autorizzate: `http://localhost:3000/auth/callback**`, URL della preview approvata `/auth/callback**` e, quando autorizzata la produzione, `https://dryswim.vercel.app/auth/callback**`. Consentire solo i propri domini. Le email sono inviate dal servizio Auth; configurare un provider SMTP appropriato se le restrizioni del servizio email di test impediscono la registrazione degli allievi.
5. Riavviare il server locale o generare una nuova preview Vercel dopo aver impostato le variabili. Creare e confermare il primo account, quindi scegliere **Sono un allenatore: crea una nuova squadra**. Non è necessario assegnare ruoli manualmente nel database.
6. Aggiungere gli allievi e generare dalla loro scheda un invito personale. L’allievo crea/conferma il proprio account e usa il link o il codice per collegarsi alla scheda preparata dall’allenatore. Un account appartiene a una sola squadra in questa versione. Per altri allenatori usare l’invito allenatore nella pagina Account.

Le conferme e il recupero password usano PKCE: aprire il link nello stesso browser che ha richiesto l’email. Nessuna credenziale deve essere inviata in chat o inserita nel repository.

## Come si usa

- **Home**: atleta → allenamento pubblicato o ripresa della sessione in corso; allenatore → creazione programmi e accesso agli allievi. Nessun progresso dimostrativo.
- **Allenati**: solo allenamenti salvati dagli allenatori; agli atleti sono visibili quelli pubblicati per tutta la squadra o assegnati alla propria scheda. Le bozze sono riservate agli allenatori.
- **Crea allenamento**: nome, descrizione, esercizi del catalogo condiviso, serie, ripetizioni o durata, giri, lati/posizioni, recuperi, riscaldamento e defaticamento. Riordinamento accessibile con pulsanti. Salvataggio bozza o pubblicazione; modifica, duplicazione in bozza ed eliminazione. Le sessioni precedenti restano nello storico.
- **Esercizi**: 52 esercizi base unici, 55 associazioni originarie di categoria, ricerca, filtri e preferiti per account/dispositivo. L’allenatore aggiunge nome, modalità e link YouTube; può precisare categoria, livello e istruzioni. Gli esercizi aggiunti sono disponibili alla squadra e nel builder. Il link “Crea un nuovo esercizio” dal builder apre una nuova scheda per conservare la bozza; al ritorno l’app aggiorna il catalogo.
- **Player**: riscaldamento → esercizi/recuperi → defaticamento. Countdown per le tenute, conferma manuale delle ripetizioni, pausa, precedente, salto e interruzione. La scadenza assoluta evita la deriva dei timer in background; viene completata automaticamente solo la fase corrente, mai gli esercizi successivi. Una copia degli esercizi della sessione permette la ripresa anche dopo aggiornamenti del catalogo. Il risultato viene confermato come salvato solo dopo risposta del server; un errore lascia disponibile il riepilogo per riprovare.
- **Allievi** (allenatori): aggiunta, ricerca, modifica del nome, invito account, archiviazione/riattivazione senza perdita dello storico. Nessuna data di nascita, dato sanitario o classifica.
- **Tempi in vasca**: distanza, stile, vasca 25/50 m, data, tempo e tipo gara/allenamento. `1.12` = 1 minuto e 12 secondi; centesimi espliciti con `1:12.34`. Salvataggio in centesimi interi. Storico, migliore e variazione dal primo all’ultimo solo per la stessa distanza/stile/vasca. È possibile correggere o eliminare una rilevazione.
- **Progressi**: l’atleta vede solo i propri tempi e le proprie sessioni. I grafici del lavoro a secco derivano esclusivamente dalle sessioni effettivamente salvate; quelle interrotte sono indicate separatamente.

La stima di durata comprende dosi, lati, posizioni, serie, giri, recuperi e transizioni. I contenuti e le quantità devono essere approvati dall’allenatore. Interrompere in caso di dolore; nessun cedimento o massimale. I salti richiedono tecnica acquisita e recuperi adeguati.

## Architettura

Next.js App Router, React, TypeScript strict, Tailwind CSS, Radix Slot, Lucide, Zustand, Zod, Supabase Auth/PostgreSQL.

```text
src/app/                  Route, API server, callback Auth, layout e CSS
src/components/           Home, catalogo, builder, player, allievi, account e progressi
src/data/exercises.ts     Catalogo base dettagliato, senza duplicati
src/data/videos.ts        Registro dei video base revisionati
src/lib/models.ts         Schemi esercizi, circuiti, sessioni e preferenze
src/lib/team-models.ts    Squadra, allievi, tempi e workspace condiviso
src/lib/server/           Client Auth con cookie HttpOnly e accesso al DB con RLS
src/lib/player.ts         Motore puro, timer e copia esercizi della sessione
src/lib/swim-times.ts     Parsing centesimi e raggruppamento per specialità/vasca
src/lib/device.ts         Solo preferenze, preferiti e sessione in corso per account
src/lib/storage.ts        Formato storico locale v1 per validazione/esportazione
src/state/store.ts        Stato e sincronizzazione tramite API
supabase/migrations/      Schema, policy RLS, RPC inviti e catalogo base
scripts/                  Generazione seed dal catalogo sorgente
tests/                    Test di dominio, PostgreSQL reale WASM e browser
tests/fixtures/           Dati esclusivamente per test, mai proposti dall’app
public/                   Icone PWA, service worker, pagina offline statica
.github/workflows/        CI sulle pull request verso main
```

## Accessi e conservazione

I ruoli provengono dalla membership nel database, non da un selettore locale. API e PostgreSQL verificano le autorizzazioni. Un coach vede la propria squadra; un allievo solo la propria scheda, tempi e programmi pubblicati assegnati a lui. Nessun account può attribuirsi la scheda di un altro allievo. Gli inviti hanno token casuali, nel DB è conservato solo l’hash; scadono in 7 giorni e sono consumati atomicamente una sola volta. Archiviare un allievo revoca il suo accesso alla squadra.

Sessioni e tempi salvati non dipendono da LocalStorage. Il browser conserva preferenze, preferiti e la copia della sessione in corso, separata per user ID e rimossa al logout. Roster e rilevazioni dei tempi rimangono in memoria e nel database, mai nella cache del service worker. Le risposte API hanno `Cache-Control: private, no-store`.

I vecchi dati `swimdryland:v1` sono conservati senza caricamento automatico nel DB. Dalle impostazioni è possibile esportare l’archivio precedente. Importazione e riconciliazione dei programmi/progressi locali non sono incluse: nessun caricamento automatico di nomi o dati di altri utilizzatori del dispositivo.

## Aggiungere esercizi e video

Per la squadra usare **Esercizi → Aggiungi esercizio** con account allenatore. Il link YouTube viene normalizzato nei formati watch, youtu.be, shorts, embed o live, esclusivamente sui domini YouTube. È l’allenatore a scegliere e revisionare la dimostrazione: la validazione dell’URL non certifica il contenuto o la disponibilità del video.

Per modificare il catalogo base comune aggiornare `src/data/exercises.ts`, senza duplicare gli esercizi condivisi fra categorie, poi:

```sh
npx tsx scripts/generate-catalog-seed.ts
```

Il comando rigenera il seed iniziale. Su database già inizializzati applicare l’aggiornamento del catalogo con una **nuova migrazione**, senza modificare la cronologia già distribuita. Rieseguire test e verificare i conteggi intenzionalmente cambiati.

Per i video del catalogo base aggiornare `src/data/videos.ts` con ID reale di 11 caratteri, URL sorgente e informazioni della revisione; rigenerare il seed e distribuire una nuova migrazione. Il registro iniziale è vuoto, con fallback di ricerca YouTube. Il player carica YouTube IFrame API e youtube-nocookie solo dopo il comando dell’utente, gestisce errori e timeout e resta indipendente dal timer. Non scarica o ridistribuisce video. Video e account richiedono Internet.

## PWA e dispositivi

Manifest standalone, icone 192/512, metadati iOS, temi chiaro/scuro. Su iPhone usare Safari → Condividi → Aggiungi alla schermata Home; su Android usare Installa app. Il service worker v3 elimina le vecchie cache e conserva solo asset statici e pagina offline, **mai HTML di navigazione, API, account o pagine allievi**. La schermata offline richiede di riconnettersi; nessuna promessa di sincronizzazione o video offline.

## Verifiche

Vitest verifica catalogo, dosi, ricerca, durata, serie/giri, countdown e pause, copia esercizi, persistenza preesistente, formati video, parsing dei tempi e raggruppamento per vasca. I test PGlite eseguono entrambe le migrazioni su PostgreSQL WASM, creando due squadre e account distinti e provando le policy RLS e le RPC degli inviti. Non richiedono Docker o credenziali.

Playwright prova mobile e desktop, CRUD coach, esercizio personalizzato, allievi, tempi, isolamento locale/logout, player e retry di salvataggio. Le risposte API sono intercettate **solo nei test browser** per verificare la UI senza credenziali; permessi e isolamento DB sono verificati separatamente su PostgreSQL. Non equivalgono a una prova end-to-end di email e Supabase remoto: conferma email, recupero password, cookies HTTPS, riproduzione video e flusso fra due dispositivi vanno verificati sul progetto remoto dopo il collegamento. Chromium con viewport iPhone non sostituisce una prova su Safari/iOS fisico.

CI: `npm ci`, typecheck, lint, test, build e Playwright. Vercel gestisce i deployment, nessuna pipeline duplicata. Non dichiarare la configurazione remota conclusa senza eseguire migrazioni e verificare account reali.

## Git e Vercel

Repository `bapeppe/DrySwim`, branch principale `main`, progetto Vercel `bapeppes-projects/dryswim`. Sviluppo su feature branch, Conventional Commits e PR. Nessun force push, commit diretto o merge su main senza autorizzazione. Workflow: feature → push → preview → verifica e PR → merge approvato → produzione. Non usare `vercel --prod` senza autorizzazione.

Configurare le due variabili server Supabase per la preview prima della prova condivisa. Produzione e preview possono usare progetti Supabase distinti; se condividono il DB, **gli allievi e gli allenamenti sono gli stessi**. Non fare prove distruttive su dati reali. Nessuna service-role key richiesta. `.env.local`, `.vercel`, token e credenziali sono ignorati da Git; `.env.example` contiene soltanto segnaposto.

## Fuori da questa versione

Migrazione automatica del vecchio archivio locale, gestione multisquadra per lo stesso account, notifiche, esportazione/importazione roster, gestione degli account Auth dall’app, reset password amministrativo e pagamenti. Le quote del piano gratuito e l’invio email dipendono dal progetto Supabase scelto. Non è incluso un sistema di classifiche.
