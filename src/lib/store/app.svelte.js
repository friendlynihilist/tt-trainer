// Stato dell'app. Un'unica istanza reattiva: i componenti leggono da qui e chiamano i metodi
// per scrivere. Livelli, settimana e sessione sono sempre derivati dagli eventi, mai salvati.

import { firebaseConfig } from '../../firebase.config.js';
import { createLocalBackend } from './local.js';
import { computeTracks, DEFAULT_RULES } from '../engine/levels.js';
import { weekAt, weekIndex, planPhase, gateStatus } from '../engine/plan.js';
import { publicSummary } from '../engine/stats.js';
import { STROKES, ERRORS } from '../data/taxonomy.js';
import { today } from '../util/dates.js';

const EMULATOR = import.meta.env.VITE_EMULATOR === '1';
const CLOUD = EMULATOR || Boolean(firebaseConfig.apiKey);
const DEMO_CONFIG = { apiKey: 'demo', authDomain: 'demo-tt-trainer.firebaseapp.com', projectId: 'demo-tt-trainer', appId: 'demo' };

const DEFAULT_SETTINGS = {
  ...DEFAULT_RULES,
  sound: true,
  haptics: true,
  share: true,
  partner: null,
  theme: 'auto'
};

export function newId(prefix = 'e') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Firestore rifiuta i valori undefined: li togliamo. */
function clean(value) {
  return JSON.parse(JSON.stringify(value));
}

class AppState {
  cloud = CLOUD;
  emulator = EMULATOR;

  /** boot → signin | noaccess | loading → ready */
  stage = $state('boot');
  user = $state.raw(null);
  role = $state(null);
  requested = $state(false);
  meta = $state.raw(null);
  events = $state.raw([]);
  profiles = $state.raw([]);
  access = $state.raw(null);
  requests = $state.raw([]);
  error = $state(null);
  today = $state(today());
  online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);

  settings = $derived({ ...DEFAULT_SETTINGS, ...(this.meta?.settings ?? {}) });
  rules = $derived({ up: this.settings.up, down: this.settings.down });
  tracks = $derived(computeTracks(this.events, this.rules));
  plan = $derived(this.meta?.plan ?? null);
  weekIdx = $derived(this.plan ? weekIndex(this.plan, this.today) : null);
  week = $derived(this.plan ? weekAt(this.plan, this.weekIdx) : null);
  phase = $derived(this.plan ? planPhase(this.plan, this.today) : 'none');
  gate = $derived(gateStatus(this.tracks));
  onboarded = $derived(Boolean(this.meta?.onboarded));

  name = $derived(this.meta?.profile?.name || this.user?.name || '');
  firstName = $derived(this.name.trim().split(/\s+/)[0] ?? '');
  photo = $derived(this.user?.photo ?? '');
  isAdmin = $derived(this.role === 'admin');

  strokes = $derived([...STROKES, ...(this.meta?.custom?.strokes ?? [])]);
  errors = $derived([...ERRORS, ...(this.meta?.custom?.errors ?? [])]);
  #strokeIndex = $derived(Object.fromEntries(this.strokes.map((x) => [x.id, x])));
  #errorIndex = $derived(Object.fromEntries(this.errors.map((x) => [x.id, x])));

  mates = $derived(this.profiles.filter((p) => p.id !== this.user?.uid));
  partner = $derived(this.mates.find((p) => p.id === this.settings.partner) ?? null);

  #backend = null;
  #unwatch = null;
  #got = { meta: false, events: false };
  #profileTimer = null;

  stroke(id) {
    return this.#strokeIndex[id] ?? null;
  }
  strokeName(id, short = false) {
    const s = this.#strokeIndex[id];
    return s ? (short ? s.short ?? s.name : s.name) : '';
  }
  errorName(id) {
    return this.#errorIndex[id]?.name ?? '';
  }

  async start() {
    if (this.#backend) return;
    try {
      if (CLOUD) {
        const { createCloudBackend } = await import('./cloud.js');
        this.#backend = createCloudBackend(EMULATOR ? DEMO_CONFIG : firebaseConfig, { emulator: EMULATOR });
      } else {
        this.#backend = createLocalBackend();
      }
    } catch (err) {
      this.#fail(err);
      this.stage = 'signin';
      return;
    }
    this.#backend.onAuth((user) => this.#onAuth(user));

    window.addEventListener('online', () => (this.online = true));
    window.addEventListener('offline', () => (this.online = false));
    // L'app resta aperta per giorni: al ritorno in primo piano la data va riletta.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.today = today();
    });
  }

  async #onAuth(user, fresh = false) {
    this.#unwatch?.();
    this.#unwatch = null;
    this.#got = { meta: false, events: false };
    this.user = user;
    this.meta = null;
    this.events = [];
    this.profiles = [];
    this.requests = [];
    this.access = null;

    if (!user) {
      this.role = null;
      this.stage = 'signin';
      return;
    }

    this.stage = 'loading';
    try {
      const { role, requested } = await this.#backend.enter(user, { fresh });
      this.role = role;
      this.requested = Boolean(requested);
      if (role === 'none') {
        this.stage = 'noaccess';
        return;
      }
    } catch (err) {
      this.#fail(err);
      this.stage = 'signin';
      return;
    }

    const arrived = (key) => {
      this.#got[key] = true;
      if (this.#got.meta && this.#got.events && this.stage === 'loading') this.stage = 'ready';
      this.#queueProfile();
    };

    this.#unwatch = this.#backend.watch(
      user.uid,
      {
        meta: (meta) => {
          this.meta = meta;
          arrived('meta');
        },
        events: (events) => {
          this.events = events;
          arrived('events');
        },
        profiles: (profiles) => (this.profiles = profiles),
        access: (access) => {
          this.access = access;
          if (access && this.user) this.role = access.admins?.includes(this.user.email) ? 'admin' : 'member';
        },
        requests: (requests) => (this.requests = requests),
        error: (err) => {
          // Accesso revocato (o ruolo in cache non più valido): si rifà il controllo sul server.
          if (err?.code === 'permission-denied') this.#onAuth(this.user, true);
          else this.#fail(err);
        }
      },
      { admin: this.role === 'admin' }
    );
  }

  #fail(err) {
    console.error(err);
    this.error = humanError(err);
  }

  #run(promise) {
    Promise.resolve(promise).catch((err) => this.#fail(err));
  }

  clearError() {
    this.error = null;
  }

  // ── Accesso ──────────────────────────────────────────────────────────────

  async signIn() {
    this.error = null;
    try {
      await this.#backend.signIn();
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') return;
      this.#fail(err);
    }
  }

  async devSignIn(email, name) {
    try {
      await this.#backend.devSignIn(email, name);
    } catch (err) {
      this.#fail(err);
    }
  }

  signOut() {
    this.#run(this.#backend.signOut());
  }

  async requestAccess() {
    try {
      await this.#backend.requestAccess(this.user);
      this.requested = true;
    } catch (err) {
      this.#fail(err);
    }
  }

  retryAccess() {
    return this.#onAuth(this.user, true);
  }

  // ── Scritture ────────────────────────────────────────────────────────────

  patchMeta(patch) {
    this.#run(this.#backend.saveMeta(this.user.uid, clean(patch)));
  }

  patchSettings(patch) {
    this.patchMeta({ settings: patch });
  }

  setPlan(plan) {
    this.patchMeta({ plan });
  }

  /** Chiude il ciclo in corso e ne apre uno nuovo: i livelli raggiunti restano. */
  startNewCycle(plan) {
    const past = this.meta?.pastPlans ?? [];
    this.patchMeta({ plan, pastPlans: this.plan ? [...past, this.plan] : past });
  }

  saveEvent(ev) {
    const now = Date.now();
    const full = clean({ ...ev, id: ev.id ?? newId(), createdAt: ev.createdAt ?? now, updatedAt: now });
    this.#run(this.#backend.saveEvent(this.user.uid, full));
    return full;
  }

  deleteEvent(id) {
    this.#run(this.#backend.deleteEvent(this.user.uid, id));
  }

  /** Imposta a mano il livello di un percorso (resta nella storia come «Impostato»). */
  setLevel(trackId, level) {
    return this.saveEvent({ kind: 'livello', date: this.today, tests: [{ track: trackId, type: 'set', level }] });
  }

  addCustom(list, item) {
    const current = this.meta?.custom?.[list] ?? [];
    const full = { ...item, id: newId('c'), custom: true };
    this.patchMeta({ custom: { [list]: [...current, full] } });
    return full;
  }

  removeCustom(list, id) {
    const current = this.meta?.custom?.[list] ?? [];
    this.patchMeta({ custom: { [list]: current.filter((x) => x.id !== id) } });
  }

  async wipe() {
    try {
      await this.#backend.wipe(this.user.uid);
    } catch (err) {
      this.#fail(err);
    }
  }

  // ── Gruppo ───────────────────────────────────────────────────────────────

  setMembers(emails) {
    this.#run(this.#backend.setMembers(emails));
  }
  approve(request) {
    this.#run(this.#backend.approve(request));
  }
  reject(request) {
    this.#run(this.#backend.reject(request));
  }

  /** Tiene aggiornato il profilo visibile al gruppo. Solo livelli e ritmo, mai il diario. */
  #queueProfile() {
    if (!CLOUD || this.stage !== 'ready') return;
    clearTimeout(this.#profileTimer);
    this.#profileTimer = setTimeout(() => this.#pushProfile(), 1500);
  }

  #pushProfile() {
    const uid = this.user?.uid;
    if (!uid || this.stage !== 'ready') return;
    const mine = this.profiles.find((p) => p.id === uid);
    if (!this.settings.share || !this.onboarded) {
      if (mine) this.#run(this.#backend.saveProfile(uid, null));
      return;
    }
    const next = {
      name: this.name,
      photo: this.photo,
      ...publicSummary(this.tracks, this.events, this.plan, this.week)
    };
    const { id: _id, updatedAt: _at, ...prev } = mine ?? {};
    if (JSON.stringify(sortKeys(prev)) === JSON.stringify(sortKeys(next))) return;
    this.#run(this.#backend.saveProfile(uid, clean({ ...next, updatedAt: Date.now() })));
  }

  refreshProfile() {
    this.#queueProfile();
  }
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
  }
  return value;
}

function humanError(err) {
  const code = err?.code ?? '';
  if (code === 'auth/popup-blocked') return 'Il browser ha bloccato la finestra di accesso. Consenti i popup e riprova.';
  if (code === 'auth/unauthorized-domain') return 'Questo dominio non è autorizzato in Firebase Authentication.';
  if (code === 'auth/network-request-failed' || code === 'unavailable') return 'Sei offline. Riprova quando torna la rete.';
  if (code === 'permission-denied') return 'Non hai i permessi per questa operazione.';
  if (code === 'auth/operation-not-allowed') return 'L’accesso con Google non è attivo nel progetto Firebase.';
  return 'Qualcosa è andato storto. Riprova.';
}

export const app = new AppState();
