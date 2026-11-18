// Versione e novità. La versione segue il versionamento semantico (MAJOR.MINOR.PATCH):
//   · PATCH (0.2.1) correzioni, nessuna novità visibile;
//   · MINOR (0.3.0) funzioni nuove, i dati restano compatibili;
//   · MAJOR (1.0.0) cambi grossi. Finché è 0.x l'app è considerata in sviluppo.
// La versione vera è quella di package.json: qui sotto si aggiunge la voce corrispondente.

import pkg from '../../../package.json';

export const VERSION = pkg.version;

export const CHANGELOG = [
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
