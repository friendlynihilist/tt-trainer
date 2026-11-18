// Compone la sessione: un allenamento (modello, pacchetto o tuo) riempito con il mese in corso.
// Per gli esercizi «del mese» l'app propone l'esercizio della sequenza del percorso (il primo senza
// argento); è solo una proposta, e ogni esercizio si cambia con qualsiasi altro della libreria.
//
// Un blocco con più esercizi diventa una fila di passi, uno per esercizio, con il tempo diviso in
// parti uguali. Fra un blocco e l'altro c'è un minuto di pausa, aggiunto (i pacchetti: 85 + 5 = 90).

import { WARMUP_TEXT, PAUSE_MINUTES, SCHEMES, DEFAULT_SCHEME } from '../data/program.js';
import { BASE, serveExercise } from '../data/catalog.js';
import { STEP_TYPES, normalizeTemplate } from '../data/templates.js';
import { MATCH_VARIANTS } from '../data/packages.js';
import { currentInSequence } from './player.js';

const MAINT_MINUTES = 5;
export const TEST_MINUTES = 5;

/** Un passo con un esercizio della libreria (o personale). */
export function exerciseStep(id, exId, minutes, catalog = BASE, extra = {}) {
  const ex = catalog.exercise(exId);
  if (!ex) return null;
  return { id, kind: 'exercise', ex: ex.id, name: ex.name, minutes, ...extra };
}

/** Uno schema della partitella: quelli dei mesi (program.js) o un esercizio della famiglia schemi. */
export function schemeOf(id, catalog = BASE) {
  if (SCHEMES[id]) return SCHEMES[id];
  const ex = catalog.exercise(id);
  return ex?.family === 'schemi' ? { id: ex.id, name: ex.name, text: ex.text } : null;
}

/** I minuti di un blocco divisi fra i suoi esercizi: 12 in 3 → 4, 4, 4; 13 in 2 → 7, 6. */
export function splitMinutes(minutes, n) {
  const base = Math.floor(minutes / n);
  return Array.from({ length: n }, (_, i) => base + (i < minutes - base * n ? 1 : 0));
}

/**
 * Cambia l'esercizio di un passo (solo per questa sessione). Un esercizio fuori dalla sequenza del
 * percorso non allena più quel percorso. Restituisce un passo nuovo.
 */
export function replaceStepExercise(step, exId, catalog = BASE) {
  const ex = catalog.exercise(exId);
  if (!ex || !step || (step.kind !== 'exercise' && step.kind !== 'serve')) return step;
  const next = { ...step, ex: ex.id };
  if (step.kind === 'exercise') next.name = ex.name;
  if (next.track && !catalog.sequence(next.track).includes(ex.id)) delete next.track;
  return next;
}

/**
 * @param week      settimana del piano (weekAt) o null
 * @param template  l'allenamento (in qualsiasi formato: si normalizza qui)
 * @param medals    medaglie per esercizio: servono solo a proporre l'esercizio di ogni percorso
 * @param pauses    un minuto di pausa fra un blocco e l'altro
 * @param overrides esercizi cambiati per questa sessione: { [id del passo]: id esercizio }
 * @returns { block, template, minutes, steps[], trained[], exercises[] }
 */
export function composeSession({ week, template, catalog = BASE, medals = {}, pauses = true, overrides = null }) {
  const t = normalizeTemplate(template);
  const month = week?.focusBlock ?? week?.block ?? catalog.block('1');
  const groups = [];

  (t?.blocks ?? []).forEach((b, i) => {
    const id = `b${i}`;
    const minutes = Math.max(1, Number(b.minutes) || 10);
    const group = [];

    if (b.role === 'warmup') {
      let maint = null;
      const exId = month.maint ? currentInSequence(month.maint, catalog, medals) : null;
      if (exId && minutes >= 10) maint = { track: month.maint, ex: exId, name: catalog.exercise(exId).name, minutes: MAINT_MINUTES };
      group.push({ id, kind: 'warmup', name: b.name || STEP_TYPES.warmup.name, minutes, text: b.text || WARMUP_TEXT, maint });
    } else if (b.role === 'serve') {
      group.push({ id, kind: 'serve', name: b.name || STEP_TYPES.serve.name, minutes, serve: month.serve, ex: (b.ex && catalog.exercise(b.ex) ? b.ex : null) ?? serveExercise(month.serve) });
    } else if (b.role === 'match') {
      const schemes = (b.schemes?.length ? b.schemes : (month.schemes ?? [])).filter((x) => schemeOf(x, catalog));
      if (!schemes.length) schemes.push(DEFAULT_SCHEME);
      const v = MATCH_VARIANTS[b.level];
      group.push({
        id,
        kind: 'match',
        name: b.name || STEP_TYPES.match.name,
        minutes,
        schemes,
        scheme: schemeOf(schemes[0], catalog),
        note: b.text ?? '',
        variant: v ? { risk: v.risk, scheme: v.schemeNote ?? '' } : null
      });
    } else {
      const items = b.items ?? [];
      const parts = splitMinutes(minutes, Math.max(1, items.length));
      items.forEach((it, j) => {
        const info = { index: i, name: b.name, n: j + 1, of: items.length };
        if (it.free) {
          group.push({ id: `${id}-${j}`, kind: 'free', name: it.name || b.name || STEP_TYPES.free.name, minutes: parts[j], text: it.text ?? '', block: info });
          return;
        }
        const trackId = it.focus ? month.tracks[it.focus - 1] : (it.track ?? null);
        const exId = trackId ? currentInSequence(trackId, catalog, medals) : it.ex;
        const step = exId ? exerciseStep(`${id}-${j}`, exId, parts[j], catalog, { ...(trackId ? { track: trackId } : {}), block: info }) : null;
        if (step) group.push(step);
      });
    }

    const changed = group.map((s) => (overrides?.[s.id] ? replaceStepExercise(s, overrides[s.id], catalog) : s));
    if (changed.length) groups.push(changed);
  });

  const all = pauses ? withPauses(groups) : groups.flat();
  return {
    block: month,
    template: t ? { id: t.id, name: t.name, color: t.color } : null,
    minutes: all.reduce((n, s) => n + s.minutes, 0),
    steps: all,
    trained: trainedTracks(all),
    exercises: sessionExercises(all)
  };
}

/** Un minuto di pausa prima di ogni blocco tranne il primo, aggiunto. Accetta anche passi singoli. */
export function withPauses(groups) {
  const list = groups.map((g) => (Array.isArray(g) ? g : [g]));
  const out = [];
  list.forEach((g, i) => {
    if (i > 0 && g[0]) out.push({ id: `pause-${g[0].id}`, kind: 'pause', name: 'Pausa', minutes: PAUSE_MINUTES });
    out.push(...g);
  });
  return out;
}

/**
 * L'allenamento con gli esercizi cambiati in una sessione, pronto da salvare come tuo. Le chiavi sono
 * gli id dei passi: «b2-1» è il secondo esercizio del terzo blocco, «b1» il blocco dei servizi.
 */
export function templateWithOverrides(template, overrides = {}) {
  const t = normalizeTemplate(template);
  const blocks = t.blocks.map((b) => ({ ...b, items: b.items.map((it) => ({ ...it })) }));
  for (const [key, ex] of Object.entries(overrides ?? {})) {
    const m = key.match(/^b(\d+)(?:-(\d+))?$/);
    const blk = m && blocks[Number(m[1])];
    if (!blk || !ex) continue;
    if (m[2] != null && blk.items[Number(m[2])]) blk.items[Number(m[2])] = { ex };
    else if (m[2] == null && blk.role === 'serve') blk.ex = ex;
  }
  const { id: _id, custom: _c, package: _p, level: _l, about: _a, minutes: _m, ...rest } = t;
  return { ...rest, blocks };
}

/** I minuti della partitella: la prima metà rischiosa, la seconda a schema. */
export function matchHalves(minutes) {
  const first = Math.ceil(minutes / 2);
  return [first, minutes - first];
}

/** Un test: un passo per esercizio, con l'obiettivo già aperto. */
export function composeTest({ exerciseIds = [], catalog = BASE }) {
  const steps = exerciseIds.map((id) => exerciseStep(`t-${id}`, id, TEST_MINUTES, catalog, { goal: true })).filter(Boolean);
  return {
    block: null,
    template: null,
    minutes: steps.reduce((n, s) => n + s.minutes, 0),
    steps,
    trained: [],
    exercises: sessionExercises(steps)
  };
}

/** I percorsi allenati in una sessione. */
export function trainedTracks(steps) {
  const out = [];
  for (const s of steps) {
    if (s.kind === 'exercise' && s.track && !out.includes(s.track)) out.push(s.track);
    if (s.maint && !out.includes(s.maint.track)) out.push(s.maint.track);
  }
  return out;
}

/** Gli esercizi di una sessione: quelli dei blocchi, dei servizi e del mantenimento. */
export function sessionExercises(steps) {
  const out = [];
  const add = (id) => id && !out.includes(id) && out.push(id);
  for (const s of steps) {
    if (s.kind === 'exercise' || s.kind === 'serve') add(s.ex);
    if (s.maint) add(s.maint.ex);
  }
  return out;
}
