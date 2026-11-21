<script>
  // Un appuntamento previsto e non ancora fatto. In vista solo l'azione che serve adesso: Inizia se
  // è oggi, Registra se è passato. Toccando la riga si apre il foglio con tutte le azioni.
  // Come nelle voci fatte: il nome in grassetto (per un allenamento, quello che contiene), la data a
  // destra; sotto la durata con la sua icona.
  import Play from '@lucide/svelte/icons/play';
  import Timer from '@lucide/svelte/icons/timer';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { KIND } from '../data/taxonomy.js';
  import { startItem, logItem, workoutOf } from '../store/actions.js';
  import { fmtShort } from '../util/dates.js';

  let { item, showDate = false } = $props();

  const color = $derived(KIND[item.kind]?.color ?? 'slate');
  // Un allenamento si chiama per quello che contiene; la durata sta sotto.
  const workout = $derived(item.kind === 'training' ? workoutOf(item.template, item.date) : null);
  const kind = $derived(workout?.name ?? KIND[item.kind]?.short ?? 'Attività');
  const minutes = $derived(workout?.minutes || null);
  const past = $derived(item.date < app.today);
  const today = $derived(item.date === app.today);
</script>

<div class="planned" class:past data-color={color}>
  <button class="main" onclick={() => ui.open('item', { item })}>
    <span class="ring" aria-hidden="true"></span>
    <span class="grow">
      <span class="top">
        <strong>{kind}</strong>
        {#if showDate}<span class="date">{fmtShort(item.date)}</span>{/if}
      </span>
      {#if minutes || past}
        <span class="meta">
          {#if minutes}<span><Timer size={14} />{minutes} min</span>{/if}
          {#if past}<span class="warn">Non registrato</span>{/if}
        </span>
      {/if}
    </span>
  </button>
  {#if today}
    <button class="btn accent small go" onclick={() => startItem(item)}><Play size={14} fill="currentColor" /> Inizia</button>
  {:else if past}
    <button class="btn ghost small go" onclick={() => logItem(item)}>Registra</button>
  {/if}
</div>

<style>
  .planned {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 14px;
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 0 14px 16px;
    text-align: left;
    color: var(--ink);
  }
  .ring {
    flex: none;
    width: 14px;
    height: 14px;
    margin-top: 4px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2.5px var(--c);
  }
  .past .ring {
    opacity: 0.45;
  }
  .top {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }
  strong {
    font-weight: 650;
  }
  .past strong {
    color: var(--ink-2);
  }
  .model {
    font-size: 14px;
    color: var(--ink-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .date {
    margin-left: auto;
    flex: none;
    font-size: 13px;
    color: var(--ink-3);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
    margin-top: 6px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .meta :global(svg) {
    color: var(--ink-3);
  }
  .theme {
    height: 22px;
    padding: 0 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 14%, var(--card));
    color: var(--accent-ink);
    font-weight: 650;
  }
  .warn {
    color: var(--down);
    font-weight: 600;
  }
  .go {
    flex: none;
  }
</style>
