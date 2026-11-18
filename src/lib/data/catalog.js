// Il catalogo: percorsi, mesi e modelli di allenamento. Unisce il programma di base (sola
// lettura, nel codice) con quello che ciascuno crea per sé (in meta.custom, nel proprio spazio).
// Un id personale comincia sempre con «c» e non collide mai con quelli di base.

import { TRACKS, BLOCKS, LEVELS, SCHEMES, DEFAULT_SCHEME } from './program.js';
import { TEMPLATES, DEFAULT_TEMPLATE, AUTO_TEMPLATE } from './templates.js';

export const MAX_LEVELS = 8;

function customTrack(t) {
  const levels = (t.levels ?? []).slice(0, MAX_LEVELS).map((l, i) => ({
    n: i + 1,
    id: `${t.id}-${i + 1}`,
    name: l.name || `Livello ${i + 1}`,
    drill: l.drill ?? '',
    test: l.test ?? '',
    goal: l.goal ?? ''
  }));
  return {
    id: t.id,
    custom: true,
    archived: Boolean(t.archived),
    block: null,
    name: t.name || 'Percorso',
    short: t.short || t.name || 'Percorso',
    side: t.side ?? null,
    strokes: t.strokes ?? [],
    levels: levels.length ? levels : [{ n: 1, id: `${t.id}-1`, name: 'Livello 1', drill: '', test: '', goal: '' }]
  };
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
  const tracks = { ...TRACKS };
  for (const t of custom?.tracks ?? []) if (t?.id) tracks[t.id] = customTrack(t);
  const blocks = { ...BLOCKS };
  for (const b of custom?.blocks ?? []) if (b?.id) blocks[b.id] = customBlock(b, tracks);
  const templates = { ...TEMPLATES };
  for (const t of custom?.templates ?? []) if (t?.id) templates[t.id] = { ...t, custom: true, steps: t.steps ?? [] };
  const all = { ...templates, auto: AUTO_TEMPLATE };

  const trackIds = Object.keys(tracks);
  return {
    tracks,
    blocks,
    /** I modelli da scegliere (senza «Su misura», che si compone al momento). */
    templates,
    trackIds,
    /** Percorsi da proporre nelle scelte (gli archiviati restano solo per la storia). */
    activeTrackIds: trackIds.filter((id) => !tracks[id].archived),
    track: (id) => tracks[id] ?? null,
    block: (id) => blocks[id] ?? null,
    template: (id) => all[id] ?? templates[DEFAULT_TEMPLATE],
    hasTemplate: (id) => Boolean(all[id]),
    maxLevel: (id) => tracks[id]?.levels.length ?? LEVELS,
    level: (id, n) => tracks[id]?.levels[n - 1] ?? null
  };
}

/** Solo il programma di base: per i test e per chi non ha ancora creato nulla. */
export const BASE = buildCatalog();

/** «1-2-3» → { track: '1-2', n: 3 }; «2-S» → { serve: '2-S' }. Gli id dei percorsi possono contenere «-». */
export function parseExercise(id) {
  if (!id) return null;
  if (/^\d-S$/.test(id)) return { serve: id };
  const i = id.lastIndexOf('-');
  if (i < 0) return { other: id };
  const n = Number(id.slice(i + 1));
  return Number.isInteger(n) && n > 0 ? { track: id.slice(0, i), n } : { other: id };
}

const OTHER = { multiball: 'Multiball libero', partita: 'Partita libera', altro: 'Altro' };

/** Tutti gli esercizi selezionabili (per «esercizio per correggerlo»), raggruppati per percorso. */
export function exerciseOptions(catalog = BASE) {
  const out = [];
  for (const id of catalog.activeTrackIds) {
    const t = catalog.tracks[id];
    for (const l of t.levels) out.push({ id: l.id, group: t.short, label: `L${l.n} ${l.name}`, track: id, level: l.n });
  }
  for (const [id, s] of Object.entries(SERVES)) out.push({ id, group: 'Servizi', label: s.label });
  for (const [id, label] of Object.entries(OTHER)) out.push({ id, group: 'Altro', label });
  return out;
}

export function exerciseLabel(id, catalog = BASE) {
  const p = parseExercise(id);
  if (!p) return '';
  if (p.serve) return `Servizi · ${SERVES[p.serve]?.label ?? p.serve}`;
  if (p.track) {
    const t = catalog.track(p.track);
    const l = catalog.level(p.track, p.n);
    if (t && l) return `${t.short} · L${l.n} ${l.name}`;
  }
  return OTHER[id] ?? id;
}
