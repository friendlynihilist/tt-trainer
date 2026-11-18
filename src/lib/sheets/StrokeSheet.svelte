<script>
  // Un colpo: come lo senti (le tue note), cos'è, dove lo alleni e quante volte l'hai segnato da correggere.
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { FAMILIES, POINT_PHASE } from '../data/taxonomy.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { drillsFor, weaknesses } from '../engine/stats.js';
  import Sheet from '../ui/Sheet.svelte';
  import MedalRow from '../ui/MedalRow.svelte';
  import NoteRow from '../ui/NoteRow.svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import { notesOf, feelSummary, fmtFeel } from '../engine/notes.js';

  let { id } = $props();

  const stroke = $derived(app.stroke(id));
  const family = $derived(FAMILIES.find((f) => f.id === stroke?.family)?.name ?? 'I tuoi colpi');
  const drills = $derived(drillsFor(id, app.catalog, app.player.level));
  const stat = $derived(weaknesses(app.events).strokes.find((s) => s.id === id));
  const notes = $derived(notesOf(app.notes, id));
  const feel = $derived(feelSummary(app.notes, id));
  const FEEL = ['Dura', 'Così così', 'Bene', 'Molto bene', 'Ottima'];

  function remove() {
    app.removeCustom('strokes', id);
    ui.close();
  }
</script>

{#if stroke}
  <Sheet title={stroke.name} onclose={() => ui.close()} tall={notes.length > 0}>
    <div class="stack g-24">
      {#if feel}
        <div class="feel-now">
          <div><b class="mono">{feel.last}</b><span class="small muted">ultima, {FEEL[feel.last - 1].toLowerCase()}</span></div>
          <div><b class="mono">{fmtFeel(feel.avg)}</b><span class="small muted">{feel.count === 1 ? 'media di 1 nota' : `media delle ultime ${feel.count}`}</span></div>
        </div>
      {/if}

      <section class="stack g-8">
        <button class="btn primary" onclick={() => ui.open('note', { draft: { stroke: id } })}><Plus size={16} /> Aggiungi nota</button>
        {#if notes.length}
          <div class="card flush list">
            {#each notes as n (n.id)}<NoteRow note={n} onclick={() => ui.open('note', { id: n.id })} />{/each}
          </div>
        {/if}
      </section>

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
          <div class="card flush list">
            {#each drills as d (d)}
              <button class="item" onclick={() => ui.open('exercise', { id: d })}>
                <span class="grow">{exerciseLabel(d, app.catalog)}</span>
                <MedalRow exercise={app.catalog.exercise(d)} medals={app.medals[d]} />
              </button>
            {/each}
          </div>
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
  .feel-now {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .feel-now div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .feel-now b {
    font-size: 28px;
    font-weight: 500;
    line-height: 1.1;
  }
</style>
