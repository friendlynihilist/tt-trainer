<script>
  // Un percorso: la sequenza dei suoi esercizi, con le medaglie di ognuno. L'app propone il primo
  // senza argento, ma ognuno si può fare quando vuoi. In fondo i test fatti con le versioni di prima.
  import Pencil from '@lucide/svelte/icons/pencil';
  import Copy from '@lucide/svelte/icons/copy';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { currentInSequence } from '../engine/player.js';
  import { legacyTests } from '../engine/stats.js';
  import { PLAYER_LEVEL } from '../data/library.js';
  import { fmtDay } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import MedalRing from '../ui/MedalRing.svelte';

  let { id } = $props();

  const track = $derived(app.catalog.track(id));
  const sequence = $derived(app.catalog.sequence(id));
  const current = $derived(currentInSequence(id, app.catalog, app.medals));
  const old = $derived(legacyTests(app.events, app.catalog).find((x) => x.track === id)?.tests ?? []);

  function variant() {
    ui.open('trackedit', { draft: { name: `${track.name} (variante)`, short: track.short, side: track.side, strokes: track.strokes, sequence } });
  }
</script>

{#if track}
  <Sheet title={track.short} onclose={() => ui.close()} tall>
    <div class="stack g-24">
      <p class="muted">{track.name}</p>

      <section class="stack g-8">
        <h3 class="heading">Esercizi in ordine</h3>
        <ol class="card flush list seq">
          {#each sequence as exId, i (exId + i)}
            {@const ex = app.catalog.exercise(exId)}
            <li>
              <button class="item" class:now={exId === current} onclick={() => ui.open('exercise', { id: exId })}>
                <span class="n mono">{i + 1}</span>
                <span class="grow">
                  <strong>{ex.name}</strong>
                  <span class="small muted block">{exId === current ? 'Proposto ora' : (PLAYER_LEVEL[ex.level]?.name ?? 'Tuo')}</span>
                </span>
                <MedalRing exercise={ex} medals={app.medals[exId]} size={34} />
                <ChevronRight size={16} />
              </button>
            </li>
          {/each}
        </ol>
        <p class="small faint">L’app propone il primo esercizio senza argento. Puoi fare qualsiasi altro esercizio, in qualsiasi momento.</p>
      </section>

      {#if old.length}
        <details class="old">
          <summary class="heading">Test della versione 0.2 · {old.length}</summary>
          <div class="card flush list">
            {#each [...old].reverse() as t, i (t.eventId + i)}
              <button class="item" onclick={() => ui.open('event', { id: t.eventId })}>
                <span class="small muted when">{fmtDay(t.date)}</span>
                <span class="grow">Livello {t.level}{t.type === 'maint' ? ' · mantenimento' : t.type === 'placement' ? ' · partenza' : ''}</span>
                <span class="mono">{t.score}/10</span>
              </button>
            {/each}
          </div>
        </details>
      {/if}

      <div class="stack g-8">
        {#if track.custom}
          <button class="btn plain" onclick={() => ui.open('trackedit', { id })}><Pencil size={16} /> Modifica il percorso</button>
        {:else}
          <button class="btn plain" onclick={variant}><Copy size={16} /> Crea una variante tua</button>
        {/if}
      </div>
    </div>
  </Sheet>
{/if}

<style>
  .seq {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .item {
    padding: 12px 14px;
  }
  .item.now {
    background: color-mix(in srgb, var(--accent) 12%, var(--card));
  }
  .item :global(svg) {
    color: var(--ink-3);
    flex: none;
  }
  .n {
    display: grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--line-strong);
    color: var(--ink-2);
    font-size: 13px;
    font-weight: 560;
  }
  .now .n {
    background: var(--accent);
    color: #15171a;
    box-shadow: none;
  }
  strong {
    font-weight: 580;
  }
  .block {
    display: block;
  }
  .when {
    width: 52px;
  }
  .old summary {
    cursor: pointer;
    margin-bottom: 8px;
  }
</style>
