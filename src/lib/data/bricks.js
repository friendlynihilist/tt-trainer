// I fondamentali: le cose che si allenano, una per colpo. Un allenamento è una fila di fondamentali, ognuno
// con una durata e gli esercizi scelti fra quelli del colpo. Sotto resta il formato di sempre: un
// allenamento è un modello a blocchi (templates.js), e ogni fondamentale è un blocco con `brick`.
//
// · Dritto e Rovescio prendono dalle famiglie palleggio, attacco e block, secondo il lato dei colpi
//   allenati (taxonomy.js). Un esercizio che allena tutti e due i lati sta in tutti e due i fondamentali.
// · Gli altri fondamentali sono una famiglia ciascuno.
// · Riscaldamento (il palleggio) e Partita non sono colpi: si possono mettere in un allenamento, ma
//   non hanno una mappa.
//
// Gli allenamenti per fondamentali non hanno la pausa di un minuto fra un blocco e l'altro (`gaps: false`):
// la durata è la somma dei fondamentali, come si vede mentre li costruisci.

import { STROKE } from './taxonomy.js';
import { LEVEL_IDS } from './library.js';
import { BASE } from './catalog.js';

const HAND = ['palleggio', 'attacco', 'controllo'];

/** I nomi delle tre file di Dritto e Rovescio. */
export const LANE = { palleggio: 'Palleggio', attacco: 'Attacco', controllo: 'Block' };

/** Un fondamentale dura almeno dieci minuti e si allunga di cinque in cinque. */
export const MIN_MINUTES = 10;
export const MAX_MINUTES = 45;
export const STEP_MINUTES = 5;
export const MINUTE_CHOICES = [10, 15, 20, 25, 30, 40];

/** Il lato di un esercizio: 'D', 'R', 'DR' (tutti e due) oppure '' (non si applica). */
export function sideOf(ex, strokes = STROKE) {
  const sides = new Set((ex?.strokes ?? []).map((id) => strokes[id]?.side).filter(Boolean));
  return sides.size === 2 ? 'DR' : ([...sides][0] ?? '');
}

const family = (f) => (e) => e.family === f;

// fam: il colore (una famiglia di design.css). color: il colore nel calendario.
export const BRICKS = [
  { id: 'riscaldamento', name: 'Riscaldamento', fam: 'palleggio', color: 'sky', minutes: 10, extra: true, has: family('palleggio') },
  { id: 'dritto', name: 'Dritto', fam: 'attacco', color: 'blue', minutes: 20, lanes: HAND, has: (e, side) => HAND.includes(e.family) && side !== 'R' },
  { id: 'rovescio', name: 'Rovescio', fam: 'controllo', color: 'violet', minutes: 20, lanes: HAND, has: (e, side) => HAND.includes(e.family) && (side === 'R' || side === 'DR') },
  { id: 'servizio', name: 'Servizio', fam: 'servizio', color: 'amber', minutes: 10, has: family('servizio') },
  { id: 'ricezione', name: 'Ricezione', fam: 'ricezione', color: 'teal', minutes: 10, has: family('ricezione') },
  { id: 'gambe', name: 'Gambe', fam: 'gambe', color: 'pink', minutes: 10, has: family('gambe') },
  { id: 'taglio', name: 'Gioco tagliato', fam: 'taglio', color: 'brown', minutes: 10, has: family('taglio') },
  { id: 'schemi', name: 'Schemi', fam: 'schemi', color: 'plum', minutes: 10, has: family('schemi') },
  { id: 'partita', name: 'Partita', fam: 'partita', color: 'slate', minutes: 10, extra: true, match: true, has: () => false }
];
export const BRICK = Object.fromEntries(BRICKS.map((b) => [b.id, b]));
/** I colpi: i fondamentali con una mappa. */
export const SKILLS = BRICKS.filter((b) => !b.extra);

const levelIndex = (level) => Math.max(0, LEVEL_IDS.indexOf(level));
/** 0 nessuna medaglia, 1 bronzo, 2 argento, 3 oro. */
export const medalRank = (m) => (m?.O ? 3 : m?.A ? 2 : m?.B ? 1 : 0);

/** Gli esercizi di un fondamentale, dal livello più basso; a pari livello prima quelli già premiati. */
export function brickExercises(id, catalog = BASE, medals = {}) {
  const b = BRICK[id];
  if (!b) return [];
  return catalog.activeExerciseIds
    .map((x) => catalog.exercise(x))
    .filter((e) => e && b.has(e, sideOf(e)))
    .sort((x, y) => levelIndex(x.level) - levelIndex(y.level) || medalRank(medals[y.id]) - medalRank(medals[x.id]));
}

/** Il fondamentale di un esercizio (per i colori e per le note): Dritto se il lato non è il rovescio. */
export function brickOfExercise(ex) {
  if (!ex?.family) return null;
  if (HAND.includes(ex.family)) return sideOf(ex) === 'R' ? 'rovescio' : 'dritto';
  return BRICKS.find((b) => !b.extra && b.fam === ex.family)?.id ?? null;
}

/** Il fondamentale di un colpo della tassonomia (le note si scrivono per colpo). */
export function brickOfStroke(stroke) {
  if (!stroke?.family) return null;
  if (HAND.includes(stroke.family)) return stroke.side === 'R' ? 'rovescio' : 'dritto';
  return BRICKS.find((b) => !b.extra && b.fam === stroke.family)?.id ?? null;
}

/** Le file di un fondamentale: per famiglia in Dritto e Rovescio, tre file a giro negli altri. */
export function lanesOf(id, catalog = BASE, medals = {}) {
  const b = BRICK[id];
  const list = brickExercises(id, catalog, medals);
  if (b?.lanes) return b.lanes.map((f) => ({ name: LANE[f], list: list.filter((e) => e.family === f) })).filter((l) => l.list.length);
  const out = [{ name: '', list: [] }, { name: '', list: [] }, { name: '', list: [] }];
  list.forEach((e, i) => out[i % 3].list.push(e));
  return out.filter((l) => l.list.length);
}

/**
 * La mappa di un fondamentale. Le righe seguono i livelli: tutti gli esercizi di un livello stanno sopra
 * quelli del livello dopo. In ogni fila l'esercizio «di adesso» è il primo senza argento.
 * @returns { nodes: [{ ex, lane, col, row, lv, now }], edges: [[da, a]], heads: string[] | null, cols: number[] }
 */
export function brickMap(id, catalog = BASE, medals = {}) {
  const lanes = lanesOf(id, catalog, medals);
  const cols = lanes.length === 1 ? [1] : lanes.length === 2 ? [0, 2] : [0, 1, 2];
  const nodes = [];
  const edges = [];
  let base = 0;
  for (let lv = 0; lv < LEVEL_IDS.length; lv++) {
    let tall = 0;
    lanes.forEach((lane, li) => {
      const here = lane.list.filter((e) => levelIndex(e.level) === lv);
      here.forEach((ex, k) => nodes.push({ ex, lane: li, col: cols[li], row: base + k, lv, now: false }));
      tall = Math.max(tall, here.length);
    });
    base += tall;
  }
  lanes.forEach((_, li) => {
    const mine = nodes.map((n, i) => [n, i]).filter(([n]) => n.lane === li);
    mine.forEach(([, i], k) => k && edges.push([mine[k - 1][1], i]));
    const now = mine.find(([n]) => hasGoals(n.ex) && medalRank(medals[n.ex.id]) < 2);
    if (now) now[0].now = true;
  });
  return { nodes, edges, heads: BRICK[id]?.lanes ? lanes.map((l) => l.name) : null, cols };
}

const hasGoals = (ex) => ex?.goals?.B != null;

/**
 * Gli esercizi che l'app propone per un fondamentale: quelli del tuo livello (o del più vicino sotto),
 * prima l'attacco e prima quelli dove ti manca di più.
 */
export function suggest(id, level, catalog = BASE, medals = {}, n = 1) {
  const list = brickExercises(id, catalog, medals);
  if (!list.length) return [];
  const lv = levelIndex(level);
  const below = list.map((e) => levelIndex(e.level)).filter((l) => l <= lv);
  const best = below.length ? Math.max(...below) : levelIndex(list[0].level);
  return list
    .filter((e) => levelIndex(e.level) === best)
    .sort((x, y) => (y.family === 'attacco') - (x.family === 'attacco') || medalRank(medals[x.id]) - medalRank(medals[y.id]))
    .slice(0, n)
    .map((e) => e.id);
}

let seq = 0;
/** Un fondamentale nuovo, con gli esercizi proposti per il tuo livello. */
export function makeBrick(type, { minutes = null, exs = null, level = null, catalog = BASE, medals = {} } = {}) {
  const b = BRICK[type];
  const min = minutes ?? b.minutes;
  return { id: `m${Date.now().toString(36)}${++seq}`, type, minutes: min, exs: exs ?? suggest(type, level, catalog, medals, min >= 20 ? 2 : 1) };
}

/** Il nome di un allenamento dice cosa contiene: «Dritto e servizio». */
export function workoutName(bricks) {
  const names = (list) => [...new Set(list.map((b) => BRICK[b.type]?.name ?? b.name).filter(Boolean))];
  const main = names(bricks.filter((b) => !BRICK[b.type]?.extra));
  const all = main.length ? main : names(bricks);
  if (!all.length) return 'Allenamento';
  const low = all.map((n, i) => (i ? n.toLowerCase() : n));
  return low.length === 1 ? low[0] : low.length === 2 ? low.join(' e ') : `${low.slice(0, -1).join(', ')} e ${low[low.length - 1]}`;
}

export const totalMinutes = (bricks) => bricks.reduce((n, b) => n + (Number(b.minutes) || 0), 0);

/** Tre allenamenti proposti attorno ai colpi scelti: corto, completo, lungo. */
export function proposals(focus, level, catalog = BASE, medals = {}) {
  const valid = (focus ?? []).filter((t) => BRICK[t] && !BRICK[t].extra);
  const f = valid.length ? valid : ['dritto'];
  const rest = ['servizio', 'ricezione', 'gambe', 'dritto', 'rovescio', 'taglio', 'schemi'].filter((t) => !f.includes(t));
  const mk = (parts) => {
    const bricks = parts.map(([type, minutes]) => makeBrick(type, { minutes, level, catalog, medals }));
    return { name: workoutName(bricks), bricks };
  };
  const two = f.slice(0, 2);
  const three = f.slice(0, 3);
  return [
    mk([['riscaldamento', 10], ...two.map((t) => [t, two.length === 1 ? 20 : 15]), ['partita', 10]]),
    mk([['riscaldamento', 10], ...two.map((t) => [t, two.length === 1 ? 30 : 15]), [rest[0], 10], ['partita', 10]]),
    mk([['riscaldamento', 10], ...three.map((t) => [t, [40, 20, 15][three.length - 1]]), [rest[0], 15], [rest[1], 10], ['partita', 15]])
  ];
}

/** I fondamentali → un allenamento da salvare (un modello a blocchi, senza id). */
export function toTemplate(bricks, name = null) {
  const first = bricks.find((b) => !BRICK[b.type]?.extra) ?? bricks[0];
  return {
    name: name?.trim() || workoutName(bricks),
    color: BRICK[first?.type]?.color ?? 'slate',
    gaps: false,
    blocks: bricks.map((b) => {
      const def = BRICK[b.type];
      const minutes = Math.max(MIN_MINUTES, Number(b.minutes) || def.minutes);
      if (def.match) return { name: def.name, minutes, role: 'match', brick: b.type, items: [] };
      if (b.type === 'riscaldamento' && !b.exs?.length) return { name: def.name, minutes, role: 'warmup', brick: b.type, items: [] };
      return { name: def.name, minutes, role: null, brick: b.type, items: (b.exs ?? []).map((ex) => ({ ex })) };
    })
  };
}

/** Il fondamentale di un blocco: quello salvato, o quello che gli somiglia nei modelli di prima. */
export function brickOfBlock(block, catalog = BASE) {
  if (BRICK[block?.brick]) return block.brick;
  if (block?.role === 'warmup') return 'riscaldamento';
  if (block?.role === 'serve') return 'servizio';
  if (block?.role === 'match') return 'partita';
  const first = (block?.items ?? []).find((it) => it.ex);
  return first ? brickOfExercise(catalog.exercise(first.ex)) : null;
}

/**
 * Un allenamento → i suoi fondamentali, per mostrarlo e per cambiarlo. `session` (la sessione composta)
 * serve ai modelli di prima, dove gli esercizi «del mese» si conoscono solo componendo.
 */
export function bricksOf(template, catalog = BASE, session = null) {
  return (template?.blocks ?? []).map((block, i) => {
    let exs = (block.items ?? []).filter((it) => it.ex && catalog.exercise(it.ex)).map((it) => it.ex);
    if (session) {
      const steps = session.steps.filter((s) => s.ex && (s.id === `b${i}` || s.id.startsWith(`b${i}-`)));
      if (steps.length) exs = steps.map((s) => s.ex);
    }
    // Un blocco «del mese» non dice il suo colpo: lo dice l'esercizio che la sessione ci ha messo.
    const type = brickOfBlock(block, catalog) ?? (exs[0] ? brickOfExercise(catalog.exercise(exs[0])) : null);
    return { id: `k${i}`, type, name: BRICK[type]?.name ?? block.name, fam: BRICK[type]?.fam ?? 'libero', minutes: Number(block.minutes) || MIN_MINUTES, exs };
  });
}

/** I fondamentali di un allenamento pronti per il costruttore: solo quelli che sono davvero fondamentali. */
export function editableBricks(template, catalog = BASE, session = null) {
  return bricksOf(template, catalog, session)
    .filter((b) => BRICK[b.type])
    .map((b) => ({ id: b.id, type: b.type, minutes: Math.max(MIN_MINUTES, Math.round(b.minutes / STEP_MINUTES) * STEP_MINUTES), exs: BRICK[b.type].match ? [] : b.exs.filter((x) => BRICK[b.type].has(catalog.exercise(x), sideOf(catalog.exercise(x)))) }));
}

/**
 * I fondamentali di una sessione composta, come si sono fatti: tipo, minuti ed esercizi. Si salvano
 * nella voce del diario, così la voce resta com'era anche se poi l'allenamento cambia.
 */
export function sessionBricks(session, catalog = BASE) {
  const out = [];
  for (const s of session?.steps ?? []) {
    if (s.kind === 'pause') continue;
    const key = s.id.split('-')[0];
    const type =
      BRICK[s.block?.brick]?.id ??
      (s.kind === 'warmup' ? 'riscaldamento' : s.kind === 'serve' ? 'servizio' : s.kind === 'match' ? 'partita' : s.ex ? brickOfExercise(catalog.exercise(s.ex)) : null);
    let g = out.find((b) => b.key === key);
    if (!g) out.push((g = { key, type, minutes: 0, exs: [] }));
    g.minutes += s.minutes;
    if (s.ex && !g.exs.includes(s.ex)) g.exs.push(s.ex);
  }
  return out.filter((b) => b.type).map(({ type, minutes, exs }) => ({ type, minutes, exs }));
}

/**
 * I fondamentali di una voce del diario, per mostrarla: quelli salvati con la voce; altrimenti quelli
 * dell'allenamento, se è fatto di fondamentali; altrimenti gli esercizi fatti, raccolti per colpo
 * (senza minuti: le voci di prima non li hanno).
 */
export function eventBricks(ev, catalog = BASE) {
  const shape = (b, i) => ({ id: `e${i}`, type: b.type, name: BRICK[b.type]?.name ?? '', fam: BRICK[b.type]?.fam ?? 'libero', minutes: b.minutes ?? null, exs: (b.exs ?? []).filter((x) => catalog.exercise(x)) });
  if (ev?.bricks?.length) return ev.bricks.filter((b) => BRICK[b.type]).map(shape);
  const t = ev?.template ? catalog.template(ev.template) : null;
  if (t?.blocks?.some((b) => BRICK[b.brick])) return bricksOf(t, catalog).filter((b) => BRICK[b.type]);
  const out = [];
  // Le voci più vecchie non hanno nemmeno l'elenco degli esercizi: restano quelli misurati.
  const done = ev?.exercises?.length ? ev.exercises : (ev?.attempts ?? []).map((x) => x.ex);
  for (const id of done) {
    const type = brickOfExercise(catalog.exercise(id));
    if (!type) continue;
    let g = out.find((b) => b.type === type);
    if (!g) out.push((g = { type, exs: [] }));
    if (g.exs.includes(id)) continue;
    g.exs.push(id);
  }
  return out.map(shape);
}

/** Il nome di un allenamento fatto: quello che gli hai dato, oppure quello che contiene. */
export function eventName(ev, catalog = BASE) {
  const t = ev?.template ? catalog.template(ev.template) : null;
  if (t?.custom && t.name) return t.name;
  const bricks = eventBricks(ev, catalog);
  return bricks.length ? workoutName(bricks) : 'Allenamento';
}
