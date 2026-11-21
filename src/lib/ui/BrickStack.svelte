<script>
  // I fondamentali di un allenamento, uno sotto l'altro: il colore, il nome, gli esercizi e i minuti.
  // Più dura, più è alto. Solo da leggere: per cambiarli c'è il costruttore.
  import { app } from '../store/app.svelte.js';

  let { bricks = [] } = $props();
  const exName = (x) => app.catalog.exercise(x)?.name ?? '';
</script>

<div class="stack-b">
  {#each bricks as b (b.id)}
    <div class="b" data-fam={b.fam} style:min-height="{Math.max(52, (b.minutes ?? 0) * 3)}px">
      <span class="grow">
        <b>{b.name}</b>
        {#if b.exs?.length}<small>{b.exs.map(exName).filter(Boolean).join(', ')}</small>{/if}
      </span>
      {#if b.minutes}<span class="b-m">{b.minutes}′</span>{/if}
    </div>
  {/each}
</div>

<style>
  .stack-b {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .b {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px;
    border-radius: 16px;
    background: var(--f);
    color: var(--f-on);
    box-shadow: 0 4px 0 var(--f-edge);
  }
  .b b {
    display: block;
    font-weight: 750;
  }
  .b small {
    display: block;
    font-size: 13px;
    opacity: 0.9;
  }
  .b-m {
    flex: none;
    font-size: 20px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
</style>
