<script>
  // «Oggi»: tre cose, dall'alto. Il tavolo con l'allenamento di oggi (il nome, i suoi fondamentali, un
  // solo pulsante); la settimana; le medaglie, con quella da andare a prendere. Toccando i fondamentali
  // si apre il foglio dell'allenamento: da lì lo cambi o lo registri senza timer.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import PencilLine from '@lucide/svelte/icons/pencil-line';
  import Blocks from '@lucide/svelte/icons/blocks';
  import Target from '@lucide/svelte/icons/target';
  import Trash from '@lucide/svelte/icons/trash-2';
  import Play from '@lucide/svelte/icons/play';
  import Check from '@lucide/svelte/icons/check';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { loadLive, clearLive } from '../store/live.js';
  import { startItem, logItem, weekOf, proposalFor, putToday, buildNew } from '../store/actions.js';
  import { agenda } from '../engine/events.js';
  import { composeSession } from '../engine/compose.js';
  import { packagesOf } from '../data/packages.js';
  import { nearGoals } from '../engine/player.js';
  import { nextGoal, medalCount, valueText } from '../engine/medals.js';
  import { weekStreak } from '../engine/stats.js';
  import { bricksOf, editableBricks, toTemplate, workoutName } from '../data/bricks.js';
  import { PLAYER_LEVEL, TIER, TIERS } from '../data/library.js';
  import { addDays, fmtLong, fmtRelative } from '../util/dates.js';
  import { startTour } from '../ui/tours.js';
  import { unseen } from '../data/changelog.js';
  import PageHead from '../ui/PageHead.svelte';
  import PlannedRow from '../ui/PlannedRow.svelte';
  import MedalBadge from '../ui/MedalBadge.svelte';
  import Flame from '../ui/Flame.svelte';
  import LevelBadge from '../ui/LevelBadge.svelte';
  import WeekDays from '../ui/WeekDays.svelte';
  import Pills from '../ui/Pills.svelte';
  import Sheet from '../ui/Sheet.svelte';

  const plan = $derived(app.plan);
  const week = $derived(app.week);

  const days = $derived(agenda(plan, app.events, app.planned, app.today, addDays(app.today, 28), app.catalog));
  const todayInfo = $derived(days.get(app.today) ?? { todo: [], done: [] });
  const todo = $derived(todayInfo.todo);
  const testToday = $derived(todo.find((x) => x.kind === 'test') ?? null);
  const trainingToday = $derived(todo.find((x) => x.kind === 'training') ?? null);
  const others = $derived(todo.filter((x) => x !== trainingToday && x !== testToday));
  const doneToday = $derived(todayInfo.done.find((e) => e.kind === 'training') ?? null);

  // Senza niente in calendario oggi si propone comunque un allenamento: quello del programma,
  // l'ultimo dei tuoi, oppure un pacchetto del tuo livello. Ci si può allenare ogni giorno.
  const fallback = $derived.by(() => {
    const slot = plan?.slots.find((s) => s.kind === 'training' && s.template && app.catalog.hasTemplate(s.template));
    if (slot) return slot.template;
    const mine = (app.meta?.custom?.templates ?? []).filter((t) => !t.archived);
    if (mine.length) return mine[mine.length - 1].id;
    const list = packagesOf(app.player.level);
    return (list.find((t) => t.id.endsWith('-60')) ?? list[0])?.id ?? null;
  });
  const templateId = $derived(trainingToday?.template ?? doneToday?.template ?? fallback);
  const template = $derived(templateId && app.catalog.hasTemplate(templateId) ? app.catalog.template(templateId) : null);
  const session = $derived(template ? composeSession({ week: weekOf(app.today), template, catalog: app.catalog, medals: app.medals }) : null);
  const bricks = $derived(template ? bricksOf(template, app.catalog, session) : []);
  // Un tuo allenamento ha il nome che gli hai dato; quelli di prima («Intermedio · 60′») si chiamano
  // per quello che contengono.
  const title = $derived(template?.custom ? template.name : workoutName(bricks.filter((b) => b.type)) );
  const exName = (id) => app.catalog.exercise(id)?.name ?? '';
  const proposal = $derived(testToday ? proposalFor(app.today) : []);
  const offer = $derived(app.levelOffer);
  const streak = $derived(weekStreak(app.events));

  // «Settimana 2 di 4» ha senso solo con un programma di più settimane.
  const weekSteps = $derived(plan && app.phase === 'active' && week?.number && week.total > 1 ? { pos: week.number, of: week.total } : null);

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
  const counts = $derived(medalCount(app.medals));

  // La medaglia da andare a prendere: una vicina che è nell'allenamento di oggi, poi la prima che
  // manca fra gli esercizi di oggi, poi la più vicina in assoluto.
  const ART = { B: 'il bronzo', A: 'l’argento', O: 'l’oro', P: 'il platino' };
  const suggested = $derived.by(() => {
    const near = nearGoals({ medals: app.medals, catalog: app.catalog, max: 10 });
    const inSession = (session?.steps ?? []).filter((s) => s.ex).map((s) => s.ex);
    const id = near.find((n) => inSession.includes(n.ex))?.ex ?? inSession.find((x) => nextGoal(app.catalog.exercise(x), app.medals[x])) ?? near[0]?.ex ?? null;
    const ex = id && app.catalog.exercise(id);
    const goal = ex && nextGoal(ex, app.medals[ex.id]);
    if (!goal) return null;
    const best = app.medals[ex.id]?.best;
    const left = typeof goal.goal === 'number' && typeof best === 'number' && !goal.alt && best < goal.goal ? goal.goal - best : null;
    return { ex, goal, left };
  });

  let draft = $state(null);
  $effect(() => {
    ui.live; // si rilegge quando la sessione dal vivo si apre o si chiude
    draft = app.user ? loadLive(app.user.uid) : null;
  });

  let sheet = $state(false);
  // Il tasto «indietro» del telefono chiude il foglio dell'allenamento.
  $effect(() => {
    if (sheet) return ui.hold(() => (sheet = false));
  });

  // La prima volta, la guida mostra le medaglie e la mappa (quando non c'è altro aperto).
  $effect(() => {
    if (app.meta?.tour?.app || ui.coach || ui.live || ui.news || ui.sheets.length || ui.builder || sheet) return;
    if (!app.meta?.seenVersion || unseen(app.meta.seenVersion).length) return; // prima le novità
    const timer = setTimeout(() => startTour('app'), 700);
    return () => clearTimeout(timer);
  });

  function startTraining() {
    sheet = false;
    startItem(trainingToday ?? null, { template });
  }
  function logTraining() {
    sheet = false;
    if (trainingToday) logItem({ ...trainingToday, template: templateId });
    else ui.open('event', { draft: { kind: 'training', template: templateId, date: app.today } });
  }
  function startTest(exercises = null) {
    startItem(testToday ?? { kind: 'test' }, { exercises });
  }
  function discard() {
    clearLive(app.user.uid);
    draft = null;
  }

  // «Cambia i fondamentali»: un tuo allenamento si aggiorna; uno di base diventa un allenamento tuo,
  // che prende il suo posto oggi.
  function rebuild() {
    sheet = false;
    const mine = (app.meta?.custom?.templates ?? []).find((t) => t.id === templateId) ?? null;
    ui.builder = {
      title: 'Cambia i fondamentali',
      bricks: editableBricks(template, app.catalog, session),
      onsave: (list) => {
        if (mine) {
          app.saveCustom('templates', { ...mine, ...toTemplate(list, mine.named ? mine.name : null) });
          ui.toast('Salvato');
        } else {
          const t = app.saveCustom('templates', toTemplate(list));
          putToday(t.id);
          ui.toast(`«${t.name}» è l’allenamento di oggi`);
        }
      }
    };
  }
</script>

<div class="page enter today">
  <PageHead title="Oggi" sub={fmtLong(app.today)}>
    {#snippet aside()}
      {#if streak > 0}
        <span class="streak" role="img" aria-label="{streak} {streak === 1 ? 'settimana' : 'settimane'} di fila">
          <Flame size={30} /><b>{streak}</b>
        </span>
      {/if}
    {/snippet}
  </PageHead>

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

  <!-- Il tavolo visto dall'alto: l'allenamento di oggi. -->
  <section class="court">
    <span class="ball" aria-hidden="true"></span>
    {#if draft && !ui.live}
      <h2>Sessione a metà</h2>
      <span class="sub">{draft.title ?? 'Allenamento'} · {fmtRelative(draft.date)}</span>
      <button class="go" onclick={() => (ui.live = { resume: true })}><Play size={18} fill="currentColor" strokeWidth={0} /> Riprendi</button>
      <button class="quiet" onclick={discard}><Trash size={16} /> Scarta questa sessione</button>
    {:else if session}
      <h2>{title}</h2>
      <button class="open" onclick={() => (sheet = true)} aria-label="Vedi i fondamentali di oggi">
        <Pills {bricks} solid />
      </button>
      {#if doneToday && !trainingToday}
        <span class="done"><Check size={20} strokeWidth={3} /> Fatto, {doneToday.minutes ?? session.minutes} minuti</span>
      {:else}
        <button class="go" onclick={startTraining}><Play size={18} fill="currentColor" strokeWidth={0} /> Inizia · {session.minutes} min</button>
      {/if}
    {:else if testToday}
      <h2>Test</h2>
      <span class="sub">{proposal.length ? `${proposal.length} esercizi da misurare` : 'Scegli tu cosa misurare'}</span>
      <button class="go" onclick={() => startTest()}><Target size={18} /> Inizia il test</button>
    {:else}
      <h2>Oggi è libero</h2>
      <button class="go" onclick={buildNew}>Costruisci un allenamento</button>
    {/if}
  </section>

  {#if testToday && session}
    <button class="test-pill raise neutral" onclick={() => startTest()}>
      <span class="tp-ico"><Target size={20} strokeWidth={2.4} /></span>
      <span class="grow">
        <strong>Test di oggi</strong>
        <span class="small muted block">{proposal.length ? `${proposal.length} esercizi da misurare` : 'Scegli tu cosa misurare'}</span>
      </span>
      <Play size={18} fill="currentColor" strokeWidth={0} />
    </button>
  {/if}

  {#if others.length}
    <section class="card flush list">
      {#each others as item (item.key)}<PlannedRow {item} />{/each}
    </section>
  {/if}

  <section>
    <WeekDays title={weekSteps ? `Settimana ${weekSteps.pos} di ${weekSteps.of}` : 'Questa settimana'} steps={weekSteps} />
  </section>

  <!-- Le medaglie: quelle prese oggi, quella da andare a prendere, e il conto di tutte. -->
  <section class="medals" id="nearcard">
    {#each wonToday as w (w.ex.id)}
      <button class="m-row" onclick={() => ui.open('exercise', { id: w.ex.id })}>
        <MedalBadge tier={w.tier} half={w.half} size={44} label={false} shine />
        <span class="grow">
          <strong>{w.half ? 'Metà oro, presa oggi' : `${TIER[w.tier].name}, preso oggi`}</strong>
          <span class="small muted block">{w.ex.name}</span>
        </span>
      </button>
    {/each}
    {#if suggested}
      {@const s = suggested}
      <button class="m-row" onclick={() => startTest([s.ex.id])}>
        <MedalBadge tier={s.goal.tier} size={44} label={false} />
        <span class="grow">
          <strong>{s.left ? `${s.left === 1 ? 'Ti manca 1' : `Ti mancano ${s.left}`} per ${ART[s.goal.tier]}` : `Prova ${ART[s.goal.tier]}`}</strong>
          <span class="small muted block">{s.ex.name}: {valueText(s.ex, s.goal.goal, s.goal.tier)}</span>
        </span>
        <span class="muted"><ChevronRight size={18} /></span>
      </button>
    {:else if !wonToday.length}
      <p class="muted small first">In allenamento tocca «Prova l’obiettivo»: arriva la prima medaglia.</p>
    {/if}
    <button class="tally" onclick={() => ui.go('progressi')} aria-label="Le tue medaglie: {counts.B} di bronzo, {counts.A} d’argento, {counts.O} d’oro, {counts.P} di platino">
      {#each TIERS as t (t)}
        <span><MedalBadge tier={t} on={counts[t] > 0} size={22} label={false} /><b>{counts[t]}</b></span>
      {/each}
    </button>
  </section>
</div>

<!-- Il foglio dell'allenamento: fuori dalla pagina, così sta sopra a tutto. -->
{#if sheet && session}
  <Sheet {title} onclose={() => (sheet = false)} tall>
    <div class="stack-b">
      {#each bricks as b (b.id)}
        <div class="b" data-fam={b.fam} style:min-height="{Math.max(52, b.minutes * 3)}px">
          <span class="grow">
            <b>{b.name}</b>
            {#if b.exs.length}<small>{b.exs.map(exName).join(', ')}</small>{/if}
          </span>
          <span class="b-m">{b.minutes}′</span>
        </div>
      {/each}
    </div>
    <div class="rows">
      <button class="other" onclick={rebuild}>
        <Blocks size={20} />
        <span class="grow"><strong>Cambia i fondamentali</strong></span>
        <ChevronRight size={18} />
      </button>
      <button class="other" onclick={logTraining}>
        <PencilLine size={20} />
        <span class="grow"><strong>L’ho già fatto</strong><span class="small muted block">Registra com’è andata, senza il timer</span></span>
        <ChevronRight size={18} />
      </button>
    </div>
    {#snippet footer()}
      <button class="btn accent wide" onclick={startTraining}><Play size={18} fill="currentColor" /> Inizia</button>
    {/snippet}
  </Sheet>
{/if}

<style>
  .today {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .streak {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-right: 4px;
  }
  .streak b {
    font-size: 24px;
    font-weight: 800;
  }

  .offer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border-radius: var(--r-card);
    background: color-mix(in srgb, var(--lv) 12%, var(--card));
    box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--lv) 40%, transparent);
  }

  /* Il tavolo visto dall'alto. */
  .court {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px 18px 18px;
    border-radius: 24px;
    background: var(--court);
    color: #fff;
    overflow: hidden;
  }
  .court::before {
    content: '';
    position: absolute;
    inset: 8px;
    border: 2px solid #fff;
    border-radius: 16px;
    background: linear-gradient(#fff, #fff) center / 100% 2px no-repeat;
    opacity: 0.22;
    pointer-events: none;
  }
  .court::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 4px;
    translate: -50% 0;
    background: repeating-linear-gradient(#fff 0 3px, transparent 3px 6px);
    opacity: 0.3;
    pointer-events: none;
  }
  .court > :global(*) {
    position: relative;
    z-index: 1;
  }
  .court h2 {
    margin: 0;
    padding-right: 40px;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    text-wrap: balance;
  }
  .court .sub {
    opacity: 0.85;
  }
  .ball {
    position: absolute !important;
    right: 24px;
    top: 24px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.2);
  }
  .open {
    text-align: left;
  }
  .go {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 56px;
    border-radius: 999px;
    background: #fff;
    color: #10151d;
    font-size: 17px;
    font-weight: 750;
    box-shadow: 0 4px 0 rgba(6, 30, 60, 0.4);
    transition:
      transform var(--dur-fast),
      box-shadow var(--dur-fast);
  }
  .go:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 rgba(6, 30, 60, 0.4);
  }
  .done {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 56px;
    font-weight: 700;
  }
  .quiet {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    color: #fff;
    opacity: 0.85;
    font-weight: 600;
  }

  .test-pill {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    text-align: left;
  }
  .test-pill .small {
    display: block;
  }
  .tp-ico {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  .medals {
    display: flex;
    flex-direction: column;
    padding: 4px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    box-shadow: var(--shadow);
  }
  .m-row {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 12px 0;
    text-align: left;
  }
  .m-row .small {
    display: block;
  }
  .m-row + .m-row,
  .tally {
    border-top: 1px solid var(--line);
  }
  .first {
    padding: 14px 0;
  }
  .tally {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    width: 100%;
    padding: 12px 0;
  }
  .tally span {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .tally b {
    font-size: 16px;
    font-variant-numeric: tabular-nums;
  }

  .stack-b {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .b {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px;
    border-radius: 16px;
    background: var(--f);
    color: var(--f-on);
    box-shadow: 0 4px 0 var(--f-edge);
  }
  .b b {
    display: block;
    font-weight: 750;
  }
  .b small {
    display: block;
    font-size: 13px;
    opacity: 0.9;
  }
  .b-m {
    flex: none;
    font-size: 20px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .rows {
    display: flex;
    flex-direction: column;
    margin-top: 16px;
  }
  .other {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 56px;
    padding: 8px 2px;
    text-align: left;
  }
  .other + .other {
    border-top: 1px solid var(--line);
  }
</style>
