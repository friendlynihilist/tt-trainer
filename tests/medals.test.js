import { describe, expect, it } from 'vitest';
import { LIBRARY, LIBRARY_BY_ID, KEY_SLOTS, SEQUENCES, LEGACY_LEVELS, SERVE_EXERCISE, LEVEL_IDS, MODES, TIERS } from '../src/lib/data/library.js';
import { FAMILY, STROKE, ERROR } from '../src/lib/data/taxonomy.js';
import { BASE } from '../src/lib/data/catalog.js';
import { medalsFor, allMedals, dayValues, nextGoal, goalText, valueText, newMedals, medalCount, reaches } from '../src/lib/engine/medals.js';
import { levelProgress, suggestLevel, normalizePlayer, currentInSequence, nearGoals, testProposal } from '../src/lib/engine/player.js';
import { composeSession, composeTest } from '../src/lib/engine/compose.js';
import { createPlan, weekAt } from '../src/lib/engine/plan.js';
import { addDays } from '../src/lib/util/dates.js';

const ex = (id) => LIBRARY_BY_ID[id];
let n = 0;
/** Un tentativo: data, esercizio, valori. */
const at = (date, id, ...tries) => ({ ex: id, fmt: ex(id)?.measure?.type, tries, date, eventId: `e${date}`, createdAt: ++n });

describe('libreria', () => {
  it('ha 82 voci complete', () => {
    expect(LIBRARY).toHaveLength(82);
    expect(new Set(LIBRARY.map((e) => e.id)).size).toBe(82);
    for (const e of LIBRARY) {
      expect(FAMILY[e.family], e.id).toBeTruthy();
      expect(LEVEL_IDS, e.id).toContain(e.level);
      expect(e.name && e.text && e.quality && e.source, e.id).toBeTruthy();
      expect(e.modes.length, e.id).toBeGreaterThan(0);
      for (const m of e.modes) expect(MODES.map((x) => x.id), e.id).toContain(m);
      expect(e.errors.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.errors.length, e.id).toBeLessThanOrEqual(3);
      for (const x of e.errors) expect(ERROR[x], `${e.id}: ${x}`).toBeTruthy();
      for (const s of e.strokes) expect(STROKE[s], `${e.id}: ${s}`).toBeTruthy();
    }
  });

  it('i gradini salgono (tranne quelli con una misura loro) e c’è sempre un bronzo', () => {
    for (const e of LIBRARY) {
      const tiers = TIERS.filter((t) => e.goals[t] != null && !e.alt?.[t]);
      if (!e.measure) {
        expect(tiers, e.id).toEqual([]);
        continue;
      }
      expect(tiers.slice(0, 3), e.id).toEqual(['B', 'A', 'O']);
      for (let i = 1; i < tiers.length; i++) {
        const a = [].concat(e.goals[tiers[i - 1]]);
        const b = [].concat(e.goals[tiers[i]]);
        expect(b.every((v, k) => v > a[k]), `${e.id} ${tiers[i]}`).toBe(true);
      }
      if (e.measure.type === 'su') for (const t of tiers) expect([].concat(e.goals[t]).every((v) => v <= e.measure.n), e.id).toBe(true);
    }
  });

  it('per livello: 15 principiante, 27 intermedio, 25 avanzato, 12 esperto, 3 pro, e le famiglie nuove', () => {
    const count = (l) => LIBRARY.filter((e) => e.level === l).length;
    expect(LEVEL_IDS.map(count)).toEqual([15, 27, 25, 12, 3]);
    expect(LIBRARY.filter((e) => e.family === 'palleggio').map((e) => e.id)).toEqual(['palleggio-d', 'palleggio-r', 'palleggio-dr', 'palleggio-30s']);
    expect(ex('ric-flip-r')).toMatchObject({ level: 'esperto', name: 'Chiquita' });
    expect(ex('ric-flip-r-base').level).toBe('avanzato');
    expect(ex('ap-r-multiball').level).toBe('intermedio');
    expect(ex('ombra-gambe').goals).toEqual({});
    // «di fila» conta i tuoi colpi; dove la ricerca dice «scambi totali» si contano quelli di tutti e due.
    expect(ex('taglio-irregolare').measure).toEqual({ type: 'fila', unit: 'scambi' });
    expect(ex('palleggio-30s').measure.unit).toBe('scambi');
    expect(ex('top-d-block').measure.unit).toBe('colpi');
  });

  it('i collegamenti con il primo programma puntano a voci vere', () => {
    for (const ids of [...Object.values(SEQUENCES), ...Object.values(LEGACY_LEVELS), Object.values(SERVE_EXERCISE)]) {
      for (const id of ids) expect(LIBRARY_BY_ID[id], id).toBeTruthy();
    }
    for (const [level, slots] of Object.entries(KEY_SLOTS)) {
      for (const slot of slots) for (const id of slot) expect(ex(id).level, `${level}: ${id}`).toBe(level);
    }
    expect(KEY_SLOTS.intermedio).toHaveLength(10);
  });

  it('esercizi e colpi restano collezioni separate', () => {
    expect(ex('ap-d').name).toBe('Apertura di dritto da palleggio tagliato');
    expect(STROKE['ap-d'].name).toBe('Apertura di dritto su taglio');
    expect(STROKE['top-d-block']).toBeUndefined();
  });
});

describe('medaglie', () => {
  it('su 10: vale la prima serie del giorno, non la migliore', () => {
    const m = medalsFor(ex('ap-d'), [at('2026-01-01', 'ap-d', 6), at('2026-01-01', 'ap-d', 9)]);
    expect(m).toMatchObject({ B: '2026-01-01', A: null, half: null, best: 6, days: 1 });
  });

  it('di fila e a tempo: la migliore dei primi tre tentativi del giorno', () => {
    const m = medalsFor(ex('top-d-block'), [at('2026-01-01', 'top-d-block', 4, 7, 12), at('2026-01-01', 'top-d-block', 25)]);
    expect(m).toMatchObject({ B: '2026-01-01', A: '2026-01-01', half: null, best: 12 });
    const t = medalsFor(ex('palleggio-30s'), [at('2026-01-02', 'palleggio-30s', 14, 21)]);
    expect(t).toMatchObject({ B: '2026-01-02', A: '2026-01-02', O: null });
    expect(dayValues(ex('top-d-block'), [at('2026-01-03', 'top-d-block', 1, 2), at('2026-01-03', 'top-d-block', 3, 30)]).get('2026-01-03')).toBe(3);
  });

  it('l’oro chiede due giorni diversi; due voci nello stesso giorno sono una seduta', () => {
    const same = medalsFor(ex('ap-d'), [at('2026-01-01', 'ap-d', 9), { ...at('2026-01-01', 'ap-d', 9), eventId: 'altra' }]);
    expect(same).toMatchObject({ O: null, half: '2026-01-01' });
    const two = medalsFor(ex('ap-d'), [at('2026-01-01', 'ap-d', 9), at('2026-01-05', 'ap-d', 10)]);
    expect(two).toMatchObject({ O: '2026-01-05', half: null });
  });

  it('le medaglie non si perdono quando i risultati peggiorano', () => {
    const list = [at('2026-01-01', 'ap-d', 9), at('2026-01-02', 'ap-d', 9)];
    const before = medalsFor(ex('ap-d'), list);
    const after = medalsFor(ex('ap-d'), [...list, at('2026-02-01', 'ap-d', 2), at('2026-02-02', 'ap-d', 0)]);
    for (const t of TIERS) expect(after[t]).toBe(before[t]);
    expect(after.last).toEqual({ date: '2026-02-02', value: 0 });
  });

  it('più parti: la soglia vale per tutte', () => {
    const e = ex('srv-regolare');
    expect(medalsFor(e, [at('2026-01-01', 'srv-regolare', [8, 5])])).toMatchObject({ B: null });
    expect(medalsFor(e, [at('2026-01-01', 'srv-regolare', [8, 6])])).toMatchObject({ B: '2026-01-01', A: null });
    expect(valueText(e, [8, 6])).toBe('8 di dritto e 6 di rovescio su 10');
    expect(reaches([12, 8], [12, 8])).toBe(true);
    expect(reaches([20, 7], [12, 8])).toBe(false);
  });

  it('un gradino con una misura sua si prende solo con i suoi tentativi', () => {
    const e = ex('srv-lungo-veloce');
    expect(medalsFor(e, [at('2026-01-01', 'srv-lungo-veloce', 9)])).toMatchObject({ B: '2026-01-01', A: '2026-01-01', P: null });
    const p = medalsFor(e, [{ ...at('2026-01-02', 'srv-lungo-veloce', 5), tier: 'P' }]);
    expect(p).toMatchObject({ P: '2026-01-02', B: null });
    expect(goalText(e, nextGoal(e, p))).toBe('Bronzo: 5 su 10 nell’ultimo terzo');
    expect(goalText(e, { tier: 'P', goal: 5 })).toBe('Platino: 5 su 10 su un foglio A4 nell’angolo');
  });

  it('il prossimo obiettivo è il gradino più basso che manca; il platino non chiede l’oro', () => {
    const e = ex('palleggio-d');
    expect(nextGoal(e, null)).toMatchObject({ tier: 'B', goal: 10 });
    const m = medalsFor(e, [at('2026-01-01', 'palleggio-d', 120)]);
    expect(m).toMatchObject({ B: '2026-01-01', A: '2026-01-01', P: '2026-01-01', O: null, half: '2026-01-01' });
    expect(nextGoal(e, m)).toMatchObject({ tier: 'O', goal: 50, half: true });
    expect(goalText(e, nextGoal(e, m))).toBe('Oro: 50 di fila');
    expect(nextGoal(ex('ombra-gambe'), null)).toBeNull(); // senza medaglie
    expect(valueText(ex('falkenberg'), 5)).toBe('5 cicli di fila');
    expect(valueText(ex('random-dr'), 22)).toBe('22 colpi in 30 secondi');
  });

  it('«da ripassare» dopo 90 giorni senza misure', () => {
    const list = [at('2026-01-01', 'ap-d', 6)];
    expect(medalsFor(ex('ap-d'), list, '2026-03-31').stale).toBe(false);
    expect(medalsFor(ex('ap-d'), list, '2026-04-01').stale).toBe(true);
    expect(medalsFor(ex('ap-d'), [at('2026-01-01', 'ap-d', 2)], '2026-12-01').stale).toBe(false); // nessuna medaglia
  });

  it('conta le medaglie e trova quelle nuove', () => {
    const before = allMedals(BASE, [at('2026-01-01', 'ap-d', 6)]);
    const after = allMedals(BASE, [at('2026-01-01', 'ap-d', 6), at('2026-01-02', 'ap-d', 9), at('2026-01-02', 'chiusura', 5)]);
    expect(newMedals(before, after)).toEqual([
      { ex: 'ap-d', tier: 'A' },
      { ex: 'ap-d', tier: 'O', half: true },
      { ex: 'chiusura', tier: 'B' }
    ]);
    expect(medalCount(after)).toEqual({ B: 2, A: 1, O: 0, P: 0 });
  });
});

describe('livello del giocatore', () => {
  // Tutti gli esercizi chiave di un livello con un valore dato, in giorni diversi.
  function attemptsFor(level, { from = '2026-01-01', step = 5, tier = 'A', twice = false } = {}) {
    const out = [];
    KEY_SLOTS[level].forEach((slot, i) => {
      const e = ex(slot[0]);
      const v = e.goals[tier];
      const date = addDays(from, i * step);
      out.push(at(date, e.id, v));
      if (twice) out.push(at(addDays(date, 1), e.id, v));
    });
    return out;
  }
  const medalsOf = (list) => allMedals(BASE, list);

  it('senza scelta si è principianti', () => {
    expect(normalizePlayer(null)).toMatchObject({ level: 'principiante', chosen: false });
    expect(normalizePlayer({ level: 'esperto' })).toMatchObject({ level: 'esperto', chosen: true });
    expect(normalizePlayer({ level: 'boh' }).level).toBe('principiante');
  });

  it('con copertura, solidità e costanza propone il livello dopo', () => {
    const list = attemptsFor('intermedio', { tier: 'O', twice: true });
    const p = levelProgress({ level: 'intermedio', medals: medalsOf(list), attempts: list });
    expect(p).toMatchObject({ next: 'avanzato', ready: true });
    expect(p.coverage).toMatchObject({ have: 10, need: 8, total: 10, ok: true });
    expect(suggestLevel({ player: { level: 'intermedio' }, medals: medalsOf(list), attempts: list, today: '2026-03-01' })).toMatchObject({ level: 'avanzato' });
  });

  it('una condizione da sola non basta', () => {
    // Solo argenti: manca la solidità (oro nel 40%).
    const silver = attemptsFor('intermedio', { tier: 'A' });
    const p = levelProgress({ level: 'intermedio', medals: medalsOf(silver), attempts: silver });
    expect(p.coverage.ok).toBe(true);
    expect(p.solidity).toMatchObject({ have: 0, need: 4, ok: false });
    expect(p.ready).toBe(false);
    // Tutto in un giorno: manca la costanza.
    const rush = attemptsFor('intermedio', { tier: 'O', step: 0, twice: true });
    const r = levelProgress({ level: 'intermedio', medals: medalsOf(rush), attempts: rush });
    expect(r.consistency).toMatchObject({ sessions: 2, ok: false });
    expect(r.ready).toBe(false);
  });

  it('costanza: 4 sedute su almeno 14 giorni (13 non bastano)', () => {
    const base = attemptsFor('intermedio', { tier: 'O', step: 0, twice: true }).filter((a) => a.date === '2026-01-01');
    const days = (span) => [...base, ...[1, 2, span].map((d, i) => at(addDays('2026-01-01', d), KEY_SLOTS.intermedio[i][0], ex(KEY_SLOTS.intermedio[i][0]).goals.O))];
    const thirteen = days(13);
    const fourteen = days(14);
    expect(levelProgress({ level: 'intermedio', medals: medalsOf(thirteen), attempts: thirteen }).consistency).toMatchObject({ sessions: 4, span: 13, ok: false });
    expect(levelProgress({ level: 'intermedio', medals: medalsOf(fourteen), attempts: fourteen }).consistency).toMatchObject({ sessions: 4, span: 14, ok: true });
  });

  it('un posto «X o Y» vale con una delle voci; ogni famiglia chiede un argento', () => {
    const list = attemptsFor('intermedio', { tier: 'O', twice: true }).filter((a) => a.ex !== 'srv-pendolo');
    list.push(at('2026-01-02', 'srv-rovescio', 8), at('2026-01-09', 'srv-rovescio', 8));
    const p = levelProgress({ level: 'intermedio', medals: medalsOf(list), attempts: list });
    expect(p.coverage).toMatchObject({ have: 10, missing: [] });
    // Senza argenti nei servizi la famiglia manca, anche con il 75% raggiunto.
    const noServe = list.filter((a) => a.ex !== 'srv-rovescio');
    const q = levelProgress({ level: 'intermedio', medals: medalsOf(noServe), attempts: noServe });
    expect(q.coverage).toMatchObject({ have: 9, missing: ['servizio'], ok: false });
    // Il posto misto (gambe o schemi) vale per tutte e due le famiglie.
    const schemi = attemptsFor('intermedio', { tier: 'O', twice: true }).filter((a) => a.ex !== 'pivot');
    schemi.push(at('2026-02-01', 'sch-srv-ap', 9), at('2026-02-03', 'sch-srv-ap', 9));
    expect(levelProgress({ level: 'intermedio', medals: medalsOf(schemi), attempts: schemi }).coverage.missing).toEqual([]);
  });

  it('dopo un rifiuto torna dopo 21 giorni oppure dopo 3 nuovi ori, quello che arriva prima', () => {
    const list = attemptsFor('intermedio', { tier: 'O', twice: true });
    const medals = medalsOf(list);
    const player = { level: 'intermedio', declined: { level: 'avanzato', date: '2026-03-01' } };
    expect(suggestLevel({ player, medals, attempts: list, today: '2026-03-21' })).toBeNull();
    expect(suggestLevel({ player, medals, attempts: list, today: '2026-03-22' })).toMatchObject({ level: 'avanzato' });
    // Tre ori nuovi, su esercizi intermedi, dopo il rifiuto: la proposta torna prima.
    const more = [...list];
    for (const id of ['block-d', 'taglio-corto', 'due-uno']) more.push(at('2026-03-05', id, ex(id).goals.O), at('2026-03-06', id, ex(id).goals.O));
    expect(suggestLevel({ player, medals: medalsOf(more), attempts: more, today: '2026-03-07' })).toMatchObject({ level: 'avanzato' });
    // Due non bastano.
    const two = more.filter((a) => a.ex !== 'due-uno');
    expect(suggestLevel({ player, medals: medalsOf(two), attempts: two, today: '2026-03-07' })).toBeNull();
  });

  it('da pro non c’è niente da proporre', () => {
    const list = attemptsFor('pro', { tier: 'O', twice: true, step: 7 });
    expect(levelProgress({ level: 'pro', medals: medalsOf(list), attempts: list }).next).toBeNull();
    expect(suggestLevel({ player: { level: 'pro' }, medals: medalsOf(list), attempts: list })).toBeNull();
  });
});

describe('proposte', () => {
  it('l’esercizio del mese è il primo della sequenza senza argento', () => {
    expect(currentInSequence('1-1')).toBe('top-d-multiball');
    expect(currentInSequence('1-1', BASE, { 'top-d-multiball': { A: 'x' }, 'top-d-block': { B: 'x' } })).toBe('top-d-block');
  });

  it('obiettivi vicini e test: con il motivo', () => {
    const list = [at('2026-01-01', 'ap-d', 6), at('2026-01-02', 'top-d-block', 9), at('2026-01-03', 'chiusura', 9)];
    const medals = allMedals(BASE, list);
    expect(nearGoals({ medals }).map((x) => x.ex)).toEqual(['top-d-block', 'ap-d']);
    const plan = createPlan({ start: '2026-01-05' });
    const proposal = testProposal({ medals, week: weekAt(plan, 0), level: 'intermedio', events: [{ id: 'x', date: '2026-01-04', exercises: ['pivot'] }, { id: 'y', date: '2026-01-05', exercises: ['pivot'] }] });
    expect(proposal.map((p) => p.ex)).toEqual(['top-d-multiball', 'ap-d-multiball', 'chiusura', 'top-d-block', 'ap-d']);
    expect(proposal.find((p) => p.ex === 'chiusura').reason).toBe('Metà oro: serve un’altra seduta');
    expect(proposal.find((p) => p.ex === 'top-d-block').reason).toBe('Vicino all’argento');
    expect(testProposal({ medals, events: [{ id: 'x', date: '2026-01-04', exercises: ['pivot'] }, { id: 'y', date: '2026-01-05', exercises: ['pivot'] }] })[3]).toEqual({ ex: 'pivot', reason: 'Fatto 2 volte senza misurarlo' });
  });
});

describe('niente blocca niente', () => {
  it('ogni esercizio si mette in una sessione e in un test, con qualsiasi medaglia e livello', () => {
    const ids = LIBRARY.map((e) => e.id);
    const t = composeTest({ exerciseIds: ids });
    expect(t.steps).toHaveLength(ids.length);
    const tpl = { id: 'c', steps: ids.map((id) => ({ type: 'exercise', ex: id, minutes: 5 })) };
    const all = Object.fromEntries(ids.map((id) => [id, { B: 'x', A: 'x', O: 'x', P: 'x' }]));
    for (const medals of [{}, all]) {
      const s = composeSession({ week: null, template: tpl, medals });
      expect(s.steps.filter((x) => x.kind === 'exercise').map((x) => x.ex)).toEqual(ids);
    }
  });

  it('il livello cambia solo cosa proporre, mai cosa è disponibile', () => {
    for (const level of LEVEL_IDS) {
      expect(BASE.activeExerciseIds.length).toBe(LIBRARY.length);
      expect(testProposal({ level }).every((p) => BASE.exercise(p.ex))).toBe(true);
    }
  });
});
