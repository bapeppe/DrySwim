# SwimDryland

Web app mobile-first in italiano per allenamenti a secco di una squadra di nuoto (14–17 anni). Programmi senza acquisto di attrezzatura, schede tecniche, timer, builder e progressi reali sul dispositivo.

## Stack e requisiti

Next.js 16 App Router, React 19, TypeScript strict, Tailwind 4, componenti UI con Radix Slot secondo la composizione shadcn/ui, Lucide, Zustand e Zod. Node.js 24 LTS e npm; nessun database, token o variabile d’ambiente necessaria per avviare l’MVP. `package-lock.json` è versionato.

```sh
npm ci
npm run dev
```

Apri http://localhost:3000. Per la produzione:

```sh
npm run build
npm start
```

## Uso

- **Panoramica**: programma consigliato, calendario della settimana, riepilogo e ultima sessione. Il consiglio ruota per giorno; non sostituisce l’assegnazione dell’allenatore.
- **Esercizi**: 52 record unici che coprono tutte le 55 voci originarie. Scapular Push-up, Plank Shoulder Taps e Hollow Body Hold hanno due categorie. Ricerca, filtri cumulativi, ordine alfabetico e preferiti persistenti.
- **Allenamenti**: tre programmi con riscaldamento, due giri, recuperi e defaticamento. Prima di iniziare, l’atleta conferma di aver concordato il programma con l’allenatore.
- **Player**: un movimento alla volta, conferma delle serie a ripetizioni, conto alla rovescia per le tenute, recuperi automatici, pausa, salti, ritorno alla fase precedente, interruzione e riepilogo. Il countdown bilaterale include entrambi i lati e indica quando cambiare. Le tre posizioni Y-T-W sono esplicite.
- **Progressi**: solo risultati salvati; sessioni interrotte nello storico ma escluse dal conteggio degli allenamenti completati. Nessuna classifica o dato dimostrativo.
- **Spazio allenatore**: modalità locale, creazione/modifica/duplicazione/eliminazione di programmi e personalizzazione dei modelli. Riordino accessibile tramite pulsanti su/giù. Serie, lati, posizioni, dosi, ritmo, giri, recuperi e fasi modificabili. Per aggiungere una scheda al builder, aprila in modalità allenatore.
- **Preferenze**: tema, livello, suoni, modalità locale ed esportazione JSON. I dati non sono sincronizzati. La separazione atleta/allenatore non è autenticazione e non protegge l’accesso.

La durata è la somma delle fasi: ripetizioni × secondi/ripetizione × lati × posizioni × serie × giri, oppure secondi × lati × posizioni per le tenute. Ogni recupero include 8 secondi di cambio posizione; non è aggiunto un recupero extra prima del defaticamento. La durata reale dipende dalle pause e dal ritmo.

Il timer usa scadenze `Date.now()` e non sottrae secondi a ogni tick. Un ritorno dall’altra scheda aggiorna il tempo immediatamente. Solo la fase corrente può terminare automaticamente: l’app non marca come eseguiti gli esercizi successivi durante l’assenza. Le pause esplicite non entrano nella durata attiva; il tempo in background durante una fase avviata sì. Ogni modifica al player viene salvata per riprendere dopo un reload.

## Struttura

```text
src/app/                 Route App Router, layout, errori, manifest e CSS
src/components/          Dashboard, schede, player, builder, progressi
src/components/ui/       Primitive UI riutilizzabili
src/data/exercises.ts    Catalogo e associazioni per categoria
src/data/workouts.ts     Tre programmi predefiniti
src/data/videos.ts       Registro centralizzato dei video verificati
src/lib/models.ts        Modelli TypeScript e schemi Zod
src/lib/workouts.ts      Filtri, dosi, calendario, espansione e stime
src/lib/player.ts        Motore puro di avanzamento e timer
src/lib/storage.ts       Persistenza validata e gestione errori
src/state/store.ts       Stato applicativo Zustand
public/                  Icone e service worker
tests/                   Test del dominio e test browser responsive
.github/workflows/       CI delle pull request
```

## Esercizi e contenuti

Aggiungere una riga in `src/data/exercises.ts`: ID e slug stabili, nome, categoria, dose, muscoli, tre istruzioni specifiche, errori, varianti e attrezzatura. I record finali vengono validati da Zod. Per categorie multiple aggiungere l’associazione allo stesso record, senza duplicarlo. I dosaggi sono proposte iniziali modificabili: per gli intervalli originari si usa un valore rappresentativo, da adattare con l’allenatore. Aggiornare i test del numero di esercizi quando il catalogo cambia intenzionalmente.

Gli esercizi unilaterali usano `dose.sides: 2`; le circonduzioni hanno due direzioni; Y-T-W usa `dose.positions: 3`. Non moltiplicare nuovamente le ripetizioni per lato nel builder.

I contenuti sportivi devono essere revisionati e approvati dall’allenatore prima dell’assegnazione. Le varianti avanzate richiedono tecnica acquisita. I salti includono prerequisiti, ammortizzazione, allineamento, recupero e variante senza impatto. Nessuna indicazione al cedimento o a massimali. I benefici descrivono finalità possibili, non risultati garantiti. Il rematore con asciugamano è auto-resistito senza ancoraggio e non equivale al rematore con carico esterno.

Riferimento per i principi di progressione e tecnica nei giovani: [NSCA, Youth Training and Long-Term Athletic Development](https://www.nsca.com/about-us/position-statements/youth-training-and-long-term-athletic-development/).

## Video YouTube

Nessun ID è inventato. Il registro iniziale è vuoto: tutte le schede offrono una ricerca YouTube con **il nome esatto** dell’esercizio e le istruzioni complete rimangono disponibili. Prima di inserire un video, verificarne visualmente esercizio, variante, qualità e istruttore; la disponibilità del link non equivale a una revisione tecnica.

In `src/data/videos.ts`, aggiungere:

```ts
'squat': {
  youtubeVideoId: 'ID_VERIFICATO', // sostituire con l’ID reale di 11 caratteri
  sourceUrl: 'URL_REALE_VERIFICATO',
  reviewedAt: 'AAAA-MM-GG',
  reviewedBy: 'Revisore',
},
```

`Exercise.youtubeVideoId` viene popolato dal registro. Il player carica la YouTube IFrame Player API e il dominio youtube-nocookie solo dopo l’azione dell’utente, gestisce errori e timeout, distrugge l’iframe al cambio scheda e non controlla il timer dell’allenamento. Non scaricare o redistribuire i video. Richiedono Internet; non vengono memorizzati nella cache offline. [Documentazione ufficiale IFrame API](https://developers.google.com/youtube/iframe_api_reference).

## Persistenza e architettura futura

Chiave `swimdryland:v1`, snapshot versionato con preferenze, preferiti, programmi, sessioni e sessione attiva. Zod valida ogni lettura e scrittura. Un file locale non leggibile viene conservato, il salvataggio viene bloccato e si propone esportazione prima del ripristino. Errori di quota e restrizioni del browser sono visibili. L’esportazione non è un’importazione o una sincronizzazione.

I modelli includono ID stabili, `targetAthleteIds` e sessioni separate dai programmi. Autenticazione, PostgreSQL, autorizzazione server, assegnazioni multi-atleta e sincronizzazione sono estensioni future: sostituire lo strato storage/store con repository e servizi autenticati, mantenendo la logica pura. Non inserire informazioni sensibili o dati sanitari nel browser.

## PWA

Manifest italiano, display standalone, icone PNG 192/512 e SVG, metadati iOS. Il service worker pre-carica le route pubbliche principali e memorizza solo asset statici dello stesso dominio. Le navigazioni usano la rete con fallback alla shell; script caricati vengono conservati. Il primo caricamento, le pagine non ancora disponibili e tutti i video richiedono rete. Non è garantita una prima apertura offline. Aggiornare la versione della cache di `public/sw.js` quando cambiano le strategie di caching. Non memorizzare dati personali nelle risposte della cache.

## Controlli e CI

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Vitest verifica schema/catalogo, deduplicazione, filtri, dosi e durata, serie, countdown, pausa/ripresa, recupero, sessioni complete/parziali, persistenza, dati corrotti, calendario e fallback video. Playwright verifica da browser mobile e desktop: assenza di overflow, ricerca e preferiti, video mancanti, builder CRUD/riordino, sessione completa con timer, progressi persistenti, tema e focus tastiera. Chromium emula il viewport iPhone: non è una prova su un dispositivo iOS fisico. La riproduzione di un video reale va verificata quando verrà inserito un ID revisionato.

La CI su PR verso `main` usa Node 24 e `npm ci`, cache npm, typecheck, lint, test, build e test browser. Non esegue deployment.

La verifica iniziale `npm audit --omit=dev` non segnala vulnerabilità di produzione. L’audit completo segnala cinque advisory di sviluppo nella catena `eslint-config-next` → `fast-glob` → `micromatch` → `braces`, senza una correzione compatibile pubblicata al momento della verifica. Non eseguire `npm audit fix --force` indiscriminatamente: proporrebbe un downgrade di Next ESLint a una major precedente.

## Git e Vercel

Branch principale: `main`. Sviluppo MVP: `feat/swim-dryland-mvp`. Conventional Commits, push sul feature branch e pull request; nessun commit diretto o merge automatico su main.

```sh
git switch -c feat/nome-funzionalita
npm run check
git add <file>
git commit -m "feat: descrizione"
git push -u origin feat/nome-funzionalita
```

Progetto remoto: `bapeppe/DrySwim`. Progetto Vercel esistente: `bapeppes-projects/dryswim`. `vercel.json` imposta Next.js e build/install standard, anche se il preset iniziale del progetto era Other. Usare Node 24 nelle impostazioni Vercel. Nessuna variabile d’ambiente richiesta.

La Git Integration deve collegare il repository GitHub al progetto. Il flusso è feature branch → push → preview Vercel → verifica e PR → merge approvato su main → production. Non aggiungere pipeline di deployment GitHub Actions. Un deploy CLI, se necessario per una preview quando l’integrazione non è disponibile, deve rimanere preview; non usare `--prod` senza approvazione.

`.vercel`, `.env*`, token e credenziali sono esclusi dal repository. Il comando `vercel link` può generare `.env.local`: non versionarlo. Gli eventuali segreti futuri vanno nelle variabili d’ambiente server Vercel.

## Limiti espliciti dell’MVP

Nessun account, assegnazione remota, database, sincronizzazione, importazione backup o notifiche push. Tutti i video usano il fallback finché un revisore non registra riferimenti verificati. La revisione tecnica dell’allenatore e la verifica fisica su iOS/Android rimangono necessarie prima dell’uso con la squadra. Nessuna raccolta di dati personali, competizione pubblica o gamification sul volume di lavoro.
