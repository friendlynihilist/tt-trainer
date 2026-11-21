// La guida: illumina una zona alla volta, scurisce il resto e la spiega in due righe. Due giri:
// «build» nel costruttore, la prima volta che si compone un allenamento; «app» appena si arriva in
// Oggi, su medaglie e mappa. Un passo con `on` va avanti da solo quando fai la cosa richiesta
// (coachDid); gli altri con «Avanti». Chi ha visto un giro non lo rivede (meta.tour).
//
// Un passo: { holes, title, text, on?, need?, look?, up?, scroll?, medals?, pre? }
//   · holes: le zone illuminate. Un selettore (il primo elemento), { all: selettore } (l'insieme di
//     tutti), oppure una funzione che restituisce uno dei due.
//   · look: la zona si guarda ma non si tocca.
//   · need: finché non è vera, «Avanti» non c'è (si va avanti solo facendo la cosa).
//   · up: quanti px in più illuminare sopra la zona; scroll: porta la zona al centro dello schermo.

import { app } from '../store/app.svelte.js';
import { ui } from '../store/ui.svelte.js';

/** Il mattone della guida: quello appena aggiunto, altrimenti il primo. */
const myBrick = () => {
  const mine = ui.coach?.bid ? `#tower .brk[data-id="${ui.coach.bid}"]` : null;
  return mine && document.querySelector(mine) ? mine : '#tower .brk';
};

export const TOURS = {
  build: [
    {
      holes: ['#tray'],
      on: 'add',
      title: 'Aggiungi un mattone',
      get text() {
        return ui.coachCtx.count ? 'Ogni mattone è una cosa da allenare. Se vuoi aggiungerne uno, toccalo.' : 'Ogni mattone è una cosa da allenare. Toccane uno per aggiungerlo al tuo allenamento.';
      },
      need: () => ui.coachCtx.count > 0
    },
    { holes: [myBrick], on: 'stretch', title: 'Decidi quanto dura', text: 'Trascina in giù il bordo del mattone. Più il mattone è alto, più dura.' },
    { holes: [myBrick], on: 'edit', title: 'Scegli gli esercizi', text: 'Tocca il mattone per scegliere quali esercizi fare.' },
    { holes: [{ all: '#tower .brk' }], on: 'order', title: 'Cambia l’ordine', text: 'Per spostare un mattone, trascinalo su o giù.' }
  ],
  app: [
    { holes: ['#nearcard'], look: true, medals: true, title: 'Le medaglie', text: 'Ogni esercizio ha tre medaglie. Le vinci quando ti misuri e superi una soglia. Qui trovi la prossima che puoi vincere.' },
    {
      holes: ['#map'],
      look: true,
      title: 'La mappa',
      text: 'Ogni colpo ha la sua mappa. Ogni casella è un esercizio e mostra la medaglia che hai vinto. Più scendi, più il livello sale.',
      pre: () => ui.go('progressi', 'mappa', app.meta?.focus?.[0] ?? 'dritto')
    },
    { holes: ['#map .nd.now'], up: 22, scroll: true, on: 'node', title: 'L’esercizio di adesso', text: 'La pallina indica l’esercizio su cui lavorare. Toccalo per vedere quanto serve per ogni medaglia.' }
  ]
};

/** Fa partire un giro, se non l'hai già visto. */
export function startTour(tour) {
  if (ui.coach || app.meta?.tour?.[tour]) return false;
  ui.coach = { tour, i: 0, bid: null };
  TOURS[tour][0].pre?.();
  return true;
}

function finish() {
  const { tour } = ui.coach;
  ui.coach = null;
  if (app.user) app.patchMeta({ tour: { [tour]: true } });
}

export function coachNext() {
  const c = ui.coach;
  if (!c) return;
  if (c.i >= TOURS[c.tour].length - 1) return finish();
  ui.coach = { ...c, i: c.i + 1 };
  TOURS[c.tour][c.i + 1].pre?.();
}

export function coachSkip() {
  if (ui.coach) finish();
}

/** Da chiamare quando l'utente fa una cosa che un passo può aver chiesto. `extra` si aggiunge allo stato. */
export function coachDid(what, extra = null) {
  const c = ui.coach;
  if (!c) return false;
  if (extra) ui.coach = { ...c, ...extra };
  if (TOURS[c.tour][c.i].on !== what) return false;
  coachNext();
  return true;
}
