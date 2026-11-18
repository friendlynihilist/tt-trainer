# Fase 2: livelli suggeriti e medaglie

Progetto approvato il 18 novembre 2026, con le correzioni riportate nella sezione 8. Versione di arrivo: 0.3.0.

Riferimento: `docs/ricerca-livelli-esercizi.md` (qui sotto «la ricerca»). Le sezioni citate (3, 4, 6.2, 6.3) sono di quel documento.

---

## 0. In breve

1. Spariscono i cancelli: niente più «due test di fila da 8 per salire», niente test di partenza, niente mese 3 bloccato. La regola vecchia si toglie del tutto.
2. Arriva la libreria degli esercizi: le 69 voci della sezione 3, più 6 voci che vengono dal programma attuale (2.1.4) e 7 voci nuove (2.1.6). Ogni voce ha famiglia, livello suggerito, formato (da solo, con compagno, multiball, robot), descrizione, criterio di qualità, errori comuni e obiettivi a gradini.
3. Ogni misura diventa un **tentativo** su un esercizio. Le **medaglie** si calcolano dai tentativi con le regole della sezione 6.2 e non si perdono.
4. Il **livello del giocatore** (principiante, intermedio, avanzato, esperto, pro) lo sceglie lui: nel primo avvio, oppure al primo accesso dopo l'aggiornamento. Se non sceglie, è principiante. Si cambia sempre da Impostazioni.
5. L'app propone il livello dopo con la regola della sezione 6.3. Se il giocatore rifiuta, la proposta torna dopo 21 giorni oppure dopo 3 nuovi ori, quello che arriva prima.
6. Il **test** è solo un appuntamento a parte. In allenamento, su ogni esercizio, puoi provare il prossimo obiettivo: «Raggiungi l'argento!».
7. Medaglie e livello sono personali: il gruppo vede solo il nome.
8. Nessun dato si perde. I test fatti sui percorsi diventano tentativi sugli esercizi corrispondenti, in lettura, senza riscrivere niente.

### Regola generale: niente blocca niente

Medaglie e livello non bloccano mai nulla. Ogni esercizio, test e obiettivo è sempre disponibile, a qualsiasi livello e con qualsiasi medaglia.

- Le medaglie sono solo un indicatore: il record personale e il gradino raggiunto. Sono anche l'unico dato usato per suggerire il livello.
- Il livello serve solo a scegliere quali pacchetti ed esercizi proporre.
- Nel codice non resta nessun controllo che nasconda o disabiliti un esercizio in base a medaglie o livello. Gli elenchi mostrano sempre tutto; il livello cambia solo l'ordine e le proposte.

---

## 1. Cosa cambia per chi usa l'app

| Oggi (0.2.1) | Con la 0.3.0 |
|---|---|
| Ogni percorso ha 5 livelli. Si sale con due test da 8 su 10. | Ogni esercizio ha 3 o 4 medaglie. Le prendi quando raggiungi la soglia. |
| Il primo test di un percorso è un test di partenza. | Non c'è più. Scegli il tuo livello. |
| Il mese 3 si apre con le aperture al livello 3. | Il mese 3 si apre come gli altri. |
| Un test in calendario lo stesso giorno di un allenamento finisce dentro l'allenamento. | Il test resta un appuntamento a parte. In allenamento puoi provare gli obiettivi quando vuoi. |
| «Su misura» compone la sessione dai livelli dei percorsi. | Si toglie. Nella fase 3 arrivano i pacchetti per livello. |
| Impostazioni: soglie dei test (8 e 4). | Si tolgono. Al loro posto: il tuo livello. |
| Il gruppo vede livelli dei percorsi, sessioni, settimana. | Il gruppo vede solo il nome. |

I mesi del piano, i modelli (Completo, Breve, Servizi), il ritmo settimanale, il diario e le note restano come sono.

---

## 2. Modello dei dati

### 2.1 Libreria (nel codice, di sola lettura)

Nuovo file `src/lib/data/library.js`. Come oggi `program.js`, sta nel codice: nessuno può modificarla dal database.

Gli esercizi e i colpi della tassonomia sono **due collezioni separate**: alcuni id coincidono (`ap-d` è sia un colpo sia un esercizio), ma non si mescolano mai. Un esercizio indica i colpi che allena nel campo `strokes`.

#### 2.1.1 Una voce

```js
{
  id: 'top-d-block',
  family: 'attacco',
  level: 'intermedio',
  name: 'Top di dritto contro block',
  text: 'Diagonale dritto, ritmo medio.',
  quality: 'Rimbalzo sempre nello stesso punto.',   // criterio di qualità
  modes: ['compagno', 'robot'],                     // formato: solo, compagno, multiball, robot
  measure: { type: 'fila', unit: 'colpi' },         // come si misura
  goals: { B: 5, A: 10, O: 20, P: 40 },             // soglie dei gradini
  errors: ['rete', 'ritardo', 'posizione'],         // errori comuni (id della lista Errori)
  strokes: ['top-d'],                               // colpi allenati (sezione 3.3)
  source: 'SwissPing Bronze (fino a 10 top); PingSkills (intermedio). B, O, P: proposta.'
}
```

- `family`: `servizio`, `ricezione`, `palleggio`, `attacco`, `controllo`, `taglio`, `gambe`, `schemi`. Le famiglie `palleggio` e `schemi` sono nuove e si aggiungono anche alla tassonomia. In `palleggio` vanno `palleggio-d`, `palleggio-r`, `palleggio-dr`, `palleggio-30s`.
- `level`: uno dei cinque livelli. Serve solo a proporre, mai a bloccare. La Chiquita (`ric-flip-r`) è esperto, l'apertura di rovescio in multiball intermedio, come nella ricerca.
- `quality`: la tabella della ricerca non ha questa colonna. Per le voci che corrispondono a un livello di percorso uso il campo `goal` di oggi; per le altre scrivo una frase breve.
- `strokes`: il collegamento con i colpi di `taxonomy.js` della sezione 3.3. Sostituisce `STROKE_DRILLS`. Si aggiungono i colpi nuovi della 3.3, compreso `ric-flip-r-base` (flip di rovescio semplice); `ric-flip-r` resta la Chiquita.
- Ogni famiglia ha un colore (servizio ambra, ricezione verde acqua, palleggio azzurro, attacco blu, controllo viola, taglio marrone, gambe rosa, schemi prugna). Si usa già in Libreria e servirà ai grafici della fase 5.

#### 2.1.2 Come si misura

Quattro tipi, che coprono tutte le voci:

| Tipo | Esempi | Valore | In una seduta conta |
|---|---|---|---|
| `su` (con `n` 10 o 20) | `ap-d`, `srv-bersaglio` (su 20) | palle buone su n | la prima serie registrata (regola 3) |
| `fila` (unità colpi, scambi o cicli) | `palleggio-d`, `taglio-irregolare` (scambi), `falkenberg` (cicli) | quante di fila | la migliore dei primi 3 tentativi (regola 2) |
| `tempo` (30 s) | `palleggio-30s`, `random-dr` | colpi in 30 secondi | la migliore dei primi 3 tentativi (regola 4) |
| `conta` | `multiball-intervalli` | serie riuscite nella seduta | il primo valore registrato |

«Di fila» conta solo i tuoi colpi; dove la ricerca scrive «scambi totali» si contano i colpi di tutti e due. La differenza resta voce per voce, nell'unità della misura.

Casi particolari, già previsti dal modello:

- **Più parti**: `srv-regolare` si misura su 10 per lato (dritto e rovescio) e la soglia vale per tutti e due. `sch-cinque-palle` ha due conteggi (schemi completati e punti vinti) con soglie diverse: B 12 e 8.
- **Gradino con una misura diversa**: il platino di `srv-lungo-veloce` si misura su un foglio A4 nell'angolo. Il tentativo si salva con `tier: 'P'`.

#### 2.1.3 Esercizi chiave per livello

Servono alla regola 6.3. Per ogni livello: le voci di quel livello che compaiono nel suo pacchetto base (sezione 4, colonna da 90 minuti). Dove il pacchetto scrive «X o Y» c'è un solo posto chiave, soddisfatto da una delle voci.

| Livello | Posti chiave | Famiglie |
|---|---|---|
| Principiante (12) | `palleggio-d`, `palleggio-r`, `palleggio-dr`, `chiusura`, `top-d-multiball`, `srv-regolare`, `srv-corto-tagliato`, `srv-bersaglio`, `taglio-r`, `taglio-d`, `ric-taglio-lungo`, `laterale` | palleggio, attacco, servizio, taglio, ricezione, gambe |
| Intermedio (10) | `top-d-block`, `top-r-block`, `top-d-due-punti`, `ap-d-multiball`, `ap-d`, `ap-r-multiball`, `srv-pendolo` o `srv-rovescio`, `ric-taglio-corto`, `ric-lettura`, `pivot` o `falkenberg-multiball` o `sch-srv-ap` | attacco, servizio, ricezione, gambe, schemi |
| Avanzato (12) | `srv-pendolo-inverso`, `srv-mezzo-lungo`, `ric-mista`, `ric-flip-d`, `top2-d`, `top2-r`, `ap-r`, `top-d-random`, `flip-d-top`, `falkenberg`, `random-dr`, `sch-srv-ap-top2` | servizio, ricezione, attacco, gambe, schemi |
| Esperto (10) | `srv-variato`, `ric-flip-r`, `ric-mezzo-lungo`, `top-dr-alternato`, `ctop-d`, `ctop-r`, `top-top-d`, `block-attivo-r`, `incrociato`, `sch-ric-quarta` | servizio, ricezione, attacco, controllo, gambe, schemi |
| Pro (3) | `ric-scelta-libera`, `top-top-lontano`, `sch-cinque-palle` | dopo pro non c'è un livello da proporre |

Una famiglia è soddisfatta quando almeno un posto che contiene una sua voce ha l'argento. Il posto «`pivot` o `falkenberg-multiball` o `sch-srv-ap`» mescola gambe e schemi: con l'argento in una qualsiasi delle tre voci valgono tutte e due le famiglie.

#### 2.1.4 Sei voci in più, dal programma attuale

| id | Famiglia | Livello | Viene da | Formato e soglie |
|---|---|---|---|---|
| `top-r-primo` | attacco | principiante | 2-1 livello 1 «Palla scivolata» | su 10 oltre metà tavolo: B 5, A 7, O 9 |
| `ap-d-casuale` | attacco | avanzato | 1-2 livello 5 «Palla casuale» | su 10 in campo: B 4, A 6, O 8 |
| `ap-r-casuale` | attacco | avanzato | 2-2 livello 5 «Palla casuale» | su 10 in campo: B 4, A 6, O 8 |
| `sch-terza-partita` | schemi | avanzato | 3-1 livello 5 «Partita» | su 10 punti al servizio, terze palle in campo: B 5, A 7, O 9 |
| `ric-dichiarata` | ricezione | intermedio | 3-2 livello 3 «Risposta dichiarata» | su 10 risposte come dichiarato: B 5, A 7, O 9 |
| `ric-punto` | ricezione | avanzato | 3-2 livello 5 «Punto giocato» | su 10 risposte non attaccate: B 4, A 6, O 8 |

Queste voci non entrano negli esercizi chiave.

#### 2.1.5 I percorsi diventano sequenze di esercizi

I mesi del piano continuano a indicare due o tre percorsi (`block.tracks`). Un percorso diventa una **sequenza ordinata di esercizi della libreria**, dal più guidato al più libero:

| Percorso | Sequenza |
|---|---|
| 1-1 Top di dritto | `top-d-multiball`, `top-d-block`, `top-d-due-punti`, `top-d-random`, `ric-top` |
| 1-2 Apertura di dritto | `ap-d-multiball`, `ap-d`, `top2-d`, `sch-srv-ap`, `ap-d-casuale` |
| 2-1 Top di rovescio | `top-r-primo`, `top-r-block`, `top-r-due-punti`, `top-r-random`, `ric-top` |
| 2-2 Apertura di rovescio | `ap-r-multiball`, `ap-r`, `top2-r`, `sch-srv-ap`, `ap-r-casuale` |
| 3-1 Servizio e apertura | `sch-srv-ap`, `sch-srv-ap-top2`, `sch-terza-partita` |
| 3-2 Ricezione tagliata | `ric-taglio-corto`, `ric-taglio-lungo`, `ric-dichiarata`, `ric-mista`, `ric-punto` |

Il lavoro sui servizi di ogni mese punta a una voce: 1-S `srv-corto-tagliato`, 2-S `srv-lungo-veloce`, 3-S `ric-lettura`.

Il passo «esercizio del mese» propone il primo esercizio della sequenza che non ha ancora l'argento. È solo una proposta: nella sessione lo cambi con un altro qualsiasi della libreria.

#### 2.1.6 Formato, errori comuni e sette voci nuove

Due campi in più per ogni voce, compilati per tutte:

- **Formato** (`modes`): uno o più fra «da solo» (`solo`), «con compagno» (`compagno`), «multiball» (`multiball`), «robot» (`robot`). In Libreria si può filtrare per formato.
- **Errori comuni** (`errors`): 2 o 3 errori tipici dell'esercizio, con gli id della lista Errori di `taxonomy.js`. Dove la lista non basta si aggiungono tre errori nuovi: «Troppo corta» (`corta`), «Poco effetto» (`effetto`), «Servizio non regolamentare» (`irregolare`). Si vedono nella scheda dell'esercizio e si possono scegliere anche nelle note.

Sette voci nuove (obiettivi: proposta, stesse regole delle altre). Non entrano negli esercizi chiave.

| id | Famiglia | Livello | Formato | Cosa si fa | Misura e soglie |
|---|---|---|---|---|---|
| `gomito-decisione` | gambe | avanzato | con compagno | Il compagno alterna palle sugli angoli e al gomito; sulla palla al gomito decidi presto e ti sposti per giocare di dritto o di rovescio. | su 10 palle al gomito in campo: B 5, A 7, O 9 |
| `due-uno` | gambe | intermedio | con compagno | Dritto dal centro, dritto dal lato dritto, rovescio, in serie. | sequenze di fila senza errori: B 3, A 6, O 10 |
| `rovescio-poi-dritto` | gambe | avanzato | con compagno | Uno o due rovesci, poi il compagno sceglie quando mandare sul dritto. | su 10 palle sul dritto in campo: B 5, A 7, O 9 |
| `srv-scala-lunghezze` | servizio | intermedio | da solo | Stesso movimento tagliato: corto, mezzo lungo, lungo, in sequenza. | su 10 sequenze con tutte e tre le lunghezze giuste: B 4, A 6, O 8 |
| `sch-mancino` | schemi | avanzato | con compagno | Servizio e terza palla preparati contro un compagno mancino. | su 10 schemi riusciti: B 4, A 6, O 8 |
| `difesa-lontano` | controllo | esperto | con compagno | Difesa da lontano (pallonetto o top) sulle chiusure del compagno, poi rientro e contrattacco. | palle di fila in difesa: B 5, A 8, O 12 |
| `ombra-gambe` | gambe | principiante | da solo | Spostamenti senza palla (laterale, pivot, dentro e fuori) in serie da 30 secondi. | nessuna: è un esercizio di riscaldamento, senza medaglie |

Totale della libreria: 82 voci (69 + 6 + 7). Una voce senza obiettivi, come `ombra-gambe`, si fa come le altre: semplicemente non propone medaglie.

### 2.2 Dati in Firestore

Tutto resta sotto `users/{uid}`, come oggi. Non servono collezioni nuove.

#### 2.2.1 `users/{uid}` (documento del giocatore)

Un campo nuovo, `player`:

```js
player: {
  level: 'intermedio',
  since: '2026-11-20',
  history: [
    { date: '2026-11-20', level: 'intermedio', how: 'scelto' },
    { date: '2027-02-03', level: 'avanzato', how: 'proposto' }
  ],
  declined: { level: 'avanzato', date: '2027-01-10' }   // ultima proposta rifiutata, o null
}
```

`how` vale `scelto` (dal primo avvio o da Impostazioni), `proposto` (accettato dall'app) o `predefinito` (nessuna scelta: principiante). Senza `player.level` il giocatore è principiante.

Il resto del documento non cambia. `settings.up` e `settings.down` restano salvati ma non si leggono più.

#### 2.2.2 `users/{uid}/events/{id}` (le voci del diario)

Una voce fatta con la 0.3 porta i tentativi nel campo `attempts`:

```js
attempts: [
  { ex: 'ap-d', fmt: 'su', tries: [8], marks: '1101111111', q: 4 },
  { ex: 'top-d-block', fmt: 'fila', tries: [7, 12, 4] },
  { ex: 'srv-regolare', fmt: 'su', tries: [[8, 6]] },
  { ex: 'srv-lungo-veloce', fmt: 'su', tier: 'P', tries: [5] }
]
```

- `ex`: id della libreria, oppure di un esercizio personale.
- `fmt`: il tipo di misura al momento del tentativo.
- `tries`: i valori, nell'ordine in cui li hai fatti. Per `su` e `conta` conta il primo.
- `marks`, `q` (voto di qualità da 0 a 5, regola 9), `tier`: facoltativi.

Più `exercises: ['ap-d', 'top-d-block']`: gli esercizi fatti nella seduta, anche senza misura. Serve a proporre i test.

Le voci vecchie mantengono `tests`, `serve`, `withTest`, `trained`: non si riscrivono. Si convertono in lettura (sezione 4).

#### 2.2.3 Le medaglie non si salvano

Si calcolano ogni volta dai tentativi. Aggiungere tentativi non toglie mai una medaglia; l'unico modo di perderla è correggere un tentativo sbagliato.

#### 2.2.4 Profilo del gruppo `profiles/{uid}`

Contiene solo il nome: `{ name, updatedAt }`. Medaglie, livello, sessioni, note e tentativi non ci finiscono. Il profilo si riscrive da solo al primo accesso con la 0.3.

### 2.3 Regole Firestore

I dati nuovi stanno dentro documenti che le regole già proteggono. L'unica modifica è sul profilo del gruppo: si accettano solo `name` e `updatedAt`, così niente di personale può finirci per errore. La regola va pubblicata a mano dalla console Firebase (o con `firebase deploy --only firestore:rules`).

---

## 3. Come si calcola (funzioni pure, testabili)

Tre moduli nuovi in `src/lib/engine/`. Ricevono dati e restituiscono dati.

### 3.1 `attempts.js`: tutti i tentativi, vecchi e nuovi

- `attemptsOf(event)`: per le voci 0.3 legge `attempts`; per le voci vecchie converte `tests` e `serve` (4.3).
- `allAttempts(events)`: tutti, in ordine di tempo, esclusi gli appuntamenti previsti.

Una **seduta** è un giorno: due voci nello stesso giorno contano come una seduta sola.

### 3.2 `medals.js`: medaglie e obiettivi

- `medalsFor(exercise, attempts)`, per un esercizio:
  - `B`, `A`, `P`: il primo giorno in cui il valore della seduta raggiunge la soglia;
  - `O`: il secondo giorno diverso in cui la raggiunge (con un giorno solo: «metà oro»);
  - `best`, `last`, `days`, `stale` (con almeno una medaglia ma senza misure da 90 giorni: «da ripassare»).
- `nextGoal(exercise, medals)`: il gradino più basso non ancora preso. I gradini sono indipendenti: il platino non chiede l'oro.

### 3.3 `player.js`: suggerimento del livello e proposte

- `levelProgress`: le tre condizioni della 6.3 verso il livello dopo.
  1. **Copertura**: almeno l'argento nel 75% dei posti chiave del tuo livello, e almeno un argento in ogni famiglia dei posti chiave.
  2. **Solidità**: almeno l'oro nel 40% dei posti chiave.
  3. **Costanza**: almeno 4 sedute con un tentativo da argento in su su un esercizio chiave, e fra la prima e l'ultima almeno 14 giorni.
- `suggestLevel`: il livello da proporre, oppure null. Null se sei pro, se manca una condizione, o se hai rifiutato quel livello e non sono ancora passati 21 giorni né sono arrivati 3 nuovi ori su esercizi del tuo livello.
- `testProposal`: fino a 5 esercizi da mettere in un test, ognuno con il motivo: gli esercizi del mese, una metà oro, un obiettivo vicino, un esercizio allenato più volte senza misura, uno da ripassare. Le proposte non tolgono niente: nel test puoi aggiungere qualsiasi esercizio.
- `currentInSequence`: l'esercizio del mese da proporre (2.1.5).

### 3.4 Test

- Medaglie per ogni tipo di misura, l'oro su due giorni, le medaglie che non spariscono, il prossimo obiettivo, «da ripassare».
- Livello: ogni condizione da sola non basta; posti «X o Y»; famiglia mancante; costanza a 13 e 14 giorni; rifiuto con 21 giorni e con 3 nuovi ori; nessuna proposta da pro.
- Migrazione: i dati della prima versione (sessioni A/B) e della 0.2.x convertiti in tentativi; nessuna voce modificata.
- Libreria: id unici, famiglie e livelli validi, soglie crescenti, esercizi chiave, colpi ed errori esistenti, formato compilato, 82 voci.
- Nessun blocco: tutte le voci si possono comporre in una sessione e in un test, a qualsiasi livello.

---

## 4. Migrazione dei dati

Principio di sempre: **niente si riscrive**. Le voci si leggono come sono e si convertono in memoria.

### 4.1 Voce per voce

| Dato salvato | Con la 0.3 |
|---|---|
| Sessioni A e B (prima versione) | Come oggi: si leggono come allenamenti Completo. I loro test diventano tentativi. |
| Allenamenti e test 0.2.x | Restano come sono. I loro test diventano tentativi. `withTest` serve solo al calendario delle settimane passate. |
| `tests[].type` `test`, `maint`, `placement` | Un tentativo sull'esercizio corrispondente al percorso e al livello (4.2). |
| `tests[].type = 'set'` e voci `kind: 'livello'` | Nessun tentativo. Restano nello storico. |
| `serve: { id, score }` | Un tentativo su `srv-corto-tagliato` (1-S), `srv-lungo-veloce` (2-S) o `ric-lettura` (3-S). |
| Allenamenti «Su misura» (`template: 'auto'`) | Si leggono come oggi, con nome e colore. |
| `focus.exercise` con gli id vecchi (`1-2-3`, `2-S`) | Si mostrano con il nome dell'esercizio corrispondente. |
| Percorsi personali | Ogni livello diventa un esercizio personale `{percorso}-{n}`, su 10, soglie B 6, A 8, O 9. I loro test diventano tentativi. |
| Mesi e modelli personali | Non cambiano. |
| Piano | Non cambia. `gateOk` non si legge più. Le settimane di recupero già inserite restano. |
| `settings.up`, `settings.down` | Restano salvati, non si usano. |
| Sessione dal vivo lasciata a metà con la 0.2.x | Si riprende. I test già contati si salvano come test vecchi e si convertono come gli altri. |
| Profilo del gruppo | Si riscrive con il solo nome. |

### 4.2 I livelli dei percorsi e la conversione dei test

Il livello di un percorso non si calcola né si mostra più. La regola vecchia si toglie del tutto, compreso il confronto con l'Excel.

La conversione resta semplice:

- percorso e livello indicano l'esercizio (tabella sotto);
- per gli esercizi `su` il punteggio passa così com'è: un 10 su 10 al livello 2 dell'apertura di dritto è un 10 su 10 in `ap-d`;
- per i quattro esercizi `fila` vale la serie più lunga di palle buone nei segni salvati (`1101111111` vale 7); senza segni vale solo il 10 su 10.

| Percorso | Livello 1 | Livello 2 | Livello 3 | Livello 4 | Livello 5 |
|---|---|---|---|---|---|
| 1-1 | `top-d-multiball` | `top-d-block` | `top-d-due-punti` | `top-d-random` | `ric-top` |
| 1-2 | `ap-d-multiball` | `ap-d` | `top2-d` | `sch-srv-ap` | `ap-d-casuale` |
| 2-1 | `top-r-primo` | `top-r-block` | `top-r-due-punti` | `top-r-random` | `ric-top` |
| 2-2 | `ap-r-multiball` | `ap-r` | `top2-r` | `sch-srv-ap` | `ap-r-casuale` |
| 3-1 | `sch-srv-ap-top2` | `sch-srv-ap-top2` | `sch-srv-ap-top2` | `sch-srv-ap` | `sch-terza-partita` |
| 3-2 | `ric-taglio-corto` | `ric-taglio-lungo` | `ric-dichiarata` | `ric-mista` | `ric-punto` |

Nello storico i test vecchi si vedono così: «Top di dritto · livello 2 · 9 su 10», con sotto l'esercizio per cui valgono.

**Il livello del giocatore** per chi usa già l'app: al primo accesso con la 0.3, dopo le novità, compare la scelta del livello. Se la chiude senza scegliere, è principiante. Si cambia sempre da Impostazioni.

---

## 5. Le schermate

### Oggi
- Sparisce la scheda del mese 3 bloccato, e sparisce «Su misura».
- La sessione in calendario mostra per ogni esercizio il prossimo obiettivo: «Top di dritto contro block · argento: 10 di fila».
- Il test in calendario ha una sua scheda: gli esercizi proposti con il motivo, e Inizia.
- «Obiettivi vicini»: fino a tre esercizi, con «Test ora».
- Quando l'app propone un livello: «Sei pronto per avanzato?» con «Passo ad avanzato» e «Non ora».
- Senza niente in calendario: i modelli per allenarsi lo stesso.

### Sessione dal vivo
- Niente più test di partenza, mantenimento misurato, «Sali» o «Scendi».
- Su ogni esercizio: «Prova l'obiettivo». Si apre «Raggiungi l'argento!» con la soglia e il conteggio adatto alla misura (10 tocchi, quante di fila fino a tre tentativi, 30 secondi, un numero).
- Voto di qualità da 0 a 5, facoltativo.
- Quando arriva una medaglia: un'animazione breve. Per l'oro alla prima seduta: «Metà oro: serve un'altra seduta in un altro giorno».
- «Cambia esercizio»: tutta la libreria, con prima la stessa famiglia e il tuo livello.
- Alla chiusura: le medaglie prese oggi.

### Test
- La stessa sessione con soli esercizi da misurare, dalla proposta. Si possono aggiungere esercizi.
- Dalla 0.3 solo un test fatto soddisfa il test in calendario; le settimane passate restano come sono.

### Libreria
- Schede: Allenamenti, **Esercizi**, Colpi.
- Esercizi: tutte le voci, raggruppate per famiglia con il suo colore; filtro facoltativo per livello (di base: tutti). Ogni riga mostra nome, livello e medaglie.
- Scheda di un esercizio: descrizione, criterio di qualità, gradini con lo stato, migliore, ultimi tentativi, fonte, colpi allenati.

### Progressi
- Il tuo livello e la strada verso il prossimo.
- Medaglie per gradino e per famiglia; esercizi recenti con il prossimo obiettivo; «Da ripassare».
- «Da correggere» e «Ritmo» restano. Il gruppo mostra solo i nomi.
- In fondo, chiuso: «Percorsi della versione 0.2», con i test di prima.

### Impostazioni
- Si toglie «Soglie dei test». Si aggiunge «Il tuo livello».
- Il CSV esporta i tentativi.

### Altre parti
- Primo avvio: la schermata sui livelli dei percorsi diventa «Il tuo livello».
- Diario: le righe dei test diventano tentativi; i test vecchi in sola lettura, si possono togliere.
- Guida, importazione (anche «esercizi» con famiglia, livello, formato, misura, errori e gradini), novità 0.3.0.

---

## 6. Cosa si toglie

| Cosa | Dove |
|---|---|
| Regola dei livelli e test di partenza (`levels.js` intero, `tests/levels.test.js` compreso il confronto con l'Excel) | motore, sessione, diario |
| Suggeritore attuale e «Su misura» (`suggest.js`) | motore, Oggi, aggiunta |
| Mantenimento misurato, test dentro l'allenamento, «Fai il test qui» | sessione, composizione |
| Sblocco del mese 3 (`GATE`, `gateStatus`, `gatePending`) | programma, piano, Oggi |
| Soglie dei test | Impostazioni |
| `STROKE_DRILLS`, `LevelDemo`, livelli dei compagni | tassonomia, interfaccia |
| Livelli, sessioni e settimana nel profilo del gruppo | profilo |

---

## 7. Come il modello prepara le fasi dopo (senza realizzarle)

**Fase 3, pacchetti per livello e allenamenti personalizzati.** I pacchetti della sezione 4 diventano modelli fatti di passi «esercizio» (un id della libreria). Gli esercizi chiave per livello sono già la loro ossatura, e `player.level` dice quale pacchetto proporre. Le partitelle con i loro obiettivi (sezione 5) si aggiungono come voci di `schemi`, senza pegno e senza risultati condivisi.

**Fase 4, note per colpo.** Ogni esercizio elenca i colpi che allena, ogni tentativo l'esercizio, e note ed errori segnano già il colpo: una nota per colpo potrà raccogliere tutto senza cambiare i dati.

**Fase 5, grafici.** Ogni tentativo ha data, esercizio, tipo di misura e valore: è già una serie per esercizio. Le famiglie hanno già il loro colore.

---

## 8. Decisioni

### I 7 punti dubbi della ricerca

| Punto | Decisione |
|---|---|
| 1. Il palleggio di base non ha una famiglia (in alternativa una famiglia «palleggio») | Si crea la famiglia `palleggio`. |
| 2. `ric-flip-r` indica la Chiquita: aggiungere `ric-flip-r-base` per il flip semplice | Sì. |
| 3. Alcuni id degli esercizi coincidono con quelli dei colpi | Esercizi e colpi restano in collezioni separate. |
| 4. Chiquita a «esperto», apertura di rovescio in multiball a «intermedio» | Come nella ricerca. |
| 5. «Consecutivi» conta solo i propri colpi, alcuni test contano gli scambi totali | Si mantiene la differenza voce per voce. |
| 6. Pegno nella partitella rischiosa, risultati al compagno o all'allenatore | Niente pegno per ora, risultati non condivisi. |
| 7. Percentuali della regola (75% e 40%) e oro su due sedute | Come nella ricerca. |

### Le questioni del progetto

| Questione | Decisione |
|---|---|
| Medaglie calcolate o salvate | Calcolate dai tentativi. |
| Le sei voci in più | Sì. |
| Punto di partenza dei percorsi | Nessun calcolo con la regola vecchia, che si toglie del tutto. Il giocatore sceglie il livello; senza scelta è principiante. |
| Vecchi test come tentativi | Sì, con una conversione semplice. |
| Nuova proposta dopo un rifiuto | Dopo 21 giorni oppure dopo 3 nuovi ori, quello che arriva prima. |
| «Su misura» | Si toglie ora. |
| Seduta = giorno | Sì. |
| Visibilità | Medaglie e livello sono personali; il gruppo vede solo il nome. |
| Posti chiave «X o Y» | Un posto solo, soddisfatto da una delle voci. |
| Soglie degli esercizi personali | B 6, A 8, O 9 su 10. |
| Niente blocchi | Medaglie e livello non nascondono né disabilitano niente (regola generale, sezione 0). |

---

## 9. Piano di lavoro

Branch `fase-2-medaglie`, un commit per passo:

1. Libreria, tassonomia (famiglie `palleggio` e `schemi`, colpi nuovi), test di integrità.
2. Motore: `attempts.js`, `medals.js`, `player.js`, con i test di medaglie, livello e migrazione.
3. Composizione, piano senza sblocco; si tolgono `levels.js` e il suggeritore.
4. Stato dell'app, sessione dal vivo, Oggi, diario.
5. Libreria, Progressi, Impostazioni, primo avvio, Guida, importazione, regole del profilo.
6. Versione 0.3.0, novità, README.

Alla fine: `npm test` e `npm run build`, prova nel browser in modalità locale (`VITE_LOCAL=1 npm run dev`), anche a 390 px, con i dati della prima versione e della 0.2.x.
