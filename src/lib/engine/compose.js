// Compone la sessione: un modello di allenamento riempito con il mese in corso e con il livello
// reale di ogni percorso. Lo stesso per un test: una scaletta di soli test.
//
// Fra un blocco e l'altro di un allenamento c'è un minuto di pausa, preso dal blocco dopo: la
// durata del modello non cambia. I modelli salvati restano come sono, le pause si aggiungono qui.

import { WARMUP_TEXT, PAUSE_MINUTES, SCHEMES, DEFAULT_SCHEME } from '../data/program.js';
import { BASE } from '../data/catalog.js';
import { STEP_TYPES } from '../data/templates.js';

const MAINT_MINUTES = 5;
const TEST_MINUTES = 5;

function exerciseStep(id, trackId, minutes, tracks, catalog, test, extra = {}) {
  const track = catalog.track(trackId);
  const st = tracks[trackId];
  if (!track || !st) return null;
  return {
    id,
    kind: 'exercise',
    name: track.short,
    minutes,
    track: trackId,
    level: st.level,
    max: catalog.maxLevel(trackId),
    exercise: catalog.level(trackId, st.level),
    placement: !st.started,
    // Il test comincia l'esercizio. Se il percorso parte oggi lo sostituisce il test di partenza.
    test: Boolean(test && st.started),
    ...extra
  };
}

/**
 * @param week      settimana del piano (weekAt) o null
 * @param template  il modello ({ steps }) già risolto
 * @param tracks    stato dei percorsi (computeTracks)
 * @param test      oggi si fanno i test (c'è un test in calendario o l'hai chiesto). Vale per gli
 *                  esercizi e il mantenimento: i servizi si misurano solo se lo chiedi durante la sessione.
 * @param pauses    un minuto di pausa fra un blocco e l'altro
 * @returns { block, template, minutes, steps[], trained[] }
 */
export function composeSession({ week, template, tracks, catalog = BASE, test = false, pauses = true }) {
  const block = week?.focusBlock ?? week?.block ?? catalog.block('1');
  const steps = [];

  (template?.steps ?? []).forEach((s, i) => {
    const id = `${s.type}${i}`;
    const minutes = Math.max(1, Number(s.minutes) || STEP_TYPES[s.type]?.minutes || 10);

    if (s.type === 'warmup') {
      let maint = null;
      if (block.maint && tracks[block.maint] && minutes >= 10) {
        const st = tracks[block.maint];
        maint = {
          track: block.maint,
          name: catalog.track(block.maint).short,
          level: st.level,
          max: catalog.maxLevel(block.maint),
          exercise: catalog.level(block.maint, st.level),
          minutes: MAINT_MINUTES,
          // Il mantenimento si misura una volta al mese: nell'ultima settimana.
          test: Boolean(test && week?.lastOfBlock && st.started)
        };
      }
      steps.push({ id, kind: 'warmup', name: STEP_TYPES.warmup.name, minutes, text: s.text || WARMUP_TEXT, maint });
    } else if (s.type === 'serve') {
      steps.push({ id, kind: 'serve', name: STEP_TYPES.serve.name, minutes, serve: block.serve, test: false });
    } else if (s.type === 'focus') {
      const trackId = block.tracks[(s.slot ?? 1) - 1];
      const step = trackId ? exerciseStep(id, trackId, minutes, tracks, catalog, test) : null;
      if (step) steps.push(step);
    } else if (s.type === 'track') {
      const step = exerciseStep(id, s.track, minutes, tracks, catalog, test);
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
    trained: trainedTracks(all)
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

/**
 * Un test da solo: un passo per percorso (test di partenza se non è mai stato fatto),
 * più i servizi del mese se richiesti.
 */
export function composeTest({ week, trackIds, tracks, catalog = BASE, serve = false }) {
  const block = week?.focusBlock ?? week?.block ?? catalog.block('1');
  const steps = [];
  if (serve) steps.push({ id: 'serve', kind: 'serve', name: STEP_TYPES.serve.name, minutes: TEST_MINUTES, serve: block.serve, test: true });
  for (const id of trackIds) {
    const step = exerciseStep(`t-${id}`, id, TEST_MINUTES, tracks, catalog, true, { maintTest: block.maint === id && !block.tracks.includes(id) });
    if (step) steps.push(step);
  }
  return {
    block,
    template: null,
    minutes: steps.reduce((n, s) => n + s.minutes, 0),
    steps,
    trained: []
  };
}

/** I percorsi allenati in una sessione (per sapere quando conviene testarli). */
export function trainedTracks(steps) {
  const out = [];
  for (const s of steps) {
    if (s.kind === 'exercise' && !out.includes(s.track)) out.push(s.track);
    if (s.maint && !out.includes(s.maint.track)) out.push(s.maint.track);
  }
  return out;
}

/** Quanti test prevede la sessione (per il riepilogo in Oggi). */
export function countTests(session) {
  let n = 0;
  for (const s of session.steps) {
    if (s.test || s.placement) n++;
    if (s.maint?.test) n++;
  }
  return n;
}
