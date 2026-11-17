import { describe, expect, it } from 'vitest';
import { createPlan, normalizePlan, weekAt, weekIndex, insertWeek, removeWeek, weekOccurrences, gateStatus, gatePending, planPhase, defaultSlots } from '../src/lib/engine/plan.js';
import { composeSession, composeTest, countTests } from '../src/lib/engine/compose.js';
import { computeTracks } from '../src/lib/engine/levels.js';
import { drillsFor, weaknesses, publicSummary } from '../src/lib/engine/stats.js';
import { BASE, buildCatalog, exerciseLabel, parseExercise } from '../src/lib/data/catalog.js';
import { TEMPLATES } from '../src/lib/data/templates.js';

// 16 novembre 2026 è un lunedì.
const plan = { ...createPlan({ start: '2026-11-18', days: [5, 2] }), id: 'p1' };
const completo = TEMPLATES.completo;

describe('piano', () => {
  it('parte dal lunedì, tre mesi da quattro settimane', () => {
    expect(plan.start).toBe('2026-11-16');
    expect(plan.weeks.join('')).toBe('111122223333');
  });

  it('il ritmo di base: un allenamento per giorno scelto e il test nell’ultimo', () => {
    expect(plan.slots.map((s) => [s.day, s.kind])).toEqual([
      [2, 'training'],
      [5, 'test'],
      [5, 'training']
    ]);
    expect(defaultSlots([1, 3, 4, 6]).filter((s) => s.kind === 'training')).toHaveLength(4);
  });

  it('si possono scegliere i mesi e la loro durata', () => {
    const p = createPlan({ start: '2026-11-16', months: ['2', '1'], weeksPerMonth: 3 });
    expect(p.weeks.join('')).toBe('222111');
    expect(weekAt(p, 0).block.theme).toBe('Rovescio');
  });

  it('trova la settimana da una data', () => {
    expect(weekIndex(plan, '2026-11-15')).toBe(-1);
    expect(weekIndex(plan, '2026-11-16')).toBe(0);
    expect(weekIndex(plan, '2026-11-22')).toBe(0);
    expect(weekIndex(plan, '2026-11-23')).toBe(1);
    expect(planPhase(plan, '2026-11-01')).toBe('before');
    expect(planPhase(plan, '2027-02-07')).toBe('active');
    expect(planPhase(plan, '2027-02-08')).toBe('done');
  });

  it('descrive la settimana', () => {
    const w = weekAt(plan, 4);
    expect(w.kind).toBe('2');
    expect(w.number).toBe(5);
    expect(w.total).toBe(12);
    expect(w.firstOfBlock).toBe(true);
    expect(w.lastOfBlock).toBe(false);
    expect(w.block.theme).toBe('Rovescio');
    expect(weekOccurrences(plan, w).map((o) => o.date)).toEqual(['2026-12-15', '2026-12-18', '2026-12-18']);
    expect(weekAt(plan, 7).lastOfBlock).toBe(true);
    expect(weekAt(plan, 12)).toBeNull();
  });

  it('attraversa il cambio dell’ora senza perdere giorni', () => {
    const p = createPlan({ start: '2026-03-23', days: [1, 7] });
    expect(weekAt(p, 1).monday).toBe('2026-03-30'); // ora legale il 29 marzo
    expect(weekOccurrences(p, weekAt(p, 1)).at(-1).date).toBe('2026-04-05');
  });

  it('una pausa sposta in avanti le settimane successive', () => {
    const p = insertWeek(plan, 2, 'P');
    expect(p.weeks.join('')).toBe('11P1122223333');
    expect(weekAt(p, 2).block).toBeNull();
    expect(weekAt(p, 2).focusBlock.theme).toBe('Dritto'); // ci si può allenare lo stesso
    expect(weekOccurrences(p, weekAt(p, 2))).toEqual([]);
    expect(weekAt(p, 3).number).toBe(3);
    expect(weekAt(p, 3).monday).toBe('2026-12-07');
    expect(removeWeek(p, 2).weeks.join('')).toBe(plan.weeks.join(''));
    expect(removeWeek(plan, 2)).toBe(plan); // le settimane del ciclo non si tolgono
  });

  it('un appuntamento saltato sparisce solo lui', () => {
    const w = weekAt(plan, 0);
    const [first] = weekOccurrences(plan, w);
    const p = { ...plan, skip: [first.key] };
    expect(weekOccurrences(p, w).map((o) => o.key)).not.toContain(first.key);
    expect(weekOccurrences(p, w)).toHaveLength(2);
  });
});

describe('sblocco del mese 3', () => {
  const at = (l12, l22) =>
    computeTracks([{ id: 'a', date: '2026-01-01', tests: [{ track: '1-2', type: 'set', level: l12 }, { track: '2-2', type: 'set', level: l22 }] }]);

  it('servono le due aperture almeno al livello 3', () => {
    expect(gateStatus(at(3, 3)).ok).toBe(true);
    expect(gateStatus(at(4, 2)).ok).toBe(false);
    expect(gateStatus(computeTracks([])).ok).toBe(false);
  });

  it('la domanda compare solo all’inizio del mese 3 e una volta sola', () => {
    const w8 = weekAt(plan, 8);
    expect(gatePending(plan, w8, at(2, 3), [])).toBe(true);
    expect(gatePending(plan, w8, at(3, 3), [])).toBe(false);
    expect(gatePending({ ...plan, gateOk: true }, w8, at(2, 3), [])).toBe(false);
    expect(gatePending(plan, weekAt(plan, 7), at(2, 3), [])).toBe(false);
    const started = [{ kind: 'training', date: '2027-01-12', planId: 'p1' }];
    expect(gatePending(plan, w8, at(2, 3), started)).toBe(false);
  });

  it('la settimana di recupero allena le due aperture', () => {
    const p = insertWeek(plan, 8, 'R');
    const w = weekAt(p, 8);
    expect(w.number).toBeNull();
    const s = composeSession({ week: w, template: completo, tracks: at(2, 3), test: true });
    expect(s.steps.filter((x) => x.kind === 'exercise').map((x) => `${x.track}@${x.level}`)).toEqual(['1-2@2', '2-2@3']);
    expect(weekAt(p, 9).kind).toBe('3');
  });
});

describe('composizione della sessione', () => {
  const tracks = computeTracks([
    {
      id: 'a',
      date: '2026-11-17',
      tests: [
        { track: '1-1', type: 'placement', level: 1, score: 9 },
        { track: '1-1', type: 'placement', level: 2, score: 5 },
        { track: '1-2', type: 'placement', level: 1, score: 3 }
      ]
    }
  ]);

  it('il modello completo dura 90 minuti in cinque fasi', () => {
    const s = composeSession({ week: weekAt(plan, 0), template: completo, tracks });
    expect(s.minutes).toBe(90);
    expect(s.steps.map((x) => x.kind)).toEqual(['warmup', 'serve', 'exercise', 'exercise', 'match']);
    expect(countTests(s)).toBe(0);
    expect(s.trained).toEqual(['1-1', '1-2']);
  });

  it('prende gli esercizi al livello raggiunto; con il test in calendario li misura', () => {
    const s = composeSession({ week: weekAt(plan, 1), template: completo, tracks, test: true });
    const [ex1, ex2] = s.steps.filter((x) => x.kind === 'exercise');
    expect(ex1.exercise.name).toBe('Diagonale fissa');
    expect(ex2.exercise.name).toBe('Multiball');
    expect(ex1.test && ex2.test).toBe(true);
    expect(s.steps[0].maint).toBeNull(); // mese 1: niente mantenimento
    expect(countTests(s)).toBe(3); // servizi + due esercizi
  });

  it('chiede il test di partenza per i percorsi mai iniziati', () => {
    const s = composeSession({ week: weekAt(plan, 4), template: completo, tracks, test: true });
    const ex = s.steps.filter((x) => x.kind === 'exercise');
    expect(ex.every((x) => x.placement && !x.test)).toBe(true);
  });

  it('dal mese 2 aggiunge il mantenimento, misurato solo nell’ultima settimana', () => {
    const mid = composeSession({ week: weekAt(plan, 5), template: completo, tracks, test: true }).steps[0].maint;
    expect(mid).toMatchObject({ track: '1-2', level: 1, test: false });
    expect(composeSession({ week: weekAt(plan, 7), template: completo, tracks, test: true }).steps[0].maint.test).toBe(true);
    expect(composeSession({ week: weekAt(plan, 7), template: completo, tracks }).steps[0].maint.test).toBe(false);
    expect(composeSession({ week: weekAt(plan, 8), template: completo, tracks }).steps[0].maint.track).toBe('2-2');
  });

  it('un modello personale: percorso fisso ed esercizio libero', () => {
    const t = { id: 'c1', steps: [{ type: 'track', track: '3-2', minutes: 20 }, { type: 'free', name: 'Multiball', text: 'Palle veloci', minutes: 10 }] };
    const s = composeSession({ week: weekAt(plan, 0), template: t, tracks });
    expect(s.steps.map((x) => x.kind)).toEqual(['exercise', 'free']);
    expect(s.steps[0].placement).toBe(true);
    expect(s.minutes).toBe(30);
  });

  it('un test da solo: un passo per percorso', () => {
    const s = composeTest({ week: weekAt(plan, 0), trackIds: ['1-1', '2-1'], tracks });
    expect(s.steps.map((x) => [x.track, x.test, x.placement])).toEqual([
      ['1-1', true, false],
      ['2-1', false, true]
    ]);
  });
});

describe('catalogo personale', () => {
  const catalog = buildCatalog({
    tracks: [{ id: 'cflip', name: 'Flip di dritto', short: 'Flip', strokes: ['flip-d'], levels: [{ name: 'Fermo' }, { name: 'Lato' }, { name: 'Gioco' }] }],
    blocks: [{ id: 'cm', theme: 'Flip', tracks: ['cflip', '1-1', 'sparito'], serve: '2-S', rule: 'Punto doppio col flip.' }],
    templates: [{ id: 'ct', name: 'Corto', color: 'pink', steps: [{ type: 'focus', slot: 1, minutes: 30 }] }]
  });

  it('i percorsi personali hanno i loro livelli', () => {
    expect(catalog.maxLevel('cflip')).toBe(3);
    expect(catalog.level('cflip', 2).name).toBe('Lato');
    expect(catalog.maxLevel('1-1')).toBe(5);
    expect(catalog.block('cm').tracks).toEqual(['cflip', '1-1']); // i percorsi sconosciuti si scartano
    expect(catalog.block('cm').serve.test).toContain('servizi lunghi');
    expect(catalog.template('sparito').id).toBe('completo');
  });

  it('il livello sale e si completa sul numero di livelli del percorso', () => {
    const ev = (date, level, score) => ({ id: date, date, tests: [{ track: 'cflip', type: 'test', level, score }] });
    const st = computeTracks([ev('2026-01-01', 3, 9), ev('2026-01-02', 3, 9)], undefined, {}, catalog).cflip;
    expect(st.completed).toBe(true);
    expect(st.level).toBe(3);
  });

  it('un mese personale compone la sessione', () => {
    const p = { ...createPlan({ start: '2026-11-16', months: ['cm'] }), id: 'p2' };
    const tracks = computeTracks([], undefined, {}, catalog);
    const s = composeSession({ week: weekAt(p, 0, catalog), template: catalog.template('ct'), tracks, catalog });
    expect(s.steps[0].track).toBe('cflip');
  });

  it('esercizi e colpi personali', () => {
    expect(parseExercise('1-2-3')).toEqual({ track: '1-2', n: 3 });
    expect(parseExercise('2-S')).toEqual({ serve: '2-S' });
    expect(exerciseLabel('cflip-2', catalog)).toBe('Flip · L2 Lato');
    expect(exerciseLabel('1-1-2')).toBe('Top di dritto · L2 Diagonale fissa');
    expect(drillsFor('flip-d', computeTracks([], undefined, {}, catalog), catalog)).toEqual(['cflip-1']);
  });
});

describe('statistiche', () => {
  const tracks = computeTracks([{ id: 'a', date: '2026-01-01', tests: [{ track: '1-2', type: 'set', level: 2 }] }]);

  it('propone l’esercizio giusto per il colpo da correggere', () => {
    expect(drillsFor('ap-d', tracks)).toEqual(['1-2-2', '3-1-1']);
    expect(drillsFor('top2-d', tracks)[0]).toBe('1-2-3'); // il secondo top entra dal livello 3
    expect(drillsFor('srv-lungo-veloce', tracks)).toEqual(['2-S']);
    expect(drillsFor('sconosciuto', tracks)).toEqual([]);
  });

  it('conta colpi ed errori da correggere', () => {
    const events = [
      { id: 'a', date: '2026-01-01', focus: { stroke: 'ap-d', error: 'rete' } },
      { id: 'b', date: '2026-01-08', focus: { stroke: 'ap-d', error: 'lunga' }, obs: [{ stroke: 'ap-d', error: 'rete' }, { stroke: 'top-r', error: 'ritardo' }] }
    ];
    const w = weaknesses(events);
    expect(w.total).toBe(4);
    expect(w.strokes[0]).toMatchObject({ id: 'ap-d', count: 3 });
    expect(w.strokes[0].errors[0]).toEqual({ id: 'rete', count: 2 });
  });

  it('il profilo pubblico contiene solo livelli e ritmo', () => {
    const events = [{ id: 'a', kind: 'B', date: '2026-01-01', note: 'privata', focus: { stroke: 'ap-d' }, tests: [{ track: '1-2', type: 'set', level: 2 }] }];
    const summary = publicSummary(tracks, events, plan, weekAt(plan, 0));
    expect(summary).toEqual({ levels: { '1-2': 2 }, sessions: 1, lastDate: '2026-01-01', week: 1, block: '1' });
    expect(JSON.stringify(summary)).not.toContain('privata');
  });

  it('il catalogo di base non cambia', () => {
    expect(BASE.trackIds).toEqual(['1-1', '1-2', '2-1', '2-2', '3-1', '3-2']);
  });
});

describe('cambiare il ritmo', () => {
  it('vale da questa settimana: il passato resta com’era', async () => {
    const { withSlots } = await import('../src/lib/engine/plan.js');
    const four = defaultSlots([1, 2, 4, 6]);
    const p = withSlots(plan, four, '2026-12-02'); // mercoledì della settimana 3
    expect(weekOccurrences(p, weekAt(p, 1)).filter((o) => o.kind === 'training')).toHaveLength(2);
    expect(weekOccurrences(p, weekAt(p, 2)).filter((o) => o.kind === 'training')).toHaveLength(4);
    const again = withSlots(p, defaultSlots([3]), '2026-12-03');
    expect(again.pastSlots).toHaveLength(1);
    expect(weekOccurrences(again, weekAt(again, 1)).filter((o) => o.kind === 'training')).toHaveLength(2);
    expect(withSlots(plan, four, '2026-11-10').pastSlots).toBeUndefined(); // prima dell'inizio
  });
});

describe('importazione', () => {
  it('legge l’esempio e collega percorsi, mesi e modelli', async () => {
    const { parseImport, IMPORT_EXAMPLE, customId } = await import('../src/lib/data/importer.js');
    const r = parseImport('Ecco il file:\n```json\n' + JSON.stringify(IMPORT_EXAMPLE) + '\n```', BASE);
    expect(r.errors).toEqual([]);
    expect(r.tracks[0]).toMatchObject({ id: 'cflipdritto', side: 'D' });
    expect(r.tracks[0].levels).toHaveLength(2);
    expect(r.blocks[0]).toMatchObject({ id: 'cmeseflip', tracks: ['cflipdritto', '3-2'], maint: '2-2', serve: '1-S' });
    expect(r.templates[0].steps.map((s) => s.type)).toEqual(['warmup', 'focus', 'track', 'free', 'match']);
    expect(r.templates[0].color).toBe('pink');
    const cat = buildCatalog({ tracks: r.tracks, blocks: r.blocks, templates: r.templates });
    expect(cat.maxLevel('cflipdritto')).toBe(2);
    expect(customId('Già fatto!')).toBe('cgiafatto');
  });

  it('segnala gli errori senza rompersi', async () => {
    const { parseImport } = await import('../src/lib/data/importer.js');
    expect(parseImport('ciao', BASE).errors).toHaveLength(1);
    const r = parseImport(JSON.stringify({ percorsi: [{ nome: 'Senza livelli' }], mesi: [{ tema: 'X', percorsi: ['boh'] }] }), BASE);
    expect(r.errors.length).toBe(2);
    expect(r.warnings[0]).toContain('boh');
  });
});

describe('versioni', () => {
  it('confronta e trova le novità da mostrare', async () => {
    const { compareVersions, unseen, VERSION, CHANGELOG } = await import('../src/lib/data/changelog.js');
    expect(compareVersions('0.10.0', '0.9.0')).toBe(1);
    expect(compareVersions('0.2.0', '0.2.0')).toBe(0);
    expect(CHANGELOG[0].version).toBe(VERSION); // ogni versione ha la sua voce
    expect(unseen('0.1.0').map((c) => c.version)).toEqual([VERSION]);
    expect(unseen(VERSION)).toEqual([]);
  });
});
