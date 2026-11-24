// Le note: un testo, una data, e la cosa a cui è legata. Ogni nota sta in Firestore sotto
// users/{uid}/notes/{id} (in modalità locale nel browser) ed è solo tua.
//
// Una nota:
//   { id, brick, stroke, family, date, text, feel, ex, eventId, createdAt, updatedAt }
//   · brick: il fondamentale (Dritto, Servizio…) scelto scrivendola, oppure null;
//   · stroke: il colpo preciso (taxonomy.js o colpo tuo), quando si sa: una nota nata da un
//     esercizio o dalla scheda di un colpo ce l'ha, una scritta dal Diario ha solo il fondamentale.
//     family: la famiglia del colpo, salvata con la nota;
//   · una nota senza fondamentale e senza colpo non è su un colpo: sta in «Tornei e altro»;
//   · feel: sensazione da 1 a 5, oppure null (solo per le note sui colpi);
//   · ex, eventId: l'esercizio e la voce del diario (allenamento, torneo…) in cui è nata, facoltativi.
//
// Si leggono tutte in un posto solo (Diario → Note), in due gruppi: «Colpi» (hanno un fondamentale
// o un colpo) e «Tornei e altro» (non ce l'hanno). Nello stesso elenco entrano anche i testi rimasti dentro le
// voci del diario scritte prima della 0.10: gli appunti, il «da correggere» e le note tecniche
// (allNotes). Quelli non si spostano: restano nella voce, e da lì si aprono.
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
  const stroke = input.stroke || null;
  const family = stroke ? (strokes[stroke]?.family ?? input.family ?? null) : null;
  const brick = input.brick || null;
  const note = {
    id: input.id,
    stroke,
    family,
    date: input.date,
    text: String(input.text ?? '').trim(),
    feel: stroke || brick ? clampFeel(input.feel) : null,
    createdAt: input.createdAt ?? now,
    updatedAt: now
  };
  if (brick) note.brick = brick;
  if (input.ex) note.ex = input.ex;
  if (input.eventId) note.eventId = input.eventId;
  return note;
}

/** È una nota su un colpo? Ha un fondamentale o un colpo preciso. */
export const onStroke = (n) => Boolean(n?.stroke || n?.brick);

/** Una nota ha senso se ha una data e il testo; su un colpo basta anche solo la sensazione. */
export function isValidNote(n) {
  return Boolean(n?.date && (n.text?.trim() || ((n.stroke || n.brick) && clampFeel(n.feel))));
}

/** I due gruppi delle note. */
export const NOTE_GROUPS = [
  { id: 'colpi', name: 'Colpi' },
  { id: 'altro', name: 'Tornei e altro' }
];

/**
 * Tutte le note in un elenco solo, dalla più recente: quelle scritte come note e i testi rimasti
 * nelle voci del diario (appunti, «da correggere», note tecniche). Ogni riga:
 *   { key, source, id, eventId, date, createdAt, stroke, brick, group, text, feel }
 *   · source: 'note' (si apre e si modifica come nota) oppure 'event', 'focus', 'obs' (si apre la voce);
 *   · group: 'colpi' se ha un fondamentale o un colpo, altrimenti 'altro'.
 * `describe` scrive il testo di «da correggere» e delle note tecniche: (parti) → stringa.
 */
export function allNotes(notes = [], events = [], describe = () => '') {
  const out = [];
  for (const n of notes) {
    out.push({ key: `n:${n.id}`, source: 'note', id: n.id, eventId: n.eventId ?? null, date: n.date, createdAt: n.createdAt ?? 0, stroke: n.stroke || null, brick: n.brick || null, group: onStroke(n) ? 'colpi' : 'altro', text: n.text ?? '', feel: n.feel ?? null, ex: n.ex ?? null });
  }
  for (const e of events) {
    if (e.planned || e.kind === 'livello') continue;
    const at = { eventId: e.id, date: e.date, createdAt: e.createdAt ?? 0, id: null, brick: null, feel: null, ex: null };
    if (e.note?.trim()) out.push({ ...at, key: `e:${e.id}`, source: 'event', stroke: null, group: 'altro', text: e.note.trim() });
    if (e.focus?.stroke || e.focus?.error) {
      const text = describe({ kind: 'focus', ...e.focus });
      if (text || e.focus.stroke) out.push({ ...at, key: `f:${e.id}`, source: 'focus', stroke: e.focus.stroke ?? null, group: e.focus.stroke ? 'colpi' : 'altro', text, ex: e.focus.exercise ?? null });
    }
    (e.obs ?? []).forEach((o, i) => {
      const text = describe({ kind: 'obs', ...o });
      if (text || o.stroke) out.push({ ...at, key: `o:${e.id}:${i}`, source: 'obs', stroke: o.stroke ?? null, group: o.stroke ? 'colpi' : 'altro', text, ex: o.exercise ?? null });
    });
  }
  return newestFirst(out);
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
