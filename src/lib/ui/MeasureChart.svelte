<script>
  // Le misure di un esercizio, una barra per seduta (dalla più vecchia alla più recente), nel colore
  // della famiglia. Una linea tratteggiata segna la prossima medaglia, con il nome scritto.
  // Toccando una barra, sopra si legge la data e il valore; di partenza, l'ultima seduta.
  import { size, valueText } from '../engine/medals.js';
  import { TIER } from '../data/library.js';
  import { fmtShort } from '../util/dates.js';

  // rows: [{ date, value, tier }] dalla più recente; goal: { tier, goal } o null.
  let { exercise, rows = [], goal = null } = $props();

  const data = $derived([...rows].filter((r) => !r.tier).reverse());
  const target = $derived(goal && !goal.alt ? size(goal.goal) : null);
  const max = $derived(Math.max(1, target ?? 0, ...data.map((r) => size(r.value))) * 1.08);
  let pick = $state(null);
  const shown = $derived(pick ?? data[data.length - 1] ?? null);
</script>

{#if data.length}
  <div class="mc">
    <p class="read" aria-live="polite">
      {#if shown}<span class="when">{fmtShort(shown.date)}</span><b>{valueText(exercise, shown.value)}</b>{/if}
    </p>
    <div class="plot" role="group" aria-label="Misure per seduta">
      {#if target}
        <span class="goal" data-medal={goal.tier} style:bottom="{(target / max) * 100}%">
          <span class="goal-label">{TIER[goal.tier].name} · {valueText(exercise, goal.goal, goal.tier)}</span>
        </span>
      {/if}
      {#each data as r (r.date)}
        <button
          class="bar"
          class:on={shown === r}
          onclick={() => (pick = pick === r ? null : r)}
          aria-label="{fmtShort(r.date)}: {valueText(exercise, r.value)}"
          aria-pressed={shown === r}
        >
          <i style:height="{(size(r.value) / max) * 100}%"></i>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .mc {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 14px 12px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
  }
  .read {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 0;
    min-height: 22px;
    font-size: 15px;
  }
  .read b {
    font-weight: 700;
  }
  .when {
    font-size: 13px;
    color: var(--ink-3);
  }
  .plot {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 110px;
    border-bottom: 1px solid var(--line);
  }
  .bar {
    flex: 1;
    max-width: 40px;
    height: 100%;
    display: flex;
    align-items: flex-end;
    padding: 0 1px;
  }
  .bar i {
    width: 100%;
    min-height: 3px;
    border-radius: 4px 4px 0 0;
    background: color-mix(in srgb, var(--f) 55%, var(--sunk));
    transform-origin: bottom;
    animation: up 0.5s var(--ease-out) both;
    transition: background var(--dur) var(--ease);
  }
  .bar.on i {
    background: var(--f);
  }
  .goal {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 2px dashed var(--md);
    pointer-events: none;
  }
  .goal-label {
    position: absolute;
    right: 0;
    bottom: 3px;
    padding: 1px 6px;
    border-radius: 6px;
    background: var(--card);
    font-size: 12px;
    font-weight: 650;
    color: var(--ink-2);
  }
  @keyframes up {
    from {
      transform: scaleY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bar i {
      animation: none;
    }
  }
</style>
