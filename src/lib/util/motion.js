// Movimento ridotto: con l'impostazione del sistema attiva le transizioni di Svelte durano zero,
// niente coriandoli e niente rimbalzi (i cambi di colore restano). Le animazioni CSS le spegne
// già la regola globale in app.css.

const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

export function reducedMotion() {
  return Boolean(query?.matches);
}

/** Le durate delle regole grafiche (docs/design.md, 3.6). */
export const DUR = { fast: 120, base: 220, slow: 380 };

/** Una durata, oppure zero se il movimento è ridotto. */
export function dur(ms) {
  return reducedMotion() ? 0 : ms;
}
