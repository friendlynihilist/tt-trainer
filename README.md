# Terza palla

Allenamento e diario di tennistavolo. Nasce dal foglio «Piano allenamento tennistavolo – ciclo di 3 mesi»:
l'app compone ogni sessione al livello raggiunto in ciascun percorso e tiene il diario di ognuno separato.

Sito: **https://friendlynihilist.github.io/tt-trainer/**

## Come è fatta

- **Frontend**: Svelte 5 + Vite, sito statico (va su GitHub Pages). Navigazione con hash, percorsi relativi.
- **Backend**: Firebase — Authentication (Google) e Firestore. Nessun server da gestire, piano gratuito.
- **Senza Firebase** (`src/firebase.config.js` vuoto) l'app gira in modalità locale: dati nel browser.

Il "file principale" (esercizi, livelli, tassonomia) sta nel codice, in `src/lib/data/`: è di sola lettura
per tutti. I dati di ciascuno stanno in Firestore sotto `users/{uid}` e le regole (`firestore.rules`)
impediscono di leggere o scrivere quelli degli altri.

| Percorso | Contenuto |
| --- | --- |
| `src/lib/data/` | programma, percorsi, esercizi, tassonomia dei colpi |
| `src/lib/engine/` | livelli, piano, composizione della sessione, statistiche (funzioni pure, testate) |
| `src/lib/store/` | stato dell'app, backend locale e cloud |
| `src/lib/pages/`, `sheets/`, `screens/`, `ui/` | interfaccia |
| `tests/` | test del motore, incluso il confronto con le formule dell'Excel |

Il livello di un percorso non è mai salvato: si ricalcola dalla storia dei test. Correggere una sessione
passata aggiorna da solo il livello di oggi.

### Allenamenti, test e calendario

- **Modelli** (`src/lib/data/templates.js`): la scaletta di un allenamento. Di base: Completo (il programma
  del foglio), Breve, Servizi e terza palla. Ognuno può crearne di suoi dalla Libreria.
- **Percorsi e mesi personali**: in `meta.custom` (tracks, blocks, templates) di ciascun utente; il catalogo
  (`src/lib/data/catalog.js`) li unisce a quelli di base. I percorsi personali hanno da 1 a 8 livelli.
- **Piano**: mesi in fila (di base o personali), settimane per mese, e un ritmo settimanale libero
  (`slots`: quanti allenamenti e test si vuole, in che giorni). Cambiare il ritmo non riscrive il passato.
- **Test**: un appuntamento a sé. Se cade lo stesso giorno di un allenamento si fa dentro l'allenamento.
- **Suggeritore** (`src/lib/engine/suggest.js`): quali percorsi misurare e una sessione su misura, con i motivi.
- **Importazione**: Libreria → Importa. Il formato (con le istruzioni da dare a un assistente) è in
  `src/lib/data/importer.js`.

### Dati del primo modello

Le voci salvate come «Sessione A/B» e il piano con due giorni fissi non vengono riscritti: si leggono così come
sono (`normalizeEvent`, `normalizePlan`) e restano identici finché non li si modifica. I test in
`tests/migration.test.js` verificano che livelli, storia e calendario restino gli stessi.

## Sviluppo

```sh
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

## Collegare Firebase

1. [console.firebase.google.com](https://console.firebase.google.com) → nuovo progetto.
2. **Authentication → Metodo di accesso → Google → Attiva.**
3. **Authentication → Impostazioni → Domini autorizzati**: aggiungi `friendlynihilist.github.io`.
4. **Firestore Database → Crea database** (modalità produzione).
5. **Regole**: incolla il contenuto di `firestore.rules` e pubblica
   (oppure `npx firebase-tools deploy --only firestore:rules --project ID_PROGETTO`).
6. **Impostazioni progetto → Le tue app → Web**: copia la configurazione in `src/firebase.config.js`.

Il primo che accede diventa amministratore del gruppo. Gli altri entrano con Google, toccano
«Chiedi di entrare» e l'amministratore li approva da Impostazioni → Gruppo.

## Pubblicare su GitHub Pages

Il workflow `.github/workflows/deploy.yml` pubblica a ogni push su `main`.
Nel repository: **Settings → Pages → Source: GitHub Actions**.

## Stato dei lavori

Scritto e provato nel browser in modalità locale (`VITE_LOCAL=1 npm run dev` forza la modalità locale anche
con Firebase configurato): wizard, Oggi, sessione dal vivo, diario, progressi, libreria, editor di modelli,
importazione, piano, e il passaggio dei dati del primo modello. Il motore ha 59 test, incluso il confronto con
le formule dell'Excel.

Non ancora provato: il backend cloud (`src/lib/store/cloud.js`) e le regole Firestore, che richiedono un
progetto Firebase o gli emulatori (`VITE_EMULATOR=1 npm run dev` insieme a `npm run emulators`).
Da guardare ancora: tema chiaro e layout su schermo largo.
