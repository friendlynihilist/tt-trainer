<script>
  // Diario: il mese a colpo d'occhio, con le sessioni previste e quelle fatte.
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Plus from '@lucide/svelte/icons/plus';
  import Play from '@lucide/svelte/icons/play';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { plannedBetween, weekSessions } from '../engine/plan.js';
  import { byTime } from '../engine/levels.js';
  import { monthGrid, monthKey, addMonths, fmtMonth, fmtLong, WEEKDAYS_MIN } from '../util/dates.js';
  import PageHead from '../ui/PageHead.svelte';
  import EventRow from '../ui/EventRow.svelte';

  let month = $state(monthKey(app.today));
  let selected = $state(app.today);

  const grid = $derived(monthGrid(month));
  const entries = $derived(app.events.filter((e) => e.kind !== 'livello'));
  const byDate = $derived.by(() => {
    const m = new Map();
    for (const e of entries) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  });
  // Sessioni previste e non ancora fatte nella loro settimana.
  const planned = $derived.by(() => {
    const m = new Map();
    if (!app.plan) return m;
    for (const p of plannedBetween(app.plan, grid[0][0], grid[grid.length - 1][6])) {
      if (weekSessions(app.events, p.week)[p.slot]) continue;
      m.set(p.date, [...(m.get(p.date) ?? []), p]);
    }
    return m;
  });
  const dayEvents = $derived([...(byDate.get(selected) ?? [])].sort(byTime));
  const dayPlanned = $derived(planned.get(selected) ?? []);
  const monthEvents = $derived(entries.filter((e) => monthKey(e.date) === month).sort((a, b) => byTime(b, a)));

  function shift(n) {
    month = addMonths(month, n);
  }
  function goToday() {
    month = monthKey(app.today);
    selected = app.today;
  }
</script>

<div class="page enter">
  <PageHead eyebrow="Diario" title={fmtMonth(month)}>
    <div class="nav">
      <button class="icon-btn" onclick={() => shift(-1)} aria-label="Mese precedente"><ChevronLeft size={20} /></button>
      <button class="btn plain small" onclick={goToday}>Oggi</button>
      <button class="icon-btn" onclick={() => shift(1)} aria-label="Mese successivo"><ChevronRight size={20} /></button>
    </div>
  </PageHead>

  <section class="cal">
    <div class="dow">
      {#each WEEKDAYS_MIN as d, i (i)}<span>{d}</span>{/each}
    </div>
    {#key month}
      <div class="grid">
        {#each grid as week (week[0])}
          {#each week as day (day)}
            {@const evs = byDate.get(day) ?? []}
            {@const pl = planned.get(day) ?? []}
            <button
              class="day"
              class:out={monthKey(day) !== month}
              class:today={day === app.today}
              class:sel={day === selected}
              onclick={() => (selected = day)}
              aria-label={fmtLong(day)}
              aria-pressed={day === selected}
            >
              <span class="n">{Number(day.slice(8))}</span>
              <span class="marks">
                {#each evs.slice(0, 3) as e (e.id)}
                  <i class="done" class:b={e.kind === 'B'} class:other={e.kind !== 'A' && e.kind !== 'B'}></i>
                {/each}
                {#each pl as p (p.slot)}
                  <i class="plan" class:late={day < app.today}></i>
                {/each}
              </span>
            </button>
          {/each}
        {/each}
      </div>
    {/key}
    <div class="legend small faint">
      <span><i class="done"></i> A</span>
      <span><i class="done b"></i> B</span>
      <span><i class="done other"></i> altro</span>
      <span><i class="plan"></i> prevista</span>
    </div>
  </section>

  <section class="section">
    <div class="spread heading-row">
      <h2 class="heading cap">{selected === app.today ? `Oggi · ${fmtLong(selected)}` : fmtLong(selected)}</h2>
      <button class="btn ghost small" onclick={() => ui.open('add', { date: selected })}><Plus size={16} /> Aggiungi</button>
    </div>
    {#if dayEvents.length || dayPlanned.length}
      <div class="card flush list">
        {#each dayPlanned as p (p.slot)}
          <div class="item">
            <span class="ring">{p.slot}</span>
            <span class="grow">
              <strong>Sessione {p.slot}</strong>
              <span class="small muted block">{p.week.kind === 'R' ? 'Recupero' : `Settimana ${p.week.number}`} · {p.week.block.theme}</span>
            </span>
            {#if selected === app.today}
              <button class="btn accent small" onclick={() => (ui.live = { slot: p.slot, date: app.today, monday: p.week.monday })}>
                <Play size={14} fill="currentColor" /> Inizia
              </button>
            {:else if selected < app.today}
              <button class="btn ghost small" onclick={() => ui.open('event', { draft: { kind: p.slot, date: selected } })}>Registra</button>
            {/if}
          </div>
        {/each}
        {#each dayEvents as e (e.id)}
          <EventRow event={e} showDate={false} />
        {/each}
      </div>
    {:else}
      <p class="muted">Niente in questo giorno.</p>
    {/if}
  </section>

  {#if monthEvents.length}
    <section class="section">
      <h2 class="heading">Nel mese</h2>
      <div class="card flush list">
        {#each monthEvents as e (e.id)}
          <EventRow event={e} />
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .nav {
    display: flex;
    align-items: center;
    gap: 2px;
    margin: 10px 0 0 -10px;
  }
  .cal {
    margin-top: 16px;
  }
  .dow,
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }
  .dow span {
    text-align: center;
    font-size: 11px;
    font-weight: 560;
    color: var(--ink-3);
    padding-bottom: 6px;
  }
  .grid {
    row-gap: 2px;
    animation: rise 0.4s var(--ease-out);
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 4px 0 6px;
    border-radius: 14px;
    transition: background 0.2s var(--ease);
  }
  .n {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    transition: background 0.25s var(--ease), color 0.25s var(--ease), transform 0.4s var(--spring);
  }
  .day.out .n {
    color: var(--ink-3);
    opacity: 0.55;
  }
  .day.today .n {
    box-shadow: inset 0 0 0 1.5px var(--accent);
    color: var(--accent-ink);
    font-weight: 620;
  }
  .day.sel .n {
    background: var(--ink);
    color: var(--paper);
    box-shadow: none;
    transform: scale(1.05);
  }
  .marks {
    display: flex;
    gap: 3px;
    height: 6px;
  }
  i {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  i.done {
    background: var(--ink);
  }
  i.done.b {
    background: var(--accent);
  }
  i.done.other {
    background: var(--ink-3);
  }
  i.plan {
    box-shadow: inset 0 0 0 1.5px var(--ink-3);
  }
  i.plan.late {
    opacity: 0.4;
  }
  .legend {
    display: flex;
    gap: 14px;
    justify-content: center;
    margin-top: 10px;
    font-size: 11px;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .heading-row {
    margin-bottom: 12px;
  }
  .cap::first-letter {
    text-transform: uppercase;
  }
  .ring {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--line-strong);
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .block {
    display: block;
  }
  strong {
    font-weight: 560;
  }
</style>
