// I dati salvati con il primo modello (piano A/B, sessioni «A» e «B») devono continuare a valere
// identici: stessi livelli, stessa storia, e il calendario li riconosce come fatti.

import { describe, expect, it } from 'vitest';
import { normalizePlan, weekAt } from '../src/lib/engine/plan.js';
import { normalizeEvent, occurrencesBetween, agenda, fulfillsTest, eventTitle, eventColor } from '../src/lib/engine/events.js';
import { computeTracks } from '../src/lib/engine/levels.js';
import { testsDue, testPlan, suggestSession } from '../src/lib/engine/suggest.js';
import { publicSummary } from '../src/lib/engine/stats.js';

// Esattamente come li scriveva la prima versione.
const legacyPlan = { id: 'pold', start: '2026-11-16', days: { A: 2, B: 5 }, weeks: ['1', '1', '1', '1', '2', '2', '2', '2', '3', '3', '3', '3'], gateOk: false, createdAt: 1 };
const legacyEvents = [
  { id: 'l0', kind: 'livello', date: '2026-11-15', tests: [{ track: '1-1', type: 'set', level: 2 }], createdAt: 1 },
  { id: 'a1', kind: 'A', date: '2026-11-17', planId: 'pold', block: '1', minutes: 90, tests: [{ track: '1-2', type: 'placement', level: 1, score: 9 }, { track: '1-2', type: 'placement', level: 2, score: 4 }], serve: null, note: 'prima', feel: 4, createdAt: 2 },
  { id: 'b1', kind: 'B', date: '2026-11-20', planId: 'pold', block: '1', minutes: 85, tests: [{ track: '1-1', type: 'test', level: 2, score: 9 }, { track: '1-2', type: 'test', level: 2, score: 8 }], serve: { id: '1-S', score: 7 }, createdAt: 3 },
  // settimana 2: A di mercoledì invece che di martedì, B di sabato
  { id: 'a2', kind: 'A', date: '2026-11-25', planId: 'pold', block: '1', minutes: 90, tests: [], createdAt: 4 },
  { id: 'b2', kind: 'B', date: '2026-11-28', planId: 'pold', block: '1', minutes: 90, tests: [{ track: '1-1', type: 'test', level: 2, score: 10 }, { track: '1-2', type: 'test', level: 2, score: 3 }], createdAt: 5 },
  { id: 'x1', kind: 'lezione', date: '2026-11-26', minutes: 60, note: 'lezione', createdAt: 6 }
];

const plan = normalizePlan(legacyPlan);
const events = legacyEvents.map(normalizeEvent);

describe('passaggio dal primo modello', () => {
  it('il piano A/B diventa un ritmo con due allenamenti e il test nel giorno di B', () => {
    expect(plan.slots).toEqual([
      { id: 'A', day: 2, kind: 'training', template: 'completo' },
      { id: 'B-test', day: 5, kind: 'test' },
      { id: 'B', day: 5, kind: 'training', template: 'completo' }
    ]);
    expect(plan.skip).toEqual([]);
    expect(plan.weeks).toEqual(legacyPlan.weeks);
    expect(legacyPlan.slots).toBeUndefined(); // l'originale non si tocca
  });

  it('le sessioni A e B diventano allenamenti senza perdere niente', () => {
    const b1 = events.find((e) => e.id === 'b1');
    expect(b1).toMatchObject({ kind: 'training', template: 'completo', legacy: 'B', withTest: true, trained: ['1-1', '1-2'] });
    expect(b1.tests).toEqual(legacyEvents[2].tests);
    expect(b1.serve).toEqual({ id: '1-S', score: 7 });
    expect(b1.minutes).toBe(85);
    const a1 = events.find((e) => e.id === 'a1');
    expect(a1).toMatchObject({ kind: 'training', legacy: 'A', withTest: false, note: 'prima', feel: 4 });
    expect(events.find((e) => e.id === 'x1')).toBe(legacyEvents[5]); // le altre voci restano identiche
    expect(fulfillsTest(a1)).toBe(false);
    expect(fulfillsTest(b1)).toBe(true);
    expect(eventTitle(b1)).toBe('Completo');
    expect(eventColor(b1)).toBe('blue');
  });

  it('i livelli calcolati sono gli stessi di prima', () => {
    const before = computeTracks(legacyEvents);
    const after = computeTracks(events);
    for (const id of Object.keys(before)) {
      expect(after[id].level).toBe(before[id].level);
      expect(after[id].history).toEqual(before[id].history);
    }
    expect(after['1-1'].level).toBe(3); // 2 + due test da 9 e 10
    expect(after['1-2'].level).toBe(1); // partenza 2, poi 8 e 3: scende
  });

  it('il calendario riconosce come fatte le sessioni già registrate', () => {
    const occ = occurrencesBetween(plan, events, '2026-11-16', '2026-11-29');
    expect(occ.map((o) => `${o.date.slice(8)}${o.kind[1]}:${o.event?.id ?? '-'}`)).toEqual([
      '17r:a1',
      '20e:b1',
      '20r:b1',
      // la A spostata al mercoledì vale per il martedì, la B del sabato per il venerdì
      '24r:a2',
      '27e:b2',
      '27r:b2'
    ]);
    const days = agenda(plan, events, [], '2026-11-16', '2026-11-29');
    for (const d of days.values()) expect(d.todo).toEqual([]);
    expect(days.get('2026-11-26').done.map((e) => e.id)).toEqual(['x1']);
  });

  it('il profilo pubblico conta ancora le sessioni', () => {
    const s = publicSummary(computeTracks(events), events, plan, weekAt(plan, 1));
    expect(s.sessions).toBe(4);
    expect(s.lastDate).toBe('2026-11-28');
  });
});

describe('agenda flessibile', () => {
  const p = normalizePlan({ id: 'p', start: '2026-11-16', weeks: ['1', '1'], slots: [{ id: 't1', day: 1, kind: 'training', template: 'completo' }, { id: 't3', day: 3, kind: 'training', template: 'breve' }, { id: 'x', day: 3, kind: 'test' }] });

  it('un test fatto da solo soddisfa il test previsto; l’allenamento resta da fare', () => {
    const evs = [{ id: 't', kind: 'test', date: '2026-11-18', tests: [{ track: '1-1', type: 'test', level: 1, score: 6 }] }];
    const d = agenda(p, evs, [], '2026-11-18', '2026-11-18').get('2026-11-18');
    expect(d.todo.map((x) => x.kind)).toEqual(['training']);
    expect(d.done.map((x) => x.id)).toEqual(['t']);
  });

  it('un allenamento in più non ne «consuma» uno previsto in un altro giorno', () => {
    const evs = [{ id: 'e', kind: 'training', template: 'breve', date: '2026-11-17' }];
    const occ = occurrencesBetween(p, evs, '2026-11-16', '2026-11-22');
    expect(occ.filter((o) => o.event).length).toBe(0);
  });

  it('un appuntamento aggiunto a mano compare finché non è fatto', () => {
    const planned = [{ id: 'pp', kind: 'partite', date: '2026-11-21', planned: true, adhoc: true }];
    const d = agenda(p, [], planned, '2026-11-21', '2026-11-21').get('2026-11-21');
    expect(d.todo[0]).toMatchObject({ source: 'event', kind: 'partite', eventId: 'pp' });
  });
});

describe('suggeritore', () => {
  const p = normalizePlan(legacyPlan);
  const tracks = computeTracks(events);

  it('propone di misurare i percorsi allenati più volte dall’ultimo test', () => {
    const more = [
      ...events,
      { id: 'c1', kind: 'training', template: 'completo', date: '2026-12-01', trained: ['1-1', '1-2'] },
      { id: 'c2', kind: 'training', template: 'completo', date: '2026-12-02', trained: ['1-1'] }
    ];
    const due = testsDue({ events: more, tracks: computeTracks(more), focus: ['1-1', '1-2'], date: '2026-12-03' });
    expect(due[0]).toMatchObject({ track: '1-1' });
    expect(due[0].reason).toContain('2 allenamenti');
    expect(due.find((d) => d.track === '1-2')).toBeUndefined(); // solo 1 allenamento dopo il test
  });

  it('il test di oggi copre il mese e quello che è maturo', () => {
    const { trackIds } = testPlan({ week: weekAt(p, 4), events, tracks, date: '2026-12-15' });
    expect(trackIds.slice(0, 2)).toEqual(['2-1', '2-2']);
  });

  it('la sessione su misura rispetta il tempo e spiega le scelte', () => {
    const weakEvents = [
      ...events,
      { id: 'w1', kind: 'training', date: '2026-11-30', focus: { stroke: 'ric-taglio-corto' } },
      { id: 'w2', kind: 'training', date: '2026-12-01', focus: { stroke: 'ric-taglio-corto' } }
    ];
    for (const minutes of [45, 60, 90, 120]) {
      const s = suggestSession({ week: weekAt(p, 0), events: weakEvents, tracks, minutes, date: '2026-12-02' });
      expect(s.template.steps.reduce((n, x) => n + x.minutes, 0)).toBe(minutes);
      expect(s.template.steps.some((x) => x.type === 'track' && x.track === '3-2')).toBe(true);
    }
    const s = suggestSession({ week: weekAt(p, 0), events: weakEvents, tracks, minutes: 90, date: '2026-12-02' });
    expect(s.reasons.some((r) => r.startsWith('Correttivo'))).toBe(true);
  });
});
