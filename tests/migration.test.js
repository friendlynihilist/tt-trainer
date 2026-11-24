// I dati salvati con le versioni di prima devono continuare a valere: le voci non si riscrivono,
// i test sui percorsi diventano tentativi sugli esercizi, il calendario li riconosce come fatti.

import { describe, expect, it } from 'vitest';
import { normalizePlan } from '../src/lib/engine/plan.js';
import { normalizeEvent, occurrencesBetween, agenda, fulfillsTest, eventTitle, eventColor, serveScore } from '../src/lib/engine/events.js';
import { allAttempts, attemptsOf, longestRun, upgradeDraft } from '../src/lib/engine/attempts.js';
import { allMedals } from '../src/lib/engine/medals.js';
import { buildCatalog, exerciseLabel } from '../src/lib/data/catalog.js';

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

// Come li scriveva la 0.2.x: allenamenti con modello, test a parte, percorsi personali, «Su misura».
const custom = { tracks: [{ id: 'cflip', name: 'Flip di dritto', short: 'Flip', levels: [{ name: 'Fermo' }, { name: 'Lato' }] }] };
const v02Events = [
  { id: 'n1', kind: 'training', template: 'completo', date: '2026-12-01', withTest: true, trained: ['1-1', '1-2'], tests: [{ track: '1-1', type: 'test', level: 3, score: 8, marks: '1110111111' }], serve: null, createdAt: 10 },
  {
    id: 'n2',
    kind: 'test',
    date: '2026-12-02',
    tests: [
      { track: '2-2', type: 'maint', level: 2, score: 9 },
      { track: 'cflip', type: 'test', level: 1, score: 8 },
      { track: '3-1', type: 'placement', level: 1, score: 7 }
    ],
    serve: { id: '2-S', score: 6 },
    createdAt: 11
  },
  { id: 'n3', kind: 'training', template: 'auto', date: '2026-12-03', minutes: 75, focus: { stroke: 'ap-d', exercise: '1-2-2' }, createdAt: 12 },
  { id: 'n4', kind: 'training', template: 'breve', date: '2026-12-04', withTest: true, tests: [{ track: '2-1', type: 'test', level: 2, score: 7 }], createdAt: 13 }
];

const freeze = (x) => JSON.parse(JSON.stringify(x));
const plan = normalizePlan(legacyPlan);
const events = legacyEvents.map(normalizeEvent);
const catalog = buildCatalog(custom);

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
    expect(serveScore(b1)).toBe(7);
  });

  it('i test diventano tentativi sugli esercizi corrispondenti', () => {
    const list = allAttempts(events).map((a) => `${a.date.slice(8)} ${a.ex} ${a.tries.join(',')}`);
    expect(list).toEqual([
      '17 ap-d-multiball 9', // test di partenza, livello 1
      '17 ap-d 4', // test di partenza, livello 2
      // 1-1 livello 2 è «di fila»: 9 su 10 senza segni non dice quante di fila, quindi resta nello storico
      '20 ap-d 8',
      '20 srv-corto-tagliato 7', // i servizi del mese 1
      '28 top-d-block 10', // 10 su 10 senza segni = 10 di fila
      '28 ap-d 3'
    ]);
    // Il livello impostato a mano non è un tentativo.
    expect(attemptsOf(events[0])).toEqual([]);
    // Da dove viene ogni tentativo resta scritto.
    expect(attemptsOf(events[2])[0].legacy).toEqual({ track: '1-2', level: 2, score: 8, type: 'test' });
  });

  it('e contano per le medaglie', () => {
    const m = allMedals(catalog, allAttempts(events), '2026-12-01');
    expect(m['ap-d-multiball']).toMatchObject({ B: '2026-11-17', A: '2026-11-17', O: null, half: '2026-11-17', best: 9 });
    expect(m['ap-d']).toMatchObject({ B: '2026-11-20', A: '2026-11-20', O: null, best: 8, days: 3 });
    expect(m['top-d-block']).toMatchObject({ B: '2026-11-28', A: '2026-11-28', O: null });
    expect(m['srv-corto-tagliato']).toMatchObject({ B: '2026-11-20', A: '2026-11-20' });
  });

  it('il calendario riconosce come fatte le sessioni già registrate', () => {
    const occ = occurrencesBetween(plan, events, '2026-11-16', '2026-11-29');
    expect(occ.map((o) => `${o.date.slice(8)}${o.kind[1]}:${o.event?.id ?? '-'}`)).toEqual(['17r:a1', '20e:b1', '20r:b1', '24r:a2', '27e:b2', '27r:b2']);
    const days = agenda(plan, events, [], '2026-11-16', '2026-11-29');
    for (const d of days.values()) expect(d.todo).toEqual([]);
    expect(days.get('2026-11-26').done.map((e) => e.id)).toEqual(['x1']);
  });

  it('nessuna voce viene modificata', () => {
    const before = freeze(legacyEvents);
    allMedals(catalog, allAttempts(legacyEvents.map(normalizeEvent)));
    expect(legacyEvents).toEqual(before);
  });
});

describe('passaggio dalla 0.2.x', () => {
  const all = v02Events.map(normalizeEvent);

  it('allenamenti, test, mantenimento, percorsi personali e servizi diventano tentativi', () => {
    const list = allAttempts(all, catalog).map((a) => `${a.eventId} ${a.ex} ${a.tries.join(',')}`);
    expect(list).toEqual([
      'n1 top-d-due-punti 6', // «di fila»: la serie più lunga nei segni 1110111111
      'n2 ap-r 9', // mantenimento
      'n2 cflip-1 8', // percorso personale
      'n2 sch-srv-ap-top2 7', // test di partenza di servizio e apertura
      'n2 srv-lungo-veloce 6', // servizi del mese 2
      // n4: 7 su 10 «di fila» senza segni resta nello storico
    ]);
    expect(longestRun('1101111111')).toBe(7);
    expect(longestRun('')).toBe(0);
  });

  it('le voci si leggono come prima', () => {
    const n3 = all.find((e) => e.id === 'n3');
    expect(eventTitle(n3, catalog)).toBe('Su misura');
    expect(eventColor(n3, catalog)).toBe('plum');
    expect(exerciseLabel(n3.focus.exercise, catalog)).toBe('Apertura di dritto da palleggio tagliato');
    expect(fulfillsTest(all.find((e) => e.id === 'n1'))).toBe(true); // il passato del calendario non cambia
    expect(all).toEqual(v02Events); // nessuna voce della 0.2 cambia in lettura
  });

  it('le medaglie degli esercizi personali usano le soglie di base', () => {
    const m = allMedals(catalog, allAttempts(all, catalog), '2026-12-05');
    expect(m['cflip-1']).toMatchObject({ B: '2026-12-02', A: '2026-12-02', O: null });
    expect(m['ap-r']).toMatchObject({ B: '2026-12-02', A: '2026-12-02', half: '2026-12-02' });
    expect(m['top-d-due-punti']).toMatchObject({ B: '2026-12-01', A: null });
  });

  it('una sessione dal vivo lasciata a metà si riprende e tiene i test già contati', () => {
    const old = {
      mode: 'training',
      template: 'completo',
      title: 'Completo',
      date: '2026-12-05',
      step: 3,
      timers: {},
      tests: { '1-2': { marks: [1, 1, 0, 1, 1, 1, 1, 1, 1, 1], score: 9 }, serve: { marks: [], score: 6 } },
      placement: { '1-1': { tries: [{ level: 1, marks: [], score: 9 }, { level: 2, marks: [], score: 5 }], set: null } },
      session: {
        block: { id: '1', serve: { id: '1-S' } },
        minutes: 90,
        steps: [
          { id: 'warmup0', kind: 'warmup', minutes: 10, maint: null },
          { id: 'serve1', kind: 'serve', minutes: 15, serve: { id: '1-S' }, test: true, asked: true },
          { id: 'focus2', kind: 'exercise', track: '1-1', level: 1, placement: true, test: false, minutes: 25 },
          { id: 'focus3', kind: 'exercise', track: '1-2', level: 2, placement: false, test: true, minutes: 25 }
        ]
      }
    };
    const d = upgradeDraft(freeze(old), catalog);
    expect(d.session.steps.map((s) => s.ex ?? null)).toEqual([null, 'srv-corto-tagliato', 'top-d-multiball', 'ap-d']);
    expect(d.session.steps.some((s) => s.test || s.placement)).toBe(false);
    expect(d.legacyTests).toEqual({
      tests: [
        { track: '1-1', type: 'placement', level: 1, score: 9, marks: '' },
        { track: '1-1', type: 'placement', level: 2, score: 5, marks: '' },
        { track: '1-2', type: 'test', level: 2, score: 9, marks: '1101111111' }
      ],
      serve: { id: '1-S', score: 6 }
    });
    expect(d.attempts).toEqual({});
    // Una bozza già nuova non si tocca.
    expect(upgradeDraft(d, catalog)).toBe(d);
  });
});

describe('agenda flessibile', () => {
  const p = normalizePlan({ id: 'p', start: '2026-11-16', weeks: ['1', '1'], slots: [{ id: 't1', day: 1, kind: 'training', template: 'completo' }, { id: 't3', day: 3, kind: 'training', template: 'breve' }, { id: 'x', day: 3, kind: 'test' }] });

  it('un test fatto da solo soddisfa il test previsto; l’allenamento resta da fare', () => {
    const evs = [{ id: 't', kind: 'test', date: '2026-11-18', attempts: [{ ex: 'top-d-block', fmt: 'fila', tries: [6] }] }];
    const d = agenda(p, evs, [], '2026-11-18', '2026-11-18').get('2026-11-18');
    expect(d.todo.map((x) => x.kind)).toEqual(['training']);
    expect(d.done.map((x) => x.id)).toEqual(['t']);
  });

  it('dalla 0.3 un allenamento con obiettivi provati non sostituisce il test', () => {
    const evs = [{ id: 'e', kind: 'training', template: 'breve', date: '2026-11-18', attempts: [{ ex: 'ap-d', fmt: 'su', tries: [8] }] }];
    const d = agenda(p, evs, [], '2026-11-18', '2026-11-18').get('2026-11-18');
    expect(d.todo.map((x) => x.kind)).toEqual(['test']);
  });

  it('una lezione, delle partite o un torneo fatti quel giorno coprono l’allenamento in programma', () => {
    for (const kind of ['lezione', 'partite', 'torneo', 'servizi', 'altro']) {
      const evs = [{ id: 'l', kind, date: '2026-11-16', minutes: 60 }];
      const d = agenda(p, evs, [], '2026-11-16', '2026-11-16').get('2026-11-16');
      expect([kind, d.todo.length, d.done.map((x) => x.id)]).toEqual([kind, 0, ['l']]);
    }
  });

  it('ma solo quello dello stesso giorno, e uno per attività', () => {
    // La lezione di martedì non copre l'allenamento di lunedì né quello di mercoledì.
    const evs = [{ id: 'l', kind: 'lezione', date: '2026-11-17', minutes: 60 }];
    const occ = occurrencesBetween(p, evs, '2026-11-16', '2026-11-22');
    expect(occ.filter((o) => o.event).length).toBe(0);
    // Mercoledì ci sono un allenamento e un test: la lezione copre l'allenamento, il test resta.
    const wed = agenda(p, [{ id: 'l', kind: 'lezione', date: '2026-11-18', minutes: 60 }], [], '2026-11-18', '2026-11-18').get('2026-11-18');
    expect(wed.todo.map((x) => x.kind)).toEqual(['test']);
    // Due allenamenti in programma lo stesso giorno e una sola lezione: uno resta da fare.
    const two = normalizePlan({ id: 'q', start: '2026-11-16', weeks: ['1'], slots: [{ id: 'a', day: 1, kind: 'training', template: 'completo' }, { id: 'b', day: 1, kind: 'training', template: 'breve' }] });
    expect(agenda(two, [{ id: 'l', kind: 'lezione', date: '2026-11-16' }], [], '2026-11-16', '2026-11-16').get('2026-11-16').todo.length).toBe(1);
  });

  it('una lezione in programma, non ancora fatta, non copre niente', () => {
    const d = agenda(p, [], [{ id: 'l', kind: 'lezione', date: '2026-11-16', planned: true }], '2026-11-16', '2026-11-16').get('2026-11-16');
    expect(d.todo.map((x) => x.kind).sort()).toEqual(['lezione', 'training']);
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
