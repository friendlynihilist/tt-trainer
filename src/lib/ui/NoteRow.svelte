<script>
  // Una nota sul colpo in elenco: data, sensazione, testo, e (se serve) colpo ed esercizio.
  import { app } from '../store/app.svelte.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { fmtShort } from '../util/dates.js';

  let { note, showStroke = false, onclick } = $props();

  const sub = $derived([showStroke ? app.strokeName(note.stroke) : null, note.ex ? exerciseLabel(note.ex, app.catalog) : null].filter(Boolean).join(' · '));
</script>

<button class="item note" {onclick}>
  <span class="grow stack">
    <span class="top">
      <span class="small muted">{fmtShort(note.date)}</span>
      {#if note.feel}
        <span class="bars" role="img" aria-label="Sensazione {note.feel} su 5">
          {#each [1, 2, 3, 4, 5] as i (i)}<i class:on={i <= note.feel}></i>{/each}
        </span>
      {/if}
    </span>
    {#if note.text}<span class="text">{note.text}</span>{/if}
    {#if sub}<span class="small muted">{sub}</span>{/if}
  </span>
</button>

<style>
  .note {
    align-items: flex-start;
    padding: 12px 16px;
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .bars {
    display: inline-flex;
    gap: 2px;
  }
  .bars i {
    width: 10px;
    height: 6px;
    border-radius: 2px;
    background: var(--sunk);
  }
  .bars i.on {
    background: var(--ink);
  }
  .text {
    font-size: 15px;
    white-space: pre-line;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
