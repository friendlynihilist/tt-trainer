<script>
  // Il «+»: cosa vuoi aggiungere al diario.
  import Play from '@lucide/svelte/icons/play';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';
  import Target from '@lucide/svelte/icons/target';
  import Swords from '@lucide/svelte/icons/swords';
  import Trophy from '@lucide/svelte/icons/trophy';
  import Dumbbell from '@lucide/svelte/icons/dumbbell';
  import NotebookPen from '@lucide/svelte/icons/notebook-pen';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { nextSlot } from '../engine/plan.js';
  import { KIND } from '../data/taxonomy.js';
  import { fmtLong } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';

  let { date = null } = $props();

  const day = date ?? app.today;
  const training = $derived(app.phase === 'active' && app.week?.kind !== 'P');
  const slot = $derived(training ? (nextSlot(app.events, app.week) ?? 'A') : 'A');
  const OTHER = [
    { id: 'lezione', icon: GraduationCap },
    { id: 'servizi', icon: Target },
    { id: 'partite', icon: Swords },
    { id: 'torneo', icon: Trophy },
    { id: 'altro', icon: Dumbbell }
  ];

  function open(kind) {
    ui.close();
    ui.open('event', { draft: { kind, date: day } });
  }
  function live() {
    ui.close();
    ui.live = { slot, date: app.today, monday: app.week.monday };
  }
</script>

<Sheet title={day === app.today ? 'Aggiungi' : fmtLong(day)} onclose={() => ui.close()}>
  <div class="stack g-8">
    {#if training && day === app.today}
      <button class="opt hero" onclick={live}>
        <span class="ic"><Play size={18} fill="currentColor" /></span>
        <span class="grow"><strong>Inizia la sessione {slot}</strong><span class="small block">Timer, test e diario in un colpo</span></span>
      </button>
    {/if}
    {#if app.plan}
      <button class="opt" onclick={() => open(slot)}>
        <span class="ic"><NotebookPen size={18} /></span>
        <span class="grow"><strong>Registra una sessione del ciclo</strong><span class="small muted block">A o B, con i risultati dei test</span></span>
      </button>
    {/if}
    {#each OTHER as k (k.id)}
      {@const Icon = k.icon}
      <button class="opt" onclick={() => open(k.id)}>
        <span class="ic"><Icon size={18} /></span>
        <span class="grow"><strong>{KIND[k.id].name}</strong></span>
      </button>
    {/each}
  </div>
</Sheet>

<style>
  .opt {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 12px 14px;
    border-radius: var(--r);
    background: var(--card);
    border: 1px solid var(--line);
    text-align: left;
    transition: transform 0.2s var(--ease), background 0.2s var(--ease);
  }
  .opt:active {
    transform: scale(0.985);
  }
  .opt.hero {
    background: var(--accent);
    border-color: transparent;
    color: #15171a;
  }
  .ic {
    display: grid;
    place-items: center;
    flex: none;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--sunk);
    color: var(--ink-2);
  }
  .hero .ic {
    background: rgba(21, 23, 26, 0.12);
    color: #15171a;
  }
  strong {
    font-weight: 560;
  }
  .block {
    display: block;
  }
</style>
