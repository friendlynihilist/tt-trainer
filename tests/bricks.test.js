import { describe, it, expect } from 'vitest';
import { BRICKS, SKILLS, brickExercises, brickMap, brickOfExercise, suggest, proposals, workoutName, toTemplate, bricksOf, editableBricks, makeBrick, totalMinutes, lanesOf, MIN_MINUTES } from '../src/lib/data/bricks.js';
import { BASE } from '../src/lib/data/catalog.js';
import { LIBRARY, LEVEL_IDS } from '../src/lib/data/library.js';
import { templateMinutes, TEMPLATES } from '../src/lib/data/templates.js';
import { composeSession } from '../src/lib/engine/compose.js';
import { sessionBlocks } from '../src/lib/ui/design.js';

describe('mattoni', () => {
  it('ogni esercizio della libreria con le medaglie sta in almeno un colpo', () => {
    const inSkills = new Set(SKILLS.flatMap((b) => brickExercises(b.id).map((e) => e.id)));
    expect(LIBRARY.filter((e) => !inSkills.has(e.id)).map((e) => e.id)).toEqual([]);
  });

  it('Dritto e Rovescio si dividono per lato; chi allena tutti e due sta in tutti e due', () => {
    const d = brickExercises('dritto').map((e) => e.id);
    const r = brickExercises('rovescio').map((e) => e.id);
    expect(d).toContain('top-d-block');
    expect(d).not.toContain('top-r-block');
    expect(r).toContain('top-r-block');
    expect(r).not.toContain('top-d-block');
    expect(d.filter((x) => r.includes(x)).length).toBeGreaterThan(0);
    expect(brickOfExercise(BASE.exercise('top-r-block'))).toBe('rovescio');
    expect(brickOfExercise(BASE.exercise('top-d-block'))).toBe('dritto');
    expect(brickOfExercise(BASE.exercise('srv-pendolo'))).toBe('servizio');
  });

  it('gli esercizi sono in ordine di livello', () => {
    for (const b of SKILLS) {
      const levels = brickExercises(b.id).map((e) => LEVEL_IDS.indexOf(e.level));
      expect(levels).toEqual([...levels].sort((x, y) => x - y));
    }
  });

  it('la mappa: righe per livello, una fila per famiglia in Dritto, un esercizio «di adesso» per fila', () => {
    const m = brickMap('dritto');
    expect(m.heads).toEqual(['Palleggio', 'Attacco', 'Block']);
    expect(m.nodes.length).toBe(brickExercises('dritto').length);
    // Nessuna casella sopra un'altra, e i livelli non si mescolano fra le righe.
    expect(new Set(m.nodes.map((n) => `${n.col}:${n.row}`)).size).toBe(m.nodes.length);
    for (const a of m.nodes) for (const b of m.nodes) if (a.lv < b.lv) expect(a.row).toBeLessThan(b.row);
    expect(m.nodes.filter((n) => n.now).length).toBe(lanesOf('dritto').length);
    // Con l'argento sul primo esercizio, «adesso» passa a quello dopo.
    const first = m.nodes.find((n) => n.lane === 1 && n.now).ex.id;
    const after = brickMap('dritto', BASE, { [first]: { B: '2026-01-01', A: '2026-01-02' } });
    expect(after.nodes.find((n) => n.lane === 1 && n.now).ex.id).not.toBe(first);
    expect(brickMap('servizio').heads).toBe(null);
  });

  it('propone esercizi del livello del giocatore', () => {
    for (const level of LEVEL_IDS) {
      const [id] = suggest('dritto', level);
      expect(LEVEL_IDS.indexOf(BASE.exercise(id).level)).toBeLessThanOrEqual(LEVEL_IDS.indexOf(level));
    }
    expect(BASE.exercise(suggest('dritto', 'intermedio')[0]).level).toBe('intermedio');
    expect(suggest('partita', 'intermedio')).toEqual([]);
  });

  it('tre allenamenti proposti attorno ai colpi scelti, mai mattoni sotto i dieci minuti', () => {
    const list = proposals(['dritto', 'servizio'], 'intermedio');
    expect(list.map((w) => w.name)).toEqual(['Dritto e servizio', 'Dritto, servizio e ricezione', 'Dritto, servizio, ricezione e gambe']);
    expect(list.map((w) => totalMinutes(w.bricks))).toEqual([50, 60, 90]);
    for (const w of list) for (const b of w.bricks) expect(b.minutes).toBeGreaterThanOrEqual(MIN_MINUTES);
    expect(proposals([], 'principiante')[0].name).toBe('Dritto');
  });

  it('il nome dice cosa c’è dentro', () => {
    const b = (type) => makeBrick(type, { level: 'intermedio' });
    expect(workoutName([b('riscaldamento'), b('dritto'), b('partita')])).toBe('Dritto');
    expect(workoutName([b('servizio'), b('dritto'), b('gambe')])).toBe('Servizio, dritto e gambe');
    expect(workoutName([b('riscaldamento'), b('partita')])).toBe('Riscaldamento e partita');
    expect(workoutName([])).toBe('Allenamento');
  });

  it('un allenamento a mattoni dura la somma dei mattoni, senza pause', () => {
    const bricks = proposals(['rovescio'], 'intermedio')[1].bricks;
    const t = { id: 'x', ...toTemplate(bricks) };
    expect(t.gaps).toBe(false);
    expect(templateMinutes(t)).toBe(totalMinutes(bricks));
    const session = composeSession({ template: t });
    expect(session.minutes).toBe(totalMinutes(bricks));
    expect(session.steps.some((s) => s.kind === 'pause')).toBe(false);
    // I blocchi della sessione sono i mattoni, con il loro colore.
    const blocks = sessionBlocks(session, BASE);
    expect(blocks.map((b) => b.minutes)).toEqual(bricks.map((b) => b.minutes));
    expect(blocks.map((b) => b.name)).toEqual(['Riscaldamento', 'Rovescio', 'Servizio', 'Partita']);
    expect(blocks[1].fam).toBe('controllo');
    expect(blocks[1].steps.length).toBe(2);
  });

  it('andata e ritorno: i mattoni salvati si rileggono uguali', () => {
    const bricks = proposals(['dritto', 'gambe'], 'avanzato')[2].bricks;
    const back = editableBricks({ id: 'x', ...toTemplate(bricks) });
    expect(back.map((b) => [b.type, b.minutes, b.exs])).toEqual(bricks.map((b) => [b.type, b.minutes, b.exs]));
  });

  it('i modelli di prima si leggono come mattoni', () => {
    const t = BASE.template('completo');
    const session = composeSession({ template: t });
    const list = bricksOf(t, BASE, session);
    expect(list.map((b) => b.type)).toEqual(['riscaldamento', 'servizio', 'dritto', 'dritto', 'partita']);
    expect(list[2].exs.length).toBe(1);
    // Gli allenamenti di prima tengono le loro pause.
    expect(templateMinutes(TEMPLATES.completo)).toBe(90);
    expect(sessionBlocks(session, BASE).length).toBe(5);
  });

  it('ogni mattone ha un colore e una durata valida', () => {
    for (const b of BRICKS) {
      expect(b.fam).toBeTruthy();
      expect(b.minutes).toBeGreaterThanOrEqual(MIN_MINUTES);
    }
  });
});
