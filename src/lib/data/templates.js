// Allenamenti: la scaletta di una sessione, fatta di blocchi. Dalla 0.4 il formato è uno solo per i
// modelli di base, i pacchetti per livello (packages.js) e gli allenamenti personali.
//
// Un blocco:
//   { name, minutes, role, items, text, schemes, level }
//   · role: 'warmup' | 'serve' | 'match' per i blocchi speciali, altrimenti null;
//   · items: gli esercizi del blocco, in ordine. Ognuno è { ex } (un esercizio della libreria),
//     { focus: n } (l'n° percorso del mese), { track: id } (un percorso fisso) oppure
//     { free: true, name, text } (scritto da te). Un blocco con più esercizi si divide in parti uguali.
//   · schemes (solo partitella): gli schemi della partitella a schema; vuoto = quelli del mese.
//   · level (solo partitella): la variante per livello (packages.js, MATCH_VARIANTS).
//
// Un allenamento: { id, name, color, blocks }. Fra un blocco e l'altro c'è un minuto di pausa, che
// si aggiunge alla durata dei blocchi (90 minuti = 85 di blocchi + 5 pause). Gli allenamenti a
// fondamentali (bricks.js) hanno `gaps: false`: niente pause, la durata è la somma dei fondamentali.
//
// Prima della 0.4 la pausa si toglieva al blocco dopo. I modelli salvati così (`steps`, oppure
// blocchi con `pauses: 'inside'`) si leggono convertiti (normalizeTemplate): ogni blocco dopo il
// primo perde un minuto, quindi la durata totale resta la stessa. Non si riscrivono: si salvano nel
// formato nuovo solo quando li modifichi.

export const COLORS = ['blue', 'sky', 'violet', 'teal', 'amber', 'pink', 'brown', 'plum', 'slate', 'orange'];

/** I passi del formato di prima, con il nome e la durata di base. Servono anche all'importazione. */
export const STEP_TYPES = {
  warmup: { name: 'Riscaldamento', minutes: 10 },
  serve: { name: 'Servizi e ricezione', minutes: 15 },
  focus: { name: 'Esercizio del mese', minutes: 25 },
  track: { name: 'Percorso fisso', minutes: 20 },
  exercise: { name: 'Esercizio', minutes: 15 },
  free: { name: 'Esercizio libero', minutes: 15 },
  match: { name: 'Partitella', minutes: 15 }
};

const block = (name, minutes, items = [], extra = {}) => ({ name, minutes, role: null, items, ...extra });
const warmup = (minutes) => ({ name: STEP_TYPES.warmup.name, minutes, role: 'warmup', items: [] });
const serve = (minutes) => ({ name: STEP_TYPES.serve.name, minutes, role: 'serve', items: [] });
const match = (minutes) => ({ name: STEP_TYPES.match.name, minutes, role: 'match', items: [] });
const focus = (minutes, n) => block(STEP_TYPES.focus.name, minutes, [{ focus: n }]);

export const TEMPLATES = {
  completo: {
    id: 'completo',
    name: 'Completo',
    color: 'blue',
    about: 'La sessione del piano, con i due esercizi del mese.',
    blocks: [warmup(10), serve(14), focus(24, 1), focus(24, 2), match(14)]
  },
  breve: {
    id: 'breve',
    name: 'Breve',
    color: 'sky',
    about: 'Un’ora, senza il blocco servizi.',
    blocks: [warmup(10), focus(19, 1), focus(19, 2), match(9)]
  },
  servizi: {
    id: 'servizi',
    name: 'Servizi e terza palla',
    color: 'amber',
    about: 'Quaranta minuti sull’inizio del punto.',
    blocks: [
      warmup(5),
      serve(19),
      block('Terza palla', 14, [
        { free: true, name: 'Terza palla', text: 'Servi con la variante del mese, il compagno risponde come vuole: attacchi la terza palla e si gioca il punto.' }
      ])
    ]
  }
};

/** Le sessioni «Su misura» della 0.2: nel diario si leggono ancora così, ma non si creano più. */
export const AUTO_TEMPLATE = { id: 'auto', name: 'Su misura', color: 'plum', hidden: true, blocks: [] };

export const DEFAULT_TEMPLATE = 'completo';

/** Le sessioni A e B del primo modello erano entrambe la sessione completa. */
export const LEGACY_TEMPLATE = 'completo';

/** Un passo del formato di prima → blocco. Stesso nome, stessa durata, stesso contenuto. */
export function stepToBlock(s) {
  const minutes = Number(s.minutes) || STEP_TYPES[s.type]?.minutes || 10;
  const text = s.text?.trim() ? { text: s.text } : {};
  switch (s.type) {
    case 'warmup':
      return { ...warmup(minutes), ...text };
    case 'serve':
      return serve(minutes);
    case 'focus':
      return focus(minutes, s.slot ?? 1);
    case 'track':
      return block(STEP_TYPES.track.name, minutes, [{ track: s.track }]);
    case 'exercise':
      return block(STEP_TYPES.exercise.name, minutes, [{ ex: s.ex }]);
    case 'free':
      return block(s.name || STEP_TYPES.free.name, minutes, [{ free: true, name: s.name || STEP_TYPES.free.name, text: s.text ?? '' }]);
    case 'match':
      return { ...match(minutes), ...text };
    default:
      return null;
  }
}

/**
 * Pausa tolta al blocco dopo → pausa aggiunta: ogni blocco dopo il primo perde un minuto, così la
 * durata totale non cambia (un blocco da un minuto resta da un minuto).
 */
function pausesOutside(blocks) {
  return blocks.map((b, i) => (i > 0 && b.minutes > 1 ? { ...b, minutes: b.minutes - 1 } : b));
}

/** Un allenamento come è salvato → come lo usa l'app. Non modifica l'originale. */
export function normalizeTemplate(t) {
  if (!t) return null;
  const { steps, pauses, ...rest } = t;
  let blocks;
  if (Array.isArray(t.blocks)) {
    blocks = t.blocks.map((b) => ({ ...b, role: b.role ?? null, items: b.items ?? [] }));
    if (pauses === 'inside') blocks = pausesOutside(blocks);
  } else {
    // Formato di prima (0.1-0.3): passi in fila, pause tolte al blocco dopo.
    blocks = pausesOutside((steps ?? []).map(stepToBlock).filter(Boolean));
  }
  return { ...rest, blocks };
}

/** La durata di un allenamento, pause comprese: i blocchi più un minuto fra l'uno e l'altro. */
export function templateMinutes(t) {
  const n = normalizeTemplate(t);
  if (!n) return 0;
  return n.blocks.reduce((m, b) => m + (Number(b.minutes) || 0), 0) + (n.gaps === false ? 0 : Math.max(0, n.blocks.length - 1));
}
