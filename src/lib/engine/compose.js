// Compone la sessione: è il foglio «Questa settimana», ma calcolato dal livello reale
// di ogni percorso invece che da una griglia di celle.

import { BLOCKS, PHASES, TRACKS, WARMUP_TEXT, levelOf } from '../data/program.js';

const MAINT_MINUTES = 5;

/**
 * @param week    settimana del piano (weekAt)
 * @param slot    'A' | 'B'
 * @param tracks  stato dei percorsi (computeTracks)
 * @returns { block, slot, minutes, steps[] }
 */
export function composeSession({ week, slot, tracks }) {
  const block = week.block ?? BLOCKS['1'];
  const isB = slot === 'B';
  const steps = [];

  let maint = null;
  if (block.maint) {
    const st = tracks[block.maint];
    maint = {
      track: block.maint,
      name: TRACKS[block.maint].short,
      level: st.level,
      exercise: levelOf(block.maint, st.level),
      minutes: MAINT_MINUTES,
      test: isB && week.lastOfBlock
    };
  }
  steps.push({ id: 'warmup', kind: 'warmup', name: PHASES[0].name, minutes: PHASES[0].minutes, text: WARMUP_TEXT, maint });

  steps.push({
    id: 'serve',
    kind: 'serve',
    name: PHASES[1].name,
    minutes: PHASES[1].minutes,
    serve: block.serve,
    test: isB
  });

  block.tracks.forEach((trackId, i) => {
    const st = tracks[trackId];
    const phase = PHASES[2 + i];
    steps.push({
      id: phase.id,
      kind: 'exercise',
      name: TRACKS[trackId].short,
      minutes: phase.minutes,
      track: trackId,
      level: st.level,
      exercise: levelOf(trackId, st.level),
      placement: !st.started,
      // Nella sessione B l'esercizio comincia con il test. Se il percorso parte oggi,
      // il test di partenza lo sostituisce.
      test: isB && st.started
    });
  });

  steps.push({ id: 'match', kind: 'match', name: PHASES[4].name, minutes: PHASES[4].minutes, rule: block.rule });

  return {
    block,
    slot,
    minutes: steps.reduce((n, s) => n + s.minutes, 0),
    steps
  };
}

/** Quanti test prevede la sessione (per il riepilogo in Oggi). */
export function countTests(session) {
  let n = 0;
  for (const s of session.steps) {
    if (s.test) n++;
    if (s.maint?.test) n++;
  }
  return n;
}
