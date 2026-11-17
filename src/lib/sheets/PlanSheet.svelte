<script>
  // Il piano: i mesi e la loro durata, il ritmo della settimana, e le settimane una per una
  // (pause, recupero, cambio di mese). Di base: i tre mesi del programma, quattro settimane l'uno.
  import Coffee from '@lucide/svelte/icons/coffee';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import X from '@lucide/svelte/icons/x';
  import Plus from '@lucide/svelte/icons/plus';
  import Minus from '@lucide/svelte/icons/minus';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { createPlan, allWeeks, insertWeek, removeWeek, defaultSlots, withSlots, DEFAULT_DAYS } from '../engine/plan.js';
  import { CYCLE_BLOCKS, WEEKS_PER_BLOCK } from '../data/program.js';
  import { addDays, mondayOf, fmtDay, fmtLong } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Rhythm from '../ui/Rhythm.svelte';

  let { fresh = false } = $props();

  const creating = fresh || !app.plan;
  let when = $state('this');
  let months = $state([...CYCLE_BLOCKS]);
  let perMonth = $state(WEEKS_PER_BLOCK);
  // Il nuovo ciclo riparte dal ritmo di quello in corso.
  let slots = $state(app.plan?.slots?.length ? app.plan.slots.map((s) => ({ ...s })) : defaultSlots(DEFAULT_DAYS));

  const start = $derived(when === 'next' ? addDays(mondayOf(app.today), 7) : mondayOf(app.today));
  const weeks = $derived(creating ? [] : allWeeks(app.plan, app.catalog));
  const totalWeeks = $derived(months.length * perMonth);
  const blockName = (id) => {
    const b = app.catalog.block(id);
    return b ? (b.custom ? b.theme : `${b.label} · ${b.theme}`) : 'Mese cancellato';
  };

  function pickMonth(onpick, value = null) {
    const blocks = Object.values(app.catalog.blocks);
    ui.open('pick', {
      title: 'Mese',
      value,
      groups: [
        { name: 'Programma', options: blocks.filter((b) => !b.custom).map((b) => ({ id: b.id, label: blockName(b.id), hint: b.tracks.map((t) => app.catalog.track(t).short).join(' · ') })) },
        { name: 'I tuoi mesi', options: blocks.filter((b) => b.custom).map((b) => ({ id: b.id, label: b.theme, hint: b.tracks.map((t) => app.catalog.track(t)?.short).join(' · ') })) }
      ].filter((g) => g.options.length),
      onpick
    });
  }
  function addMonth() {
    pickMonth((id) => id && (months = [...months, id]));
  }
  function moveUp(i) {
    if (i === 0) return;
    const m = [...months];
    [m[i - 1], m[i]] = [m[i], m[i - 1]];
    months = m;
  }

  function create() {
    const plan = createPlan({ start, months, weeksPerMonth: perMonth, slots: $state.snapshot(slots) });
    if (app.plan) app.startNewCycle(plan);
    else app.setPlan(plan);
    ui.close();
    ui.toast('Nuovo ciclo creato');
  }

  function setSlots(next) {
    slots = next;
    if (!creating) app.setPlan(withSlots(app.plan, next, app.today));
  }

  function changeMonth(w) {
    pickMonth((id) => {
      if (!id) return;
      const next = [...app.plan.weeks];
      next[w.idx] = id;
      app.setPlan({ ...app.plan, weeks: next });
    }, w.kind);
  }

  const label = (w) => (w.kind === 'P' ? 'Pausa' : w.kind === 'R' ? 'Recupero aperture' : `Settimana ${w.number} · ${w.block?.theme ?? 'mese cancellato'}`);
</script>

<Sheet title={creating ? 'Nuovo ciclo' : 'Il piano'} onclose={() => ui.close()} tall>
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

      <section class="stack g-8">
        <h3 class="heading">I mesi, in ordine</h3>
        <div class="card flush list">
          {#each months as m, i (i)}
            <div class="month">
              <span class="n mono">{i + 1}</span>
              <span class="grow">{blockName(m)}</span>
              {#if i > 0}<button class="icon-btn" onclick={() => moveUp(i)} aria-label="Sposta su"><ArrowUp size={16} /></button>{/if}
              {#if months.length > 1}<button class="icon-btn" onclick={() => (months = months.filter((_, j) => j !== i))} aria-label="Togli"><X size={16} /></button>{/if}
            </div>
          {/each}
        </div>
        <div class="spread">
          <div class="stepper">
            <button class="icon-btn" onclick={() => (perMonth = Math.max(1, perMonth - 1))} aria-label="Meno settimane"><Minus size={16} /></button>
            <span><b class="mono">{perMonth}</b> settimane al mese</span>
            <button class="icon-btn" onclick={() => (perMonth = Math.min(8, perMonth + 1))} aria-label="Più settimane"><Plus size={16} /></button>
          </div>
          <button class="btn ghost small" onclick={addMonth}><Plus size={16} /> Mese</button>
        </div>
        <p class="small muted">
          {totalWeeks} settimane, {fmtLong(start)} → {fmtLong(addDays(start, totalWeeks * 7 - 1))}. I livelli raggiunti restano.
          {#if months.join() !== CYCLE_BLOCKS.join() || perMonth !== WEEKS_PER_BLOCK}
            <button class="link" onclick={() => ((months = [...CYCLE_BLOCKS]), (perMonth = WEEKS_PER_BLOCK))}>Torna al programma di base</button>
          {/if}
        </p>
      </section>
    {/if}

    <section class="stack g-8">
      <h3 class="heading">La settimana</h3>
      <Rhythm {slots} onchange={setSlots} />
      <p class="small faint">Quando il test capita nello stesso giorno di un allenamento, lo fai all’inizio di ogni esercizio.</p>
    </section>

    {#if !creating}
      <section class="stack g-8">
        <h3 class="heading">Settimane</h3>
        <div class="card flush list">
          {#each weeks as w (w.idx)}
            {@const editable = w.idx >= (app.weekIdx ?? 0)}
            <div class="wk" class:now={w.idx === app.weekIdx} class:past={w.idx < (app.weekIdx ?? -1)}>
              <span class="small muted when">{fmtDay(w.monday)}</span>
              {#if editable && w.kind !== 'P'}
                <button class="grow lbl" onclick={() => changeMonth(w)}>{label(w)}</button>
              {:else}
                <span class="grow">{label(w)}</span>
              {/if}
              {#if w.kind === 'P' || w.kind === 'R'}
                {#if editable}
                  <button class="link" onclick={() => app.setPlan(removeWeek(app.plan, w.idx))}>Togli</button>
                {/if}
              {:else if editable}
                <button class="icon-btn" onclick={() => app.setPlan(insertWeek(app.plan, w.idx, 'P'))} aria-label="Metti una pausa prima di questa settimana" title="Pausa"><Coffee size={17} /></button>
              {/if}
            </div>
          {/each}
        </div>
        <p class="small muted">Tocca una settimana per cambiarle il mese. La tazzina inserisce una pausa: tutto il resto slitta in avanti.</p>
      </section>

      <button
        class="btn ghost"
        onclick={() => {
          ui.close();
          ui.open('plan', { fresh: true });
        }}>Ricomincia con un nuovo ciclo</button
      >
    {/if}
  </div>

  {#snippet footer()}
    {#if creating}
      <button class="btn primary wide" onclick={create} disabled={!months.length}>Crea il ciclo</button>
    {:else}
      <button class="btn primary wide" onclick={() => ui.close()}>Fatto</button>
    {/if}
  {/snippet}
</Sheet>

<style>
  .month {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 6px 6px 14px;
    min-height: 48px;
  }
  .n {
    width: 22px;
    color: var(--accent-ink);
    font-weight: 600;
  }
  .month .icon-btn {
    width: 34px;
    height: 34px;
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
  }
  .stepper b {
    font-size: 16px;
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
  .lbl {
    text-align: left;
    padding: 8px 0;
  }
  .when {
    width: 52px;
  }
  .wk .link {
    padding: 0 8px;
  }
</style>
