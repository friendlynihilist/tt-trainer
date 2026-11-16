<script>
  // Un percorso: i cinque livelli, dove sei, e la storia dei test.
  import Target from '@lucide/svelte/icons/target';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { TRACKS, LEVELS } from '../data/program.js';
  import { OUTCOME, testsToClimb } from '../engine/levels.js';
  import { fmtDay } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import TestBars from '../ui/TestBars.svelte';

  let { id } = $props();

  const track = TRACKS[id];
  const state = $derived(app.tracks[id]);
  const recent = $derived([...state.history].reverse().slice(0, 8));

  function setLevel() {
    ui.open('pick', {
      title: 'Imposta il livello',
      value: state.started ? state.level : null,
      groups: [{ options: track.levels.map((l) => ({ id: l.n, label: `Livello ${l.n}`, hint: l.name })) }],
      onpick: (level) => {
        app.setLevel(id, level);
        ui.toast(`${track.short}: livello ${level}`);
      }
    });
  }
</script>

<Sheet title={track.short} onclose={() => ui.close()} tall>
  <div class="stack g-24">
    <div class="stack g-8">
      <p class="muted">{track.name}</p>
      {#if state.started}
        <p>
          {#if state.completed}
            <span class="tag up">Completato</span>
          {:else}
            <span class="tag accent">Livello {state.level} di {LEVELS}</span>
            <span class="small muted">
              {testsToClimb(state) === 1 ? `ancora un test da ${app.rules.up} per salire` : `due test di fila da ${app.rules.up} per salire`}
            </span>
          {/if}
        </p>
      {:else}
        <p><span class="tag">Da iniziare</span> <span class="small muted">lo stabilisce il test di partenza</span></p>
      {/if}
    </div>

    {#if state.history.some((h) => h.score != null)}
      <TestBars history={state.history} up={app.rules.up} down={app.rules.down} height={72} />
    {/if}

    <ol class="ladder">
      {#each [...track.levels].reverse() as l (l.n)}
        <li class:now={state.started && l.n === state.level && !state.completed} class:past={state.started && (l.n < state.level || state.completed)}>
          <span class="n mono">{l.n}</span>
          <div class="stack g-4">
            <strong>{l.name}</strong>
            <p class="small muted">{l.drill}</p>
            <p class="small goal"><Target size={13} /> {l.goal}</p>
            <p class="small faint">Test · {l.test}</p>
          </div>
        </li>
      {/each}
    </ol>

    {#if recent.length}
      <section class="stack g-8">
        <h3 class="heading">Storia</h3>
        <div class="card flush list">
          {#each recent as h (h.eventId + h.type + h.level)}
            <button class="item" onclick={() => ui.open('event', { id: h.eventId })}>
              <span class="small muted when">{fmtDay(h.date)}</span>
              <span class="grow">L{h.level}{h.type === 'maint' ? ' · mantenimento' : h.type === 'placement' ? ' · partenza' : ''}</span>
              {#if h.score != null}<span class="mono">{h.score}</span>{/if}
              <span class="tag {OUTCOME[h.outcome].tone}">{OUTCOME[h.outcome].label}</span>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    <button class="btn ghost" onclick={setLevel}>Imposta il livello a mano</button>
  </div>
</Sheet>

<style>
  .ladder {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ladder li {
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 12px;
    padding: 14px;
    border-radius: var(--r);
    border: 1px solid var(--line);
    transition: background 0.3s var(--ease);
  }
  .n {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--line-strong);
    color: var(--ink-2);
    font-weight: 560;
  }
  .past .n {
    background: var(--ink);
    color: var(--paper);
    box-shadow: none;
  }
  .now {
    background: var(--card);
    border-color: var(--accent);
  }
  .now .n {
    background: var(--accent);
    color: #15171a;
    box-shadow: none;
  }
  strong {
    font-weight: 580;
  }
  .goal {
    display: flex;
    gap: 6px;
    align-items: flex-start;
  }
  .goal :global(svg) {
    flex: none;
    margin-top: 3px;
    color: var(--accent);
  }
  .when {
    width: 52px;
  }
  .item {
    padding: 12px 16px;
    font-size: 14px;
  }
</style>
