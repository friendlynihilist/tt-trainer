// Le esportazioni: il CSV del diario (da aprire con Excel o Fogli) e la copia completa in JSON,
// che si può anche rileggere (parseBackup) per ripristinare i dati.
// Funzioni pure: ricevono i dati e i nomi da usare, restituiscono il testo.

import { BASE, exerciseLabel } from '../data/catalog.js';
import { TRIES_PER_DAY } from '../data/library.js';
import { BRICK } from '../data/bricks.js';
import { attemptsOf } from './attempts.js';
import { valueText, size } from './medals.js';
import { byTime, eventTitle } from './events.js';
import { partnerName } from './partner.js';

export const CSV_HEADER = ['Data', 'Tipo', 'Minuti', 'Compagno', 'Misure', 'Colpo', 'Errore', 'Esercizio', 'Sensazione', 'Note'];

const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * Le righe del CSV: le attività del diario e le note per colpo, in ordine di data.
 * @param names { strokeName(id), errorName(id) }
 */
export function diaryRows({ events = [], notes = [], catalog = BASE, names }) {
  const rows = [];
  for (const e of events) {
    if (e.kind === 'livello' || e.planned) continue;
    // Le misure, comprese quelle delle versioni di prima convertite: «esercizio: valore».
    const measures = attemptsOf(e, catalog)
      .map((a) => {
        const ex = catalog.exercise(a.ex);
        const best = a.tries.slice(0, TRIES_PER_DAY[a.fmt] ?? 1).reduce((b, v) => (size(v) > size(b) ? v : b), a.tries[0]);
        return ex ? `${ex.name}: ${valueText(ex, best, a.tier)}` : '';
      })
      .filter(Boolean)
      .join('; ');
    rows.push({
      date: e.date,
      createdAt: e.createdAt ?? 0,
      cells: [e.date, eventTitle(e, catalog), e.minutes ?? '', partnerName(e.partner), measures, names.strokeName(e.focus?.stroke), names.errorName(e.focus?.error), e.focus?.exercise ? exerciseLabel(e.focus.exercise, catalog) : '', e.feel ?? '', e.note ?? '']
    });
  }
  for (const n of notes) {
    rows.push({
      date: n.date,
      createdAt: n.createdAt ?? 0,
      cells: [n.date, n.stroke || n.brick ? 'Nota sul colpo' : 'Nota', '', '', '', names.strokeName(n.stroke) || (BRICK[n.brick]?.name ?? ''), '', n.ex ? exerciseLabel(n.ex, catalog) : '', n.feel ?? '', n.text ?? '']
    });
  }
  return [CSV_HEADER, ...rows.sort(byTime).map((r) => r.cells)];
}

/** Il testo del CSV, con il BOM che fa aprire bene gli accenti a Excel. */
export function diaryCsv(args) {
  return '﻿' + diaryRows(args).map((r) => r.map(cell).join(';')).join('\n');
}

/** La copia completa: impostazioni, piano, attività e note. */
export function backup({ meta, events = [], notes = [], now = new Date() }) {
  return { exportedAt: now.toISOString(), meta, events: [...events].sort(byTime), notes: [...notes].sort(byTime) };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObject = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);

/**
 * Legge una copia completa (il testo del file JSON) e la controlla. Tiene solo le voci e le note
 * ben formate: con un id, una data e, per le voci, un tipo. Due voci con lo stesso id: vale l'ultima.
 * @returns { meta, events, notes, exportedAt, skipped } — `skipped`: quante righe scartate
 * @throws Error con un messaggio da mostrare, se il file non è una copia di Terza palla
 */
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(String(text ?? ''));
  } catch {
    throw new Error('Il file non è una copia di Terza palla: non si riesce a leggerlo.');
  }
  if (!isObject(data) || !Array.isArray(data.events) || !('meta' in data)) {
    throw new Error('Il file non è una copia di Terza palla: mancano le voci del diario.');
  }
  const keep = (list, ok) => {
    const byId = new Map();
    for (const x of list ?? []) if (isObject(x) && typeof x.id === 'string' && x.id && ISO_DATE.test(x.date ?? '') && ok(x)) byId.set(x.id, x);
    return [...byId.values()];
  };
  const events = keep(data.events, (e) => typeof e.kind === 'string' && e.kind);
  const notes = keep(Array.isArray(data.notes) ? data.notes : [], (n) => (typeof n.stroke === 'string' && n.stroke) || (typeof n.brick === 'string' && n.brick) || (typeof n.text === 'string' && n.text.trim()));
  const total = data.events.length + (Array.isArray(data.notes) ? data.notes.length : 0);
  return {
    meta: isObject(data.meta) ? data.meta : null,
    events: events.sort(byTime),
    notes: notes.sort(byTime),
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : null,
    skipped: total - events.length - notes.length
  };
}
