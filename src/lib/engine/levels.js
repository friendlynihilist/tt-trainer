// Motore dei livelli. Il livello di ogni percorso non è mai salvato: si ricalcola ogni volta
// dalla storia dei test. Così correggere una sessione passata rimette tutto in ordine da solo,
// e non esiste un "livello sbagliato" rimasto in giro.
//
// Regola (identica al foglio Diario):
//   · si sale con due test di fila allo stesso livello con punteggio >= up
//   · si scende con un solo test <= down (mai sotto il livello 1)
//   · al livello 5, due test di fila >= up danno «Completato»

import { LEVELS, TRACK_IDS } from '../data/program.js';

export const DEFAULT_RULES = { up: 8, down: 4 };

/** Ordine cronologico stabile: data, poi momento di creazione. */
export function byTime(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return (a.createdAt ?? 0) - (b.createdAt ?? 0);
}

function fresh(id) {
  return {
    id,
    level: 1,
    started: false, // true dopo il test di partenza, un test o un livello impostato a mano
    streak: 0, // test di fila >= up al livello attuale (0 o 1)
    completed: false,
    last: null, // ultimo test valutato
    history: []
  };
}

/**
 * Esito di un test al livello `level` con punteggio `score`, dato lo stato del percorso.
 * Non modifica nulla: serve anche per l'anteprima durante la sessione.
 */
export function judge(state, level, score, rules = DEFAULT_RULES) {
  const streak = state.started && state.level === level ? state.streak : 0;
  if (score <= rules.down && level > 1) {
    return { outcome: 'scendi', after: level - 1, streak: 0, completed: false };
  }
  if (score >= rules.up) {
    if (streak >= 1) {
      if (level >= LEVELS) return { outcome: 'completato', after: LEVELS, streak: 1, completed: true };
      return { outcome: 'sali', after: level + 1, streak: 0, completed: false };
    }
    return { outcome: 'resta', after: level, streak: 1, completed: state.completed && level >= LEVELS };
  }
  return { outcome: 'resta', after: level, streak: 0, completed: state.completed && level >= LEVELS };
}

function apply(state, t, ev, rules) {
  const entry = { eventId: ev.id, date: ev.date, type: t.type ?? 'test', level: t.level, score: t.score ?? null };

  if (entry.type === 'set') {
    state.level = clamp(t.level);
    state.streak = 0;
    state.completed = false;
    entry.outcome = 'manuale';
  } else if (entry.type === 'placement') {
    // Test di partenza: con >= up si prova il livello dopo; il primo sotto soglia è la partenza.
    const passed = t.score >= rules.up;
    state.level = clamp(passed ? t.level + 1 : t.level);
    state.streak = 0;
    state.completed = false;
    entry.outcome = 'partenza';
    entry.passed = passed;
  } else {
    const r = judge(state, clamp(t.level), t.score, rules);
    state.level = r.after;
    state.streak = r.streak;
    state.completed = r.completed;
    entry.outcome = r.outcome;
    state.last = entry;
  }
  entry.after = state.level;
  state.started = true;
  state.history.push(entry);
}

function clamp(n) {
  return Math.max(1, Math.min(LEVELS, Math.round(Number(n) || 1)));
}

/**
 * Stato di tutti i percorsi.
 * @param events  tutte le attività dell'utente
 * @param rules   soglie { up, down }
 * @param opts    { before: 'YYYY-MM-DD' } considera solo ciò che viene prima di quella data;
 *                { exclude: id } ignora un'attività (quando la si sta modificando)
 */
export function computeTracks(events, rules = DEFAULT_RULES, opts = {}) {
  const state = {};
  for (const id of TRACK_IDS) state[id] = fresh(id);

  const list = events
    .filter((e) => e.tests?.length)
    .filter((e) => (opts.exclude ? e.id !== opts.exclude : true))
    .filter((e) => (opts.before ? e.date < opts.before : true))
    .sort(byTime);

  for (const ev of list) {
    for (const t of ev.tests) {
      const st = state[t.track];
      if (st) apply(st, t, ev, rules);
    }
  }
  return state;
}

/** Quanti test >= up mancano per salire (o completare) dal livello attuale. */
export function testsToClimb(state) {
  return state.streak >= 1 ? 1 : 2;
}

export const OUTCOME = {
  sali: { label: 'Sali', tone: 'up' },
  completato: { label: 'Completato', tone: 'up' },
  resta: { label: 'Resta', tone: 'stay' },
  scendi: { label: 'Scendi', tone: 'down' },
  partenza: { label: 'Partenza', tone: 'stay' },
  manuale: { label: 'Impostato', tone: 'stay' }
};

/** Il livello di partenza che risulta da una sequenza di test di partenza [{level, score}]. */
export function placementResult(attempts, rules = DEFAULT_RULES) {
  let level = 1;
  for (const a of attempts) {
    if (a.score >= rules.up) level = clamp(a.level + 1);
    else return { level: a.level, done: true };
  }
  const lastLevel = attempts.length ? attempts[attempts.length - 1].level : 0;
  return { level, done: lastLevel >= LEVELS };
}
