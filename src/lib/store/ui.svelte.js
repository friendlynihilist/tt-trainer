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

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        this.route = parseHash();
        this.sheets = []; // cambiando pagina i fogli aperti si chiudono
        window.scrollTo({ top: 0 });
      });
    }
  }

  go(name, ...params) {
    location.hash = `/${[name, ...params].join('/')}`;
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
