// Il piano: una sequenza di settimane a partire da un lunedì, e un ritmo settimanale.
//
// · weeks: per ogni settimana l'id del mese (blocco) che si allena, oppure 'P' (pausa).
//   I mesi di base sono '1' | '2' | '3' | 'R' (recupero); quelli personali hanno id «c…».
// · slots: il ritmo, quanti appuntamenti si vuole: [{ id, day: 1..7, kind: 'training' | 'test', template }].
//   Più appuntamenti nello stesso giorno vanno bene.
// · skip: gli appuntamenti tolti o spostati a mano (chiave dell'occorrenza).
//
// Le sessioni si agganciano alle settimane per data: nessun indice salvato, quindi inserire
// una pausa sposta in avanti solo il futuro.
//
// Il primo formato del piano aveva due giorni fissi, { days: { A, B } }: normalizePlan lo legge
// così com'è (A e B diventano due allenamenti, con il test nel giorno di B) senza riscriverlo.

import { CYCLE_BLOCKS, WEEKS_PER_BLOCK, GATE } from '../data/program.js';
import { BASE } from '../data/catalog.js';
import { DEFAULT_TEMPLATE, LEGACY_TEMPLATE } from '../data/templates.js';
import { addDays, diffDays, mondayOf, today } from '../util/dates.js';

export const DEFAULT_DAYS = [2, 5];

export function sortSlots(slots) {
  const order = { test: 0, training: 1 };
  return [...slots].sort((a, b) => a.day - b.day || (order[a.kind] ?? 2) - (order[b.kind] ?? 2));
}

/** Un allenamento per ogni giorno scelto, e il test nell'ultimo giorno della settimana. */
export function defaultSlots(days = DEFAULT_DAYS, template = DEFAULT_TEMPLATE) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const slots = sorted.map((day) => ({ id: `t${day}`, day, kind: 'training', template }));
  if (sorted.length) slots.push({ id: 'x', day: sorted[sorted.length - 1], kind: 'test' });
  return sortSlots(slots);
}

export function createPlan({ start, days = DEFAULT_DAYS, months = CYCLE_BLOCKS, weeksPerMonth = WEEKS_PER_BLOCK, slots = null }) {
  const weeks = [];
  for (const m of months) for (let i = 0; i < weeksPerMonth; i++) weeks.push(m);
  return {
    id: `p${Date.now().toString(36)}`,
    start: mondayOf(start),
    weeks,
    slots: sortSlots(slots ?? defaultSlots(days)),
    skip: [],
    gateOk: false,
    createdAt: Date.now()
  };
}

/** Il piano com'è salvato → il piano come lo usa l'app. Non modifica l'originale. */
export function normalizePlan(plan) {
  if (!plan || !plan.start || !Array.isArray(plan.weeks)) return null;
  let slots = Array.isArray(plan.slots) ? plan.slots.filter((s) => s && s.day >= 1 && s.day <= 7) : null;
  if (!slots && plan.days) {
    const a = Math.min(plan.days.A, plan.days.B);
    const b = Math.max(plan.days.A, plan.days.B);
    slots = [
      { id: 'A', day: a, kind: 'training', template: LEGACY_TEMPLATE },
      { id: 'B', day: b, kind: 'training', template: LEGACY_TEMPLATE },
      { id: 'B-test', day: b, kind: 'test' }
    ];
  }
  return { ...plan, slots: sortSlots(slots ?? []), skip: Array.isArray(plan.skip) ? plan.skip : [], gateOk: Boolean(plan.gateOk) };
}

export function weekIndex(plan, date = today()) {
  return Math.floor(diffDays(plan.start, date) / 7);
}

export function isPause(kind) {
  return kind === 'P';
}

/** Le settimane «numerate» del ciclo: tutto tranne pause e recupero. */
export function isCycleKind(kind) {
  return kind !== 'P' && kind !== 'R';
}

/** Tutto ciò che serve sapere di una settimana del piano. `null` fuori dal piano. */
export function weekAt(plan, idx, catalog = BASE) {
  if (!plan || idx < 0 || idx >= plan.weeks.length) return null;
  const kind = plan.weeks[idx];
  const monday = addDays(plan.start, idx * 7);
  let number = 0;
  for (let i = 0; i <= idx; i++) if (isCycleKind(plan.weeks[i])) number++;
  const total = plan.weeks.filter(isCycleKind).length;
  const block = isPause(kind) ? null : (catalog.block(kind) ?? null);
  return {
    idx,
    kind,
    block,
    // Anche in pausa (o con un mese cancellato) ci si può allenare: si usa il mese più vicino.
    focusBlock: block ?? nearestBlock(plan, idx, catalog),
    monday,
    sunday: addDays(monday, 6),
    number: isCycleKind(kind) ? number : null,
    total,
    firstOfBlock: plan.weeks.indexOf(kind) === idx,
    lastOfBlock: plan.weeks.lastIndexOf(kind) === idx
  };
}

function nearestBlock(plan, idx, catalog) {
  for (let d = 1; d < plan.weeks.length; d++) {
    for (const i of [idx - d, idx + d]) {
      const b = i >= 0 && i < plan.weeks.length && !isPause(plan.weeks[i]) ? catalog.block(plan.weeks[i]) : null;
      if (b) return b;
    }
  }
  return catalog.block('1');
}

export function allWeeks(plan, catalog = BASE) {
  return plan ? plan.weeks.map((_, i) => weekAt(plan, i, catalog)) : [];
}

/** La settimana di una data; prima del piano la prima, dopo l'ultima. Senza piano null. */
export function weekFor(plan, date, catalog = BASE) {
  if (!plan) return null;
  const idx = Math.max(0, Math.min(plan.weeks.length - 1, weekIndex(plan, date)));
  return weekAt(plan, idx, catalog);
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

export function occurrenceKey(plan, date, slot) {
  return `${plan.id}:${date}:${slot.id}`;
}

/**
 * Il ritmo valido in una settimana. Cambiarlo a piano iniziato non riscrive il passato:
 * il ritmo vecchio resta in `pastSlots` con la data fino a cui valeva.
 */
export function slotsFor(plan, monday) {
  for (const r of [...(plan.pastSlots ?? [])].sort((a, b) => (a.until < b.until ? -1 : 1))) {
    if (monday <= r.until) return r.slots;
  }
  return plan.slots;
}

/** Il piano con un ritmo nuovo da questa settimana in poi. */
export function withSlots(plan, slots, date = today()) {
  const thisMonday = mondayOf(date);
  if (thisMonday <= plan.start) return { ...plan, slots };
  const until = addDays(thisMonday, -1);
  const past = plan.pastSlots ?? [];
  // Già cambiato questa settimana: il ritmo «di prima» è quello salvato allora.
  const kept = past.some((r) => r.until === until) ? past : [...past, { until, slots: plan.slots }];
  return { ...plan, slots, pastSlots: kept };
}

/** Gli appuntamenti del ritmo in una settimana (tolti quelli saltati o spostati). */
export function weekOccurrences(plan, week) {
  if (!week || isPause(week.kind)) return [];
  const skip = new Set(plan.skip ?? []);
  return sortSlots(slotsFor(plan, week.monday))
    .map((slot) => {
      const date = addDays(week.monday, slot.day - 1);
      return { key: occurrenceKey(plan, date, slot), date, slot, kind: slot.kind, template: slot.template ?? null, week };
    })
    .filter((o) => !skip.has(o.key));
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
    level: tracks[id]?.started ? tracks[id].level : 0,
    ok: Boolean(tracks[id]?.started && tracks[id].level >= GATE.minLevel)
  }));
  return { ok: items.every((i) => i.ok), items, minLevel: GATE.minLevel };
}

/**
 * Va chiesto cosa fare con il mese 3? Sì se la settimana corrente è del mese 3, il cancello
 * non è superato, non si è già deciso di cominciare comunque e nel mese 3 non ci si è ancora
 * allenati.
 */
export function gatePending(plan, week, tracks, events) {
  if (!week || week.kind !== GATE.block || plan.gateOk) return false;
  if (gateStatus(tracks).ok) return false;
  const firstIdx = plan.weeks.indexOf(GATE.block);
  const from = addDays(plan.start, firstIdx * 7);
  return !events.some((e) => e.kind === 'training' && e.date >= from && e.planId === plan.id);
}
