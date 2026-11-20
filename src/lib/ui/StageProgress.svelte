<script>
  // A che punto sei di una tappa: un pallino per allenamento o una tacca numerata per settimana.
  // Pieno quello di adesso, tenui quelli passati. Con un allenamento solo non si disegna niente.
  let { unit = 'w', pos = 0, of = 1, small = false } = $props();
  const items = $derived(Array.from({ length: Math.min(of, 12) }, (_, i) => i + 1));
</script>

{#if of > 1 || unit === 'w'}
  <span class="prog" class:small class:dots={unit === 's'} role="img" aria-label={unit === 's' ? `Allenamento ${pos} di ${of}` : `Settimana ${pos} di ${of}`}>
    {#each items as n (n)}
      <i class:past={n < pos} class:now={n === pos}>{unit === 'w' && !small ? n : ''}</i>
    {/each}
  </span>
{/if}

<style>
  .prog {
    display: flex;
    gap: 4px;
  }
  .prog i {
    flex: 1;
    display: grid;
    place-items: center;
    max-width: 64px;
    height: 26px;
    border-radius: 8px;
    background: var(--sunk);
    font-family: var(--mono);
    font-size: 12px;
    font-style: normal;
    font-weight: 600;
    color: var(--ink-3);
  }
  .prog i.past {
    background: color-mix(in srgb, var(--accent) 30%, var(--sunk));
    color: var(--accent-ink);
  }
  .prog i.now {
    background: var(--accent);
    color: var(--accent-on);
    font-weight: 800;
    box-shadow:
      0 0 0 2px var(--paper),
      0 0 0 4px var(--ink);
  }
  /* Allenamenti: pallini tondi. */
  .dots i {
    flex: none;
    width: 26px;
    border-radius: 50%;
  }
  /* Nella scheda di Oggi: più sottili, senza numeri. */
  .small {
    gap: 3px;
  }
  .small i {
    height: 8px;
    max-width: 40px;
    border-radius: 4px;
  }
  .small i.now {
    box-shadow: none;
  }
  .small.dots i {
    width: 10px;
    height: 10px;
  }
</style>
