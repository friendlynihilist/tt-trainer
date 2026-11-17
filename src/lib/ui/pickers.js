// Aprono il foglio di scelta per colpi, errori ed esercizi, con i gruppi già pronti.

import { app } from '../store/app.svelte.js';
import { ui } from '../store/ui.svelte.js';
import { FAMILIES, ERROR_GROUPS, BALLS, POINT_PHASES } from '../data/taxonomy.js';
import { exerciseOptions } from '../data/catalog.js';

function grouped(defs, items, key, otherName) {
  const groups = defs
    .map((d) => ({ name: d.name, options: items.filter((x) => x[key] === d.id).map((x) => ({ id: x.id, label: x.name })) }))
    .filter((g) => g.options.length);
  const known = new Set(defs.map((d) => d.id));
  const rest = items.filter((x) => !known.has(x[key]));
  if (rest.length) groups.push({ name: otherName, options: rest.map((x) => ({ id: x.id, label: x.name })) });
  return groups;
}

export function pickStroke({ value = null, onpick }) {
  ui.open('pick', {
    title: 'Colpo',
    value,
    clearable: true,
    groups: grouped(FAMILIES, app.strokes, 'family', 'I tuoi colpi'),
    onpick,
    onadd: (name) => onpick(app.addCustom('strokes', { name, short: name, family: 'custom' }).id)
  });
}

export function pickError({ value = null, onpick }) {
  ui.open('pick', {
    title: 'Errore',
    value,
    clearable: true,
    groups: grouped(ERROR_GROUPS, app.errors, 'group', 'I tuoi errori'),
    onpick,
    onadd: (name) => onpick(app.addCustom('errors', { name, group: 'custom' }).id)
  });
}

export function pickExercise({ value = null, onpick }) {
  const groups = [];
  for (const e of exerciseOptions(app.catalog)) {
    let g = groups.find((x) => x.name === e.group);
    if (!g) groups.push((g = { name: e.group, options: [] }));
    g.options.push({ id: e.id, label: e.label });
  }
  ui.open('pick', { title: 'Esercizio', value, clearable: true, groups, onpick });
}

export function pickBall({ value = null, onpick }) {
  ui.open('pick', {
    title: 'Palla in arrivo',
    value,
    clearable: true,
    groups: [{ options: BALLS.map((b) => ({ id: b.id, label: b.name })) }],
    onpick
  });
}

export function pickPhase({ value = null, onpick }) {
  ui.open('pick', {
    title: 'Fase del punto',
    value,
    clearable: true,
    groups: [{ options: POINT_PHASES.map((p) => ({ id: p.id, label: p.name, hint: p.hint })) }],
    onpick
  });
}

/** Un percorso fra tutti quelli disponibili, raggruppati: del piano, di base, tuoi. */
export function pickTrack({ title = 'Percorso', value = null, exclude = [], onpick }) {
  const cat = app.catalog;
  const groups = [];
  const base = cat.activeTrackIds.filter((id) => !cat.track(id).custom && !exclude.includes(id));
  const mine = cat.activeTrackIds.filter((id) => cat.track(id).custom && !exclude.includes(id));
  const opt = (id) => {
    const t = cat.track(id);
    return { id, label: t.short, hint: t.name !== t.short ? t.name : undefined };
  };
  if (base.length) groups.push({ name: 'Programma', options: base.map(opt) });
  if (mine.length) groups.push({ name: 'I tuoi percorsi', options: mine.map(opt) });
  ui.open('pick', { title, value, groups, onpick });
}

/** Un giorno della settimana. */
export function pickWeekday({ value = null, onpick }) {
  const names = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
  ui.open('pick', { title: 'Giorno', value, groups: [{ options: names.map((label, i) => ({ id: i + 1, label })) }], onpick });
}

/** Cosa mettere in calendario: un modello di allenamento oppure il test. */
export function pickSlotKind({ value = null, onpick }) {
  const cat = app.catalog;
  const templates = Object.values(cat.templates);
  ui.open('pick', {
    title: 'Cosa',
    value,
    groups: [
      { name: 'Allenamento', options: templates.map((t) => ({ id: `training:${t.id}`, label: t.name, hint: t.custom ? 'tuo' : undefined })) },
      { name: 'Misura', options: [{ id: 'test', label: 'Test' }] }
    ],
    onpick
  });
}
