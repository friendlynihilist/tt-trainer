// I tentativi: ogni misura fatta su un esercizio. Le voci della 0.3 li hanno nel campo `attempts`;
// quelle di prima avevano i test sui percorsi (`tests`) e i servizi (`serve`): si convertono qui,
// in lettura, senza riscrivere niente.
//
// Un tentativo: { ex, fmt, tries: [valore, …], tier?, marks?, q?, date, eventId, createdAt, legacy? }
// Il valore è un numero, oppure una lista di numeri per le misure con più parti.

import { BASE, legacyExercise, serveExercise } from '../data/catalog.js';
import { BLOCKS } from '../data/program.js';
import { byTime, serveScore } from './events.js';

/** La serie più lunga di palle buone nei segni di un test («1101111111» → 7). */
export function longestRun(marks) {
  let best = 0;
  let run = 0;
  for (const c of String(marks ?? '')) {
    if (c === '1') best = Math.max(best, ++run);
    else run = 0;
  }
  return best;
}

/**
 * Un test di un percorso (versioni di prima) → tentativo, oppure null.
 * Su n: il punteggio così com'è. Di fila: la serie più lunga nei segni; senza segni vale solo il 10 su 10.
 */
export function fromLegacyTest(t, catalog = BASE) {
  if (!t || t.type === 'set' || t.score == null) return null;
  const ex = catalog.exercise(legacyExercise(t.track, t.level, catalog));
  const type = ex?.measure?.type;
  let value = null;
  if (type === 'su') value = t.score;
  else if (type === 'fila') value = t.marks ? longestRun(t.marks) : t.score === 10 ? 10 : null;
  if (value == null) return null;
  return { ex: ex.id, fmt: type, tries: [value], legacy: { track: t.track, level: t.level, score: t.score, type: t.type ?? 'test' } };
}

/** Il punteggio dei servizi di una voce di prima → tentativo, oppure null. */
export function fromLegacyServe(e, catalog = BASE) {
  const score = serveScore(e);
  if (score == null) return null;
  const serveId = (typeof e.serve === 'object' ? e.serve?.id : null) ?? BLOCKS[e.block]?.serve?.id ?? null;
  const ex = catalog.exercise(serveExercise(serveId));
  if (!ex) return null;
  return { ex: ex.id, fmt: ex.measure.type, tries: [score], legacy: { serve: serveId, score } };
}

/** I tentativi di una voce del diario, nuovi e convertiti. */
export function attemptsOf(e, catalog = BASE) {
  if (!e) return [];
  const out = [];
  for (const a of e.attempts ?? []) if (a?.ex && Array.isArray(a.tries)) out.push({ ...a });
  for (const t of e.tests ?? []) {
    const a = fromLegacyTest(t, catalog);
    if (a) out.push(a);
  }
  const s = fromLegacyServe(e, catalog);
  if (s) out.push(s);
  return out.map((a) => ({ ...a, date: e.date, eventId: e.id, createdAt: e.createdAt ?? 0 }));
}

/** Tutti i tentativi, in ordine di tempo, esclusi gli appuntamenti previsti. */
export function allAttempts(events, catalog = BASE) {
  return events
    .filter((e) => !e.planned)
    .sort(byTime)
    .flatMap((e) => attemptsOf(e, catalog));
}

/** Un tentativo nuovo, pronto da salvare in una voce. Toglie i campi vuoti. */
export function makeAttempt({ ex, fmt, tries, tier = null, marks = null, q = null }) {
  const a = { ex, fmt, tries: tries.filter((v) => v != null) };
  if (tier) a.tier = tier;
  if (marks) a.marks = marks;
  if (q != null) a.q = q;
  return a;
}

// ── Sessioni dal vivo lasciate a metà con le versioni di prima ──────────────

/** I test già contati in una bozza di prima, nel formato di prima (si convertono in lettura). */
export function legacyDraftTests(draft) {
  const tests = [];
  const steps = draft?.session?.steps ?? [];
  const marks = (m) => (Array.isArray(m) ? m.join('') : (m ?? ''));
  for (const s of steps) {
    if (s.maint?.test && draft.tests?.maint?.score != null) {
      tests.push({ track: s.maint.track, type: 'maint', level: s.maint.level, score: draft.tests.maint.score });
    }
    if (s.kind !== 'exercise' || !s.track || s.ex) continue;
    if (s.placement) {
      const p = draft.placement?.[s.track];
      if (p?.set) tests.push({ track: s.track, type: 'set', level: p.set });
      else for (const t of p?.tries ?? []) if (t.score != null) tests.push({ track: s.track, type: 'placement', level: t.level, score: t.score, marks: marks(t.marks) });
    } else if (s.test && draft.tests?.[s.track]?.score != null) {
      const t = draft.tests[s.track];
      tests.push({ track: s.track, type: s.maintTest ? 'maint' : 'test', level: s.level, score: t.score, marks: marks(t.marks) });
    }
  }
  const served = steps.some((s) => s.kind === 'serve' && s.test);
  const serve = served && draft.tests?.serve?.score != null ? { id: draft.session?.block?.serve?.id ?? null, score: draft.tests.serve.score } : null;
  return { tests, serve };
}

/**
 * Una bozza della sessione dal vivo salvata con le versioni di prima → bozza nuova. I passi
 * diventano esercizi della libreria; i test già contati restano da parte (`legacyTests`) e alla
 * fine si salvano come test di prima, così valgono come tutti gli altri. Una bozza nuova non cambia.
 */
export function upgradeDraft(draft, catalog = BASE) {
  if (!draft || draft.version >= 3) return draft;
  const legacy = legacyDraftTests(draft);
  const steps = (draft.session?.steps ?? []).map((s) => {
    const { test: _t, placement: _p, asked: _a, maintTest: _m, level: _l, exercise: _e, max: _x, ...rest } = s;
    if (s.kind === 'exercise' && s.track && !s.ex) {
      const ex = catalog.exercise(legacyExercise(s.track, s.level ?? 1, catalog));
      return ex ? { ...rest, ex: ex.id, name: ex.name } : { ...rest, kind: 'free', text: '' };
    }
    if (s.kind === 'serve') return { ...rest, ex: s.ex ?? serveExercise(s.serve) };
    if (s.kind === 'warmup' && s.maint) {
      const ex = legacyExercise(s.maint.track, s.maint.level ?? 1, catalog);
      return { ...rest, maint: ex ? { track: s.maint.track, ex, name: catalog.exercise(ex).name, minutes: s.maint.minutes } : null };
    }
    return rest;
  });
  const { tests: _tests, placement: _placement, ...keep } = draft;
  return {
    ...keep,
    version: 3,
    attempts: {},
    legacyTests: legacy.tests.length || legacy.serve ? legacy : null,
    session: { ...draft.session, steps, exercises: [] }
  };
}
