import { describe, expect, it } from 'vitest';
import { createPlan, weekAt, weekIndex, weekFor, insertWeek, removeWeek, weekOccurrences, planPhase, defaultSlots, withStages, stageInfo, stagesOf, normalizePlan } from '../src/lib/engine/plan.js';
import { composeSession, composeTest, matchHalves } from '../src/lib/engine/compose.js';
import { drillsFor, weaknesses } from '../src/lib/engine/stats.js';
import { BASE, buildCatalog, exerciseLabel, parseExercise, resolveExercise } from '../src/lib/data/catalog.js';
import { TEMPLATES, templateMinutes } from '../src/lib/data/templates.js';
import { BLOCKS, SCHEMES, CYCLE_BLOCKS } from '../src/lib/data/program.js';

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

describe('mesi senza blocchi', () => {
  it('il mese 3 si apre come gli altri e il recupero allena le due aperture', () => {
    expect(weekAt(plan, 8).block.theme).toBe('Primi colpi');
    const p = insertWeek(plan, 8, 'R');
    const w = weekAt(p, 8);
    expect(w.number).toBeNull();
    const s = composeSession({ week: w, template: completo });
    expect(s.steps.filter((x) => x.kind === 'exercise').map((x) => `${x.track}:${x.ex}`)).toEqual(['1-2:ap-d-multiball', '2-2:ap-r-multiball']);
    expect(weekAt(p, 9).kind).toBe('3');
    expect(plan.gateOk).toBeUndefined();
  });
});

describe('composizione della sessione', () => {
  // Argento nel primo esercizio del top di dritto: il mese propone il secondo.
  const medals = { 'top-d-multiball': { A: '2026-11-17' } };

  it('il modello completo dura 90 minuti in cinque fasi, con un minuto di pausa fra l’una e l’altra', () => {
    const s = composeSession({ week: weekAt(plan, 0), template: completo, medals });
    expect(s.minutes).toBe(90);
    expect(s.steps.map((x) => x.kind)).toEqual(['warmup', 'pause', 'serve', 'pause', 'exercise', 'pause', 'exercise', 'pause', 'match']);
    expect(s.steps.map((x) => x.minutes)).toEqual([10, 1, 14, 1, 24, 1, 24, 1, 14]);
    expect(s.trained).toEqual(['1-1', '1-2']);
    expect(s.exercises).toEqual(['srv-corto-tagliato', 'top-d-block', 'ap-d-multiball']);
  });

  it('propone il primo esercizio della sequenza senza argento, e i servizi del mese', () => {
    const s = composeSession({ week: weekAt(plan, 1), template: completo, medals });
    const [ex1, ex2] = s.steps.filter((x) => x.kind === 'exercise');
    expect(ex1).toMatchObject({ track: '1-1', ex: 'top-d-block', name: 'Top di dritto contro block' });
    expect(ex2).toMatchObject({ track: '1-2', ex: 'ap-d-multiball' });
    expect(s.steps.find((x) => x.kind === 'serve').ex).toBe('srv-corto-tagliato');
    expect(s.steps[0].maint).toBeNull(); // mese 1: niente mantenimento
    expect(s.steps.some((x) => 'test' in x || 'placement' in x)).toBe(false); // niente test dentro l'allenamento
  });

  it('con tutti gli argenti propone il primo senza oro, poi l’ultimo', () => {
    const all = Object.fromEntries(BASE.sequence('1-1').map((id) => [id, { A: 'x' }]));
    expect(composeSession({ week: weekAt(plan, 0), template: completo, medals: all }).steps.find((x) => x.track === '1-1').ex).toBe('top-d-multiball');
    const gold = Object.fromEntries(BASE.sequence('1-1').map((id) => [id, { A: 'x', O: 'y' }]));
    expect(composeSession({ week: weekAt(plan, 0), template: completo, medals: gold }).steps.find((x) => x.track === '1-1').ex).toBe('ric-top');
  });

  it('dal mese 2 il riscaldamento chiude con il mantenimento, senza misura', () => {
    const mid = composeSession({ week: weekAt(plan, 5), template: completo }).steps[0].maint;
    expect(mid).toMatchObject({ track: '1-2', ex: 'ap-d-multiball', minutes: 5 });
    expect(mid.test).toBeUndefined();
    expect(composeSession({ week: weekAt(plan, 8), template: completo }).steps[0].maint.track).toBe('2-2');
  });

  it('un modello personale: percorso fisso, esercizio fisso ed esercizio libero', () => {
    const t = {
      id: 'c1',
      steps: [
        { type: 'track', track: '3-2', minutes: 20 },
        { type: 'exercise', ex: 'ric-flip-r', minutes: 10 },
        { type: 'free', name: 'Multiball', text: 'Palle veloci', minutes: 10 }
      ]
    };
    const s = composeSession({ week: weekAt(plan, 0), template: t });
    expect(s.steps.map((x) => x.kind)).toEqual(['exercise', 'pause', 'exercise', 'pause', 'free']);
    expect(s.steps.map((x) => x.minutes)).toEqual([20, 1, 9, 1, 9]);
    expect(s.steps[0].ex).toBe('ric-taglio-corto');
    expect(s.steps[2]).toMatchObject({ ex: 'ric-flip-r', name: 'Chiquita' });
    expect(s.minutes).toBe(40);
    expect(t.steps.map((x) => x.minutes)).toEqual([20, 10, 10]); // il modello salvato non cambia
  });

  it('Breve e Servizi tengono la loro durata: le pause si aggiungono ai blocchi', () => {
    const breve = composeSession({ week: weekAt(plan, 0), template: TEMPLATES.breve });
    expect(breve.steps.map((x) => x.minutes)).toEqual([10, 1, 19, 1, 19, 1, 9]);
    expect(breve.minutes).toBe(templateMinutes(TEMPLATES.breve));
    const servizi = composeSession({ week: weekAt(plan, 0), template: TEMPLATES.servizi });
    expect(servizi.steps.map((x) => [x.kind, x.minutes])).toEqual([
      ['warmup', 5],
      ['pause', 1],
      ['serve', 19],
      ['pause', 1],
      ['free', 14]
    ]);
    expect(servizi.minutes).toBe(40);
    // Le pause si aggiungono: i blocchi dopo il primo hanno un minuto in meno, il totale resta 90.
    expect(TEMPLATES.completo.blocks.map((x) => x.minutes)).toEqual([10, 14, 24, 24, 14]);
  });

  it('le pause non contano come esercizi né come percorsi allenati', () => {
    const s = composeSession({ week: weekAt(plan, 1), template: completo });
    const pauses = s.steps.filter((x) => x.kind === 'pause');
    expect(pauses).toHaveLength(4);
    expect(pauses.every((x) => !x.ex && !x.track && x.minutes === 1)).toBe(true);
    expect(new Set(s.steps.map((x) => x.id)).size).toBe(s.steps.length);
    expect(s.trained).toEqual(['1-1', '1-2']);
  });

  it('niente pausa prima del primo blocco; un blocco da un minuto resta da un minuto', () => {
    const t = { id: 'c2', steps: [{ type: 'free', name: 'A', minutes: 5 }, { type: 'free', name: 'B', minutes: 1 }, { type: 'match', minutes: 6 }] };
    const s = composeSession({ week: weekAt(plan, 0), template: t });
    expect(s.steps.map((x) => [x.kind, x.minutes])).toEqual([
      ['free', 5],
      ['pause', 1],
      ['free', 1],
      ['pause', 1],
      ['match', 5]
    ]);
    expect(s.minutes).toBe(13); // l'unico caso in cui la durata cresce: un blocco da un minuto non si accorcia
    expect(composeSession({ week: weekAt(plan, 0), template: t, pauses: false }).steps).toHaveLength(3);
  });

  it('la partitella: metà rischiosa, metà a schema, con gli schemi del mese', () => {
    const match = (w) => composeSession({ week: weekAt(plan, w), template: completo }).steps.find((x) => x.kind === 'match');
    expect(match(0)).toMatchObject({ schemes: ['ap-d', 'top-d'], scheme: SCHEMES['ap-d'] });
    expect(match(4).schemes).toEqual(['ap-r', 'top-r']);
    expect(match(8).schemes).toEqual(['terza', 'ric-corta']);
    expect(match(0).rule).toBeUndefined();
    expect(matchHalves(14)).toEqual([7, 7]);
    expect(matchHalves(9)).toEqual([5, 4]);
  });

  it('niente più «punto doppio»: almeno quattro schemi, per ogni mese', () => {
    expect(Object.keys(SCHEMES).length).toBeGreaterThanOrEqual(4);
    for (const b of [...CYCLE_BLOCKS, 'R']) {
      expect(BLOCKS[b].rule).toBeUndefined();
      expect(BLOCKS[b].schemes.every((x) => SCHEMES[x])).toBe(true);
    }
    for (const b of CYCLE_BLOCKS) expect(BLOCKS[b].schemes.every((x) => SCHEMES[x].block === b)).toBe(true);
    expect(JSON.stringify({ BLOCKS, SCHEMES })).not.toMatch(/doppio se/i);
  });

  it('un test: un passo per esercizio, con l’obiettivo aperto', () => {
    const s = composeTest({ exerciseIds: ['top-d-block', 'sparito', 'ric-flip-r'] });
    expect(s.steps.map((x) => [x.ex, x.goal, x.minutes])).toEqual([
      ['top-d-block', true, 5],
      ['ric-flip-r', true, 5]
    ]);
    expect(s.exercises).toEqual(['top-d-block', 'ric-flip-r']);
  });
});

describe('catalogo personale', () => {
  const catalog = buildCatalog({
    tracks: [{ id: 'cflip', name: 'Flip di dritto', short: 'Flip', strokes: ['ric-flip-d'], levels: [{ name: 'Fermo' }, { name: 'Lato', goals: { B: 4, A: 6, O: 8 } }, { name: 'Gioco' }] }],
    exercises: [{ id: 'cmio', name: 'Il mio esercizio', family: 'gambe', level: 'avanzato', measure: { type: 'fila', unit: 'colpi' }, goals: { B: 3, A: 5 } }],
    blocks: [
      { id: 'cm', theme: 'Flip', tracks: ['cflip', '1-1', 'sparito'], serve: '2-S', rule: 'Punto doppio col flip.' },
      { id: 'cn', theme: 'Ricezione', tracks: ['3-2'], scheme: 'ric-corta' }
    ],
    templates: [{ id: 'ct', name: 'Corto', color: 'pink', steps: [{ type: 'focus', slot: 1, minutes: 30 }] }]
  });

  it('i livelli di un percorso personale diventano esercizi, con le soglie di base o le sue', () => {
    expect(catalog.sequence('cflip')).toEqual(['cflip-1', 'cflip-2', 'cflip-3']);
    expect(catalog.exercise('cflip-1')).toMatchObject({ name: 'Flip · Fermo', custom: true, track: 'cflip', measure: { type: 'su', n: 10 }, goals: { B: 6, A: 8, O: 9 } });
    expect(catalog.exercise('cflip-2').goals).toEqual({ B: 4, A: 6, O: 8 });
    expect(catalog.level('cflip', 2).name).toBe('Lato'); // il livello resta leggibile per lo storico
    expect(catalog.exercise('cmio')).toMatchObject({ custom: true, family: 'gambe', level: 'avanzato', goals: { B: 3, A: 5 } });
    expect(catalog.block('cm').tracks).toEqual(['cflip', '1-1']); // i percorsi sconosciuti si scartano
    expect(catalog.block('cm').serve.test).toContain('servizi lunghi');
    // La vecchia regola resta nei dati ma non si usa: vale lo schema di base.
    expect(catalog.block('cm').schemes).toEqual(['ap-d']);
    expect(catalog.block('cn').schemes).toEqual(['ric-corta']);
    expect(catalog.template('sparito').id).toBe('completo');
  });

  it('un mese personale compone la sessione', () => {
    const p = { ...createPlan({ start: '2026-11-16', months: ['cm'] }), id: 'p2' };
    const s = composeSession({ week: weekAt(p, 0, catalog), template: catalog.template('ct'), catalog });
    expect(s.steps[0]).toMatchObject({ track: 'cflip', ex: 'cflip-1' });
  });

  it('esercizi di prima, della libreria e personali', () => {
    expect(parseExercise('1-2-3')).toEqual({ track: '1-2', n: 3 });
    expect(parseExercise('2-S')).toEqual({ serve: '2-S' });
    expect(resolveExercise('1-1-2')).toBe('top-d-block');
    expect(resolveExercise('2-S')).toBe('srv-lungo-veloce');
    expect(exerciseLabel('cflip-2', catalog)).toBe('Flip · Lato');
    expect(exerciseLabel('1-1-2')).toBe('Top di dritto contro block');
    expect(exerciseLabel('3-S')).toBe('Lettura dell’effetto');
    expect(exerciseLabel('multiball')).toBe('Multiball libero');
    expect(drillsFor('ric-flip-d', catalog)).toEqual(expect.arrayContaining(['ric-flip-d', 'flip-d-top', 'cflip-1']));
  });
});

describe('statistiche', () => {
  it('propone tutti gli esercizi che allenano un colpo, prima quelli del tuo livello', () => {
    const all = drillsFor('ap-d');
    expect(all).toEqual(expect.arrayContaining(['ap-d-multiball', 'ap-d', 'top2-d', 'flip-d-top', 'sch-srv-ap']));
    expect(drillsFor('ap-d', BASE, 'intermedio')[0]).toBe('ap-d-multiball');
    expect(drillsFor('ap-d', BASE, 'avanzato').slice().sort()).toEqual(all.slice().sort()); // il livello cambia l'ordine, non l'elenco
    expect(drillsFor('sconosciuto')).toEqual([]);
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
  it('legge l’esempio e collega esercizi, percorsi, mesi e modelli', async () => {
    const { parseImport, IMPORT_EXAMPLE, customId } = await import('../src/lib/data/importer.js');
    const r = parseImport('Ecco il file:\n```json\n' + JSON.stringify(IMPORT_EXAMPLE) + '\n```', BASE);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.exercises[0]).toMatchObject({
      id: 'cflipLaterale'.toLowerCase(),
      family: 'ricezione',
      level: 'avanzato',
      modes: ['compagno'],
      measure: { type: 'su', n: 10, what: 'in campo' },
      goals: { B: 4, A: 6, O: 8 },
      errors: ['rete', 'lunga', 'lettura']
    });
    expect(r.tracks[0]).toMatchObject({ id: 'cflipdritto', side: 'D', sequence: ['ric-flip-d', 'cfliplaterale', 'flip-d-top'] });
    expect(r.blocks[0]).toMatchObject({ id: 'cmeseflip', tracks: ['cflipdritto', '3-2'], maint: '2-2', serve: '1-S', scheme: 'ric-corta' });
    expect(r.blocks[0].rule).toBeUndefined();
    expect(r.templates[0].steps.map((s) => s.type)).toEqual(['warmup', 'focus', 'track', 'exercise', 'free', 'match']);
    expect(r.templates[0].steps[3].ex).toBe('cfliplaterale');
    expect(r.templates[0].color).toBe('pink');
    const cat = buildCatalog({ exercises: r.exercises, tracks: r.tracks, blocks: r.blocks, templates: r.templates });
    expect(cat.sequence('cflipdritto')).toEqual(['ric-flip-d', 'cfliplaterale', 'flip-d-top']);
    expect(cat.exercise('cfliplaterale').name).toBe('Flip sul servizio laterale');
    expect(cat.block('cmeseflip').schemes).toEqual(['ric-corta']);
    expect(customId('Già fatto!')).toBe('cgiafatto');
  });

  it('legge ancora i percorsi a livelli, con i gradini facoltativi', async () => {
    const { parseImport } = await import('../src/lib/data/importer.js');
    const r = parseImport(JSON.stringify({ percorsi: [{ nome: 'Vecchio', livelli: [{ nome: 'Uno', test: '10 palle' }, { nome: 'Due', gradini: { bronzo: 3, argento: 5, oro: 7 } }] }] }), BASE);
    const cat = buildCatalog({ tracks: r.tracks });
    expect(cat.sequence('cvecchio')).toEqual(['cvecchio-1', 'cvecchio-2']);
    expect(cat.exercise('cvecchio-2').goals).toEqual({ B: 3, A: 5, O: 7 });
  });

  it('segnala gli errori senza rompersi', async () => {
    const { parseImport } = await import('../src/lib/data/importer.js');
    expect(parseImport('ciao', BASE).errors).toHaveLength(1);
    const r = parseImport(JSON.stringify({ esercizi: [{ nome: 'Senza gradini', errori: ['inventato'] }], percorsi: [{ nome: 'Senza livelli' }], mesi: [{ tema: 'X', percorsi: ['boh'] }] }), BASE);
    expect(r.errors.length).toBe(2);
    expect(r.exercises[0].goals).toEqual({ B: 6, A: 8, O: 9 });
    expect(r.warnings.join(' ')).toContain('inventato');
    expect(r.warnings.join(' ')).toContain('boh');
  });
});

describe('versioni', () => {
  it('confronta e trova le novità da mostrare', async () => {
    const { compareVersions, unseen, VERSION, CHANGELOG } = await import('../src/lib/data/changelog.js');
    expect(compareVersions('0.10.0', '0.9.0')).toBe(1);
    expect(compareVersions('0.2.0', '0.2.0')).toBe(0);
    expect(CHANGELOG[0].version).toBe(VERSION); // ogni versione ha la sua voce
    expect(unseen('0.5.0').map((c) => c.version)).toEqual([VERSION]);
    expect(unseen('0.4.0').map((c) => c.version)).toEqual([VERSION, '0.5.0']);
    expect(unseen('0.1.0').map((c) => c.version)).toEqual(['0.6.0', '0.5.0', '0.4.0', '0.3.0', '0.2.1', '0.2.0']); // la più recente prima
    expect(unseen(VERSION)).toEqual([]);
  });
});

describe('tappe', () => {
  // Lunedì 16 novembre 2026; allenamenti il martedì e il venerdì.
  const base = { ...createPlan({ start: '2026-11-16', days: [2, 5] }), id: 'pt' };
  const D = (n, u) => ({ b: '1', n, u });
  const R = (n, u) => ({ b: '2', n, u });

  it('il piano di base è fatto di tre tappe da quattro settimane', () => {
    expect(base.stages).toEqual([D(4, 'w'), { b: '2', n: 4, u: 'w' }, { b: '3', n: 4, u: 'w' }]);
    expect(base.weeks.join('')).toBe('111122223333');
  });

  it('una tappa da un allenamento occupa un allenamento della settimana', () => {
    const p = withStages(base, [D(1, 's'), R(1, 's'), { b: '3', n: 2, u: 'w' }]);
    expect(p.weeks).toEqual(['1+2', '3', '3']);
    expect(weekFor(p, '2026-11-17').focusBlock.theme).toBe('Dritto');
    expect(weekFor(p, '2026-11-20').focusBlock.theme).toBe('Rovescio');
    const themes = weekOccurrences(p, weekAt(p, 0)).filter((o) => o.kind === 'training').map((o) => o.week.focusBlock.theme);
    expect(themes).toEqual(['Dritto', 'Rovescio']);
  });

  it('gli allenamenti rimasti nella settimana anticipano la tappa dopo, che conta dal lunedì', () => {
    const p = withStages(base, [D(1, 's'), R(2, 'w')]);
    expect(p.weeks).toEqual(['1+2', '2', '2']);
    const tue = stageInfo(p, '2026-11-17');
    expect(tue.current).toBe(0);
    expect(tue.progress).toMatchObject({ unit: 's', pos: 1, of: 1 });
    const fri = stageInfo(p, '2026-11-20');
    expect(fri.current).toBe(1);
    expect(fri.progress).toMatchObject({ unit: 'w', pos: 0, of: 2, startsOn: '2026-11-23' });
    expect(stageInfo(p, '2026-12-01').progress.pos).toBe(2);
  });

  it('a che punto sei in una tappa di quattro settimane', () => {
    const info = stageInfo(base, '2026-12-02');
    expect(info.current).toBe(0);
    expect(info.progress).toMatchObject({ unit: 'w', pos: 3, of: 4 });
    expect(info.stages.map((s) => s.state)).toEqual(['now', 'next', 'next']);
    expect(info.stages[1].start).toBe('2026-12-14');
  });

  it('una pausa a metà tappa la divide in due; togliendola si ricompone', () => {
    const p = insertWeek(base, 2, 'P');
    expect(p.stages.slice(0, 3)).toEqual([D(2, 'w'), { b: 'P', n: 1, u: 'w' }, D(2, 'w')]);
    expect(removeWeek(p, 2).stages).toEqual(base.stages);
  });

  it('i piani di prima: le tappe si ricavano dalle settimane', () => {
    expect(stagesOf({ weeks: ['1', '1', 'P', '2'] })).toEqual([D(2, 'w'), { b: 'P', n: 1, u: 'w' }, R(1, 'w')]);
  });

  it('cambiando il ritmo gli allenamenti singoli si spostano', () => {
    const p = withStages(base, [D(1, 's'), R(1, 's')]);
    const one = normalizePlan({ ...p, slots: [{ id: 't', day: 3, kind: 'training' }] });
    expect(one.weeks).toEqual(['1', '2']);
  });
});
