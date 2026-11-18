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
// Un allenamento: { id, name, color, blocks, pauses }. `pauses` dice come entra il minuto di pausa
// fra un blocco e l'altro: 'inside' lo toglie al blocco dopo (la durata resta quella dei blocchi,
// come nella 0.2), 'extra' lo aggiunge (90 minuti = 85 di blocchi + 5 pause, come nella ricerca).
//
// I modelli salvati prima della 0.4 hanno `steps`: si leggono convertiti (normalizeTemplate), con
// le stesse durate, senza riscriverli. Si salvano nel formato nuovo solo quando li modifichi.

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
    pauses: 'inside',
    about: 'La sessione del piano, con i due esercizi del mese.',
    blocks: [warmup(10), serve(15), focus(25, 1), focus(25, 2), match(15)]
  },
  breve: {
    id: 'breve',
    name: 'Breve',
    color: 'sky',
    pauses: 'inside',
    about: 'Un’ora, senza il blocco servizi.',
    blocks: [warmup(10), focus(20, 1), focus(20, 2), match(10)]
  },
  servizi: {
    id: 'servizi',
    name: 'Servizi e terza palla',
    color: 'amber',
    pauses: 'inside',
    about: 'Quaranta minuti sull’inizio del punto.',
    blocks: [
      warmup(5),
      serve(20),
      block('Terza palla', 15, [
        { free: true, name: 'Terza palla', text: 'Servi con la variante del mese, il compagno risponde come vuole: attacchi la terza palla e si gioca il punto.' }
      ])
    ]
  }
};

/** Le sessioni «Su misura» della 0.2: nel diario si leggono ancora così, ma non si creano più. */
export const AUTO_TEMPLATE = { id: 'auto', name: 'Su misura', color: 'plum', hidden: true, pauses: 'inside', blocks: [] };

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

/** Un allenamento come è salvato → come lo usa l'app. Non modifica l'originale. */
export function normalizeTemplate(t) {
  if (!t) return null;
  if (Array.isArray(t.blocks)) {
    return {
      ...t,
      pauses: t.pauses === 'inside' ? 'inside' : 'extra',
      blocks: t.blocks.map((b) => ({ ...b, role: b.role ?? null, items: b.items ?? [] }))
    };
  }
  // Formato di prima (0.1-0.3): passi in fila, pause tolte al blocco dopo.
  const { steps, ...rest } = t;
  return { ...rest, pauses: 'inside', blocks: (steps ?? []).map(stepToBlock).filter(Boolean) };
}

/** La durata di un allenamento, pause comprese. */
export function templateMinutes(t) {
  const n = normalizeTemplate(t);
  if (!n) return 0;
  const sum = n.blocks.reduce((m, b) => m + (Number(b.minutes) || 0), 0);
  return n.pauses === 'extra' ? sum + Math.max(0, n.blocks.length - 1) : sum;
}
