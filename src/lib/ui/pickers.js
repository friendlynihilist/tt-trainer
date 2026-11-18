// Aprono il foglio di scelta per colpi, errori ed esercizi, con i gruppi già pronti.

import { app } from '../store/app.svelte.js';
import { ui } from '../store/ui.svelte.js';
import { FAMILIES, ERROR_GROUPS, BALLS, POINT_PHASES } from '../data/taxonomy.js';
import { OTHER } from '../data/catalog.js';
import { LEVEL_IDS, PLAYER_LEVEL, TIERS, TIER, MODES } from '../data/library.js';

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

/** Le varianti di un esercizio: stessa famiglia, un livello sotto e uno sopra (prima chi allena gli stessi colpi). */
export function variantsOf(exId) {
  const cat = app.catalog;
  const ex = cat.exercise(exId);
  const at = LEVEL_IDS.indexOf(ex?.level);
  if (!ex || at < 0) return { easier: [], harder: [] };
  const shared = (e) => e.strokes.filter((s) => ex.strokes.includes(s)).length;
  const pick = (lvl) =>
    cat.activeExerciseIds
      .map((id) => cat.exercise(id))
      .filter((e) => e.id !== ex.id && e.family === ex.family && e.level === lvl)
      .sort((a, b) => shared(b) - shared(a))
      .slice(0, 4);
  return { easier: at > 0 ? pick(LEVEL_IDS[at - 1]) : [], harder: at < LEVEL_IDS.length - 1 ? pick(LEVEL_IDS[at + 1]) : [] };
}

/** I filtri della libreria: famiglia, livello, formato. */
export function exerciseFilters() {
  return [
    { key: 'family', label: 'Famiglia', options: FAMILIES.map((f) => ({ id: f.id, label: f.name })) },
    { key: 'level', label: 'Livello', options: LEVEL_IDS.map((l) => ({ id: l, label: PLAYER_LEVEL[l].name })) },
    { key: 'modes', label: 'Formato', options: MODES.map((m) => ({ id: m.id, label: m.name })) }
  ];
}

/**
 * Un esercizio fra tutti: la libreria intera e i tuoi, raggruppati per famiglia, con i filtri per
 * famiglia, livello e formato. Nessuno è escluso: il livello del giocatore decide solo l'ordine e
 * `family` porta in cima la famiglia indicata. Con `variantsOf` (l'esercizio da cambiare) in cima
 * compaiono le varianti più semplici e più difficili. Con `other` anche gli esercizi generici.
 */
export function pickExercise({ title = 'Esercizio', value = null, onpick, family = null, other = false, variantsOf: current = null, only = null }) {
  const cat = app.catalog;
  const at = LEVEL_IDS.indexOf(app.player.level);
  const dist = (e) => (e.level ? Math.abs(LEVEL_IDS.indexOf(e.level) - at) : 0);
  const all = cat.activeExerciseIds.map((id) => cat.exercise(id)).filter((e) => !only || only(e));
  const opt = (e) => {
    const m = app.medals[e.id];
    const won = TIERS.filter((t) => m?.[t]).map((t) => TIER[t].name.toLowerCase());
    return {
      id: e.id,
      label: e.name,
      hint: [PLAYER_LEVEL[e.level]?.name, won.length ? won.join(', ') : null].filter(Boolean).join(' · ') || undefined,
      tags: { family: e.family, level: e.level, modes: e.modes ?? [] }
    };
  };
  const fams = [...FAMILIES].sort((a, b) => (a.id === family ? -1 : b.id === family ? 1 : 0));
  const groups = [];
  if (current) {
    const v = variantsOf(current);
    if (v.easier.length) groups.push({ name: 'Più semplice', options: v.easier.map(opt) });
    if (v.harder.length) groups.push({ name: 'Più difficile', options: v.harder.map(opt) });
  }
  for (const f of fams) {
    const list = all.filter((e) => e.family === f.id).sort((a, b) => dist(a) - dist(b));
    if (list.length) groups.push({ name: f.name, options: list.map(opt) });
  }
  const mine = all.filter((e) => !FAMILIES.some((f) => f.id === e.family));
  if (mine.length) groups.push({ name: 'I tuoi esercizi', options: mine.map(opt) });
  if (other) groups.push({ name: 'Altro', options: Object.entries(OTHER).map(([id, label]) => ({ id, label })) });
  ui.open('pick', { title, value, clearable: other, groups, onpick, filters: only ? [] : exerciseFilters() });
}

/** Uno schema della partitella, fra gli esercizi della famiglia schemi. */
export function pickScheme({ value = null, onpick }) {
  pickExercise({ title: 'Schema della partitella', value, onpick, only: (e) => e.family === 'schemi' });
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

/** Un allenamento: i pacchetti (prima quelli del tuo livello), i modelli e i tuoi. */
export function pickTemplate({ value = null, onpick }) {
  const cat = app.catalog;
  const pk = Object.values(cat.packages);
  const mine = pk.filter((t) => t.level === app.player.level);
  const groups = [
    { name: 'Il tuo livello', options: mine.map((t) => ({ id: t.id, label: t.name })) },
    ...LEVEL_IDS.filter((l) => l !== app.player.level).map((l) => ({ name: PLAYER_LEVEL[l].name, options: pk.filter((t) => t.level === l).map((t) => ({ id: t.id, label: t.name })) })),
    { name: 'Modelli', options: Object.values(cat.templates).map((t) => ({ id: t.id, label: t.name, hint: t.custom ? 'tuo' : undefined })) }
  ];
  ui.open('pick', { title: 'Allenamento', value, groups, onpick });
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
      { name: 'Pacchetti', options: Object.values(cat.packages).map((t) => ({ id: `training:${t.id}`, label: t.name })) },
      { name: 'Misura', options: [{ id: 'test', label: 'Test' }] }
    ],
    onpick
  });
}
