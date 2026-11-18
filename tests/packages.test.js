import { describe, expect, it } from 'vitest';
import { PACKAGES, packagesOf, MATCH_VARIANTS, packageId } from '../src/lib/data/packages.js';
import { LIBRARY_BY_ID, LEVEL_IDS } from '../src/lib/data/library.js';
import { TEMPLATES, normalizeTemplate, templateMinutes, stepToBlock } from '../src/lib/data/templates.js';
import { BASE, buildCatalog } from '../src/lib/data/catalog.js';
import { composeSession, templateWithOverrides, replaceStepExercise, splitMinutes } from '../src/lib/engine/compose.js';
import { createPlan, weekAt } from '../src/lib/engine/plan.js';

const plan = { ...createPlan({ start: '2026-11-16' }), id: 'p1' };
const week = weekAt(plan, 0);
const work = (steps) => steps.filter((s) => s.kind !== 'pause');

describe('pacchetti per livello', () => {
  it('due per livello, da 90 e da 60 minuti', () => {
    expect(Object.keys(PACKAGES)).toHaveLength(10);
    for (const level of LEVEL_IDS) expect(packagesOf(level).map((p) => p.minutes)).toEqual([90, 60]);
  });

  it('blocchi da 85 e 56 minuti: con le pause fanno 90 e 60', () => {
    for (const p of Object.values(PACKAGES)) {
      const blocks = p.blocks.reduce((n, b) => n + b.minutes, 0);
      expect(blocks, p.id).toBe(p.minutes === 90 ? 85 : 56);
      expect(p.blocks.some((b) => b.role === 'pause' || /pausa/i.test(b.name)), p.id).toBe(false); // le pause non stanno nel pacchetto
      expect(templateMinutes(p), p.id).toBe(p.minutes);
      const s = composeSession({ week, template: p });
      expect(s.minutes, p.id).toBe(p.minutes);
      expect(s.steps.filter((x) => x.kind === 'pause'), p.id).toHaveLength(p.blocks.length - 1);
      expect(work(s.steps).reduce((n, x) => n + x.minutes, 0), p.id).toBe(blocks);
    }
  });

  it('ogni esercizio esiste nella libreria, ed è nella sessione', () => {
    for (const p of Object.values(PACKAGES)) {
      const ids = p.blocks.flatMap((b) => b.items.map((it) => it.ex));
      for (const id of ids) expect(LIBRARY_BY_ID[id], `${p.id}: ${id}`).toBeTruthy();
      const s = composeSession({ week, template: p });
      expect(s.steps.filter((x) => x.kind === 'exercise').map((x) => x.ex), p.id).toEqual(ids);
    }
  });

  it('la partitella è l’ultimo blocco, con lo schema e la variante del livello', () => {
    for (const p of Object.values(PACKAGES)) {
      expect(p.blocks.at(-1).role, p.id).toBe('match');
      expect(p.blocks.filter((b) => b.role === 'match'), p.id).toHaveLength(1);
      const m = composeSession({ week, template: p }).steps.at(-1);
      expect(m.kind).toBe('match');
      expect(m.scheme.id).toBe(MATCH_VARIANTS[p.level].scheme);
      expect(LIBRARY_BY_ID[m.scheme.id].family).toBe('schemi');
      expect(m.variant.risk).toBeTruthy();
    }
    expect(JSON.stringify(MATCH_VARIANTS)).not.toMatch(/pegno|doppio/i);
  });

  it('i fondamentali del livello: la maggior parte degli esercizi è del livello del pacchetto', () => {
    for (const p of Object.values(PACKAGES)) {
      const ids = p.blocks.flatMap((b) => b.items.map((it) => it.ex));
      const own = ids.filter((id) => LIBRARY_BY_ID[id].level === p.level).length;
      expect(own / ids.length, p.id).toBeGreaterThanOrEqual(p.level === 'pro' ? 0.3 : 0.5);
    }
  });

  it('un blocco con più esercizi si divide in parti uguali', () => {
    expect(splitMinutes(12, 3)).toEqual([4, 4, 4]);
    expect(splitMinutes(13, 2)).toEqual([7, 6]);
    expect(splitMinutes(15, 4)).toEqual([4, 4, 4, 3]);
    const s = composeSession({ week, template: PACKAGES[packageId('principiante', 90)] });
    const serve = s.steps.filter((x) => x.block?.index === 1);
    expect(serve.map((x) => [x.ex, x.minutes, x.block.n, x.block.of])).toEqual([
      ['srv-regolare', 4, 1, 3],
      ['srv-corto-tagliato', 4, 2, 3],
      ['srv-bersaglio', 4, 3, 3]
    ]);
    // Le pause cadono solo fra un blocco e l'altro.
    const i = s.steps.indexOf(serve[0]);
    expect(s.steps[i - 1].kind).toBe('pause');
    expect(s.steps[i + 1]).toBe(serve[1]);
  });

  it('il catalogo li trova, senza mescolarli ai modelli', () => {
    expect(BASE.template(packageId('esperto', 60)).name).toBe('Esperto · 60′');
    expect(Object.keys(BASE.templates)).toEqual(['completo', 'breve', 'servizi']);
  });
});

describe('sostituire un esercizio', () => {
  const p = PACKAGES[packageId('intermedio', 90)];

  it('vale solo per la sessione', () => {
    const s = composeSession({ week, template: p, overrides: { 'b2-1': 'top-r-random', 'b4-0': 'falkenberg-multiball' } });
    expect(s.steps.find((x) => x.id === 'b2-1')).toMatchObject({ ex: 'top-r-random', name: 'Top di rovescio su palla casuale' });
    expect(s.steps.find((x) => x.id === 'b4-0').ex).toBe('falkenberg-multiball');
    expect(s.minutes).toBe(90);
    expect(p.blocks[2].items[1].ex).toBe('top-r-block'); // il pacchetto non cambia
    expect(composeSession({ week, template: p }).steps.find((x) => x.id === 'b2-1').ex).toBe('top-r-block');
  });

  it('con qualsiasi esercizio della libreria, anche di un altro livello', () => {
    const step = composeSession({ week, template: p }).steps.find((x) => x.id === 'b3-0');
    expect(replaceStepExercise(step, 'ric-scelta-libera')).toMatchObject({ ex: 'ric-scelta-libera', minutes: step.minutes });
    expect(replaceStepExercise(step, 'non-esiste')).toBe(step);
  });

  it('un esercizio del mese cambiato non allena più il percorso', () => {
    const s = composeSession({ week, template: TEMPLATES.completo });
    const ex = s.steps.find((x) => x.track === '1-1');
    expect(replaceStepExercise(ex, 'top-d-block').track).toBe('1-1'); // nella sequenza: resta
    expect(replaceStepExercise(ex, 'ric-flip-r').track).toBeUndefined();
  });

  it('salvato come allenamento tuo, tiene le sostituzioni', () => {
    const mine = templateWithOverrides(p, { 'b2-1': 'top-r-random', 'b9-9': 'x', 'b1': 'srv-rovescio' });
    expect(mine.id).toBeUndefined();
    expect(mine.package).toBeUndefined();
    expect(mine.pauses).toBe('extra');
    expect(mine.blocks[2].items.map((it) => it.ex)).toEqual(['top-d-block', 'top-r-random', 'top-d-due-punti']);
    expect(templateMinutes(mine)).toBe(90);
    const cat = buildCatalog({ templates: [{ ...mine, id: 'cmio', name: 'Mio' }] });
    expect(composeSession({ week, template: cat.template('cmio'), catalog: cat }).steps.find((x) => x.id === 'b2-1').ex).toBe('top-r-random');
  });
});

describe('modelli personali di prima', () => {
  const old = {
    id: 'cvecchio',
    name: 'Rovescio 60′',
    color: 'pink',
    custom: true,
    steps: [
      { type: 'warmup', minutes: 10, text: 'Solo rovescio' },
      { type: 'serve', minutes: 10 },
      { type: 'focus', slot: 2, minutes: 15 },
      { type: 'track', track: '3-2', minutes: 10 },
      { type: 'exercise', ex: 'ric-flip-r', minutes: 5 },
      { type: 'free', name: 'Multiball', text: 'Palle veloci', minutes: 5 },
      { type: 'match', minutes: 5, text: 'Ai 7' }
    ]
  };

  it('si leggono nel formato a blocchi senza perdere niente', () => {
    const t = normalizeTemplate(old);
    expect(t).toMatchObject({ id: 'cvecchio', name: 'Rovescio 60′', color: 'pink', pauses: 'inside' });
    expect(t.steps).toBeUndefined();
    expect(t.blocks.map((b) => [b.role, b.minutes, b.items])).toEqual([
      ['warmup', 10, []],
      ['serve', 10, []],
      [null, 15, [{ focus: 2 }]],
      [null, 10, [{ track: '3-2' }]],
      [null, 5, [{ ex: 'ric-flip-r' }]],
      [null, 5, [{ free: true, name: 'Multiball', text: 'Palle veloci' }]],
      ['match', 5, []]
    ]);
    expect(t.blocks[0].text).toBe('Solo rovescio');
    expect(t.blocks[6].text).toBe('Ai 7');
    expect(old.steps).toHaveLength(7); // l'originale non cambia
    expect(stepToBlock({ type: 'sconosciuto' })).toBeNull();
  });

  it('la sessione resta quella di prima: stessi passi, stessi minuti', () => {
    const cat = buildCatalog({ templates: [old] });
    const s = composeSession({ week, template: cat.template('cvecchio'), catalog: cat });
    expect(s.steps.map((x) => [x.kind, x.minutes])).toEqual([
      ['warmup', 10],
      ['pause', 1],
      ['serve', 9],
      ['pause', 1],
      ['exercise', 14],
      ['pause', 1],
      ['exercise', 9],
      ['pause', 1],
      ['exercise', 4],
      ['pause', 1],
      ['free', 4],
      ['pause', 1],
      ['match', 4]
    ]);
    expect(s.minutes).toBe(60);
    expect(templateMinutes(old)).toBe(60);
    expect(s.steps[0].text).toBe('Solo rovescio');
    expect(s.steps.at(-1).note).toBe('Ai 7');
    expect(s.steps[4]).toMatchObject({ track: '1-2' });
    expect(cat.template('cvecchio').custom).toBe(true);
  });

  it('i modelli di base hanno le durate di sempre', () => {
    expect(templateMinutes(TEMPLATES.completo)).toBe(90);
    expect(templateMinutes(TEMPLATES.breve)).toBe(60);
    expect(templateMinutes(TEMPLATES.servizi)).toBe(40);
  });
});
