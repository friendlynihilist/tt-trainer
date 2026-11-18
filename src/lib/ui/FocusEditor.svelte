<script>
  // «Da correggere»: un colpo, l'errore più frequente e l'esercizio per lavorarci.
  // Scelto il colpo, viene proposto un esercizio che lo allena (prima quelli del tuo livello).
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { app } from '../store/app.svelte.js';
  import { buzz } from '../store/ui.svelte.js';
  import { ERROR_GROUPS } from '../data/taxonomy.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { drillsFor } from '../engine/stats.js';
  import { pickStroke, pickExercise, pickError } from './pickers.js';

  let { value = null, onchange } = $props();

  const v = $derived(value ?? {});
  const suggestions = $derived(v.stroke ? drillsFor(v.stroke, app.catalog, app.player.level) : []);
  const customErrors = $derived(app.errors.filter((e) => e.custom));

  function set(patch) {
    const next = { ...v, ...patch };
    onchange?.(next.stroke || next.error || next.exercise ? next : null);
  }

  function chooseStroke() {
    pickStroke({
      value: v.stroke,
      onpick: (stroke) => {
        if (!stroke) return onchange?.(null);
        // Cambiando colpo l'esercizio suggerito segue, a meno che non sia stato scelto a mano.
        const auto = !v.exercise || suggestions.includes(v.exercise);
        set({ stroke, exercise: auto ? (drillsFor(stroke, app.catalog, app.player.level)[0] ?? null) : v.exercise });
      }
    });
  }

  function toggleError(id) {
    buzz();
    set({ error: v.error === id ? null : id });
  }
</script>

<div class="stack g-16">
  <button class="select" class:empty={!v.stroke} onclick={chooseStroke}>
    <span class="grow">{v.stroke ? app.strokeName(v.stroke) : 'Scegli il colpo'}</span>
    <ChevronDown size={18} />
  </button>

  {#if v.stroke}
    <div class="stack g-8">
      {#each ERROR_GROUPS as g (g.id)}
        <div class="chips">
          {#each app.errors.filter((e) => e.group === g.id) as e (e.id)}
            <button class="chip" aria-pressed={v.error === e.id} onclick={() => toggleError(e.id)}>{e.name}</button>
          {/each}
        </div>
      {/each}
      <div class="chips">
        {#each customErrors as e (e.id)}
          <button class="chip" aria-pressed={v.error === e.id} onclick={() => toggleError(e.id)}>{e.name}</button>
        {/each}
        <button class="chip more" onclick={() => pickError({ value: v.error, onpick: (error) => set({ error }) })}>Altro…</button>
      </div>
    </div>

    <div class="stack g-8">
      <span class="small muted">Esercizio per lavorarci</span>
      <div class="chips">
        {#each suggestions as id (id)}
          <button class="chip" aria-pressed={v.exercise === id} onclick={() => set({ exercise: v.exercise === id ? null : id })}>
            {exerciseLabel(id, app.catalog)}
          </button>
        {/each}
        {#if v.exercise && !suggestions.includes(v.exercise)}
          <button class="chip on" onclick={() => set({ exercise: null })}>{exerciseLabel(v.exercise, app.catalog)}</button>
        {/if}
        <button class="chip more" onclick={() => pickExercise({ value: v.exercise, other: true, onpick: (exercise) => set({ exercise }) })}>Altro…</button>
      </div>
    </div>
  {/if}
</div>

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
  .chip.more {
    color: var(--ink-2);
    box-shadow: inset 0 0 0 1px var(--line);
  }
</style>
