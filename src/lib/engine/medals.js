// Le medaglie. Non si salvano mai: si calcolano dai tentativi, quindi aggiungere tentativi non
// toglie mai niente (le medaglie non si perdono) e correggere un tentativo sbagliato rimette a
// posto tutto da solo.
//
// Regole (docs/ricerca-livelli-esercizi.md, 6.2):
//   · una seduta è un giorno;
//   · su n e conta: vale la prima serie registrata del giorno;
//   · di fila e a tempo: vale la migliore dei primi tre tentativi del giorno;
//   · bronzo, argento e platino: il primo giorno in cui si raggiunge la soglia;
//   · oro: la soglia raggiunta in due giorni diversi (con uno solo è «metà oro»);
//   · senza misure da 90 giorni un esercizio con medaglie è «da ripassare».
// Le medaglie non bloccano niente: dicono solo il record e il gradino raggiunto.

import { TIERS, TIER, TRIES_PER_DAY } from '../data/library.js';
import { diffDays, today as todayIso } from '../util/dates.js';

export const STALE_DAYS = 90;

/** Un valore (numero o lista) raggiunge la soglia? Con più parti, tutte le parti. */
export function reaches(value, goal) {
  if (goal == null || value == null) return false;
  if (Array.isArray(goal)) return Array.isArray(value) && goal.every((g, i) => Number(value[i]) >= g);
  if (Array.isArray(value)) return value.length > 0 && value.every((v) => Number(v) >= goal);
  return Number(value) >= goal;
}

/** Per confrontare due valori: con più parti conta la somma. */
export function size(v) {
  if (v == null) return 0;
  return Array.isArray(v) ? v.reduce((n, x) => n + (Number(x) || 0), 0) : Number(v) || 0;
}

function valid(v) {
  if (v == null || v === '') return false;
  return Array.isArray(v) ? v.length > 0 && v.every((x) => Number.isFinite(Number(x))) : Number.isFinite(Number(v));
}

/**
 * Il valore di ogni seduta di un esercizio: Map data → valore, in ordine di data.
 * `attempts` sono già quelli dell'esercizio (e dello stesso gradino), in ordine di tempo.
 */
export function dayValues(exercise, attempts) {
  const per = TRIES_PER_DAY[exercise?.measure?.type] ?? 1;
  const byDay = new Map();
  for (const a of attempts) {
    const list = byDay.get(a.date) ?? [];
    for (const v of a.tries ?? []) if (valid(v)) list.push(v);
    byDay.set(a.date, list);
  }
  const out = new Map();
  for (const d of [...byDay.keys()].sort()) {
    const first = byDay.get(d).slice(0, per);
    if (!first.length) continue;
    out.set(d, first.reduce((best, v) => (size(v) > size(best) ? v : best)));
  }
  return out;
}

const EMPTY = Object.freeze({ B: null, A: null, O: null, P: null, half: null, best: null, last: null, lastDate: null, days: 0, count: 0, stale: false });

/**
 * Le medaglie di un esercizio.
 * @returns { B, A, O, P: data in cui è arrivata o null; half: primo giorno da oro se ne manca un
 *            secondo; best: il record; last: { date, value }; lastDate; days; count; stale }
 */
export function medalsFor(exercise, attempts, today = todayIso()) {
  const mine = attempts.filter((a) => a.ex === exercise.id);
  if (!mine.length) return { ...EMPTY };
  const main = dayValues(exercise, mine.filter((a) => !a.tier));
  const res = { ...EMPTY, count: mine.length };

  for (const tier of TIERS) {
    const goal = exercise.goals?.[tier];
    if (goal == null) continue;
    // Un gradino con una misura sua (es. il platino su un foglio A4) si legge solo dai suoi tentativi.
    const days = exercise.alt?.[tier] ? dayValues(exercise, mine.filter((a) => a.tier === tier)) : main;
    const hits = [...days.entries()].filter(([, v]) => reaches(v, goal)).map(([d]) => d);
    if (tier === 'O') {
      if (hits.length >= 2) res.O = hits[1];
      else if (hits.length === 1) res.half = hits[0];
    } else if (hits.length) {
      res[tier] = hits[0];
    }
  }

  const entries = [...main.entries()];
  for (const [, v] of entries) if (res.best == null || size(v) > size(res.best)) res.best = v;
  if (entries.length) res.last = { date: entries[entries.length - 1][0], value: entries[entries.length - 1][1] };
  const dates = [...new Set(mine.map((a) => a.date))].sort();
  res.days = dates.length;
  res.lastDate = dates[dates.length - 1] ?? null;
  const any = TIERS.some((t) => res[t]);
  res.stale = Boolean(any && res.lastDate && diffDays(res.lastDate, today) >= STALE_DAYS);
  return res;
}

/** Le medaglie di tutti gli esercizi misurati almeno una volta: { [id]: medaglie }. */
export function allMedals(catalog, attempts, today = todayIso()) {
  const ids = [...new Set(attempts.map((a) => a.ex))];
  const out = {};
  for (const id of ids) {
    const ex = catalog.exercise(id);
    if (ex) out[id] = medalsFor(ex, attempts, today);
  }
  return out;
}

/** Il gradino più alto preso, o null. */
export function topTier(m) {
  for (const t of [...TIERS].reverse()) if (m?.[t]) return t;
  return null;
}

/** Quante medaglie per gradino. */
export function medalCount(medals) {
  const out = { B: 0, A: 0, O: 0, P: 0 };
  for (const m of Object.values(medals)) for (const t of TIERS) if (m[t]) out[t]++;
  return out;
}

/**
 * Il prossimo obiettivo: il gradino più basso non ancora preso. I gradini sono indipendenti
 * (il platino non chiede l'oro). Null se non c'è più niente da prendere o l'esercizio non ha medaglie.
 */
export function nextGoal(exercise, m) {
  if (!exercise?.measure) return null;
  for (const tier of TIERS) {
    const goal = exercise.goals?.[tier];
    if (goal == null || m?.[tier]) continue;
    return { tier, goal, half: tier === 'O' && Boolean(m?.half), alt: exercise.alt?.[tier] ?? null };
  }
  return null;
}

const FILA_UNIT = { colpi: '', scambi: ' scambi', cicli: ' cicli', sequenze: ' sequenze', difese: ' difese' };

/** Un valore in parole: «9 su 10 in campo», «20 di fila», «25 scambi in 30 secondi». */
export function valueText(exercise, v, tier = null) {
  const m = exercise?.measure;
  if (!m || v == null) return '';
  if (m.type === 'su') {
    const what = tier && exercise.alt?.[tier] ? exercise.alt[tier] : m.what;
    if (m.parts) {
      const vals = Array.isArray(v) ? v : m.parts.map(() => v);
      return `${m.parts.map((p, i) => `${vals[i]} ${p}`).join(' e ')} su ${m.n}`;
    }
    return `${v} su ${m.n}${what ? ` ${what}` : ''}`;
  }
  if (m.type === 'fila') return `${v}${FILA_UNIT[m.unit] ?? ''} di fila`;
  if (m.type === 'tempo') return `${v} ${m.unit} in ${m.seconds} secondi`;
  if (m.type === 'conta') return `${v} ${m.what}`;
  return String(v);
}

/** Un valore breve, per le etichette: «9/10», «20», «8·6/10». */
export function shortValue(exercise, v) {
  const m = exercise?.measure;
  if (!m || v == null) return '';
  if (m.type === 'su') return `${Array.isArray(v) ? v.join('·') : v}/${m.n}`;
  return Array.isArray(v) ? v.join('·') : String(v);
}

/** «Raggiungi l'argento: 10 di fila». */
export function goalText(exercise, goal) {
  if (!goal) return '';
  return `${TIER[goal.tier].name}: ${valueText(exercise, goal.goal, goal.tier)}`;
}

/** Le medaglie arrivate passando da `before` ad `after` (anche la metà oro). */
export function newMedals(before, after) {
  const out = [];
  for (const [id, m] of Object.entries(after)) {
    const b = before[id] ?? EMPTY;
    for (const t of TIERS) if (m[t] && !b[t]) out.push({ ex: id, tier: t });
    if (m.half && !b.half && !m.O) out.push({ ex: id, tier: 'O', half: true });
  }
  return out;
}

/** Quanto manca al prossimo obiettivo, da 0 a 1 (1 = raggiunto). */
export function closeness(exercise, m) {
  const g = nextGoal(exercise, m);
  if (!g || m?.best == null || g.alt) return 0;
  return Math.min(1, size(m.best) / Math.max(1, size(g.goal)));
}
