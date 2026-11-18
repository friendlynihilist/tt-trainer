<script>
  // «Oggi»: quello che c'è in calendario, già composto con gli esercizi del mese. Il test è un
  // appuntamento a parte, con gli esercizi proposti. Le medaglie dicono solo il prossimo obiettivo:
  // niente è bloccato e tutto si può cambiare.
  import Play from '@lucide/svelte/icons/play';
  import Coffee from '@lucide/svelte/icons/coffee';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { loadLive, clearLive } from '../store/live.js';
  import { startItem, logItem, weekOf, proposalFor } from '../store/actions.js';
  import { weekAt, removeWeek } from '../engine/plan.js';
  import { agenda } from '../engine/events.js';
  import { composeSession } from '../engine/compose.js';
  import { nearGoals } from '../engine/player.js';
  import { goalText } from '../engine/medals.js';
  import { lastFocus } from '../engine/stats.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { PLAYER_LEVEL } from '../data/library.js';
  import { addDays, fmtLong, fmtRelative, fmtShort } from '../util/dates.js';
  import PageHead from '../ui/PageHead.svelte';
  import WeekStrip from '../ui/WeekStrip.svelte';
  import StepBody from '../ui/StepBody.svelte';
  import PlannedRow from '../ui/PlannedRow.svelte';
  import EventRow from '../ui/EventRow.svelte';
  import Medal from '../ui/Medal.svelte';
  import MedalRow from '../ui/MedalRow.svelte';

  const plan = $derived(app.plan);
  const week = $derived(app.week);

  const days = $derived(agenda(plan, app.events, app.planned, app.today, addDays(app.today, 28), app.catalog));
  const todayInfo = $derived(days.get(app.today) ?? { todo: [], done: [] });
  const todo = $derived(todayInfo.todo);
  const testToday = $derived(todo.find((x) => x.kind === 'test') ?? null);
  const trainingToday = $derived(todo.find((x) => x.kind === 'training') ?? null);
  const others = $derived(todo.filter((x) => x !== trainingToday && x !== testToday));
  const upcoming = $derived.by(() => {
    for (const [d, v] of [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (d > app.today && v.todo.length) return v.todo[0];
    }
    return null;
  });

  // Il modello si può cambiare al volo; senza niente in calendario si sceglie qui.
  let chosen = $state(null);
  const weekToday = $derived(weekOf(app.today));
  const templateId = $derived(chosen ?? trainingToday?.template ?? null);
  const template = $derived(templateId ? app.catalog.template(templateId) : null);
  const session = $derived(template ? composeSession({ week: weekToday, template, catalog: app.catalog, medals: app.medals }) : null);
  const proposal = $derived(testToday ? proposalFor(app.today) : []);
  const near = $derived(nearGoals({ medals: app.medals, catalog: app.catalog }));
  const focus = $derived(lastFocus(app.events));
  const templates = $derived(Object.values(app.catalog.templates));
  const offer = $derived(app.levelOffer);

  let draft = $state(null);
  $effect(() => {
    ui.live; // si rilegge quando la sessione dal vivo si apre o si chiude
    draft = app.user ? loadLive(app.user.uid) : null;
  });

  const head = $derived.by(() => {
    if (!plan) return { title: 'Oggi', sub: 'Nessun piano: allenati quando vuoi' };
    if (app.phase === 'before') return { title: 'Si comincia', sub: fmtLong(plan.start) };
    if (app.phase === 'done') return { title: 'Ciclo completato', sub: '' };
    if (week.kind === 'P') return { title: 'Pausa', sub: 'Questa settimana si riposa' };
    if (week.kind === 'R') return { title: 'Recupero', sub: week.block?.theme ?? '' };
    return { title: `Settimana ${week.number}`, sub: week.block?.custom ? week.block.theme : `${week.block?.label} · ${week.block?.theme}` };
  });

  function startTraining() {
    startItem(trainingToday ?? null, { template });
  }
  function logTraining() {
    if (trainingToday) logItem({ ...trainingToday, template: templateId ?? trainingToday.template });
    else ui.open('event', { draft: { kind: 'training', template: templateId, date: app.today } });
  }
  function startTest(exercises = null) {
    startItem(testToday ?? { kind: 'test' }, { exercises });
  }
</script>

<div class="page enter">
  <PageHead eyebrow={fmtLong(app.today)} title={head.title} sub={head.sub} />

  {#if plan}
    <div class="strip">
      <WeekStrip {plan} events={app.events} current={app.phase === 'active' ? week.idx : app.phase === 'done' ? plan.weeks.length : null} />
    </div>
  {/if}

  {#if draft && !ui.live}
    <section class="card resume">
      <div class="grow">
        <strong>{draft.title ?? `Sessione ${draft.slot}`} in corso</strong>
        <p class="small muted">Iniziata {fmtRelative(draft.date)}</p>
      </div>
      <button
        class="btn plain small"
        onclick={() => {
          clearLive(app.user.uid);
          draft = null;
        }}>Scarta</button
      >
      <button class="btn primary small" onclick={() => (ui.live = { resume: true })}>Riprendi</button>
    </section>
  {/if}

  {#if offer}
    <section class="card offer">
      <span class="badge up"><TrendingUp size={18} /></span>
      <div class="grow stack g-4">
        <strong>Sei pronto per il livello {PLAYER_LEVEL[offer.level].name.toLowerCase()}?</strong>
        <span class="small muted">Hai l’argento in {offer.progress.coverage.have} esercizi chiave su {offer.progress.coverage.total} e l’oro in {offer.progress.solidity.have}. Cambia solo cosa ti propone l’app.</span>
        <div class="actions">
          <button class="btn primary small" onclick={() => app.setPlayerLevel(offer.level, 'proposto')}>Passo a {PLAYER_LEVEL[offer.level].name.toLowerCase()}</button>
          <button class="btn plain small" onclick={() => app.declineLevel(offer.level)}>Non ora</button>
        </div>
      </div>
    </section>
  {/if}

  {#if plan && app.phase === 'done'}
    <section class="card stack g-16">
      <p class="muted">Ciclo finito. Medaglie e livello restano: sono il punto di partenza del prossimo.</p>
      <button class="btn primary" onclick={() => ui.open('plan', { fresh: true })}>Nuovo ciclo <ArrowRight size={18} /></button>
    </section>
  {:else if plan && app.phase === 'active' && week.kind === 'P' && !todo.length}
    <section class="card pause">
      <span class="badge"><Coffee size={18} /></span>
      <p class="grow muted">Il ciclo riprende {fmtLong(weekAt(plan, week.idx + 1, app.catalog)?.monday ?? week.sunday)}.</p>
      <button class="btn ghost small" onclick={() => app.setPlan(removeWeek(plan, week.idx))}>Riprendi ora</button>
    </section>
  {/if}

  {#if testToday}
    <section class="card session" data-color="orange">
      <div class="top">
        <span class="small muted">In calendario oggi</span>
        <h2 class="title">Test</h2>
        <p class="muted">{proposal.length ? `${proposal.length} esercizi da misurare` : 'Scegli tu cosa misurare'}</p>
      </div>
      {#if proposal.length}
        <ul class="props">
          {#each proposal as p (p.ex)}
            {@const ex = app.catalog.exercise(p.ex)}
            <li>
              <button class="prop" onclick={() => ui.open('exercise', { id: p.ex })}>
                <span class="grow">
                  <strong>{ex.name}</strong>
                  <span class="small muted block">{p.reason}</span>
                </span>
                <MedalRow exercise={ex} medals={app.medals[p.ex]} />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="actions">
        <button class="btn accent grow" onclick={() => startTest()}><Play size={18} fill="currentColor" /> Inizia il test</button>
        <button class="btn ghost" onclick={() => logItem(testToday)}>Registra</button>
      </div>
    </section>
  {/if}

  {#if trainingToday || chosen}
    <section class="card session" data-color={template?.color ?? 'blue'}>
      <div class="top">
        <span class="small muted">{trainingToday ? 'In calendario oggi' : 'Allenamento di oggi'}</span>
        <h2 class="title">{template.name}</h2>
        <p class="muted">{session.minutes} min · {session.exercises.length} esercizi</p>
      </div>
      <div class="chips tpls" role="group" aria-label="Modello">
        {#each templates as t (t.id)}
          <button class="chip tpl" data-color={t.color} aria-pressed={templateId === t.id} onclick={() => (chosen = t.id)}>{t.name}</button>
        {/each}
      </div>
      <div class="actions">
        <button class="btn accent grow" onclick={startTraining}><Play size={18} fill="currentColor" /> Inizia</button>
        <button class="btn ghost" onclick={logTraining}>Registra</button>
      </div>
    </section>
  {:else if !draft && !testToday}
    <section class="card stack g-12 rest">
      {#if todayInfo.done.length}
        <strong>Oggi hai già fatto</strong>
        <div class="card flush list inner">
          {#each todayInfo.done as e (e.id)}<EventRow event={e} showDate={false} />{/each}
        </div>
      {:else}
        <p class="muted">{plan ? 'Oggi niente in calendario.' : 'Nessun piano: puoi allenarti lo stesso.'}</p>
      {/if}
      {#if upcoming}
        <span class="small muted">Prossimo</span>
        <div class="card flush list inner"><PlannedRow item={upcoming} showDate /></div>
      {/if}
      <span class="small muted">Se ti va di allenarti</span>
      <div class="chips tpls" role="group" aria-label="Modello">
        {#each templates as t (t.id)}
          <button class="chip tpl" data-color={t.color} aria-pressed="false" onclick={() => (chosen = t.id)}>{t.name}</button>
        {/each}
      </div>
      {#if !plan}
        <button class="btn ghost" onclick={() => ui.open('plan', { fresh: true })}>Crea un piano</button>
      {/if}
    </section>
  {/if}

  {#if others.length}
    <section class="section">
      <h2 class="heading">Anche oggi</h2>
      <div class="card flush list">
        {#each others as item (item.key)}<PlannedRow {item} />{/each}
      </div>
    </section>
  {/if}

  {#if near.length && !testToday}
    <section class="card near">
      <div class="spread">
        <strong>Obiettivi vicini</strong>
        <button class="btn ghost small" onclick={() => startTest(near.map((n) => n.ex))}>Test ora</button>
      </div>
      {#each near as n (n.ex)}
        {@const ex = app.catalog.exercise(n.ex)}
        <button class="prop" onclick={() => ui.open('exercise', { id: n.ex })}>
          <Medal tier={n.goal.tier} on={false} half={n.goal.half} size={18} />
          <span class="grow">
            <strong>{ex.name}</strong>
            <span class="small muted block">{goalText(ex, n.goal)}</span>
          </span>
        </button>
      {/each}
    </section>
  {/if}

  {#if focus}
    <button class="card focus" onclick={() => ui.open('event', { id: focus.eventId })}>
      <span class="small muted">Da correggere · {fmtShort(focus.date)}</span>
      <span class="what">
        <strong>{app.strokeName(focus.stroke)}</strong>{#if focus.error}<span class="muted"> · {app.errorName(focus.error)}</span>{/if}
      </span>
      {#if focus.exercise}
        <span class="small muted">→ {exerciseLabel(focus.exercise, app.catalog)}</span>
      {/if}
    </button>
  {/if}

  {#if session}
    <section class="section">
      <ol class="plan">
        {#each session.steps as step (step.id)}
          {#if step.kind === 'pause'}
            <li class="pause"><span class="mono min">{step.minutes}′</span><span class="small faint">Pausa</span></li>
          {:else}
            <li>
              <span class="mono min">{step.minutes}′</span>
              <div class="what">
                {#if step.kind === 'exercise'}
                  {@const ex = app.catalog.exercise(step.ex)}
                  <button class="name" onclick={() => ui.open('exercise', { id: step.ex })}>
                    <span class="grow">
                      {#if step.track}<span class="small muted lvl">{app.catalog.track(step.track)?.short}</span>{/if}
                      <strong>{step.name}</strong>
                    </span>
                    <MedalRow exercise={ex} medals={app.medals[step.ex]} />
                  </button>
                {:else}
                  <strong class="name">{step.name}</strong>
                {/if}
                <StepBody {step} />
              </div>
            </li>
          {/if}
        {/each}
      </ol>
    </section>
  {/if}
</div>

<style>
  .strip {
    margin-top: 20px;
  }
  section.card,
  .card.focus {
    margin-top: 16px;
  }
  .strip + section.card {
    margin-top: 24px;
  }

  .session {
    display: flex;
    flex-direction: column;
    gap: 16px;
    border-left: 3px solid var(--c);
  }
  .session .top {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tpls {
    gap: 6px;
  }
  .chip.tpl {
    min-height: 32px;
    padding: 4px 12px;
    font-size: 13px;
  }
  .chip.tpl[aria-pressed='true'] {
    background: var(--c);
    color: #fff;
    box-shadow: inset 0 0 0 1px var(--c);
  }
  .rest .inner {
    border-radius: var(--r-s);
  }
  .offer {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border-color: color-mix(in srgb, var(--up) 40%, var(--line));
  }
  .offer .actions {
    margin-top: 8px;
    flex-wrap: wrap;
  }
  .badge.up {
    background: var(--up-soft);
    color: var(--up);
  }
  .props {
    list-style: none;
    margin: -4px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .prop {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 9px 0;
    text-align: left;
    border-top: 1px solid var(--line);
  }
  .props li:first-child .prop {
    border-top: 0;
  }
  .near {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
  }
  .near .prop:first-of-type {
    border-top: 0;
  }
  .block {
    display: block;
  }
  .actions {
    display: flex;
    gap: 10px;
  }

  .resume,
  .pause {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
  }
  .resume {
    background: var(--accent-soft);
    border-color: transparent;
  }
  .badge {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--sunk);
    color: var(--ink-2);
  }
  strong {
    font-weight: 580;
  }

  .focus {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 100%;
    text-align: left;
    padding: 14px 18px;
    border-left: 3px solid var(--accent);
    transition: transform 0.2s var(--ease);
  }
  .focus:active {
    transform: scale(0.99);
  }
  .focus .what {
    font-size: 16px;
  }


  .plan {
    list-style: none;
    margin: 0;
    padding: 0;
    position: relative;
  }
  .plan::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 14px;
    bottom: 24px;
    width: 1px;
    background: var(--line);
  }
  .plan li {
    position: relative;
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: 16px;
    padding-bottom: 26px;
  }
  .plan li.pause {
    align-items: center;
    padding-bottom: 18px;
    margin-top: -8px;
  }
  .min {
    align-self: start;
    padding: 3px 0;
    text-align: center;
    font-size: 12px;
    color: var(--ink-2);
    background: var(--paper);
  }
  .plan .what {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    font-size: 16px;
    line-height: 1.3;
  }
  .lvl {
    display: block;
  }
</style>
