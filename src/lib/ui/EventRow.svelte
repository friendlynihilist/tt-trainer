<script>
  // Una voce del diario in elenco.
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { KIND } from '../data/taxonomy.js';
  import { TRACKS } from '../data/program.js';
  import { fmtShort, fmtDuration } from '../util/dates.js';

  let { event, showDate = true } = $props();

  const cycle = $derived(event.kind === 'A' || event.kind === 'B');
  const scores = $derived((event.tests ?? []).filter((t) => t.score != null && t.type !== 'placement'));
  const title = $derived(event.kind === 'livello' ? 'Livello impostato' : (KIND[event.kind]?.name ?? 'Attività'));
</script>

<button class="item" onclick={() => ui.open('event', { id: event.id })}>
  <span class="badge" class:cycle class:b={event.kind === 'B'}>{cycle ? event.kind : (KIND[event.kind]?.short ?? '·').slice(0, 1)}</span>
  <span class="grow stack">
    <span class="top">
      <strong>{title}</strong>
      {#if showDate}<span class="small muted"> · {fmtShort(event.date)}</span>{/if}
    </span>
    <span class="small muted line">
      {#if scores.length}
        {scores.map((t) => `${TRACKS[t.track].short} ${t.score}`).join(' · ')}
      {:else if event.minutes}
        {fmtDuration(event.minutes)}
      {/if}
      {#if event.focus?.stroke}
        {scores.length || event.minutes ? ' · ' : ''}da correggere: {app.strokeName(event.focus.stroke, true)}
      {/if}
    </span>
    {#if event.note}<span class="small note">{event.note}</span>{/if}
  </span>
</button>

<style>
  .item {
    align-items: flex-start;
  }
  .badge {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--sunk);
    color: var(--ink-2);
    font-size: 13px;
    font-weight: 600;
  }
  .badge.cycle {
    background: var(--ink);
    color: var(--paper);
    font-family: var(--mono);
  }
  .badge.b {
    background: var(--accent);
    color: #15171a;
  }
  strong {
    font-weight: 560;
  }
  .line:empty {
    display: none;
  }
  .note {
    margin-top: 2px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    color: var(--ink);
  }
</style>
