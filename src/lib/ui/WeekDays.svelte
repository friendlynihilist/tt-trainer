<script>
  // La settimana in sette cerchi. Verde con la spunta solo se quel giorno hai fatto qualcosa e non
  // resta niente da fare; anello blu se c'è ancora qualcosa in calendario (anche se una parte l'hai
  // già fatta: un test fatto non dice che hai fatto l'allenamento); anello grigio se è passato senza
  // che lo registrassi; oggi in evidenza. Toccando un giorno si apre il Diario su quel giorno: il mese intero,
  // con un pallino per ogni attività, sta lì.
  import Check from '@lucide/svelte/icons/check';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { agenda } from '../engine/events.js';
  import { activity } from '../engine/stats.js';
  import { addDays, mondayOf, fmtDuration, WEEKDAYS_MIN, WEEKDAYS } from '../util/dates.js';

  // Il totale della settimana in corso: quante attività e quanto tempo.
  const total = $derived(activity(app.events, 'week', 1, app.today)[0]);

  const week = $derived(Array.from({ length: 7 }, (_, i) => addDays(mondayOf(app.today), i)));
  const map = $derived(agenda(app.plan, app.events, app.planned, week[0], week[6], app.catalog));
  const days = $derived(
    week.map((date, i) => {
      const d = map.get(date);
      const done = d?.done.length ?? 0;
      const todo = d?.todo.length ?? 0;
      return {
        date,
        n: Number(date.slice(8)),
        name: WEEKDAYS[i],
        today: date === app.today,
        past: date < app.today,
        state: todo ? (date < app.today ? 'missed' : 'todo') : done ? 'done' : ''
      };
    })
  );
  // title: «Questa settimana», oppure «Settimana 2 di 4» con i trattini (steps) quando c'è un programma
  // di più settimane.
  let { title = 'Questa settimana', steps = null } = $props();
</script>

<div class="week">
  <div class="head">
    <span class="t-name grow">{title}</span>
    <!-- Quanto hai fatto in settimana, di ogni tipo: allenamenti, lezioni, partite, tornei. -->
    {#if total.count}<span class="sum">{total.count} attività{total.minutes ? ` · ${fmtDuration(total.minutes)}` : ''}</span>{/if}
  </div>

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
        class:done={d.state === 'done'}
        class:todo={d.state === 'todo'}
        class:missed={d.state === 'missed'}
        onclick={() => ui.go('calendario', d.date)}
        aria-label="{d.name} {d.n}: {d.state === 'done' ? 'fatto' : d.state === 'todo' ? 'in calendario' : d.state === 'missed' ? 'non registrato' : 'riposo'}"
      >
        <small>{WEEKDAYS_MIN[i]}</small>
        <span class="dot">{#if d.state === 'done'}<Check size={16} strokeWidth={3.2} />{/if}</span>
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
  .head {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .sum {
    flex: none;
    font-size: 14px;
    color: var(--ink-2);
    font-variant-numeric: tabular-nums;
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
    background: none;
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
