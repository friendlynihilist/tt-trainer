import { describe, expect, it, beforeEach } from 'vitest';
import { makeNote, isValidNote, notesOf, feelSummary, notesForExercise, feelSeries, fmtFeel } from '../src/lib/engine/notes.js';
import { diaryRows, diaryCsv, backup, parseBackup, CSV_HEADER } from '../src/lib/engine/export.js';
import { createLocalBackend } from '../src/lib/store/local.js';
import { LIBRARY_BY_ID } from '../src/lib/data/library.js';
import { STROKE } from '../src/lib/data/taxonomy.js';

// Un localStorage finto: il backend locale è quello vero dell'app.
function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

let n = 0;
const note = (date, stroke, feel, text = 'ok', extra = {}) => makeNote({ id: `n${++n}`, stroke, date, feel, text, createdAt: n, ...extra }, { now: n });

describe('una nota', () => {
  it('ha colpo, famiglia, data, testo e sensazione; esercizio e allenamento sono facoltativi', () => {
    const a = makeNote({ id: 'a', stroke: 'ap-d', date: '2026-11-20', text: '  Sento il polso rigido ', feel: 3 }, { now: 5 });
    expect(a).toEqual({ id: 'a', stroke: 'ap-d', family: 'attacco', date: '2026-11-20', text: 'Sento il polso rigido', feel: 3, createdAt: 5, updatedAt: 5 });
    const b = makeNote({ id: 'b', stroke: 'ap-d', date: '2026-11-20', text: 'x', feel: 9, ex: 'ap-d-multiball', eventId: 'e1' });
    expect(b).toMatchObject({ feel: null, ex: 'ap-d-multiball', eventId: 'e1' });
    expect(makeNote({ id: 'c', stroke: 'cmio', date: '2026-11-20', text: 'x' }, { strokes: { cmio: { family: 'custom' } } }).family).toBe('custom');
  });

  it('serve almeno il testo o la sensazione', () => {
    expect(isValidNote({ stroke: 'ap-d', date: '2026-11-20', text: '', feel: null })).toBe(false);
    expect(isValidNote({ stroke: 'ap-d', date: '2026-11-20', text: '', feel: 4 })).toBe(true);
    expect(isValidNote({ stroke: '', date: '2026-11-20', text: 'x' })).toBe(false);
  });
});

describe('salvataggio, modifica, eliminazione', () => {
  beforeEach(() => {
    globalThis.localStorage = fakeStorage();
  });

  it('nel backend locale, come in Firestore', async () => {
    const be = createLocalBackend();
    let seen = [];
    be.watch('local', { meta: () => {}, events: () => {}, notes: (list) => (seen = list) });
    const a = note('2026-11-20', 'ap-d', 3, 'Prima');
    await be.saveNote('local', a);
    expect(seen).toEqual([a]);
    // Modifica: stesso id, testo e sensazione nuovi; la data di creazione resta.
    const edited = makeNote({ ...a, text: 'Meglio', feel: 4 }, { now: 99 });
    await be.saveNote('local', edited);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ id: a.id, text: 'Meglio', feel: 4, createdAt: a.createdAt, updatedAt: 99 });
    // Resta salvata anche ricaricando.
    const again = createLocalBackend();
    let reloaded = [];
    again.watch('local', { meta: () => {}, events: () => {}, notes: (list) => (reloaded = list) });
    expect(reloaded[0].text).toBe('Meglio');
    // Eliminazione.
    await be.deleteNote('local', a.id);
    expect(seen).toEqual([]);
    // Cancellare tutto toglie anche le note.
    await be.saveNote('local', note('2026-11-21', 'top-d', 2));
    await be.wipe();
    expect(seen).toEqual([]);
  });
});

describe('sensazione', () => {
  const list = [
    note('2026-11-01', 'ap-d', 1),
    note('2026-11-02', 'ap-d', 2),
    note('2026-11-03', 'ap-d', null, 'senza sensazione'),
    note('2026-11-04', 'ap-d', 3),
    note('2026-11-05', 'ap-d', 4),
    note('2026-11-06', 'ap-d', 5),
    note('2026-11-07', 'ap-d', 4),
    note('2026-11-07', 'top-d', 1)
  ];

  it('l’ultima e la media delle ultime 5 (contano solo quelle con la sensazione)', () => {
    expect(feelSummary(list, 'ap-d')).toEqual({ last: 4, lastDate: '2026-11-07', avg: 3.6, count: 5 }); // 4, 5, 4, 3, 2
    expect(feelSummary(list, 'top-d')).toEqual({ last: 1, lastDate: '2026-11-07', avg: 1, count: 1 });
    expect(feelSummary(list, 'block-d')).toBeNull();
    expect(fmtFeel(3.6)).toBe('3,6');
  });

  it('le note di un colpo e di un esercizio, dalla più recente', () => {
    expect(notesOf(list, 'ap-d').map((x) => x.date)[0]).toBe('2026-11-07');
    const ex = LIBRARY_BY_ID['top2-d']; // allena ap-d e top2-d
    expect(notesForExercise(list, ex).map((x) => x.date)).toEqual(['2026-11-07', '2026-11-06', '2026-11-05']);
    expect(notesForExercise(list, ex).every((x) => x.stroke === 'ap-d')).toBe(true);
  });

  it('per i grafici: punti in ordine di tempo, per colpo o per famiglia', () => {
    const s = feelSeries(list, { family: 'attacco' });
    expect(s).toHaveLength(7);
    expect(s[0]).toEqual({ date: '2026-11-01', stroke: 'ap-d', family: 'attacco', feel: 1 });
    expect(feelSeries(list, { stroke: 'top-d' })).toEqual([{ date: '2026-11-07', stroke: 'top-d', family: 'attacco', feel: 1 }]);
    expect(STROKE['top-d'].family).toBe('attacco');
  });
});

describe('esportazione', () => {
  const names = { strokeName: (id) => (id ? STROKE[id]?.name ?? id : ''), errorName: (id) => id ?? '' };
  const events = [{ id: 'e1', kind: 'training', template: 'completo', date: '2026-11-04', minutes: 90, feel: 4, note: 'bene', createdAt: 1, attempts: [{ ex: 'ap-d', fmt: 'su', tries: [8] }] }];
  const notes = [note('2026-11-05', 'ap-d', 3, 'Polso "rigido"', { ex: 'ap-d-multiball' }), note('2026-11-01', 'top-d', null, 'Prima')];

  it('il CSV ha le note per colpo, in ordine di data, con colpo, esercizio e sensazione', () => {
    const rows = diaryRows({ events, notes, names });
    expect(rows[0]).toEqual(CSV_HEADER);
    expect(rows.slice(1).map((r) => [r[0], r[1]])).toEqual([
      ['2026-11-01', 'Nota sul colpo'],
      ['2026-11-04', 'Completo'],
      ['2026-11-05', 'Nota sul colpo']
    ]);
    expect(rows[3]).toEqual(['2026-11-05', 'Nota sul colpo', '', '', '', 'Apertura di dritto su taglio', '', 'Apertura di dritto in multiball', 3, 'Polso "rigido"']);
    expect(rows[2][4]).toBe('Apertura di dritto da palleggio tagliato: 8 su 10 in campo');
    const csv = diaryCsv({ events, notes, names });
    expect(csv.startsWith('﻿"Data"')).toBe(true);
    expect(csv).toContain('"Polso ""rigido"""');
  });

  it('la copia completa contiene le note', () => {
    const b = backup({ meta: { a: 1 }, events, notes, now: new Date('2026-11-20T10:00:00Z') });
    expect(b.notes.map((x) => x.date)).toEqual(['2026-11-01', '2026-11-05']);
    expect(b.events).toHaveLength(1);
    expect(b.exportedAt).toBe('2026-11-20T10:00:00.000Z');
  });
});

describe('ripristino della copia completa', () => {
  const events = [
    { id: 'e1', kind: 'training', template: 'completo', date: '2026-11-04', minutes: 90, createdAt: 1 },
    { id: 'p1', kind: 'test', date: '2026-11-30', planned: true, adhoc: true, createdAt: 2 }
  ];
  const notes = [note('2026-11-05', 'ap-d', 3, 'Polso rigido')];

  it('rilegge quello che la copia ha scritto, comprese le voci in programma', () => {
    const text = JSON.stringify(backup({ meta: { onboarded: true, plan: { id: 'p' } }, events, notes, now: new Date('2026-11-20T10:00:00Z') }));
    const r = parseBackup(text);
    expect(r.meta).toEqual({ onboarded: true, plan: { id: 'p' } });
    expect(r.events).toEqual(events);
    expect(r.notes).toEqual(notes);
    expect(r.exportedAt).toBe('2026-11-20T10:00:00.000Z');
    expect(r.skipped).toBe(0);
  });

  it('scarta le righe rotte e tiene una sola voce per id', () => {
    const r = parseBackup(JSON.stringify({ meta: null, events: [events[0], { id: 'x' }, null, { ...events[0], minutes: 60 }, { id: 'y', date: 'ieri', kind: 'test' }], notes: [{ id: 'n', date: '2026-11-05' }] }));
    expect(r.events).toEqual([{ ...events[0], minutes: 60 }]);
    expect(r.notes).toEqual([]);
    expect(r.meta).toBe(null);
    expect(r.skipped).toBe(5);
  });

  it('rifiuta un file che non è una copia', () => {
    expect(() => parseBackup('ciao')).toThrow(/non è una copia/);
    expect(() => parseBackup('{"esercizi": []}')).toThrow(/non è una copia/);
    expect(() => parseBackup('[]')).toThrow(/non è una copia/);
  });
});
