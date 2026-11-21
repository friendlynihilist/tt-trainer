<script>
  // Quando fai un allenamento: oggi, un altro giorno, oppure negli stessi giorni per una settimana o
  // per un mese. Si apre dopo aver costruito un allenamento e da «Mettilo in calendario» in Libreria.
  // Un programma di una settimana o di un mese prende il posto di quello che c'è.
  import { app } from '../store/app.svelte.js';
  import { ui, buzz } from '../store/ui.svelte.js';
  import { putToday, weeksPlan } from '../store/actions.js';
  import { agenda } from '../engine/events.js';
  import { addDays, fmtLong, WEEKDAYS, WEEKDAYS_MIN } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';

  // fresh: l'allenamento è appena stato costruito (cambia solo la frase di chi non lo mette in calendario).
  let { id, fresh = false } = $props();

  const template = $derived(app.catalog.template(id));
  const today = $derived(agenda(app.plan, app.events, app.planned, app.today, app.today, app.catalog).get(app.today));
  const todo = $derived((today?.todo ?? []).some((x) => x.kind === 'training'));
  const done = $derived((today?.done ?? []).some((x) => x.kind === 'training'));

  let span = $state(null);
  let days = $state([2, 5]);
  const weeks = $derived(span === 'month' ? 4 : 1);

  function end(text, page = 'oggi', param) {
    ui.closeAll();
    if (param) ui.go(page, param);
    else ui.go(page);
    ui.toast(text);
  }
  function onToday() {
    putToday(id);
    end(`«${template.name}» è l’allenamento di oggi`);
  }
  function otherDay() {
    ui.open('date', {
      title: 'Quale giorno?',
      value: addDays(app.today, 1),
      onpick: (date) => {
        if (!date) return;
        if (date === app.today) return onToday();
        app.planEvent({ kind: 'training', template: id, date });
        end(`In calendario ${fmtLong(date)}`, 'calendario', date);
      }
    });
  }
  function toggleDay(d) {
    days = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    buzz(10);
  }
  function program() {
    app.patchMeta({ plan: weeksPlan(id, days, weeks) });
    end(span === 'month' ? 'Programma di un mese pronto' : 'Programma della settimana pronto');
  }
</script>

{#if template}
  <Sheet title={span ? 'In quali giorni?' : 'Quando lo fai?'} onclose={() => ui.close()} sans>
    {#if !span}
      <div class="choices">
        <button class="choice" onclick={onToday}>
          <span class="glyph" style:grid-template-columns="repeat(1, 7px)" aria-hidden="true"><i></i></span>
          <span><b>Oggi</b><span class="muted">{todo ? 'Al posto di quello in calendario' : done ? 'Un altro allenamento, dopo quello già fatto' : 'Un solo allenamento'}</span></span>
        </button>
        <button class="choice" onclick={otherDay}>
          <span class="glyph" style:grid-template-columns="repeat(3, 7px)" aria-hidden="true"><i class="off"></i><i></i><i class="off"></i></span>
          <span><b>Un altro giorno</b><span class="muted">Scegli la data</span></span>
        </button>
        <button class="choice" onclick={() => (span = 'week')}>
          <span class="glyph" style:grid-template-columns="repeat(7, 7px)" aria-hidden="true">{#each Array(7) as _, k (k)}<i></i>{/each}</span>
          <span><b>Una settimana</b><span class="muted">I giorni li scegli tu</span></span>
        </button>
        <button class="choice" onclick={() => (span = 'month')}>
          <span class="glyph" style:grid-template-columns="repeat(7, 7px)" aria-hidden="true">{#each Array(28) as _, k (k)}<i></i>{/each}</span>
          <span><b>Un mese</b><span class="muted">Quattro settimane, negli stessi giorni</span></span>
        </button>
      </div>
    {:else}
      <div class="bigdays" role="group" aria-label="Giorni di allenamento">
        {#each WEEKDAYS_MIN as d, n (n)}
          <button aria-pressed={days.includes(n + 1)} aria-label={WEEKDAYS[n]} onclick={() => toggleDay(n + 1)}>{d}</button>
        {/each}
      </div>
      <div class="card sum">
        <div class="month" aria-hidden="true">
          {#each Array(weeks * 7) as _, k (k)}<i class:on={days.includes((k % 7) + 1)}></i>{/each}
        </div>
        <span class="muted">
          {#if days.length}
            {days.length === 1 ? 'Una volta' : `${days.length} volte`} a settimana{weeks > 1 ? `: ${days.length * weeks} allenamenti in un mese.` : '.'}
          {:else}
            Scegli almeno un giorno.
          {/if}
        </span>
        {#if app.plan}<span class="muted small">Prende il posto del programma che hai adesso.</span>{/if}
      </div>
    {/if}

    {#snippet footer()}
      {#if span}
        <button class="btn accent wide" onclick={program} disabled={!days.length}>Metti in calendario</button>
      {:else}
        <button class="btn ghost wide" onclick={() => ui.close()}>{fresh ? 'Per ora lo tengo in Libreria' : 'Chiudi'}</button>
      {/if}
    {/snippet}
  </Sheet>
{/if}

<style>
  .choices {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .choice {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 14px 16px;
    border-radius: 22px;
    background: var(--card);
    box-shadow: 0 5px 0 var(--line-strong);
    text-align: left;
    transition:
      transform 0.12s,
      box-shadow 0.12s;
  }
  .choice:active {
    transform: translateY(4px);
    box-shadow: 0 1px 0 var(--line-strong);
  }
  .choice b {
    display: block;
    font-size: 20px;
    font-weight: 750;
    letter-spacing: -0.02em;
  }
  .glyph {
    flex: none;
    width: 76px;
    height: 44px;
    display: grid;
    gap: 3px;
    align-content: center;
    justify-content: center;
  }
  .glyph i {
    width: 7px;
    height: 7px;
    border-radius: 2.5px;
    background: var(--accent);
  }
  .glyph i.off {
    background: var(--line-strong);
  }
  .bigdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .bigdays button {
    aspect-ratio: 1;
    border-radius: 14px;
    background: var(--card);
    box-shadow: 0 4px 0 var(--line-strong);
    text-align: center;
    font-weight: 750;
    color: var(--ink-2);
    transition:
      transform 0.12s,
      background 0.15s;
  }
  .bigdays button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--accent-on);
    box-shadow: 0 4px 0 color-mix(in srgb, var(--accent) 65%, #000);
  }
  .bigdays button:active {
    transform: translateY(3px);
  }
  .sum {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
  }
  .month {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .month i {
    height: 18px;
    border-radius: 6px;
    background: var(--sunk);
  }
  .month i.on {
    background: var(--accent);
  }
</style>
