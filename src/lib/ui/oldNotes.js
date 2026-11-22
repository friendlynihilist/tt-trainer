// I testi rimasti dentro le voci del diario dalle versioni prima della 0.10: il «da correggere» e
// le note tecniche (colpo, palla, zona, errore). Qui diventano una frase, da mostrare come una nota.

import { app } from '../store/app.svelte.js';
import { BALL, POINT_PHASE, zoneLabel } from '../data/taxonomy.js';

/** (parti di un «da correggere» o di una nota tecnica) → il testo da leggere. */
export function describeOld(x) {
  if (x.kind === 'focus') return ['Da correggere', app.errorName(x.error)].filter(Boolean).join(': ');
  const line = [app.errorName(x.error), BALL[x.ball]?.name, zoneLabel(x.zone), POINT_PHASE[x.phase]?.name, x.score != null ? `${x.score} su 10` : null].filter(Boolean).join(' · ');
  return [line, x.note?.trim()].filter(Boolean).join(': ');
}
