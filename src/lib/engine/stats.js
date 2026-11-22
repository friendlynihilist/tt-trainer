// Letture dei dati: cosa correggere, quanto ci si allena, i test di prima.

import { BASE } from '../data/catalog.js';
import { LIBRARY, LEVEL_IDS } from '../data/library.js';
import { addDays, addMonths, mondayOf, monthKey, today } from '../util/dates.js';
import { byTime } from './events.js';

/** L'ultima cosa «da correggere» segnata, guardando indietro al massimo `days` giorni. */
export function lastFocus(events, { before = null, days = 21 } = {}) {
  const limit = addDays(today(), -days);
  const list = events
    .filter((e) => e.focus?.stroke && e.date >= limit && (!before || e.date < before))
    .sort(byTime);
  const e = list[list.length - 1];
  return e ? { ...e.focus, date: e.date, eventId: e.id } : null;
}

/**
 * Gli esercizi che allenano un colpo: tutti, nessuno escluso. Il livello del giocatore decide
 * solo l'ordine (prima quelli più vicini al suo livello).
 */
export function drillsFor(strokeId, catalog = BASE, level = null) {
  const at = LEVEL_IDS.indexOf(level);
  const dist = (e) => (at < 0 || !e.level ? 0 : Math.abs(LEVEL_IDS.indexOf(e.level) - at));
  const list = catalog.activeExerciseIds.map((id) => catalog.exercise(id)).filter((e) => e.strokes?.includes(strokeId));
  const order = new Map(LIBRARY.map((e, i) => [e.id, i]));
  return list.sort((a, b) => dist(a) - dist(b) || (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999)).map((e) => e.id);
}

/** Tutte le segnalazioni (da correggere + note tecniche) in forma piatta. */
export function issues(events, { since = null } = {}) {
  const out = [];
  for (const e of events) {
    if (since && e.date < since) continue;
    if (e.focus?.stroke || e.focus?.error) {
      out.push({ date: e.date, eventId: e.id, stroke: e.focus.stroke ?? null, error: e.focus.error ?? null });
    }
    for (const o of e.obs ?? []) {
      if (o.stroke || o.error) {
        out.push({ date: e.date, eventId: e.id, stroke: o.stroke ?? null, error: o.error ?? null, ball: o.ball, zone: o.zone, phase: o.phase });
      }
    }
  }
  return out;
}

function tally(list, key) {
  const m = new Map();
  for (const x of list) {
    const k = x[key];
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}

export function weaknesses(events, opts) {
  const list = issues(events, opts);
  const strokes = tally(list, 'stroke').map((s) => ({
    ...s,
    errors: tally(list.filter((i) => i.stroke === s.id), 'error')
  }));
  return { total: list.length, strokes, errors: tally(list, 'error') };
}

/** Attività, minuti e tentativi. */
export function totals(events, attempts = []) {
  const done = events.filter((e) => e.kind !== 'livello' && !e.planned);
  return {
    sessions: done.length,
    minutes: done.reduce((n, e) => n + (e.minutes ?? 0), 0),
    attempts: attempts.length
  };
}

/** Quanti periodi mostra il grafico dell'andamento a ogni ingrandimento. */
export const SCALES = { day: 30, week: 12, month: 12 };

/**
 * Attività e minuti per periodo, il più recente in fondo: `scale` è 'day', 'week' o 'month'.
 * Ogni periodo ha `from` e `to` (date comprese), `count` e `minutes`.
 */
export function activity(events, scale = 'week', n = SCALES[scale], ref = today()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    let from, to;
    if (scale === 'day') from = to = addDays(ref, -i);
    else if (scale === 'month') {
      const key = addMonths(monthKey(ref), -i);
      const [y, m] = key.split('-').map(Number);
      from = `${key}-01`;
      to = `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    } else {
      from = addDays(mondayOf(ref), -7 * i);
      to = addDays(from, 6);
    }
    out.push({ from, to, count: 0, minutes: 0 });
  }
  for (const e of events) {
    if (e.kind === 'livello' || e.planned) continue;
    const p = out.find((x) => e.date >= x.from && e.date <= x.to);
    if (p) {
      p.count++;
      p.minutes += e.minutes ?? 0;
    }
  }
  return out;
}

/** Settimane di fila (fino a questa) con almeno un'attività. */
export function weekStreak(events) {
  const mondays = new Set(events.filter((e) => e.kind !== 'livello' && !e.planned).map((e) => mondayOf(e.date)));
  let monday = mondayOf(today());
  if (!mondays.has(monday)) monday = addDays(monday, -7); // la settimana in corso può essere ancora vuota
  let n = 0;
  while (mondays.has(monday)) {
    n++;
    monday = addDays(monday, -7);
  }
  return n;
}

/**
 * I test sui percorsi salvati con le versioni di prima, per percorso: [{ track, tests: [{ date,
 * level, score, type }] }]. Servono solo allo storico; i livelli dei percorsi non si calcolano più.
 */
export function legacyTests(events, catalog = BASE) {
  const by = new Map();
  for (const e of [...events].filter((x) => !x.planned).sort(byTime)) {
    for (const t of e.tests ?? []) {
      if (t.type === 'set' || t.score == null || !catalog.track(t.track)) continue;
      if (!by.has(t.track)) by.set(t.track, []);
      by.get(t.track).push({ date: e.date, eventId: e.id, level: t.level, score: t.score, type: t.type ?? 'test' });
    }
  }
  return [...by.entries()].map(([track, tests]) => ({ track, tests }));
}
