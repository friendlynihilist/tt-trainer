// Con chi ci si allena. Quattro casi:
//   { kind: 'solo' }                    da solo
//   { kind: 'robot' }                   con il robot
//   { kind: 'mate', id, name }          con un iscritto del gruppo
//   { kind: 'guest', name }             con qualcuno fuori dall'app (solo il nome, scritto da te)
// Le voci salvate prima della 0.10 hanno solo { id, name }: con l'id è un iscritto, senza è un esterno.
// Da solo e con il robot non ci sono turni: il tempo di ogni esercizio è tutto tuo.
// Queste funzioni non leggono lo stato dell'app: ricevono dati e restituiscono dati.

import { byTime } from './events.js';

/** Un compagno come è salvato → uno dei quattro casi, oppure null (non indicato). */
export function normalizePartner(p) {
  if (!p) return null;
  if (p.kind === 'solo') return { kind: 'solo' };
  if (p.kind === 'robot') return { kind: 'robot' };
  const name = String(p.name ?? '').trim();
  if (!name) return null;
  return p.id ? { kind: 'mate', id: p.id, name } : { kind: 'guest', name };
}

/** Il compagno da salvare in una voce o nelle impostazioni: sempre tutti i campi, così un valore nuovo copre quello vecchio. */
export function storedPartner(p) {
  const n = normalizePartner(p);
  return n ? { kind: n.kind, id: n.id ?? null, name: n.name ?? null } : null;
}

/** Ci sono i turni? Sì con una persona, e anche quando non è indicato nessuno. */
export function hasTurns(p) {
  const n = normalizePartner(p);
  return !n || n.kind === 'mate' || n.kind === 'guest';
}

/** «Marco», «Robot», «Da solo». Vuoto se non è indicato. */
export function partnerName(p) {
  const n = normalizePartner(p);
  return !n ? '' : n.kind === 'solo' ? 'Da solo' : n.kind === 'robot' ? 'Robot' : n.name;
}

/** «Con Marco», «Con il robot», «Da solo». Vuoto se non è indicato. */
export function partnerWith(p) {
  const n = normalizePartner(p);
  return !n ? '' : n.kind === 'solo' ? 'Da solo' : n.kind === 'robot' ? 'Con il robot' : `Con ${n.name}`;
}

/** La stessa scelta? */
export function samePartner(a, b) {
  const x = normalizePartner(a);
  const y = normalizePartner(b);
  if (!x || !y) return !x && !y;
  if (x.kind !== y.kind) return false;
  if (x.kind === 'mate') return x.id === y.id;
  if (x.kind === 'guest') return x.name.toLowerCase() === y.name.toLowerCase();
  return true;
}

/** Le persone con cui ti sei allenato, la più recente prima (dal diario). */
export function recentPartners(events) {
  const out = [];
  for (const e of [...events].sort(byTime).reverse()) {
    const p = normalizePartner(e.partner);
    if (p && (p.kind === 'mate' || p.kind === 'guest') && !out.some((x) => x.name.toLowerCase() === p.name.toLowerCase())) out.push(p);
  }
  return out;
}

/** L'ultima scelta scritta nel diario, di qualsiasi tipo. */
export function lastPartnerOf(events) {
  for (const e of [...events].sort(byTime).reverse()) {
    const p = normalizePartner(e.partner);
    if (p) return p;
  }
  return null;
}
