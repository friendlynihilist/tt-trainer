<script>
  // Un appuntamento previsto, nel dettaglio: quando, il modello, su cosa lavori; e tutte le azioni.
  import Play from '@lucide/svelte/icons/play';
  import PencilLine from '@lucide/svelte/icons/pencil-line';
  import CalendarClock from '@lucide/svelte/icons/calendar-clock';
  import Trash from '@lucide/svelte/icons/trash-2';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { KIND } from '../data/taxonomy.js';
  import { templateMinutes } from '../data/templates.js';
  import { startItem, logItem, moveItem, removeItem } from '../store/actions.js';
  import { fmtLong } from '../util/dates.js';
  import { stageInfo, stagePeriod } from '../engine/plan.js';
  import Sheet from '../ui/Sheet.svelte';

  let { item } = $props();

  const kind = $derived(KIND[item.kind]?.name ?? 'Attività');
  const template = $derived(item.kind === 'training' ? app.catalog.template(item.template) : null);
  const theme = $derived(item.week?.focusBlock && (item.kind === 'training' || item.kind === 'test') ? item.week.focusBlock.theme : '');
  const today = $derived(item.date === app.today);
  // Il nome della tappa di quel giorno secondo la sua durata: «Mese», «Settimana», «Allenamento».
  const noun = $derived.by(() => {
    if (!app.plan) return 'Mese';
    const info = stageInfo(app.plan, item.date, app.catalog);
    return stagePeriod(info.stages[info.current]).noun || 'Mese';
  });
  const past = $derived(item.date < app.today);

  function run(fn) {
    ui.close();
    fn(item);
  }
</script>

<Sheet title={kind} onclose={() => ui.close()} sans>
  <dl class="facts">
    <div><dt>Quando</dt><dd class="cap">{fmtLong(item.date)}</dd></div>
    {#if template}<div><dt>Modello</dt><dd>{template.name} · {templateMinutes(template)} min</dd></div>{/if}
    {#if theme}<div><dt>{noun}</dt><dd>{theme}</dd></div>{/if}
    {#if past}<div><dt>Stato</dt><dd class="warn">Non registrato</dd></div>{/if}
  </dl>

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
    border: 1px solid var(--line);
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
