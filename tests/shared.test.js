import { describe, expect, it } from 'vitest';
import { pack, unpack } from '../src/lib/store/nested.js';
import { shareTarget, makeShare, receiveShare } from '../src/lib/engine/shared.js';
import { settleGoal } from '../src/lib/engine/attempts.js';
import { allAttempts } from '../src/lib/engine/attempts.js';
import { allMedals } from '../src/lib/engine/medals.js';
import { BASE } from '../src/lib/data/catalog.js';
import { LIBRARY_BY_ID } from '../src/lib/data/library.js';
import { eventName } from '../src/lib/data/bricks.js';

describe('le misure in due parti in rete', () => {
  const ev = { id: 'e1', kind: 'training', date: '2026-11-24', attempts: [{ ex: 'srv-regolare', fmt: 'su', tries: [[8, 8]] }, { ex: 'srv-bersaglio', fmt: 'su', tries: [6] }] };

  it('prima di scrivere, nessun elenco resta dentro un altro elenco', () => {
    const packed = pack(ev);
    const nested = (v, inList = false) => (Array.isArray(v) ? inList || v.some((x) => nested(x, true)) : v && typeof v === 'object' ? Object.values(v).some((x) => nested(x)) : false);
    expect(nested(ev)).toBe(true);
    expect(nested(packed)).toBe(false);
    expect(packed.attempts[0].tries).toEqual([{ _list: [8, 8] }]);
    // Quello che non era annidato non cambia.
    expect(packed.attempts[1]).toEqual(ev.attempts[1]);
  });

  it('in lettura torna com’era, e vale la medaglia', () => {
    const back = unpack(pack(ev));
    expect(back).toEqual(ev);
    const medals = allMedals(BASE, allAttempts([back], BASE), '2026-11-24');
    expect(medals['srv-regolare'].A).toBe('2026-11-24');
  });

  it('anche più livelli, e i valori semplici restano uguali', () => {
    const v = { a: [[1, [2, 3]], []], b: null, c: 'x', d: [{ e: [[4]] }] };
    expect(unpack(pack(v))).toEqual(v);
    expect(pack(5)).toBe(5);
    expect(unpack(null)).toBe(null);
  });
});

describe('il numero scritto e non registrato', () => {
  const fila = Object.values(LIBRARY_BY_ID).find((e) => e.measure?.type === 'fila');
  const su = LIBRARY_BY_ID['srv-bersaglio'];
  const parti = LIBRARY_BY_ID['srv-regolare'];
  const empty = { ex: 'x', tier: null, tries: [], marks: [], score: null, cur: null, parts: [], q: null };

  it('lasciando l’esercizio diventa un tentativo', () => {
    expect(settleGoal(fila, { ...empty, cur: 14 })).toMatchObject({ tries: [14], cur: null });
    expect(settleGoal(fila, { ...empty, tries: [10, 12], cur: 14 })).toMatchObject({ tries: [10, 12, 14], cur: null });
  });

  it('ma non oltre i tentativi della seduta', () => {
    const v = { ...empty, tries: [10, 12, 9], cur: 20 };
    expect(settleGoal(fila, v)).toBe(v);
  });

  it('una serie in due parti già compilata diventa la serie', () => {
    expect(settleGoal(parti, { ...empty, parts: [8, 6] }).tries).toEqual([[8, 6]]);
    const half = { ...empty, parts: [8, null] };
    expect(settleGoal(parti, half)).toBe(half);
  });

  it('senza niente da sistemare non cambia nulla', () => {
    expect(settleGoal(fila, empty)).toBe(empty);
    const pad = { ...empty, marks: [1, 1, 0], score: null };
    expect(settleGoal(su, pad)).toBe(pad);
    expect(settleGoal(null, empty)).toBe(empty);
  });
});

describe('l’allenamento fatto con un iscritto', () => {
  const mates = [{ id: 'paolo', name: 'Paolo' }];
  const partner = { kind: 'mate', id: 'paolo', name: 'Paolo' };
  const ev = {
    id: 'e9',
    kind: 'training',
    date: '2026-11-24',
    minutes: 52,
    partner,
    bricks: [{ type: 'dritto', minutes: 20, exs: ['top-top-lontano'] }, { type: 'servizio', minutes: 10, exs: ['srv-regolare'] }],
    attempts: [{ ex: 'srv-regolare', fmt: 'su', tries: [[8, 8]] }],
    feel: 4,
    note: 'mio'
  };

  it('parte quando la voce nasce, verso l’iscritto scelto', () => {
    expect(shareTarget(ev, null, mates)).toBe('paolo');
    // Un appuntamento in programma che diventa fatto è una voce nuova.
    expect(shareTarget(ev, { ...ev, planned: true }, mates)).toBe('paolo');
  });

  it('non parte da solo, con il robot, con un esterno o con chi non è più nel gruppo', () => {
    expect(shareTarget({ ...ev, partner: { kind: 'solo' } }, null, mates)).toBe(null);
    expect(shareTarget({ ...ev, partner: { kind: 'robot' } }, null, mates)).toBe(null);
    expect(shareTarget({ ...ev, partner: { kind: 'guest', name: 'Luca' } }, null, mates)).toBe(null);
    expect(shareTarget({ ...ev, partner: { kind: 'mate', id: 'via', name: 'Via' } }, null, mates)).toBe(null);
    expect(shareTarget({ ...ev, partner: undefined }, null, mates)).toBe(null);
  });

  it('non parte per un torneo, per un appuntamento in programma o per una voce ricevuta', () => {
    expect(shareTarget({ ...ev, kind: 'torneo' }, null, mates)).toBe(null);
    expect(shareTarget({ ...ev, planned: true }, null, mates)).toBe(null);
    expect(shareTarget({ ...ev, from: 'paolo' }, null, mates)).toBe(null);
  });

  it('non riparte a ogni correzione; riparte se cambia il compagno', () => {
    expect(shareTarget({ ...ev, sharedTo: 'paolo' }, { ...ev, sharedTo: 'paolo' }, mates)).toBe(null);
    // Una voce di prima, mai mandata: correggerla non la manda.
    expect(shareTarget({ ...ev, minutes: 60 }, ev, mates)).toBe(null);
    const two = [...mates, { id: 'anna', name: 'Anna' }];
    expect(shareTarget({ ...ev, sharedTo: 'paolo', partner: { kind: 'mate', id: 'anna', name: 'Anna' } }, { ...ev, sharedTo: 'paolo' }, two)).toBe('anna');
    expect(shareTarget(ev, { ...ev, partner: { kind: 'guest', name: 'Luca' } }, mates)).toBe('paolo');
  });

  it('la copia porta giorno, durata e fondamentali: niente misure, note o sensazioni', () => {
    const share = makeShare(ev, { uid: 'io', name: 'Carlo' }, BASE, 7);
    expect(share).toEqual({ id: 'e9', from: 'io', name: 'Carlo', date: '2026-11-24', minutes: 52, bricks: [{ type: 'dritto', minutes: 20, exs: ['top-top-lontano'] }, { type: 'servizio', minutes: 10, exs: ['srv-regolare'] }], at: 7 });
    expect(JSON.stringify(share)).not.toMatch(/attempts|feel|note|mio/);
  });

  it('chi la riceve la trova nel diario, con chi l’ha segnata come compagno', () => {
    const share = makeShare(ev, { uid: 'io', name: 'Carlo' }, BASE, 7);
    const got = receiveShare(share, [], { name: 'Carlo P.' });
    expect(got).toMatchObject({ id: 'se9', kind: 'training', date: '2026-11-24', minutes: 52, from: 'io', partner: { kind: 'mate', id: 'io', name: 'Carlo P.' }, attempts: [], exercises: ['top-top-lontano', 'srv-regolare'] });
    expect(eventName(got, BASE)).toBe('Dritto e servizio');
    // Una voce ricevuta non torna indietro a chi l'ha mandata.
    expect(shareTarget(got, null, [{ id: 'io', name: 'Carlo' }])).toBe(null);
  });

  it('non si aggiunge due volte, né se quell’allenamento l’hai già segnato tu', () => {
    const share = makeShare(ev, { uid: 'io', name: 'Carlo' }, BASE, 7);
    expect(receiveShare(share, [{ id: 'se9', kind: 'training', date: '2026-11-24' }])).toBe(null);
    expect(receiveShare(share, [{ id: 'mio', kind: 'training', date: '2026-11-24', partner: { kind: 'mate', id: 'io', name: 'Carlo' } }])).toBe(null);
    // Un altro allenamento lo stesso giorno, con un'altra persona, non conta.
    expect(receiveShare(share, [{ id: 'altro', kind: 'training', date: '2026-11-24', partner: { kind: 'guest', name: 'Luca' } }])).not.toBe(null);
    expect(receiveShare(share, [{ id: 'prog', kind: 'training', date: '2026-11-24', planned: true, partner: { kind: 'mate', id: 'io', name: 'Carlo' } }])).not.toBe(null);
  });

  it('quello che arriva scritto male si scarta o si ripulisce', () => {
    expect(receiveShare(null)).toBe(null);
    expect(receiveShare({ id: 'x', from: 'io', date: 'ieri' })).toBe(null);
    expect(receiveShare({ id: 'x', date: '2026-11-24' })).toBe(null);
    const odd = receiveShare({ id: 'x', from: 'io', date: '2026-11-24', minutes: 'tante', name: 'N'.repeat(500), bricks: [{ type: 'inventato', exs: ['a'] }, { type: 'dritto', minutes: 9999, exs: ['non-esiste', 'top-top-lontano', 7] }, null] });
    expect(odd.minutes).toBe(0);
    expect(odd.partner.name.length).toBe(120);
    expect(odd.bricks).toEqual([{ type: 'dritto', minutes: 120, exs: ['top-top-lontano'] }]);
    expect(receiveShare({ id: 'y', from: 'io', date: '2026-11-24' }).partner.name).toBe('Un compagno');
  });
});
