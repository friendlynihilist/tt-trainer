// Le regole grafiche in codice: l'icona di ogni misura, la famiglia (il colore) di ogni passo della
// sessione e di ogni mese, i blocchi di una sessione (docs/design.md). Le icone delle famiglie sono
// disegnate apposta: stanno in FamilyIcon.svelte.

import Target from '@lucide/svelte/icons/target';
import LinkIcon from '@lucide/svelte/icons/link';
import Hourglass from '@lucide/svelte/icons/hourglass';
import Hash from '@lucide/svelte/icons/hash';
import { BRICK } from '../data/bricks.js';

/** Icona e testo breve di come si misura un esercizio. */
export const MEASURE_ICON = { su: Target, fila: LinkIcon, tempo: Hourglass, conta: Hash };

/**
 * La famiglia (colore e icona) di un mese: quella dell'esercizio di adesso nel suo primo percorso.
 * Dritto e Rovescio → attacco; Primi colpi → schemi.
 */
export function blockFamily(block, catalog, medals = {}, current = null) {
  const t = block?.tracks?.[0];
  if (!t) return 'libero';
  const id = (current ? current(t, catalog, medals) : null) ?? catalog.sequence(t)[0];
  return catalog.exercise(id)?.family ?? 'libero';
}

/** La famiglia (colore e icona) di un passo della sessione. */
export function stepFamily(step, catalog) {
  if (!step) return null;
  if (step.kind === 'exercise') return catalog.exercise(step.ex)?.family ?? 'libero';
  if (step.kind === 'warmup') return 'palleggio';
  if (step.kind === 'serve') return 'servizio';
  if (step.kind === 'match') return 'partita';
  if (step.kind === 'free') return 'libero';
  if (step.kind === 'pause') return 'pausa';
  return null;
}

/**
 * I blocchi di una sessione, cioè i gruppi di passi fra una pausa e l'altra: il mattoncino.
 * Il colore è quello del primo esercizio; `fams` ha il colore di ogni esercizio del blocco.
 */
export function sessionBlocks(session, catalog) {
  const out = [];
  let cur = null;
  // Un blocco nuovo comincia dopo una pausa, oppure (negli allenamenti a mattoni, senza pause)
  // quando cambia il blocco del modello: i passi di un blocco si chiamano «b2», «b2-0», «b2-1»…
  const blockOf = (id) => /^b\d+/.exec(String(id))?.[0] ?? null;
  for (const s of session?.steps ?? []) {
    if (s.kind === 'pause') {
      cur = null;
      continue;
    }
    if (!cur || (blockOf(s.id) && blockOf(s.id) !== cur.block)) {
      const brick = BRICK[s.block?.brick] ?? null;
      cur = { key: s.id, block: blockOf(s.id), name: s.block?.name ?? s.name, minutes: 0, fam: brick?.fam ?? stepFamily(s, catalog), fams: [], steps: [] };
      out.push(cur);
    }
    cur.minutes += s.minutes;
    cur.fams.push(stepFamily(s, catalog));
    cur.steps.push(s);
  }
  return out;
}
