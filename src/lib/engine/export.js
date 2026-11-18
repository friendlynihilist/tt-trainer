// Le esportazioni: il CSV del diario (da aprire con Excel o Fogli) e la copia completa in JSON.
// Funzioni pure: ricevono i dati e i nomi da usare, restituiscono il testo.

import { BASE, exerciseLabel } from '../data/catalog.js';
import { TRIES_PER_DAY } from '../data/library.js';
import { attemptsOf } from './attempts.js';
import { valueText, size } from './medals.js';
import { byTime, eventTitle } from './events.js';

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
      cells: [e.date, eventTitle(e, catalog), e.minutes ?? '', e.partner?.name ?? '', measures, names.strokeName(e.focus?.stroke), names.errorName(e.focus?.error), e.focus?.exercise ? exerciseLabel(e.focus.exercise, catalog) : '', e.feel ?? '', e.note ?? '']
    });
  }
  for (const n of notes) {
    rows.push({
      date: n.date,
      createdAt: n.createdAt ?? 0,
      cells: [n.date, 'Nota sul colpo', '', '', '', names.strokeName(n.stroke), '', n.ex ? exerciseLabel(n.ex, catalog) : '', n.feel ?? '', n.text ?? '']
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
