// Versione e novità. La versione segue il versionamento semantico (MAJOR.MINOR.PATCH):
//   · PATCH (0.2.1) correzioni, nessuna novità visibile;
//   · MINOR (0.3.0) funzioni nuove, i dati restano compatibili;
//   · MAJOR (1.0.0) cambi grossi. Finché è 0.x l'app è considerata in sviluppo.
// La versione vera è quella di package.json: qui sotto si aggiunge la voce corrispondente.

import pkg from '../../../package.json';

export const VERSION = pkg.version;

export const CHANGELOG = [
  {
    version: '0.9.2',
    date: '2026-11-22',
    title: 'La pausa e l’andamento',
    items: [
      { icon: 'coffee', text: 'Fra un fondamentale e l’altro c’è sempre un minuto di pausa. Quando finisce suona un bip e il fondamentale dopo parte da solo; se non ti serve la salti. La durata degli allenamenti ora conta anche le pause.' },
      { icon: 'trending', text: 'In Progressi il grafico si guarda per giorni, per settimane o per mesi: scegli in alto, oppure allarga e stringi due dita sul grafico. Con un dito scorri fra i punti.' }
    ]
  },
  {
    version: '0.9.1',
    date: '2026-11-21',
    title: 'La settimana in Oggi',
    items: [{ icon: 'calendar', text: 'Un giorno diventa verde con la spunta solo quando non resta niente da fare. Se hai fatto il test ma non l’allenamento, resta l’anello blu.' }]
  },
  {
    version: '0.9.0',
    date: '2026-11-21',
    title: 'I fondamentali',
    items: [
      { icon: 'blocks', text: 'I mattoni ora si chiamano fondamentali: dritto, rovescio, servizio e gli altri.' },
      { icon: 'palette', text: 'L’aspetto segue fino in fondo il progetto nuovo: barra in basso, pulsanti, schede e titoli. Durante l’allenamento il tempo è in grande, con un pulsante solo.' },
      { icon: 'trending', text: 'Progressi si apre su «Andamento»: il tuo livello con quello che manca per il prossimo, le ultime dodici settimane e le medaglie.' },
      { icon: 'calendar', text: 'Nel Diario, toccando un allenamento già fatto vedi i suoi fondamentali, i risultati e le note. Per correggerlo c’è «Modifica».' },
      { icon: 'library', text: 'Un allenamento nuovo lo puoi mettere oggi, in un altro giorno, oppure negli stessi giorni per una settimana o per un mese.' },
      { icon: 'map', text: 'Chi aveva già aperto la versione di prima rivede la guida mentre costruisce il primo allenamento.' }
    ]
  },
  {
    version: '0.8.1',
    date: '2026-11-21',
    title: 'Ritocchi all’aspetto',
    items: [
      { icon: 'palette', text: 'La fiamma delle settimane di fila è nuova. Anche l’icona dell’app e la schermata di caricamento ora hanno il tavolo blu.' },
      { icon: 'pencil', text: 'Numeri e scritte hanno lo stesso carattere in tutta l’app, dal calendario al cronometro.' },
      { icon: 'blocks', text: 'Chi usava l’app da prima dei fondamentali, alla prima apertura costruisce il suo primo allenamento con la guida.' }
    ]
  },
  {
    version: '0.8.0',
    date: '2026-11-21',
    title: 'Allenamenti per fondamentali',
    items: [
      { icon: 'blocks', text: 'Un allenamento ora si costruisce con i fondamentali, uno per colpo. Tocca il tasto + in basso, scegli i fondamentali, decidi quanto durano e quali esercizi fare.' },
      { icon: 'palette', text: 'L’app ha un aspetto nuovo: schede bianche e blu al posto dell’arancione. In Oggi trovi il tavolo visto dall’alto, con l’allenamento del giorno.' },
      { icon: 'map', text: 'In Progressi c’è la mappa di ogni colpo: una casella per esercizio, con la medaglia che hai vinto. La pallina indica l’esercizio da fare adesso.' },
      { icon: 'library', text: 'In Libreria trovi i tuoi allenamenti. Toccane uno per cambiargli nome, metterlo a oggi, cambiare i fondamentali o eliminarlo.' },
      { icon: 'pencil', text: 'Alla fine dell’allenamento puoi scrivere una nota per ogni colpo. Le rileggi in Progressi, nella mappa del colpo.' },
      { icon: 'calendar', text: 'Lezioni, partite e tornei si aggiungono dal Diario: tocca un giorno e poi «Aggiungi a questo giorno».' }
    ],
    note: 'Il diario, le medaglie e il programma che avevi restano come sono.'
  },
  {
    version: '0.7.0',
    date: '2026-11-20',
    title: 'Indietro e copia dei dati',
    items: [
      { icon: 'swap', text: 'Il tasto «indietro» del telefono chiude il foglio aperto e mette in pausa l’allenamento. Prima usciva dall’app.' },
      { icon: 'library', text: 'Da Impostazioni puoi ripristinare una copia completa dei tuoi dati.' },
      { icon: 'pencil', text: 'Se elimini una voce del diario per sbaglio, tocca «Annulla».' },
      { icon: 'trending', text: 'Un percorso archiviato si riprende dalla Libreria, in fondo ai percorsi.' }
    ]
  },
  {
    version: '0.6.2',
    date: '2026-11-20',
    title: 'Pagine più semplici',
    items: [
      { icon: 'calendar', text: 'In Oggi, sotto «Inizia», c’è una riga sola: toccala per vedere i blocchi, cambiare un esercizio o scegliere un altro allenamento.' },
      { icon: 'trending', text: 'In Progressi trovi tre anelli per il livello dopo: argento, oro e costanza. Sotto c’è scritto cosa ti manca.' },
      { icon: 'gauge', text: 'La sensazione ha un nome sotto ogni barra, da «Dura» a «Ottima».' },
      { icon: 'palette', text: 'I testi grigi si leggono meglio. Guida e Impostazioni hanno la freccia per tornare indietro.' }
    ],
    note: 'La Guida ora si apre da Impostazioni. I compagni del gruppo li trovi in Impostazioni.'
  },
  {
    version: '0.6.1',
    date: '2026-11-20',
    title: 'Correzioni',
    items: [{ icon: 'calendar', text: 'Nel Diario puoi di nuovo aggiungere qualcosa a oggi anche quando la giornata è vuota: tocca «Aggiungi a oggi» sotto il calendario.' }]
  },
  {
    version: '0.6.0',
    date: '2026-11-20',
    title: 'Un aspetto nuovo',
    items: [
      { icon: 'palette', text: 'L’app ha un aspetto nuovo: caratteri più chiari, un colore per ogni famiglia di esercizi e meno pulsanti. Le sezioni lunghe si aprono e si chiudono.' },
      { icon: 'calendar', text: 'In Oggi trovi in alto su cosa lavori questo mese, poi l’allenamento del giorno, la settimana o il mese, le medaglie prese oggi e una da prendere.' },
      { icon: 'trending', text: 'Il piano è fatto di tappe: per ognuna scegli su cosa lavori e per quanto, da un allenamento solo a quattro settimane.' },
      { icon: 'swap', text: 'In allenamento, a metà di ogni esercizio in due suona il cambio e il riquadro del tempo diventa scuro: tocca al compagno.' },
      { icon: 'medal', text: 'In Progressi trovi la costanza, gli anelli di argento e oro per il livello e il medagliere.' },
      { icon: 'library', text: 'Nel Diario i pallini colorati dicono cosa hai fatto ogni giorno. In Libreria cerchi gli esercizi per nome.' }
    ],
    note: 'I tuoi dati non cambiano. Il cambio ogni 5 minuti ora arriva a metà esercizio: si spegne da Impostazioni.'
  },
  {
    version: '0.5.0',
    date: '2026-11-19',
    title: 'Note per colpo',
    items: [
      { icon: 'pencil', text: 'Per ogni colpo scrivi come lo senti e cosa vuoi migliorare, con una sensazione da 1 a 5.' },
      { icon: 'gauge', text: 'Nella scheda del colpo trovi l’ultima sensazione e la media delle ultime cinque.' },
      { icon: 'swords', text: 'Durante la sessione, su ogni esercizio, scrivi subito una nota sul colpo che stai allenando.' },
      { icon: 'users', text: 'Le note sono solo tue. Le trovi anche nel CSV e nella copia completa.' }
    ]
  },
  {
    version: '0.4.0',
    date: '2026-11-19',
    title: 'Pacchetti e allenamenti tuoi',
    items: [
      { icon: 'library', text: 'Per ogni livello ci sono due pacchetti, da 90 e da 60 minuti. In Oggi trovi quelli del tuo livello.' },
      { icon: 'swap', text: 'Ogni esercizio si cambia con un tocco, prima di iniziare o durante la sessione.' },
      { icon: 'pencil', text: 'Crea i tuoi allenamenti a blocchi, da zero o da un pacchetto.' },
      { icon: 'swords', text: 'La partitella ha la variante del tuo livello e gli schemi della libreria.' },
      { icon: 'users', text: 'Negli esercizi l’app suona «Cambio» ogni 5 minuti, così vi alternate. Si spegne da Impostazioni.' }
    ],
    note: 'I tuoi modelli di prima ci sono ancora, con la stessa durata.'
  },
  {
    version: '0.3.0',
    date: '2026-11-18',
    title: 'Medaglie e livelli',
    items: [
      { icon: 'medal', text: 'Ogni esercizio ha le sue medaglie: bronzo, argento, oro e a volte platino. Non si perdono e non bloccano niente.' },
      { icon: 'library', text: 'La libreria ha 82 esercizi in otto famiglie. Per ognuno trovi il livello suggerito, il formato, la qualità da cercare e gli errori più comuni.' },
      { icon: 'gauge', text: 'In allenamento tocchi «Prova l’obiettivo» e l’app ti mostra il prossimo gradino. Il test resta un appuntamento a parte.' },
      { icon: 'trending', text: 'Il tuo livello lo scegli tu. Quando sei pronto per quello dopo, te lo propone l’app.' },
      { icon: 'users', text: 'Medaglie e livello sono solo tuoi: il gruppo vede soltanto il nome. A fine sessione segni con chi ti sei allenato.' }
    ],
    note: 'I test fatti finora contano per le medaglie degli esercizi corrispondenti. Il test di partenza e «Su misura» non ci sono più.'
  },
  {
    version: '0.2.1',
    date: '2026-11-18',
    title: 'Correzioni',
    items: [
      { icon: 'gauge', text: 'In allenamento l’app non chiede più quanti servizi sono riusciti. Se vuoi segnarli, tocca «Misura i servizi».' },
      { icon: 'swords', text: 'Due nuove partitelle. Rischiosa: ogni set parte da 9-10. A schema: chi esegue bene lo schema fa il punto.' },
      { icon: 'coffee', text: 'Fra un blocco e l’altro c’è 1 minuto di pausa, che puoi saltare. La durata totale non cambia.' }
    ],
    note: 'I servizi che avevi già segnato restano nel diario.'
  },
  {
    version: '0.2.0',
    date: '2026-11-17',
    title: 'Allenati come vuoi',
    items: [
      { icon: 'calendar', text: 'Ora scegli tu quanti allenamenti fare e in quali giorni della settimana.' },
      { icon: 'gauge', text: 'Il test diventa un appuntamento a parte. Quando capita nello stesso giorno di un allenamento, lo fai all’inizio di ogni esercizio.' },
      { icon: 'palette', text: 'Nel Diario ogni attività ha un colore diverso. Il pallino pieno indica le attività fatte, il cerchio vuoto quelle in programma.' },
      { icon: 'library', text: 'Dalla Libreria puoi creare i tuoi allenamenti, i tuoi mesi e i tuoi esercizi con i relativi livelli. Puoi anche importarli da un file.' },
      { icon: 'sparkles', text: 'Con «Su misura» l’app prepara la sessione in base al tuo livello e ti segnala gli esercizi da misurare.' }
    ],
    note: 'Il tuo diario non cambia: trovi tutte le sessioni, i test e i livelli di prima.'
  },
  {
    version: '0.1.0',
    date: '2026-11-17',
    title: 'Prima versione',
    items: [
      { icon: 'calendar', text: 'Il piano di tre mesi, con ogni sessione preparata al tuo livello.' },
      { icon: 'gauge', text: 'La sessione dal vivo, con il timer e il test da 10 tentativi.' },
      { icon: 'library', text: 'Il diario, i progressi, l’elenco dei colpi e il gruppo.' }
    ]
  }
];

/** -1, 0, 1 come per sort. «0.10.0» viene dopo «0.9.0». */
export function compareVersions(a, b) {
  const pa = String(a ?? '0').split('.').map(Number);
  const pb = String(b ?? '0').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** Le novità uscite dopo l'ultima versione vista (la più recente prima). */
export function unseen(seen) {
  return CHANGELOG.filter((c) => compareVersions(c.version, seen) > 0 && compareVersions(c.version, VERSION) <= 0);
}
