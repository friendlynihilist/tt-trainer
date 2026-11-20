<script>
  // Gli allenamenti della settimana o del mese. Settimana: sette cerchi, pieno se hai fatto qualcosa,
  // anello se c'è qualcosa in calendario. Mese: sotto ogni data un pallino per attività, del colore del
  // tipo (allenamento, test, lezione…), pieno se fatta e vuoto se in programma; sotto, la legenda dei
  // tipi del mese. Toccando un giorno si apre il Diario su quel giorno.
  import Check from '@lucide/svelte/icons/check';
  import Flame from '@lucide/svelte/icons/flame';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { agenda } from '../engine/events.js';
  import { KIND } from '../data/taxonomy.js';
  import { weekStreak } from '../engine/stats.js';
  import { addDays, mondayOf, monthGrid, monthKey, WEEKDAYS_MIN, WEEKDAYS, MONTHS } from '../util/dates.js';

  const KEY = 'tt-trainer:days-view';
  let view = $state(read());
  function read() {
    try {
      return localStorage.getItem(KEY) === 'month' ? 'month' : 'week';
    } catch {
      return 'week';
    }
  }
  function setView(v) {
    view = v;
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  }

  const month = $derived(monthKey(app.today));
  const rows = $derived(view === 'week' ? [Array.from({ length: 7 }, (_, i) => addDays(mondayOf(app.today), i))] : monthGrid(month));
  const map = $derived(agenda(app.plan, app.events, app.planned, rows[0][0], rows[rows.length - 1][6], app.catalog));
  const cells = $derived(
    rows.map((row) =>
      row.map((date, i) => {
        const d = map.get(date);
        return {
          date,
          n: Number(date.slice(8)),
          name: WEEKDAYS[i],
          out: view === 'month' && monthKey(date) !== month,
          // Un pallino per attività, al massimo tre: prima le fatte, poi quelle in programma.
          pips: [
            ...(d?.done ?? []).filter((e) => KIND[e.kind]).map((e) => ({ kind: e.kind, state: 'done' })),
            ...(d?.todo ?? []).map((x) => ({ kind: x.kind, state: date < app.today ? 'missed' : 'todo' }))
          ].slice(0, 3),
          done: d?.done.length ?? 0,
          todo: d?.todo.length ?? 0,
          today: date === app.today,
          past: date < app.today
        };
      })
    )
  );
  const counted = $derived(cells.flat().filter((d) => !d.out));
  const done = $derived(counted.filter((d) => d.done).length);
  const total = $derived(counted.filter((d) => d.done || d.todo).length);
  const streak = $derived(weekStreak(app.events));
  const monthName = $derived(MONTHS[Number(month.slice(5)) - 1]);
  // La legenda: solo i tipi che compaiono nel mese, nell'ordine di sempre.
  const legend = $derived(view === 'month' ? Object.values(KIND).filter((k) => counted.some((d) => d.pips.some((p) => p.kind === k.id))) : []);
</script>

<div class="week">
  <div class="top">
    <button class="title" onclick={() => ui.go('calendario')}>
      <span class="t-name">{view === 'week' ? 'Allenamenti' : monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
      <ChevronRight size={18} />
    </button>
    <span class="switch" role="group" aria-label="Vista">
      <button aria-pressed={view === 'week'} class:on={view === 'week'} onclick={() => setView('week')}>Settimana</button>
      <button aria-pressed={view === 'month'} class:on={view === 'month'} onclick={() => setView('month')}>Mese</button>
    </span>
  </div>

  <div class="nums">
    <span class="pill"><b class="t-num">{done}</b> fatti su {total}</span>
    {#if streak > 1}
      <span class="pill fire"><Flame size={15} strokeWidth={2.4} /><b class="t-num">{streak}</b> settimane di fila</span>
    {/if}
  </div>

  <div class="grid" class:month={view === 'month'}>
    {#each WEEKDAYS_MIN as l, i (i)}<small class="head">{l}</small>{/each}
    {#each cells.flat() as d (d.date)}
      <button
        class="day"
        class:today={d.today}
        class:out={d.out}
        class:done={d.done}
        class:todo={!d.done && d.todo}
        class:missed={!d.done && d.todo && d.past}
        class:past={d.past}
        onclick={() => ui.go('calendario', d.date)}
        aria-label="{d.name} {d.n}: {d.done ? 'fatto' : d.todo ? (d.past ? 'saltato' : 'in calendario') : 'riposo'}"
      >
        {#if view === 'week'}
          {#if d.done}<Check size={16} strokeWidth={3} />{/if}
        {:else}
          <span class="n t-num">{d.n}</span>
          <span class="pips" aria-hidden="true">
            {#each d.pips as p, i (i)}<i class="pip {p.state}" data-color={KIND[p.kind]?.color}></i>{/each}
          </span>
        {/if}
      </button>
    {/each}
  </div>

  {#if legend.length}
    <div class="legend">
      {#each legend as k (k.id)}<span data-color={k.color}><i class="pip"></i>{k.short}</span>{/each}
      <span><i class="pip todo" data-color="slate"></i>in programma</span>
    </div>
  {/if}
</div>

<style>
  .week {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    padding: 14px 16px 18px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .title {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    min-height: 44px;
    white-space: nowrap;
    color: var(--ink);
  }
  .title :global(svg) {
    color: var(--ink-3);
  }
  .switch {
    display: inline-flex;
    padding: 3px;
    border-radius: 999px;
    background: var(--sunk);
  }
  .switch button {
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 650;
    color: var(--ink-2);
    transition: background var(--dur) var(--ease);
  }
  .switch button.on {
    background: var(--card);
    color: var(--ink);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
  }
  .nums {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: -4px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: var(--sunk);
    font-size: 13px;
    color: var(--ink-2);
  }
  .pill b {
    color: var(--ink);
    font-size: 15px;
  }
  .pill.fire {
    background: color-mix(in srgb, var(--accent) 16%, var(--card));
    color: var(--accent-ink);
  }
  .pill.fire b {
    color: var(--accent-ink);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px 4px;
    justify-items: center;
  }
  .head {
    font-size: 12px;
    font-weight: 650;
    color: var(--ink-3);
  }
  .day {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--sunk);
    color: #fff;
    font-size: 13px;
  }
  /* Mese: la data in alto, i pallini sotto. Niente cerchi pieni: il colore sta nei pallini. */
  .month {
    gap: 2px;
  }
  .month .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 3px;
    width: 40px;
    height: 44px;
    padding-top: 5px;
    border-radius: 12px;
    background: none;
    box-shadow: none;
    color: var(--ink);
  }
  .month .day.past .n {
    color: var(--ink-3);
  }
  .month .day.today {
    background: var(--ink);
    color: var(--paper);
    outline: none;
  }
  .month .day.today .n {
    color: var(--paper);
    font-weight: 700;
  }
  .pips {
    display: flex;
    gap: 3px;
    min-height: 7px;
  }
  .pips .pip {
    width: 7px;
    height: 7px;
  }
  .pip.todo,
  .pip.missed {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--c);
  }
  .pip.missed {
    opacity: 0.45;
  }
  .month .day.today .pip.todo {
    box-shadow: inset 0 0 0 1.5px var(--paper);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 14px;
    font-size: 12px;
    color: var(--ink-2);
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .day.out {
    visibility: hidden;
  }
  .grid:not(.month) .day.todo {
    background: transparent;
    box-shadow: inset 0 0 0 2.5px var(--accent);
    color: var(--ink);
  }
  .grid:not(.month) .day.missed {
    box-shadow: inset 0 0 0 2px var(--line-strong);
    color: var(--ink-3);
  }
  .grid:not(.month) .day.done {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 3px 0 color-mix(in srgb, var(--accent) 62%, #000);
  }
  .grid:not(.month) .day.today {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
</style>
