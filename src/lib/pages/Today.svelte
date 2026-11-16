<script>
  // «Oggi»: la sessione che tocca, già composta al livello di ogni percorso.
  import Play from '@lucide/svelte/icons/play';
  import Lock from '@lucide/svelte/icons/lock';
  import Check from '@lucide/svelte/icons/check';
  import Coffee from '@lucide/svelte/icons/coffee';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { loadLive, clearLive } from '../store/live.js';
  import { weekAt, nextSlot, weekSessions, gatePending, insertWeek, removeWeek } from '../engine/plan.js';
  import { composeSession, countTests } from '../engine/compose.js';
  import { lastFocus } from '../engine/stats.js';
  import { OUTCOME } from '../engine/levels.js';
  import { TRACKS, TRACK_IDS, exerciseLabel } from '../data/program.js';
  import { fmtLong, fmtRelative, fmtShort } from '../util/dates.js';
  import PageHead from '../ui/PageHead.svelte';
  import WeekStrip from '../ui/WeekStrip.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Dots from '../ui/Dots.svelte';
  import StepBody from '../ui/StepBody.svelte';
  import Avatar from '../ui/Avatar.svelte';

  const plan = $derived(app.plan);
  const week = $derived(app.week);
  const due = $derived(nextSlot(app.events, week));
  const done = $derived(weekSessions(app.events, week));
  const gateAsk = $derived(plan && week ? gatePending(plan, week, app.tracks, app.events) : false);

  let chosen = $state(null);

  function nextTraining(from) {
    for (let i = from; i < plan.weeks.length; i++) if (plan.weeks[i] !== 'P') return weekAt(plan, i);
    return null;
  }

  // Quale settimana e quale sessione mostrare.
  const target = $derived.by(() => {
    if (!plan || gateAsk) return null;
    if (app.phase === 'before') return { week: weekAt(plan, 0), slot: chosen ?? 'A', upcoming: true };
    if (app.phase !== 'active' || !week) return null;
    if (week.kind !== 'P' && due) return { week, slot: chosen ?? due, upcoming: false };
    const next = nextTraining(week.idx + 1);
    return next ? { week: next, slot: chosen ?? 'A', upcoming: true } : null;
  });
  const session = $derived(target ? composeSession({ week: target.week, slot: target.slot, tracks: app.tracks }) : null);
  const tests = $derived(session ? countTests(session) : 0);
  const focus = $derived(lastFocus(app.events));

  // Esiti dei test della sessione B di questa settimana.
  const outcomes = $derived.by(() => {
    if (!done.B) return [];
    const out = [];
    for (const id of TRACK_IDS) {
      for (const h of app.tracks[id].history) {
        if (h.eventId === done.B.id && h.type !== 'placement') out.push({ ...h, track: id });
      }
    }
    return out;
  });

  let draft = $state(null);
  $effect(() => {
    ui.live; // si rilegge quando la sessione dal vivo si apre o si chiude
    draft = app.user ? loadLive(app.user.uid) : null;
  });

  const head = $derived.by(() => {
    if (!plan) return { title: 'Nessun piano', sub: '' };
    if (app.phase === 'before') return { title: 'Si comincia', sub: fmtLong(plan.start) };
    if (app.phase === 'done') return { title: 'Ciclo completato', sub: '' };
    if (week.kind === 'P') return { title: 'Pausa', sub: 'Questa settimana si riposa' };
    if (week.kind === 'R') return { title: 'Recupero', sub: 'Aperture su taglio' };
    return { title: `Settimana ${week.number}`, sub: `${week.block.label} · ${week.block.theme}` };
  });

  function startLive() {
    ui.live = { slot: target.slot, date: app.today, monday: target.week.monday };
  }

  function log() {
    ui.open('event', { draft: { kind: target.slot, date: app.today } });
  }

  function pickPartner() {
    ui.open('pick', {
      title: 'Con chi ti alleni?',
      value: app.settings.partner,
      groups: [
        {
          options: [
            { id: null, label: 'Nessuno' },
            ...app.mates.map((m) => ({ id: m.id, label: m.name }))
          ]
        }
      ],
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
        <strong>Sessione {draft.slot} in corso</strong>
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

  {#if !plan}
    <section class="card stack g-16">
      <p class="muted">Imposta i giorni di allenamento e la data di inizio: l'app prepara le sessioni.</p>
      <button class="btn primary" onclick={() => ui.open('plan', { fresh: true })}>Crea il piano</button>
    </section>
  {:else if app.phase === 'done'}
    <section class="card stack g-16">
      <p class="muted">Dodici settimane. I livelli a cui sei arrivato sono il punto di partenza del prossimo ciclo.</p>
      <div class="stack g-12">
        {#each TRACK_IDS as id (id)}
          {@const t = app.tracks[id]}
          <button class="final" onclick={() => ui.open('track', { id })}>
            <span class="grow">{TRACKS[id].short}</span>
            <Dots level={t.level} started={t.started} completed={t.completed} />
          </button>
        {/each}
      </div>
      <button class="btn primary" onclick={() => ui.open('plan', { fresh: true })}>Nuovo ciclo <ArrowRight size={18} /></button>
    </section>
  {:else if gateAsk}
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
            <span>{TRACKS[g.track].short}</span>
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
  {:else if app.phase === 'active' && week.kind === 'P'}
    <section class="card pause">
      <span class="badge"><Coffee size={18} /></span>
      <p class="grow muted">Il ciclo riprende {fmtLong(weekAt(plan, week.idx + 1)?.monday ?? week.sunday)}.</p>
      <button class="btn ghost small" onclick={() => app.setPlan(removeWeek(plan, week.idx))}>Riprendi ora</button>
    </section>
  {:else if app.phase === 'active' && !due}
    <section class="card complete">
      <span class="badge ok"><Check size={18} strokeWidth={2.4} /></span>
      <div class="grow stack g-8">
        <strong>Settimana completata</strong>
        {#if outcomes.length}
          <div class="chips">
            {#each outcomes as o (o.track + o.type)}
              <span class="tag {OUTCOME[o.outcome].tone}">
                {TRACKS[o.track].short} · {o.score}
                {o.outcome === 'sali' ? `↑ L${o.after}` : o.outcome === 'scendi' ? `↓ L${o.after}` : o.outcome === 'completato' ? '✓' : ''}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  {#if session}
    <section class="card session">
      <div class="spread top">
        <div>
          {#if target.upcoming}<p class="small muted">Prossima</p>{/if}
          <h2 class="title">Sessione {target.slot}</h2>
          <p class="muted">
            {fmtRelative(target.week.dates[target.slot], app.today)} · {session.minutes} min{tests ? ` · ${tests} test` : ''}
          </p>
        </div>
        <Segmented
          small
          options={[
            { id: 'A', label: !target.upcoming && done.A ? 'A ✓' : 'A' },
            { id: 'B', label: 'B' }
          ]}
          value={target.slot}
          onchange={(v) => (chosen = v)}
        />
      </div>
      <div class="actions">
        <button class="btn accent grow" onclick={startLive}><Play size={18} fill="currentColor" /> Inizia</button>
        <button class="btn ghost" onclick={log}>Registra</button>
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

    {#if focus}
      <button class="card focus" onclick={() => ui.open('event', { id: focus.eventId })}>
        <span class="small muted">Da correggere · {fmtShort(focus.date)}</span>
        <span class="what">
          <strong>{app.strokeName(focus.stroke)}</strong>{#if focus.error}<span class="muted"> · {app.errorName(focus.error)}</span>{/if}
        </span>
        {#if focus.exercise}
          <span class="small muted">→ {exerciseLabel(focus.exercise)}</span>
        {/if}
      </button>
    {/if}

    <section class="section">
      <ol class="plan">
        {#each session.steps as step (step.id + target.slot)}
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
                  <Dots level={step.level} started={!step.placement} completed={app.tracks[step.track].completed} />
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
</div>

<style>
  .strip {
    margin-top: 20px;
  }
  section.card,
  .card.focus {
    margin-top: 20px;
  }
  .strip + section.card {
    margin-top: 24px;
  }

  .session {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .session .top {
    align-items: flex-start;
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
  .pause,
  .complete {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
  }
  .resume {
    background: var(--accent-soft);
    border-color: transparent;
  }
  .complete {
    align-items: flex-start;
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
  .badge.ok {
    background: var(--up-soft);
    color: var(--up);
    animation: pop 0.5s var(--spring) both;
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

  .final {
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
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
