// Tassonomia: colpi, palla in arrivo, zone, fasi del punto, errori, tipi di attività.
// Gli id sono stabili: nei dati degli utenti si salvano gli id, non le etichette.

// Le famiglie valgono per i colpi e per gli esercizi della libreria. Ognuna ha il suo colore.
export const FAMILIES = [
  { id: 'servizio', name: 'Servizio', color: 'amber' },
  { id: 'ricezione', name: 'Ricezione', color: 'teal' },
  { id: 'palleggio', name: 'Palleggio', color: 'sky' },
  { id: 'attacco', name: 'Attacco', color: 'blue' },
  { id: 'controllo', name: 'Block e controtop', color: 'violet' },
  { id: 'taglio', name: 'Gioco tagliato', color: 'brown' },
  { id: 'gambe', name: 'Gambe', color: 'pink' },
  { id: 'schemi', name: 'Schemi', color: 'plum' }
];
export const FAMILY = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));

function s(id, family, name, short, side, phases, about) {
  return { id, family, name, short, side, phases, about };
}

// side: 'D' dritto, 'R' rovescio, null se non si applica.
// phases: fasi del punto in cui il colpo compare di solito.
export const STROKES = [
  s('srv-corto-tagliato', 'servizio', 'Servizio corto tagliato', 'Corto tagliato', null, ['servizio'],
    'Rotazione all’indietro e palla bassa: sul tavolo avversario farebbe due rimbalzi.'),
  s('srv-corto-liscio', 'servizio', 'Servizio corto senza taglio', 'Corto senza taglio', null, ['servizio'],
    'Stesso movimento del tagliato, ma con poca rotazione: serve a far sbagliare la lettura.'),
  s('srv-lungo-veloce', 'servizio', 'Servizio lungo veloce', 'Lungo veloce', null, ['servizio'],
    'Teso e rapido, arriva vicino alla linea di fondo: toglie tempo a chi riceve.'),
  s('srv-pendolo', 'servizio', 'Servizio a pendolo laterale', 'Pendolo', 'D', ['servizio'],
    'Servizio di dritto con il polso che oscilla come un pendolo: effetto laterale, da mescolare con taglio o top.'),
  s('srv-rovescio', 'servizio', 'Servizio di rovescio', 'Di rovescio', 'R', ['servizio'],
    'Servizio giocato dal lato del rovescio: l’effetto laterale gira al contrario del pendolo.'),
  s('srv-pendolo-inverso', 'servizio', 'Servizio a pendolo inverso', 'Pendolo inverso', 'D', ['servizio'],
    'Pendolo con l’effetto laterale opposto a quello normale.'),
  s('srv-mezzo-lungo', 'servizio', 'Servizio mezzo lungo', 'Mezzo lungo', null, ['servizio'],
    'Servizio che esce appena dal tavolo: chi riceve fatica a decidere se attaccare.'),

  s('ric-taglio-corto', 'ricezione', 'Ricezione: taglio corto', 'Taglio corto', null, ['risposta'],
    'Risposta tagliata che resta corta: il secondo rimbalzo cade sul tavolo.'),
  s('ric-taglio-lungo', 'ricezione', 'Ricezione: taglio lungo', 'Taglio lungo', null, ['risposta'],
    'Risposta tagliata bassa e profonda, vicino alla linea di fondo.'),
  s('ric-top', 'ricezione', 'Ricezione: top su servizio lungo', 'Top su lungo', null, ['risposta'],
    'Attacco in top sul servizio che esce dal tavolo.'),
  s('ric-flip-d', 'ricezione', 'Ricezione: flip di dritto', 'Flip di dritto', 'D', ['risposta'],
    'Attacco sopra il tavolo su palla corta, giocato con avambraccio e polso.'),
  s('ric-flip-r-base', 'ricezione', 'Ricezione: flip di rovescio semplice', 'Flip di rovescio', 'R', ['risposta'],
    'Flip di rovescio con poca rotazione, su palla corta senza taglio o poco tagliata.'),
  s('ric-flip-r', 'ricezione', 'Ricezione: Chiquita', 'Chiquita', 'R', ['risposta'],
    'Flip di rovescio con molto polso: rotazione in avanti e laterale su palla corta.'),
  s('ric-mezzo-lungo', 'ricezione', 'Ricezione: taglio mezzo lungo', 'Mezzo lungo', null, ['risposta'],
    'Risposta tagliata che esce appena dal tavolo.'),

  s('palleggio-d', 'palleggio', 'Palleggio di dritto', 'Palleggio di dritto', 'D', ['scambio'],
    'Il colpo base di dritto, senza taglio e con poca rotazione.'),
  s('palleggio-r', 'palleggio', 'Palleggio di rovescio', 'Palleggio di rovescio', 'R', ['scambio'],
    'Il colpo base di rovescio, senza taglio e con poca rotazione.'),

  s('top-d', 'attacco', 'Top di dritto su palla senza taglio', 'Top di dritto', 'D', ['scambio'],
    'Colpo d’attacco con rotazione in avanti su palla senza taglio o in top.'),
  s('top-r', 'attacco', 'Top di rovescio su palla senza taglio', 'Top di rovescio', 'R', ['scambio'],
    'Colpo d’attacco con rotazione in avanti su palla senza taglio o in top.'),
  s('ap-d', 'attacco', 'Apertura di dritto su taglio', 'Apertura di dritto', 'D', ['terza', 'quarta'],
    'Il primo top su palla tagliata: movimento più verso l’alto, tanta rotazione.'),
  s('ap-r', 'attacco', 'Apertura di rovescio su taglio', 'Apertura di rovescio', 'R', ['terza', 'quarta'],
    'Il primo top su palla tagliata: movimento più verso l’alto, tanta rotazione.'),
  s('top2-d', 'attacco', 'Secondo top di dritto', 'Secondo top di dritto', 'D', ['scambio'],
    'Il top dopo l’apertura, sul block avversario: più teso e in avanti.'),
  s('top2-r', 'attacco', 'Secondo top di rovescio', 'Secondo top di rovescio', 'R', ['scambio'],
    'Il top dopo l’apertura, sul block avversario: più teso e in avanti.'),
  s('chiusura', 'attacco', 'Chiusura', 'Chiusura', null, ['scambio'],
    'Colpo veloce e teso per finire il punto su una palla alta.'),

  s('block-d', 'controllo', 'Block di dritto', 'Block di dritto', 'D', ['quarta', 'scambio'],
    'Risposta al top avversario: racchetta chiusa, movimento corto, si usa la sua velocità.'),
  s('block-r', 'controllo', 'Block di rovescio', 'Block di rovescio', 'R', ['quarta', 'scambio'],
    'Risposta al top avversario: racchetta chiusa, movimento corto, si usa la sua velocità.'),
  s('ctop-d', 'controllo', 'Controtop di dritto', 'Controtop di dritto', 'D', ['scambio'],
    'Top giocato sul top avversario.'),
  s('ctop-r', 'controllo', 'Controtop di rovescio', 'Controtop di rovescio', 'R', ['scambio'],
    'Top giocato sul top avversario.'),
  s('difesa', 'controllo', 'Difesa da lontano', 'Difesa', null, ['scambio'],
    'Pallonetto o top lontano dal tavolo, sulle chiusure avversarie.'),

  s('taglio-d', 'taglio', 'Taglio di dritto', 'Taglio di dritto', 'D', ['scambio'],
    'Palla tagliata di dritto, bassa sulla rete.'),
  s('taglio-r', 'taglio', 'Taglio di rovescio', 'Taglio di rovescio', 'R', ['scambio'],
    'Palla tagliata di rovescio, bassa sulla rete.'),
  s('taglio-corto', 'taglio', 'Taglio corto in palleggio', 'Taglio corto', null, ['scambio'],
    'Palla tagliata che resta corta durante il palleggio tagliato.'),
  s('taglio-lungo', 'taglio', 'Taglio lungo in palleggio', 'Taglio lungo', null, ['scambio'],
    'Palla tagliata bassa e profonda durante il palleggio tagliato.'),

  s('pivot', 'gambe', 'Pivot (dritto dal lato rovescio)', 'Pivot', 'D', ['terza', 'scambio'],
    'Giro attorno all’angolo del rovescio per colpire di dritto.'),
  s('laterale', 'gambe', 'Spostamento laterale', 'Spostamento laterale', null, ['scambio'],
    'Passi laterali per arrivare dietro la palla prima di colpire.'),
  s('ritorno', 'gambe', 'Ritorno in posizione', 'Ritorno in posizione', null, ['scambio'],
    'Rientro in posizione di attesa dopo ogni colpo.')
];

export const BALLS = [
  { id: 'tagliata-pesante', name: 'Tagliata pesante' },
  { id: 'tagliata-leggera', name: 'Tagliata leggera' },
  { id: 'senza-taglio', name: 'Senza taglio' },
  { id: 'top', name: 'Top' },
  { id: 'laterale', name: 'Laterale' },
  { id: 'non-letto', name: 'Effetto non letto' }
];

// La zona ha due dimensioni: direzione e profondità. Nell'Excel erano mescolate in una lista.
export const ZONE_SIDES = [
  { id: 'd', name: 'Lato dritto' },
  { id: 'c', name: 'Centro (gomito)' },
  { id: 'r', name: 'Lato rovescio' }
];
export const ZONE_DEPTHS = [
  { id: 'corta', name: 'Corta' },
  { id: 'semilunga', name: 'Semilunga' },
  { id: 'lunga', name: 'Lunga' }
];

export const POINT_PHASES = [
  { id: 'servizio', name: 'Servizio' },
  { id: 'risposta', name: 'Risposta' },
  { id: 'terza', name: 'Terza palla' },
  { id: 'quarta', name: 'Quarta palla' },
  { id: 'scambio', name: 'Scambio', hint: 'dal 5° colpo' }
];

// group: 'palla' = dove è finita la palla, 'causa' = perché.
export const ERRORS = [
  { id: 'rete', name: 'In rete', group: 'palla' },
  { id: 'lunga', name: 'Lunga', group: 'palla' },
  { id: 'larga', name: 'Larga', group: 'palla' },
  { id: 'alta', name: 'Troppo alta', group: 'palla' },
  { id: 'corta', name: 'Troppo corta', group: 'palla' },
  { id: 'ritardo', name: 'In ritardo', group: 'causa' },
  { id: 'piedi', name: 'Piedi fuori posizione', group: 'causa' },
  { id: 'lettura', name: 'Effetto letto male', group: 'causa' },
  { id: 'scelta', name: 'Scelta sbagliata', group: 'causa' },
  { id: 'forzato', name: 'Colpo troppo forzato', group: 'causa' },
  { id: 'posizione', name: 'Non tornato in posizione', group: 'causa' },
  { id: 'effetto', name: 'Poco effetto', group: 'causa' },
  { id: 'irregolare', name: 'Servizio non regolamentare', group: 'causa' }
];
export const ERROR_GROUPS = [
  { id: 'palla', name: 'Dove è finita' },
  { id: 'causa', name: 'Perché' }
];

/**
 * Tipi di voce del diario. Ognuno ha il suo colore nel calendario; gli allenamenti prendono
 * il colore del proprio modello. Le vecchie «Sessione A/B» vengono lette come allenamenti
 * (vedi engine/events.js): non compaiono più qui ma restano valide.
 */
export const KINDS = [
  { id: 'training', name: 'Allenamento', short: 'Allenamento', color: 'blue', minutes: 90 },
  { id: 'test', name: 'Test', short: 'Test', color: 'orange', minutes: 20 },
  { id: 'lezione', name: 'Lezione con l’allenatore', short: 'Lezione', color: 'violet', minutes: 60 },
  { id: 'servizi', name: 'Servizi da solo', short: 'Servizi', color: 'brown', minutes: 30 },
  { id: 'partite', name: 'Partite di allenamento', short: 'Partite', color: 'teal', minutes: 90 },
  { id: 'torneo', name: 'Torneo o campionato', short: 'Torneo', color: 'pink', minutes: 180 },
  { id: 'altro', name: 'Altro allenamento', short: 'Altro', color: 'slate', minutes: 60 }
];

/** Le attività «libere»: niente modello e niente test, solo durata e diario. */
export const FREE_KINDS = KINDS.filter((k) => k.id !== 'training' && k.id !== 'test');

export const KIND = Object.fromEntries(KINDS.map((k) => [k.id, k]));

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
export const STROKE = byId(STROKES);
export const ERROR = byId(ERRORS);
export const BALL = byId(BALLS);
export const POINT_PHASE = byId(POINT_PHASES);
export const ZONE_SIDE = byId(ZONE_SIDES);
export const ZONE_DEPTH = byId(ZONE_DEPTHS);

export function zoneLabel(zone) {
  if (!zone) return '';
  const parts = [ZONE_SIDE[zone.side]?.name, ZONE_DEPTH[zone.depth]?.name].filter(Boolean);
  return parts.join(' · ');
}
