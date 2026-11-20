<script>
  // La sessione dal vivo. Il telefono sta sul tavolo: timer grande e, su ogni esercizio, il
  // prossimo obiettivo da provare quando vuoi. Tutto viene salvato sul dispositivo a ogni tocco e
  // diventa una voce del diario solo alla fine. Niente è bloccato: ogni esercizio si cambia e ogni
  // obiettivo si prova, con qualsiasi medaglia.
  import { onMount } from 'svelte';
  import { fly, fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import X from '@lucide/svelte/icons/x';
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Check from '@lucide/svelte/icons/check';
  import Shuffle from '@lucide/svelte/icons/shuffle';
  import Info from '@lucide/svelte/icons/info';
  import Coffee from '@lucide/svelte/icons/coffee';
  import Timer from '@lucide/svelte/icons/timer';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Plus from '@lucide/svelte/icons/plus';
  import Repeat from '@lucide/svelte/icons/repeat';
  import User from '@lucide/svelte/icons/user';
  import Users from '@lucide/svelte/icons/users';
  import Save from '@lucide/svelte/icons/save';
  import NotebookPen from '@lucide/svelte/icons/notebook-pen';
  import { app, newId } from '../store/app.svelte.js';
  import { ui, buzz } from '../store/ui.svelte.js';
  import { loadLive, saveLive, clearLive } from '../store/live.js';
  import { weekFor } from '../engine/plan.js';
  import { composeSession, composeTest, exerciseStep, sessionExercises, trainedTracks, matchHalves, TEST_MINUTES, replaceStepExercise, schemeOf, templateWithOverrides } from '../engine/compose.js';
  import { upgradeDraft, makeAttempt, allAttempts } from '../engine/attempts.js';
  import { allMedals, newMedals, valueText, size, nextGoal } from '../engine/medals.js';
  import { SCHEMES, DEFAULT_SCHEME } from '../data/program.js';
  import { TIER } from '../data/library.js';
  import { FAMILY } from '../data/taxonomy.js';
  import { fmtClock } from '../util/dates.js';
  import { chime, keepAwake, unlockAudio } from '../util/device.js';
  import { pickExercise } from '../ui/pickers.js';
  import StepBody from '../ui/StepBody.svelte';
  import GoalPad, { startGoal, goalTries } from '../ui/GoalPad.svelte';
  import MedalRing from '../ui/MedalRing.svelte';
  import MedalBadge from '../ui/MedalBadge.svelte';
  import Brick from '../ui/Brick.svelte';
  import { stepFamily } from '../ui/design.js';
  import { celebrateFinish } from '../util/celebrate.js';
  import FocusEditor from '../ui/FocusEditor.svelte';
  import PartnerField, { lastPartner } from '../ui/PartnerField.svelte';

  const uid = app.user.uid;

  function create() {
    const live = ui.live;
    const date = live.date ?? app.today;
    const week = weekFor(app.plan, date, app.catalog);
    const test = live.mode === 'test';
    const template = test ? null : app.catalog.template(live.template);
    const session = test
      ? composeTest({ exerciseIds: live.exercises ?? [], catalog: app.catalog })
      : composeSession({ week, template, catalog: app.catalog, medals: app.medals, overrides: live.overrides });
    const attempts = {};
    // Nel test l'obiettivo di ogni esercizio è già aperto.
    if (test) for (const s of session.steps) attempts[s.id] = startGoal(app.catalog.exercise(s.ex), app.medals[s.ex]);
    return {
      version: 3,
      mode: test ? 'test' : 'training',
      template: test ? null : template.id,
      title: test ? 'Test' : template.name,
      color: test ? 'orange' : template.color,
      date,
      planId: app.plan?.id ?? null,
      block: week?.focusBlock?.id ?? null,
      occ: live.occ ?? null,
      eventId: live.eventId ?? null,
      step: 0,
      timers: {},
      attempts,
      // Gli esercizi cambiati (prima o durante): servono a salvare l'allenamento come tuo.
      changes: { ...(live.overrides ?? {}) },
      focus: null,
      // Con chi ti alleni: si propone l'ultimo compagno, e si cambia alla chiusura.
      partner: lastPartner(),
      note: '',
      feel: null,
      beat: Date.now(),
      // La sessione si congela all'inizio: resta la stessa anche se la si riprende più tardi.
      session: JSON.parse(JSON.stringify(session))
    };
  }

  function restore() {
    let saved = loadLive(uid);
    if (!saved) return null;
    // Sessione lasciata a metà con la prima versione (A o B): si riprende uguale.
    if (saved.slot && !saved.mode) {
      Object.assign(saved, { mode: 'training', template: 'completo', title: `Sessione ${saved.slot}`, color: 'blue', legacy: saved.slot });
    }
    for (const s of saved.session?.steps ?? []) {
      // La vecchia regola della partitella diventa lo schema del mese.
      if (s.kind === 'match' && !s.scheme) {
        const block = saved.session.block;
        s.schemes = (block?.schemes ?? app.catalog.block(block?.id)?.schemes ?? []).filter((x) => SCHEMES[x]);
        if (!s.schemes.length) s.schemes = [DEFAULT_SCHEME];
        s.scheme = SCHEMES[s.schemes[0]];
        delete s.rule;
      }
    }
    // Sessione cominciata con la 0.2: i passi diventano esercizi, i test già contati restano.
    saved = upgradeDraft(saved, app.catalog);
    // I timer rimasti accesi si fermano all'ultimo momento in cui l'app era viva.
    for (const t of Object.values(saved.timers ?? {})) {
      if (t.since) {
        t.acc += Math.max(0, (saved.beat - t.since) / 1000);
        t.since = null;
      }
    }
    return saved;
  }

  const resumed = Boolean(ui.live.resume);
  let draft = $state(resumed ? restore() : create());
  let now = $state(Date.now());
  let dir = $state(1);
  let finished = false;
  let scroller = $state();

  const steps = $derived(draft?.session.steps ?? []);
  const closing = $derived(draft ? draft.step >= steps.length : false);
  const step = $derived(steps[Math.min(draft?.step ?? 0, steps.length - 1)]);
  const timer = $derived(step ? draft.timers[step.id] : null);
  const elapsed = $derived(timer ? timer.acc + (timer.since ? (now - timer.since) / 1000 : 0) : 0);
  const total = $derived(step ? step.minutes * 60 : 0);
  const remaining = $derived(total - elapsed);
  const running = $derived(Boolean(timer?.since));
  const stepEx = $derived(step?.ex ? app.catalog.exercise(step.ex) : null);
  const canGoal = $derived(Boolean(stepEx?.measure && Object.keys(stepEx.goals ?? {}).length));
  // Il colore e l'icona del blocco in corso: quelli della famiglia dell'esercizio.
  const fam = $derived(stepFamily(step, app.catalog) ?? 'libero');
  // La descrizione dell'esercizio si apre con (i): durante la sessione basta il nome.
  let info = $state(false);

  // ── Timer ────────────────────────────────────────────────────────────────

  function play(id) {
    draft.timers[id] ??= { acc: 0, since: null };
    draft.timers[id].since ??= Date.now();
  }
  function pause(id) {
    const t = draft.timers[id];
    if (t?.since) {
      t.acc += (Date.now() - t.since) / 1000;
      t.since = null;
    }
  }
  function toggle() {
    unlockAudio();
    buzz();
    if (running) pause(step.id);
    else play(step.id);
  }

  function bell(notes, pattern) {
    if (app.settings.sound) chime(notes);
    if (app.settings.haptics) buzz(pattern);
  }

  function checkBells() {
    if (closing || !step) return;
    const t = draft.timers[step.id];
    if (!t?.since) return;
    const sec = t.acc + (Date.now() - t.since) / 1000;
    if (!t.rang && step.kind !== 'pause' && sec >= step.minutes * 60) {
      t.rang = true;
      bell([880, 1318, 1760], [200, 100, 200]);
    }
    if (step.kind === 'match' && !t.half && sec >= matchHalves(step.minutes)[0] * 60) {
      t.half = true;
      bell([988], 200);
      ui.toast('Cambio: ora partitella a schema');
    }
    // Finita la pausa si passa da soli al blocco dopo.
    if (step.kind === 'pause' && sec >= step.minutes * 60) goTo(draft.step + 1);
    if (step.maint && !t.maint && sec >= (step.minutes - step.maint.minutes) * 60) {
      t.maint = true;
      bell([988], 200);
      ui.toast(`Ultimi ${step.maint.minutes} minuti: mantenimento`);
    }
    // A metà esercizio (e a metà dei servizi) tocca al compagno: un bip e il riquadro cambia colore.
    // Niente cambio negli ultimi 20 secondi: lì suona già la fine.
    if (turnable && !t.turn && sec >= total / 2 && sec < total - 20) {
      t.turn = true;
      bell([1175, 1175], [120, 80, 120]);
      flash = true;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => (flash = false), 3200);
    }
  }

  // ── Turni ─────────────────────────────────────────────────────────────────
  // Ogni esercizio a coppie si divide a metà: prima tocca a te, poi al compagno. Il riquadro del tempo
  // cambia colore quando tocca al compagno. Se comincia lui, si tocca l'etichetta e i turni si invertono.
  // Niente turni da soli, con il robot e nel palleggio, dove fate tutti e due la stessa cosa.

  let flash = $state(false);
  let flashTimer = null;

  const turnable = $derived.by(() => {
    if (step?.kind === 'serve') return true;
    if (step?.kind !== 'exercise' || !app.settings.turns || !stepEx) return false;
    const modes = stepEx.modes ?? [];
    return stepEx.family !== 'palleggio' && (modes.includes('compagno') || modes.includes('multiball'));
  });
  const partner = $derived(turnable && (elapsed >= total / 2) !== Boolean(draft?.swap?.[step?.id]));
  const turnLabel = $derived(step?.kind === 'serve' ? (partner ? 'Serve il compagno' : 'Servi tu') : partner ? 'Tocca al compagno' : 'Tocca a te');

  function swapTurns() {
    buzz();
    draft.swap ??= {};
    draft.swap[step.id] = !draft.swap[step.id];
  }

  onMount(() => {
    if (!draft) {
      ui.live = null;
      return;
    }
    const release = keepAwake();
    unlockAudio();
    if (!resumed && !closing && step) play(step.id);
    const tick = setInterval(() => {
      now = Date.now();
      checkBells();
      if (now - draft.beat > 4000) draft.beat = now;
    }, 250);
    return () => {
      clearInterval(tick);
      release();
    };
  });

  $effect(() => {
    if (!draft) return;
    const snapshot = $state.snapshot(draft);
    if (!finished) saveLive(uid, snapshot);
  });

  // ── Navigazione ──────────────────────────────────────────────────────────

  function goTo(index) {
    unlockAudio();
    if (!closing && step) pause(step.id);
    dir = index >= draft.step ? 1 : -1;
    info = false;
    draft.step = Math.max(0, Math.min(steps.length, index));
    if (draft.step < steps.length) play(steps[draft.step].id);
    scroller?.scrollTo({ top: 0 });
  }

  function leave() {
    if (!closing && step) pause(step.id);
    saveLive(uid, $state.snapshot(draft));
    finished = true;
    ui.live = null;
    ui.toast('Sessione in pausa: la ritrovi in Oggi');
  }

  // ── Obiettivi ────────────────────────────────────────────────────────────

  function openGoal(s) {
    unlockAudio();
    buzz();
    draft.attempts[s.id] ??= startGoal(app.catalog.exercise(s.ex), app.medals[s.ex]);
  }
  function closeGoal(s) {
    const v = draft.attempts[s.id];
    // Si chiude senza perdere niente: se c'è già una misura resta salvata.
    if (v && !goalTries(app.catalog.exercise(v.ex), v).length) delete draft.attempts[s.id];
    else if (v) v.closed = true;
  }

  /** Cambia l'esercizio di un passo con uno qualsiasi della libreria. */
  function changeExercise(index) {
    const s = draft.session.steps[index];
    const current = app.catalog.exercise(s.ex);
    pickExercise({
      title: 'Cambia esercizio',
      value: s.ex,
      family: current?.family,
      variantsOf: s.ex,
      onpick: (id) => {
        const ex = id && app.catalog.exercise(id);
        if (!ex || id === s.ex) return;
        draft.session.steps[index] = replaceStepExercise($state.snapshot(s), ex.id, app.catalog);
        if (draft.mode === 'training') draft.changes = { ...(draft.changes ?? {}), [s.id]: ex.id };
        if (draft.attempts[s.id]) draft.attempts[s.id] = startGoal(ex, app.medals[ex.id]);
        buzz();
      }
    });
  }

  /** Nel test: aggiunge un esercizio qualsiasi e ci va. */
  function addExercise() {
    pickExercise({
      title: 'Aggiungi un esercizio',
      onpick: (id) => {
        const ex = id && app.catalog.exercise(id);
        if (!ex) return;
        const s = exerciseStep(`t-${ex.id}-${Date.now().toString(36)}`, ex.id, TEST_MINUTES, app.catalog, { goal: true });
        draft.session.steps.push(s);
        draft.attempts[s.id] = startGoal(ex, app.medals[ex.id]);
        goTo(draft.session.steps.length - 1);
      }
    });
  }

  function pickScheme(index, id) {
    const s = draft.session.steps[index];
    const scheme = schemeOf(id, app.catalog);
    if (!scheme) return;
    s.scheme = scheme;
    buzz();
  }
  /** Gli schemi della libreria (famiglia schemi) e quelli dei mesi. */
  function moreSchemes(index) {
    const s = draft.session.steps[index];
    const lib = app.catalog.activeExerciseIds.map((id) => app.catalog.exercise(id)).filter((e) => e.family === 'schemi');
    ui.open('pick', {
      title: 'Schema della partitella',
      value: s.scheme?.id,
      groups: [
        { name: 'Schemi', options: lib.map((e) => ({ id: e.id, label: e.name })) },
        { name: 'Dei mesi', options: Object.values(SCHEMES).map((x) => ({ id: x.id, label: x.name })) }
      ],
      onpick: (id) => id && pickScheme(index, id)
    });
  }

  /** Sopra il nome dell'esercizio: il percorso, oppure il blocco (con «2/3» se ha più esercizi). */
  function eyebrow(s) {
    const b = s.block;
    const label = s.track ? app.catalog.track(s.track)?.short : b && b.name !== s.name ? b.name : null;
    return [label, b?.of > 1 ? `${b.n}/${b.of}` : null].filter(Boolean).join(' · ');
  }

  /** L'allenamento con gli esercizi cambiati, salvato fra i tuoi. */
  function saveMine() {
    const base = app.catalog.template(draft.template);
    const t = app.saveCustom('templates', { ...templateWithOverrides(base, draft.changes), name: `${base.name} (mio)` });
    draft.savedAs = t.id;
    buzz();
    ui.toast(`«${t.name}» è tra i tuoi allenamenti`);
  }
  const canSave = $derived(draft?.mode === 'training' && !draft.savedAs && Object.keys(draft.changes ?? {}).some((k) => /^b\d/.test(k)));

  /** La metà della partitella in corso: 1 rischiosa, 2 a schema. */
  const matchPart = $derived(step?.kind === 'match' ? (elapsed >= matchHalves(step.minutes)[0] * 60 ? 2 : 1) : null);
  /** Il blocco dopo, saltando la pausa. */
  function nextBlock(index) {
    const n = steps[index + 1];
    return n?.kind === 'pause' ? steps[index + 2] : n;
  }

  // ── Chiusura ─────────────────────────────────────────────────────────────

  /** I tentativi da salvare, nell'ordine dei passi. */
  function collect() {
    const out = [];
    for (const s of steps) {
      const v = draft.attempts?.[s.id];
      const ex = v && app.catalog.exercise(v.ex);
      const tries = goalTries(ex, v);
      if (!ex || !tries.length) continue;
      out.push(makeAttempt({ ex: ex.id, fmt: ex.measure.type, tries, tier: v.tier, marks: v.marks?.length ? v.marks.join('') : null, q: v.q }));
    }
    return out;
  }

  /** Il riepilogo: le misure di oggi e le medaglie arrivate. */
  const summary = $derived.by(() => {
    if (!closing) return null;
    const attempts = collect();
    const legacy = draft.legacyTests;
    const ev = { id: '__live', date: draft.date, createdAt: Date.now(), attempts, tests: legacy?.tests ?? [], serve: legacy?.serve ?? null };
    const after = allMedals(app.catalog, [...app.attempts, ...allAttempts([ev], app.catalog)], draft.date);
    return { attempts, won: newMedals(app.medals, after) };
  });

  function finish() {
    const attempts = collect();
    const seconds = Object.values(draft.timers).reduce((n, t) => n + t.acc + (t.since ? (Date.now() - t.since) / 1000 : 0), 0);
    // Se i timer non sono stati usati, vale la durata prevista.
    const minutes = seconds >= 600 ? Math.round(seconds / 60) : draft.session.minutes;
    const ev = {
      kind: draft.mode,
      date: draft.date,
      planId: draft.planId,
      block: draft.block ?? draft.session.block?.id ?? null,
      minutes,
      attempts,
      exercises: sessionExercises(draft.session.steps),
      focus: draft.focus,
      note: draft.note.trim(),
      feel: draft.feel
    };
    if (draft.partner?.name) ev.partner = { id: draft.partner.id ?? null, name: draft.partner.name };
    // I test contati in una sessione cominciata con la 0.2 si salvano come allora.
    if (draft.legacyTests?.tests?.length) ev.tests = draft.legacyTests.tests;
    if (draft.legacyTests?.serve) ev.serve = draft.legacyTests.serve;
    if (draft.mode === 'training') {
      ev.template = draft.template;
      ev.trained = trainedTracks(draft.session.steps);
      if (draft.legacy) ev.legacy = draft.legacy;
    }
    if (draft.occ) ev.occ = draft.occ;
    // Era un appuntamento aggiunto a mano: diventa la voce fatta, con lo stesso id.
    if (draft.eventId) {
      ev.id = draft.eventId;
      ev.adhoc = true;
    } else if (draft.newId) {
      // Le note scritte alla chiusura puntano già a questa voce.
      ev.id = draft.newId;
    }
    const won = summary?.won ?? [];
    app.saveEvent(ev);
    celebrateFinish(steps.map((s) => stepFamily(s, app.catalog)).filter((f) => f && f !== 'pausa'));
    finished = true;
    clearLive(uid);
    ui.live = null;
    const full = won.filter((w) => !w.half);
    ui.toast(full.length ? `Sessione salvata · ${full.length === 1 ? 'una medaglia nuova' : `${full.length} medaglie nuove`}` : 'Sessione salvata nel diario');
  }

  const FEEL = ['Dura', 'Così così', 'Bene', 'Molto bene', 'Ottima'];

  /** I minuti fatti (dai timer), oppure quelli previsti se i timer non sono stati usati. */
  const doneMinutes = $derived.by(() => {
    if (!closing) return 0;
    const seconds = Object.values(draft.timers).reduce((n, t) => n + t.acc + (t.since ? (now - t.since) / 1000 : 0), 0);
    return seconds >= 600 ? Math.round(seconds / 60) : draft.session.minutes;
  });
  const doneExercises = $derived(closing ? new Set(steps.filter((s) => s.ex && draft.timers[s.id]).map((s) => s.ex)).size : 0);

  // ── Nota sul colpo ──────────────────────────────────────────────────────
  /** L'ultimo esercizio fatto e il suo colpo principale, già pronti per la nota. */
  const lastDone = $derived.by(() => {
    const s = [...steps].reverse().find((x) => (x.kind === 'exercise' || x.kind === 'serve') && x.ex);
    const ex = s && app.catalog.exercise(s.ex);
    return ex ? { ex: ex.id, stroke: ex.strokes?.find((id) => app.stroke(id)) ?? null } : null;
  });
  const sessionNotes = $derived(draft?.newId ? app.notes.filter((n) => n.eventId === draft.newId).length : 0);

  /** Il colpo principale di un esercizio (il primo che esiste fra i colpi). */
  function strokeOf(ex) {
    return ex?.strokes?.find((id) => app.stroke(id)) ?? null;
  }

  /** Durante la sessione: una nota veloce (testo e sensazione) sul colpo dell'esercizio in corso. */
  function quickNote(ex) {
    draft.newId ??= draft.eventId ?? newId();
    ui.open('note', { quick: true, draft: { stroke: strokeOf(ex), ex: ex.id, date: draft.date, eventId: draft.newId } });
  }

  function addNote() {
    draft.newId ??= draft.eventId ?? newId();
    ui.open('note', { draft: { stroke: lastDone?.stroke ?? null, ex: lastDone?.ex ?? null, date: draft.date, eventId: draft.newId } });
  }
</script>

{#if draft}
  <div class="live" in:fly={{ y: 40, duration: 420, easing: cubicOut }} out:fade={{ duration: 180 }}>
    <header>
      <button class="icon-btn" onclick={leave} aria-label="Metti in pausa e chiudi"><X size={22} /></button>
      <div class="steps" role="tablist" aria-label="Fasi">
        {#each steps as s, i (s.id)}
          {#if s.kind !== 'pause'}
            <button
              class:on={i === draft.step}
              class:past={i < draft.step}
              data-fam={stepFamily(s, app.catalog)}
              style:flex-grow={s.minutes}
              onclick={() => goTo(i)}
              aria-label={s.name}
              role="tab"
              aria-selected={i === draft.step}
            ></button>
          {/if}
        {/each}
      </div>
      <button class="end" class:on={closing} onclick={() => goTo(steps.length)} aria-label="Chiusura" role="tab" aria-selected={closing}>
        <Check size={14} strokeWidth={3} />
      </button>
    </header>

    <div class="scroll" bind:this={scroller}>
      {#key draft.step}
        <div class="content" in:fly={{ x: 32 * dir, duration: 320, easing: cubicOut }}>
          {#if !closing}
            {#if flash}
              <div class="turn" role="status" in:fly={{ y: -12, duration: 260 }} out:fade={{ duration: 260 }}><Repeat size={20} strokeWidth={2.6} /> Cambio</div>
            {/if}

            <!-- Il blocco in corso: grande, con il suo colore, il nome e il tempo. -->
            <section class="now" class:rest={step.kind === 'pause'} class:partner data-fam={fam}>
              <div class="now-top">
                {#if step.kind === 'pause'}<span class="now-ico"><Coffee size={20} strokeWidth={2.4} /></span>{/if}
                <span class="now-eyebrow">{step.kind === 'exercise' ? (eyebrow(step) || FAMILY[stepEx?.family]?.name || '') : step.kind === 'pause' ? 'Bevi e riposa' : ''}</span>
                {#if turnable}
                  {#key partner}
                    <button class="who" onclick={swapTurns} aria-label="{turnLabel}. Tocca per invertire i turni" in:scale={{ start: 0.8, duration: 260 }}>
                      {#if partner}<Users size={16} strokeWidth={2.6} />{:else}<User size={16} strokeWidth={2.6} />{/if}
                      {turnLabel}
                    </button>
                  {/key}
                {/if}
              </div>
              <h1 class="now-name">{step.name}</h1>
              <div class="clock">
                <button class="time t-num" class:over={remaining < 0} class:idle={!running} onclick={toggle} aria-label={running ? 'Pausa' : 'Avvia'}>
                  {remaining < 0 ? '+' : ''}{fmtClock(Math.abs(remaining))}
                </button>
                <button class="toggle raise" onclick={toggle} aria-hidden="true" tabindex="-1">
                  {#if running}<Pause size={24} fill="currentColor" strokeWidth={0} />{:else}<Play size={24} fill="currentColor" strokeWidth={0} />{/if}
                </button>
              </div>
              <div class="bar" class:over={remaining < 0}>
                <i style:width="{Math.min(100, (elapsed / total) * 100)}%"></i>
                {#if turnable}<b class="mid" aria-hidden="true"></b>{/if}
              </div>
            </section>

            {#if stepEx && (step.kind === 'exercise' || step.kind === 'serve')}
              <div class="tools">
                <button class="tool" onclick={() => changeExercise(draft.step)} aria-label="Cambia esercizio"><Shuffle size={20} /><span>Cambia</span></button>
                {#if strokeOf(stepEx)}
                  <button class="tool" onclick={() => quickNote(stepEx)} aria-label="Nota sul colpo: {app.strokeName(strokeOf(stepEx))}"><NotebookPen size={20} /><span>Nota</span></button>
                {/if}
                {#if step.kind === 'exercise'}
                  <button class="tool" class:on={info} onclick={() => (info = !info)} aria-expanded={info} aria-label="Come si fa"><Info size={20} /><span>Come si fa</span></button>
                {/if}
              </div>
            {/if}

            {#if canGoal}
              {@const v = draft.attempts?.[step.id]}
              {#if v && !v.closed}
                <GoalPad exercise={stepEx} value={v} date={draft.date} onchange={(next) => (draft.attempts[step.id] = next)} onclose={() => closeGoal(step)} />
              {:else}
                {@const g = nextGoal(stepEx, app.medals[stepEx.id])}
                <button class="goal-btn raise neutral" onclick={() => (v ? (v.closed = false) : openGoal(step))}>
                  <MedalRing exercise={stepEx} medals={app.medals[stepEx.id]} size={60} />
                  <span class="grow">
                    <strong>{v ? 'Torna all’obiettivo' : 'Prova l’obiettivo'}</strong>
                    <span class="small muted block">{g ? `${TIER[g.tier].name} · ${valueText(stepEx, g.goal, g.tier)}` : 'Tutte le medaglie prese'}</span>
                  </span>
                  <ArrowRight size={20} />
                </button>
              {/if}
            {/if}

            {#if step.kind === 'pause'}
              {@const after = steps[draft.step + 1]}
              {#if after}
                <span class="t-caps muted">Dopo la pausa</span>
                <Brick fam={stepFamily(after, app.catalog)} name={after.name} minutes={after.minutes} sub={after.block?.of > 1 ? `${after.block.n} di ${after.block.of}` : ''} />
              {/if}
            {:else if step.kind !== 'exercise' || info}
              <div class="body" in:fade={{ duration: 160 }}>
                <StepBody
                  {step}
                  big
                  showGoal={false}
                  part={matchPart}
                  onscheme={step.kind === 'match' ? (id) => pickScheme(draft.step, id) : null}
                  onmore={step.kind === 'match' ? () => moreSchemes(draft.step) : null}
                />
              </div>
            {/if}
          {:else}
            <h1 class="t-title">Com’è andata?</h1>

            <div class="stats">
              <div class="stat"><Timer size={20} strokeWidth={2.4} /><b class="t-num">{doneMinutes}</b><span>minuti</span></div>
              <div class="stat"><ListChecks size={20} strokeWidth={2.4} /><b class="t-num">{doneExercises}</b><span>{doneExercises === 1 ? 'esercizio' : 'esercizi'}</span></div>
            </div>

            {#if summary?.won.length}
              <section class="won-grid">
                {#each summary.won as w, i (w.ex + w.tier + (w.half ? 'h' : ''))}
                  {@const ex = app.catalog.exercise(w.ex)}
                  <div class="won" data-medal={w.tier} style:animation-delay="{i * 90}ms">
                    <span class="won-pop" style:animation-delay="{i * 90}ms"><MedalBadge tier={w.tier} half={w.half} size={64} label={false} /></span>
                    <strong>{w.half ? 'Metà oro' : TIER[w.tier].name}</strong>
                    <span class="small muted">{ex?.name}</span>
                  </div>
                {/each}
              </section>
            {/if}

            {#if summary?.attempts.length}
              <section class="group">
                <h2 class="t-caps muted">Risultati di oggi</h2>
                <div class="card flush list">
                  {#each summary.attempts as a, i (i)}
                    {@const ex = app.catalog.exercise(a.ex)}
                    <div class="res" data-fam={ex?.family}>
                      <i class="fam-dot"></i>
                      <span class="grow">{ex?.name}</span>
                      <span class="t-num small">{valueText(ex, a.tries.slice(0, ex?.measure?.type === 'fila' || ex?.measure?.type === 'tempo' ? 3 : 1).reduce((best, x) => (size(x) > size(best) ? x : best)), a.tier)}</span>
                    </div>
                  {/each}
                </div>
              </section>
            {:else if draft.mode === 'test'}
              <p class="muted">Nessun risultato registrato.</p>
            {/if}

            {#if draft.mode === 'test' || canSave}
              <div class="row g-8 wrap">
                {#if draft.mode === 'test'}
                  <button class="btn ghost small" onclick={addExercise}><Plus size={16} /> Aggiungi un esercizio</button>
                {/if}
                {#if canSave}
                  <button class="btn ghost small" onclick={saveMine}><Save size={16} /> Salva come mio</button>
                {/if}
              </div>
            {/if}

            <section class="group">
              <h2 class="t-caps muted">Sensazione</h2>
              <div class="feel" role="radiogroup" aria-label="Sensazione">
                {#each FEEL as label, i (label)}
                  <button
                    role="radio"
                    aria-checked={draft.feel === i + 1}
                    class:on={draft.feel != null && i + 1 <= draft.feel}
                    style:--h="{30 + i * 14}%"
                    onclick={() => {
                      buzz();
                      draft.feel = draft.feel === i + 1 ? null : i + 1;
                    }}
                    aria-label={label}
                  ><i></i></button>
                {/each}
              </div>
              <p class="small muted feel-label">{draft.feel ? FEEL[draft.feel - 1] : ' '}</p>
            </section>

            <section class="group">
              <h2 class="t-caps muted">Con chi</h2>
              <PartnerField value={draft.partner ?? null} onchange={(p) => (draft.partner = p)} />
            </section>

            <section class="group">
              <h2 class="t-caps muted">Nota sul colpo</h2>
              <button class="btn ghost self" onclick={addNote}>
                <NotebookPen size={16} /> {lastDone?.stroke ? app.strokeName(lastDone.stroke) : 'Aggiungi nota'}
              </button>
              {#if sessionNotes}<p class="small muted">{sessionNotes === 1 ? '1 nota salvata' : `${sessionNotes} note salvate`}</p>{/if}
            </section>

            <section class="group">
              <h2 class="t-caps muted">Da correggere la prossima volta</h2>
              <FocusEditor value={draft.focus} onchange={(v) => (draft.focus = v)} />
            </section>

            <section class="group">
              <h2 class="t-caps muted">Note</h2>
              <textarea class="field" placeholder="Cosa ha funzionato, cosa no" bind:value={draft.note}></textarea>
            </section>
          {/if}
        </div>
      {/key}
    </div>

    <footer>
      {#if draft.step > 0}
        <button class="round back" onclick={() => goTo(steps[draft.step - 1]?.kind === 'pause' ? draft.step - 2 : draft.step - 1)} aria-label="Fase precedente"><ArrowLeft size={22} /></button>
      {/if}
      {#if closing}
        <button class="go raise accent grow" onclick={finish}><Check size={20} strokeWidth={2.6} /> Salva nel diario</button>
      {:else if draft.step === steps.length - 1}
        <button class="go raise grow" onclick={() => goTo(steps.length)}>Chiudi la sessione <ArrowRight size={20} /></button>
      {:else if step.kind === 'pause'}
        <button class="go raise grow" onclick={() => goTo(draft.step + 1)}>Salta la pausa <ArrowRight size={20} /></button>
      {:else}
        {@const nb = nextBlock(draft.step)}
        <button class="go raise grow" onclick={() => goTo(draft.step + 1)}>
          <i class="next-dot" data-fam={stepFamily(nb, app.catalog)}></i>
          <span class="next">{nb?.name}</span>
          <ArrowRight size={20} />
        </button>
      {/if}
    </footer>
  </div>
{/if}

<style>
  .live {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    background: var(--paper);
  }

  /* ── In alto: chiudi, i blocchi come segmenti colorati, la chiusura ── */
  header {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(env(safe-area-inset-top) + 8px) 14px 8px 8px;
  }
  .steps {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 3px;
    height: 36px;
  }
  .steps button {
    flex-basis: 0;
    min-width: 6px;
    height: 8px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--f) 42%, var(--sunk));
    transition:
      height var(--dur) var(--spring),
      background var(--dur) var(--ease);
  }
  .steps button.past {
    background: var(--f);
  }
  .steps button.on {
    height: 18px;
    background: var(--f);
    box-shadow: 0 0 0 2px var(--paper), 0 0 0 4px var(--f);
  }
  .end {
    display: grid;
    place-items: center;
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px var(--line-strong);
    color: var(--ink-3);
    transition:
      background var(--dur) var(--ease),
      color var(--dur) var(--ease);
  }
  .end.on {
    background: var(--accent);
    box-shadow: none;
    color: #fff;
  }

  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
  }
  .content {
    max-width: 560px;
    margin: 0 auto;
    padding: 8px 20px 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .turn {
    position: fixed;
    top: calc(env(safe-area-inset-top) + 64px);
    left: 50%;
    translate: -50% 0;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    font-weight: 800;
    font-size: 20px;
    box-shadow: var(--shadow);
  }

  /* ── Il blocco in corso ── */
  .now {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 18px 20px 20px;
    border-radius: var(--r-brick);
    background: var(--f);
    color: var(--f-on);
    box-shadow: 0 var(--edge) 0 var(--f-edge);
  }
  /* Tocca al compagno: il riquadro si rovescia (fondo scuro, bordo e barra del colore della
     famiglia), così si vede anche da lontano, con il telefono appoggiato. */
  .now {
    transition:
      background var(--dur-slow) var(--ease),
      color var(--dur-slow) var(--ease),
      box-shadow var(--dur-slow) var(--ease);
  }
  .now.partner {
    background: var(--ink);
    color: var(--paper);
    box-shadow:
      inset 0 0 0 5px var(--f),
      0 var(--edge) 0 var(--f-edge);
    animation: flip var(--dur-slow) var(--ease);
  }
  @keyframes flip {
    40% {
      transform: scale(1.025);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .now.partner {
      animation: none;
    }
  }
  .who {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    margin-left: auto;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--f-on) 18%, transparent);
    color: inherit;
    font-size: 14px;
    font-weight: 750;
    white-space: nowrap;
  }
  .now.partner .who {
    background: var(--f);
    color: var(--f-on);
  }
  .now.partner .toggle {
    --edge-c: var(--f-edge);
    background: var(--f);
    color: var(--f-on);
  }
  .now.partner .bar {
    background: color-mix(in srgb, var(--paper) 22%, transparent);
  }
  .now.partner .bar i {
    background: var(--f);
  }
  .mid {
    position: absolute;
    top: -3px;
    bottom: -3px;
    left: calc(50% - 1.5px);
    width: 3px;
    border-radius: 2px;
    background: currentColor;
    opacity: 0.7;
  }
  .now.rest {
    background: var(--card);
    color: var(--ink);
    border: 1px solid var(--line);
    box-shadow: none;
  }
  .now-top {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
  }
  .now-ico {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--f-on) 16%, transparent);
  }
  .now.rest .now-ico {
    background: var(--sunk);
  }
  .now-eyebrow {
    font-size: 14px;
    font-weight: 700;
    opacity: 0.88;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .now-name {
    margin: 2px 0 0;
    font-size: clamp(26px, 7.4vw, 34px);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.08;
  }
  .clock {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 6px;
  }
  .time {
    font-size: clamp(64px, 22vw, 96px);
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.06em;
    color: inherit;
    transition: opacity var(--dur) var(--ease);
  }
  .time.idle {
    opacity: 0.5;
  }
  .toggle {
    --edge-c: color-mix(in srgb, var(--f-on) 40%, var(--f-edge));
    display: grid;
    place-items: center;
    flex: none;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--f-on);
    color: var(--f);
  }
  .now.rest .toggle {
    --edge-c: var(--line-strong);
    background: var(--ink);
    color: var(--paper);
  }
  .bar {
    position: relative;
    height: 8px;
    margin-top: 10px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--f-on) 22%, transparent);
  }
  .now.rest .bar {
    background: var(--sunk);
  }
  .bar i {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--f-on);
    transition: width 0.3s linear;
  }
  .now.rest .bar i {
    background: var(--ink);
  }
  .bar.over i {
    background: var(--accent);
  }

  /* ── Strumenti dell'esercizio ── */
  .tools {
    display: flex;
    gap: 8px;
  }
  .tool {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 4px 8px;
    border-radius: 16px;
    background: var(--card);
    border: 1px solid var(--line);
    font-size: 12.5px;
    font-weight: 650;
    transition:
      transform var(--dur-fast) var(--ease),
      background var(--dur) var(--ease);
  }
  .tool:active {
    transform: scale(0.95);
  }
  .tool.on {
    background: var(--ink);
    color: var(--paper);
    border-color: var(--ink);
  }

  .goal-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 12px 18px 12px 12px;
    border-radius: var(--r-card);
    border: 1px solid var(--line);
    background: var(--card);
    text-align: left;
  }
  .goal-btn strong {
    font-size: 18px;
    font-weight: 750;
  }
  .goal-btn :global(.lucide-arrow-right) {
    color: var(--ink-3);
  }
  .body {
    padding: 2px 2px 0;
  }

  /* ── Chiusura ── */
  .t-title {
    margin: 4px 0 0;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 14px 14px 12px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
    color: var(--accent-ink);
  }
  .stat b {
    margin-top: 6px;
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.04em;
    line-height: 1;
    color: var(--ink);
  }
  .stat span {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .won-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .won {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 10px 14px;
    border-radius: var(--r-card);
    background: color-mix(in srgb, var(--md) 18%, var(--card));
    border: 1.5px solid color-mix(in srgb, var(--md) 50%, var(--line));
    text-align: center;
    animation: rise 0.5s var(--ease-out) both;
  }
  .won strong {
    font-size: 17px;
    font-weight: 750;
  }
  .won-pop {
    display: grid;
    animation: medal-in 0.75s var(--spring) both;
  }
  .group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .group h2 {
    margin: 6px 0 0;
  }
  .res {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 16px;
  }
  .fam-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--f);
    flex: none;
  }
  .wrap {
    flex-wrap: wrap;
  }
  .self {
    align-self: flex-start;
  }
  strong {
    font-weight: 650;
  }
  .block {
    display: block;
  }

  .feel {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    height: 64px;
  }
  .feel button {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 8px;
    border-radius: 14px;
    background: var(--sunk);
    transition: transform var(--dur) var(--spring);
  }
  .feel button i {
    width: 100%;
    height: var(--h);
    border-radius: 6px;
    background: var(--line-strong);
    transition: background var(--dur) var(--ease);
  }
  .feel button.on i {
    background: var(--accent);
  }
  .feel button:active {
    transform: scale(0.92);
  }
  .feel-label {
    margin-top: -4px;
    min-height: 19px;
  }

  /* ── In basso ── */
  footer {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 560px;
    width: 100%;
    margin: 0 auto;
    padding: 10px 20px calc(env(safe-area-inset-bottom) + 18px);
  }
  .back {
    width: 60px;
    height: 60px;
  }
  .go {
    --edge-c: color-mix(in srgb, var(--ink) 55%, #000);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 60px;
    padding: 0 20px;
    border-radius: 20px;
    background: var(--ink);
    color: var(--paper);
    font-size: 17px;
    font-weight: 700;
    min-width: 0;
  }
  .go.accent {
    --edge-c: color-mix(in srgb, var(--accent) 62%, #000);
    background: var(--accent);
    color: #fff;
  }
  .next-dot {
    flex: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--f);
    box-shadow: 0 0 0 2px var(--paper);
  }
  .next {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
