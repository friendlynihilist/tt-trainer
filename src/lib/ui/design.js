// Le regole grafiche in codice: icona di ogni famiglia, famiglia di ogni passo della sessione,
// segmenti colorati di una sessione (docs/design.md).

import Send from '@lucide/svelte/icons/send';
import Reply from '@lucide/svelte/icons/reply';
import Repeat from '@lucide/svelte/icons/repeat';
import Zap from '@lucide/svelte/icons/zap';
import Shield from '@lucide/svelte/icons/shield';
import Scissors from '@lucide/svelte/icons/scissors';
import Footprints from '@lucide/svelte/icons/footprints';
import Route from '@lucide/svelte/icons/route';
import Swords from '@lucide/svelte/icons/swords';
import PencilLine from '@lucide/svelte/icons/pencil-line';
import Coffee from '@lucide/svelte/icons/coffee';
import Target from '@lucide/svelte/icons/target';
import LinkIcon from '@lucide/svelte/icons/link';
import Hourglass from '@lucide/svelte/icons/hourglass';
import Hash from '@lucide/svelte/icons/hash';

/** Icona Lucide di ogni famiglia (e dei blocchi che non sono esercizi). */
export const FAMILY_ICON = {
  servizio: Send,
  ricezione: Reply,
  palleggio: Repeat,
  attacco: Zap,
  controllo: Shield,
  taglio: Scissors,
  gambe: Footprints,
  schemi: Route,
  partita: Swords,
  libero: PencilLine,
  pausa: Coffee
};

/** Icona e testo breve di come si misura un esercizio. */
export const MEASURE_ICON = { su: Target, fila: LinkIcon, tempo: Hourglass, conta: Hash };

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

/** I segmenti colorati di una sessione (senza pause), proporzionali ai minuti. */
export function sessionSegments(session, catalog) {
  return (session?.steps ?? []).filter((s) => s.kind !== 'pause').map((s) => ({ id: s.id, fam: stepFamily(s, catalog), minutes: s.minutes, name: s.name }));
}

/**
 * I blocchi di una sessione, cioè i gruppi di passi fra una pausa e l'altra: il mattoncino.
 * Il colore è quello del primo esercizio; `fams` ha il colore di ogni esercizio del blocco.
 */
export function sessionBlocks(session, catalog) {
  const out = [];
  let cur = null;
  for (const s of session?.steps ?? []) {
    if (s.kind === 'pause') {
      cur = null;
      continue;
    }
    if (!cur) {
      cur = { key: s.id, name: s.block?.name ?? s.name, minutes: 0, fam: stepFamily(s, catalog), fams: [], steps: [] };
      out.push(cur);
    }
    cur.minutes += s.minutes;
    cur.fams.push(stepFamily(s, catalog));
    cur.steps.push(s);
  }
  return out;
}
