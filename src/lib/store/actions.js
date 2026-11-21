// Le azioni su un appuntamento in calendario, uguali da Oggi e dal Diario.
// Un appuntamento (item) viene da agenda(): { source: 'plan' | 'event', key, eventId?, date, kind, template, week }.

import { app } from './app.svelte.js';
import { ui } from './ui.svelte.js';
import { agenda } from '../engine/events.js';
import { testProposal } from '../engine/player.js';
import { weekFor, stageInfo, stagePeriod, createPlan, occurrenceKey } from '../engine/plan.js';
import { composeSession } from '../engine/compose.js';
import { fmtLong, addDays, mondayOf, weekday } from '../util/dates.js';
import { toTemplate, bricksOf, workoutName } from '../data/bricks.js';

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

/** Mette un allenamento a oggi, al posto di quello che c'era in calendario. */
export function putToday(templateId) {
  const day = agenda(app.plan, app.events, app.planned, app.today, app.today, app.catalog).get(app.today);
  for (const item of day?.todo ?? []) if (item.kind === 'training') app.removeItem(item);
  app.planEvent({ kind: 'training', template: templateId, date: app.today });
}

/**
 * Un allenamento come lo si mostra: il nome (quello che gli hai dato, oppure quello che contiene), i
 * suoi fondamentali con gli esercizi di quel giorno, e i minuti.
 */
export function workoutOf(templateId, date = app.today) {
  const template = app.catalog.template(templateId);
  if (!template) return { template: null, name: 'Allenamento', bricks: [], minutes: 0 };
  const session = composeSession({ week: weekOf(date), template, catalog: app.catalog, medals: app.medals });
  const bricks = bricksOf(template, app.catalog, session);
  const named = bricks.filter((b) => b.type);
  return { template, bricks, minutes: session.minutes, name: template.custom ? template.name : named.length ? workoutName(named) : template.name };
}

/**
 * Un programma con lo stesso allenamento nei giorni scelti, per una o quattro settimane. Parte da
 * questa settimana; se i giorni scelti sono già passati, dalla prossima.
 */
export function weeksPlan(templateId, days, weeks) {
  const sorted = [...days].sort((a, b) => a - b);
  const wd = weekday(app.today);
  const late = !sorted.some((d) => d >= wd);
  const start = late ? addDays(mondayOf(app.today), 7) : mondayOf(app.today);
  const slots = sorted.map((day) => ({ id: `t${day}`, day, kind: 'training', template: templateId }));
  const plan = createPlan({ start, slots, stages: [{ b: '1', n: weeks, u: 'w' }] });
  // I giorni di questa settimana già passati non contano come saltati.
  if (!late) plan.skip = slots.filter((s) => s.day < wd).map((s) => occurrenceKey(plan, addDays(start, s.day - 1), s));
  return plan;
}

/** Il tasto +: apre il costruttore su un allenamento nuovo. Salvato, si sceglie quando farlo. */
export function buildNew(bricks = []) {
  ui.builder = {
    title: 'Nuovo allenamento',
    cta: 'Avanti',
    bricks: Array.isArray(bricks) ? bricks : [],
    onsave: (list) => {
      const t = app.saveCustom('templates', toTemplate(list));
      ui.open('when', { id: t.id, fresh: true });
    }
  };
}

/** Mette in calendario qualcosa fuori dal ritmo. */
export function planOn(date, kind, template = null) {
  const ev = app.planEvent({ kind, template, date });
  ui.toast(`In calendario ${fmtLong(date)}`, { action: { label: 'Annulla', run: () => app.deleteEvent(ev.id) } });
}
