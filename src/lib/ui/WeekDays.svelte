<script>
  // La settimana in sette cerchi: pieno se quel giorno hai fatto qualcosa, anello se c'è qualcosa in
  // calendario, oggi in evidenza. Toccando un giorno si apre il Diario su quel giorno: il mese intero,
  // con un pallino per ogni attività, sta lì.
  import Check from '@lucide/svelte/icons/check';
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
</script>

<div class="week">
  <span class="t-name">{title}</span>

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
        <small>{WEEKDAYS_MIN[i]}</small>
        <span class="dot">{#if d.done}<Check size={16} strokeWidth={3.2} />{/if}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .week {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    padding: 16px;
    border-radius: var(--r-card);
    background: var(--card);
    box-shadow: var(--shadow-card);
  }
  .segs {
    display: flex;
    gap: 4px;
  }
  .segs i {
    flex: 1 1 0;
    height: 6px;
    border-radius: 3px;
    background: var(--sunk);
  }
  .segs i.past {
    background: var(--ok);
  }
  .segs i.now {
    background: var(--accent);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    text-align: center;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: var(--ink);
  }
  small {
    font-size: 11px;
    font-weight: 700;
    line-height: 1.5;
    color: var(--ink-2);
  }
  .dot {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--sunk);
    color: #fff;
  }
  .todo .dot {
    background: none;
    box-shadow: inset 0 0 0 2.5px var(--accent);
  }
  .missed .dot {
    box-shadow: inset 0 0 0 2.5px var(--line-strong);
  }
  .done .dot {
    background: var(--ok);
  }
  .today .dot {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
</style>
