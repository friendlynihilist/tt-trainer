// Il "file principale": programma, percorsi ed esercizi. È contenuto condiviso e di
// sola lettura, distribuito con l'app. I dati di ciascun utente vivono altrove
// (Firestore, sotto users/{uid}) e non possono toccarlo.

export const LEVELS = 5;
export const TEST_ATTEMPTS = 10;

/** Fasi della sessione da 90 minuti. */
export const PHASES = [
  { id: 'warmup', name: 'Riscaldamento', minutes: 10 },
  { id: 'serve', name: 'Servizi e ricezione', minutes: 15 },
  { id: 'ex1', name: 'Esercizio 1', minutes: 25 },
  { id: 'ex2', name: 'Esercizio 2', minutes: 25 },
  { id: 'match', name: 'Partitella', minutes: 15 }
];

export const WARMUP_TEXT = 'Dritto e rovescio in diagonale, top su block da tutti e due i lati.';
export const VALID_ATTEMPT =
  'Un tentativo vale se la palla entra e dopo il colpo torni in posizione di attesa.';

function track(id, name, short, side, strokes, levels) {
  return {
    id,
    block: id.split('-')[0],
    name,
    short,
    side,
    strokes,
    levels: levels.map(([levelName, drill, test, goal], i) => ({
      n: i + 1,
      id: `${id}-${i + 1}`,
      name: levelName,
      drill,
      test,
      goal
    }))
  };
}

export const TRACKS = {
  '1-1': track('1-1', 'Top di dritto su palla senza taglio', 'Top di dritto', 'D', ['top-d'], [
    [
      'Palla scivolata',
      'Il compagno fa scivolare la palla sul tavolo, senza rimbalzo. Top di dritto.',
      '10 palle: valide quelle oltre la metà del tavolo avversario.',
      'Passa la rete con margine e cade profonda.'
    ],
    [
      'Diagonale fissa',
      'Top di dritto in diagonale contro block, ritmo medio, sempre nello stesso punto.',
      '10 top di fila: si contano quelli in campo.',
      'Rimbalzo sempre sullo stesso punto (un foglio come bersaglio).'
    ],
    [
      'Due punti',
      '1 top dal centro + 1 dal lato dritto, sul block del compagno.',
      '10 palle (5 coppie): si contano quelle in campo.',
      'Stessa profondità dai due punti.'
    ],
    [
      'Palla casuale',
      'Il compagno blocca dove vuole sui due terzi del tavolo dal lato dritto.',
      '10 palle: si contano quelle in campo.',
      'Profonda anche quando arrivi in ritardo.'
    ],
    [
      'In gioco',
      'Il compagno serve lungo senza taglio sul dritto: top, poi punto giocato.',
      '10 servizi: si contano i top in campo.',
      'Primo top lontano dal centro del tavolo.'
    ]
  ]),
  '1-2': track('1-2', 'Apertura di dritto su palla tagliata', 'Apertura di dritto', 'D', ['ap-d', 'top2-d'], [
    [
      'Multiball',
      'A turno: palle tagliate lunghe, sempre nello stesso punto sul dritto. Apertura in diagonale.',
      '10 palle: si contano le aperture in campo.',
      'Parabola alta sulla rete, palla profonda.'
    ],
    [
      'Taglio su taglio',
      'Al 3° palleggio il compagno allunga sul dritto. Apertura in diagonale.',
      '10 aperture: si contano quelle in campo.',
      'Parabola alta sulla rete, palla profonda.'
    ],
    [
      'Secondo top',
      'Apertura su taglio, il compagno blocca, secondo top di dritto.',
      '10 sequenze: valide se entrano tutti e due i colpi.',
      'Prima palla carica, seconda più tesa.'
    ],
    [
      'Dal servizio',
      'Servizio corto tagliato, il compagno taglia lungo sul dritto, apertura, punto giocato.',
      '10 servizi: si contano le aperture in campo.',
      "Apertura profonda sull'angolo."
    ],
    [
      'Palla casuale',
      'Come il livello 4, ma il compagno taglia lungo dove vuole. Apri sempre di dritto, girandoti se serve.',
      '10 servizi: si contano le aperture in campo.',
      'Apertura profonda da qualsiasi punto.'
    ]
  ]),
  '2-1': track('2-1', 'Top di rovescio su palla senza taglio', 'Top di rovescio', 'R', ['top-r'], [
    [
      'Palla scivolata',
      'Il compagno fa scivolare la palla sul tavolo, senza rimbalzo. Top di rovescio.',
      '10 palle: valide quelle oltre la metà del tavolo avversario.',
      'Passa la rete con margine e cade profonda.'
    ],
    [
      'Diagonale fissa',
      'Top di rovescio in diagonale contro block, ritmo medio, sempre nello stesso punto.',
      '10 top di fila: si contano quelli in campo.',
      'Rimbalzo sempre sullo stesso punto (un foglio come bersaglio).'
    ],
    [
      'Due punti',
      "1 top dall'angolo + 1 dal centro, sul block del compagno.",
      '10 palle (5 coppie): si contano quelle in campo.',
      'Stessa profondità dai due punti.'
    ],
    [
      'Palla casuale',
      'Il compagno blocca dove vuole sulla metà tavolo del rovescio.',
      '10 palle: si contano quelle in campo.',
      'Profonda anche quando arrivi in ritardo.'
    ],
    [
      'In gioco',
      'Il compagno serve lungo senza taglio sul rovescio: top, poi punto giocato.',
      '10 servizi: si contano i top in campo.',
      'Primo top lontano dal centro del tavolo.'
    ]
  ]),
  '2-2': track('2-2', 'Apertura di rovescio su palla tagliata', 'Apertura di rovescio', 'R', ['ap-r', 'top2-r'], [
    [
      'Multiball',
      'A turno: palle tagliate lunghe, sempre nello stesso punto sul rovescio. Apertura in diagonale.',
      '10 palle: si contano le aperture in campo.',
      'Parabola alta sulla rete, palla profonda.'
    ],
    [
      'Taglio su taglio',
      'Al 3° palleggio il compagno allunga sul rovescio. Apertura in diagonale.',
      '10 aperture: si contano quelle in campo.',
      'Parabola alta sulla rete, palla profonda.'
    ],
    [
      'Secondo top',
      'Apertura su taglio, il compagno blocca, secondo top di rovescio.',
      '10 sequenze: valide se entrano tutti e due i colpi.',
      'Prima palla carica, seconda più tesa.'
    ],
    [
      'Dal servizio',
      'Servizio corto tagliato, il compagno taglia lungo sul rovescio, apertura, punto giocato.',
      '10 servizi: si contano le aperture in campo.',
      "Apertura profonda sull'angolo."
    ],
    [
      'Palla casuale',
      'Come il livello 4, ma il compagno taglia lungo dove vuole sulla metà del rovescio.',
      '10 servizi: si contano le aperture in campo.',
      'Apertura profonda da qualsiasi punto.'
    ]
  ]),
  '3-1': track(
    '3-1',
    'Servizio, apertura, secondo top',
    'Servizio e apertura',
    null,
    ['srv-corto-tagliato', 'ap-d', 'ap-r', 'top2-d', 'top2-r'],
    [
      [
        'Lato dritto',
        'Servizio corto tagliato, risposta tagliata lunga sul dritto, apertura di dritto, secondo top.',
        '10 sequenze: valide se entrano apertura e secondo top.',
        'Apertura profonda, secondo top più teso.'
      ],
      [
        'Lato rovescio',
        'Stessa sequenza con risposta tagliata lunga sul rovescio e apertura di rovescio.',
        '10 sequenze: valide se entrano apertura e secondo top.',
        'Apertura profonda, secondo top più teso.'
      ],
      [
        'Lato a scelta',
        'Il compagno sceglie il lato della risposta lunga: apri di dritto o di rovescio, poi secondo top.',
        '10 sequenze: valide se entrano apertura e secondo top.',
        'Apertura dal lato giusto.'
      ],
      [
        'Palla casuale',
        'Il compagno risponde lungo dove vuole, poi punto giocato.',
        '10 servizi: si contano le aperture in campo.',
        'Apertura lontano dal colpo forte del compagno.'
      ],
      [
        'Partita',
        'Partita agli 11 giocando solo i primi 3 colpi: servizio, risposta, terza palla.',
        '10 punti al servizio: si contano le terze palle in campo.',
        'Terza palla in campo e profonda.'
      ]
    ]
  ),
  '3-2': track('3-2', 'Ricezione tagliata', 'Ricezione tagliata', null, ['ric-taglio-corto', 'ric-taglio-lungo', 'ric-top'], [
    [
      'Taglio corto',
      'Il compagno serve corto tagliato. Rispondi tagliato corto.',
      '10 risposte: valide quelle con doppio rimbalzo.',
      'Bassa sulla rete, secondo rimbalzo sul tavolo.'
    ],
    [
      'Taglio lungo',
      'Il compagno serve corto tagliato. Rispondi tagliato lungo sugli angoli.',
      "10 risposte: valide quelle nell'ultimo terzo del tavolo.",
      'Bassa e profonda, vicino alla linea di fondo.'
    ],
    [
      'Risposta dichiarata',
      'Prima di ogni servizio dici la risposta che farai: corta o lunga.',
      '10 risposte: valida se è quella dichiarata.',
      'La risposta scelta, non quella che viene.'
    ],
    [
      'Corto o lungo',
      'Il compagno serve corto o lungo: sul corto tagli, sul lungo fai top.',
      '10 risposte: valida se la scelta è giusta e la palla entra.',
      'Il corto resta corto, il lungo viene attaccato.'
    ],
    [
      'Punto giocato',
      'Punto giocato dal servizio del compagno.',
      '10 servizi: si contano le risposte che il compagno non riesce ad attaccare.',
      'Una risposta che non si può attaccare.'
    ]
  ])
};

export const TRACK_IDS = Object.keys(TRACKS);

/**
 * I blocchi del ciclo. '1'..'3' sono i tre mesi; 'R' è la settimana di recupero
 * che si inserisce quando il mese 3 non è ancora sbloccato.
 */
export const BLOCKS = {
  1: {
    id: '1',
    label: 'Mese 1',
    theme: 'Dritto',
    tracks: ['1-1', '1-2'],
    maint: null,
    rule: 'Punto doppio se nasce da una tua apertura di dritto.',
    serve: {
      id: '1-S',
      server: 'Servizio corto tagliato e basso. Quando riesce, stesso movimento senza taglio.',
      receiver: 'Taglio lungo e profondo.',
      test: '10 servizi corti tagliati: validi quelli con doppio rimbalzo.',
      strokes: ['srv-corto-tagliato', 'srv-corto-liscio', 'ric-taglio-lungo']
    }
  },
  2: {
    id: '2',
    label: 'Mese 2',
    theme: 'Rovescio',
    tracks: ['2-1', '2-2'],
    maint: '1-2',
    rule: "Punto doppio se nasce da un taglio corto o da un'apertura di rovescio.",
    serve: {
      id: '2-S',
      server: "Servizio lungo veloce sull'angolo del rovescio e al gomito, alternato al corto.",
      receiver: 'Sul corto taglio corto, sul lungo top o block.',
      test: "10 servizi lunghi: validi quelli nell'ultimo terzo del tavolo.",
      strokes: ['srv-lungo-veloce', 'ric-taglio-corto', 'ric-top']
    }
  },
  3: {
    id: '3',
    label: 'Mese 3',
    theme: 'Primi colpi',
    tracks: ['3-1', '3-2'],
    maint: '2-2',
    rule: 'Si giocano solo i primi 3 colpi, poi set normali.',
    serve: {
      id: '3-S',
      server: 'Prima di servire decidi il servizio e la terza palla che ti aspetti.',
      receiver: "Dici l'effetto ad alta voce prima di muovere la racchetta, poi rispondi.",
      test: '10 servizi misti del compagno: valide le letture giuste.',
      strokes: ['srv-corto-tagliato', 'srv-lungo-veloce', 'ric-taglio-corto', 'ric-taglio-lungo']
    }
  },
  R: {
    id: 'R',
    label: 'Recupero',
    theme: 'Aperture',
    tracks: ['1-2', '2-2'],
    maint: null,
    rule: "Punto doppio se nasce da un'apertura su palla tagliata.",
    serve: {
      id: '2-S',
      server: "Servizio lungo veloce sull'angolo del rovescio e al gomito, alternato al corto.",
      receiver: 'Sul corto taglio corto, sul lungo top o block.',
      test: "10 servizi lunghi: validi quelli nell'ultimo terzo del tavolo.",
      strokes: ['srv-lungo-veloce', 'ric-taglio-corto', 'ric-top']
    }
  }
};

export const CYCLE_BLOCKS = ['1', '2', '3'];
export const WEEKS_PER_BLOCK = 4;

/** Il mese 3 si comincia solo con le due aperture su taglio almeno a questo livello. */
export const GATE = { block: '3', tracks: ['1-2', '2-2'], minLevel: 3 };

export const NEXT_CYCLE = [
  'Flip di dritto',
  'Flip di rovescio (Chiquita)',
  'Servizio a pendolo con effetto laterale',
  'Servizio di rovescio',
  'Quarta palla',
  'Controtop',
  'Gioco contro puntinati e antitop'
];

export function levelOf(trackId, n) {
  return TRACKS[trackId]?.levels[n - 1] ?? null;
}
