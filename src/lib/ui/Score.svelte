<script>
  // Punteggio di un test, da 0 a 10. Un tocco sceglie, un secondo tocco toglie.
  import { buzz } from '../store/ui.svelte.js';

  let { value = null, onchange, up = 8, down = 4, level = 1 } = $props();

  const tone = $derived(value == null ? '' : value >= up ? 'up' : value <= down && level > 1 ? 'down' : '');

  function pick(n) {
    buzz();
    onchange?.(value === n ? null : n);
  }
</script>

<div class="score {tone}" role="radiogroup" aria-label="Punteggio su 10">
  {#each Array(11) as _, n (n)}
    <button
      type="button"
      role="radio"
      aria-checked={value === n}
      class:on={value === n}
      class:under={value != null && n < value}
      onclick={() => pick(n)}
    >
      {n}
    </button>
  {/each}
</div>

<style>
  .score {
    --c: var(--ink);
    display: grid;
    grid-template-columns: repeat(11, 1fr);
    gap: 2px;
    padding: 3px;
    border-radius: 12px;
    background: var(--sunk);
  }
  .score.up { --c: var(--up); }
  .score.down { --c: var(--down); }
  button {
    height: 36px;
    border-radius: 9px;
    font-family: var(--mono);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--ink-3);
    transition:
      background 0.2s var(--ease),
      color 0.2s var(--ease),
      transform 0.35s var(--spring);
  }
  button.under {
    color: var(--ink);
  }
  button.on {
    background: var(--c);
    color: var(--paper);
    font-weight: 600;
    transform: scale(1.06);
  }
  button:active {
    transform: scale(0.9);
  }
</style>
