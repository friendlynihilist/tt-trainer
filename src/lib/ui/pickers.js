// Aprono il foglio di scelta per colpi, errori ed esercizi, con i gruppi già pronti.

import { app } from '../store/app.svelte.js';
import { ui } from '../store/ui.svelte.js';
import { FAMILIES, ERROR_GROUPS, BALLS, POINT_PHASES } from '../data/taxonomy.js';
import { exerciseOptions } from '../data/program.js';

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
  for (const e of exerciseOptions()) {
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
