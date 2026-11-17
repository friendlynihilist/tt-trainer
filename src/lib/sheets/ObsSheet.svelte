<script>
  // Una nota tecnica: è la riga del vecchio «Registro». Si compila solo ciò che serve.
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { BALLS, POINT_PHASES } from '../data/taxonomy.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { pickStroke, pickError, pickExercise } from '../ui/pickers.js';
  import Sheet from '../ui/Sheet.svelte';
  import Score from '../ui/Score.svelte';
  import TablePicker from '../ui/TablePicker.svelte';

  let { value = null, onsave, ondelete = null } = $props();

  let o = $state({ phase: null, stroke: null, ball: null, zone: null, error: null, exercise: null, score: null, note: '', ...(value ?? {}) });

  const empty = $derived(!o.stroke && !o.error && !o.ball && !o.zone && !o.phase && !o.exercise && o.score == null && !o.note.trim());

  function save() {
    ui.close();
    onsave?.({ ...$state.snapshot(o), note: o.note.trim() });
  }
  function remove() {
    ui.close();
    ondelete?.();
  }
  const toggle = (key, id) => (o[key] = o[key] === id ? null : id);
</script>

<Sheet title="Nota tecnica" onclose={() => ui.close()} tall>
  <div class="stack g-24">
    <div class="stack g-8">
      <button class="select" class:empty={!o.stroke} onclick={() => pickStroke({ value: o.stroke, onpick: (v) => (o.stroke = v) })}>
        <span class="grow">{o.stroke ? app.strokeName(o.stroke) : 'Colpo'}</span><ChevronDown size={18} />
      </button>
      <button class="select" class:empty={!o.error} onclick={() => pickError({ value: o.error, onpick: (v) => (o.error = v) })}>
        <span class="grow">{o.error ? app.errorName(o.error) : 'Errore'}</span><ChevronDown size={18} />
      </button>
    </div>

    <section class="stack g-8">
      <h3 class="heading">Fase del punto</h3>
      <div class="chips">
        {#each POINT_PHASES as p (p.id)}
          <button class="chip" aria-pressed={o.phase === p.id} onclick={() => toggle('phase', p.id)}>{p.name}</button>
        {/each}
      </div>
    </section>

    <section class="stack g-8">
      <h3 class="heading">Palla in arrivo</h3>
      <div class="chips">
        {#each BALLS as b (b.id)}
          <button class="chip" aria-pressed={o.ball === b.id} onclick={() => toggle('ball', b.id)}>{b.name}</button>
        {/each}
      </div>
    </section>

    <section class="stack g-8">
      <h3 class="heading">Dove arriva</h3>
      <TablePicker value={o.zone} lefty={app.settings.lefty} onchange={(z) => (o.zone = z)} />
    </section>

    <section class="stack g-8">
      <h3 class="heading">Risultato su 10</h3>
      <Score value={o.score} up={app.rules.up} down={-1} onchange={(n) => (o.score = n)} />
    </section>

    <button class="select" class:empty={!o.exercise} onclick={() => pickExercise({ value: o.exercise, onpick: (v) => (o.exercise = v) })}>
      <span class="grow">{o.exercise ? exerciseLabel(o.exercise, app.catalog) : 'Esercizio'}</span><ChevronDown size={18} />
    </button>

    <textarea class="field" placeholder="Nota" bind:value={o.note}></textarea>

    {#if ondelete}
      <button class="btn plain danger" onclick={remove}>Elimina la nota</button>
    {/if}
  </div>

  {#snippet footer()}
    <button class="btn primary wide" onclick={save} disabled={empty}>Fatto</button>
  {/snippet}
</Sheet>

<style>
  .select {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 48px;
    padding: 0 14px;
    border-radius: var(--r-s);
    border: 1px solid var(--line-strong);
    background: var(--card);
    font-size: 16px;
    text-align: left;
  }
  .select.empty {
    color: var(--ink-3);
  }
  .select :global(svg) {
    color: var(--ink-3);
  }
  .chip {
    font-size: 13px;
    min-height: 34px;
    padding: 5px 12px;
  }
</style>
