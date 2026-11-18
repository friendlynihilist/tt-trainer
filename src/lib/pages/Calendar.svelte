<script>
  // Diario: il mese a colpo d'occhio. Ogni tipo ha un colore; il pallino pieno indica le attività fatte,
  // il cerchio vuoto quelle in programma.
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Plus from '@lucide/svelte/icons/plus';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { agenda, eventColor, eventTitle, itemColor, itemTitle } from '../engine/events.js';
  import { byTime } from '../engine/events.js';
  import { monthGrid, monthKey, addMonths, fmtMonth, fmtLong, WEEKDAYS_MIN } from '../util/dates.js';
  import PageHead from '../ui/PageHead.svelte';
  import EventRow from '../ui/EventRow.svelte';
  import PlannedRow from '../ui/PlannedRow.svelte';

  let month = $state(monthKey(app.today));
  let selected = $state(app.today);

  const grid = $derived(monthGrid(month));
  const days = $derived(agenda(app.plan, app.events, app.planned, grid[0][0], grid[grid.length - 1][6], app.catalog));
  const day = $derived(days.get(selected) ?? { todo: [], done: [] });
  const monthEvents = $derived(app.events.filter((e) => e.kind !== 'livello' && monthKey(e.date) === month).sort((a, b) => byTime(b, a)));

  /** I pallini di un giorno: prima il fatto, poi il previsto. Al massimo quattro. */
  function pips(d) {
    const v = days.get(d);
    if (!v) return { list: [], more: 0 };
    const list = [
      ...v.done.map((e) => ({ id: e.id, color: eventColor(e, app.catalog), state: 'done' })),
      ...v.todo.map((x) => ({ id: x.key, color: itemColor(x, app.catalog), state: d < app.today ? 'missed' : 'todo' }))
    ];
    return { list: list.slice(0, 4), more: Math.max(0, list.length - 4) };
  }

  // La legenda mostra solo i tipi che compaiono nel mese.
  const legend = $derived.by(() => {
    const seen = new Map();
    for (const v of days.values()) {
      if (monthKey(v.date) !== month) continue;
      for (const e of v.done) seen.set(eventTitle(e, app.catalog), eventColor(e, app.catalog));
      for (const x of v.todo) seen.set(itemTitle(x, app.catalog), itemColor(x, app.catalog));
    }
    return [...seen.entries()].map(([name, color]) => ({ name, color }));
  });

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
          {#each week as d (d)}
            {@const p = pips(d)}
            <button
              class="day"
              class:out={monthKey(d) !== month}
              class:today={d === app.today}
              class:sel={d === selected}
              onclick={() => (selected = d)}
              aria-label={fmtLong(d)}
              aria-pressed={d === selected}
            >
              <span class="n">{Number(d.slice(8))}</span>
              <span class="marks">
                {#each p.list as x (x.id)}
                  <i class="pip {x.state === 'done' ? '' : 'todo'} {x.state === 'missed' ? 'missed' : ''}" data-color={x.color}></i>
                {/each}
                {#if p.more}<b class="more">+</b>{/if}
              </span>
            </button>
          {/each}
        {/each}
      </div>
    {/key}
    {#if legend.length}
      <div class="legend small">
        {#each legend as l (l.name)}
          <span data-color={l.color}><i class="pip"></i>{l.name}</span>
        {/each}
        <span class="faint"><i class="pip todo" data-color="slate"></i>in programma</span>
      </div>
    {/if}
  </section>

  <section class="section">
    <div class="spread heading-row">
      <h2 class="heading cap">{selected === app.today ? `Oggi · ${fmtLong(selected)}` : fmtLong(selected)}</h2>
      <button class="btn ghost small" onclick={() => ui.open('add', { date: selected })}><Plus size={16} /> {selected > app.today ? 'Pianifica' : 'Aggiungi'}</button>
    </div>
    {#if day.todo.length || day.done.length}
      <div class="card flush list">
        {#each day.todo as item (item.key)}
          <PlannedRow {item} />
        {/each}
        {#each day.done as e (e.id)}
          <EventRow event={e} showDate={false} />
        {/each}
      </div>
    {:else}
      <p class="muted">{selected > app.today ? 'Niente in programma.' : 'Niente in questo giorno.'}</p>
    {/if}
  </section>

  {#if monthEvents.length}
    <section class="section">
      <h2 class="heading">Nel mese · {monthEvents.length}</h2>
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
    align-items: center;
    gap: 2px;
    height: 7px;
  }
  .marks .pip {
    width: 6px;
    height: 6px;
  }
  .marks .pip.todo {
    box-shadow: inset 0 0 0 1.4px var(--c);
  }
  .more {
    font-size: 9px;
    line-height: 1;
    color: var(--ink-3);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    justify-content: center;
    margin-top: 12px;
    font-size: 11px;
    color: var(--ink-2);
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .legend .pip {
    width: 7px;
    height: 7px;
  }
  .heading-row {
    margin-bottom: 12px;
  }
  .cap::first-letter {
    text-transform: uppercase;
  }
</style>
