import { describe, expect, it } from 'vitest';
import { createPlan, weekAt, weekIndex, insertWeek, removeWeek, nextSlot, plannedBetween, gateStatus, gatePending, planPhase } from '../src/lib/engine/plan.js';
import { composeSession, countTests } from '../src/lib/engine/compose.js';
import { computeTracks } from '../src/lib/engine/levels.js';
import { drillsFor, weaknesses, publicSummary } from '../src/lib/engine/stats.js';

// 16 novembre 2026 è un lunedì.
const plan = { ...createPlan({ start: '2026-11-18', days: { A: 5, B: 2 } }), id: 'p1' };

describe('piano', () => {
  it('parte dal lunedì e mette A prima di B', () => {
    expect(plan.start).toBe('2026-11-16');
    expect(plan.days).toEqual({ A: 2, B: 5 });
    expect(plan.weeks.join('')).toBe('111122223333');
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
    expect(w.dates).toEqual({ A: '2026-12-15', B: '2026-12-18' });
    expect(weekAt(plan, 7).lastOfBlock).toBe(true);
    expect(weekAt(plan, 12)).toBeNull();
  });

  it('attraversa il cambio dell’ora senza perdere giorni', () => {
    const p = createPlan({ start: '2026-03-23', days: { A: 1, B: 7 } });
    expect(weekAt(p, 1).monday).toBe('2026-03-30'); // ora legale il 29 marzo
    expect(weekAt(p, 1).dates.B).toBe('2026-04-05');
  });

  it('una pausa sposta in avanti le settimane successive', () => {
    const p = insertWeek(plan, 2, 'P');
    expect(p.weeks.join('')).toBe('11P1122223333');
    expect(weekAt(p, 2).block).toBeNull();
    expect(weekAt(p, 3).number).toBe(3);
    expect(weekAt(p, 3).monday).toBe('2026-12-07');
    expect(removeWeek(p, 2).weeks.join('')).toBe(plan.weeks.join(''));
    expect(removeWeek(plan, 2)).toBe(plan); // le settimane del ciclo non si tolgono
  });

  it('sa quale sessione tocca', () => {
    const w = weekAt(plan, 0);
    expect(nextSlot([], w)).toBe('A');
    expect(nextSlot([{ kind: 'A', date: '2026-11-17' }], w)).toBe('B');
    expect(nextSlot([{ kind: 'A', date: '2026-11-17' }, { kind: 'B', date: '2026-11-21' }], w)).toBeNull();
    expect(nextSlot([{ kind: 'lezione', date: '2026-11-17' }], w)).toBe('A');
    expect(nextSlot([{ kind: 'A', date: '2026-11-24' }], w)).toBe('A'); // è della settimana dopo
  });

  it('elenca le sessioni previste in un intervallo', () => {
    const list = plannedBetween(plan, '2026-11-01', '2026-11-30');
    expect(list.map((s) => `${s.slot}${s.date.slice(8)}`)).toEqual(['A17', 'B20', 'A24', 'B27']);
  });
});

describe('sblocco del mese 3', () => {
  const at = (l12, l22) =>
    computeTracks([
      { id: 'a', date: '2026-01-01', tests: [{ track: '1-2', type: 'set', level: l12 }, { track: '2-2', type: 'set', level: l22 }] }
    ]);

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
    const started = [{ kind: 'A', date: w8.dates.A, planId: 'p1' }];
    expect(gatePending(plan, w8, at(2, 3), started)).toBe(false);
  });

  it('la settimana di recupero allena le due aperture', () => {
    const p = insertWeek(plan, 8, 'R');
    const w = weekAt(p, 8);
    expect(w.number).toBeNull();
    const s = composeSession({ week: w, slot: 'B', tracks: at(2, 3) });
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

  it('dura 90 minuti in cinque fasi', () => {
    const s = composeSession({ week: weekAt(plan, 0), slot: 'A', tracks });
    expect(s.minutes).toBe(90);
    expect(s.steps.map((x) => x.id)).toEqual(['warmup', 'serve', 'ex1', 'ex2', 'match']);
    expect(countTests(s)).toBe(0);
  });

  it('prende gli esercizi al livello raggiunto', () => {
    const s = composeSession({ week: weekAt(plan, 1), slot: 'B', tracks });
    const [ex1, ex2] = s.steps.filter((x) => x.kind === 'exercise');
    expect(ex1.exercise.name).toBe('Diagonale fissa');
    expect(ex2.exercise.name).toBe('Multiball');
    expect(ex1.test && ex2.test).toBe(true);
    expect(s.steps[0].maint).toBeNull(); // mese 1: niente mantenimento
    expect(countTests(s)).toBe(3); // servizi + due esercizi
  });

  it('chiede il test di partenza per i percorsi mai iniziati', () => {
    const s = composeSession({ week: weekAt(plan, 4), slot: 'B', tracks });
    const ex = s.steps.filter((x) => x.kind === 'exercise');
    expect(ex.every((x) => x.placement && !x.test)).toBe(true);
  });

  it('dal mese 2 aggiunge il mantenimento, con test solo nell’ultima settimana in B', () => {
    const mid = composeSession({ week: weekAt(plan, 5), slot: 'B', tracks }).steps[0].maint;
    expect(mid).toMatchObject({ track: '1-2', level: 1, test: false });
    expect(composeSession({ week: weekAt(plan, 7), slot: 'B', tracks }).steps[0].maint.test).toBe(true);
    expect(composeSession({ week: weekAt(plan, 7), slot: 'A', tracks }).steps[0].maint.test).toBe(false);
    expect(composeSession({ week: weekAt(plan, 8), slot: 'A', tracks }).steps[0].maint.track).toBe('2-2');
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
});
