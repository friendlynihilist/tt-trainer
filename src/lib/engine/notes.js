// Le note per colpo: un diario libero per ogni colpo, senza la struttura dei test. Ogni nota sta in
// Firestore sotto users/{uid}/notes/{id} (in modalità locale nel browser) ed è solo tua.
//
// Una nota:
//   { id, stroke, family, date, text, feel, ex, eventId, createdAt, updatedAt }
//   · stroke: id del colpo (taxonomy.js o colpo tuo); family: la famiglia del colpo, salvata con la
//     nota così i grafici per famiglia (fase 5) non devono ricostruirla;
//   · feel: sensazione da 1 a 5, oppure null;
//   · ex, eventId: l'esercizio e l'allenamento in cui è nata, facoltativi.
// Queste funzioni non leggono lo stato dell'app: ricevono dati e restituiscono dati.

import { STROKE } from '../data/taxonomy.js';
import { byTime } from './events.js';

/** Quante note contano per la media della sensazione. */
export const FEEL_WINDOW = 5;

const clampFeel = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
};

/**
 * Una nota pronta da salvare: campi puliti, famiglia del colpo, date di creazione e modifica.
 * `strokes` sono i colpi disponibili (di base e tuoi), per trovare la famiglia.
 */
export function makeNote(input, { strokes = STROKE, now = Date.now() } = {}) {
  const stroke = input.stroke;
  const family = strokes[stroke]?.family ?? input.family ?? null;
  const note = {
    id: input.id,
    stroke,
    family,
    date: input.date,
    text: String(input.text ?? '').trim(),
    feel: clampFeel(input.feel),
    createdAt: input.createdAt ?? now,
    updatedAt: now
  };
  if (input.ex) note.ex = input.ex;
  if (input.eventId) note.eventId = input.eventId;
  return note;
}

/** Una nota ha senso se ha un colpo, una data e almeno il testo o la sensazione. */
export function isValidNote(n) {
  return Boolean(n?.stroke && n.date && (n.text?.trim() || clampFeel(n.feel)));
}

/** Dalla più recente alla più vecchia. */
export function newestFirst(notes) {
  return [...notes].sort((a, b) => byTime(b, a));
}

/** Le note di un colpo, dalla più recente. */
export function notesOf(notes, strokeId) {
  return newestFirst(notes.filter((n) => n.stroke === strokeId));
}

/**
 * La sensazione di un colpo: l'ultima data e la media delle ultime 5 (contano solo le note che ce
 * l'hanno). Null se nessuna nota ha la sensazione.
 */
export function feelSummary(notes, strokeId) {
  const withFeel = notesOf(notes, strokeId).filter((n) => clampFeel(n.feel));
  if (!withFeel.length) return null;
  const last = withFeel.slice(0, FEEL_WINDOW);
  const avg = last.reduce((s, n) => s + n.feel, 0) / last.length;
  return { last: withFeel[0].feel, lastDate: withFeel[0].date, avg: Math.round(avg * 10) / 10, count: last.length };
}

/** Le ultime note dei colpi che un esercizio allena (per la scheda dell'esercizio). */
export function notesForExercise(notes, exercise, max = 3) {
  const strokes = new Set(exercise?.strokes ?? []);
  return newestFirst(notes.filter((n) => strokes.has(n.stroke))).slice(0, max);
}

/**
 * Per i grafici (fase 5): un punto per ogni nota con la sensazione, in ordine di tempo.
 * Filtri facoltativi per colpo o per famiglia.
 */
export function feelSeries(notes, { stroke = null, family = null } = {}) {
  return [...notes]
    .filter((n) => clampFeel(n.feel) && (!stroke || n.stroke === stroke) && (!family || n.family === family))
    .sort(byTime)
    .map((n) => ({ date: n.date, stroke: n.stroke, family: n.family, feel: n.feel }));
}

/** «3,6» */
export function fmtFeel(v) {
  return v == null ? '' : String(v).replace('.', ',');
}
