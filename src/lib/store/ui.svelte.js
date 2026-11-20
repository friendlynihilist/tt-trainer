// Stato dell'interfaccia: pagina corrente, fogli aperti, sessione dal vivo, avvisi.

const ROUTES = ['oggi', 'calendario', 'progressi', 'libreria', 'guida', 'impostazioni'];

function parseHash() {
  const [name, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: ROUTES.includes(name) ? name : 'oggi', params: rest };
}

class UI {
  route = $state.raw(parseHash());
  /** Pila di fogli: [{ id, type, props }] */
  sheets = $state.raw([]);
  /** Sessione dal vivo aperta: { slot, weekIdx } oppure null */
  live = $state.raw(null);
  toasts = $state.raw([]);
  /** La finestra delle novità aperta a mano: { history: true } oppure null. */
  news = $state.raw(null);

  /** Le pagine visitate dentro l'app, per sapere se «indietro» resta nell'app. */
  #trail = [typeof location === 'undefined' ? '' : location.hash];

  // Ogni cosa aperta sopra la pagina (un foglio, la sessione dal vivo) aggiunge una voce alla
  // cronologia del browser: così il tasto «indietro» del telefono la chiude, invece di cambiare
  // pagina o uscire dall'app. `#over` sono le cose aperte, dalla prima all'ultima; `#skip` conta i
  // ritorni chiesti da noi (una chiusura con un pulsante), che non vanno gestiti due volte.
  // Un ritorno nella cronologia arriva un attimo dopo che l'abbiamo chiesto. Se nel frattempo si apre
  // un'altra cosa (un foglio che si chiude e ne apre un altro), la sua voce si aggiunge solo quando
  // il ritorno è arrivato (`#late`), altrimenti il browser finirebbe una pagina troppo indietro.
  #over = [];
  #skip = 0;
  #late = 0;
  #then = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        // Tornare alla pagina di prima accorcia la fila, andare altrove la allunga.
        if (this.#trail.at(-2) === location.hash) this.#trail.pop();
        else this.#trail.push(location.hash);
        this.route = parseHash();
        this.sheets = []; // cambiando pagina i fogli aperti si chiudono
        this.#over = this.#over.filter((o) => o.kind !== 'sheet');
        window.scrollTo({ top: 0 });
      });
      window.addEventListener('popstate', () => {
        if (this.#skip > 0) {
          // Un ritorno chiesto da noi: è già tutto chiuso. Poi, se c'era, si va alla pagina chiesta.
          if (--this.#skip === 0) {
            for (; this.#late > 0; this.#late--) this.#state();
            if (this.#then) {
              const next = this.#then;
              this.#then = null;
              location.hash = next;
            }
          }
          return;
        }
        // Il tasto «indietro»: chiude l'ultima cosa aperta.
        const top = this.#over.pop();
        if (!top) return;
        if (top.kind === 'sheet') this.sheets = this.sheets.slice(0, -1);
        else top.close();
      });
    }
  }

  #state() {
    try {
      history.pushState({ over: true }, '');
    } catch {}
  }

  #push(entry) {
    this.#over.push(entry);
    if (this.#skip > 0) this.#late++;
    else this.#state();
  }

  /** Toglie `n` voci dalla cronologia (le cose sono già chiuse). */
  #pop(n) {
    // Le voci non ancora aggiunte si tolgono dal conto, senza toccare la cronologia.
    const waiting = Math.min(n, this.#late);
    this.#late -= waiting;
    n -= waiting;
    if (n <= 0) return;
    this.#skip++;
    try {
      history.go(-n);
    } catch {
      this.#skip--;
    }
  }

  /**
   * Per ciò che si apre sopra la pagina senza passare da `open` (la sessione dal vivo, un foglio
   * di una pagina): `close` viene chiamata dal tasto «indietro». La funzione restituita va chiamata
   * quando la cosa si chiude in un altro modo.
   */
  hold(close) {
    const entry = { kind: 'fn', close };
    this.#push(entry);
    return () => {
      const i = this.#over.indexOf(entry);
      if (i < 0) return; // già chiusa dal tasto «indietro»
      this.#over.splice(i, 1);
      this.#pop(1);
    };
  }

  go(name, ...params) {
    const hash = `/${[name, ...params].join('/')}`;
    // Con qualcosa di aperto (o un ritorno in corso) prima si chiude tutto, poi si cambia pagina.
    const n = this.#over.length;
    if (n || this.#skip) {
      this.#then = hash;
      this.sheets = [];
      const fns = this.#over.filter((o) => o.kind === 'fn');
      this.#over = [];
      this.#pop(n);
      for (const o of fns) o.close();
      return;
    }
    location.hash = hash;
  }

  /** Dalle pagine fuori dalla barra (Guida, Impostazioni): torna da dove sei venuto, o a Oggi. */
  back() {
    if (this.#trail.length > 1) history.back();
    else this.go('oggi');
  }

  open(type, props = {}) {
    this.sheets = [...this.sheets, { id: `${type}-${Date.now()}-${this.sheets.length}`, type, props }];
    this.#push({ kind: 'sheet' });
  }

  close() {
    if (!this.sheets.length) return;
    this.sheets = this.sheets.slice(0, -1);
    const i = this.#over.findLastIndex((o) => o.kind === 'sheet');
    if (i >= 0) {
      this.#over.splice(i, 1);
      this.#pop(1);
    }
  }

  closeAll() {
    const n = this.#over.filter((o) => o.kind === 'sheet').length;
    this.sheets = [];
    this.#over = this.#over.filter((o) => o.kind !== 'sheet');
    this.#pop(n);
  }

  toast(text, { tone = 'info', action = null, ms = 3200 } = {}) {
    const id = Date.now() + Math.random();
    this.toasts = [...this.toasts, { id, text, tone, action }];
    setTimeout(() => this.dismiss(id), action ? 6000 : ms);
  }

  dismiss(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

export const ui = new UI();

/** Vibrazione breve dove esiste (Android). Su iOS non fa nulla. */
export function buzz(pattern = 8) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}
