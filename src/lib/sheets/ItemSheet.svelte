<script>
  // Un appuntamento previsto, nel dettaglio: quando, quanto dura, i suoi fondamentali; e tutte le azioni.
  import Play from '@lucide/svelte/icons/play';
  import PencilLine from '@lucide/svelte/icons/pencil-line';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import Trash from '@lucide/svelte/icons/trash-2';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { KIND } from '../data/taxonomy.js';
  import { startItem, logItem, moveItem, removeItem, workoutOf } from '../store/actions.js';
  import { fmtLong } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import BrickStack from '../ui/BrickStack.svelte';

  let { item } = $props();

  const workout = $derived(item.kind === 'training' ? workoutOf(item.template, item.date) : null);
  const kind = $derived(workout?.name ?? KIND[item.kind]?.name ?? 'Attività');
  const today = $derived(item.date === app.today);
  const past = $derived(item.date < app.today);

  function run(fn) {
    ui.close();
    fn(item);
  }
</script>

<Sheet title={kind} onclose={() => ui.close()} sans>
  <dl class="facts">
    <div><dt>Quando</dt><dd class="cap">{fmtLong(item.date)}</dd></div>
    {#if workout?.minutes}<div><dt>Durata</dt><dd>{workout.minutes} min</dd></div>{/if}
    {#if past}<div><dt>Stato</dt><dd class="warn">Non registrato</dd></div>{/if}
  </dl>

  {#if workout?.bricks.length}<div class="bricks"><BrickStack bricks={workout.bricks} /></div>{/if}

  <div class="acts">
    {#if past || today}
      <button class="act" onclick={() => run(logItem)}><PencilLine size={20} /><span>Registra com’è andata</span></button>
    {/if}
    <button class="act" onclick={() => run(moveItem)}><CalendarClock size={20} /><span>Sposta a un altro giorno</span></button>
    <button class="act danger" onclick={() => run(removeItem)}><Trash size={20} /><span>Togli dal calendario</span></button>
  </div>

  {#snippet footer()}
    {#if today}
      <button class="btn accent wide" onclick={() => run(startItem)}><Play size={18} fill="currentColor" /> Inizia</button>
    {:else}
      <button class="btn ghost wide" onclick={() => ui.close()}>Chiudi</button>
    {/if}
  {/snippet}
</Sheet>

<style>
  .bricks {
    margin-bottom: 20px;
  }
  .facts {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0 0 20px;
  }
  .facts div {
    display: flex;
    gap: 12px;
  }
  dt {
    width: 72px;
    flex: none;
    font-size: 14px;
    color: var(--ink-3);
  }
  dd {
    margin: 0;
    font-weight: 600;
  }
  .cap::first-letter {
    text-transform: uppercase;
  }
  .warn {
    color: var(--down);
  }
  .acts {
    display: flex;
    flex-direction: column;
    border-radius: var(--r-card);
    background: var(--card);
    box-shadow: var(--shadow-card);
    overflow: hidden;
  }
  .act {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 52px;
    padding: 0 16px;
    text-align: left;
    font-weight: 600;
    color: var(--ink);
  }
  .act + .act {
    border-top: 1px solid var(--line);
  }
  .act :global(svg) {
    color: var(--ink-3);
  }
  .act.danger,
  .act.danger :global(svg) {
    color: var(--down);
  }
</style>
