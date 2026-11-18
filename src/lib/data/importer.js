// Importazione di percorsi, mesi e modelli da un testo JSON (scritto a mano o da un assistente).
// Il formato è in italiano e perdona: accetta nomi al posto degli id, campi mancanti, testo
// prima e dopo il JSON. Reimportare lo stesso «id» aggiorna invece di duplicare.

import { MAX_LEVELS, SERVES } from './catalog.js';
import { SCHEMES, DEFAULT_SCHEME } from './program.js';
import { COLORS, STEP_TYPES } from './templates.js';

export const IMPORT_EXAMPLE = {
  percorsi: [
    {
      id: 'flip-dritto',
      nome: 'Flip di dritto',
      breve: 'Flip di dritto',
      lato: 'D',
      livelli: [
        {
          nome: 'Palla ferma',
          esercizio: 'Il compagno serve corto senza taglio sempre nello stesso punto. Flip in diagonale.',
          test: '10 servizi: si contano i flip in campo.',
          obiettivo: 'Polso sciolto, palla che passa bassa.'
        },
        {
          nome: 'Due punti',
          esercizio: 'Servizio corto al centro o sul dritto. Flip in diagonale o lungolinea.',
          test: '10 servizi: si contano i flip in campo.',
          obiettivo: 'Stessa qualità dai due punti.'
        }
      ]
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
        { tipo: 'percorso', percorso: '3-2', minuti: 15 },
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

/**
 * @returns { tracks, blocks, templates, errors: string[], warnings: string[] }
 */
export function parseImport(text, catalog) {
  const out = { tracks: [], blocks: [], templates: [], errors: [], warnings: [] };
  let data;
  try {
    data = extractJson(text);
  } catch {
    out.errors.push('Non riesco a leggere il testo: deve essere JSON, come nell’esempio.');
    return out;
  }
  if (Array.isArray(data)) data = { percorsi: data };

  // Percorsi: si possono richiamare per id (anche quello scritto nel file) o per nome.
  const lookup = new Map();
  const remember = (keys, id) => keys.filter(Boolean).forEach((k) => lookup.set(String(k).toLowerCase().trim(), id));
  for (const id of catalog.trackIds) {
    const t = catalog.track(id);
    remember([id, t.name, t.short], id);
  }

  for (const [i, raw] of (pick(data, 'percorsi', 'tracks') ?? []).entries()) {
    const name = str(pick(raw, 'nome', 'name'), 80);
    const levels = (pick(raw, 'livelli', 'levels') ?? []).slice(0, MAX_LEVELS).map((l, n) => ({
      name: str(pick(l, 'nome', 'name'), 80) || `Livello ${n + 1}`,
      drill: str(pick(l, 'esercizio', 'drill', 'descrizione')),
      test: str(pick(l, 'test')),
      goal: str(pick(l, 'obiettivo', 'goal'))
    }));
    if (!name) {
      out.errors.push(`Percorso ${i + 1}: manca il nome.`);
      continue;
    }
    if (!levels.length) {
      out.errors.push(`«${name}»: servono i livelli (almeno uno).`);
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
      levels
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

  if (!out.tracks.length && !out.blocks.length && !out.templates.length && !out.errors.length) {
    out.errors.push('Nel testo non c’è niente da importare: servono «percorsi», «mesi» o «allenamenti».');
  }
  return out;
}

/** Le istruzioni da dare a un assistente per preparare il file. */
export function importPrompt() {
  return `Preparami un JSON da importare in «Terza palla», un'app di allenamento di tennistavolo.
Rispondi solo con il JSON, in italiano, seguendo questo formato:

${JSON.stringify(IMPORT_EXAMPLE, null, 2)}

Regole:
- «percorsi»: un esercizio che progredisce per livelli (da 1 a ${MAX_LEVELS}, di solito 5), dal più guidato al punto giocato. Ogni livello ha nome, esercizio (cosa si fa), test (10 tentativi: cosa si conta) e obiettivo (come deve venire la palla).
- Si sale di livello con due test di fila da almeno 8 su 10 e si scende con 4 o meno: il test deve essere misurabile su 10.
- «lato»: "D" dritto, "R" rovescio, oppure null.
- «mesi»: un tema con 1–3 percorsi (per id o per nome; i percorsi di base sono "1-1" top di dritto, "1-2" apertura di dritto, "2-1" top di rovescio, "2-2" apertura di rovescio, "3-1" servizio e apertura, "3-2" ricezione tagliata), un percorso di mantenimento facoltativo, il lavoro sui servizi ("1-S", "2-S" o "3-S") e lo schema della partitella a schema (${Object.values(SCHEMES).map((x) => `"${x.id}" ${x.name.toLowerCase()}`).join(', ')}).
- «allenamenti»: una scaletta di passi. Tipi: "riscaldamento", "servizi", "mese" (con "quale": 1, 2 o 3 = il percorso del mese in corso), "percorso" (con "percorso": id o nome), "libero" (con "nome" e "testo"), "partitella". Ogni passo ha "minuti".
- Colori possibili: ${COLORS.join(', ')}.
- Gli "id" sono facoltativi ma utili: reimportando lo stesso id si aggiorna invece di duplicare.`;
}
