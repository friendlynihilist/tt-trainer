<script>
  // «Oggi»: quello che c'è in calendario, già composto al livello di ogni percorso.
  // Se oggi non c'è niente: il prossimo appuntamento e una sessione su misura, se ti va.
  import Play from '@lucide/svelte/icons/play';
  import Lock from '@lucide/svelte/icons/lock';
  import Coffee from '@lucide/svelte/icons/coffee';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Gauge from '@lucide/svelte/icons/gauge';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { loadLive, clearLive } from '../store/live.js';
  import { startItem, logItem, weekOf } from '../store/actions.js';
  import { weekAt, gatePending, insertWeek, removeWeek } from '../engine/plan.js';
  import { agenda } from '../engine/events.js';
  import { composeSession, composeTest, countTests } from '../engine/compose.js';
  import { suggestSession, testPlan } from '../engine/suggest.js';
  import { lastFocus } from '../engine/stats.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { templateMinutes } from '../data/templates.js';
  import { addDays, fmtLong, fmtRelative, fmtShort } from '../util/dates.js';
  import PageHead from '../ui/PageHead.svelte';
  import WeekStrip from '../ui/WeekStrip.svelte';
  import Dots from '../ui/Dots.svelte';
  import StepBody from '../ui/StepBody.svelte';
  import Avatar from '../ui/Avatar.svelte';
  import PlannedRow from '../ui/PlannedRow.svelte';
  import EventRow from '../ui/EventRow.svelte';

  const plan = $derived(app.plan);
  const week = $derived(app.week);
  const gateAsk = $derived(plan && week ? gatePending(plan, week, app.tracks, app.events) : false);

  const days = $derived(agenda(plan, app.events, app.planned, app.today, addDays(app.today, 28), app.catalog));
  const todayInfo = $derived(days.get(app.today) ?? { todo: [], done: [] });
  const todo = $derived(todayInfo.todo);
  const testToday = $derived(todo.find((x) => x.kind === 'test') ?? null);
  const trainingToday = $derived(todo.find((x) => x.kind === 'training') ?? null);
  const primary = $derived(trainingToday ?? testToday);
  const others = $derived(todo.filter((x) => x !== primary && !(trainingToday && x === testToday)));
  const upcoming = $derived.by(() => {
    for (const [d, v] of [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (d > app.today && v.todo.length) return v.todo[0];
    }
    return null;
  });

  // Il modello si può cambiare al volo, o lasciare comporre al suggeritore.
  let chosen = $state(null);
  let autoMinutes = $state(90);
  const weekToday = $derived(weekOf(app.today));
  const auto = $derived(suggestSession({ week: weekToday, events: app.events, tracks: app.tracks, catalog: app.catalog, minutes: autoMinutes, date: app.today }));
  const templateId = $derived(chosen ?? trainingToday?.template ?? null);
  const template = $derived(templateId === 'auto' ? auto.template : templateId ? app.catalog.template(templateId) : null);
  const session = $derived(template ? composeSession({ week: weekToday, template, tracks: app.tracks, catalog: app.catalog, test: Boolean(testToday) }) : null);
  const testOnly = $derived(!trainingToday && testToday ? testPlan({ week: weekToday, events: app.events, tracks: app.tracks, catalog: app.catalog }) : null);
  const testSession = $derived(testOnly ? composeTest({ week: weekToday, trackIds: testOnly.trackIds, tracks: app.tracks, catalog: app.catalog }) : null);
  const tests = $derived(session ? countTests(session) : 0);
  const due = $derived(auto.due);
  const focus = $derived(lastFocus(app.events));
  const templates = $derived(Object.values(app.catalog.templates));

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

  function startToday() {
    if (trainingToday || chosen) startItem(trainingToday ?? null, { template });
    else if (testToday) startItem(testToday);
  }

  function logToday() {
    if (trainingToday) logItem({ ...trainingToday, template: templateId === 'auto' ? trainingToday.template : (templateId ?? trainingToday.template) });
    else if (testToday) logItem(testToday);
    else ui.open('event', { draft: { kind: 'training', template: templateId === 'auto' ? 'auto' : templateId, date: app.today } });
  }

  function saveAuto() {
    ui.open('template', { draft: { ...auto.template, id: undefined, name: 'Su misura', auto: undefined, hidden: undefined } });
  }

  function pickPartner() {
    ui.open('pick', {
      title: 'Con chi ti alleni?',
      value: app.settings.partner,
      groups: [{ options: [{ id: null, label: 'Nessuno' }, ...app.mates.map((m) => ({ id: m.id, label: m.name }))] }],
      onpick: (id) => app.patchSettings({ partner: id })
    });
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

  {#if gateAsk}
    <section class="card stack g-16 gate">
      <div class="row g-12">
        <span class="badge"><Lock size={18} /></span>
        <div>
          <h2 class="title">Il mese 3 aspetta</h2>
          <p class="muted small">Servono le due aperture su taglio almeno al livello {app.gate.minLevel}.</p>
        </div>
      </div>
      <div class="stack g-12">
        {#each app.gate.items as g (g.track)}
          <div class="spread">
            <span>{app.catalog.track(g.track).short}</span>
            <span class="row g-8">
              <Dots level={g.level || 1} started={g.level > 0} />
              <span class="tag" class:up={g.ok}>{g.ok ? 'ok' : g.level ? `L${g.level}` : 'da iniziare'}</span>
            </span>
          </div>
        {/each}
      </div>
      <div class="stack g-8">
        <button class="btn primary" onclick={() => app.setPlan(insertWeek(plan, week.idx, 'R'))}>Una settimana di recupero</button>
        <button class="btn plain" onclick={() => app.setPlan({ ...plan, gateOk: true })}>Comincia comunque il mese 3</button>
      </div>
    </section>
  {:else if plan && app.phase === 'done'}
    <section class="card stack g-16">
      <p class="muted">Ciclo finito. I livelli a cui sei arrivato sono il punto di partenza del prossimo.</p>
      <button class="btn primary" onclick={() => ui.open('plan', { fresh: true })}>Nuovo ciclo <ArrowRight size={18} /></button>
    </section>
  {:else if plan && app.phase === 'active' && week.kind === 'P' && !todo.length}
    <section class="card pause">
      <span class="badge"><Coffee size={18} /></span>
      <p class="grow muted">Il ciclo riprende {fmtLong(weekAt(plan, week.idx + 1, app.catalog)?.monday ?? week.sunday)}.</p>
      <button class="btn ghost small" onclick={() => app.setPlan(removeWeek(plan, week.idx))}>Riprendi ora</button>
    </section>
  {/if}

  {#if !gateAsk}
    {#if primary && (session || testSession)}
      <section class="card session" data-color={trainingToday ? (template?.color ?? 'blue') : 'orange'}>
        <div class="top">
          <span class="small muted">In calendario oggi</span>
          <h2 class="title">{trainingToday ? template.name : 'Test'}</h2>
          <p class="muted">
            {#if trainingToday}
              {session.minutes} min{tests ? ` · ${tests} test` : ''}{testToday ? ' · c’è il test' : ''}
            {:else}
              {testSession.steps.map((x) => x.name).join(' · ')}
            {/if}
          </p>
        </div>
        {#if trainingToday}
          <div class="chips tpls" role="group" aria-label="Modello">
            {#each templates as t (t.id)}
              <button class="chip tpl" data-color={t.color} aria-pressed={templateId === t.id} onclick={() => (chosen = t.id)}>{t.name}</button>
            {/each}
            <button class="chip tpl" data-color="plum" aria-pressed={templateId === 'auto'} onclick={() => (chosen = 'auto')}><Sparkles size={14} /> Su misura</button>
          </div>
        {/if}
        <div class="actions">
          <button class="btn accent grow" onclick={startToday}><Play size={18} fill="currentColor" /> Inizia</button>
          <button class="btn ghost" onclick={logToday}>Registra</button>
        </div>
        {#if app.cloud && app.mates.length}
          <button class="mate" onclick={pickPartner}>
            {#if app.partner}
              <Avatar name={app.partner.name} photo={app.partner.photo} size={22} />
              <span class="grow">Con {app.partner.name.split(/\s+/)[0]}</span>
            {:else}
              <span class="grow muted">Scegli il compagno</span>
            {/if}
            <ChevronRight size={16} />
          </button>
        {/if}
      </section>
    {:else if !draft}
      <section class="card stack g-12 rest">
        {#if todayInfo.done.length}
          <strong>Oggi hai già fatto</strong>
          <div class="card flush list inner">
            {#each todayInfo.done as e (e.id)}<EventRow event={e} showDate={false} />{/each}
          </div>
        {:else}
          <p class="muted">{plan ? 'Oggi niente in calendario.' : 'Nessun piano: l’app compone comunque la sessione al tuo livello.'}</p>
        {/if}
        {#if upcoming}
          <span class="small muted">Prossimo</span>
          <div class="card flush list inner"><PlannedRow item={upcoming} showDate /></div>
        {/if}
        {#if !plan}
          <button class="btn ghost" onclick={() => ui.open('plan', { fresh: true })}>Crea un piano</button>
        {/if}
      </section>

      <section class="card session" data-color="plum">
        <div class="top">
          <span class="small muted row g-6"><Sparkles size={14} /> Se ti va di allenarti</span>
          <h2 class="title">Su misura</h2>
          <div class="chips mins">
            {#each [45, 60, 90, 120] as m (m)}
              <button class="chip" aria-pressed={autoMinutes === m} onclick={() => (autoMinutes = m)}>{m} min</button>
            {/each}
          </div>
        </div>
        {#if auto.reasons.length}
          <ul class="reasons small muted">
            {#each auto.reasons as r (r)}<li>{r}</li>{/each}
          </ul>
        {/if}
        <div class="actions">
          <button
            class="btn accent grow"
            onclick={() => {
              chosen = 'auto';
              startItem(null, { template: auto.template });
            }}><Play size={18} fill="currentColor" /> Inizia</button
          >
          <button class="btn ghost" onclick={saveAuto}>Salva come modello</button>
        </div>
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

    {#if due.length && !testToday}
      <section class="card due">
        <span class="badge"><Gauge size={18} /></span>
        <div class="grow stack g-4">
          <strong>Da misurare</strong>
          <span class="small muted">{due.slice(0, 3).map((d) => `${app.catalog.track(d.track).short}: ${d.reason}`).join(' · ')}</span>
        </div>
        <button class="btn ghost small" onclick={() => startItem({ kind: 'test' })}>Test ora</button>
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

    {#if (primary && (session || testSession)) || (!primary && !draft)}
      {@const shown = primary ? (session ?? testSession) : composeSession({ week: weekToday, template: auto.template, tracks: app.tracks, catalog: app.catalog })}
      <section class="section">
        <ol class="plan">
          {#each shown.steps as step (step.id)}
            <li>
              <span class="mono min">{step.minutes}′</span>
              <div class="what">
                {#if step.kind === 'exercise'}
                  <button class="name" onclick={() => ui.open('track', { id: step.track })}>
                    <span class="grow">
                      <strong>{step.name}</strong>
                      <span class="small muted lvl">
                        {step.placement ? 'Da iniziare' : `Livello ${step.level} · ${step.exercise.name}`}
                      </span>
                    </span>
                    <Dots level={step.level} max={step.max} started={!step.placement} completed={app.tracks[step.track].completed} />
                  </button>
                {:else}
                  <strong class="name">{step.name}</strong>
                {/if}
                <StepBody {step} partner={app.partner} />
              </div>
            </li>
          {/each}
        </ol>
      </section>
    {/if}
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
  .tpls,
  .mins {
    gap: 6px;
  }
  .mins {
    margin-top: 8px;
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
  .mins .chip {
    min-height: 30px;
    padding: 4px 12px;
    font-size: 13px;
  }
  .reasons {
    margin: -4px 0 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rest .inner {
    border-radius: var(--r-s);
  }
  .due {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
  }
  .actions {
    display: flex;
    gap: 10px;
  }
  .mate {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: -4px -6px -6px;
    padding: 8px 6px;
    border-top: 1px solid var(--line);
    padding-top: 14px;
    font-size: 14px;
    color: var(--ink-2);
    text-align: left;
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
