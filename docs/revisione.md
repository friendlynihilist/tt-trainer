# Terza palla: revisione

Fatta il 20 novembre 2026 sulla versione 0.6.1 (ramo `reskin`). Ho letto tutto il codice, ho fatto girare i test e la build, e ho guardato ogni pagina a 390 px, in chiaro e in scuro.

La revisione ha due parti:

- **Cosa ho già cambiato** nell'interfaccia (sezione 1). Le modifiche sono nei file, non ancora in un commit.
- **Cosa resta da fare**, in ordine di importanza (sezioni da 2 a 8). Per ogni punto: il problema, dove si trova, come si risolve.

---

## Stato dopo la versione 0.7.0

| Punto | Stato |
|---|---|
| 3.1 Ripristino della copia | Fatto: `parseBackup` in `export.js` con i suoi test, «Ripristina una copia» in Impostazioni. La copia ora contiene anche le voci in programma. |
| 3.2 Tasto «indietro» | Fatto: fogli e sessione entrano nella cronologia (`ui.svelte.js`). Provato in un browser senza finestra, non su un telefono vero. |
| 3.4 Percorsi archiviati, mezzanotte, annulla dopo «Elimina voce» | Fatto. |
| 4.5 Piano salvato intero | Fatto (`mergeFields` in `cloud.js`, lo stesso in `local.js`). |
| 5.1 Email del gruppo | Fatto nel codice: l'elenco lo leggono solo gli amministratori. **Le regole vanno pubblicate su Firebase dopo aver pubblicato l'app**, non prima: l'app di prima, con le regole nuove, lascerebbe fuori i membri. |
| 5.2 Forma dei dati nelle regole | Fatto, con una prova delle regole nell'emulatore: `npm run test:rules` (30 controlli). |
| 6 Fuoco nei fogli, aree da toccare | Fatto il fuoco e le aree più piccole. Il bianco sull'arancione nel tema chiaro resta com'era. |
| 2.x Parole, appunti, gruppo | Da decidere insieme al restyling. |
| 3.3 Timer a schermo spento, avviso di versione nuova, ricerca nel Diario | Non fatti. |
| 4.1 Migrazione dei dati vecchi | Non fatta: tocca i dati veri di chi usa l'app e va provata con Firebase. |
| 4.2 Logica della sessione nel motore, 4.3 e 4.4 fogli di stile | Non fatti: conviene farli insieme al restyling, che riscrive quelle parti. |
| 5.3 Chi esce dal gruppo | Non fatto. |

---

## In breve

**Cosa va bene.** Il motore (`src/lib/engine/`) è fatto di funzioni pure e ha 100 test. Le medaglie non si salvano mai: si ricalcolano dalle misure, quindi correggere una misura rimette tutto a posto. I due backend (locale e Firebase) hanno la stessa interfaccia. Le regole di Firestore tengono separati i dati di ognuno. La parte Firebase si carica solo quando serve.

**I sei problemi più importanti.**

1. **La copia completa non si può ripristinare.** L'app esporta un file JSON, ma non lo sa rileggere. In modalità locale basta svuotare il browser per perdere tutto. (3.1)
2. **Il tasto «indietro» del telefono non chiude i fogli e la sessione.** Su Android porta via dalla pagina o fuori dall'app. (3.2)
3. **Troppe parole per le stesse cose**, e una parola sbagliata: un «mese» può durare un allenamento solo. (2.1)
4. **Cinque modi diversi di prendere appunti** su un allenamento, che si sovrappongono. (2.2)
5. **Il codice per leggere i dati vecchi** pesa molto: tre formati di dati in tre giorni di vita dell'app, tutti letti per sempre. (4.1)
6. **Il backend Firebase non ha test**, e gli altri membri del gruppo possono leggere le email di tutti. (5.1, 8.1)

---

## 1. Interfaccia: cosa ho cambiato

Il criterio è quello delle tue regole: una domanda per pagina, un'azione principale in vista, niente doppioni, cose diverse con stili diversi, etichette chiare.

### 1.1 Tutte le pagine

| Prima | Adesso | Perché |
|---|---|---|
| Sopra il titolo c'era una scritta piccola («Oggi», «Diario»…) e il titolo era un'altra cosa («Come stai andando», «Allenamenti») | Il titolo è il nome della pagina, lo stesso della barra in basso | Due righe dicevano dove sei; in Libreria il titolo ripeteva la linguetta scelta subito sotto |
| In alto a destra due cose: il punto interrogativo e il profilo | Solo il profilo, che apre Impostazioni. La Guida si apre da lì | Un'icona in meno su ogni pagina |
| Guida e Impostazioni non avevano modo di tornare indietro | Hanno la freccia a sinistra del titolo | Non sono nella barra in basso: si restava senza uscita |
| Il grigio dei testi piccoli aveva contrasto 2,9:1 (chiaro) e 3,6:1 (scuro) | Ora 4,6:1 e 5,1:1 | Sotto 4,5:1 un testo piccolo si legge male, peggio ancora in palestra |
| Nel tema scuro il testo bianco sull'arancione aveva contrasto 2,6:1 | Sul tema scuro il testo sopra l'arancione è scuro (7,2:1) | Riguardava «Inizia», «Salva nel diario» e tutti i pulsanti arancioni |
| Con il foglio dell'allenamento aperto da Oggi, la pagina sotto non veniva bloccata | Ogni foglio blocca la pagina sotto | Era un difetto |

### 1.2 Oggi

- **Sotto «Inizia» c'è una riga sola.** Prima c'erano quattro cose da toccare che facevano tre lavori: la striscia colorata, Blocchi, Cambia, Registra. Ora la riga mostra la striscia, quanti blocchi ci sono e «Vedi e cambia». Apre il foglio dell'allenamento, dove trovi in cima «Scegli un altro allenamento», poi i blocchi con gli esercizi, e in fondo «L'ho già fatto» (registrare senza il timer).
- **Via il badge del livello dalla scheda della tappa.** Era un pulsante appoggiato sopra un altro pulsante, e il livello non riguarda la tappa. Si cambia da Progressi e da Impostazioni.
- **«Questa settimana» al posto di «Allenamenti» con la scelta fra settimana e mese.** Il mese con i pallini era lo stesso calendario del Diario, che si apre con un tocco.
- **Senza un piano**, l'invito a crearlo sta in cima alla pagina, non più in fondo.
- La pagina ha circa la metà delle cose da toccare nella parte alta.

### 1.3 Diario

- Il nome del mese e le frecce stanno **in cima al calendario**, non più su una riga a parte sotto il titolo. «Oggi» compare accanto alle frecce quando serve.

### 1.4 Progressi

- **Le settimane di fila e la costanza del livello sono separate.** Prima stavano nello stesso disegno: l'anello intorno alla fiamma si riempiva con la condizione del livello (4 sedute da argento in 14 giorni), ma il numero accanto diceva le settimane di fila. Sono due misure diverse.
- Ora in alto ci sono **tre numeri** (settimane di fila, ore, attività). Sotto, la scheda del livello con **tre anelli uguali**, uno per condizione: argento, oro, costanza. Una frase dice cosa manca, per tutte e tre le condizioni (prima solo per le famiglie senza argento).
- **Il gruppo non sta più in Progressi.** L'elenco dei compagni è in Impostazioni, nella sezione Gruppo.

### 1.5 Sessione dal vivo e fogli

- **La sensazione ha i nomi sotto le barre** («Dura», «Così così», «Bene», «Molto bene», «Ottima»). Prima erano cinque barre senza scritte: capivi cosa avevi scelto solo dopo averla toccata. Era scritta tre volte, in due stili diversi: ora è un componente solo (`FeelPicker`), uguale nella chiusura della sessione, nella voce del diario e nella nota sul colpo.
- **I segmenti in alto nella sessione** erano alti 8 px e larghi anche 6: ora l'area da toccare è alta 36 px. Lo stesso per il cerchio della chiusura.
- **Nella scelta di un esercizio** c'erano tre file di pulsantini che scorrevano, 17 in tutto e senza un nome. Ora ci sono tre pulsanti con il nome, come in Libreria: Famiglia, Livello, Formato.
- **Cancellare un colpo tuo o un errore tuo** ora chiede conferma. Prima bastava un tocco.
- Nella Guida una frase sulle pause era rimasta alla versione 0.3 («il minuto si toglie alla fase dopo»): corretta.

### 1.6 Pulizia

- Tolti quattro componenti non più usati (`Medal`, `MedalRow`, `Ring`, `WeekStrip`), le icone generiche delle famiglie rimaste in `design.js`, e una quindicina di funzioni e costanti mai usate.
- Tolto il carattere Fraunces: serviva per due scritte. Sono 67 kB in meno da scaricare.
- `docs/design.md` descrive le pagine come sono adesso. `scripts/screenshots.mjs` ha due schermate in più (scelta dell'esercizio, primo avvio) e accetta `W=1280 H=800` per lo schermo largo.

**Non ho toccato**: la versione e le novità (`package.json`, `changelog.js`), le schermate in `docs/design-shots/`, e tutte le scelte elencate nella sezione 2.

---

## 2. Interfaccia: cosa resta da decidere

Queste sono scelte tue: cambiano parole o abitudini, quindi non le ho fatte.

### 2.1 Le parole

Oggi l'app usa tredici nomi: tappa, mese, percorso, modello, pacchetto, blocco, allenamento, sessione, seduta, test, misura, obiettivo, tentativo. Alcuni dicono la stessa cosa, uno dice una cosa non vera.

- **«Mese».** In Libreria un «mese» è ciò su cui lavori (Dritto, Rovescio). Ma nel piano può durare un allenamento, e infatti sotto l'elenco c'è una nota che lo spiega: se serve una nota, il nome è sbagliato. Nel piano e nei fogli si dice già «Su cosa lavori». Proposta: un nome solo per questa cosa, per esempio «argomento» («Argomenti» in Libreria, «Nuovo argomento»), e «mese» solo quando la tappa dura davvero quattro settimane.
- **«Sessione», «seduta», «allenamento».** Nell'interfaccia sono la stessa cosa. Proposta: sempre «allenamento»; «seduta» solo nelle regole delle medaglie, dove vuol dire «giorno».
- **«Modelli» e «pacchetti».** Sono tutti allenamenti pronti. In Libreria stanno in due sezioni con due disegni, nel «+» in un elenco solo, nella scelta dell'allenamento divisi per livello. Proposta: una sezione «Allenamenti» con tre gruppi: i tuoi, quelli del tuo livello, gli altri.

### 2.2 Gli appunti

Su un allenamento puoi scrivere cinque cose diverse:

| Cosa | Dove si scrive | A cosa serve |
|---|---|---|
| Note (testo libero) | chiusura, voce del diario | resta nella voce |
| Sensazione dell'allenamento | chiusura, voce del diario | resta nella voce |
| Da correggere (colpo, errore, esercizio) | chiusura, voce del diario | Oggi, Progressi, scheda del colpo |
| Note tecniche (colpo, palla, zona, errore, fase, voto) | solo voce del diario | Progressi, scheda del colpo |
| Nota sul colpo (testo e sensazione) | sessione, chiusura, scheda del colpo | scheda del colpo |

«Da correggere», «Note tecniche» e «Nota sul colpo» dicono tutte «questo colpo, questo problema». Proposta: una cosa sola, la **nota sul colpo**, con un errore facoltativo. Chi segna l'errore alimenta «Da correggere»; la zona e la palla diventano campi facoltativi della nota. Sull'allenamento restano solo le note libere e la sensazione. La chiusura della sessione passa da cinque gruppi a tre.

### 2.3 La voce del diario

Il foglio è lungo: data, sette tipi, misure, otto durate, compagno, da correggere, note tecniche, note, sensazione. Proposta: in vista data, tipo, misure e durata; il resto in una sezione «Altro», chiusa se vuota. Con la proposta 2.2 si accorcia da sola.

### 2.4 Gli appuntamenti saltati

Un allenamento in calendario non fatto resta «Non registrato», in rosso, per sempre. Dopo un mese il Diario ne è pieno. Proposta: dopo sette giorni la voce resta solo come pallino vuoto nel calendario, senza la riga rossa.

### 2.5 Il gruppo

Il gruppo oggi serve a una cosa: scegliere il nome del compagno alla fine dell'allenamento. Per questo ci sono l'accesso su invito, le richieste, l'amministratore e i profili. Due strade: farlo valere di più (per esempio vedere con chi ti sei allenato più spesso, o proporre un allenamento a un compagno) oppure toglierlo dall'interfaccia e lasciare il nome del compagno come testo libero.

---

## 3. Funzioni: cosa manca

### 3.1 Ripristinare la copia completa (grave)

`Impostazioni → Copia completa` scarica un JSON (`src/lib/engine/export.js`, `backup`). Nessuna funzione lo rilegge. Il foglio «Cancellare tutti i tuoi dati?» dice «esporta prima una copia», ma quella copia non si può usare. Vale anche per chi passa dalla modalità locale a Firebase: i dati non si spostano.

**Come si risolve.** Una funzione pura `restore(json)` in `export.js` che controlla il file e restituisce `{ meta, events, notes }`, con i suoi test; un metodo `app.restore()` che scrive tutto con il backend; una riga «Ripristina una copia» in Impostazioni, con conferma. Mezza giornata.

### 3.2 Il tasto «indietro» (grave su Android)

I fogli e la sessione dal vivo non entrano nella cronologia del browser (`src/lib/store/ui.svelte.js`, `open` e `close`). Con un foglio aperto, «indietro» cambia pagina o esce dall'app. Nella sessione dal vivo la bozza è salvata, ma l'app si chiude.

**Come si risolve.** `open()` aggiunge una voce alla cronologia (`history.pushState`); un ascoltatore di `popstate` chiude il foglio in cima; `close()` chiamato da un pulsante fa `history.back()` e segna che quel ritorno è già gestito. Lo stesso per la sessione: «indietro» la mette in pausa. Serve anche portare il foglio dell'allenamento di Oggi nella pila comune (oggi è l'unico foglio aperto direttamente da una pagina). Va provato su un telefono vero.

### 3.3 Il timer a schermo spento

I suoni di fine blocco partono da un `setInterval` (`Live.svelte`, `checkBells`). Se il telefono blocca lo schermo, il browser lo ferma e la campanella non suona. L'app chiede di tenere lo schermo acceso (`keepAwake`), ma su iPhone con un sistema vecchio, o con il risparmio energetico, la richiesta viene rifiutata in silenzio.

**Come si risolve.** Non c'è una soluzione completa in un sito. Si può almeno dirlo: se il blocco dello schermo non è disponibile, un avviso all'inizio della sessione («Tieni lo schermo acceso: a schermo spento il timer non suona»).

### 3.4 Cose più piccole

- **Un percorso archiviato non si può riprendere.** `TrackEditSheet` archivia, ma niente fa il contrario; in Libreria gli archiviati sono solo una riga di testo. Serve «Riprendi» nella scheda del percorso.
- **Un colpo tuo non si modifica**, si può solo eliminare (`StrokeSheet`). Manca almeno il cambio del nome e della famiglia.
- **Il grafico della sensazione non c'è.** `feelSeries` in `notes.js` prepara i punti ed è testata, ma nessuna pagina la usa.
- **A mezzanotte la data non cambia** se l'app resta aperta in primo piano: `app.today` si aggiorna solo quando torni sull'app (`app.svelte.js`, `visibilitychange`). Basta un controllo ogni minuto.
- **Dopo un aggiornamento dell'app** il nuovo service worker cancella i file vecchi mentre la pagina vecchia è ancora aperta (`vite.config.js`, `registerType: 'autoUpdate'`). I pezzi caricati più tardi (i coriandoli, Firebase) possono non arrivare. Durante una sessione il danno è piccolo, perché la bozza è salvata. Soluzione: `registerType: 'prompt'` e un avviso «C'è una versione nuova» fuori dalla sessione.
- **«Elimina voce» non si annulla.** «Togli dal calendario» sì, con il pulsante nell'avviso. Stesso trattamento per le voci del diario.
- **Nel Diario non si cerca.** Per ritrovare una nota bisogna aprire i mesi uno per uno.

---

## 4. Architettura

La divisione in `data`, `engine`, `store`, `ui` è giusta e rispettata: il motore non importa mai lo stato dell'app. I problemi sono altrove.

### 4.1 Il peso dei dati vecchi

L'app ha tre giorni (0.1.0 il 17 novembre, 0.6.1 il 20) e legge tre formati di dati:

- le voci «Sessione A/B», i test sui percorsi e i servizi (`events.js` `normalizeEvent`, `attempts.js` `fromLegacyTest`, `fromLegacyServe`, `upgradeDraft`, `legacyDraftTests`);
- il piano a due giorni fissi e il piano a settimane (`plan.js` `normalizePlan`, `stagesOf`);
- i modelli a passi e con la pausa «dentro» (`templates.js` `normalizeTemplate`, `stepToBlock`).

A questo si aggiungono `LEGACY_LEVELS`, i livelli dei percorsi in `program.js`, la parte «Test salvati con una versione di prima» in `EventSheet`, la sezione «I test della versione 0.2» in Progressi, `tests/migration.test.js`. Sono diverse centinaia di righe che servono a leggere dati scritti in una finestra di uno o due giorni, da poche persone. Ogni funzione nuova deve tenerne conto.

**Come si risolve.** Una migrazione vera, una volta sola: all'apertura, se `meta.schema` è vecchio, l'app converte voci, piano e modelli nel formato di adesso, li riscrive e segna `meta.schema`. Le funzioni di conversione ci sono già e sono testate: vanno solo usate in scrittura invece che in lettura. Dopo un mese si toglie tutto il resto. Prima si fa, meno costa.

### 4.2 Componenti troppo grandi, con logica non testata

`Live.svelte` ha 1160 righe: crea e riprende la bozza, conta il tempo, decide quando suonare, gestisce i turni, raccoglie le misure, salva la voce, e disegna tutto. `Today` ne ha 850, `Library` 660, `Progress` 630. La logica dentro i componenti non ha test: proprio la sessione dal vivo, che è il cuore dell'app, è la parte meno protetta.

**Come si risolve.** Portare in `engine/live.js` le funzioni che non disegnano niente: `createDraft`, `restoreDraft`, `tick(draft, now)` che restituisce gli eventi («fine blocco», «cambio», «metà partitella»), `collect`, `toEvent`. Si testano come il resto del motore. `Live.svelte` si divide in due: il blocco in corso e la chiusura.

### 4.3 Due fogli di stile sovrapposti

`app.css` è lo stile di prima, `design.css` quello del rifacimento. Convivono doppioni: `--m-bronze` e `--medal-B`, `[data-tier]` e `[data-medal]`, `.title` e `.t-title`, `.mono` e `.t-num`, `.heading` e `.t-caps`. I colori del tema scuro sono scritti quattro volte (due per file: una per «automatico», una per «scuro»).

**Come si risolve.** Un solo file di variabili. Per il tema: lo script in `index.html` scrive sempre `data-theme` (se la scelta è «automatico» legge il sistema), così basta un blocco `[data-theme='dark']`. Poi si tolgono le classi di prima una alla volta.

### 4.4 Stili ripetuti nei componenti

Gli stessi pezzi sono riscritti in più file: la riga «Aggiungi…» (Diario, Libreria, scheda del colpo), l'intestazione con l'icona della famiglia (scheda dell'esercizio e del colpo), `.block { display: block }` e `strong` con sei pesi diversi (560, 570, 580, 650…) in una decina di componenti.

**Come si risolve.** Tre componenti piccoli: `AddRow`, `FamilyHeader`, `QuietButton`. Un solo peso per il grassetto nelle variabili.

### 4.5 Come si salvano le impostazioni

`saveMeta` scrive con `setDoc(…, { merge: true })` (`cloud.js`, riga 160; in locale la funzione `merge` di `local.js` fa lo stesso). Così un campo dentro un oggetto non si può cancellare, e un oggetto nuovo eredita i campi del vecchio. Esempio: `startNewCycle` (`app.svelte.js`, riga 271) salva un piano nuovo, ma nel database il piano nuovo tiene il `pastSlots` del vecchio. Oggi non fa danni, perché quelle date sono passate; è fragile.

**Come si risolve.** Per `plan` (e in genere per gli oggetti che si sostituiscono interi) scrivere con `mergeFields: ['plan']`, che rimpiazza il campo. In locale, la stessa regola in `saveMeta`.

### 4.6 Altre note

- **Due modi di aprire un foglio**: la pila in `ui.svelte.js` e il foglio dell'allenamento scritto dentro `Today.svelte`. Uno solo (serve anche per 3.2).
- **Un solo documento per utente** tiene impostazioni, piano, piani passati e tutto il contenuto personale (`meta.custom`). Il limite di Firestore è 1 MB: lontano, ma `pastPlans` e `plan.skip` crescono senza fine. Tenere gli ultimi tre piani.
- **Nessun controllo del codice** oltre ai test: né `svelte-check` né ESLint. La build stampa avvisi di accessibilità che nessuno legge. Aggiungerli al flusso di pubblicazione.
- **Il motore usa `today()` di sistema** in `stats.js` (`weeklyActivity`, `weekStreak`, `lastFocus`) invece di riceverlo come gli altri: per questo quelle tre funzioni non hanno test.

---

## 5. Sicurezza e privacy

Le basi sono giuste: ognuno legge e scrive solo sotto il proprio `uid`, il profilo del gruppo accetta solo il nome, nel codice non c'è `{@html}` (quindi il testo importato non può eseguire niente), la chiave di Firebase è pubblica per natura.

### 5.1 Le email del gruppo sono leggibili da tutti i membri

`firestore.rules`, riga 31: `allow get: if isMember()` su `config/access`. Quel documento contiene le email di tutti. L'interfaccia le mostra solo all'amministratore, ma qualsiasi membro le può leggere con gli strumenti del browser. L'app promette «il gruppo vede solo il tuo nome».

**Come si risolve.** Dividere il documento: `config/admins` (leggibile dai membri) e un documento per membro, `members/{email}`, che può leggere solo l'interessato. La regola `isMember()` diventa `exists(/members/$(email()))`.

### 5.2 Nessun controllo sulla forma dei dati

Le regole controllano chi scrive, non cosa. In `requests/{uid}` chiunque abbia un account Google può scrivere un documento qualsiasi (uno solo, ma grande fino a 1 MB). In `profiles/{uid}` il nome non ha limite di lunghezza.

**Come si risolve.** `request.resource.data.keys().hasOnly([...])` e limiti di lunghezza (`name.size() < 80`) su `requests` e `profiles`.

### 5.3 Altre note

- **Chi esce dal gruppo non può più esportare i suoi dati**: le regole chiedono `isMember()` anche per leggere i propri. E i suoi dati restano nel database. Permettere la lettura dei propri dati a chiunque abbia fatto l'accesso.
- **Il primo che entra diventa amministratore.** Va bene per un progetto già avviato; da ricordare se si crea un progetto nuovo.
- **Proteggere il progetto Firebase**: limitare la chiave al dominio del sito (console Google Cloud) e accendere App Check, così nessuno usa il progetto da un altro sito.
- **`npm audit`** segnala 4 avvisi alti e 4 medi. Sono in strumenti che non arrivano nel browser (`@grpc/grpc-js` dentro Firebase, `glob` dentro il plugin PWA). Niente di urgente: aggiornare `firebase` e `vite-plugin-pwa` quando escono le versioni corrette.

---

## 6. Accessibilità

- **I fogli non gestiscono il fuoco** (`Sheet.svelte`): hanno `role="dialog"` e `aria-modal`, ma aprendoli il fuoco resta sulla pagina sotto, e con il tasto Tab si esce dal foglio. Serve portare il fuoco nel foglio all'apertura, tenerlo dentro, e riportarlo dov'era alla chiusura. La maniglia per trascinare il foglio non ha un ruolo (la build lo segnala).
- **Aree da toccare piccole.** La regola in `design.md` è 44 × 44. Ho sistemato le più piccole (segmenti della sessione, cerchio della chiusura, frecce del Diario). Restano sotto misura: le durate nel piano (34), i filtri (36), i pulsanti `icon-btn` (40), i «−» e «+» dei minuti nell'editor degli allenamenti, la legenda che filtra nel Diario (32).
- **Bianco sull'arancione nel tema chiaro**: 3,5:1. Va bene per le scritte grandi («Inizia»), non per i pulsanti piccoli. Per arrivare a 4,5:1 l'arancione dovrebbe scurirsi fino a `#C94A0A`: è una scelta di colore, la lascio a te.
- **La legenda del Diario è anche un filtro**, ma sembra solo una legenda: niente dice che si tocca.

---

## 7. Prestazioni

Nessun problema vero. La pagina principale pesa 144 kB compressi, Firebase altri 193 kB caricati a parte, la cache offline 1,3 MB. I calcoli (medaglie, agenda, livello) si rifanno per intero a ogni cambio, ma con qualche centinaio di voci restano di pochi millisecondi. `agenda()` viene chiamata tre volte per pagina (Oggi, settimana, Diario): si può calcolare una volta nello stato, quando servirà.

---

## 8. Test e qualità

### 8.1 Cosa non è coperto

- **Il backend Firebase** (`cloud.js`) e le regole: nessun test. Il README lo dice («non ancora provato»), ma è il backend in uso. Servono i test delle regole con gli emulatori (`@firebase/rules-unit-testing`): chi legge cosa, il primo accesso, le richieste.
- **Lo stato e le azioni** (`app.svelte.js`, `actions.js`): nessun test. `moveItem`, `removeItem` con l'annulla, `saveCustomMany` si possono provare con il backend locale.
- **L'interfaccia**: nessun test. Ma `scripts/screenshots.mjs` apre già ogni pagina e ogni foglio con dati di esempio: se uno dei suoi passi non trova un pulsante, si ferma. Farlo girare nel flusso di pubblicazione, controllando anche che la console non abbia errori, è già un buon test di fumo.

### 8.2 Piccole cose

- Il README diceva 93 test: sono 100 (corretto).
- I testi dell'importazione citano «Claude» per nome (`ImportSheet`): se l'app è per un gruppo, «un assistente» basta.

---

## 9. In che ordine

1. Ripristino della copia (3.1) e tasto «indietro» (3.2): sono le due cose che un utente può pagare care.
2. Le email del gruppo (5.1) e i controlli sulle regole (5.2).
3. Le parole (2.1) e gli appunti (2.2): cambiano l'aspetto di più pagine, meglio deciderle insieme.
4. La migrazione dei dati vecchi (4.1), poi togliere il codice che non serve più.
5. La logica della sessione nel motore, con i test (4.2).
6. Un solo foglio di stile (4.3, 4.4).
7. Test delle regole e schermate nel flusso di pubblicazione (8.1).

## Dopo la revisione: il rifacimento a mattoni (0.8.0)

Scelto dall'utente su un prototipo da provare. Fatto: colori nuovi, Oggi con il tavolo, costruttore a mattoni,
primo avvio in sette passi, guida a fuoco, mappa dei colpi in Progressi, Libreria con i propri allenamenti in
alto, note per colpo alla chiusura, finestra delle novità nello stesso stile. Provato con gesti veri in Chrome
senza finestra (primo avvio completo e passaggio da una 0.7.0 con dati), non su un telefono.

Resta da fare: il foglio «Il piano» in Impostazioni lavora ancora a tappe e a mesi; chi ha un piano di prima
continua a usarlo com'è.
