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

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        // Tornare alla pagina di prima accorcia la fila, andare altrove la allunga.
        if (this.#trail.at(-2) === location.hash) this.#trail.pop();
        else this.#trail.push(location.hash);
        this.route = parseHash();
        this.sheets = []; // cambiando pagina i fogli aperti si chiudono
        window.scrollTo({ top: 0 });
      });
    }
  }

  go(name, ...params) {
    location.hash = `/${[name, ...params].join('/')}`;
  }

  /** Dalle pagine fuori dalla barra (Guida, Impostazioni): torna da dove sei venuto, o a Oggi. */
  back() {
    if (this.#trail.length > 1) history.back();
    else this.go('oggi');
  }

  open(type, props = {}) {
    this.sheets = [...this.sheets, { id: `${type}-${Date.now()}`, type, props }];
  }

  close() {
    this.sheets = this.sheets.slice(0, -1);
  }

  closeAll() {
    this.sheets = [];
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
