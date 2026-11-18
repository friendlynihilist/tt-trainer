<script>
  // I gradini di un esercizio, in fila: quelli presi pieni, la metà oro mezza, gli altri vuoti.
  import { TIERS } from '../data/library.js';
  import Medal from './Medal.svelte';

  let { exercise, medals = null, size = 10 } = $props();
  const tiers = $derived(TIERS.filter((t) => exercise?.goals?.[t] != null));
</script>

{#if tiers.length}
  <span class="row" role="img" aria-label="Medaglie: {tiers.filter((t) => medals?.[t]).length} su {tiers.length}">
    {#each tiers as t (t)}
      <Medal tier={t} on={Boolean(medals?.[t])} half={t === 'O' && !medals?.O && Boolean(medals?.half)} {size} label={false} />
    {/each}
  </span>
{/if}

<style>
  .row {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    flex: none;
  }
</style>
