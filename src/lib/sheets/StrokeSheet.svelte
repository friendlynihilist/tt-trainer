<script>
  // Un colpo: cos'è, dove lo alleni e quante volte l'hai segnato da correggere.
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { FAMILIES, POINT_PHASE } from '../data/taxonomy.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { drillsFor, weaknesses } from '../engine/stats.js';
  import Sheet from '../ui/Sheet.svelte';

  let { id } = $props();

  const stroke = $derived(app.stroke(id));
  const family = $derived(FAMILIES.find((f) => f.id === stroke?.family)?.name ?? 'I tuoi colpi');
  const drills = $derived(drillsFor(id, app.tracks, app.catalog));
  const stat = $derived(weaknesses(app.events).strokes.find((s) => s.id === id));

  function remove() {
    app.removeCustom('strokes', id);
    ui.close();
  }
</script>

{#if stroke}
  <Sheet title={stroke.name} onclose={() => ui.close()}>
    <div class="stack g-24">
      <div class="stack g-12">
        <div class="chips">
          <span class="tag">{family}</span>
          {#if stroke.side}<span class="tag line">{stroke.side === 'D' ? 'Dritto' : 'Rovescio'}</span>{/if}
          {#each stroke.phases ?? [] as p (p)}<span class="tag line">{POINT_PHASE[p].name}</span>{/each}
        </div>
        {#if stroke.about}<p class="lead">{stroke.about}</p>{/if}
      </div>

      {#if drills.length}
        <section class="stack g-8">
          <h3 class="heading">Dove lo alleni</h3>
          {#each drills as d (d)}
            <p>{exerciseLabel(d, app.catalog)}</p>
          {/each}
        </section>
      {/if}

      <section class="stack g-8">
        <h3 class="heading">Nel tuo diario</h3>
        {#if stat}
          <p>Segnato da correggere <strong>{stat.count}</strong> {stat.count === 1 ? 'volta' : 'volte'}.</p>
          <div class="chips">
            {#each stat.errors as e (e.id)}
              <span class="tag down">{app.errorName(e.id)} · {e.count}</span>
            {/each}
          </div>
        {:else}
          <p class="muted">Mai segnato da correggere.</p>
        {/if}
      </section>

      {#if stroke.custom}
        <button class="btn plain danger" onclick={remove}>Elimina questo colpo</button>
      {/if}
    </div>
  </Sheet>
{/if}

<style>
  strong {
    font-weight: 600;
  }
</style>
