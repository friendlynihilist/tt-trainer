<script>
  // La sessione dal vivo. Il telefono sta sul tavolo: timer grande, un tocco per ogni palla
  // del test, esito subito. Tutto viene salvato sul dispositivo a ogni tocco e diventa una
  // voce del diario solo alla fine.
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import X from '@lucide/svelte/icons/x';
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Check from '@lucide/svelte/icons/check';
  import { app } from '../store/app.svelte.js';
  import { ui, buzz } from '../store/ui.svelte.js';
  import { loadLive, saveLive, clearLive } from '../store/live.js';
  import { weekAt, weekIndex } from '../engine/plan.js';
  import { composeSession } from '../engine/compose.js';
  import { judge, placementResult } from '../engine/levels.js';
  import { levelOf, LEVELS } from '../data/program.js';
  import { fmtClock } from '../util/dates.js';
  import { chime, keepAwake, unlockAudio } from '../util/device.js';
  import Dots from '../ui/Dots.svelte';
  import StepBody from '../ui/StepBody.svelte';
  import TestPad from '../ui/TestPad.svelte';
  import FocusEditor from '../ui/FocusEditor.svelte';

  const uid = app.user.uid;

  function create() {
    const { slot, date, monday } = ui.live;
    const week = weekAt(app.plan, weekIndex(app.plan, monday));
    const session = composeSession({ week, slot, tracks: app.tracks });
    return {
      slot,
      date,
      planId: app.plan.id,
      step: 0,
      timers: {},
      tests: {},
      placement: {},
      focus: null,
      note: '',
      feel: null,
      beat: Date.now(),
      // La sessione si congela all'inizio: resta la stessa anche se la si riprende più tardi.
      session: JSON.parse(JSON.stringify(session))
    };
  }

  function restore() {
    const saved = loadLive(uid);
    if (!saved) return null;
    // I timer rimasti accesi si fermano all'ultimo momento in cui l'app era viva.
    for (const t of Object.values(saved.timers)) {
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
    if (!t.rang && sec >= step.minutes * 60) {
      t.rang = true;
      bell([880, 1318, 1760], [200, 100, 200]);
    }
    if (step.kind === 'serve' && !t.half && sec >= step.minutes * 30) {
      t.half = true;
      bell([988], 200);
      ui.toast('Cambio: ora serve l’altro');
    }
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
    if (!resumed && !closing) play(step.id);
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
    if (!closing) pause(step.id);
    dir = index >= draft.step ? 1 : -1;
    draft.step = Math.max(0, Math.min(steps.length, index));
    if (draft.step < steps.length) play(steps[draft.step].id);
    scroller?.scrollTo({ top: 0 });
  }

  function leave() {
    if (!closing) pause(step.id);
    saveLive(uid, $state.snapshot(draft));
    finished = true;
    ui.live = null;
    ui.toast('Sessione in pausa: la ritrovi in Oggi');
  }

  // ── Test ─────────────────────────────────────────────────────────────────

  function verdict(trackId, level, score) {
    if (score == null) return null;
    const r = judge(app.tracks[trackId], level, score, app.rules);
    if (r.outcome === 'sali') return { tone: 'up', text: `Sali al livello ${r.after}`, after: r.after, outcome: r.outcome };
    if (r.outcome === 'completato') return { tone: 'up', text: 'Percorso completato', after: r.after, outcome: r.outcome };
    if (r.outcome === 'scendi') return { tone: 'down', text: `Scendi al livello ${r.after}`, after: r.after, outcome: r.outcome };
    const next = level >= LEVELS ? 'completi' : 'sali';
    return {
      tone: 'stay',
      text: r.streak ? `Ancora un test da ${app.rules.up} e ${next}` : `Resti al livello ${level}`,
      after: level,
      outcome: r.outcome
    };
  }

  function setTest(key, patch) {
    draft.tests[key] = patch;
  }

  // Test di partenza: si sale di livello finché il test viene superato.
  function placementOf(track) {
    return draft.placement[track] ?? { tries: [{ level: 1, marks: [], score: null }], set: null };
  }
  function placementView(track) {
    const p = placementOf(track);
    if (p.set) return { done: true, level: p.set, current: null, waiting: false };
    const res = placementResult(p.tries.filter((t) => t.score != null), app.rules);
    const current = p.tries[p.tries.length - 1];
    return { done: res.done, level: res.level, current, waiting: current.score != null && !res.done };
  }
  function setTry(track, patch) {
    const p = placementOf(track);
    const tries = [...p.tries];
    tries[tries.length - 1] = { ...tries[tries.length - 1], ...patch };
    draft.placement[track] = { ...p, tries };
  }
  function nextTry(track, level) {
    const p = placementOf(track);
    draft.placement[track] = { ...p, tries: [...p.tries, { level, marks: [], score: null }] };
  }
  function pickStart(track) {
    ui.open('pick', {
      title: 'Livello di partenza',
      value: placementOf(track).set,
      groups: [
        {
          options: Array.from({ length: LEVELS }, (_, i) => ({
            id: i + 1,
            label: `Livello ${i + 1}`,
            hint: levelOf(track, i + 1).name
          }))
        }
      ],
      onpick: (level) => (draft.placement[track] = { ...placementOf(track), set: level })
    });
  }
  function resetPlacement(track) {
    draft.placement[track] = { tries: [{ level: 1, marks: [], score: null }], set: null };
  }

  /** La fase da mostrare: durante il test di partenza l'esercizio è quello del livello in prova. */
  const view = $derived.by(() => {
    if (!step || step.kind !== 'exercise' || !step.placement) return step;
    const p = placementView(step.track);
    const level = p.done ? p.level : p.current.level;
    return { ...step, level, exercise: levelOf(step.track, level) };
  });

  // ── Chiusura ─────────────────────────────────────────────────────────────

  const results = $derived.by(() => {
    const out = [];
    for (const s of steps) {
      if (s.maint?.test) {
        const t = draft.tests.maint;
        out.push({ id: 'maint', name: `Mantenimento · ${s.maint.name}`, score: t?.score ?? null, before: s.maint.level, ...(verdict(s.maint.track, s.maint.level, t?.score ?? null) ?? {}) });
      }
      if (s.kind === 'serve' && s.test) {
        out.push({ id: 'serve', name: 'Servizi', score: draft.tests.serve?.score ?? null });
      }
      if (s.kind === 'exercise' && s.placement) {
        const p = placementView(s.track);
        out.push({ id: s.track, name: s.name, score: null, start: p.done ? p.level : null, placement: true });
      } else if (s.kind === 'exercise' && s.test) {
        const t = draft.tests[s.track];
        out.push({ id: s.track, name: s.name, score: t?.score ?? null, before: s.level, ...(verdict(s.track, s.level, t?.score ?? null) ?? {}) });
      }
    }
    return out;
  });

  function finish() {
    const tests = [];
    for (const s of steps) {
      if (s.maint?.test && draft.tests.maint?.score != null) {
        tests.push({ track: s.maint.track, type: 'maint', level: s.maint.level, score: draft.tests.maint.score });
      }
      if (s.kind !== 'exercise') continue;
      if (s.placement) {
        const p = draft.placement[s.track];
        if (p?.set) tests.push({ track: s.track, type: 'set', level: p.set });
        else {
          for (const t of p?.tries ?? []) {
            if (t.score != null) tests.push({ track: s.track, type: 'placement', level: t.level, score: t.score, marks: t.marks.join('') });
          }
        }
      } else if (s.test && draft.tests[s.track]?.score != null) {
        const t = draft.tests[s.track];
        tests.push({ track: s.track, type: 'test', level: s.level, score: t.score, marks: (t.marks ?? []).join('') });
      }
    }
    const serve = draft.tests.serve?.score != null ? { id: draft.session.block.serve.id, score: draft.tests.serve.score } : null;
    const seconds = Object.values(draft.timers).reduce((n, t) => n + t.acc + (t.since ? (Date.now() - t.since) / 1000 : 0), 0);
    // Se i timer non sono stati usati, vale la durata prevista.
    const minutes = seconds >= 600 ? Math.round(seconds / 60) : draft.session.minutes;

    app.saveEvent({
      kind: draft.slot,
      date: draft.date,
      planId: draft.planId,
      block: draft.session.block.id,
      minutes,
      tests,
      serve,
      focus: draft.focus,
      note: draft.note.trim(),
      feel: draft.feel
    });
    finished = true;
    clearLive(uid);
    ui.live = null;
    ui.toast('Sessione salvata nel diario');
  }

  const FEEL = ['Dura', 'Così così', 'Bene', 'Molto bene', 'Ottima'];
</script>

{#if draft}
  <div class="live" in:fly={{ y: 40, duration: 420, easing: cubicOut }} out:fade={{ duration: 180 }}>
    <header>
      <button class="icon-btn" onclick={leave} aria-label="Metti in pausa e chiudi"><X size={22} /></button>
      <div class="steps" role="tablist" aria-label="Fasi">
        {#each steps as s, i (s.id)}
          <button class:on={i === draft.step} class:past={i < draft.step} onclick={() => goTo(i)} aria-label={s.name} role="tab" aria-selected={i === draft.step}></button>
        {/each}
        <button class="end" class:on={closing} onclick={() => goTo(steps.length)} aria-label="Chiusura" role="tab" aria-selected={closing}>
          <Check size={11} strokeWidth={3} />
        </button>
      </div>
      <span class="tag">{draft.slot}</span>
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
              <h1 class="display">{step.name}</h1>
              {#if view.kind === 'exercise'}
                <p class="row g-12 muted">
                  <span>Livello {view.level} · {view.exercise.name}</span>
                  <Dots level={view.level} size={9} />
                </p>
              {/if}
            </div>

            <!-- Mantenimento: test nell'ultima settimana del mese -->
            {#if step.maint?.test}
              {@const t = draft.tests.maint ?? { marks: [], score: null }}
              <section class="card test">
                <p class="small"><span class="tag accent">Test · mantenimento</span> <span class="muted">{step.maint.exercise.test}</span></p>
                <TestPad
                  marks={t.marks}
                  score={t.score}
                  up={app.rules.up}
                  down={app.rules.down}
                  level={step.maint.level}
                  verdict={verdict(step.maint.track, step.maint.level, t.score)}
                  onchange={(v) => setTest('maint', v)}
                />
              </section>
            {/if}

            {#if step.kind === 'serve' && step.test}
              {@const t = draft.tests.serve ?? { marks: [], score: null }}
              <section class="card test">
                <p class="small"><span class="tag accent">Test</span> <span class="muted">{step.serve.test}</span></p>
                <TestPad marks={t.marks} score={t.score} up={app.rules.up} down={-1} onchange={(v) => setTest('serve', v)} />
              </section>
            {/if}

            {#if step.kind === 'exercise' && step.placement}
              {@const p = placementView(step.track)}
              <section class="card test">
                {#if p.done}
                  <div class="start">
                    <span class="big mono">L{p.level}</span>
                    <div class="grow">
                      <strong>Parti dal livello {p.level}</strong>
                      <p class="small muted">{levelOf(step.track, p.level).name}</p>
                    </div>
                    <button class="link" onclick={() => resetPlacement(step.track)}>Rifai</button>
                  </div>
                {:else}
                  <p class="small">
                    <span class="tag accent">Test di partenza · livello {p.current.level}</span>
                    <span class="muted">{levelOf(step.track, p.current.level).test}</span>
                  </p>
                  {#key p.current.level}
                    <div in:fly={{ y: 10, duration: 300 }}>
                      <TestPad
                        marks={p.current.marks}
                        score={p.current.score}
                        up={app.rules.up}
                        down={-1}
                        verdict={p.waiting ? { tone: 'up', text: 'Superato' } : null}
                        onchange={(v) => setTry(step.track, v)}
                      />
                    </div>
                  {/key}
                  {#if p.waiting}
                    <button class="btn primary" onclick={() => nextTry(step.track, p.level)}>
                      Prova il livello {p.level} <ArrowRight size={18} />
                    </button>
                  {:else}
                    <button class="link self" onclick={() => pickStart(step.track)}>So già il mio livello</button>
                  {/if}
                {/if}
              </section>
            {:else if step.kind === 'exercise' && step.test}
              {@const t = draft.tests[step.track] ?? { marks: [], score: null }}
              <section class="card test">
                <p class="small"><span class="tag accent">Test</span> <span class="muted">{step.exercise.test}</span></p>
                <TestPad
                  marks={t.marks}
                  score={t.score}
                  up={app.rules.up}
                  down={app.rules.down}
                  level={step.level}
                  verdict={verdict(step.track, step.level, t.score)}
                  onchange={(v) => setTest(step.track, v)}
                />
              </section>
            {/if}

            <StepBody step={view} partner={app.partner} big showTest={false} />
          {:else}
            <div class="head">
              <h1 class="display">Com’è andata?</h1>
            </div>

            {#if results.length}
              <section class="card flush list">
                {#each results as r (r.id)}
                  <div class="res" class:up={r.outcome === 'sali' || r.outcome === 'completato'}>
                    <div class="grow">
                      <strong>{r.name}</strong>
                      <p class="small muted">
                        {#if r.placement}
                          {r.start ? `Parti dal livello ${r.start}` : 'Test di partenza non fatto'}
                        {:else if r.score == null}
                          Test non fatto
                        {:else}
                          {r.text ?? 'Registrato'}
                        {/if}
                      </p>
                    </div>
                    {#if r.after}
                      <Dots level={r.after} completed={r.outcome === 'completato'} />
                    {:else if r.start}
                      <Dots level={r.start} />
                    {/if}
                    {#if r.score != null}
                      <span class="mono pts {r.tone ?? ''}">{r.score}</span>
                    {/if}
                  </div>
                {/each}
              </section>
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
        <button class="icon-btn back" onclick={() => goTo(draft.step - 1)} aria-label="Fase precedente"><ArrowLeft size={20} /></button>
      {/if}
      {#if closing}
        <button class="btn accent grow" onclick={finish}><Check size={18} strokeWidth={2.4} /> Salva nel diario</button>
      {:else if draft.step === steps.length - 1}
        <button class="btn primary grow" onclick={() => goTo(steps.length)}>Chiudi la sessione <ArrowRight size={18} /></button>
      {:else}
        <button class="btn primary grow" onclick={() => goTo(draft.step + 1)}>
          <span class="next">{steps[draft.step + 1].name}</span>
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
    grid-template-columns: 48px 1fr 48px;
    align-items: center;
    padding: calc(env(safe-area-inset-top) + 8px) 12px 8px;
  }
  header .tag {
    justify-self: end;
    margin-right: 6px;
    font-family: var(--mono);
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

  .test {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .test > p {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 8px;
  }
  .self {
    align-self: flex-start;
  }
  .start {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .big {
    font-size: 34px;
    font-weight: 560;
    color: var(--accent);
    animation: pop 0.5s var(--spring) both;
  }
  strong {
    font-weight: 580;
  }

  .res {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    animation: rise 0.5s var(--ease-out) both;
  }
  .res.up {
    background: var(--up-soft);
  }
  .pts {
    width: 30px;
    text-align: right;
    font-size: 20px;
    font-weight: 560;
  }
  .pts.up {
    color: var(--up);
  }
  .pts.down {
    color: var(--down);
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
