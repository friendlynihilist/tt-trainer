import { describe, expect, it } from 'vitest';
import { computeTracks, judge, placementResult, DEFAULT_RULES } from '../src/lib/engine/levels.js';

/**
 * Oracolo: le formule del foglio «Diario» riscritte riga per riga.
 * Una riga per settimana, livello della prima riga scelto a mano.
 */
function excelDiary(start, scores, { up, down } = DEFAULT_RULES) {
  const rows = [];
  scores.forEach((F, i) => {
    let E;
    if (i === 0) E = start;
    else {
      const p = rows[i - 1];
      E = p.G === 'Sali' ? Math.min(5, p.E + 1) : p.G === 'Scendi' ? Math.max(1, p.E - 1) : p.E;
    }
    let G;
    if (F <= down && E > 1) G = 'Scendi';
    else if (i === 0) G = 'Resta';
    else if (F < up) G = 'Resta';
    else if (E !== rows[i - 1].E || rows[i - 1].F < up) G = 'Resta';
    else if (E === 5) G = 'Completato';
    else G = 'Sali';
    rows.push({ E, F, G });
  });
  return rows;
}

function engineRun(start, scores, rules = DEFAULT_RULES) {
  const events = [{ id: 'e0', date: '2026-01-01', createdAt: 0, tests: [{ track: '1-1', type: 'set', level: start }] }];
  let level = start;
  const out = [];
  scores.forEach((score, i) => {
    const date = `2026-01-${String(2 + i).padStart(2, '0')}`;
    events.push({ id: `e${i + 1}`, date, createdAt: i + 1, tests: [{ track: '1-1', type: 'test', level, score }] });
    const st = computeTracks(events, rules)['1-1'];
    const h = st.history[st.history.length - 1];
    out.push({ E: h.level, F: score, G: h.outcome });
    level = st.level;
  });
  return out;
}

// Generatore deterministico, così un fallimento è riproducibile.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('regola dei livelli', () => {
  it('coincide con le formule dell’Excel su 3000 mesi casuali', () => {
    const rand = rng(42);
    for (let n = 0; n < 3000; n++) {
      const start = 1 + Math.floor(rand() * 5);
      const len = 1 + Math.floor(rand() * 8);
      // Punteggi sbilanciati verso l'alto, per attraversare spesso le soglie.
      const scores = Array.from({ length: len }, () => Math.min(10, Math.floor(rand() * 13)));
      const expected = excelDiary(start, scores).map((r) => ({ ...r, G: r.G.toLowerCase() }));
      expect(engineRun(start, scores), `start ${start}, punteggi ${scores}`).toEqual(expected);
    }
  });

  it('coincide anche con soglie diverse', () => {
    const rand = rng(7);
    const rules = { up: 7, down: 3 };
    for (let n = 0; n < 1000; n++) {
      const start = 1 + Math.floor(rand() * 5);
      const scores = Array.from({ length: 6 }, () => Math.floor(rand() * 11));
      const expected = excelDiary(start, scores, rules).map((r) => ({ ...r, G: r.G.toLowerCase() }));
      expect(engineRun(start, scores, rules)).toEqual(expected);
    }
  });

  it('sale con due test di fila da 8', () => {
    const r = engineRun(2, [8, 8, 9]);
    expect(r.map((x) => x.G)).toEqual(['resta', 'sali', 'resta']);
    expect(r.map((x) => x.E)).toEqual([2, 2, 3]);
  });

  it('scende con un solo test da 4, ma non sotto il livello 1', () => {
    expect(engineRun(3, [4]).at(-1).G).toBe('scendi');
    expect(engineRun(1, [0]).at(-1).G).toBe('resta');
  });

  it('al livello 5 due test di fila danno «completato»', () => {
    const st = computeTracks([
      { id: 'a', date: '2026-01-01', tests: [{ track: '1-1', type: 'set', level: 5 }] },
      { id: 'b', date: '2026-01-02', tests: [{ track: '1-1', level: 5, score: 9 }] },
      { id: 'c', date: '2026-01-03', tests: [{ track: '1-1', level: 5, score: 8 }] }
    ])['1-1'];
    expect(st.level).toBe(5);
    expect(st.completed).toBe(true);
    expect(st.history.at(-1).outcome).toBe('completato');
  });

  it('un test sotto soglia spezza la serie', () => {
    expect(engineRun(2, [9, 7, 9, 9]).map((x) => x.G)).toEqual(['resta', 'resta', 'resta', 'sali']);
  });
});

describe('test di partenza', () => {
  it('il primo livello sotto 8 è quello di partenza', () => {
    expect(placementResult([{ level: 1, score: 9 }, { level: 2, score: 8 }, { level: 3, score: 5 }])).toEqual({ level: 3, done: true });
    expect(placementResult([{ level: 1, score: 6 }])).toEqual({ level: 1, done: true });
    expect(placementResult([{ level: 1, score: 9 }])).toEqual({ level: 2, done: false });
  });

  it('non conta come primo dei due test per salire', () => {
    const events = [
      {
        id: 'a',
        date: '2026-01-01',
        tests: [
          { track: '1-2', type: 'placement', level: 1, score: 9 },
          { track: '1-2', type: 'placement', level: 2, score: 6 }
        ]
      },
      { id: 'b', date: '2026-01-04', tests: [{ track: '1-2', level: 2, score: 8 }] }
    ];
    const st = computeTracks(events)['1-2'];
    expect(st.started).toBe(true);
    expect(st.level).toBe(2);
    expect(st.streak).toBe(1);
    expect(st.history.at(-1).outcome).toBe('resta');
  });

  it('superati tutti e cinque i livelli si parte dal 5', () => {
    const tests = [1, 2, 3, 4, 5].map((level) => ({ track: '2-1', type: 'placement', level, score: 10 }));
    expect(computeTracks([{ id: 'a', date: '2026-01-01', tests }])['2-1'].level).toBe(5);
  });
});

describe('ricalcolo dalla storia', () => {
  const events = [
    { id: 'a', date: '2026-01-01', tests: [{ track: '1-1', type: 'set', level: 2 }] },
    { id: 'b', date: '2026-01-05', tests: [{ track: '1-1', level: 2, score: 9 }] },
    { id: 'c', date: '2026-01-12', tests: [{ track: '1-1', level: 2, score: 9 }] }
  ];

  it('l’ordine in cui arrivano i dati non conta', () => {
    expect(computeTracks([...events].reverse())['1-1'].level).toBe(3);
  });

  it('correggere un test passato cambia il livello di oggi', () => {
    const fixed = events.map((e) => (e.id === 'b' ? { ...e, tests: [{ track: '1-1', level: 2, score: 6 }] } : e));
    expect(computeTracks(fixed)['1-1'].level).toBe(2);
  });

  it('«before» ed «exclude» guardano il passato', () => {
    expect(computeTracks(events, DEFAULT_RULES, { before: '2026-01-12' })['1-1'].level).toBe(2);
    expect(computeTracks(events, DEFAULT_RULES, { exclude: 'c' })['1-1'].streak).toBe(1);
  });

  it('l’anteprima (judge) non modifica lo stato', () => {
    const st = computeTracks(events.slice(0, 2))['1-1'];
    const snapshot = JSON.stringify(st);
    expect(judge(st, 2, 9).outcome).toBe('sali');
    expect(JSON.stringify(st)).toBe(snapshot);
  });
});
