<script>
  // «Oggi», dal generale al particolare: in alto la tappa («Dritto», il dettaglio in un foglio), poi
  // l'allenamento di oggi con un solo pulsante grande, la settimana, le medaglie (quelle prese oggi
  // e una da prendere). Sotto il pulsante una riga sola apre il foglio dell'allenamento: lì ci sono
  // i blocchi, si cambia ogni esercizio, si sceglie un altro allenamento o si registra senza timer.
  // Niente è bloccato e tutto si può cambiare.
  import Coffee from '@lucide/svelte/icons/coffee';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Shuffle from '@lucide/svelte/icons/shuffle';
  import PencilLine from '@lucide/svelte/icons/pencil-line';
  import Target from '@lucide/svelte/icons/target';
  import Crosshair from '@lucide/svelte/icons/crosshair';
  import Trash from '@lucide/svelte/icons/trash-2';
  import Save from '@lucide/svelte/icons/save';
  import Timer from '@lucide/svelte/icons/timer';
  import Play from '@lucide/svelte/icons/play';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { loadLive, clearLive } from '../store/live.js';
  import { startItem, logItem, weekOf, proposalFor } from '../store/actions.js';
  import { weekAt, removeWeek, stageInfo, stagePeriod, stageLength } from '../engine/plan.js';
  import { agenda } from '../engine/events.js';
  import { composeSession, templateWithOverrides } from '../engine/compose.js';
  import { packagesOf } from '../data/packages.js';
  import { pickExercise, pickTemplate } from '../ui/pickers.js';
  import { nearGoals, currentInSequence } from '../engine/player.js';
  import { nextGoal, shortValue, measureLabel, goalText } from '../engine/medals.js';
  import { lastFocus } from '../engine/stats.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { PLAYER_LEVEL, TIER, TIERS } from '../data/library.js';
  import { addDays, fmtLong, fmtRelative, fmtShort } from '../util/dates.js';
  import { sessionBlocks, stepFamily, blockFamily, MEASURE_ICON } from '../ui/design.js';
  import PageHead from '../ui/PageHead.svelte';
  import PlannedRow from '../ui/PlannedRow.svelte';
  import EventRow from '../ui/EventRow.svelte';
  import BigButton from '../ui/BigButton.svelte';
  import Brick from '../ui/Brick.svelte';
  import MedalRing from '../ui/MedalRing.svelte';
  import MedalBadge from '../ui/MedalBadge.svelte';
  import LevelBadge from '../ui/LevelBadge.svelte';
  import WeekDays from '../ui/WeekDays.svelte';
  import StageProgress from '../ui/StageProgress.svelte';
  import FamilyIcon from '../ui/FamilyIcon.svelte';
  import Sheet from '../ui/Sheet.svelte';

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

  // Il modello si può cambiare al volo. Senza niente in calendario si propone un pacchetto del tuo livello.
  let chosen = $state(null);
  // Gli esercizi cambiati prima di iniziare: valgono solo per questa sessione.
  let overrides = $state({});
  const fallback = $derived.by(() => {
    const list = packagesOf(app.player.level);
    return list.find((t) => t.id.endsWith('-60')) ?? list[0] ?? null;
  });
  const weekToday = $derived(weekOf(app.today));
  const templateId = $derived(chosen ?? trainingToday?.template ?? fallback?.id ?? null);
  const template = $derived(templateId ? app.catalog.template(templateId) : null);
  const session = $derived(template ? composeSession({ week: weekToday, template, catalog: app.catalog, medals: app.medals, overrides }) : null);
  const blocks = $derived(sessionBlocks(session, app.catalog));
  const changed = $derived(Object.keys(overrides).length > 0);
  const proposal = $derived(testToday ? proposalFor(app.today) : []);
  const focus = $derived(lastFocus(app.events));
  const offer = $derived(app.levelOffer);
  const inCalendar = $derived(Boolean(trainingToday) && !chosen);

  // Le medaglie prese oggi: per ogni esercizio la più alta.
  const wonToday = $derived.by(() => {
    const out = [];
    for (const [id, m] of Object.entries(app.medals)) {
      const ex = app.catalog.exercise(id);
      if (!ex) continue;
      const tier = [...TIERS].reverse().find((t) => m[t] === app.today);
      if (tier) out.push({ ex, tier, half: false });
      else if (m.half === app.today && !m.O) out.push({ ex, tier: 'O', half: true });
    }
    return out;
  });

  // La tappa in corso, in breve: il tema, a che punto sei, i percorsi. Il resto nel foglio.
  const stage = $derived(plan ? stageInfo(plan, app.today, app.catalog) : null);
  // Il periodo della tappa in tempo relativo: «Questo mese», «Questa settimana», «Oggi»…
  const period = $derived.by(() => {
    const st = stage?.stages[stage.current];
    return st ? stagePeriod(st, { isToday: st.start === app.today }) : { title: 'Questo mese', of: 'di questo mese', noun: 'Mese' };
  });
  // Una medaglia da prendere, con il perché: prima una vicina che è nell'allenamento di oggi, poi
  // una vicina dei percorsi del mese, poi la più vicina, poi l'esercizio del mese.
  const near = $derived(nearGoals({ medals: app.medals, catalog: app.catalog, max: 10 }));
  const sessionExs = $derived(new Set((session?.steps ?? []).filter((s) => s.ex).map((s) => s.ex)));
  const monthExs = $derived((week?.focusBlock?.tracks ?? []).map((t) => currentInSequence(t, app.catalog, app.medals)).filter(Boolean));
  const suggested = $derived.by(() => {
    const monthSeq = new Set((week?.focusBlock?.tracks ?? []).flatMap((t) => app.catalog.sequence(t)));
    const pick =
      near.find((n) => sessionExs.has(n.ex)) ??
      near.find((n) => monthSeq.has(n.ex)) ??
      near[0] ??
      (monthExs[0] ? { ex: monthExs[0] } : null);
    const ex = pick && app.catalog.exercise(pick.ex);
    const goal = ex && nextGoal(ex, app.medals[ex.id]);
    if (!goal) return null;
    const inSession = sessionExs.has(ex.id);
    const why = inSession ? 'È nell’allenamento di oggi' : near.some((n) => n.ex === ex.id) ? 'Ti manca poco' : `È l’esercizio ${period.of}`;
    return { ex, goal, inSession, why, best: app.medals[ex.id]?.best ?? null };
  });

  let draft = $state(null);
  $effect(() => {
    ui.live; // si rilegge quando la sessione dal vivo si apre o si chiude
    draft = app.user ? loadLive(app.user.uid) : null;
  });

  let sheet = $state(false);

  const dateLabel = $derived(fmtLong(app.today));

  const monthInfo = $derived.by(() => {
    if (!plan || !stage || app.phase === 'done') return null;
    // La famiglia (colore e icona) è quella dell'esercizio di adesso nel primo percorso.
    const famOf = (block) => blockFamily(block, app.catalog, app.medals, currentInSequence);
    const trackNames = (block) => (block?.tracks ?? []).map((id) => app.catalog.track(id)?.short).filter(Boolean).join(', ');
    if (app.phase === 'before') {
      const first = stage.stages.find((st) => st.block);
      return first ? { label: `Da ${fmtLong(first.start ?? plan.start)}`, theme: first.block.theme, fam: famOf(first.block), where: stageLength(first), tracks: trackNames(first.block), p: null } : null;
    }
    const now = stage.stages[stage.current];
    if (!now || now.b === 'P') return null;
    const block = now.block ?? week?.focusBlock;
    if (!block) return null;
    const p = stage.progress;
    const where =
      p.unit === 's' ? (p.of === 1 ? (now.start === app.today ? 'Un allenamento solo' : `Un allenamento solo, ${fmtShort(now.start)}`) : `Allenamento ${p.pos} di ${p.of}`) : p.pos === 0 ? `Comincia ${fmtLong(p.startsOn)}` : `Settimana ${p.pos} di ${p.of}`;
    return { label: period.title, theme: block.theme, fam: famOf(block), where, tracks: trackNames(block), p };
  });

  function choose(id) {
    if (id === templateId) return;
    chosen = id;
    overrides = {};
  }
  function moreTemplates() {
    pickTemplate({ value: templateId, onpick: (id) => id && choose(id) });
  }
  function change(step) {
    pickExercise({
      title: 'Cambia esercizio',
      value: step.ex,
      family: app.catalog.exercise(step.ex)?.family,
      variantsOf: step.ex,
      onpick: (id) => id && id !== step.ex && (overrides = { ...overrides, [step.id]: id })
    });
  }
  function saveMine() {
    const t = app.saveCustom('templates', { ...templateWithOverrides(template, overrides), name: `${template.name} (mio)` });
    chosen = t.id;
    overrides = {};
    ui.toast(`«${t.name}» è tra i tuoi allenamenti`);
  }
  function resetChanges() {
    overrides = {};
  }

  function startTraining() {
    sheet = false;
    startItem(trainingToday ?? null, { template, overrides });
  }
  function logTraining() {
    sheet = false;
    if (trainingToday) logItem({ ...trainingToday, template: templateId ?? trainingToday.template });
    else ui.open('event', { draft: { kind: 'training', template: templateId, date: app.today } });
  }
  function startTest(exercises = null) {
    startItem(testToday ?? { kind: 'test' }, { exercises });
  }
  function discard() {
    clearLive(app.user.uid);
    draft = null;
  }
</script>

<div class="page enter today">
  <PageHead title="Oggi" sub={dateLabel} />

  <!-- La tappa: «Questo mese · Dritto» in grande, come un promemoria. Il dettaglio si apre toccandolo. -->
  {#if monthInfo}
    <section class="mantra">
      <button class="m-main" data-fam={monthInfo.fam} onclick={() => ui.open('stage')}>
        <span class="t-caps m-label">{monthInfo.label}</span>
        <span class="m-head">
          <span class="m-ico"><FamilyIcon fam={monthInfo.fam} size={34} /></span>
          <span class="m-theme">{monthInfo.theme}</span>
          <span class="m-chev"><ChevronRight size={24} strokeWidth={2.6} /></span>
        </span>
        <!-- A che punto sei e i percorsi: due righe, due stili, perché sono due cose diverse. -->
        <span class="m-where">
          {#if monthInfo.p && (monthInfo.p.unit === 'w' || monthInfo.p.of > 1)}<span class="m-prog"><StageProgress unit={monthInfo.p.unit} pos={monthInfo.p.pos} of={monthInfo.p.of} small /></span>{/if}
          <span>{monthInfo.where}</span>
        </span>
        {#if monthInfo.tracks}<span class="m-tracks">{monthInfo.tracks}</span>{/if}
      </button>
    </section>
  {:else if !plan}
    <section class="note-card">
      <p class="grow muted">Non hai ancora un piano: scegli su cosa lavorare e in quali giorni.</p>
      <button class="btn primary small" onclick={() => ui.open('plan', { fresh: true })}>Crea il piano</button>
    </section>
  {/if}

  {#if offer}
    <section class="offer" data-level={offer.level}>
      <LevelBadge level={offer.level} small />
      <strong class="t-name">Sei pronto per il livello {PLAYER_LEVEL[offer.level].name.toLowerCase()}?</strong>
      <span class="small muted">Argento in {offer.progress.coverage.have} esercizi chiave su {offer.progress.coverage.total}, oro in {offer.progress.solidity.have}.</span>
      <div class="row g-8">
        <button class="btn primary small" onclick={() => app.setPlayerLevel(offer.level, 'proposto')}>Sì, passo</button>
        <button class="btn plain small" onclick={() => app.declineLevel(offer.level)}>Non ora</button>
      </div>
    </section>
  {/if}

  {#if plan && app.phase === 'done'}
    <section class="note-card">
      <p class="muted">Ciclo finito. Medaglie e livello restano.</p>
      <button class="btn primary small" onclick={() => ui.open('plan', { fresh: true })}>Nuovo ciclo <ArrowRight size={16} /></button>
    </section>
  {:else if plan && app.phase === 'active' && week.kind === 'P' && !todo.length}
    <section class="note-card">
      <span class="badge"><Coffee size={18} /></span>
      <p class="grow muted">Si riprende {fmtLong(weekAt(plan, week.idx + 1, app.catalog)?.monday ?? week.sunday)}.</p>
      <button class="btn ghost small" onclick={() => app.setPlan(removeWeek(plan, week.idx))}>Riprendi ora</button>
    </section>
  {/if}

  <!-- Il pulsante grande -->
  {#if draft && !ui.live}
    <section class="hero">
      <span class="t-caps label">Sessione a metà</span>
      <BigButton verb="Riprendi" sub="{draft.title ?? `Sessione ${draft.slot}`} · {fmtRelative(draft.date)}" icon={RotateCcw} onclick={() => (ui.live = { resume: true })} />
      <button class="quiet" onclick={discard}><Trash size={18} /> Scarta questa sessione</button>
    </section>
  {:else if testToday && !trainingToday}
    <section class="hero">
      <span class="t-caps label">In calendario oggi</span>
      <BigButton verb="Inizia il test" sub={proposal.length ? `${proposal.length} esercizi da misurare` : 'Scegli tu cosa misurare'} icon={Target} onclick={() => startTest()} />
      {#if proposal.length}
        <div class="rings">
          {#each proposal as p (p.ex)}
            {@const ex = app.catalog.exercise(p.ex)}
            <button class="ring-btn" onclick={() => ui.open('exercise', { id: p.ex })} aria-label={ex.name}>
              <MedalRing exercise={ex} medals={app.medals[p.ex]} size={40} />
            </button>
          {/each}
        </div>
      {/if}
      <button class="quiet" onclick={() => logItem(testToday)}><PencilLine size={18} /> L’ho già fatto: registra i risultati</button>
    </section>
  {:else if session}
    <section class="hero">
      <span class="t-caps label">{inCalendar ? 'In calendario oggi' : trainingToday ? 'Cambiato per oggi' : 'Fuori calendario'}</span>
      <BigButton verb="Inizia" sub={template.name} minutes={session.minutes} onclick={startTraining} />
      <button class="inside" onclick={() => (sheet = true)}>
        <span class="strip" aria-hidden="true">
          {#each blocks as b (b.key)}
            <span class="seg" data-fam={b.fam} style:flex-grow={b.minutes}></span>
          {/each}
        </span>
        <span class="inside-txt">
          <span class="inside-n">{blocks.length} {blocks.length === 1 ? 'blocco' : 'blocchi'}{#if changed}<b> · con i tuoi cambi</b>{/if}</span>
          <span class="inside-more">Vedi e cambia <ChevronRight size={16} /></span>
        </span>
      </button>
    </section>

    {#if testToday}
      <button class="test-pill raise neutral" onclick={() => startTest()}>
        <span class="tp-ico"><Target size={20} strokeWidth={2.4} /></span>
        <span class="grow">
          <strong>Test di oggi</strong>
          <span class="small muted block">{proposal.length ? `${proposal.length} esercizi da misurare` : 'Scegli tu cosa misurare'}</span>
        </span>
        <Play size={18} fill="currentColor" strokeWidth={0} />
      </button>
    {/if}
  {/if}

  {#if focus}
    <button class="focus" onclick={() => ui.open('event', { id: focus.eventId })}>
      <span class="f-ico"><Crosshair size={20} strokeWidth={2.2} /></span>
      <span class="grow">
        <span class="t-caps muted">Da correggere</span>
        <span class="block"><strong>{app.strokeName(focus.stroke)}</strong>{#if focus.error}<span class="muted"> · {app.errorName(focus.error)}</span>{/if}</span>
        {#if focus.exercise}<span class="small muted block">{exerciseLabel(focus.exercise, app.catalog)} · {fmtShort(focus.date)}</span>{/if}
      </span>
    </button>
  {/if}

  {#if !draft && !trainingToday && !testToday && (todayInfo.done.length || upcoming)}
    <section class="section">
      {#if todayInfo.done.length}
        <h2 class="heading">Oggi hai già fatto</h2>
        <div class="card flush list">
          {#each todayInfo.done as e (e.id)}<EventRow event={e} showDate={false} />{/each}
        </div>
      {:else if upcoming}
        <h2 class="heading">Prossimo</h2>
        <div class="card flush list"><PlannedRow item={upcoming} showDate /></div>
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

  <section class="section">
    <WeekDays />
  </section>

  <section class="section">
    <div class="sec-head">
      <h2 class="t-name">Medaglie</h2>
      <button class="more" onclick={() => ui.go('progressi')}>Tutte <ChevronRight size={16} /></button>
    </div>

    {#if wonToday.length}
      <div class="won">
        <span class="t-caps won-label">Prese oggi</span>
        {#each wonToday as w (w.ex.id)}
          <button class="won-row" onclick={() => ui.open('exercise', { id: w.ex.id })}>
            <MedalBadge tier={w.tier} half={w.half} size={40} label={false} />
            <span class="grow">
              <strong>{w.half ? 'Metà oro' : TIER[w.tier].name}</strong>
              <span class="small muted block">{w.ex.name}</span>
            </span>
          </button>
        {/each}
      </div>
    {/if}

    {#if suggested}
      {@const s = suggested}
      <div class="suggest" data-medal={s.goal.tier}>
        <button class="s-main" onclick={() => ui.open('exercise', { id: s.ex.id })}>
          <MedalRing exercise={s.ex} medals={app.medals[s.ex.id]} size={76} />
          <span class="grow">
            <span class="t-caps s-why">{s.why}</span>
            <strong class="t-name block">{s.ex.name}</strong>
            <span class="small block">{goalText(s.ex, s.goal)}{s.goal.half ? ', per la seconda volta' : ''}</span>
            {#if s.best != null}<span class="small muted block">Il tuo record: {shortValue(s.ex, s.best)}</span>{/if}
          </span>
        </button>
        {#if !s.inSession && !testToday}
          <button class="btn ghost small s-try" onclick={() => startTest([s.ex.id])}><Target size={16} /> Provala ora</button>
        {/if}
      </div>
    {:else if !wonToday.length}
      <p class="muted small">In sessione tocca «Prova l’obiettivo»: arriva la prima medaglia.</p>
    {/if}
  </section>
</div>

<!-- I blocchi della sessione: fuori dalla pagina, così il foglio sta sopra a tutto. -->
{#if sheet && session}
  <Sheet title={template.name} onclose={() => (sheet = false)} tall sans>
    <div class="blocks">
      <!-- In cima: scegliere un altro allenamento. Sotto, i blocchi di questo. -->
      <div class="others">
        <button class="other" onclick={moreTemplates}>
          <Shuffle size={20} />
          <span class="grow"><strong>Scegli un altro allenamento</strong></span>
          <ChevronRight size={18} />
        </button>
      </div>

      {#each blocks as b, i (b.key)}
        {@const exSteps = b.steps.filter((s) => s.ex)}
        {#if i > 0}
          <div class="gap"><Coffee size={14} /> 1 min</div>
        {/if}
        <Brick fam={b.fam} name={b.name} minutes={b.minutes} fams={b.fams} sub={b.steps.length > 1 ? `${b.steps.length} esercizi` : b.steps[0].kind === 'exercise' ? '' : b.steps[0].name !== b.name ? b.steps[0].name : ''} />
        {#if exSteps.length}
          <ul class="exs">
            {#each exSteps as s (s.id)}
              {@const ex = app.catalog.exercise(s.ex)}
              {@const MIcon = MEASURE_ICON[ex?.measure?.type]}
              <li data-fam={stepFamily(s, app.catalog)}>
                <button class="ex-open" onclick={() => ui.open('exercise', { id: s.ex })}>
                  <span class="ex-name" class:changed={overrides[s.id]}>{s.name}</span>
                  <span class="ex-meta">
                    <span><Timer size={13} /> {s.minutes} min</span>
                    {#if MIcon}<span><MIcon size={13} /> {measureLabel(ex)}</span>{/if}
                  </span>
                </button>
                {#if ex}<MedalRing exercise={ex} medals={app.medals[s.ex]} size={42} />{/if}
                {#if s.kind === 'exercise'}
                  <button class="round sm" onclick={() => change(s)} aria-label="Cambia esercizio: {s.name}"><Shuffle size={17} /></button>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      {/each}

      <!-- In fondo: registrare l'allenamento a cose fatte, senza il timer. -->
      <div class="others last">
        <button class="other" onclick={logTraining}>
          <PencilLine size={20} />
          <span class="grow"><strong>L’ho già fatto</strong><span class="small muted block">Registra com’è andata, senza il timer</span></span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
    {#snippet footer()}
      <div class="row g-8">
        {#if changed}
          <button class="round" onclick={resetChanges} aria-label="Annulla i cambi"><RotateCcw size={18} /></button>
          <button class="btn ghost grow" onclick={saveMine}><Save size={16} /> Salva come mio</button>
        {/if}
        <button class="btn accent grow" onclick={startTraining}><Play size={18} fill="currentColor" /> Inizia</button>
      </div>
    {/snippet}
  </Sheet>
{/if}

<style>
  .today :global(.head) {
    margin-bottom: 4px;
  }
  /* ── La tappa ── */
  .mantra {
    position: relative;
    margin-top: 16px;
  }
  .m-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 16px 18px 18px;
    border-radius: var(--r-card);
    background: color-mix(in srgb, var(--f) 10%, var(--card));
    border: 1.5px solid color-mix(in srgb, var(--f) 40%, var(--line));
    text-align: left;
    color: var(--ink);
    transition: transform var(--dur-fast) var(--ease);
  }
  .m-main:active {
    transform: scale(0.985);
  }
  .m-label {
    color: var(--f-ink, var(--ink-2));
    min-height: 30px;
    display: flex;
    align-items: center;
  }
  .m-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 2px 0;
  }
  .m-ico {
    display: grid;
    place-items: center;
    flex: none;
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: var(--f);
    color: var(--f-on);
    box-shadow: 0 3px 0 var(--f-edge);
  }
  .m-theme {
    min-width: 0;
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.05;
  }
  .m-chev {
    display: grid;
    color: var(--ink-3);
    margin-top: 4px;
  }
  .m-where {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    font-size: 14px;
    font-weight: 650;
    color: var(--ink);
  }
  .m-prog {
    flex: 0 1 120px;
    min-width: 48px;
    /* Le tacche prendono il colore della famiglia, come il resto della scheda. */
    --accent: var(--f);
    --accent-ink: var(--f-ink);
  }
  .m-tracks {
    font-size: 13px;
    color: var(--ink-3);
  }
  section,
  .focus,
  .test-pill {
    margin-top: 20px;
  }
  .section {
    margin-top: 28px;
  }

  /* ── Pulsante grande ── */
  .hero {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .label {
    color: var(--ink-3);
  }
  /* La riga sotto il pulsante: la scaletta a colori e, sotto, quanti blocchi. Apre il foglio. */
  .inside {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    padding: 14px 12px 6px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
    color: var(--ink);
    text-align: left;
    transition: transform var(--dur-fast) var(--ease);
  }
  .inside:active {
    transform: scale(0.985);
  }
  .strip {
    display: flex;
    gap: 4px;
    padding-right: 4px;
  }
  .seg {
    flex-basis: 0;
    min-width: 10px;
    height: 12px;
    border-radius: 6px;
    background: var(--f);
  }
  .inside-txt {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 36px;
  }
  .inside-n {
    font-size: 14px;
    color: var(--ink-2);
  }
  .inside-n b {
    font-weight: 650;
    color: var(--accent-ink);
  }
  .inside-more {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 14px;
    font-weight: 650;
  }
  .inside-more :global(svg) {
    color: var(--ink-3);
  }
  /* Un'azione secondaria, scritta per esteso. */
  .quiet {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 8px;
    min-height: 44px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .quiet :global(svg) {
    color: var(--ink-3);
  }
  .rings {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .ring-btn {
    border-radius: 50%;
  }

  /* ── Test e da correggere ── */
  .test-pill,
  .focus {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 18px 14px 14px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
    text-align: left;
  }
  .focus {
    transition: transform var(--dur-fast) var(--ease);
  }
  .focus:active {
    transform: scale(0.985);
  }
  .tp-ico,
  .f-ico {
    display: grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--accent) 16%, var(--card));
    color: var(--accent-ink);
  }
  .f-ico {
    background: color-mix(in srgb, var(--down) 14%, var(--card));
    color: var(--down);
  }
  .block {
    display: block;
  }
  strong {
    font-weight: 650;
  }

  /* ── Livello proposto e avvisi ── */
  .offer {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 16px 18px;
    border-radius: var(--r-card);
    background: color-mix(in srgb, var(--lv) 12%, var(--card));
    border: 1.5px solid color-mix(in srgb, var(--lv) 45%, var(--line));
  }
  .note-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
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

  /* ── Medaglie ── */
  .sec-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .sec-head h2 {
    margin: 0;
  }
  .more {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    min-height: 44px;
    padding-left: 12px;
    font-size: 14px;
    font-weight: 650;
    color: var(--ink-2);
  }
  .won {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px 8px;
    margin-bottom: 12px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
  }
  .won-label {
    color: var(--ink-3);
  }
  .won-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    text-align: left;
    color: var(--ink);
  }
  .suggest {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: var(--r-card);
    background: color-mix(in srgb, var(--md) 12%, var(--card));
    border: 1.5px solid color-mix(in srgb, var(--md) 45%, var(--line));
  }
  .s-main {
    display: flex;
    align-items: center;
    gap: 16px;
    text-align: left;
    color: var(--ink);
  }
  .s-main .t-name {
    margin: 2px 0 4px;
  }
  .s-why {
    color: var(--ink-2);
  }
  .s-try {
    align-self: flex-start;
  }

  /* ── Foglio dei blocchi ── */
  .blocks {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 8px;
  }
  .gap {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-3);
    padding: 2px 0;
  }
  .exs {
    list-style: none;
    margin: 0 0 6px;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .exs li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 4px 10px 14px;
    border-left: 4px solid var(--f);
    margin-left: 22px;
  }
  .ex-open {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    text-align: left;
  }
  .ex-name {
    font-size: 15.5px;
    font-weight: 650;
    line-height: 1.25;
  }
  .ex-name.changed {
    color: var(--accent-ink);
  }
  .ex-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 12.5px;
    color: var(--ink-2);
  }
  .ex-meta span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .round.sm {
    width: 44px;
    height: 44px;
  }
  .others {
    display: flex;
    flex-direction: column;
    margin-bottom: 6px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
    overflow: hidden;
  }
  .other {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 56px;
    padding: 8px 14px 8px 16px;
    text-align: left;
    color: var(--ink);
  }
  .others.last {
    margin: 14px 0 0;
  }
  .other :global(svg) {
    flex: none;
    color: var(--ink-3);
  }
</style>
