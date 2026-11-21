<script>
  // La settimana in sette cerchi: pieno se quel giorno hai fatto qualcosa, anello se c'è qualcosa in
  // calendario, oggi in evidenza. Toccando un giorno si apre il Diario su quel giorno: il mese intero,
  // con un pallino per ogni attività, sta lì.
  import Check from '@lucide/svelte/icons/check';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { agenda } from '../engine/events.js';
  import { addDays, mondayOf, WEEKDAYS_MIN, WEEKDAYS } from '../util/dates.js';

  const week = $derived(Array.from({ length: 7 }, (_, i) => addDays(mondayOf(app.today), i)));
  const map = $derived(agenda(app.plan, app.events, app.planned, week[0], week[6], app.catalog));
  const days = $derived(
    week.map((date, i) => {
      const d = map.get(date);
      return {
        date,
        n: Number(date.slice(8)),
        name: WEEKDAYS[i],
        done: d?.done.length ?? 0,
        todo: d?.todo.length ?? 0,
        today: date === app.today,
        past: date < app.today
      };
    })
  );
  // title: «Questa settimana», oppure «Settimana 2 di 4» con i trattini (steps) quando c'è un programma
  // di più settimane.
  let { title = 'Questa settimana', steps = null } = $props();

  const done = $derived(days.filter((d) => d.done).length);
  const total = $derived(days.filter((d) => d.done || d.todo).length);
</script>

<div class="week">
  <button class="top" onclick={() => ui.go('calendario')}>
    <span class="t-name">{title}</span>
    <span class="count">{#if total}<b class="t-num">{done}</b> su {total}{/if}</span>
    <ChevronRight size={18} />
  </button>

  {#if steps}
    <div class="segs" aria-hidden="true">
      {#each Array(steps.of) as _, k (k)}<i class:past={k < steps.pos - 1} class:now={k === steps.pos - 1}></i>{/each}
    </div>
  {/if}

  <div class="grid">
    {#each days as d, i (d.date)}
      <button
        class="day"
        class:today={d.today}
        class:done={d.done}
        class:todo={!d.done && d.todo}
        class:missed={!d.done && d.todo && d.past}
        onclick={() => ui.go('calendario', d.date)}
        aria-label="{d.name} {d.n}: {d.done ? 'fatto' : d.todo ? (d.past ? 'saltato' : 'in calendario') : 'riposo'}"
      >
        <small class:on={d.today}>{WEEKDAYS_MIN[i]}</small>
        <span class="dot">{#if d.done}<Check size={16} strokeWidth={3} />{/if}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .segs {
    display: flex;
    gap: 4px;
    margin: 2px 0 14px;
  }
  .segs i {
    flex: 1 1 0;
    height: 6px;
    border-radius: 3px;
    background: var(--sunk);
  }
  .segs i.past {
    background: var(--up);
  }
  .segs i.now {
    background: var(--accent);
  }

  .week {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    padding: 8px 16px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    text-align: left;
    color: var(--ink);
  }
  .top .t-name {
    flex: 1;
  }
  .top :global(svg) {
    color: var(--ink-3);
  }
  .count {
    font-size: 14px;
    color: var(--ink-2);
  }
  .count b {
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
    color: var(--ink);
  }
  small {
    font-size: 12px;
    font-weight: 650;
    color: var(--ink-3);
  }
  small.on {
    color: var(--ink);
  }
  .dot {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--sunk);
    color: var(--accent-on);
    transition: transform var(--dur-fast) var(--ease);
  }
  .day:active .dot {
    transform: scale(0.92);
  }
  .todo .dot {
    background: transparent;
    box-shadow: inset 0 0 0 2.5px var(--accent);
  }
  .missed .dot {
    box-shadow: inset 0 0 0 2px var(--line-strong);
  }
  .done .dot {
    background: var(--accent);
    box-shadow: 0 3px 0 color-mix(in srgb, var(--accent) 62%, #000);
  }
  .today .dot {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
</style>
