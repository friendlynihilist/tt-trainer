// Importazione di esercizi, percorsi, mesi e modelli da un testo JSON (scritto a mano o da un
// assistente). Il formato è in italiano e perdona: accetta nomi al posto degli id, campi mancanti,
// testo prima e dopo il JSON. Reimportare lo stesso «id» aggiorna invece di duplicare.

import { MAX_LEVELS, SERVES, CUSTOM_GOALS } from './catalog.js';
import { SCHEMES, DEFAULT_SCHEME } from './program.js';
import { COLORS, STEP_TYPES } from './templates.js';
import { LIBRARY, LEVEL_IDS } from './library.js';
import { FAMILIES, ERRORS } from './taxonomy.js';

export const IMPORT_EXAMPLE = {
  esercizi: [
    {
      id: 'flip-laterale',
      nome: 'Flip sul servizio laterale',
      famiglia: 'ricezione',
      livello: 'avanzato',
      formato: ['con compagno'],
      descrizione: 'Il compagno serve corto con effetto laterale. Flip di dritto in diagonale.',
      qualita: 'Racchetta orientata contro l’effetto, palla bassa.',
      misura: { tipo: 'su', n: 10, cosa: 'in campo' },
      gradini: { bronzo: 4, argento: 6, oro: 8 },
      errori: ['rete', 'lunga', 'lettura'],
      colpi: ['ric-flip-d']
    }
  ],
  percorsi: [
    {
      id: 'flip-dritto',
      nome: 'Flip di dritto',
      breve: 'Flip di dritto',
      lato: 'D',
      esercizi: ['ric-flip-d', 'flip-laterale', 'flip-d-top']
    }
  ],
  mesi: [{ id: 'mese-flip', tema: 'Gioco corto', percorsi: ['flip-dritto', '3-2'], mantenimento: '2-2', servizi: '1-S', schema: 'ric-corta' }],
  allenamenti: [
    {
      id: 'corto-60',
      nome: 'Gioco corto 60′',
      colore: 'pink',
      passi: [
        { tipo: 'riscaldamento', minuti: 10 },
        { tipo: 'mese', quale: 1, minuti: 20 },
        { tipo: 'percorso', percorso: '3-2', minuti: 10 },
        { tipo: 'esercizio', esercizio: 'flip-laterale', minuti: 5 },
        { tipo: 'libero', nome: 'Multiball sul corto', testo: 'Palle corte alternate sui due lati.', minuti: 10 },
        { tipo: 'partitella', minuti: 5 }
      ]
    }
  ]
};

const STEP_ALIASES = {
  riscaldamento: 'warmup',
  warmup: 'warmup',
  servizi: 'serve',
  serve: 'serve',
  mese: 'focus',
  focus: 'focus',
  percorso: 'track',
  track: 'track',
  esercizio: 'exercise',
  exercise: 'exercise',
  libero: 'free',
  free: 'free',
  partitella: 'match',
  partita: 'match',
  match: 'match'
};

const pick = (o, ...keys) => {
  for (const k of keys) if (o?.[k] != null && o[k] !== '') return o[k];
  return undefined;
};
const str = (v, max = 400) => (v == null ? '' : String(v).trim().slice(0, max));

/** «Flip di dritto!» → «cflip-di-dritto». Sempre con la «c» davanti: mai uguale a un id di base. */
export function customId(raw) {
  const slug = String(raw)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
  return `c${slug || Math.random().toString(36).slice(2, 8)}`;
}

/** Il primo oggetto JSON nel testo (gli assistenti a volte ci mettono intorno delle frasi). */
function extractJson(text) {
  const t = String(text ?? '').trim();
  try {
    return JSON.parse(t);
  } catch {}
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error('nessun JSON');
}

const MEASURES = { su: 'su', 'su n': 'su', fila: 'fila', 'di fila': 'fila', consecutivi: 'fila', tempo: 'tempo', 'a tempo': 'tempo', conta: 'conta' };
const MODE_ALIASES = { solo: 'solo', 'da solo': 'solo', compagno: 'compagno', 'con compagno': 'compagno', multiball: 'multiball', robot: 'robot' };
const TIER_KEYS = { B: ['bronzo', 'B'], A: ['argento', 'A'], O: ['oro', 'O'], P: ['platino', 'P'] };

function parseMeasure(raw) {
  const type = MEASURES[str(pick(raw, 'tipo', 'type'), 20).toLowerCase()] ?? 'su';
  if (type === 'su') return { type, n: Math.max(1, Math.min(100, Math.round(Number(pick(raw, 'n', 'su')) || 10))), what: str(pick(raw, 'cosa', 'what'), 80) };
  if (type === 'fila') return { type, unit: ['colpi', 'scambi', 'cicli', 'sequenze', 'difese'].includes(pick(raw, 'unita', 'unità', 'unit')) ? pick(raw, 'unita', 'unità', 'unit') : 'colpi' };
  if (type === 'tempo') return { type, unit: pick(raw, 'unita', 'unità', 'unit') === 'scambi' ? 'scambi' : 'colpi', seconds: Math.round(Number(pick(raw, 'secondi', 'seconds')) || 30) };
  return { type, what: str(pick(raw, 'cosa', 'what'), 80) || 'riusciti' };
}

function parseGoals(raw) {
  const out = {};
  for (const [k, keys] of Object.entries(TIER_KEYS)) {
    const v = Number(pick(raw, ...keys));
    if (Number.isFinite(v) && v > 0) out[k] = Math.round(v);
  }
  return out;
}

/**
 * @returns { exercises, tracks, blocks, templates, errors: string[], warnings: string[] }
 */
export function parseImport(text, catalog) {
  const out = { exercises: [], tracks: [], blocks: [], templates: [], errors: [], warnings: [] };
  let data;
  try {
    data = extractJson(text);
  } catch {
    out.errors.push('Non riesco a leggere il testo: deve essere JSON, come nell’esempio.');
    return out;
  }
  if (Array.isArray(data)) data = { percorsi: data };

  // Esercizi: si richiamano per id (della libreria, dei tuoi o scritto nel file) o per nome.
  const exLookup = new Map();
  const rememberEx = (keys, id) => keys.filter(Boolean).forEach((k) => exLookup.set(String(k).toLowerCase().trim(), id));
  for (const e of LIBRARY) rememberEx([e.id, e.name], e.id);
  for (const id of catalog.exerciseIds ?? []) rememberEx([id, catalog.exercise(id)?.name], id);

  for (const [i, raw] of (pick(data, 'esercizi', 'exercises') ?? []).entries()) {
    const name = str(pick(raw, 'nome', 'name'), 80);
    if (!name) {
      out.errors.push(`Esercizio ${i + 1}: manca il nome.`);
      continue;
    }
    const given = pick(raw, 'id');
    const id = customId(given ?? name);
    const family = str(pick(raw, 'famiglia', 'family'), 20).toLowerCase();
    const level = str(pick(raw, 'livello', 'level'), 20).toLowerCase();
    const goals = parseGoals(pick(raw, 'gradini', 'obiettivi', 'goals'));
    const errs = (pick(raw, 'errori', 'errors') ?? []).map((x) => str(x, 30));
    const unknown = errs.filter((x) => !ERRORS.some((e) => e.id === x));
    if (unknown.length) out.warnings.push(`«${name}»: errori sconosciuti (${unknown.join(', ')}), saltati.`);
    if (!Object.keys(goals).length) out.warnings.push(`«${name}»: niente gradini, uso ${CUSTOM_GOALS.B}, ${CUSTOM_GOALS.A} e ${CUSTOM_GOALS.O}.`);
    out.exercises.push({
      id,
      name,
      family: FAMILIES.some((f) => f.id === family) ? family : null,
      level: LEVEL_IDS.includes(level) ? level : null,
      modes: [...new Set((pick(raw, 'formato', 'modes') ?? []).map((m) => MODE_ALIASES[str(m, 20).toLowerCase()]).filter(Boolean))],
      text: str(pick(raw, 'descrizione', 'testo', 'text')),
      quality: str(pick(raw, 'qualita', 'qualità', 'quality')),
      measure: parseMeasure(pick(raw, 'misura', 'measure') ?? {}),
      goals: Object.keys(goals).length ? goals : { ...CUSTOM_GOALS },
      errors: errs.filter((x) => ERRORS.some((e) => e.id === x)),
      strokes: (pick(raw, 'colpi', 'strokes') ?? []).map((x) => str(x, 40)).filter(Boolean)
    });
    rememberEx([given, name, id], id);
  }

  const exRef = (ref, where) => {
    if (ref == null || ref === '') return null;
    const id = exLookup.get(String(ref).toLowerCase().trim());
    if (!id) out.warnings.push(`${where}: non trovo l’esercizio «${ref}», lo salto.`);
    return id ?? null;
  };

  // Percorsi: si possono richiamare per id (anche quello scritto nel file) o per nome.
  const lookup = new Map();
  const remember = (keys, id) => keys.filter(Boolean).forEach((k) => lookup.set(String(k).toLowerCase().trim(), id));
  for (const id of catalog.trackIds) {
    const t = catalog.track(id);
    remember([id, t.name, t.short], id);
  }

  for (const [i, raw] of (pick(data, 'percorsi', 'tracks') ?? []).entries()) {
    const name = str(pick(raw, 'nome', 'name'), 80);
    const levels = (pick(raw, 'livelli', 'levels') ?? []).slice(0, MAX_LEVELS).map((l, n) => {
      const goals = parseGoals(pick(l, 'gradini', 'goals'));
      return {
        name: str(pick(l, 'nome', 'name'), 80) || `Livello ${n + 1}`,
        drill: str(pick(l, 'esercizio', 'drill', 'descrizione')),
        test: str(pick(l, 'test')),
        goal: str(pick(l, 'obiettivo', 'goal')),
        ...(Object.keys(goals).length ? { goals } : {})
      };
    });
    if (!name) {
      out.errors.push(`Percorso ${i + 1}: manca il nome.`);
      continue;
    }
    const sequence = (pick(raw, 'esercizi', 'sequence') ?? []).map((r) => exRef(r, `«${name}»`)).filter(Boolean);
    if (!levels.length && !sequence.length) {
      out.errors.push(`«${name}»: servono gli esercizi in ordine (o i livelli).`);
      continue;
    }
    if ((pick(raw, 'livelli', 'levels') ?? []).length > MAX_LEVELS) out.warnings.push(`«${name}»: tenuti i primi ${MAX_LEVELS} livelli.`);
    const given = pick(raw, 'id');
    const id = customId(given ?? name);
    const side = str(pick(raw, 'lato', 'side'), 1).toUpperCase();
    out.tracks.push({
      id,
      name,
      short: str(pick(raw, 'breve', 'short'), 40) || name,
      side: side === 'D' || side === 'R' ? side : null,
      strokes: (pick(raw, 'colpi', 'strokes') ?? []).map((x) => str(x, 40)).filter(Boolean),
      levels,
      ...(sequence.length ? { sequence } : {})
    });
    remember([given, name, pick(raw, 'breve', 'short'), id], id);
  }

  const trackRef = (ref, where) => {
    if (ref == null || ref === '') return null;
    const id = lookup.get(String(ref).toLowerCase().trim());
    if (!id) out.warnings.push(`${where}: non trovo il percorso «${ref}», lo salto.`);
    return id ?? null;
  };

  for (const [i, raw] of (pick(data, 'mesi', 'blocks') ?? []).entries()) {
    const theme = str(pick(raw, 'tema', 'nome', 'theme', 'name'), 60);
    if (!theme) {
      out.errors.push(`Mese ${i + 1}: manca il tema.`);
      continue;
    }
    const tracks = (pick(raw, 'percorsi', 'tracks') ?? []).map((r) => trackRef(r, `Mese «${theme}»`)).filter(Boolean).slice(0, 3);
    if (!tracks.length) {
      out.errors.push(`Mese «${theme}»: serve almeno un percorso.`);
      continue;
    }
    const serve = str(pick(raw, 'servizi', 'serve'), 8).toUpperCase();
    out.blocks.push({
      id: customId(pick(raw, 'id') ?? theme),
      theme,
      tracks,
      maint: trackRef(pick(raw, 'mantenimento', 'maint'), `Mese «${theme}»`),
      serve: SERVES[serve] ? serve : '1-S',
      scheme: SCHEMES[str(pick(raw, 'schema', 'scheme'), 20)] ? str(pick(raw, 'schema', 'scheme'), 20) : DEFAULT_SCHEME
    });
  }

  for (const [i, raw] of (pick(data, 'allenamenti', 'modelli', 'templates') ?? []).entries()) {
    const name = str(pick(raw, 'nome', 'name'), 60);
    if (!name) {
      out.errors.push(`Allenamento ${i + 1}: manca il nome.`);
      continue;
    }
    const steps = [];
    for (const s of pick(raw, 'passi', 'steps') ?? []) {
      const type = STEP_ALIASES[str(pick(s, 'tipo', 'type'), 20).toLowerCase()];
      if (!type) {
        out.warnings.push(`«${name}»: passo «${pick(s, 'tipo', 'type')}» sconosciuto, saltato.`);
        continue;
      }
      const minutes = Math.max(1, Math.min(180, Math.round(Number(pick(s, 'minuti', 'minutes')) || STEP_TYPES[type].minutes)));
      const step = { type, minutes };
      if (type === 'focus') step.slot = Math.max(1, Math.min(3, Number(pick(s, 'quale', 'slot')) || 1));
      if (type === 'track') {
        step.track = trackRef(pick(s, 'percorso', 'track'), `«${name}»`);
        if (!step.track) continue;
      }
      if (type === 'exercise') {
        step.ex = exRef(pick(s, 'esercizio', 'exercise'), `«${name}»`);
        if (!step.ex) continue;
      }
      if (type === 'free') step.name = str(pick(s, 'nome', 'name'), 60) || 'Esercizio';
      const text = str(pick(s, 'testo', 'text'));
      if (text) step.text = text;
      steps.push(step);
    }
    if (!steps.length) {
      out.errors.push(`«${name}»: nessun passo valido.`);
      continue;
    }
    const color = str(pick(raw, 'colore', 'color'), 12).toLowerCase();
    out.templates.push({ id: customId(pick(raw, 'id') ?? name), name, color: COLORS.includes(color) ? color : 'violet', steps });
  }

  if (!out.exercises.length && !out.tracks.length && !out.blocks.length && !out.templates.length && !out.errors.length) {
    out.errors.push('Nel testo non c’è niente da importare: servono «esercizi», «percorsi», «mesi» o «allenamenti».');
  }
  return out;
}

/** Le istruzioni da dare a un assistente per preparare il file. */
export function importPrompt() {
  return `Preparami un JSON da importare in «Terza palla», un'app di allenamento di tennistavolo.
Rispondi solo con il JSON, in italiano, seguendo questo formato:

${JSON.stringify(IMPORT_EXAMPLE, null, 2)}

Regole:
- «esercizi»: ogni esercizio ha nome, famiglia (${FAMILIES.map((f) => `"${f.id}"`).join(', ')}), livello suggerito (${LEVEL_IDS.map((l) => `"${l}"`).join(', ')}), formato (uno o più fra "da solo", "con compagno", "multiball", "robot"), descrizione, qualità (come deve venire il colpo), errori comuni (2 o 3 fra ${ERRORS.map((e) => `"${e.id}"`).join(', ')}) e colpi allenati.
- «misura»: come si conta. "su" con "n" (10 o 20) e "cosa" si conta; "fila" (quante di fila, con "unita": colpi, scambi, cicli o sequenze); "tempo" (quanti in 30 secondi); "conta" (un numero per seduta).
- «gradini»: le soglie delle medaglie, crescenti: "bronzo", "argento", "oro" e, se serve, "platino". Le medaglie sono solo un traguardo personale: nessun esercizio viene mai bloccato.
- «percorsi»: una sequenza di esercizi dal più guidato al più libero ("esercizi": id o nomi, anche quelli della libreria come "top-d-block" o "ap-d").
- «mesi»: un tema con 1–3 percorsi (per id o per nome; quelli di base sono "1-1" top di dritto, "1-2" apertura di dritto, "2-1" top di rovescio, "2-2" apertura di rovescio, "3-1" servizio e apertura, "3-2" ricezione tagliata), un percorso di mantenimento facoltativo, il lavoro sui servizi ("1-S", "2-S" o "3-S") e lo schema della partitella a schema (${Object.values(SCHEMES).map((x) => `"${x.id}" ${x.name.toLowerCase()}`).join(', ')}).
- «allenamenti»: una scaletta di passi. Tipi: "riscaldamento", "servizi", "mese" (con "quale": 1, 2 o 3 = il percorso del mese in corso), "percorso" (con "percorso": id o nome), "esercizio" (con "esercizio": id o nome), "libero" (con "nome" e "testo"), "partitella". Ogni passo ha "minuti".
- Colori possibili: ${COLORS.join(', ')}.
- Gli "id" sono facoltativi ma utili: reimportando lo stesso id si aggiorna invece di duplicare.`;
}
