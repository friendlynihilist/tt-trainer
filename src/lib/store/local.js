// Backend locale: tutto in localStorage, un solo utente, nessun account.
// Serve per provare l'app prima di collegare Firebase e come riferimento dell'interfaccia
// che anche il backend cloud rispetta.

const KEY = 'tt-trainer:v1';
const USER = { uid: 'local', name: '', email: '', photo: '' };

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

function merge(target, patch) {
  const out = { ...(target ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(out[k], v) : v;
  }
  return out;
}

export function createLocalBackend() {
  let data = read();
  let handlers = null;
  let authCb = null;

  const write = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) {
      handlers?.error?.(err);
    }
  };
  const emit = () => {
    if (!handlers) return;
    handlers.meta(data.meta ?? null);
    handlers.events(Object.values(data.events ?? {}));
    handlers.notes?.(Object.values(data.notes ?? {}));
  };

  // Più schede aperte restano allineate.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY) return;
      data = read();
      emit();
      if (!data.session) authCb?.(null);
    });
  }

  return {
    mode: 'local',

    onAuth(cb) {
      authCb = cb;
      cb(data.session ? USER : null);
    },
    async signIn() {
      data.session = true;
      write();
      authCb?.(USER);
    },
    async signOut() {
      data.session = false;
      write();
      authCb?.(null);
    },
    async enter() {
      return { role: 'admin' };
    },
    async requestAccess() {},

    watch(_uid, h) {
      handlers = h;
      emit();
      h.profiles?.([]);
      return () => {
        handlers = null;
      };
    },

    async saveMeta(_uid, patch) {
      // Il piano si sostituisce intero: un piano nuovo non eredita i campi di quello vecchio.
      const { plan, ...rest } = patch;
      data.meta = merge(data.meta, rest);
      if ('plan' in patch) data.meta = { ...data.meta, plan };
      write();
      emit();
    },
    async saveEvent(_uid, ev) {
      data.events = { ...(data.events ?? {}), [ev.id]: ev };
      write();
      emit();
    },
    async deleteEvent(_uid, id) {
      const { [id]: _gone, ...rest } = data.events ?? {};
      data.events = rest;
      write();
      emit();
    },
    async saveNote(_uid, note) {
      data.notes = { ...(data.notes ?? {}), [note.id]: note };
      write();
      emit();
    },
    async deleteNote(_uid, id) {
      const { [id]: _gone, ...rest } = data.notes ?? {};
      data.notes = rest;
      write();
      emit();
    },
    async saveProfile() {},
    async setMembers() {},
    async approve() {},
    async reject() {},

    /** Sostituisce tutti i dati con quelli di una copia completa. */
    async restore(_uid, { meta, events, notes }) {
      const byId = (list) => Object.fromEntries((list ?? []).map((x) => [x.id, x]));
      data = { session: data.session, meta: meta ?? null, events: byId(events), notes: byId(notes) };
      write();
      emit();
    },

    async wipe() {
      data = { session: data.session };
      write();
      emit();
    }
  };
}
