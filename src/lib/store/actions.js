// Le azioni su un appuntamento in calendario, uguali da Oggi e dal Diario.
// Un appuntamento (item) viene da agenda(): { source: 'plan' | 'event', key, eventId?, date, kind, template, week }.

import { app } from './app.svelte.js';
import { ui } from './ui.svelte.js';
import { agenda } from '../engine/events.js';
import { testPlan } from '../engine/suggest.js';
import { weekFor } from '../engine/plan.js';
import { fmtLong } from '../util/dates.js';

/** Cosa c'è ancora da fare in un giorno. */
export function todoOn(date) {
  return agenda(app.plan, app.events, app.planned, date, date, app.catalog).get(date)?.todo ?? [];
}

/** Il test previsto in quel giorno e non ancora fatto, se c'è. */
export function pendingTest(date) {
  return todoOn(date).find((x) => x.kind === 'test') ?? null;
}

export function weekOf(date) {
  return weekFor(app.plan, date, app.catalog);
}

/** Apre la sessione dal vivo per un appuntamento (oggi). */
export function startItem(item, { template = null, withTest = null } = {}) {
  const date = app.today;
  const link = { occ: item?.source === 'plan' ? item.key : null, eventId: item?.source === 'event' ? item.eventId : null };
  if (item?.kind === 'test') {
    const { trackIds } = testPlan({ week: weekOf(date), events: app.events, tracks: app.tracks, catalog: app.catalog, date });
    ui.live = { mode: 'test', date, trackIds, ...link };
    return;
  }
  // Quando oggi c'è anche un test, lo fai all'inizio di ogni esercizio (salvo indicazione contraria).
  const test = withTest === false ? null : (pendingTest(date) ?? (withTest ? true : null));
  ui.live = {
    mode: 'training',
    date,
    template: template?.auto ? null : (template?.id ?? item?.template ?? 'completo'),
    custom: template?.auto ? template : null,
    withTest: Boolean(test),
    testItem: test && test !== true ? { source: test.source, key: test.key, eventId: test.eventId ?? null } : null,
    ...link
  };
}

/** Registra a posteriori quello che era previsto. */
export function logItem(item) {
  ui.open('event', {
    draft: {
      kind: item.kind,
      template: item.template,
      date: item.date,
      occ: item.source === 'plan' ? item.key : null,
      fromPlanned: item.source === 'event' ? item.eventId : null,
      withTest: item.kind === 'training' && Boolean(pendingTest(item.date))
    }
  });
}

export function moveItem(item) {
  ui.open('date', {
    title: 'Sposta a',
    value: item.date,
    onpick: (date) => {
      if (!date || date === item.date) return;
      app.moveItem(item, date);
      ui.toast(`Spostato a ${fmtLong(date)}`);
    }
  });
}

export function removeItem(item) {
  const ev = item.source === 'event' ? app.eventById(item.eventId) : null;
  app.removeItem(item);
  ui.toast('Tolto dal calendario', {
    action: {
      label: 'Annulla',
      run: () => (ev ? app.saveEvent(ev) : app.restoreOccurrence(item.key))
    }
  });
}

/** Mette in calendario qualcosa fuori dal ritmo. */
export function planOn(date, kind, template = null) {
  const ev = app.planEvent({ kind, template, date });
  ui.toast(`In calendario ${fmtLong(date)}`, { action: { label: 'Annulla', run: () => app.deleteEvent(ev.id) } });
}
