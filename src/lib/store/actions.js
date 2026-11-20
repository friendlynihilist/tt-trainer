// Le azioni su un appuntamento in calendario, uguali da Oggi e dal Diario.
// Un appuntamento (item) viene da agenda(): { source: 'plan' | 'event', key, eventId?, date, kind, template, week }.

import { app } from './app.svelte.js';
import { ui } from './ui.svelte.js';
import { agenda } from '../engine/events.js';
import { testProposal } from '../engine/player.js';
import { weekFor, stageInfo, stagePeriod } from '../engine/plan.js';
import { fmtLong } from '../util/dates.js';

/** Cosa c'è ancora da fare in un giorno. */
export function todoOn(date) {
  return agenda(app.plan, app.events, app.planned, date, date, app.catalog).get(date)?.todo ?? [];
}

export function weekOf(date) {
  return weekFor(app.plan, date, app.catalog);
}

/** Gli esercizi proposti per un test in quel giorno, con il motivo. */
export function proposalFor(date = app.today) {
  // «Esercizio di questo mese», «… di questa settimana», secondo la durata della tappa.
  const info = app.plan ? stageInfo(app.plan, date, app.catalog) : null;
  const st = info?.stages[info.current];
  const period = st ? stagePeriod(st, { isToday: st.start === date }).of : 'di questo mese';
  return testProposal({ catalog: app.catalog, week: weekOf(date), medals: app.medals, events: app.events, level: app.player.level, period });
}

/**
 * Apre la sessione dal vivo per un appuntamento (oggi). Un test si compone dalle proposte (o dagli
 * esercizi indicati); un allenamento dal suo modello. Il test resta separato dall'allenamento.
 */
export function startItem(item, { template = null, exercises = null, overrides = null } = {}) {
  const date = app.today;
  const link = { occ: item?.source === 'plan' ? item.key : null, eventId: item?.source === 'event' ? item.eventId : null };
  if (item?.kind === 'test') {
    ui.live = { mode: 'test', date, exercises: exercises ?? proposalFor(date).map((p) => p.ex), ...link };
    return;
  }
  ui.live = { mode: 'training', date, template: template?.id ?? item?.template ?? 'completo', overrides: overrides ?? {}, ...link };
}

/** Registra a posteriori quello che era previsto. */
export function logItem(item) {
  ui.open('event', {
    draft: {
      kind: item.kind,
      template: item.template,
      date: item.date,
      occ: item.source === 'plan' ? item.key : null,
      fromPlanned: item.source === 'event' ? item.eventId : null
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
