# Terza palla: regole grafiche

> **Dalla 0.8.0** l'accento è il blu (`--accent: #1f5fe0`), il fondo un grigio freddo con schede bianche,
> la fiamma è rossa, «Pro» è color oro e la partita è grigia. In Oggi l'allenamento sta su un tavolo visto
> dall'alto (`--court`), con i mattoni in pillole piene. Niente arancione. Le regole qui sotto su famiglie,
> rilievo, medaglie e caratteri restano valide.

Rifacimento grafico. Stato: proposta. Nel passo 3 le regole valgono solo per **Oggi** e la **sessione dal vivo**; le altre pagine cambiano dopo l'approvazione.

Ispirazioni (cartella `refs/`, Brilliant, Mimo): un solo pulsante grande per cominciare, tessere colorate con un bordo in rilievo, numeri grandi con un'etichetta corta, giorni della settimana come cerchi, poche parole. Sono ispirazioni: niente forme, illustrazioni o colori copiati.

Screenshot di partenza: `docs/design-shots/prima/` (390 px, tema scuro e chiaro, con dati di esempio). Si rifanno con `node scripts/screenshots.mjs <cartella>`.

---

## 1. Cosa non va

- Troppo testo: spiegazioni lunghe sulle pagine (condizioni del livello, regole delle medaglie, partitella).
- Card che sono blocchi di testo e non si possono toccare (Obiettivi vicini, Il tuo livello, Medaglie, testo della partitella).
- Oggi è lunghissima: sotto il pulsante c'è tutta la sessione, 40 righe.
- I livelli hanno lo stesso colore spento; le famiglie si distinguono appena (marrone, prugna, viola).
- Le medaglie sono pallini da 8 px: non si capisce cosa manca.
- Nelle card degli allenamenti ci sono numeri senza unità («3′», «12», «9/10») e parametri non spiegati.

---

## 2. Pagina per pagina

**Togli**: sparisce. **Accorpa**: due cose diventano una. **Icona**: un testo diventa un'icona (con l'etichetta per lo screen reader). **Altrove**: si sposta in un'altra pagina o nella Guida.

### Intestazione delle pagine (`PageHead`)
In ogni pagina il titolo grande è il nome della pagina, lo stesso della barra in basso: «Oggi», «Diario», «Progressi», «Libreria». Niente scritta piccola sopra il titolo e niente punto interrogativo: a destra resta solo il profilo, che apre Impostazioni (la Guida si apre da lì). Guida e Impostazioni non stanno nella barra in basso: al posto del profilo hanno la freccia per tornare alla pagina di prima.

### Oggi (passo 3, rivisto il 20 novembre; ripulita dopo la revisione)
Dal generale al particolare: prima il quadro d'insieme, il dettaglio solo quando lo chiedi. Il titolo è «Oggi», con la data sotto. Dall'alto:
1. **La tappa in corso**, con il periodo in **tempo relativo** come etichetta e il nome in grande: «Questo mese · Dritto» (4 settimane), «Queste due settimane», «Questa settimana», «Oggi» o «Questo allenamento» (un allenamento solo). A sinistra l'icona della famiglia nel suo colore; la scheda ha il fondo tenue e il bordo della famiglia (quella dell'esercizio di adesso nel primo percorso). Sotto, su due righe e con due stili: a che punto sei (tacche nel colore della famiglia e «Settimana 3 di 4», oppure «Un allenamento solo») e i percorsi. Il badge del livello non sta più qui: il livello non riguarda la tappa, e si cambia da Progressi o da Impostazioni. Toccandola si apre il **foglio della tappa** (`StageSheet`): a che punto sei, che cosa viene dopo, tutte le tappe del piano, i percorsi con l'esercizio di adesso, i servizi, gli schemi della partitella. In fondo, «Modifica il piano».
2. **In calendario oggi**: il pulsante grande e, sotto, **una riga sola**: la striscia colorata dei blocchi, quanti sono e «Vedi e cambia». La riga apre il foglio dell'allenamento: in cima «Scegli un altro allenamento», poi i blocchi con gli esercizi (ognuno si cambia), in fondo «L'ho già fatto» per registrarlo senza il timer. Al posto dei tre pulsanti Blocchi, Cambia e Registra, che con la striscia facevano quattro cose da toccare. Sotto, se ci sono, il test di oggi e «Da correggere».
3. **Questa settimana**: sette cerchi (pieno se fatto, anello se in calendario) e «3 su 5». Toccando un giorno, o il titolo, si apre il Diario. La vista del mese non c'è più: era la stessa del Diario.
4. **Medaglie**: quelle **prese oggi** (se ci sono) e **una medaglia da prendere**, con il motivo: è nell'allenamento di oggi, ti manca poco, oppure è l'esercizio del mese. «Tutte» porta a Progressi.

- **Togli**: la striscia delle 12 settimane (ora nel foglio del mese); «Settimana 3» come titolo (il titolo è la data); le icone delle famiglie; la griglia di sei medaglie; l'elenco completo degli esercizi; il testo della partitella; le chip di tutti i modelli.
- **Altrove**: i blocchi della sessione in un foglio (con «cambia esercizio» e «Salva come mio»).

### Sessione dal vivo (passo 3)
- **Togli**: il nome del modello in alto; la descrizione e il criterio di qualità sempre aperti (si aprono con «Come si fa»); «Prossimo obiettivo» ripetuto due volte; il testo «Se sbaglia il compagno…» (ora nella Guida).
- **Accorpa**: i pallini delle fasi e la barra del tempo diventano una barra a segmenti colorati, uno per blocco; obiettivo e anello della medaglia in una sola card.
- **Icona**: cambia esercizio, nota sul colpo, dettagli dell'esercizio (i), pausa e avvio.
- **Altrove**: le regole dei tentativi nella Guida.
- **Cambio di turno**: negli esercizi a coppie e nei servizi, a metà tempo suona un doppio bip (con la vibrazione) e compare «Cambio». Il riquadro del tempo si rovescia: fondo scuro, bordo, pulsante e barra del colore della famiglia, e l'etichetta passa da «Tocca a te» a «Tocca al compagno» («Servi tu» / «Serve il compagno» nei servizi). Sulla barra una tacca segna la metà. Se comincia il compagno, si tocca l'etichetta e i turni si invertono. Niente cambio nel palleggio, negli esercizi da solo o con il robot, e negli ultimi 20 secondi. Si spegne in Impostazioni (sostituisce il vecchio cambio ogni 5 minuti).
- **Chiusura**: minuti ed esercizi in grande, poi le medaglie con i coriandoli e i risultati di oggi; compagno, sensazione, nota e «da correggere» in una sezione compatta. Tolta la tessera «misure»: non si capiva.

### Diario (rifatto)
Appena entri: il mese, e sotto oggi se c'è qualcosa. Il resto si apre a richiesta.
1. **Il mese**, in una card. In cima alla card il nome del mese e, a destra, le due frecce; «Oggi» compare accanto alle frecce solo quando sei su un altro giorno o su un altro mese. Sotto ogni data un pallino per attività, del colore del **tipo** (allenamento, test, lezione, partite…): pieno se fatta, vuoto se in programma. Oggi ha il bordo arancione, il giorno scelto è pieno. Il mese cambia con le frecce o scorrendo il calendario di lato; entra da quella parte.
2. **Legenda**: i tipi del mese (toccandoli si filtra: gli altri si attenuano) e, sotto, «● fatto ○ in programma».
3. **Il giorno**: una sezione richiudibile con il titolo («Oggi» o la data) e quante voci ha. Oggi si vede solo se c'è qualcosa; un altro giorno sempre, perché l'hai scelto tu. In fondo alla lista, una riga «Aggiungi a questo giorno» (o «Metti in programma»).
4. **Nel mese**: tutte le voci, in una sezione **chiusa di partenza**; lo stato aperto o chiuso si ricorda.
- I temi del piano fra le settimane si vedono solo con «Temi nel Diario» acceso in Impostazioni (spento di base).

### Righe del diario (`EventRow`, `PlannedRow`)
- **Cose diverse, stili diversi**: il tipo in grassetto («Allenamento»), il modello in grigio («Intermedio · 60′»), la data a destra; durata, compagno e cosa correggere ognuno con la sua icona; il tema in una pillola; «Non registrato» in rosso; i risultati come chip con il valore in grassetto. Mai due informazioni di natura diversa attaccate con lo stesso stile e un «·» in mezzo.
- **Un'azione in vista**: Inizia se è oggi, Registra se è passato. Toccando la riga si apre il foglio dell'appuntamento (`ItemSheet`) con tutte le azioni scritte per esteso: Registra com'è andata, Sposta a un altro giorno, Togli dal calendario.

### Sezioni richiudibili (`Collapse`)
Titolo, numero di voci, freccia che ruota; il contenuto scivola (280 ms, niente con «riduci movimento»). Con `key` lo stato si ricorda su questo dispositivo.

### Progressi (rifatto, riordinato dopo la revisione)
Dal generale al particolare:
1. **Tre numeri** in tre tessere: le **settimane di fila** (con la fiamma, `ui/Flame.svelte`), le ore e le attività.
2. **Il livello**, in una card con il colore del livello: «Il tuo livello» e il badge (si tocca per cambiarlo). Sotto, «Per passare al livello avanzato» e **tre anelli uguali**, uno per condizione: argento e oro negli esercizi chiave («6/8», «1/4»), e la **costanza** (prima le sedute, poi i giorni). Pieni: la spunta. Sotto, una frase sola su cosa manca. Prima le settimane di fila e la costanza del livello stavano nello stesso anello, ma sono due cose diverse: una dice da quanto ti alleni, l'altra è una condizione del livello.
   - **Esercizi chiave** in una sezione chiusa, ognuno con il suo anello della medaglia; in fondo «Come si passa di livello» porta alla Guida.
3. **Medagliere** (aperto): le quattro medaglie con quante ne hai; quando entrano in vista, un riflesso le attraversa una volta (vedi sotto). Poi le **famiglie** in una fila che scorre (icona, nome, «Attacco 4/20»), che sono anche il filtro; sotto la **griglia** degli esercizi misurati, con l'anello e il gradino dopo, o «Da ripassare».
4. **Le ultime 12 settimane** (aperto), **Da correggere**, **I test della versione 0.2** (chiusi). Il gruppo non sta più qui: è in Impostazioni.

### Riflessi delle medaglie (`MedalBadge shine`)
Quando la medaglia entra in vista, una volta sola, ritagliato sulla forma dello scudo:
- **Argento**: un bagliore e una fascia di luce tenue.
- **Oro**: bagliore e fascia di luce piena, obliqua, dall'alto a destra al basso a sinistra.
- **Platino**: bagliore e fascia arcobaleno.
- **Fiamma**: un bagliore caldo. **Bronzo** e medaglie non prese: niente.
- Con «riduci movimento»: niente.

### Libreria (rifatta)
Ogni gruppo è una sezione richiudibile con la sua icona e quante voci ha; «Nuovo…» è l'ultima riga di ogni elenco, non un pulsante in più.
- **Allenamenti**
  - **Modelli** (aperto): card con il nome, la durata a destra con l'icona del timer, la scaletta in segmenti colorati per famiglia (composta con gli esercizi di adesso) e sotto i nomi dei blocchi; «tuo» in una pillola. In fondo «Nuovo modello» tratteggiato.
  - **Pacchetti per livello** (chiuso): una riga per livello con il badge e i due allenamenti, 90′ e 60′; «il tuo» accanto al tuo livello.
  - **Mesi** (aperto): l'icona e il colore della famiglia, il nome, i percorsi sotto in grigio.
  - **Percorsi** (chiuso): il nome, «Adesso: …» e l'anello della medaglia dell'esercizio di adesso.
  - In fondo, una riga «Importa esercizi, percorsi, mesi e modelli».
- **Esercizi**: un campo **Cerca** (senza accenti e maiuscole); due filtri, **livello** e **formato**, che si scelgono in un foglio (al posto di tredici pulsantini); «Togli i filtri» quando servono. Le famiglie sono sezioni chiuse con icona e numero; con una ricerca o un filtro si aprono. Ogni esercizio: il nome, sotto il livello con il pallino del suo colore e i formati in grigio, a destra l'anello della medaglia; «Da ripassare» in rosso.
- **Colpi**: Tutti / Dritto / Rovescio; le famiglie sono sezioni chiuse con icona e numero; i colpi senza descrizione (sta nella scheda); quante volte da correggere con il mirino rosso; «Aggiungi un colpo»; «Le altre voci» (fasi, palle, errori) chiuse.

### Schede (rifatte)
- **Esercizio** (`ExerciseSheet`): in alto chi è, ogni cosa con il suo stile: l'icona della famiglia nel suo colore, il nome della famiglia, i formati in grigio, il badge del livello; sotto «Si misura: …» con l'icona della misura. Poi cosa si fa e **Come deve venire** in un riquadro del colore della famiglia. Le **medaglie come quattro scudi in fila** (con la soglia, la data o «prossima»; il riflesso quando entrano in vista). **Le tue misure** in un grafico (`MeasureChart`): una barra per seduta nel colore della famiglia, la linea tratteggiata della prossima medaglia con il suo nome, toccando una barra si legge data e valore. «Come si misura» (la regola dei tentativi), note, errori e colpi in sezioni chiuse. In fondo, fisso, **Misurati ora**.
- **Allenamento** (`TemplateSheet`): in lettura la durata grande, la scaletta in segmenti colorati e i blocchi come **mattoncini** (`Brick`) con gli esercizi di adesso, separati dalla pausa di 1 minuto. Nell'editor ogni blocco ha il bordo e il fondo tenue della sua famiglia. (Trascinare i blocchi: non ancora.)
- **Colpo** (`StrokeSheet`): l'icona e il colore della famiglia, il lato, le fasi del punto; **Come lo senti** con l'ultima nota in cinque tacche e la media sotto; le tue note (con «Aggiungi una nota» come ultima riga), dove lo alleni (con l'anello della medaglia) e da correggere in sezioni richiudibili.
- Ancora nello stile di prima: i fogli del percorso, del mese, della voce del diario, della nota, del livello, del piano a parte le tappe.

### Guida e Impostazioni (rifatte)
- **Guida**: il titolo con la freccia per tornare indietro, una frase, i **cinque passi** come tessere numerate (numero arancione in rilievo, titolo e due righe). Il resto in sezioni chiuse, una per argomento: le medaglie (gli scudi e le regole dei tentativi), il livello (i badge e le condizioni), durante l'allenamento (le fasi, il cambio, le pause), il piano, la libreria, i tuoi dati. Qui stanno le spiegazioni lunghe tolte dalle altre pagine.
- **Impostazioni**: titolo «Impostazioni» con la freccia per tornare indietro, il profilo in una card; poi gruppi con una piccola intestazione: **Allenamento** (il piano, il tuo livello con il badge), **Preferenze** (aspetto, suoni, vibrazione, cambio a metà esercizio, il piano nel Diario, mancino), **Gruppo** (se farti vedere, i compagni, e per l'amministratore le richieste e gli inviti), **Dati** (esporta, copia, cancella in rosso), **Informazioni** (novità con la versione, guida, esci). Ogni riga ha un'icona chiara a sinistra in un quadrato grigio; sottotitoli solo dove servono.

### Le classi di base (`app.css`)
Per tenere coerenti anche i fogli non rifatti uno per uno (voce del diario, nota, livello, percorso, mese, aggiungi, piano):
- `.display` e `.title` in Geist 800 con spaziatura stretta; i fogli e le intestazioni di pagina usano lo stile nuovo di partenza.
- `.heading`: intestazione piccola in minuscolo (13 px, 650, grigio).
- `.chip` e `.tag.line`: pieni, senza bordo.
- `.btn.primary` e `.btn.accent` (non piccoli): rilievo, arrotondamento 18, scendono quando li premi; testo bianco sull'arancione.
- `.card`: arrotondamento 20.
- Le medaglie a pallini (`Medal`, `MedalRow`) non ci sono più: ovunque gli scudi (`MedalBadge`) o l'anello (`MedalRing`).
- **La sensazione** (`FeelPicker`): cinque barre che crescono, ognuna con il suo nome sotto («Dura», «Così così», «Bene», «Molto bene», «Ottima»). È la stessa nella chiusura della sessione, nella voce del diario e nella nota sul colpo.
- **I filtri di una scelta** (`PickSheet`): un pulsante per filtro con il suo nome («Famiglia», «Livello», «Formato»), come in Libreria; toccandolo si sceglie in un foglio. Niente file di pulsantini.

---

### Il piano a tappe
Il piano è una fila di **tappe**: un tema (o una pausa) e una durata. Le durate sono quattro, ognuna con la sua vista:

| Durata | Vista |
|---|---|
| 1 allenamento | nessuna barra: «Solo per l’allenamento di oggi» |
| 1 settimana | tacca unica «1» |
| 2 settimane | tacche numerate 1–2 |
| 4 settimane | tacche numerate 1–4 |

Una tappa da un allenamento occupa un allenamento del ritmo; più tappe brevi di fila riempiono la settimana nell'ordine dei giorni. Se una settimana resta a metà, gli allenamenti rimasti anticipano la tappa dopo, che comincia a contare dal lunedì seguente. I piani di prima (a settimane) si leggono come tappe da N settimane. Il piano di base resta: Dritto, Rovescio, Primi colpi, quattro settimane ciascuno.

**Come si chiama.** Mai «tema». Dove conta il periodo (Oggi, foglio della tappa, motivo delle proposte: «Esercizio di questo mese») si usa il tempo relativo della tappa (`stagePeriod`). Dove si descrive il contenuto, senza un periodo (Libreria, editor, modelli: «Mesi», «Nuovo mese», «Del mese»), si dice **mese**, come nel programma di base. Nel piano: «Tappa» e «Su cosa lavori».

## 3. Regole

### 3.1 Colori

Ogni colore ha tre usi: **pieno** (mattoncini, icone, barre), **tenue** (sfondo delle card) e **testo sopra il pieno** (bianco o scuro). Nel tema scuro il pieno è più chiaro, così si legge sul fondo scuro.

**Famiglie di esercizi** (`--fam-*`, attributo `data-fam`):

| Famiglia | Icona Lucide (non più usata) | Chiaro | Scuro | Testo sopra |
|---|---|---|---|---|
| Servizio | `send` | `#E9A800` | `#FFC83D` | scuro |
| Ricezione | `reply` | `#0E9F8E` | `#2DD4BF` | bianco / scuro |
| Palleggio | `repeat` | `#0A8FD6` | `#38BDF8` | bianco / scuro |
| Attacco | `zap` | `#E5383B` | `#FF6B6B` | bianco |
| Block e controtop | `shield` | `#8E44EC` | `#C084FC` | bianco / scuro |
| Gioco tagliato | `scissors` | `#3D5AFE` | `#7B93FF` | bianco |
| Gambe | `footprints` | `#23A047` | `#4ADE80` | bianco / scuro |
| Schemi | `route` | `#D63384` | `#F472B6` | bianco / scuro |

Blocchi che non sono esercizi della libreria: **Riscaldamento** prende il palleggio, **Servizi del mese** il servizio, **Partitella** l'arancione della pallina, **Esercizio libero** il grigio, **Pausa** nessun colore.

**Livelli** (`--lv-*`, attributo `data-level`), come le cinture: verde, blu, viola, rosso, nero.

| Livello | Chiaro | Scuro |
|---|---|---|
| Principiante | `#1F9D55` | `#4ADE80` |
| Intermedio | `#1E6FE0` | `#60A5FA` |
| Avanzato | `#7C3AED` | `#B794F6` |
| Esperto | `#DC2626` | `#F87171` |
| Pro | `#16181D` | `#F4F4F5` |

Il badge del livello ha sempre anche le tacche (da 1 a 5): il colore non è mai l'unica informazione.

**Medaglie** (`data-tier`): bronzo `#C27A3A` / `#E39A5E`, argento `#8C99A8` / `#CBD5E1`, oro `#D99A00` / `#FCD34D`, platino `#2F9DBE` / `#7DD3FC`. Non ancora presa: grigio `#C9CCD1` / `#3B4048`, con il gradino dopo scritto sotto.

**Neutri e accento**: restano quelli di oggi (carta calda, inchiostro, arancione `#EC5B13` / `#FF7A36` per le azioni principali). Verde e rosso degli stati restano per «fatto» e «errore».

**Contrasto.** Il grigio dei testi piccoli (`--ink-3`) è `#6A6E75` sul chiaro e `#858A91` sullo scuro: almeno 4,5:1 sul fondo. Il testo sopra l'arancione ha il suo colore (`--accent-on`): bianco sul tema chiaro, scuro sul tema scuro, dove l'arancione è più chiaro e il bianco non si leggeva (2,6:1).

### 3.2 Caratteri

- **Geist** per tutto il testo, anche i titoli (pesi 700 e 800, spaziatura stretta). Fraunces non c'è più: tutte le pagine sono rifatte.
- Tempo e numeri che cambiano sono nello stesso carattere del testo, con le cifre della stessa larghezza (`tabular-nums`). Dalla 0.8.1 non c'è più un carattere a larghezza fissa.
- Scala: 12 (etichette), 14 (secondario), 16 (testo), 18 (titolo di card), 22 (sezione), 28 (titolo di pagina), 40 (numero grande), 96 (tempo nella sessione).
- Niente scritte tutte in maiuscolo: le etichette corte (`.t-label`) sono 13 px, peso 650.
- Frasi brevi; numeri sempre con l'unità o con un'icona.

### 3.3 Icone

- Una sola libreria: **Lucide** (licenza ISC), già nel progetto.
- Dimensioni: 16 nelle chip, 20 nelle righe, 24 nei pulsanti, 28 nelle tessere grandi. Tratto 2; 2,4 sopra un colore pieno.
- **Icone delle famiglie disegnate apposta** (`FamilyIcon`), non quelle generiche di Lucide (aereo di carta, fulmine, spade: confondevano). Partono dalla racchetta degli scudi delle medaglie e aggiungono il dettaglio del colpo: servizio la palla lanciata, ricezione la palla in arrivo, palleggio due racchette, attacco le linee di velocità, controllo la palla che torna indietro, taglio la rotazione all'indietro, gambe due impronte, schemi il percorso tratteggiato. Per ora solo nella scheda in cima a Oggi.
- Parametri: `timer` minuti, `target` su 10 o su 20, `link` di fila, `hourglass` a tempo, `hash` conteggio, `medal` medaglia, `flame` settimane di fila.
- Ogni icona senza testo ha `aria-label`.

### 3.4 Spaziature

Griglia da 4 px: 4, 8, 12, 16, 20, 24, 32, 40. Margine laterale 20. Tra le sezioni 28. Aree da toccare di almeno 44 × 44.

### 3.5 Arrotondamenti e rilievo

- Arrotondamenti: 10 (chip), 14 (campi e pulsanti piccoli), 20 (card), 24 (mattoncini e pulsante grande), cerchio (medaglie, giorni).
- **Rilievo** delle cose che si toccano: un bordo inferiore più scuro di 4 px (`box-shadow: 0 4px 0` del colore scurito). Alla pressione scende di 3 px e il bordo si riduce: sembra un tasto vero.
- Le cose che non si toccano non hanno rilievo.

### 3.6 Animazioni

- Strumenti di Svelte: `transition` (fly, fade, scale), `animate:flip` per riordinare, `Tween` e `Spring` di `svelte/motion` per numeri e anelli.
- Durate: **veloce** 120 ms (pressione), **base** 220 ms (comparsa), **lenta** 380 ms (cambio di blocco, anelli).
- Molla: `--spring` già nel progetto (rimbalzo leggero) per pressioni e medaglie; `backOut` per le comparse.
- **Riduci movimento**: con l'impostazione del sistema attiva le durate vanno a zero, niente coriandoli, niente rimbalzi; restano i cambi di colore.

### 3.7 Riscontri

- **Suono** (se acceso in Impostazioni): un tocco breve per la fine di un blocco, un arpeggio di quattro note per una medaglia, una fanfara breve alla chiusura della sessione.
- **Vibrazione** (dove il telefono la supporta e se accesa): 8 ms per un tocco, `30-60-30-60-80` per una medaglia, `40-40-120` alla chiusura.
- **Coriandoli**: `canvas-confetti` (licenza ISC, pochi kB, caricata solo quando serve) per una medaglia e per la chiusura della sessione. Colori: quelli della medaglia o delle famiglie della sessione.

---

## 4. Componenti di base

### Mattoncino del blocco (`Brick`)
Un blocco della sessione. Tinta piena della famiglia, rilievo, arrotondamento 24.
- Al centro il nome del blocco, sotto gli esercizi in breve (o «×3»).
- A destra la durata grande: `12` con `MIN` piccolo sotto.
- Più esercizi nel blocco: una fila di tacche con i colori delle loro famiglie.
- Si tocca (apre il blocco) e, nell'editor, si trascina.

### Scheda esercizio (`ExerciseCard`)
Fondo tenue della famiglia, icona della famiglia, nome (18, peso 700), badge del livello, parametri con icona e unità (`timer 6 min`, `target su 10`, `link di fila`), anello della medaglia a destra.

### Medaglia con anello (`MedalRing`)
Un cerchio con l'anello di avanzamento verso il gradino dopo (record ÷ soglia). Dentro, lo scudo della medaglia più alta presa, a colori; se non c'è ancora, lo scudo del gradino dopo in grigio; con la metà oro, uno scudo metà oro e metà grigio. Gli scudi sono disegni in `src/assets/medals/` (bronzo, argento, oro, platino), usati dal componente `MedalBadge`. Sotto, il gradino dopo in breve («oro · 20»). Animazione: l'anello si riempie con una molla, la medaglia nuova entra con un rimbalzo.

### Badge del livello (`LevelBadge`)
Pillola con il colore del livello, cinque tacche (piene fino al livello) e il nome. Si tocca per cambiare livello.

### Pulsante grande (`BigButton`)
Tutta la larghezza, alto almeno 88, arancione con rilievo. A sinistra il cerchio con l'icona (play), poi il verbo grande («Inizia», «Riprendi») e sotto cosa parte («Intermedio · 60 min»). Sotto il testo, la fila dei blocchi come tacche colorate proporzionali alla durata.

### Altri
- **Questa settimana** (`WeekDays`): la settimana in sette cerchi; pieno se fatto, anello se previsto, oggi in evidenza. Ogni giorno si tocca e apre il Diario su quel giorno.
- **Foglio del mese** (`MonthSheet`): il dettaglio del tema del mese, aperto da Oggi.
- **Tessera numero** (`StatTile`): icona colorata, numero grande, etichetta corta.

---

## 5. Cosa cambia nel passo 3

- `src/app.css`: nuovi colori (famiglie, livelli, medaglia grigia), attributi `data-fam` e `data-level`, rilievo, durate. I colori di oggi restano per le pagine non rifatte.
- Componenti nuovi in `src/lib/ui/`: `BigButton`, `Brick`, `MedalRing`, `LevelBadge`, `WeekDays`, `FamilyIcon`; riscontri in `src/lib/util/celebrate.js`; movimento ridotto in `src/lib/util/motion.js`.
- **Oggi**: pulsante grande, settimana, medaglie. I blocchi in una scheda che si apre dal pulsante.
- **Sessione dal vivo**: colore del blocco, tempo, obiettivo con l'anello; coriandoli e suono per medaglie e chiusura.
- Dipendenza nuova: solo `canvas-confetti`.

Screenshot dopo il passo 3: `docs/design-shots/dopo/` (Oggi, foglio dei blocchi, inizio della sessione, obiettivo aperto, metà oro con i coriandoli, chiusura con la medaglia; tema scuro e chiaro).

Le altre pagine (Diario, Progressi, Libreria, Guida, Impostazioni, schede) seguono dopo l'approvazione, con le stesse regole: titoli in Geist, neutri del tema scuro un po' più freddi, elenchi che diventano griglie di schede.
