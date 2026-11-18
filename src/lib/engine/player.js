// Il livello del giocatore e le proposte. Il livello lo sceglie il giocatore; l'app gli propone
// il livello dopo con la regola della sezione 6.3 della ricerca, e decide solo cosa proporre.
// Niente qui nasconde o blocca un esercizio: tutti restano sempre disponibili.

import { KEY_SLOTS, LEVEL_IDS, DEFAULT_LEVEL, TIER } from '../data/library.js';
import { BASE } from '../data/catalog.js';
import { diffDays, today as todayIso } from '../util/dates.js';
import { byTime } from './events.js';
import { dayValues, reaches, nextGoal, closeness } from './medals.js';

export const COVERAGE = 0.75;
export const SOLIDITY = 0.4;
export const MIN_SESSIONS = 4;
export const MIN_SPAN = 14;
export const RETRY_DAYS = 21;
export const RETRY_GOLDS = 3;
export const NEAR = 0.8;

/** Il livello salvato → quello che usa l'app. Senza scelta: principiante. */
export function normalizePlayer(p) {
  const chosen = LEVEL_IDS.includes(p?.level);
  return {
    level: chosen ? p.level : DEFAULT_LEVEL,
    chosen,
    since: p?.since ?? null,
    history: Array.isArray(p?.history) ? p.history : [],
    declined: p?.declined?.level ? p.declined : null
  };
}

export function nextLevel(level) {
  const i = LEVEL_IDS.indexOf(level);
  return i >= 0 && i < LEVEL_IDS.length - 1 ? LEVEL_IDS[i + 1] : null;
}

/**
 * A che punto sei verso il livello dopo (regola 6.3).
 *   1. copertura: argento nel 75% dei posti chiave e in ogni famiglia dei posti chiave;
 *   2. solidità: oro nel 40% dei posti chiave;
 *   3. costanza: almeno 4 sedute con un tentativo da argento su un esercizio chiave, distribuite
 *      su almeno 14 giorni.
 */
export function levelProgress({ level, medals = {}, attempts = [], catalog = BASE }) {
  const slots = (KEY_SLOTS[level] ?? []).map((ids) => ({
    ids,
    families: [...new Set(ids.map((id) => catalog.exercise(id)?.family).filter(Boolean))],
    A: ids.some((id) => medals[id]?.A),
    O: ids.some((id) => medals[id]?.O)
  }));
  const total = slots.length;
  const families = [...new Set(slots.flatMap((s) => s.families))];
  const missing = families.filter((f) => !slots.some((s) => s.A && s.families.includes(f)));

  const days = new Set();
  for (const id of new Set(slots.flatMap((s) => s.ids))) {
    const ex = catalog.exercise(id);
    const goal = ex?.goals?.A;
    if (goal == null) continue;
    for (const [d, v] of dayValues(ex, attempts.filter((a) => a.ex === id && !a.tier))) if (reaches(v, goal)) days.add(d);
  }
  const sorted = [...days].sort();
  const span = sorted.length ? diffDays(sorted[0], sorted[sorted.length - 1]) : 0;

  const coverage = { have: slots.filter((s) => s.A).length, need: Math.ceil(COVERAGE * total), total, missing };
  coverage.ok = total > 0 && coverage.have >= coverage.need && !missing.length;
  const solidity = { have: slots.filter((s) => s.O).length, need: Math.ceil(SOLIDITY * total), total };
  solidity.ok = total > 0 && solidity.have >= solidity.need;
  const consistency = { sessions: sorted.length, need: MIN_SESSIONS, span, needSpan: MIN_SPAN };
  consistency.ok = sorted.length >= MIN_SESSIONS && span >= MIN_SPAN;

  const next = nextLevel(level);
  return { level, next, slots, coverage, solidity, consistency, ready: Boolean(next) && coverage.ok && solidity.ok && consistency.ok };
}

/**
 * Il livello da proporre, oppure null. Dopo un rifiuto la proposta torna dopo 21 giorni oppure
 * dopo 3 nuovi ori su esercizi del livello attuale, quello che arriva prima.
 */
export function suggestLevel({ player, medals = {}, attempts = [], catalog = BASE, today = todayIso() }) {
  const p = normalizePlayer(player);
  const progress = levelProgress({ level: p.level, medals, attempts, catalog });
  if (!progress.ready) return null;
  const d = p.declined;
  if (d && d.level === progress.next) {
    const days = diffDays(d.date, today);
    const golds = Object.entries(medals).filter(([id, m]) => m.O && m.O > d.date && catalog.exercise(id)?.level === p.level).length;
    if (days < RETRY_DAYS && golds < RETRY_GOLDS) return null;
  }
  return { level: progress.next, progress };
}

/** L'esercizio da proporre in un percorso: il primo della sequenza senza argento. */
export function currentInSequence(trackId, catalog = BASE, medals = {}) {
  const seq = catalog.sequence(trackId);
  if (!seq.length) return null;
  return seq.find((id) => !medals[id]?.A) ?? seq.find((id) => !medals[id]?.O) ?? seq[seq.length - 1];
}

/** Gli obiettivi vicini: il record è almeno all'80% del prossimo gradino. I più vicini prima. */
export function nearGoals({ medals = {}, catalog = BASE, max = 3 }) {
  return Object.entries(medals)
    .map(([id, m]) => {
      const ex = catalog.exercise(id);
      return { ex: id, goal: nextGoal(ex, m), c: ex ? closeness(ex, m) : 0 };
    })
    .filter((x) => x.goal && x.c >= NEAR && x.c < 1)
    .sort((a, b) => b.c - a.c)
    .slice(0, max);
}

/** Quante volte ogni esercizio è stato fatto dopo la sua ultima misura. */
function trainedSince(events, medals) {
  const out = {};
  for (const e of [...events].filter((x) => !x.planned).sort(byTime)) {
    for (const id of e.exercises ?? []) {
      const last = medals[id]?.lastDate;
      if (!last || e.date > last) out[id] = (out[id] ?? 0) + 1;
    }
  }
  return out;
}

/**
 * Gli esercizi da mettere in un test, ognuno con il motivo. È solo una proposta: nel test si
 * può aggiungere qualsiasi esercizio.
 */
export function testProposal({ catalog = BASE, week = null, medals = {}, events = [], level = DEFAULT_LEVEL, max = 5 }) {
  const out = [];
  const add = (id, reason) => {
    const ex = catalog.exercise(id);
    if (!ex?.measure || !Object.keys(ex.goals ?? {}).length || out.length >= max || out.some((o) => o.ex === id)) return;
    out.push({ ex: id, reason });
  };
  for (const t of week?.focusBlock?.tracks ?? []) add(currentInSequence(t, catalog, medals), 'Esercizio del mese');
  for (const [id, m] of Object.entries(medals)) if (m.half && !m.O) add(id, 'Metà oro: serve un’altra seduta');
  for (const n of nearGoals({ medals, catalog, max: 10 })) add(n.ex, `Vicino ${TIER[n.goal.tier].to}`);
  for (const [id, n] of Object.entries(trainedSince(events, medals)).sort((a, b) => b[1] - a[1])) {
    if (n >= 2) add(id, `Fatto ${n} volte senza misurarlo`);
  }
  for (const [id, m] of Object.entries(medals)) if (m.stale) add(id, 'Da ripassare');
  for (const ids of KEY_SLOTS[level] ?? []) if (!ids.some((id) => medals[id]?.B)) add(ids[0], 'Esercizio chiave del tuo livello');
  return out;
}
