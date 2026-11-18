// Il catalogo: esercizi, percorsi, mesi e modelli di allenamento. Unisce il contenuto di base
// (sola lettura, nel codice) con quello che ciascuno crea per sé (meta.custom, nel proprio spazio).
// Un id personale comincia sempre con «c» e non collide mai con quelli di base.
//
// · Esercizi: la libreria (library.js), più gli esercizi personali (meta.custom.exercises) e quelli
//   nati dai livelli dei percorsi personali («{percorso}-{n}»).
// · Percorsi: una sequenza di esercizi. Quelli di base vengono dal primo programma.
// Esercizi e colpi (taxonomy.js) restano collezioni separate anche quando un id coincide.

import { TRACKS, BLOCKS, SCHEMES, DEFAULT_SCHEME } from './program.js';
import { TEMPLATES, DEFAULT_TEMPLATE, AUTO_TEMPLATE, normalizeTemplate } from './templates.js';
import { PACKAGES } from './packages.js';
import { LIBRARY, LIBRARY_BY_ID, SEQUENCES, LEGACY_LEVELS, SERVE_EXERCISE, LEVEL_IDS, MODES } from './library.js';
import { FAMILY } from './taxonomy.js';

export const MAX_LEVELS = 8;

/** Le soglie degli esercizi personali che non ne indicano: su 10, come i test di prima. */
export const CUSTOM_GOALS = { B: 6, A: 8, O: 9 };

function cleanGoals(goals) {
  const out = {};
  for (const k of ['B', 'A', 'O', 'P']) {
    const v = Number(goals?.[k]);
    if (Number.isFinite(v) && v > 0) out[k] = Math.round(v);
  }
  return Object.keys(out).length ? out : { ...CUSTOM_GOALS };
}

/** Un esercizio personale (importato o nato da un percorso personale). */
export function customExercise(e) {
  const n = Math.max(1, Math.min(100, Math.round(Number(e.measure?.n) || 10)));
  return {
    id: e.id,
    custom: true,
    track: e.track ?? null,
    archived: Boolean(e.archived),
    family: FAMILY[e.family] ? e.family : null,
    level: LEVEL_IDS.includes(e.level) ? e.level : null,
    name: e.name || 'Esercizio',
    text: e.text ?? '',
    quality: e.quality ?? '',
    measure: e.measure?.type && e.measure.type !== 'su' ? { ...e.measure } : { type: 'su', n, what: e.measure?.what ?? '' },
    goals: cleanGoals(e.goals),
    modes: (e.modes ?? []).filter((m) => MODES.some((x) => x.id === m)),
    errors: e.errors ?? [],
    strokes: e.strokes ?? [],
    source: e.source ?? '',
    test: e.test ?? ''
  };
}

function customTrack(t) {
  const levels = (t.levels ?? []).slice(0, MAX_LEVELS).map((l, i) => ({
    n: i + 1,
    id: `${t.id}-${i + 1}`,
    name: l.name || `Livello ${i + 1}`,
    drill: l.drill ?? '',
    test: l.test ?? '',
    goal: l.goal ?? '',
    goals: l.goals ?? null
  }));
  const short = t.short || t.name || 'Percorso';
  return {
    id: t.id,
    custom: true,
    archived: Boolean(t.archived),
    block: null,
    name: t.name || 'Percorso',
    short,
    side: t.side ?? null,
    family: t.family ?? null,
    strokes: t.strokes ?? [],
    levels,
    // Un percorso personale è la sequenza indicata, oppure i suoi livelli.
    sequence: Array.isArray(t.sequence) && t.sequence.length ? [...t.sequence] : levels.map((l) => l.id)
  };
}

/** Gli esercizi nati dai livelli di un percorso personale. */
function levelExercises(t) {
  return t.levels.map((l) =>
    customExercise({
      id: l.id,
      track: t.id,
      archived: t.archived,
      family: t.family,
      name: t.levels.length > 1 ? `${t.short} · ${l.name}` : t.short,
      text: l.drill,
      quality: l.goal,
      test: l.test,
      measure: { type: 'su', n: 10, what: '' },
      goals: l.goals,
      modes: ['compagno'],
      strokes: t.strokes
    })
  );
}

function customBlock(b, tracks) {
  const serve = typeof b.serve === 'string' ? (SERVES[b.serve] ?? null) : (b.serve ?? null);
  return {
    id: b.id,
    custom: true,
    label: b.theme || 'Mese',
    theme: b.theme || 'Mese',
    tracks: (b.tracks ?? []).filter((id) => tracks[id]).slice(0, 3),
    maint: b.maint && tracks[b.maint] ? b.maint : null,
    // Lo schema della partitella. La vecchia «regola» (b.rule) non si usa più: resta nei dati.
    schemes: [SCHEMES[b.scheme] ? b.scheme : DEFAULT_SCHEME],
    serve: serve ?? SERVES['1-S'],
    serveId: typeof b.serve === 'string' ? b.serve : null
  };
}

/** Il lavoro sui servizi dei mesi di base, riusabile nei mesi personali. */
export const SERVES = Object.fromEntries(['1', '2', '3'].map((b) => [`${b}-S`, { ...BLOCKS[b].serve, label: `${BLOCKS[b].label} · ${BLOCKS[b].theme}` }]));

export function buildCatalog(custom = {}) {
  const tracks = {};
  for (const [id, t] of Object.entries(TRACKS)) tracks[id] = { ...t, sequence: SEQUENCES[id] ?? [] };
  const exercises = { ...LIBRARY_BY_ID };
  for (const e of custom?.exercises ?? []) if (e?.id && !LIBRARY_BY_ID[e.id]) exercises[e.id] = customExercise(e);
  for (const raw of custom?.tracks ?? []) {
    if (!raw?.id) continue;
    const t = customTrack(raw);
    tracks[t.id] = t;
    for (const e of levelExercises(t)) exercises[e.id] = e;
  }
  for (const t of Object.values(tracks)) t.sequence = t.sequence.filter((id) => exercises[id]);

  const blocks = { ...BLOCKS };
  for (const b of custom?.blocks ?? []) if (b?.id) blocks[b.id] = customBlock(b, tracks);
  const templates = { ...TEMPLATES };
  // I modelli personali salvati prima della 0.4 si leggono nel formato a blocchi, senza riscriverli.
  for (const t of custom?.templates ?? []) if (t?.id) templates[t.id] = { ...normalizeTemplate(t), custom: true };
  const all = { ...templates, ...PACKAGES, auto: AUTO_TEMPLATE };

  const trackIds = Object.keys(tracks);
  const exerciseIds = Object.keys(exercises);
  return {
    tracks,
    blocks,
    exercises,
    /** I modelli da scegliere (di base e tuoi). «Su misura» (auto) resta solo per leggere le voci di prima. */
    templates,
    /** I pacchetti per livello. */
    packages: PACKAGES,
    trackIds,
    /** Percorsi da proporre nelle scelte (gli archiviati restano solo per la storia). */
    activeTrackIds: trackIds.filter((id) => !tracks[id].archived),
    exerciseIds,
    /** Tutti gli esercizi da proporre: la libreria intera e quelli personali non archiviati. */
    activeExerciseIds: exerciseIds.filter((id) => !exercises[id].archived),
    track: (id) => tracks[id] ?? null,
    block: (id) => blocks[id] ?? null,
    exercise: (id) => exercises[id] ?? null,
    sequence: (id) => tracks[id]?.sequence ?? [],
    template: (id) => normalizeTemplate(all[id] ?? templates[DEFAULT_TEMPLATE]),
    hasTemplate: (id) => Boolean(all[id]),
    /** Un livello di un percorso, come era nelle versioni di prima (per lo storico). */
    level: (id, n) => tracks[id]?.levels?.[n - 1] ?? null
  };
}

/** Solo il contenuto di base: per i test e per chi non ha ancora creato nulla. */
export const BASE = buildCatalog();

/** L'esercizio per cui valgono i test di un percorso a un certo livello (versioni di prima). */
export function legacyExercise(trackId, level, catalog = BASE) {
  const base = LEGACY_LEVELS[trackId]?.[level - 1];
  if (base) return base;
  const id = `${trackId}-${level}`;
  return catalog.exercise(id) ? id : null;
}

/** L'esercizio dei servizi di un mese. */
export function serveExercise(serve) {
  const id = typeof serve === 'string' ? serve : serve?.id;
  return SERVE_EXERCISE[id] ?? null;
}

/** «1-2-3» → { track: '1-2', n: 3 }; «2-S» → { serve: '2-S' }. Gli id dei percorsi possono contenere «-». */
export function parseExercise(id) {
  if (!id) return null;
  if (/^\d-S$/.test(id)) return { serve: id };
  const i = id.lastIndexOf('-');
  if (i < 0) return { other: id };
  const n = Number(id.slice(i + 1));
  return Number.isInteger(n) && n > 0 ? { track: id.slice(0, i), n } : { other: id };
}

/** Esercizi generici per «esercizio per correggerlo», fuori dalla libreria. */
export const OTHER = { multiball: 'Multiball libero', partita: 'Partita libera', altro: 'Altro' };

/** Un esercizio scelto altrove (es. «esercizio per correggerlo»): della libreria, personale o di prima. */
export function resolveExercise(id, catalog = BASE) {
  if (!id) return null;
  if (catalog.exercise(id)) return id;
  const p = parseExercise(id);
  if (p?.serve) return serveExercise(p.serve);
  if (p?.track) return legacyExercise(p.track, p.n, catalog);
  return null;
}

/** Tutti gli esercizi selezionabili, raggruppati per famiglia. */
export function exerciseOptions(catalog = BASE) {
  const out = [];
  const families = [...new Set(LIBRARY.map((e) => e.family))];
  for (const f of families) {
    for (const e of LIBRARY.filter((x) => x.family === f)) out.push({ id: e.id, group: FAMILY[f]?.name ?? f, label: e.name });
  }
  for (const id of catalog.activeExerciseIds) {
    const e = catalog.exercise(id);
    if (e.custom) out.push({ id, group: 'I tuoi esercizi', label: e.name });
  }
  for (const [id, label] of Object.entries(OTHER)) out.push({ id, group: 'Altro', label });
  return out;
}

export function exerciseLabel(id, catalog = BASE) {
  if (!id) return '';
  const ex = catalog.exercise(resolveExercise(id, catalog));
  if (ex) return ex.name;
  return OTHER[id] ?? id;
}
