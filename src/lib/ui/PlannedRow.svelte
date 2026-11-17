<script>
  // Un appuntamento previsto e non ancora fatto: inizia, registra, sposta, togli.
  import Play from '@lucide/svelte/icons/play';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import X from '@lucide/svelte/icons/x';
  import { app } from '../store/app.svelte.js';
  import { itemColor, itemTitle } from '../engine/events.js';
  import { templateMinutes } from '../data/templates.js';
  import { startItem, logItem, moveItem, removeItem } from '../store/actions.js';
  import { fmtShort } from '../util/dates.js';

  let { item, showDate = false } = $props();

  const color = $derived(itemColor(item, app.catalog));
  const title = $derived(itemTitle(item, app.catalog));
  const past = $derived(item.date < app.today);
  const today = $derived(item.date === app.today);
  const sub = $derived.by(() => {
    const parts = [];
    if (showDate) parts.push(fmtShort(item.date));
    if (item.kind === 'training') parts.push(`${templateMinutes(app.catalog.template(item.template))} min`);
    if (item.week?.focusBlock && (item.kind === 'training' || item.kind === 'test')) parts.push(item.week.focusBlock.theme);
    if (item.source === 'event') parts.push('aggiunto a mano');
    if (past) parts.push('non registrato');
    return parts.join(' · ');
  });
</script>

<div class="item row-planned" class:past data-color={color}>
  <span class="ring"></span>
  <span class="grow">
    <strong>{title}</strong>
    {#if sub}<span class="small muted block">{sub}</span>{/if}
  </span>
  {#if today}
    <button class="btn accent small" onclick={() => startItem(item)}><Play size={14} fill="currentColor" /> Inizia</button>
  {/if}
  {#if past || today}
    <button class="btn ghost small" onclick={() => logItem(item)}>Registra</button>
  {/if}
  <button class="icon-btn" onclick={() => moveItem(item)} aria-label="Sposta" title="Sposta"><CalendarClock size={17} /></button>
  <button class="icon-btn" onclick={() => removeItem(item)} aria-label="Togli" title="Togli"><X size={17} /></button>
</div>

<style>
  .row-planned {
    padding: 10px 6px 10px 16px;
    gap: 8px;
  }
  .ring {
    flex: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px var(--c);
    margin-right: 4px;
  }
  .past .ring {
    opacity: 0.45;
  }
  .past strong {
    color: var(--ink-2);
  }
  strong {
    font-weight: 560;
  }
  .block {
    display: block;
  }
  .icon-btn {
    width: 34px;
    height: 34px;
    flex: none;
  }
  @media (max-width: 380px) {
    .btn.ghost {
      display: none;
    }
  }
</style>
