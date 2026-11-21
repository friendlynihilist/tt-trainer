# Terza palla

Allenamento e diario di tennistavolo. Gli allenamenti si costruiscono con i mattoni, uno per colpo; l'app
misura i progressi con le medaglie, li mostra nella mappa di ogni colpo e tiene il diario di ognuno separato.
Nasce dal foglio «Piano allenamento tennistavolo – ciclo di 3 mesi», che resta fra i modelli di base.

Sito: **https://friendlynihilist.github.io/tt-trainer/**

## Come è fatta

- **Frontend**: Svelte 5 + Vite, sito statico (va su GitHub Pages). Navigazione con hash, percorsi relativi.
- **Backend**: Firebase — Authentication (Google) e Firestore. Nessun server da gestire, piano gratuito.
- **Senza Firebase** (`src/firebase.config.js` vuoto) l'app gira in modalità locale: dati nel browser.

Il "file principale" (libreria degli esercizi, programma, tassonomia) sta nel codice, in `src/lib/data/`: è di sola lettura
per tutti. I dati di ciascuno stanno in Firestore sotto `users/{uid}` e le regole (`firestore.rules`)
impediscono di leggere o scrivere quelli degli altri.

| Percorso | Contenuto |
| --- | --- |
| `src/lib/data/` | libreria degli esercizi, programma, percorsi, tassonomia dei colpi |
| `src/lib/engine/` | tentativi, medaglie, livello, piano, composizione della sessione, statistiche (funzioni pure, testate) |
| `src/lib/store/` | stato dell'app, backend locale e cloud |
| `src/lib/pages/`, `sheets/`, `screens/`, `ui/` | interfaccia |
| `tests/` | test del motore: medaglie, livello, migrazione dei dati, piano, composizione, mattoni |
| `docs/` | la ricerca sui livelli e gli esercizi, il progetto della fase 2 |

### Libreria, medaglie e livello

- **Libreria** (`src/lib/data/library.js`): 82 esercizi in otto famiglie, ognuno con livello suggerito,
  formato (da solo, con compagno, multiball, robot), misura, gradini delle medaglie, criterio di qualità,
  errori comuni e colpi allenati. Fonti e scelte sono in `docs/ricerca-livelli-esercizi.md`.
- **Tentativi**: ogni misura su un esercizio. Le voci nuove li salvano in `attempts`.
- **Medaglie** (`src/lib/engine/medals.js`): non sono mai salvate, si ricalcolano dai tentativi. Correggere
  una misura passata rimette tutto in ordine da solo. Le medaglie non si perdono e non bloccano niente.
- **Livello del giocatore** (`meta.player`): lo sceglie il giocatore. L'app propone il livello dopo con la
  regola di `src/lib/engine/player.js`; il livello serve solo a scegliere cosa proporre.
- **Regola generale**: medaglie e livello non nascondono né disabilitano mai un esercizio, un test o un
  obiettivo.

### Mattoni, costruttore e guida (dalla 0.8)

- **Mattoni** (`src/lib/data/bricks.js`): uno per colpo (Dritto, Rovescio, Servizio, Ricezione, Gambe, Gioco
  tagliato, Schemi), più Riscaldamento e Partita. Dritto e Rovescio prendono da palleggio, attacco e block
  secondo il lato dei colpi allenati. Un allenamento a mattoni è un modello a blocchi come gli altri, con
  `brick` su ogni blocco e `gaps: false` (niente pause: la durata è la somma dei mattoni, almeno 10 minuti l'uno).
- **Costruttore** (`src/lib/ui/Tower.svelte`, `src/lib/screens/Builder.svelte`): la torre e il vassoio. Si
  aggiunge toccando o trascinando, si allunga trascinando il bordo, si riordina trascinando, si scelgono gli
  esercizi toccando il mattone. Si apre dal tasto + e da «Cambia i mattoni».
- **Primo avvio** (`src/lib/screens/Wizard.svelte`): il livello, in cosa vuoi sentirti più sicuro, un allenamento
  proposto o costruito, per quanto tempo (solo oggi, una settimana, un mese) e in quali giorni. «Solo oggi» mette
  l'allenamento in calendario oggi; settimana e mese creano un piano di una o quattro settimane.
- **Mappa** (`src/lib/ui/BrickMap.svelte`, in Progressi): una casella per esercizio con la medaglia più alta, le
  righe per livello, la pallina sull'esercizio da fare adesso (il primo senza argento in ogni fila).
- **Guida** (`src/lib/ui/tours.js`, `Coach.svelte`): illumina una zona alla volta e avanza quando fai la cosa
  richiesta. Due giri: i mattoni la prima volta nel costruttore; medaglie e mappa appena arrivi in Oggi.
  Chi li ha visti è in `meta.tour`; da Impostazioni si rivedono.

### Note per colpo

- Un diario libero per ogni colpo: testo, sensazione da 1 a 5, e se vuoi l'esercizio e l'allenamento in cui
  è nata la nota. Si salvano in `users/{uid}/notes/{id}` (in modalità locale nel browser) e restano personali.
- Ogni nota salva anche la famiglia del colpo: `src/lib/engine/notes.js` (`feelSeries`) dà già i punti per i
  grafici della sensazione per colpo e per famiglia.
- Le note sono nel CSV e nella copia completa (`src/lib/engine/export.js`).

### Allenamenti, test e calendario

- **Allenamenti** (`src/lib/data/templates.js`): blocchi con durata ed esercizi della libreria (o «del mese»).
  Di base: Completo, Breve, Servizi e terza palla. I modelli salvati prima della 0.4 (`steps`) si leggono
  convertiti in blocchi, con la stessa durata totale (la pausa ora si aggiunge sempre fra i blocchi).
- **Pacchetti** (`src/lib/data/packages.js`): due per livello, da 90 e 60 minuti, dalla sezione 4 della
  ricerca; la partitella ha la variante del livello (sezione 5). Le pause le aggiunge la composizione.
- **Allenamenti personali**: in `meta.custom.templates`, creati da zero o da un pacchetto. Ogni esercizio si
  cambia per una sola sessione, oppure si salva l'allenamento modificato come proprio.
- **Percorsi**: una sequenza di esercizi. Il passo «esercizio del mese» propone il primo senza argento.
- **Esercizi, percorsi e mesi personali**: in `meta.custom` (exercises, tracks, blocks, templates) di ciascun
  utente; il catalogo (`src/lib/data/catalog.js`) li unisce a quelli di base.
- **Piano**: mesi in fila (di base o personali), settimane per mese, e un ritmo settimanale libero
  (`slots`: quanti allenamenti e test si vuole, in che giorni). Cambiare il ritmo non riscrive il passato.
- **Test**: un appuntamento a sé, con gli esercizi proposti dall'app (e il motivo). In allenamento ogni
  esercizio ha «Prova l'obiettivo».
- **Importazione**: Libreria → Importa. Il formato (con le istruzioni da dare a un assistente) è in
  `src/lib/data/importer.js`.

### Dati del primo modello

Le voci salvate come «Sessione A/B», quelle della 0.2 e il piano con due giorni fissi non vengono riscritti:
si leggono così come sono (`normalizeEvent`, `normalizePlan`). I test sui percorsi e i servizi diventano
tentativi sugli esercizi corrispondenti, in lettura (`src/lib/engine/attempts.js`). I test in
`tests/migration.test.js` verificano storia, medaglie e calendario.

## Sviluppo

```sh
npm install
npm run dev      # http://localhost:5173
npm test
npm run test:rules   # le regole di Firestore nell'emulatore (serve Java)
node scripts/prova-primo-avvio.mjs    # il primo avvio con gesti veri, in Chrome senza finestra (serve `VITE_LOCAL=1 npx vite --port 5175`)
node scripts/prova-aggiornamento.mjs  # il passaggio da una 0.7.0 con dati
npm run build
```

## Collegare Firebase

1. [console.firebase.google.com](https://console.firebase.google.com) → nuovo progetto.
2. **Authentication → Metodo di accesso → Google → Attiva.**
3. **Authentication → Impostazioni → Domini autorizzati**: aggiungi `friendlynihilist.github.io`.
4. **Firestore Database → Crea database** (modalità produzione).
5. **Regole**: incolla il contenuto di `firestore.rules` e pubblica (dalla 0.3 il profilo del gruppo accetta solo il nome)
   (oppure `npx firebase-tools deploy --only firestore:rules --project ID_PROGETTO`).
6. **Impostazioni progetto → Le tue app → Web**: copia la configurazione in `src/firebase.config.js`.

Il primo che accede diventa amministratore del gruppo. Gli altri entrano con Google, toccano
«Chiedi di entrare» e l'amministratore li approva da Impostazioni → Gruppo.

## Pubblicare su GitHub Pages

Il workflow `.github/workflows/deploy.yml` pubblica a ogni push su `main`.
Nel repository: **Settings → Pages → Source: GitHub Actions**.

## Stato dei lavori

Scritto e provato nel browser in modalità locale (`VITE_LOCAL=1 npm run dev` forza la modalità locale anche
con Firebase configurato), anche a 390 px: primo avvio con la guida, costruttore (con gesti veri in Chrome
senza finestra), Oggi, mappa, sessione dal vivo con obiettivi e medaglie, test,
diario, progressi, libreria, livello, pacchetti, editor degli allenamenti, e il passaggio dei dati della
prima versione, della 0.2 e dei modelli personali. Il motore ha 114 test.

Non ancora rifatto con i mattoni: il foglio «Il piano» in Impostazioni (lavora ancora a tappe e a mesi).

Non ancora provato: il backend cloud (`src/lib/store/cloud.js`) e le regole Firestore, che richiedono un
progetto Firebase o gli emulatori (`VITE_EMULATOR=1 npm run dev` insieme a `npm run emulators`).
Da guardare ancora: tema chiaro e layout su schermo largo.
