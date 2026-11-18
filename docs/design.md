# Terza palla: regole grafiche

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

### Oggi (passo 3)
- **Togli**: la striscia delle 12 settimane; «Mese 1» nel sottotitolo (resta solo il tema, «Dritto», accanto al livello); l'elenco completo degli esercizi in fondo; il testo della partitella; le chip di tutti i modelli.
- **Accorpa**: «In calendario oggi», la scelta del modello e «Inizia» diventano **un solo pulsante grande**; la sessione lasciata a metà diventa lo stesso pulsante con «Riprendi»; «Obiettivi vicini» e le medaglie diventano una sola fila **Medaglie**; il test di oggi diventa una pillola sotto il pulsante.
- **Icona**: cambia allenamento (frecce incrociate), blocchi della sessione (elenco), registra senza sessione (matita), livello (badge colorato con 5 tacche).
- **Altrove**: i blocchi della sessione in un foglio che si apre dalla striscia colorata o da «Blocchi» (con «cambia esercizio» e «Salva come mio»); le 12 settimane nel Diario.
- **Resta, più corto**: «Da correggere» diventa una riga con icona sotto il pulsante.

### Sessione dal vivo (passo 3)
- **Togli**: il nome del modello in alto; la descrizione e il criterio di qualità sempre aperti (si aprono con «Come si fa»); «Prossimo obiettivo» ripetuto due volte; il testo «Se sbaglia il compagno…» (ora nella Guida).
- **Accorpa**: i pallini delle fasi e la barra del tempo diventano una barra a segmenti colorati, uno per blocco; obiettivo e anello della medaglia in una sola card.
- **Icona**: cambia esercizio, nota sul colpo, dettagli dell'esercizio (i), pausa e avvio.
- **Altrove**: le regole dei tentativi nella Guida.
- **Chiusura**: medaglie e numeri in grande, con i coriandoli; compagno, sensazione, nota e «da correggere» in una sezione compatta.

### Diario
- **Togli**: la legenda lunga sotto il calendario (i colori si leggono dalle icone).
- **Accorpa**: l'appuntamento di oggi diventa una riga con le azioni a icona.
- **Icona**: tipo di voce (allenamento, test, lezione, partite, torneo); misure come chip con icona e unità.
- **Altrove**: le 12 settimane del piano, in alto.

### Progressi
- **Togli**: «Verso avanzato: quando ci sono…», «Dalla prima all'ultima…», «Esercizi con almeno il bronzo, per famiglia».
- **Accorpa**: «Il tuo livello» diventa una card con il badge e tre anelli (argento, oro, costanza); «Medaglie» ed «Esercizi recenti» diventano il **Medagliere** a griglia.
- **Icona**: ore, misure, medaglie, settimane come tessere con icona e numero.
- **Altrove**: le condizioni del livello nella Guida.

### Libreria
- **Allenamenti**: modelli e pacchetti come card con i mattoncini colorati e la durata; mesi e percorsi in una sezione compatta; «Importa» diventa un'icona in alto.
- **Esercizi**: l'elenco lungo diventa una griglia di schede (colore e icona della famiglia, badge del livello, anello della medaglia); filtri in una riga che scorre.
- **Colpi**: tolte le descrizioni dall'elenco (restano nella scheda del colpo); famiglia con colore e icona; ultima sensazione come tacche.

### Schede
- **Esercizio**: in alto colore e icona della famiglia, badge del livello, parametri con icona e unità; le medaglie come quattro anelli in fila; la spiegazione dei tentativi va nella Guida.
- **Allenamento**: i blocchi come mattoncini da trascinare, aggiungere e togliere.
- **Colpo**: famiglia con colore; le note restano.

### Guida e Impostazioni
- **Guida**: diventa il posto delle spiegazioni lunghe tolte dalle altre pagine (medaglie, livello, pause, turni, partitella).
- **Impostazioni**: righe con icona a sinistra; tolti i sottotitoli ovvi.

---

## 3. Regole

### 3.1 Colori

Ogni colore ha tre usi: **pieno** (mattoncini, icone, barre), **tenue** (sfondo delle card) e **testo sopra il pieno** (bianco o scuro). Nel tema scuro il pieno è più chiaro, così si legge sul fondo scuro.

**Famiglie di esercizi** (`--fam-*`, attributo `data-fam`):

| Famiglia | Icona | Chiaro | Scuro | Testo sopra |
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

### 3.2 Caratteri

- **Geist** per tutto il testo nelle schermate nuove, anche i titoli (pesi 700 e 800, spaziatura stretta). Fraunces resta solo nelle pagine non ancora rifatte.
- **Geist Mono** per tempo e numeri che cambiano (cifre della stessa larghezza).
- Scala: 12 (etichette), 14 (secondario), 16 (testo), 18 (titolo di card), 22 (sezione), 28 (titolo di pagina), 40 (numero grande), 96 (tempo nella sessione).
- Etichette corte in maiuscolo solo per livello e unità («INTERMEDIO», «MIN»), 12 px, peso 700, spaziatura 0,06em.
- Frasi brevi; numeri sempre con l'unità o con un'icona.

### 3.3 Icone

- Una sola libreria: **Lucide** (licenza ISC), già nel progetto.
- Dimensioni: 16 nelle chip, 20 nelle righe, 24 nei pulsanti, 28 nelle tessere grandi. Tratto 2; 2,4 sopra un colore pieno.
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
- A sinistra l'icona della famiglia in un quadrato più chiaro.
- Al centro il nome del blocco, sotto gli esercizi in breve (o «×3»).
- A destra la durata grande: `12` con `MIN` piccolo sotto.
- Più esercizi nel blocco: una fila di tacche con i colori delle loro famiglie.
- Si tocca (apre il blocco) e, nell'editor, si trascina.

### Scheda esercizio (`ExerciseCard`)
Fondo tenue della famiglia, icona della famiglia, nome (18, peso 700), badge del livello, parametri con icona e unità (`timer 6 min`, `target su 10`, `link di fila`), anello della medaglia a destra.

### Medaglia con anello (`MedalRing`)
Un cerchio con l'anello di avanzamento verso il gradino dopo (record ÷ soglia). Dentro, lo scudo della medaglia più alta presa, a colori; se non c'è ancora, lo scudo del gradino dopo in grigio; con la metà oro, uno scudo metà oro e metà grigio. Gli scudi sono disegni in `src/assets/medals/` (bronzo, argento, oro, platino), usati dal componente `MedalBadge`. Sotto, il gradino dopo in breve («oro · 20»). Animazione: l'anello si riempie con una molla, la medaglia nuova entra con un rimbalzo.

### Badge del livello (`LevelBadge`)
Pillola con il colore del livello, cinque tacche (piene fino al livello) e il nome in maiuscolo. Si tocca per cambiare livello.

### Pulsante grande (`BigButton`)
Tutta la larghezza, alto almeno 88, arancione con rilievo. A sinistra il cerchio con l'icona (play), poi il verbo grande («Inizia», «Riprendi») e sotto cosa parte («Intermedio · 60 min»). Sotto il testo, la fila dei blocchi come tacche colorate proporzionali alla durata.

### Altri
- **Giorni della settimana** (`WeekDays`): sette cerchi; pieno con il colore dell'attività se fatta, anello se prevista, oggi in evidenza. Si tocca e porta al Diario.
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
