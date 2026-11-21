<script>
  // Una voce del diario in elenco. Ogni informazione ha il suo posto e il suo stile, così cose
  // diverse non si confondono: il nome in grassetto, la data a destra; durata,
  // compagno e cosa correggere con la loro icona; i risultati come chip («Pendolo laterale 8/10»).
  import Timer from '@lucide/svelte/icons/timer';
  import UsersIcon from '@lucide/svelte/icons/users';
  import Crosshair from '@lucide/svelte/icons/crosshair';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { KIND } from '../data/taxonomy.js';
  import { eventName } from '../data/bricks.js';
  import { attemptsOf } from '../engine/attempts.js';
  import { shortValue, size } from '../engine/medals.js';
  import { TRIES_PER_DAY } from '../data/library.js';
  import { fmtShort, fmtDuration } from '../util/dates.js';

  let { event, showDate = true } = $props();

  // Le misure della voce, anche quelle delle versioni di prima: «Apertura di dritto 8/10».
  const scores = $derived(
    attemptsOf(event, app.catalog)
      .map((a) => {
        const ex = app.catalog.exercise(a.ex);
        const best = a.tries.slice(0, TRIES_PER_DAY[a.fmt] ?? 1).reduce((b, v) => (size(v) > size(b) ? v : b), a.tries[0]);
        return ex ? { name: ex.name, value: shortValue(ex, best) } : null;
      })
      .filter(Boolean)
  );
  const color = $derived(KIND[event.kind]?.color ?? 'slate');
  // Un allenamento si chiama per quello che contiene («Dritto e servizio»); il resto con il suo tipo.
  const kind = $derived(event.kind === 'livello' ? 'Livello' : event.kind === 'training' ? eventName(event, app.catalog) : (KIND[event.kind]?.short ?? 'Attività'));
  const minutes = $derived(event.minutes && event.kind !== 'test' ? fmtDuration(event.minutes) : '');
</script>

<button class="item" onclick={() => ui.open(event.kind === 'livello' ? 'event' : 'done', { id: event.id })}>
  <span class="dot" data-color={color} aria-hidden="true"></span>
  <span class="grow stack">
    <span class="top">
      <strong>{kind}</strong>
      {#if showDate}<span class="date">{fmtShort(event.date)}</span>{/if}
    </span>
    {#if minutes || event.partner?.name || event.focus?.stroke}
      <span class="meta">
        {#if minutes}<span><Timer size={14} />{minutes}</span>{/if}
        {#if event.partner?.name}<span><UsersIcon size={14} />{event.partner.name}</span>{/if}
        {#if event.focus?.stroke}<span class="fix"><Crosshair size={14} />{app.strokeName(event.focus.stroke, true)}</span>{/if}
      </span>
    {/if}
    {#if scores.length}
      <span class="chips">
        {#each scores as sc, i (i)}<span class="res"><span class="nm">{sc.name}</span><b class="t-num">{sc.value}</b></span>{/each}
      </span>
    {/if}
    {#if event.note}<span class="small note">{event.note}</span>{/if}
  </span>
</button>

<style>
  .item {
    align-items: flex-start;
  }
  .dot {
    flex: none;
    width: 14px;
    height: 14px;
    margin-top: 4px;
    border-radius: 50%;
    background: var(--c);
  }
  .top {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
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
    gap: 4px 14px;
    margin-top: 4px;
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
  .fix :global(svg) {
    color: var(--down);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }
  .res {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: var(--sunk);
    font-size: 13px;
  }
  .nm {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    color: var(--ink-2);
  }
  .res b {
    flex: none;
    font-weight: 700;
  }
  strong {
    font-weight: 650;
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
