// L'allenamento fatto con un iscritto del gruppo arriva anche nel suo diario.
//
// Chi lo registra lascia una copia ridotta nella posta in arrivo del compagno
// (users/{uid}/inbox/{id}): giorno, durata, fondamentali ed esercizi. Niente misure, note o
// sensazioni: quelle sono di chi le ha scritte. Alla prima apertura l'app del compagno la trasforma
// in una voce del suo diario e la toglie dalla posta. Se lui quell'allenamento l'ha già segnato
// (stesso giorno, con la stessa persona) non si aggiunge niente.
//
// La copia parte una volta sola: quando la voce nasce, o quando le si cambia il compagno. Le
// correzioni fatte dopo e la cancellazione non arrivano all'altro: ognuno sistema il proprio diario.
// Queste funzioni non leggono lo stato dell'app: ricevono dati e restituiscono dati.

import { BRICK, eventBricks } from '../data/bricks.js';
import { BASE } from '../data/catalog.js';
import { normalizePartner } from './partner.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BRICKS = 20;
const MAX_EXERCISES = 12;

/**
 * A chi va la copia di questa voce: l'id del compagno, oppure null.
 * `previous` è la voce com'era prima di questo salvataggio (null se è nuova), `mates` gli iscritti.
 */
export function shareTarget(ev, previous, mates = []) {
  if (!ev || ev.kind !== 'training' || ev.planned || ev.from) return null;
  const p = normalizePartner(ev.partner);
  if (p?.kind !== 'mate' || !mates.some((m) => m.id === p.id)) return null;
  if (ev.sharedTo === p.id) return null;
  // Una voce già fatta con lo stesso compagno c'era anche prima: la copia non riparte.
  const before = previous && !previous.planned ? normalizePartner(previous.partner) : null;
  if (before?.kind === 'mate' && before.id === p.id) return null;
  return p.id;
}

/** La copia da lasciare al compagno. `user` è chi l'ha registrata: { uid, name }. */
export function makeShare(ev, user, catalog = BASE, now = Date.now()) {
  const bricks = eventBricks(ev, catalog)
    .slice(0, MAX_BRICKS)
    .map((b) => ({ type: b.type, minutes: Number(b.minutes) || 0, exs: (b.exs ?? []).slice(0, MAX_EXERCISES) }));
  return { id: ev.id, from: user.uid, name: String(user.name ?? '').slice(0, 120), date: ev.date, minutes: Math.round(Number(ev.minutes) || 0), bricks, at: now };
}

/**
 * Una copia arrivata → la voce da aggiungere al diario, oppure null se non va aggiunta (è scritta
 * male, c'è già, oppure quell'allenamento l'hai già segnato tu). Quello che arriva l'ha scritto un
 * altro: si tiene solo ciò che l'app conosce.
 */
export function receiveShare(share, events = [], { name = '', catalog = BASE } = {}) {
  if (!share?.id || typeof share.from !== 'string' || !share.from || !DATE.test(share.date ?? '')) return null;
  const id = `s${share.id}`;
  if (events.some((e) => e.id === id)) return null;
  const mine = events.some((e) => !e.planned && e.kind === 'training' && e.date === share.date && normalizePartner(e.partner)?.id === share.from);
  if (mine) return null;
  const bricks = (Array.isArray(share.bricks) ? share.bricks : [])
    .filter((b) => BRICK[b?.type])
    .slice(0, MAX_BRICKS)
    .map((b) => ({ type: b.type, minutes: clampMinutes(b.minutes, 120), exs: (Array.isArray(b.exs) ? b.exs : []).filter((x) => typeof x === 'string' && catalog.exercise(x)).slice(0, MAX_EXERCISES) }));
  const who = String(name || share.name || '').trim().slice(0, 120) || 'Un compagno';
  return {
    id,
    kind: 'training',
    date: share.date,
    minutes: clampMinutes(share.minutes, 600),
    bricks,
    exercises: [...new Set(bricks.flatMap((b) => b.exs))],
    attempts: [],
    partner: { kind: 'mate', id: share.from, name: who },
    from: share.from
  };
}

function clampMinutes(v, max) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
}
