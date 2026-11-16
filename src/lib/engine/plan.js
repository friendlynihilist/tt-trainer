// Il piano: una sequenza di settimane a partire da un lunedì.
// Ogni settimana ha un tipo: '1' | '2' | '3' (i mesi del ciclo), 'R' (recupero), 'P' (pausa).
// Le sessioni si agganciano alle settimane per data: nessun indice salvato, quindi inserire
// una pausa sposta in avanti solo il futuro.

import { BLOCKS, CYCLE_BLOCKS, WEEKS_PER_BLOCK, GATE } from '../data/program.js';
import { addDays, diffDays, mondayOf, today } from '../util/dates.js';

export function createPlan({ start, days }) {
  const weeks = [];
  for (const b of CYCLE_BLOCKS) for (let i = 0; i < WEEKS_PER_BLOCK; i++) weeks.push(b);
  const [a, b] = [days.A, days.B].sort((x, y) => x - y);
  return {
    id: `p${Date.now().toString(36)}`,
    start: mondayOf(start),
    days: { A: a, B: b },
    weeks,
    gateOk: false,
    createdAt: Date.now()
  };
}

export function weekIndex(plan, date = today()) {
  return Math.floor(diffDays(plan.start, date) / 7);
}

export function isCycleKind(kind) {
  return kind === '1' || kind === '2' || kind === '3';
}

/** Tutto ciò che serve sapere di una settimana del piano. `null` fuori dal piano. */
export function weekAt(plan, idx) {
  if (!plan || idx < 0 || idx >= plan.weeks.length) return null;
  const kind = plan.weeks[idx];
  const monday = addDays(plan.start, idx * 7);
  let number = 0;
  for (let i = 0; i <= idx; i++) if (isCycleKind(plan.weeks[i])) number++;
  const total = plan.weeks.filter(isCycleKind).length;
  return {
    idx,
    kind,
    block: kind === 'P' ? null : BLOCKS[kind],
    monday,
    sunday: addDays(monday, 6),
    number: isCycleKind(kind) ? number : null,
    total,
    firstOfBlock: plan.weeks.indexOf(kind) === idx,
    lastOfBlock: plan.weeks.lastIndexOf(kind) === idx,
    dates: kind === 'P' ? null : { A: addDays(monday, plan.days.A - 1), B: addDays(monday, plan.days.B - 1) }
  };
}

export function allWeeks(plan) {
  return plan ? plan.weeks.map((_, i) => weekAt(plan, i)) : [];
}

export function planEnd(plan) {
  return addDays(plan.start, plan.weeks.length * 7 - 1);
}

/** 'before' | 'active' | 'done' */
export function planPhase(plan, date = today()) {
  const idx = weekIndex(plan, date);
  if (idx < 0) return 'before';
  if (idx >= plan.weeks.length) return 'done';
  return 'active';
}

/** Le sessioni del ciclo (A/B) registrate nella settimana. */
export function weekSessions(events, week) {
  const out = { A: null, B: null, all: [] };
  if (!week) return out;
  for (const e of events) {
    if ((e.kind === 'A' || e.kind === 'B') && e.date >= week.monday && e.date <= week.sunday) {
      out.all.push(e);
      if (!out[e.kind]) out[e.kind] = e;
    }
  }
  return out;
}

/** Quale sessione tocca adesso nella settimana: 'A', 'B' oppure null se è completa. */
export function nextSlot(events, week) {
  if (!week || week.kind === 'P') return null;
  const s = weekSessions(events, week);
  if (s.B) return null;
  return s.A ? 'B' : 'A';
}

/** Sessioni previste dal piano in un intervallo di date. */
export function plannedBetween(plan, from, to) {
  const out = [];
  if (!plan) return out;
  const first = Math.max(0, weekIndex(plan, from));
  const last = Math.min(plan.weeks.length - 1, weekIndex(plan, to));
  for (let i = first; i <= last; i++) {
    const w = weekAt(plan, i);
    if (!w.dates) continue;
    for (const slot of ['A', 'B']) {
      const date = w.dates[slot];
      if (date >= from && date <= to) out.push({ slot, date, week: w });
    }
  }
  return out;
}

export function insertWeek(plan, idx, kind) {
  const weeks = [...plan.weeks];
  weeks.splice(idx, 0, kind);
  return { ...plan, weeks };
}

export function removeWeek(plan, idx) {
  const kind = plan.weeks[idx];
  if (kind !== 'P' && kind !== 'R') return plan;
  const weeks = [...plan.weeks];
  weeks.splice(idx, 1);
  return { ...plan, weeks };
}

/** Il mese 3 è sbloccato? */
export function gateStatus(tracks) {
  const items = GATE.tracks.map((id) => ({
    track: id,
    level: tracks[id].started ? tracks[id].level : 0,
    ok: tracks[id].started && tracks[id].level >= GATE.minLevel
  }));
  return { ok: items.every((i) => i.ok), items, minLevel: GATE.minLevel };
}

/**
 * Va chiesto cosa fare con il mese 3? Sì se la settimana corrente è del mese 3, il cancello
 * non è superato, non si è già deciso di cominciare comunque e nel mese 3 non si è ancora
 * fatta nessuna sessione.
 */
export function gatePending(plan, week, tracks, events) {
  if (!week || week.kind !== GATE.block || plan.gateOk) return false;
  if (gateStatus(tracks).ok) return false;
  const firstIdx = plan.weeks.indexOf(GATE.block);
  const from = addDays(plan.start, firstIdx * 7);
  return !events.some((e) => (e.kind === 'A' || e.kind === 'B') && e.date >= from && e.planId === plan.id);
}
