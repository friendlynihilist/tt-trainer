// La pagina sotto non scorre finché è aperto almeno un foglio (o la sessione dal vivo).
// Ogni foglio chiede il blocco quando compare e lo rilascia quando sparisce: così vale anche per
// i fogli aperti da una pagina, non solo per quelli della pila in ui.svelte.js.

let locks = 0;

/** Blocca lo scorrimento della pagina; la funzione restituita lo rilascia (una volta sola). */
export function lockScroll() {
  locks++;
  document.body.classList.add('no-scroll');
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (!locks) document.body.classList.remove('no-scroll');
  };
}
