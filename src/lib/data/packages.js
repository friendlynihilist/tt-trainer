// I pacchetti per livello: due allenamenti per ogni livello, da 90 e da 60 minuti, presi dalle tabelle
// della sezione 4 di docs/ricerca-livelli-esercizi.md. Ogni blocco ha la sua durata e gli esercizi
// della libreria (library.js). Le pause non stanno qui: le aggiunge la composizione (pauses 'extra':
// 85 minuti di blocchi + 5 pause = 90; 56 + 4 = 60).
//
// Dove la tabella scrive «X o Y» il blocco usa la prima voce: le altre si scelgono sostituendo
// l'esercizio. I pacchetti sono una proposta: si sceglie quello di qualsiasi livello.

import { LEVEL_IDS, PLAYER_LEVEL } from './library.js';

/** Le varianti della partitella per livello (sezione 5). Niente pegno, risultati non condivisi. */
export const MATCH_VARIANTS = {
  principiante: {
    risk: 'Sul 10-10 punto secco: chi fa il punto vince.',
    scheme: 'sch-srv-ap',
    schemeNote: 'Il terzo colpo è un taglio lungo in un angolo, non l’apertura.'
  },
  intermedio: { risk: 'Dal 13-13 punto secco: il set resta corto.', scheme: 'sch-srv-ap' },
  avanzato: { risk: 'Chi è avanti dice il servizio prima di servire.', scheme: 'sch-srv-ap-top2' },
  esperto: { risk: 'Si parte da 8-10: chi è sotto deve fare almeno 4 punti.', scheme: 'sch-ric-quarta' },
  pro: {
    risk: 'Serie di 10 set: ognuno parte avanti 5 volte.',
    scheme: 'sch-cinque-palle',
    schemeNote: 'Chi serve sceglie lo schema in segreto. Dopo lo schema si gioca il punto.'
  }
};

const LEVEL_COLOR = { principiante: 'sky', intermedio: 'teal', avanzato: 'violet', esperto: 'plum', pro: 'pink' };

const b = (name, minutes, ...ex) => ({ name, minutes, role: null, items: ex.map((id) => ({ ex: id })) });
const partitella = (minutes, level) => ({ name: 'Partitella', minutes, role: 'match', items: [], level, schemes: [MATCH_VARIANTS[level].scheme] });

const BLOCKS = {
  principiante: {
    90: [
      b('Riscaldamento', 10, 'palleggio-d', 'palleggio-r'),
      b('Servizio e ricezione', 12, 'srv-regolare', 'srv-corto-tagliato', 'srv-bersaglio'),
      b('Taglio', 18, 'taglio-r', 'taglio-d', 'ric-taglio-lungo'),
      b('Dritto e rovescio', 18, 'palleggio-dr', 'laterale', 'chiusura'),
      b('Primo top', 12, 'top-d-multiball'),
      partitella(15, 'principiante')
    ],
    60: [
      b('Riscaldamento', 8, 'palleggio-d', 'palleggio-r'),
      b('Servizio e ricezione', 10, 'srv-corto-tagliato', 'ric-taglio-lungo'),
      b('Taglio', 15, 'taglio-r', 'ric-taglio-lungo'),
      b('Dritto e rovescio', 13, 'palleggio-dr', 'top-d-multiball'),
      partitella(10, 'principiante')
    ]
  },
  intermedio: {
    90: [
      b('Riscaldamento', 10, 'palleggio-d', 'palleggio-r', 'top-d-block'),
      b('Servizio e ricezione', 15, 'srv-pendolo', 'ric-taglio-corto', 'ric-lettura'),
      b('Top', 18, 'top-d-block', 'top-r-block', 'top-d-due-punti'),
      b('Apertura', 18, 'ap-d-multiball', 'ap-d', 'ap-r-multiball'),
      b('Gambe', 9, 'pivot'),
      partitella(15, 'intermedio')
    ],
    60: [
      b('Riscaldamento', 8, 'palleggio-d', 'palleggio-r', 'top-d-block'),
      b('Servizio e ricezione', 10, 'srv-pendolo', 'ric-taglio-corto', 'ric-lettura'),
      b('Top', 15, 'top-d-block', 'top-r-block'),
      b('Apertura', 13, 'ap-d-multiball', 'ap-r-multiball'),
      partitella(10, 'intermedio')
    ]
  },
  avanzato: {
    90: [
      b('Riscaldamento', 10, 'palleggio-dr', 'top-d-block', 'top-r-block'),
      b('Servizio e ricezione', 15, 'srv-pendolo-inverso', 'srv-mezzo-lungo', 'ric-mista', 'ric-flip-d'),
      b('Apertura e secondo top', 18, 'top2-d', 'top2-r', 'ap-r'),
      b('Palla casuale', 15, 'falkenberg', 'top-d-random', 'random-dr'),
      b('Schema', 12, 'sch-srv-ap-top2', 'flip-d-top'),
      partitella(15, 'avanzato')
    ],
    60: [
      b('Riscaldamento', 8, 'palleggio-dr', 'top-d-block', 'top-r-block'),
      b('Servizio e ricezione', 10, 'srv-pendolo-inverso', 'ric-mista'),
      b('Apertura e secondo top', 15, 'top2-d', 'top2-r'),
      b('Palla casuale', 13, 'falkenberg', 'random-dr'),
      partitella(10, 'avanzato')
    ]
  },
  esperto: {
    90: [
      b('Riscaldamento', 10, 'top-d-block', 'top-r-block', 'block-variato'),
      b('Servizio e ricezione', 15, 'srv-variato', 'ric-flip-r', 'ric-mezzo-lungo'),
      b('Controtop', 18, 'ctop-d', 'ctop-r', 'top-top-d'),
      b('Top collegati e block', 15, 'top-dr-alternato', 'block-attivo-r', 'incrociato'),
      b('Schema', 12, 'sch-ric-quarta', 'sch-srv-ap-top2'),
      partitella(15, 'esperto')
    ],
    60: [
      b('Riscaldamento', 8, 'top-d-block', 'top-r-block', 'block-variato'),
      b('Servizio e ricezione', 10, 'srv-variato', 'ric-flip-r'),
      b('Controtop', 15, 'ctop-d', 'top-top-d'),
      b('Top collegati e schema', 13, 'top-dr-alternato', 'sch-ric-quarta'),
      partitella(10, 'esperto')
    ]
  },
  pro: {
    90: [
      b('Riscaldamento', 10, 'top-dr-alternato', 'top-top-d'),
      b('Servizio e ricezione', 15, 'srv-variato', 'ric-scelta-libera'),
      b('Multiball', 15, 'multiball-intervalli'),
      b('Top contro top', 15, 'top-top-lontano', 'ctop-d', 'ctop-r'),
      b('Schema', 15, 'sch-cinque-palle'),
      partitella(15, 'pro')
    ],
    60: [
      b('Riscaldamento', 8, 'top-dr-alternato', 'top-top-d'),
      b('Servizio e ricezione', 10, 'srv-variato', 'ric-scelta-libera'),
      b('Multiball', 13, 'multiball-intervalli'),
      b('Top contro top e schema', 15, 'top-top-lontano', 'sch-cinque-palle'),
      partitella(10, 'pro')
    ]
  }
};

/** L'id di un pacchetto: «pkg-intermedio-90». */
export const packageId = (level, minutes) => `pkg-${level}-${minutes}`;

export const PACKAGE_MINUTES = [90, 60];

/** Tutti i pacchetti, in ordine di livello e poi di durata. */
export const PACKAGES = Object.fromEntries(
  LEVEL_IDS.flatMap((level) =>
    PACKAGE_MINUTES.map((minutes) => [
      packageId(level, minutes),
      {
        id: packageId(level, minutes),
        name: `${PLAYER_LEVEL[level].name} · ${minutes}′`,
        color: LEVEL_COLOR[level],
        package: true,
        level,
        minutes,
        pauses: 'extra',
        blocks: BLOCKS[level][minutes]
      }
    ])
  )
);

/** I pacchetti di un livello. */
export function packagesOf(level) {
  return PACKAGE_MINUTES.map((m) => PACKAGES[packageId(level, m)]).filter(Boolean);
}
