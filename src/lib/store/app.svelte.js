// Stato dell'app. Un'unica istanza reattiva: i componenti leggono da qui e chiamano i metodi
// per scrivere. Tentativi, medaglie, settimana e sessione sono sempre derivati dalle voci, mai
// salvati. Del giocatore si salva solo il livello che sceglie (meta.player).

import { firebaseConfig } from '../../firebase.config.js';
import { createLocalBackend } from './local.js';
import { weekAt, weekIndex, planPhase, normalizePlan } from '../engine/plan.js';
import { normalizeEvent } from '../engine/events.js';
import { allAttempts } from '../engine/attempts.js';
import { allMedals } from '../engine/medals.js';
import { normalizePlayer, suggestLevel } from '../engine/player.js';
import { buildCatalog } from '../data/catalog.js';
import { STROKES, ERRORS } from '../data/taxonomy.js';
import { today } from '../util/dates.js';

const EMULATOR = import.meta.env.VITE_EMULATOR === '1';
// VITE_LOCAL=1 forza la modalità locale anche con Firebase configurato (per provare in sviluppo).
const CLOUD = import.meta.env.VITE_LOCAL !== '1' && (EMULATOR || Boolean(firebaseConfig.apiKey));
const DEMO_CONFIG = { apiKey: 'demo', authDomain: 'demo-tt-trainer.firebaseapp.com', projectId: 'demo-tt-trainer', appId: 'demo' };

const DEFAULT_SETTINGS = {
  sound: true,
  // Negli esercizi, «Cambio» ogni 5 minuti: i due giocatori si alternano.
  turns: true,
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
  /** Le voci come arrivano dal backend, mai riscritte qui. */
  rawEvents = $state.raw([]);
  profiles = $state.raw([]);
  access = $state.raw(null);
  requests = $state.raw([]);
  error = $state(null);
  today = $state(today());
  online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);

  /** Tutte le voci, lette nel formato attuale (le vecchie A/B diventano allenamenti). */
  allEvents = $derived(this.rawEvents.map(normalizeEvent));
  /** Ciò che è stato fatto: è la base di livelli, statistiche e diario. */
  events = $derived(this.allEvents.filter((e) => !e.planned));
  /** Ciò che è stato aggiunto a mano come previsto e non è ancora fatto. */
  planned = $derived(this.allEvents.filter((e) => e.planned));

  settings = $derived({ ...DEFAULT_SETTINGS, ...(this.meta?.settings ?? {}) });
  catalog = $derived(buildCatalog(this.meta?.custom));
  /** Ogni misura, nuova o convertita dalle versioni di prima. */
  attempts = $derived(allAttempts(this.events, this.catalog));
  /** Medaglie per esercizio: { [id]: { B, A, O, P, half, best, … } }. Solo indicatori, non bloccano niente. */
  medals = $derived(allMedals(this.catalog, this.attempts, this.today));
  player = $derived(normalizePlayer(this.meta?.player));
  /** Il livello che l'app propone, oppure null. */
  levelOffer = $derived(suggestLevel({ player: this.meta?.player, medals: this.medals, attempts: this.attempts, catalog: this.catalog, today: this.today }));
  plan = $derived(normalizePlan(this.meta?.plan));
  weekIdx = $derived(this.plan ? weekIndex(this.plan, this.today) : null);
  week = $derived(this.plan ? weekAt(this.plan, this.weekIdx, this.catalog) : null);
  phase = $derived(this.plan ? planPhase(this.plan, this.today) : 'none');
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
    this.rawEvents = [];
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
          this.rawEvents = events;
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

  eventById(id) {
    return this.allEvents.find((e) => e.id === id) ?? null;
  }

  /** Aggiunge al calendario un appuntamento fuori dal ritmo (o ne sposta uno). */
  planEvent({ kind, template = null, date }) {
    return this.saveEvent({ kind, template: kind === 'training' ? template : null, date, planned: true, adhoc: true });
  }

  /** Toglie un appuntamento del ritmo, solo quello. */
  skipOccurrence(key) {
    if (!this.plan) return;
    this.setPlan({ ...this.plan, skip: [...new Set([...this.plan.skip, key])] });
  }

  restoreOccurrence(key) {
    if (!this.plan) return;
    this.setPlan({ ...this.plan, skip: this.plan.skip.filter((k) => k !== key) });
  }

  /** Sposta un appuntamento: del ritmo (lo toglie e ne crea uno a mano) o già aggiunto a mano. */
  moveItem(item, date) {
    if (item.source === 'event') {
      const ev = this.eventById(item.eventId);
      if (ev) this.saveEvent({ ...ev, date });
    } else {
      this.skipOccurrence(item.key);
      this.planEvent({ kind: item.kind, template: item.template, date });
    }
  }

  removeItem(item) {
    if (item.source === 'event') this.deleteEvent(item.eventId);
    else this.skipOccurrence(item.key);
  }

  // ── Livello del giocatore ────────────────────────────────────────────────

  /**
   * Cambia il livello. `how`: 'scelto' (dal giocatore), 'proposto' (accettato dall'app),
   * 'predefinito' (nessuna scelta: principiante). Ogni cambio resta nella storia.
   */
  setPlayerLevel(level, how = 'scelto') {
    const p = this.player;
    const history = [...p.history, { date: this.today, level, how }];
    this.patchMeta({ player: { level, since: this.today, history, declined: null } });
  }

  /** «Non ora»: la proposta torna dopo 21 giorni o dopo 3 nuovi ori. */
  declineLevel(level) {
    this.patchMeta({ player: { declined: { level, date: this.today } } });
  }

  addCustom(list, item) {
    const current = this.meta?.custom?.[list] ?? [];
    const full = { ...item, id: newId('c'), custom: true };
    this.patchMeta({ custom: { [list]: [...current, full] } });
    return full;
  }

  /** Crea o aggiorna una voce personale (colpi, errori, percorsi, mesi, modelli). */
  saveCustom(list, item) {
    const current = this.meta?.custom?.[list] ?? [];
    const full = { ...item, id: item.id ?? newId('c'), custom: true };
    const next = current.some((x) => x.id === full.id) ? current.map((x) => (x.id === full.id ? full : x)) : [...current, full];
    this.patchMeta({ custom: { [list]: next } });
    return full;
  }

  /** Più voci personali in un colpo (l'importazione). */
  saveCustomMany(lists) {
    const patch = {};
    for (const [list, items] of Object.entries(lists)) {
      if (!items?.length) continue;
      const current = this.meta?.custom?.[list] ?? [];
      const ids = new Set(items.map((x) => x.id));
      patch[list] = [...current.filter((x) => !ids.has(x.id)), ...items.map((x) => ({ ...x, custom: true }))];
    }
    if (Object.keys(patch).length) this.patchMeta({ custom: patch });
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

  /** Tiene aggiornato il profilo visibile al gruppo: solo il nome. Medaglie e livello sono personali. */
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
    const next = { name: this.name };
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
