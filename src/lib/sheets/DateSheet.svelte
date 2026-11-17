<script>
  // Scelta di una data: i prossimi giorni a portata di pollice, il calendario per il resto.
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { addDays, fmtLong, fmtShort } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';

  let { title = 'Data', value = null, onpick } = $props();

  let date = $state(value ?? app.today);
  const quick = $derived(Array.from({ length: 8 }, (_, i) => addDays(app.today, i)));

  function done(d = date) {
    ui.close();
    onpick?.(d);
  }
</script>

<Sheet {title} onclose={() => ui.close()}>
  <div class="stack g-16">
    <div class="chips">
      {#each quick as d, i (d)}
        <button class="chip" aria-pressed={d === date} onclick={() => (date = d)}>{i === 0 ? 'Oggi' : i === 1 ? 'Domani' : fmtShort(d)}</button>
      {/each}
    </div>
    <input class="field" type="date" bind:value={date} aria-label="Data" />
    {#if date}<p class="small muted cap">{fmtLong(date)}</p>{/if}
  </div>
  {#snippet footer()}
    <button class="btn primary wide" disabled={!date} onclick={() => done()}>Conferma</button>
  {/snippet}
</Sheet>

<style>
  .cap::first-letter {
    text-transform: uppercase;
  }
</style>
