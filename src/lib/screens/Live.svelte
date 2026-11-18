<script>
  // La sessione dal vivo. Il telefono sta sul tavolo: timer grande e, su ogni esercizio, il
  // prossimo obiettivo da provare quando vuoi. Tutto viene salvato sul dispositivo a ogni tocco e
  // diventa una voce del diario solo alla fine. Niente è bloccato: ogni esercizio si cambia e ogni
  // obiettivo si prova, con qualsiasi medaglia.
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import X from '@lucide/svelte/icons/x';
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Check from '@lucide/svelte/icons/check';
  import Repeat from '@lucide/svelte/icons/repeat-2';
  import Plus from '@lucide/svelte/icons/plus';
  import { app } from '../store/app.svelte.js';
  import { ui, buzz } from '../store/ui.svelte.js';
  import { loadLive, saveLive, clearLive } from '../store/live.js';
  import { weekFor } from '../engine/plan.js';
  import { composeSession, composeTest, exerciseStep, sessionExercises, trainedTracks, matchHalves, TEST_MINUTES } from '../engine/compose.js';
  import { upgradeDraft, makeAttempt, allAttempts } from '../engine/attempts.js';
  import { allMedals, newMedals, valueText, size } from '../engine/medals.js';
  import { SCHEMES, DEFAULT_SCHEME } from '../data/program.js';
  import { TIER } from '../data/library.js';
  import { fmtClock } from '../util/dates.js';
  import { chime, keepAwake, unlockAudio } from '../util/device.js';
  import { pickExercise } from '../ui/pickers.js';
  import StepBody from '../ui/StepBody.svelte';
  import GoalPad, { startGoal, goalTries } from '../ui/GoalPad.svelte';
  import Medal from '../ui/Medal.svelte';
  import FocusEditor from '../ui/FocusEditor.svelte';

  const uid = app.user.uid;

  function create() {
    const live = ui.live;
    const date = live.date ?? app.today;
    const week = weekFor(app.plan, date, app.catalog);
    const test = live.mode === 'test';
    const template = test ? null : app.catalog.template(live.template);
    const session = test
      ? composeTest({ exerciseIds: live.exercises ?? [], catalog: app.catalog })
      : composeSession({ week, template, catalog: app.catalog, medals: app.medals });
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
      focus: null,
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
    if (step.kind === 'serve' && !t.half && sec >= step.minutes * 30) {
      t.half = true;
      bell([988], 200);
      ui.toast('Cambio: ora serve l’altro');
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
      onpick: (id) => {
        const ex = id && app.catalog.exercise(id);
        if (!ex || id === s.ex) return;
        s.ex = ex.id;
        if (s.kind === 'exercise') s.name = ex.name;
        // Un esercizio fuori dalla sequenza del percorso non allena quel percorso.
        if (s.track && !app.catalog.sequence(s.track).includes(ex.id)) delete s.track;
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
    if (!SCHEMES[id]) return;
    s.scheme = SCHEMES[id];
    buzz();
  }
  function moreSchemes(index) {
    const s = draft.session.steps[index];
    ui.open('pick', {
      title: 'Schema della partitella',
      value: s.scheme?.id,
      groups: [{ options: Object.values(SCHEMES).map((x) => ({ id: x.id, label: x.name, hint: x.text })) }],
      onpick: (id) => id && pickScheme(index, id)
    });
  }

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
    }
    const won = summary?.won ?? [];
    app.saveEvent(ev);
    finished = true;
    clearLive(uid);
    ui.live = null;
    const full = won.filter((w) => !w.half);
    ui.toast(full.length ? `Sessione salvata · ${full.length === 1 ? 'una medaglia nuova' : `${full.length} medaglie nuove`}` : 'Sessione salvata nel diario');
  }

  const FEEL = ['Dura', 'Così così', 'Bene', 'Molto bene', 'Ottima'];
</script>

{#if draft}
  <div class="live" in:fly={{ y: 40, duration: 420, easing: cubicOut }} out:fade={{ duration: 180 }}>
    <header>
      <button class="icon-btn" onclick={leave} aria-label="Metti in pausa e chiudi"><X size={22} /></button>
      <div class="steps" role="tablist" aria-label="Fasi">
        {#each steps as s, i (s.id)}
          {#if s.kind !== 'pause'}
            <button class:on={i === draft.step} class:past={i < draft.step} onclick={() => goTo(i)} aria-label={s.name} role="tab" aria-selected={i === draft.step}></button>
          {/if}
        {/each}
        <button class="end" class:on={closing} onclick={() => goTo(steps.length)} aria-label="Chiusura" role="tab" aria-selected={closing}>
          <Check size={11} strokeWidth={3} />
        </button>
      </div>
      <span class="tag kind" data-color={draft.color}>{draft.title}</span>
    </header>

    <div class="scroll" bind:this={scroller}>
      {#key draft.step}
        <div class="content" in:fly={{ x: 32 * dir, duration: 400, easing: cubicOut }}>
          {#if !closing}
            <div class="clock">
              <button class="time mono" class:over={remaining < 0} class:idle={!running} onclick={toggle} aria-label={running ? 'Pausa' : 'Avvia'}>
                {remaining < 0 ? '+' : ''}{fmtClock(Math.abs(remaining))}
              </button>
              <button class="toggle" onclick={toggle} aria-hidden="true" tabindex="-1">
                {#if running}<Pause size={22} fill="currentColor" strokeWidth={0} />{:else}<Play size={22} fill="currentColor" strokeWidth={0} />{/if}
              </button>
            </div>
            <div class="bar" class:over={remaining < 0}><i style:width="{Math.min(100, (elapsed / total) * 100)}%"></i></div>

            <div class="head">
              {#if step.kind === 'exercise' && step.track}
                <span class="small muted">{app.catalog.track(step.track)?.short ?? ''}</span>
              {/if}
              <h1 class="display">{step.name}</h1>
              {#if stepEx && (step.kind === 'exercise' || step.kind === 'serve')}
                <div class="tools">
                  <button class="chip mini" onclick={() => changeExercise(draft.step)}><Repeat size={14} /> Cambia esercizio</button>
                </div>
              {/if}
            </div>

            {#if canGoal}
              {@const v = draft.attempts?.[step.id]}
              {#if v && !v.closed}
                <GoalPad exercise={stepEx} value={v} date={draft.date} onchange={(next) => (draft.attempts[step.id] = next)} onclose={() => closeGoal(step)} />
              {:else}
                <button class="goal-btn" onclick={() => (v ? (v.closed = false) : openGoal(step))}>
                  <Medal tier="O" on={false} size={20} />
                  <span class="grow">
                    <strong>{v ? 'Torna all’obiettivo' : 'Prova l’obiettivo'}</strong>
                    {#if step.kind === 'serve'}<span class="small muted block">{stepEx.name}</span>{/if}
                  </span>
                  <ArrowRight size={18} />
                </button>
              {/if}
            {/if}

            {#if step.kind === 'pause'}
              {@const after = steps[draft.step + 1]}
              <p class="lead muted">Bevi e riposa. Allo zero si passa da soli al blocco dopo.</p>
              {#if after}
                <section class="card stack g-8">
                  <span class="small muted">Dopo la pausa · {after.minutes}′</span>
                  <strong>{after.name}</strong>
                </section>
              {/if}
            {:else}
              <StepBody
                {step}
                big
                showGoal={!draft.attempts?.[step.id] || draft.attempts[step.id].closed}
                part={matchPart}
                onscheme={step.kind === 'match' ? (id) => pickScheme(draft.step, id) : null}
                onmore={step.kind === 'match' ? () => moreSchemes(draft.step) : null}
              />
            {/if}
          {:else}
            <div class="head">
              <h1 class="display">Com’è andata?</h1>
            </div>

            {#if summary?.won.length}
              <section class="card flush list">
                {#each summary.won as w (w.ex + w.tier + (w.half ? 'h' : ''))}
                  {@const ex = app.catalog.exercise(w.ex)}
                  <div class="res won" data-tier={w.tier}>
                    <Medal tier={w.tier} half={w.half} size={30} pop />
                    <div class="grow">
                      <strong>{w.half ? 'Metà oro' : TIER[w.tier].name}</strong>
                      <p class="small muted">{ex?.name}</p>
                    </div>
                  </div>
                {/each}
              </section>
            {/if}

            {#if summary?.attempts.length}
              <section class="stack g-8">
                <h2 class="heading">Misure di oggi</h2>
                <div class="card flush list">
                  {#each summary.attempts as a, i (i)}
                    {@const ex = app.catalog.exercise(a.ex)}
                    <div class="res">
                      <span class="grow">{ex?.name}</span>
                      <span class="mono small">{valueText(ex, a.tries.slice(0, ex?.measure?.type === 'fila' || ex?.measure?.type === 'tempo' ? 3 : 1).reduce((best, x) => (size(x) > size(best) ? x : best)), a.tier)}</span>
                    </div>
                  {/each}
                </div>
              </section>
            {:else if draft.mode === 'test'}
              <p class="muted">Nessuna misura registrata.</p>
            {/if}

            {#if draft.mode === 'test'}
              <button class="btn ghost self" onclick={addExercise}><Plus size={16} /> Aggiungi un esercizio</button>
            {/if}

            <section class="stack g-12">
              <h2 class="heading">Sensazione</h2>
              <div class="feel" role="radiogroup" aria-label="Sensazione">
                {#each FEEL as label, i (label)}
                  <button
                    role="radio"
                    aria-checked={draft.feel === i + 1}
                    class:on={draft.feel === i + 1}
                    class:under={draft.feel != null && i + 1 < draft.feel}
                    onclick={() => {
                      buzz();
                      draft.feel = draft.feel === i + 1 ? null : i + 1;
                    }}
                    aria-label={label}
                  ></button>
                {/each}
              </div>
              <p class="small muted feel-label">{draft.feel ? FEEL[draft.feel - 1] : ' '}</p>
            </section>

            <section class="stack g-12">
              <h2 class="heading">Da correggere la prossima volta</h2>
              <FocusEditor value={draft.focus} onchange={(v) => (draft.focus = v)} />
            </section>

            <section class="stack g-12">
              <h2 class="heading">Note</h2>
              <textarea class="field" placeholder="Cosa ha funzionato, cosa no" bind:value={draft.note}></textarea>
            </section>
          {/if}
        </div>
      {/key}
    </div>

    <footer>
      {#if draft.step > 0}
        <button class="icon-btn back" onclick={() => goTo(steps[draft.step - 1]?.kind === 'pause' ? draft.step - 2 : draft.step - 1)} aria-label="Fase precedente"><ArrowLeft size={20} /></button>
      {/if}
      {#if closing}
        <button class="btn accent grow" onclick={finish}><Check size={18} strokeWidth={2.4} /> Salva nel diario</button>
      {:else if draft.step === steps.length - 1}
        <button class="btn primary grow" onclick={() => goTo(steps.length)}>Chiudi la sessione <ArrowRight size={18} /></button>
      {:else if step.kind === 'pause'}
        <button class="btn primary grow" onclick={() => goTo(draft.step + 1)}>Salta la pausa <ArrowRight size={18} /></button>
      {:else}
        <button class="btn primary grow" onclick={() => goTo(draft.step + 1)}>
          <span class="next">{nextBlock(draft.step)?.name}</span>
          <ArrowRight size={18} />
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
  header {
    flex: none;
    display: grid;
    grid-template-columns: 48px 1fr auto;
    align-items: center;
    padding: calc(env(safe-area-inset-top) + 8px) 12px 8px;
  }
  header .tag {
    justify-self: end;
    margin-right: 6px;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  header .tag.kind {
    background: color-mix(in srgb, var(--c) 16%, var(--card));
    color: var(--c);
  }
  .steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .steps button {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    color: transparent;
  }
  .steps button::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 4px;
    background: var(--line-strong);
    transition:
      width 0.4s var(--spring),
      background 0.3s var(--ease);
  }
  .steps button.past::before {
    background: var(--ink);
  }
  .steps button.on::before {
    width: 22px;
    background: var(--accent);
  }
  .steps .end::before {
    display: none;
  }
  .steps .end {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--line-strong);
    color: var(--ink-3);
    transition:
      background 0.3s var(--ease),
      color 0.3s var(--ease);
  }
  .steps .end.on {
    background: var(--accent);
    box-shadow: none;
    color: #15171a;
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
    padding: 8px 24px 32px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .clock {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: -12px;
  }
  .time {
    font-size: clamp(64px, 21vw, 96px);
    font-weight: 480;
    line-height: 1;
    letter-spacing: -0.06em;
    transition:
      color 0.3s var(--ease),
      opacity 0.3s var(--ease);
  }
  .time.idle {
    opacity: 0.45;
  }
  .time.over {
    color: var(--accent);
  }
  .toggle {
    display: grid;
    place-items: center;
    flex: none;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--sunk);
    color: var(--ink);
    transition: transform 0.35s var(--spring);
  }
  .toggle:active {
    transform: scale(0.9);
  }
  .bar {
    height: 4px;
    border-radius: 2px;
    background: var(--line);
    overflow: hidden;
  }
  .bar i {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: var(--ink);
    transition: width 0.3s linear;
  }
  .bar.over i {
    background: var(--accent);
  }

  .head {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .head .display {
    font-size: clamp(30px, 8vw, 38px);
  }

  .self {
    align-self: flex-start;
  }
  strong {
    font-weight: 580;
  }
  .block {
    display: block;
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .goal-btn {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 16px 18px;
    border-radius: var(--r);
    border: 1px solid var(--line);
    background: var(--card);
    text-align: left;
    transition:
      transform 0.3s var(--spring),
      border-color 0.2s var(--ease);
  }
  .goal-btn:active {
    transform: scale(0.98);
  }
  .goal-btn :global(svg) {
    color: var(--ink-3);
  }

  .res {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    animation: rise 0.5s var(--ease-out) both;
  }
  .res.won {
    background: color-mix(in srgb, var(--m) 14%, var(--card));
  }

  .feel {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }
  .feel button {
    height: 40px;
    border-radius: 10px;
    background: var(--sunk);
    transition:
      background 0.25s var(--ease),
      transform 0.35s var(--spring);
  }
  .feel button.under {
    background: color-mix(in srgb, var(--ink) 35%, var(--sunk));
  }
  .feel button.on {
    background: var(--ink);
  }
  .feel button:active {
    transform: scale(0.92);
  }
  .feel-label {
    margin-top: -4px;
    min-height: 19px;
  }

  footer {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 560px;
    width: 100%;
    margin: 0 auto;
    padding: 12px 24px calc(env(safe-area-inset-bottom) + 16px);
  }
  footer .btn {
    height: 56px;
    font-size: 16px;
  }
  .back {
    width: 56px;
    height: 56px;
    box-shadow: inset 0 0 0 1px var(--line-strong);
  }
  .next {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
