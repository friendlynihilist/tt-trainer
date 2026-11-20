// Le voci del diario e l'agenda.
//
// Una voce è un'attività fatta ({ kind, date, … }) oppure prevista ({ …, planned: true }).
// Tipi: 'training' (con il modello in `template`), 'test', le attività libere, 'livello'.
// Dalla 0.3 le misure sono tentativi sugli esercizi (`attempts`, vedi attempts.js); le voci di
// prima tengono i loro test sui percorsi (`tests`) e si leggono così come sono.
//
// Le prime versioni salvavano «Sessione A» e «Sessione B» (kind 'A' | 'B'). Non si riscrivono:
// normalizeEvent le legge come allenamenti completi; quelle B avevano il test dentro.

import { BLOCKS } from '../data/program.js';
import { KIND } from '../data/taxonomy.js';
import { BASE } from '../data/catalog.js';
import { LEGACY_TEMPLATE } from '../data/templates.js';
import { weekAt, weekIndex, weekOccurrences, themedWeek } from './plan.js';

/** Ordine cronologico stabile: data, poi momento di creazione. */
export function byTime(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return (a.createdAt ?? 0) - (b.createdAt ?? 0);
}

export function normalizeEvent(e) {
  if (!e || (e.kind !== 'A' && e.kind !== 'B')) return e;
  return {
    ...e,
    kind: 'training',
    template: e.template ?? LEGACY_TEMPLATE,
    legacy: e.legacy ?? e.kind,
    withTest: e.withTest ?? e.kind === 'B',
    trained: e.trained ?? BLOCKS[e.block]?.tracks ?? []
  };
}

/** Test veri (non il livello impostato a mano). */
export function realTests(e) {
  return (e?.tests ?? []).filter((t) => t.type !== 'set');
}

/**
 * Il punteggio dei servizi salvato in una voce, o null. Le voci salvate finora hanno
 * `serve: { id, score }` oppure `serve: null`; si legge anche un numero da solo.
 */
export function serveScore(e) {
  const v = e?.serve;
  if (v == null) return null;
  const n = typeof v === 'object' ? v.score : v;
  return Number.isFinite(n) ? n : null;
}

/**
 * Questa voce vale come «test fatto» per un test in calendario? Dalla 0.3 solo un test; le voci di
 * prima con il test dentro l'allenamento (`withTest`) valgono ancora, così il passato non cambia.
 */
export function fulfillsTest(e) {
  if (!e || e.planned) return false;
  if (e.kind === 'test') return true;
  return Boolean(e.withTest) || realTests(e).some((t) => t.type === 'test' || t.type === 'maint');
}

export function eventColor(e, catalog = BASE) {
  if (e.kind === 'training') return catalog.template(e.template)?.color ?? 'blue';
  return KIND[e.kind]?.color ?? 'slate';
}

export function eventTitle(e, catalog = BASE) {
  if (e.kind === 'livello') return 'Livello impostato';
  if (e.kind === 'training') return catalog.template(e.template)?.name ?? 'Allenamento';
  return KIND[e.kind]?.name ?? 'Attività';
}

/**
 * Gli appuntamenti del ritmo fra due date, ciascuno con la voce che lo soddisfa (o null).
 *
 * Come si abbinano, in quest'ordine:
 *   1. la voce porta la chiave dell'appuntamento (`occ`): è stata registrata da lì;
 *   2. stessa data e stesso tipo (un allenamento registrato dal «+» il giorno previsto);
 *   3. solo per le vecchie sessioni A/B: nell'ordine, dentro la stessa settimana, come faceva
 *      il primo modello («fatta la A, tocca la B»).
 * Un allenamento con dei test soddisfa anche il test previsto lo stesso giorno.
 * Le voci nate da un appuntamento aggiunto a mano (`adhoc`) non ne soddisfano altri.
 */
export function occurrencesBetween(plan, events, from, to, catalog = BASE) {
  if (!plan) return [];
  const out = [];
  const first = Math.max(0, weekIndex(plan, from));
  const last = Math.min(plan.weeks.length - 1, weekIndex(plan, to));
  for (let i = first; i <= last; i++) {
    const week = weekAt(plan, i, catalog);
    const occ = weekOccurrences(plan, week, catalog).map((o) => ({ ...o, event: null }));
    if (!occ.length) continue;
    const inWeek = events.filter((e) => !e.planned && e.date >= week.monday && e.date <= week.sunday).sort(byTime);
    matchWeek(occ, inWeek);
    for (const o of occ) if (o.date >= from && o.date <= to) out.push(o);
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function matchWeek(occ, inWeek) {
  const used = { training: new Set(), test: new Set() };
  const take = (o, e) => {
    o.event = e;
    used[o.kind].add(e.id);
  };
  const fits = (o, e) => (o.kind === 'test' ? fulfillsTest(e) : e.kind === 'training');

  // 1. collegate esplicitamente
  for (const o of occ) {
    const e = inWeek.find((x) => x.occ === o.key);
    if (e) take(o, e);
  }
  // Un allenamento già legato a un altro appuntamento (o nato da uno aggiunto a mano) non ne
  // soddisfa un secondo; un test fatto, invece, vale per il test previsto quel giorno.
  const free = (o) => inWeek.filter((e) => fits(o, e) && !used[o.kind].has(e.id) && (o.kind === 'test' || (!e.adhoc && !e.occ)));
  // 2. stessa data
  for (const o of occ) {
    if (o.event) continue;
    const e = free(o).find((x) => x.date === o.date);
    if (e) take(o, e);
  }
  // 3. vecchie sessioni A/B, in ordine
  for (const o of occ) {
    if (o.event) continue;
    const e = free(o).find((x) => x.legacy);
    if (e) take(o, e);
  }
}

/**
 * L'agenda di un intervallo: per ogni giorno cosa era previsto e non è ancora fatto, e cosa
 * è stato fatto. `planned` sono le voci aggiunte a mano come previste.
 */
export function agenda(plan, events, planned, from, to, catalog = BASE) {
  const days = new Map();
  const day = (d) => {
    if (!days.has(d)) days.set(d, { date: d, todo: [], done: [] });
    return days.get(d);
  };
  for (const o of occurrencesBetween(plan, events, from, to, catalog)) {
    if (o.event) continue;
    day(o.date).todo.push({ source: 'plan', key: o.key, date: o.date, kind: o.kind, template: o.template, week: o.week });
  }
  for (const p of planned) {
    if (p.date < from || p.date > to) continue;
    day(p.date).todo.push({ source: 'event', key: p.id, eventId: p.id, date: p.date, kind: p.kind, template: p.template ?? null, week: plan ? themedWeek(plan, weekAt(plan, weekIndex(plan, p.date), catalog), p.date, catalog) : null });
  }
  for (const e of events) {
    if (e.planned || e.kind === 'livello' || e.date < from || e.date > to) continue;
    day(e.date).done.push(e);
  }
  for (const d of days.values()) {
    // Prima il test, poi l'allenamento: nella sessione il test viene all'inizio dell'esercizio.
    d.todo.sort((a, b) => (a.kind === 'test' ? -1 : 0) - (b.kind === 'test' ? -1 : 0));
    d.done.sort(byTime);
  }
  return days;
}
