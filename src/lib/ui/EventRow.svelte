<script>
  // Una voce del diario in elenco, con il colore del suo tipo.
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { eventColor, eventTitle, realTests } from '../engine/events.js';
  import { fmtShort, fmtDuration } from '../util/dates.js';

  let { event, showDate = true } = $props();

  const scores = $derived(realTests(event).filter((t) => t.score != null && t.type !== 'placement'));
  const title = $derived(eventTitle(event, app.catalog));
  const color = $derived(event.kind === 'livello' ? 'slate' : eventColor(event, app.catalog));
  const initial = $derived(event.kind === 'test' ? 'T' : event.kind === 'livello' ? 'L' : (title[0] ?? '·').toUpperCase());
</script>

<button class="item" onclick={() => ui.open('event', { id: event.id })}>
  <span class="badge" data-color={color}>{initial}</span>
  <span class="grow stack">
    <span class="top">
      <strong>{title}</strong>
      {#if showDate}<span class="small muted"> · {fmtShort(event.date)}</span>{/if}
    </span>
    <span class="small muted line">
      {#if scores.length}
        {scores.map((t) => `${app.catalog.track(t.track)?.short ?? 'Percorso'} ${t.score}`).join(' · ')}
      {:else if event.minutes && event.kind !== 'test'}
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
    background: color-mix(in srgb, var(--c) 16%, var(--card));
    color: var(--c);
    box-shadow: inset 0 0 0 1.5px var(--c);
    font-size: 13px;
    font-weight: 650;
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
