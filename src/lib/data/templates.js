// Modelli di allenamento: la scaletta di una sessione. I passi «del mese» prendono il percorso
// dal mese in corso del piano, al livello raggiunto; gli altri sono fissi. I test non stanno nel
// modello: si decidono il giorno stesso (c'è un test in calendario, oppure lo attivi a mano).

export const COLORS = ['blue', 'sky', 'violet', 'teal', 'amber', 'pink', 'brown', 'plum', 'slate', 'orange'];

export const STEP_TYPES = {
  warmup: { name: 'Riscaldamento', minutes: 10, hint: 'Diagonali e top su block. Dal mese 2 chiude con il mantenimento.' },
  serve: { name: 'Servizi e ricezione', minutes: 15, hint: 'Il lavoro di servizio del mese. A metà si cambia.' },
  focus: { name: 'Esercizio del mese', minutes: 25, hint: 'Un percorso del mese in corso, al tuo livello.' },
  track: { name: 'Percorso fisso', minutes: 20, hint: 'Sempre lo stesso percorso, al tuo livello.' },
  free: { name: 'Esercizio libero', minutes: 15, hint: 'Un esercizio scritto da te, senza livelli.' },
  match: { name: 'Partitella', minutes: 15, hint: 'Set giocati con la regola del mese.' }
};

const step = (type, minutes, extra = {}) => ({ type, minutes, ...extra });

export const TEMPLATES = {
  completo: {
    id: 'completo',
    name: 'Completo',
    color: 'blue',
    about: 'La sessione del piano: cinque fasi, i due esercizi del mese al tuo livello.',
    steps: [step('warmup', 10), step('serve', 15), step('focus', 25, { slot: 1 }), step('focus', 25, { slot: 2 }), step('match', 15)]
  },
  breve: {
    id: 'breve',
    name: 'Breve',
    color: 'sky',
    about: 'Un’ora: si salta il blocco servizi e si accorcia il resto.',
    steps: [step('warmup', 10), step('focus', 20, { slot: 1 }), step('focus', 20, { slot: 2 }), step('match', 10)]
  },
  servizi: {
    id: 'servizi',
    name: 'Servizi e terza palla',
    color: 'amber',
    about: 'Quaranta minuti sull’inizio del punto.',
    steps: [
      step('warmup', 5),
      step('serve', 20),
      step('free', 15, {
        name: 'Terza palla',
        text: 'Servi con la variante del mese, il compagno risponde come vuole: attacchi la terza palla e si gioca il punto.'
      })
    ]
  }
};

/** Le sessioni composte dal suggeritore: nel diario si chiamano così, ma non si scelgono da un elenco. */
export const AUTO_TEMPLATE = { id: 'auto', name: 'Su misura', color: 'plum', hidden: true, about: 'Composto dal suggeritore.', steps: [] };

export const DEFAULT_TEMPLATE = 'completo';

/** Le sessioni A e B del primo modello erano entrambe la sessione completa. */
export const LEGACY_TEMPLATE = 'completo';

export function templateMinutes(t) {
  return (t?.steps ?? []).reduce((n, s) => n + (Number(s.minutes) || 0), 0);
}
