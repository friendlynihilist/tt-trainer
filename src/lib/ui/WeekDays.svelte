<script>
  // La settimana in sette cerchi: pieno se hai fatto qualcosa, anello se c'è qualcosa in calendario,
  // oggi in evidenza. Sopra, quanti allenamenti su quelli previsti e le settimane di fila.
  import Check from '@lucide/svelte/icons/check';
  import Flame from '@lucide/svelte/icons/flame';
  import { app } from '../store/app.svelte.js';
  import { agenda } from '../engine/events.js';
  import { weekStreak } from '../engine/stats.js';
  import { addDays, mondayOf, WEEKDAYS_MIN, WEEKDAYS } from '../util/dates.js';

  let { onclick = null } = $props();

  const monday = $derived(mondayOf(app.today));
  const days = $derived.by(() => {
    const map = agenda(app.plan, app.events, app.planned, monday, addDays(monday, 6), app.catalog);
    return WEEKDAYS_MIN.map((letter, i) => {
      const date = addDays(monday, i);
      const d = map.get(date);
      return { date, letter, name: WEEKDAYS[i], done: d?.done.length ?? 0, todo: d?.todo.length ?? 0, today: date === app.today, past: date < app.today };
    });
  });
  const done = $derived(days.filter((d) => d.done).length);
  const total = $derived(days.filter((d) => d.done || d.todo).length);
  const streak = $derived(weekStreak(app.events));
</script>

<svelte:element this={onclick ? 'button' : 'div'} class="week" {onclick} role={onclick ? 'button' : 'group'} aria-label={onclick ? 'Apri il diario' : 'Settimana'}>
  <span class="top">
    <span class="t-name">Allenamenti</span>
    <span class="nums">
      <span class="pill"><b class="t-num">{done}</b>/{total}</span>
      {#if streak > 1}
        <span class="pill fire" aria-label="{streak} settimane di fila"><Flame size={15} strokeWidth={2.4} /><b class="t-num">{streak}</b></span>
      {/if}
    </span>
  </span>
  <span class="days">
    {#each days as d (d.date)}
      <span class="day" class:today={d.today}>
        <small>{d.letter}</small>
        <span class="dot" class:done={d.done} class:todo={!d.done && d.todo} class:missed={!d.done && d.todo && d.past} aria-label="{d.name}: {d.done ? 'fatto' : d.todo ? (d.past ? 'saltato' : 'in calendario') : 'riposo'}" role="img">
          {#if d.done}<Check size={16} strokeWidth={3} />{/if}
        </span>
      </span>
    {/each}
  </span>
</svelte:element>

<style>
  .week {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    padding: 16px 18px 18px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
    text-align: left;
  }
  button.week {
    transition: transform var(--dur-fast) var(--ease);
  }
  button.week:active {
    transform: scale(0.985);
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .nums {
    display: flex;
    gap: 6px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
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
  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .day small {
    font-size: 12px;
    font-weight: 650;
    color: var(--ink-3);
  }
  .day.today small {
    color: var(--ink);
  }
  .dot {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--sunk);
    color: #fff;
  }
  .dot.todo {
    background: transparent;
    box-shadow: inset 0 0 0 2.5px var(--accent);
  }
  .dot.missed {
    box-shadow: inset 0 0 0 2px var(--line-strong);
  }
  .dot.done {
    background: var(--accent);
    box-shadow: 0 3px 0 color-mix(in srgb, var(--accent) 62%, #000);
  }
  .day.today .dot:not(.done) {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .day.today .dot.done {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
  }
</style>
