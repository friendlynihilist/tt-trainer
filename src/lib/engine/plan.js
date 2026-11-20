// Il piano: una fila di tappe a partire da un lunedì, e un ritmo settimanale.
//
// · stages: le tappe, in ordine: [{ b, n, u }]. `b` è il tema (blocco) oppure 'P' (pausa); `u` è
//   l'unità, 's' allenamenti o 'w' settimane; `n` quante. Le durate proposte sono quattro
//   (STAGE_LENGTHS): un allenamento, una, due o quattro settimane. I piani di prima non hanno
//   le tappe: si ricavano dalle settimane (stagesOf).
// · weeks: per ogni settimana il tema che si allena, oppure 'P' (pausa). Con le tappe si ricava
//   da loro e dal ritmo (layout). Una settimana con più temi, uno per allenamento, si scrive
//   «1+2»: il primo allenamento della settimana è Dritto, il secondo Rovescio.
//   I temi di base sono '1' | '2' | '3' | 'R' (recupero); quelli personali hanno id «c…».
// · slots: il ritmo, quanti appuntamenti si vuole: [{ id, day: 1..7, kind: 'training' | 'test', template }].
//   Più appuntamenti nello stesso giorno vanno bene.
// · skip: gli appuntamenti tolti o spostati a mano (chiave dell'occorrenza).
//
// Le sessioni si agganciano alle settimane per data: nessun indice salvato, quindi inserire
// una pausa sposta in avanti solo il futuro.
//
// Il primo formato del piano aveva due giorni fissi, { days: { A, B } }: normalizePlan lo legge
// così com'è (A e B diventano due allenamenti, con il test nel giorno di B) senza riscriverlo.

import { CYCLE_BLOCKS, WEEKS_PER_BLOCK } from '../data/program.js';
import { BASE } from '../data/catalog.js';
import { DEFAULT_TEMPLATE, LEGACY_TEMPLATE } from '../data/templates.js';
import { addDays, diffDays, mondayOf, today, weekday } from '../util/dates.js';

export const DEFAULT_DAYS = [2, 5];

export function sortSlots(slots) {
  const order = { test: 0, training: 1 };
  return [...slots].sort((a, b) => a.day - b.day || (order[a.kind] ?? 2) - (order[b.kind] ?? 2));
}

/** Un allenamento per ogni giorno scelto, e il test nell'ultimo giorno della settimana. */
export function defaultSlots(days = DEFAULT_DAYS, template = DEFAULT_TEMPLATE) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const slots = sorted.map((day) => ({ id: `t${day}`, day, kind: 'training', template }));
  if (sorted.length) slots.push({ id: 'x', day: sorted[sorted.length - 1], kind: 'test' });
  return sortSlots(slots);
}

export function createPlan({ start, days = DEFAULT_DAYS, months = CYCLE_BLOCKS, weeksPerMonth = WEEKS_PER_BLOCK, slots = null, stages = null }) {
  const plan = {
    id: `p${Date.now().toString(36)}`,
    start: mondayOf(start),
    weeks: [],
    slots: sortSlots(slots ?? defaultSlots(days)),
    skip: [],
    createdAt: Date.now()
  };
  return withStages(plan, stages ?? months.map((b) => ({ b, n: weeksPerMonth, u: 'w' })));
}

// ── Le tappe ──────────────────────────────────────────────────────────────

/** Le durate che si possono scegliere per una tappa. */
export const STAGE_LENGTHS = [
  { id: 's1', n: 1, u: 's', label: '1 allenamento', short: '1 all.' },
  { id: 'w1', n: 1, u: 'w', label: '1 settimana', short: '1 sett.' },
  { id: 'w2', n: 2, u: 'w', label: '2 settimane', short: '2 sett.' },
  { id: 'w4', n: 4, u: 'w', label: '4 settimane', short: '4 sett.' }
];

/** «1 allenamento», «3 settimane»: anche le durate dei piani di prima, fuori dalle quattro. */
export function stageLength(st) {
  if (st.u === 's') return st.n === 1 ? '1 allenamento' : `${st.n} allenamenti`;
  return st.n === 1 ? '1 settimana' : `${st.n} settimane`;
}

const NUM = ['', 'un', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto'];

/**
 * Il periodo di una tappa, detto in tempo relativo: «Questo mese» (4 settimane), «Queste due
 * settimane», «Questa settimana», «Oggi» o «Questo allenamento» (un allenamento solo).
 * `of` è la forma con «di»: «l'esercizio di questo mese»; `noun` il nome breve: «Mese».
 */
export function stagePeriod(st, { isToday = false } = {}) {
  if (!st) return { title: '', of: '', noun: '' };
  if (st.b === 'P') return { title: 'In pausa', of: 'della pausa', noun: 'Pausa' };
  if (st.u === 's') {
    if (st.n === 1) return isToday ? { title: 'Oggi', of: 'di oggi', noun: 'Allenamento' } : { title: 'Questo allenamento', of: 'di questo allenamento', noun: 'Allenamento' };
    return { title: `Questi ${NUM[st.n] ?? st.n} allenamenti`, of: `di questi ${NUM[st.n] ?? st.n} allenamenti`, noun: 'Allenamenti' };
  }
  if (st.n === 4) return { title: 'Questo mese', of: 'di questo mese', noun: 'Mese' };
  if (st.n === 1) return { title: 'Questa settimana', of: 'di questa settimana', noun: 'Settimana' };
  return { title: `Queste ${NUM[st.n] ?? st.n} settimane`, of: `di queste ${NUM[st.n] ?? st.n} settimane`, noun: 'Settimane' };
}

function validStage(st) {
  return st && typeof st.b === 'string' && st.b && Number.isInteger(st.n) && st.n > 0 && (st.u === 's' || st.u === 'w');
}

/** Le parti di una settimana: «1+2» → ['1', '2']; «1» → ['1']. */
export function weekParts(kind) {
  return String(kind).split('+');
}

/** Le tappe di un piano. Senza tappe salvate (piani di prima) si ricavano dalle settimane. */
export function stagesOf(plan) {
  if (Array.isArray(plan?.stages) && plan.stages.length && plan.stages.every(validStage)) return plan.stages;
  const out = [];
  const push = (b, u) => {
    const last = out[out.length - 1];
    if (last && last.b === b && last.u === u) last.n++;
    else out.push({ b, n: 1, u });
  };
  for (const kind of plan?.weeks ?? []) {
    const parts = weekParts(kind);
    if (parts.length > 1) for (const b of parts) push(b, 's');
    else push(kind, 'w');
  }
  return out;
}

/** Gli allenamenti del ritmo in una settimana, in ordine di giorno. */
function trainingsOf(plan, monday) {
  return sortSlots(slotsFor(plan, monday)).filter((x) => x.kind === 'training');
}

/**
 * Le tappe sul calendario. Una tappa in settimane occupa settimane intere; una tappa in
 * allenamenti occupa gli allenamenti del ritmo, uno dopo l'altro. Se dopo degli allenamenti
 * singoli una settimana resta a metà, gli allenamenti rimasti anticipano la tappa dopo (che
 * comincia a contare dal lunedì seguente); prima di una pausa, o in fondo, ripetono l'ultimo tema.
 *
 * @returns { weeks: string[], cells: number[][] } — per ogni settimana l'indice della tappa di
 *          ogni allenamento (un solo elemento se la settimana non ha allenamenti nel ritmo).
 */
export function layout(plan, stages = stagesOf(plan)) {
  const weeks = [];
  const cells = [];
  let cur = [];
  const per = () => Math.max(1, trainingsOf(plan, addDays(plan.start, weeks.length * 7)).length);
  const flush = (fill) => {
    const n = per();
    while (cur.length < n) cur.push(fill);
    const bs = [...new Set(cur.map((i) => stages[i].b))];
    weeks.push(bs.length === 1 ? bs[0] : cur.map((i) => stages[i].b).join('+'));
    cells.push(cur);
    cur = [];
  };
  stages.forEach((st, si) => {
    if (st.u === 's') {
      for (let k = 0; k < st.n; k++) {
        cur.push(si);
        if (cur.length >= per()) flush(si);
      }
      return;
    }
    if (cur.length) flush(st.b === 'P' ? cur[cur.length - 1] : si);
    for (let k = 0; k < st.n; k++) {
      weeks.push(st.b);
      cells.push(Array(per()).fill(si));
    }
  });
  if (cur.length) flush(cur[cur.length - 1]);
  return { weeks, cells };
}

/** Il piano con queste tappe (e le settimane ricavate). */
export function withStages(plan, stages) {
  const clean = stages.filter(validStage).map(({ b, n, u }) => ({ b, n, u }));
  // Due tappe uguali di seguito diventano una.
  const merged = [];
  for (const st of clean) {
    const last = merged[merged.length - 1];
    if (last && last.b === st.b && last.u === st.u) last.n += st.n;
    else merged.push({ ...st });
  }
  return { ...plan, stages: merged, weeks: layout(plan, merged).weeks };
}

/** Quale allenamento della settimana è una data: l'ultimo del ritmo che cade quel giorno o prima. */
function slotIndex(plan, date) {
  const list = trainingsOf(plan, mondayOf(date));
  const wd = weekday(date);
  let k = 0;
  list.forEach((x, i) => {
    if (x.day <= wd) k = i;
  });
  return k;
}

/**
 * Una settimana vista da un giorno preciso: in una settimana con più temi («1+2») il tema è
 * quello dell'allenamento di quel giorno.
 */
export function themedWeek(plan, week, date, catalog = BASE) {
  if (!week?.parts || week.parts.length < 2) return week;
  const k = slotIndex(plan, date);
  const block = catalog.block(week.parts[Math.min(k, week.parts.length - 1)]) ?? null;
  return { ...week, block, focusBlock: block ?? week.focusBlock };
}

/**
 * Le tappe con le date, lo stato e, per quella in corso, a che punto sei.
 * @returns { stages: [{ ...tappa, i, block, start, end, state: 'past' | 'now' | 'next' }],
 *            current: indice o -1, progress: { pos, of, unit, startsOn } | null }
 */
export function stageInfo(plan, date = today(), catalog = BASE) {
  if (!plan) return { stages: [], current: -1, progress: null };
  const stages = stagesOf(plan);
  const { cells } = layout(plan, stages);
  const dates = stages.map(() => []); // per tappa: le date dei suoi allenamenti (o i lunedì)
  const fullWeeks = stages.map(() => []);
  cells.forEach((row, wi) => {
    const monday = addDays(plan.start, wi * 7);
    const list = trainingsOf(plan, monday);
    row.forEach((si, k) => dates[si].push(list[k] ? addDays(monday, list[k].day - 1) : monday));
    if (row.every((si) => si === row[0])) fullWeeks[row[0]].push(wi);
  });
  const idx = weekIndex(plan, date);
  let current = -1;
  if (idx >= 0 && idx < cells.length) {
    const row = cells[idx];
    current = row[Math.min(slotIndex(plan, date), row.length - 1)];
  }
  const out = stages.map((st, i) => {
    const ds = dates[i].sort();
    const start = st.u === 'w' && fullWeeks[i].length ? addDays(plan.start, fullWeeks[i][0] * 7) : (ds[0] ?? null);
    const end = st.u === 'w' && fullWeeks[i].length ? addDays(plan.start, fullWeeks[i][fullWeeks[i].length - 1] * 7 + 6) : (ds[ds.length - 1] ?? null);
    const state = current === -1 ? (idx < 0 ? 'next' : 'past') : i < current ? 'past' : i === current ? 'now' : 'next';
    return { ...st, i, block: st.b === 'P' ? null : (catalog.block(st.b) ?? null), start, end, state };
  });
  let progress = null;
  if (current >= 0) {
    const st = stages[current];
    if (st.u === 'w') {
      const pos = fullWeeks[current].indexOf(idx) + 1;
      progress = { unit: 'w', pos, of: st.n, startsOn: pos ? null : out[current].start };
    } else {
      const mine = [];
      cells.forEach((row, wi) => row.forEach((si, k) => si === current && mine.push([wi, k])));
      const k = Math.min(slotIndex(plan, date), cells[idx].length - 1);
      progress = { unit: 's', pos: mine.findIndex(([wi, kk]) => wi === idx && kk === k) + 1, of: st.n, startsOn: null };
    }
  }
  return { stages: out, current, progress };
}

/** Il piano com'è salvato → il piano come lo usa l'app. Non modifica l'originale. */
export function normalizePlan(plan) {
  if (!plan || !plan.start || !Array.isArray(plan.weeks)) return null;
  let slots = Array.isArray(plan.slots) ? plan.slots.filter((s) => s && s.day >= 1 && s.day <= 7) : null;
  if (!slots && plan.days) {
    const a = Math.min(plan.days.A, plan.days.B);
    const b = Math.max(plan.days.A, plan.days.B);
    slots = [
      { id: 'A', day: a, kind: 'training', template: LEGACY_TEMPLATE },
      { id: 'B', day: b, kind: 'training', template: LEGACY_TEMPLATE },
      { id: 'B-test', day: b, kind: 'test' }
    ];
  }
  const out = { ...plan, slots: sortSlots(slots ?? []), skip: Array.isArray(plan.skip) ? plan.skip : [] };
  // Con le tappe le settimane si ricavano ogni volta: cambiando il ritmo, gli allenamenti singoli si
  // spostano da soli. I piani di prima restano come sono.
  if (Array.isArray(plan.stages) && plan.stages.length && plan.stages.every(validStage)) out.weeks = layout(out, plan.stages).weeks;
  return out;
}

export function weekIndex(plan, date = today()) {
  return Math.floor(diffDays(plan.start, date) / 7);
}

export function isPause(kind) {
  return kind === 'P';
}

/** Le settimane «numerate» del ciclo: tutto tranne pause e recupero. */
export function isCycleKind(kind) {
  return kind !== 'P' && kind !== 'R';
}

/** Tutto ciò che serve sapere di una settimana del piano. `null` fuori dal piano. */
export function weekAt(plan, idx, catalog = BASE) {
  if (!plan || idx < 0 || idx >= plan.weeks.length) return null;
  const kind = plan.weeks[idx];
  const parts = weekParts(kind);
  const monday = addDays(plan.start, idx * 7);
  let number = 0;
  for (let i = 0; i <= idx; i++) if (isCycleKind(plan.weeks[i])) number++;
  const total = plan.weeks.filter(isCycleKind).length;
  const block = isPause(kind) ? null : (catalog.block(parts[0]) ?? null);
  return {
    idx,
    kind,
    // Più temi nella stessa settimana, uno per allenamento: themedWeek sceglie quello del giorno.
    parts: parts.length > 1 ? parts : null,
    block,
    // Anche in pausa (o con un mese cancellato) ci si può allenare: si usa il mese più vicino.
    focusBlock: block ?? nearestBlock(plan, idx, catalog),
    monday,
    sunday: addDays(monday, 6),
    number: isCycleKind(kind) ? number : null,
    total,
    firstOfBlock: plan.weeks.indexOf(kind) === idx,
    lastOfBlock: plan.weeks.lastIndexOf(kind) === idx
  };
}

function nearestBlock(plan, idx, catalog) {
  for (let d = 1; d < plan.weeks.length; d++) {
    for (const i of [idx - d, idx + d]) {
      const b = i >= 0 && i < plan.weeks.length && !isPause(plan.weeks[i]) ? catalog.block(weekParts(plan.weeks[i])[0]) : null;
      if (b) return b;
    }
  }
  return catalog.block('1');
}

/** La settimana di una data; prima del piano la prima, dopo l'ultima. Senza piano null. */
export function weekFor(plan, date, catalog = BASE) {
  if (!plan) return null;
  const idx = Math.max(0, Math.min(plan.weeks.length - 1, weekIndex(plan, date)));
  return themedWeek(plan, weekAt(plan, idx, catalog), date, catalog);
}

/** 'before' | 'active' | 'done' */
export function planPhase(plan, date = today()) {
  const idx = weekIndex(plan, date);
  if (idx < 0) return 'before';
  if (idx >= plan.weeks.length) return 'done';
  return 'active';
}

export function occurrenceKey(plan, date, slot) {
  return `${plan.id}:${date}:${slot.id}`;
}

/**
 * Il ritmo valido in una settimana. Cambiarlo a piano iniziato non riscrive il passato:
 * il ritmo vecchio resta in `pastSlots` con la data fino a cui valeva.
 */
export function slotsFor(plan, monday) {
  for (const r of [...(plan.pastSlots ?? [])].sort((a, b) => (a.until < b.until ? -1 : 1))) {
    if (monday <= r.until) return r.slots;
  }
  return plan.slots;
}

/** Il piano con un ritmo nuovo da questa settimana in poi. */
export function withSlots(plan, slots, date = today()) {
  const thisMonday = mondayOf(date);
  if (thisMonday <= plan.start) return { ...plan, slots };
  const until = addDays(thisMonday, -1);
  const past = plan.pastSlots ?? [];
  // Già cambiato questa settimana: il ritmo «di prima» è quello salvato allora.
  const kept = past.some((r) => r.until === until) ? past : [...past, { until, slots: plan.slots }];
  return { ...plan, slots, pastSlots: kept };
}

/** Gli appuntamenti del ritmo in una settimana (tolti quelli saltati o spostati). */
export function weekOccurrences(plan, week, catalog = BASE) {
  if (!week || isPause(week.kind)) return [];
  const skip = new Set(plan.skip ?? []);
  return sortSlots(slotsFor(plan, week.monday))
    .map((slot) => {
      const date = addDays(week.monday, slot.day - 1);
      return { key: occurrenceKey(plan, date, slot), date, slot, kind: slot.kind, template: slot.template ?? null, week: themedWeek(plan, week, date, catalog) };
    })
    .filter((o) => !skip.has(o.key));
}

/** Dove cade una settimana nelle tappe: la tappa e quante sue unità ci sono prima. */
function stageAt(plan, stages, idx) {
  const { cells } = layout(plan, stages);
  if (idx >= cells.length) return { si: stages.length, before: 0 };
  const si = cells[idx][0];
  let before = 0;
  for (let w = 0; w < idx; w++) {
    if (stages[si].u === 'w') before += cells[w].every((x) => x === si) ? 1 : 0;
    else before += cells[w].filter((x) => x === si).length;
  }
  return { si, before };
}

/** Una settimana di pausa ('P') o di recupero ('R') prima della settimana `idx`: il resto slitta. */
export function insertWeek(plan, idx, kind) {
  const stages = stagesOf(plan).map((x) => ({ ...x }));
  const { si, before } = stageAt(plan, stages, idx);
  const add = { b: kind, n: 1, u: 'w' };
  if (si < stages.length && before > 0 && before < stages[si].n) {
    const st = stages[si];
    stages.splice(si, 1, { ...st, n: before }, add, { ...st, n: st.n - before });
  } else {
    stages.splice(si + (before >= (stages[si]?.n ?? 1) ? 1 : 0), 0, add);
  }
  return withStages(plan, stages);
}

/** Toglie una settimana di pausa o di recupero. Le settimane di allenamento non si tolgono così. */
export function removeWeek(plan, idx) {
  const kind = plan.weeks[idx];
  if (kind !== 'P' && kind !== 'R') return plan;
  const stages = stagesOf(plan).map((x) => ({ ...x }));
  const { si } = stageAt(plan, stages, idx);
  if (stages[si].n > 1) stages[si].n--;
  else stages.splice(si, 1);
  return withStages(plan, stages);
}
