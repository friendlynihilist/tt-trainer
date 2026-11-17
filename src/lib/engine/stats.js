// Letture dei dati: cosa correggere, cosa migliora, quanto ci si allena.

import { BASE } from '../data/catalog.js';
import { STROKE_DRILLS } from '../data/taxonomy.js';
import { addDays, mondayOf, today } from '../util/dates.js';
import { byTime } from './levels.js';

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
 * Esercizi che allenano un colpo, al livello giusto per l'utente.
 * @returns id di esercizio (es. '1-2-3', '2-S')
 */
export function drillsFor(strokeId, tracks, catalog = BASE) {
  const out = [];
  // I colpi personali indicano i propri percorsi in `strokes`: si allenano lì, al livello raggiunto.
  for (const id of catalog.activeTrackIds) {
    const t = catalog.track(id);
    if (t.custom && t.strokes?.includes(strokeId)) out.push(`${id}-${tracks?.[id]?.level ?? 1}`);
  }
  for (const d of STROKE_DRILLS[strokeId] ?? []) {
    if (d.serve) {
      out.push(`${d.serve}-S`);
    } else {
      const current = tracks?.[d.track]?.level ?? 1;
      const level = d.level ?? Math.max(current, d.min ?? 1);
      out.push(`${d.track}-${level}`);
    }
  }
  return [...new Set(out)];
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

/** Punteggi dei test di un percorso, in ordine di tempo (esclusi i livelli impostati a mano). */
export function testSeries(trackState) {
  return trackState.history.filter((h) => h.score != null);
}

export function totals(events) {
  let minutes = 0;
  let tests = 0;
  let sum = 0;
  for (const e of events) {
    minutes += e.minutes ?? 0;
    for (const t of e.tests ?? []) {
      if (t.score != null && t.type !== 'placement') {
        tests++;
        sum += t.score;
      }
    }
  }
  const sessions = events.filter((e) => e.kind !== 'livello' && !e.planned).length;
  return { sessions, minutes, tests, average: tests ? sum / tests : null };
}

/** Attività per settimana nelle ultime `n` settimane (la più recente in fondo). */
export function weeklyActivity(events, n = 12) {
  const thisMonday = mondayOf(today());
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const monday = addDays(thisMonday, -7 * i);
    weeks.push({ monday, sunday: addDays(monday, 6), count: 0, minutes: 0 });
  }
  for (const e of events) {
    if (e.kind === 'livello' || e.planned) continue;
    const w = weeks.find((x) => e.date >= x.monday && e.date <= x.sunday);
    if (w) {
      w.count++;
      w.minutes += e.minutes ?? 0;
    }
  }
  return weeks;
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

/** Ciò che gli altri del gruppo vedono di te: solo livelli e ritmo, mai note o errori. */
export function publicSummary(tracks, events, plan, week) {
  const levels = {};
  // Si condividono i percorsi di base: quelli personali gli altri non li conoscono.
  for (const id of BASE.trackIds) if (tracks[id]?.started) levels[id] = tracks[id].level;
  const sessions = events.filter((e) => (e.kind === 'training' || e.kind === 'A' || e.kind === 'B') && !e.planned);
  const last = sessions.sort(byTime)[sessions.length - 1];
  return {
    levels,
    sessions: sessions.length,
    lastDate: last?.date ?? null,
    week: week?.number ?? null,
    block: week?.kind ?? null
  };
}

/** L'esercizio del compagno per un percorso, dal suo profilo pubblico. */
export function partnerExercise(profile, trackId, catalog = BASE) {
  const level = profile?.levels?.[trackId];
  const exercise = level ? catalog.level(trackId, level) : null;
  if (!exercise) return null;
  return { level, exercise, name: catalog.track(trackId).short };
}
