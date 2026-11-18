// Compone la sessione: un modello di allenamento riempito con il mese in corso. Per ogni passo
// «del mese» l'app propone l'esercizio della sequenza del percorso (il primo senza argento); è solo
// una proposta, e nella sessione si cambia con qualsiasi altro esercizio.
//
// Fra un blocco e l'altro di un allenamento c'è un minuto di pausa, preso dal blocco dopo: la
// durata del modello non cambia. I modelli salvati restano come sono, le pause si aggiungono qui.

import { WARMUP_TEXT, PAUSE_MINUTES, SCHEMES, DEFAULT_SCHEME } from '../data/program.js';
import { BASE, serveExercise } from '../data/catalog.js';
import { STEP_TYPES } from '../data/templates.js';
import { currentInSequence } from './player.js';

const MAINT_MINUTES = 5;
export const TEST_MINUTES = 5;

/** Un passo con un esercizio della libreria (o personale). */
export function exerciseStep(id, exId, minutes, catalog = BASE, extra = {}) {
  const ex = catalog.exercise(exId);
  if (!ex) return null;
  return { id, kind: 'exercise', ex: ex.id, name: ex.name, minutes, ...extra };
}

/**
 * @param week      settimana del piano (weekAt) o null
 * @param template  il modello ({ steps }) già risolto
 * @param medals    medaglie per esercizio: servono solo a proporre l'esercizio di ogni percorso
 * @param pauses    un minuto di pausa fra un blocco e l'altro
 * @returns { block, template, minutes, steps[], trained[], exercises[] }
 */
export function composeSession({ week, template, catalog = BASE, medals = {}, pauses = true }) {
  const block = week?.focusBlock ?? week?.block ?? catalog.block('1');
  const steps = [];

  (template?.steps ?? []).forEach((s, i) => {
    const id = `${s.type}${i}`;
    const minutes = Math.max(1, Number(s.minutes) || STEP_TYPES[s.type]?.minutes || 10);

    if (s.type === 'warmup') {
      let maint = null;
      const exId = block.maint ? currentInSequence(block.maint, catalog, medals) : null;
      if (exId && minutes >= 10) {
        maint = { track: block.maint, ex: exId, name: catalog.exercise(exId).name, minutes: MAINT_MINUTES };
      }
      steps.push({ id, kind: 'warmup', name: STEP_TYPES.warmup.name, minutes, text: s.text || WARMUP_TEXT, maint });
    } else if (s.type === 'serve') {
      steps.push({ id, kind: 'serve', name: STEP_TYPES.serve.name, minutes, serve: block.serve, ex: serveExercise(block.serve) });
    } else if (s.type === 'focus' || s.type === 'track') {
      const trackId = s.type === 'focus' ? block.tracks[(s.slot ?? 1) - 1] : s.track;
      const exId = trackId ? currentInSequence(trackId, catalog, medals) : null;
      const step = exId ? exerciseStep(id, exId, minutes, catalog, { track: trackId }) : null;
      if (step) steps.push(step);
    } else if (s.type === 'exercise') {
      const step = exerciseStep(id, s.ex, minutes, catalog);
      if (step) steps.push(step);
    } else if (s.type === 'free') {
      steps.push({ id, kind: 'free', name: s.name || STEP_TYPES.free.name, minutes, text: s.text ?? '' });
    } else if (s.type === 'match') {
      const schemes = (block.schemes ?? []).filter((x) => SCHEMES[x]);
      if (!schemes.length) schemes.push(DEFAULT_SCHEME);
      steps.push({ id, kind: 'match', name: STEP_TYPES.match.name, minutes, schemes, scheme: SCHEMES[schemes[0]], note: s.text ?? '' });
    }
  });

  const all = pauses ? withPauses(steps) : steps;
  return {
    block,
    template: template ? { id: template.id, name: template.name, color: template.color } : null,
    minutes: all.reduce((n, s) => n + s.minutes, 0),
    steps: all,
    trained: trainedTracks(all),
    exercises: sessionExercises(all)
  };
}

/** Un minuto di pausa prima di ogni blocco tranne il primo, tolto al blocco stesso. */
export function withPauses(steps) {
  const out = [];
  steps.forEach((s, i) => {
    if (i > 0 && s.minutes > PAUSE_MINUTES) {
      out.push({ id: `pause-${s.id}`, kind: 'pause', name: 'Pausa', minutes: PAUSE_MINUTES });
      s.minutes -= PAUSE_MINUTES;
    }
    out.push(s);
  });
  return out;
}

/** I minuti della partitella: la prima metà rischiosa, la seconda a schema. */
export function matchHalves(minutes) {
  const first = Math.ceil(minutes / 2);
  return [first, minutes - first];
}

/** Un test: un passo per esercizio, con l'obiettivo già aperto. */
export function composeTest({ exerciseIds = [], catalog = BASE }) {
  const steps = exerciseIds.map((id) => exerciseStep(`t-${id}`, id, TEST_MINUTES, catalog, { goal: true })).filter(Boolean);
  return {
    block: null,
    template: null,
    minutes: steps.reduce((n, s) => n + s.minutes, 0),
    steps,
    trained: [],
    exercises: sessionExercises(steps)
  };
}

/** I percorsi allenati in una sessione. */
export function trainedTracks(steps) {
  const out = [];
  for (const s of steps) {
    if (s.kind === 'exercise' && s.track && !out.includes(s.track)) out.push(s.track);
    if (s.maint && !out.includes(s.maint.track)) out.push(s.maint.track);
  }
  return out;
}

/** Gli esercizi di una sessione: quelli dei blocchi, dei servizi e del mantenimento. */
export function sessionExercises(steps) {
  const out = [];
  const add = (id) => id && !out.includes(id) && out.push(id);
  for (const s of steps) {
    if (s.kind === 'exercise' || s.kind === 'serve') add(s.ex);
    if (s.maint) add(s.maint.ex);
  }
  return out;
}
