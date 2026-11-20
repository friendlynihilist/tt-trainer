<script module>
  /** I cinque gradi della sensazione, da 1 a 5. */
  export const FEEL = ['Dura', 'Così così', 'Bene', 'Molto bene', 'Ottima'];
</script>

<script>
  // La sensazione, da 1 a 5: cinque barre che crescono, ognuna con il suo nome sotto, così si capisce
  // cosa si sceglie prima di toccare. Toccando di nuovo la barra scelta, la scelta si toglie.
  // È la stessa nella chiusura della sessione, nella voce del diario e nella nota sul colpo.
  import { buzz } from '../store/ui.svelte.js';

  let { value = null, onchange } = $props();

  function pick(n) {
    buzz();
    onchange?.(value === n ? null : n);
  }
</script>

<div class="feel" role="radiogroup" aria-label="Sensazione">
  {#each FEEL as label, i (label)}
    <button role="radio" aria-checked={value === i + 1} class:on={value != null && i + 1 <= value} class:sel={value === i + 1} onclick={() => pick(i + 1)}>
      <span class="box"><i style:height="{30 + i * 16}%"></i></span>
      <span class="name">{label}</span>
    </button>
  {/each}
</div>

<style>
  .feel {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }
  button {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    color: var(--ink-2);
  }
  .box {
    display: flex;
    align-items: flex-end;
    height: 52px;
    padding: 7px;
    border-radius: 14px;
    background: var(--sunk);
    transition: transform var(--dur) var(--spring);
  }
  button:active .box {
    transform: scale(0.92);
  }
  i {
    width: 100%;
    border-radius: 6px;
    background: var(--line-strong);
    transition: background var(--dur) var(--ease);
  }
  .on i {
    background: var(--accent);
  }
  .name {
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
  }
  .sel .name {
    font-weight: 750;
    color: var(--ink);
  }
</style>
