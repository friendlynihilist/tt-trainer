<script>
  // Il piano: giorni di allenamento, inizio, e le settimane una per una (con le pause).
  import Coffee from '@lucide/svelte/icons/coffee';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { createPlan, allWeeks, insertWeek, removeWeek } from '../engine/plan.js';
  import { addDays, mondayOf, fmtDay, fmtLong, WEEKDAYS, WEEKDAYS_MIN } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import Segmented from '../ui/Segmented.svelte';

  let { fresh = false } = $props();

  const creating = fresh || !app.plan;
  let days = $state(app.plan ? [app.plan.days.A, app.plan.days.B] : [2, 5]);
  let when = $state('this');

  const sorted = $derived([...days].sort((a, b) => a - b));
  const start = $derived(when === 'next' ? addDays(mondayOf(app.today), 7) : mondayOf(app.today));
  const weeks = $derived(creating ? [] : allWeeks(app.plan));

  function toggleDay(d) {
    if (days.includes(d)) return;
    days = [days[1], d];
    if (!creating) app.setPlan({ ...app.plan, days: { A: Math.min(days[0], days[1]), B: Math.max(days[0], days[1]) } });
  }

  function create() {
    const plan = createPlan({ start, days: { A: sorted[0], B: sorted[1] } });
    if (app.plan) app.startNewCycle(plan);
    else app.setPlan(plan);
    ui.close();
    ui.toast('Nuovo ciclo creato');
  }

  function pause(idx) {
    app.setPlan(insertWeek(app.plan, idx, 'P'));
  }
  function resume(idx) {
    app.setPlan(removeWeek(app.plan, idx));
  }

  const label = (w) => (w.kind === 'P' ? 'Pausa' : w.kind === 'R' ? 'Recupero aperture' : `Settimana ${w.number} · ${w.block.theme}`);
</script>

<Sheet title={creating ? 'Nuovo ciclo' : 'Il piano'} onclose={() => ui.close()} tall={!creating}>
  <div class="stack g-24">
    {#if creating}
      <Segmented
        options={[
          { id: 'this', label: 'Da questa settimana' },
          { id: 'next', label: 'Dalla prossima' }
        ]}
        value={when}
        onchange={(v) => (when = v)}
      />
    {/if}

    <section class="stack g-12">
      <h3 class="heading">Giorni di allenamento</h3>
      <div class="days" role="group">
        {#each WEEKDAYS_MIN as d, n (n)}
          {@const on = days.includes(n + 1)}
          <button class:on aria-pressed={on} aria-label={WEEKDAYS[n]} onclick={() => toggleDay(n + 1)}>
            {d}{#if on}<i>{sorted[0] === n + 1 ? 'A' : 'B'}</i>{/if}
          </button>
        {/each}
      </div>
      <p class="small muted">
        Sessione A il {WEEKDAYS[sorted[0] - 1]}, sessione B il {WEEKDAYS[sorted[1] - 1]}.
        {#if creating}Si comincia {fmtLong(start)}. I livelli raggiunti restano.{/if}
      </p>
    </section>

    {#if !creating}
      <section class="stack g-8">
        <h3 class="heading">Settimane</h3>
        <div class="card flush list">
          {#each weeks as w (w.idx)}
            <div class="wk" class:now={w.idx === app.weekIdx} class:past={w.idx < (app.weekIdx ?? -1)}>
              <span class="small muted when">{fmtDay(w.monday)}</span>
              <span class="grow">{label(w)}</span>
              {#if w.kind === 'P' || w.kind === 'R'}
                {#if w.idx >= (app.weekIdx ?? 0)}
                  <button class="link" onclick={() => resume(w.idx)}>Togli</button>
                {/if}
              {:else if w.idx >= (app.weekIdx ?? 0)}
                <button class="icon-btn" onclick={() => pause(w.idx)} aria-label="Metti una pausa prima di questa settimana" title="Pausa"><Coffee size={17} /></button>
              {/if}
            </div>
          {/each}
        </div>
        <p class="small muted">La tazzina inserisce una settimana di pausa: tutto il resto slitta in avanti.</p>
      </section>

      <button class="btn ghost" onclick={() => { ui.close(); ui.open('plan', { fresh: true }); }}>Ricomincia con un nuovo ciclo</button>
    {/if}
  </div>

  {#snippet footer()}
    {#if creating}
      <button class="btn primary wide" onclick={create}>Crea il ciclo</button>
    {:else}
      <button class="btn primary wide" onclick={() => ui.close()}>Fatto</button>
    {/if}
  {/snippet}
</Sheet>

<style>
  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .days button {
    position: relative;
    aspect-ratio: 1;
    max-height: 52px;
    border-radius: 50%;
    font-weight: 560;
    color: var(--ink-2);
    box-shadow: inset 0 0 0 1px var(--line-strong);
    transition: background 0.25s var(--ease), color 0.25s var(--ease), transform 0.4s var(--spring);
  }
  .days button:active {
    transform: scale(0.9);
  }
  .days button.on {
    background: var(--ink);
    color: var(--paper);
    box-shadow: none;
  }
  .days i {
    position: absolute;
    top: -4px;
    right: -4px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent);
    color: #15171a;
    font-style: normal;
    font-size: 10px;
    font-weight: 700;
  }
  .wk {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 4px 8px 4px 16px;
    font-size: 14px;
  }
  .wk.past {
    opacity: 0.5;
  }
  .wk.now {
    box-shadow: inset 3px 0 0 var(--accent);
    font-weight: 560;
  }
  .when {
    width: 52px;
  }
  .wk .link {
    padding: 0 8px;
  }
</style>
