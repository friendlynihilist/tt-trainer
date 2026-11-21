<script>
  // Il primo avvio: tre domande (il livello, in cosa vuoi sentirti più sicuro, per quanto tempo) e
  // in mezzo il primo allenamento, scelto fra tre proposte o costruito con i fondamentali. Alla fine
  // l'allenamento è salvato fra i tuoi e sta in calendario: solo oggi, per una settimana o per un mese.
  // Lo fa anche chi usava l'app prima dei fondamentali, alla prima apertura: il livello è già segnato,
  // medaglie, diario e note restano, e il programma nuovo prende il posto di quello vecchio.
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import Check from '@lucide/svelte/icons/check';
  import Plus from '@lucide/svelte/icons/plus';
  import { app, newId } from '../store/app.svelte.js';
  import { ui, buzz } from '../store/ui.svelte.js';
  import { VERSION } from '../data/changelog.js';
  import { PLAYER_LEVELS } from '../data/library.js';
  import { SKILLS, BRICK, proposals, toTemplate, totalMinutes, workoutName } from '../data/bricks.js';
  import { WEEKDAYS, WEEKDAYS_MIN } from '../util/dates.js';
  import { startTour, coachSkip } from '../ui/tours.js';
  import { putToday, weeksPlan } from '../store/actions.js';
  import Court from '../ui/Court.svelte';
  import Tower from '../ui/Tower.svelte';
  import Pills from '../ui/Pills.svelte';

  const ABOUT = {
    principiante: 'Sto imparando i colpi di base',
    intermedio: 'So fare il top e servo con effetto',
    avanzato: 'Attacco quasi ogni palla e gioco tornei',
    esperto: 'Gioco top contro top, anche da lontano',
    pro: 'Gioco ad alto livello'
  };

  const returning = app.onboarded;
  const was = app.meta?.player?.level ?? null;

  // Chi aveva già visto le guide (nella 0.8.0, da solo) le rivede qui: fanno parte del primo avvio.
  onMount(() => {
    const seen = app.meta?.tour;
    if (returning && (seen?.build || seen?.app)) app.patchMeta({ tour: { build: false, app: false } });
  });

  let stage = $state('intro');
  let dir = $state(1);
  let name = $state(app.name);
  let level = $state(was);
  let focus = $state([]);
  let ideas = $state([]);
  let bricks = $state([]);
  let own = $state(false);
  let span = $state(null);
  let days = $state([2, 5]);
  let share = $state(app.settings.share);

  const steps = $derived(['level', 'focus', 'pick', 'build', 'when', ...(span === 'once' ? [] : ['days']), 'done']);
  const sortedDays = $derived([...days].sort((a, b) => a - b));
  const weeks = $derived(span === 'month' ? 4 : 1);
  const pills = (list) => list.map((b) => ({ name: BRICK[b.type].name, fam: BRICK[b.type].fam, minutes: b.minutes }));

  function go(to) {
    const all = ['intro', ...steps];
    dir = all.indexOf(to) >= all.indexOf(stage) ? 1 : -1;
    stage = to;
  }
  function back() {
    if (ui.coach) coachSkip();
    const all = ['intro', ...steps];
    go(all[Math.max(0, all.indexOf(stage) - 1)]);
  }

  function pickLevel(id) {
    level = id;
    buzz(12);
    go('focus');
  }
  function toggleFocus(id) {
    focus = focus.includes(id) ? focus.filter((x) => x !== id) : [...focus, id];
    buzz(10);
  }
  function toPick() {
    ideas = proposals(focus, level, app.catalog, app.medals);
    go('pick');
  }
  // Un allenamento proposto è un punto di partenza: si apre nella torre, dove lo puoi cambiare.
  function build(list) {
    if (list) {
      bricks = list.map((b) => ({ ...b, exs: [...b.exs] }));
      own = false;
    } else if (!own) {
      bricks = [];
      own = true;
    }
    buzz(12);
    go('build');
    setTimeout(() => startTour('build'), 450);
  }
  function pickSpan(s) {
    span = s;
    buzz(12);
    go(s === 'once' ? 'done' : 'days');
  }
  function toggleDay(d) {
    days = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    buzz(10);
  }

  function finish() {
    const id = newId('c');
    const template = { ...toTemplate($state.snapshot(bricks)), id, custom: true };
    const patch = {
      onboarded: true,
      intro: 3,
      seenVersion: VERSION,
      focus: $state.snapshot(focus),
      custom: { templates: [...(app.meta?.custom?.templates ?? []), template] }
    };
    if (!returning) {
      patch.profile = { name: name.trim() };
      patch.settings = { share };
    }
    if (level !== was) {
      const history = [...(app.meta?.player?.history ?? []), { date: app.today, level, how: 'scelto' }];
      patch.player = { level, since: app.today, history, declined: null };
    }
    if (span !== 'once') patch.plan = weeksPlan(id, days, weeks);
    app.patchMeta(patch);
    if (span === 'once') putToday(id);
  }
</script>

<div class="onb" class:tall={stage === 'build'}>
  {#if stage !== 'intro'}
    <div class="top">
      <button class="icon-btn" onclick={back} aria-label="Indietro"><ChevronLeft size={24} /></button>
      <div class="dots" aria-hidden="true">
        {#each steps as s (s)}<i class:on={s === stage}></i>{/each}
      </div>
    </div>
  {/if}

  {#key stage}
    <section in:fly={{ x: 28 * dir, duration: 380, easing: cubicOut }}>
      {#if stage === 'intro'}
        <Court />
        {#if returning}
          <h1 class="hero">Terza palla è cambiata.</h1>
          <p class="lead muted">Adesso l’allenamento lo costruisci tu, un fondamentale alla volta. Rispondi a tre domande e prepariamo insieme il primo.</p>
          <p class="lead muted">Le tue medaglie, il diario e le note sono rimasti al loro posto.</p>
        {:else}
          <h1 class="hero">Costruisci il tuo allenamento.</h1>
          <p class="lead muted">Rispondi a tre domande e prepariamo insieme il tuo primo allenamento.</p>
        {/if}
        {#if !returning && !app.user?.name}
          <input class="field" placeholder="Come ti chiami?" bind:value={name} autocomplete="given-name" />
        {/if}
        <button class="btn accent wide last" onclick={() => go('level')} disabled={!returning && !name.trim()}>Comincia</button>
      {:else if stage === 'level'}
        <h1 class="hero">A che livello giochi?</h1>
        {#if was}<p class="lead muted">Quello con il bordo blu è il tuo livello di adesso.</p>{/if}
        {#each PLAYER_LEVELS as l, i (l.id)}
          <button class="choice lvl" class:cur={l.id === was} data-level={l.id} style:animation-delay="{40 + i * 60}ms" onclick={() => pickLevel(l.id)}>
            <span class="bars" aria-hidden="true">
              {#each [0, 1, 2, 3, 4] as k (k)}<i class:on={k <= i} style:height="{10 + k * 6}px"></i>{/each}
            </span>
            <span><b>{l.name}</b><span class="muted">{ABOUT[l.id]}</span></span>
          </button>
        {/each}
      {:else if stage === 'focus'}
        <h1 class="hero">In cosa vuoi sentirti più sicuro?</h1>
        <p class="lead muted">Puoi scegliere più di una cosa.</p>
        <div class="mat">
          {#each SKILLS as b, i (b.id)}
            <button data-fam={b.fam} style:animation-delay="{40 + i * 50}ms" aria-pressed={focus.includes(b.id)} onclick={() => toggleFocus(b.id)}>
              {b.name}<span class="tick"><Check size={16} strokeWidth={3.2} /></span>
            </button>
          {/each}
        </div>
        <button class="btn accent wide last" onclick={toPick} disabled={!focus.length}>Avanti</button>
      {:else if stage === 'pick'}
        <h1 class="hero small-hero">Scegli il tuo primo allenamento</h1>
        {#each ideas as w, i (i)}
          <button class="choice col" style:animation-delay="{50 + i * 70}ms" onclick={() => build(w.bricks)}>
            <span class="row"><b class="grow">{w.name}</b><span class="muted">{totalMinutes(w.bricks)} min</span></span>
            <Pills bricks={pills(w.bricks)} />
          </button>
        {/each}
        <button class="own last" onclick={() => build(null)}><Plus size={20} strokeWidth={2.6} /> Preferisco costruirlo io</button>
      {:else if stage === 'build'}
        <h1 class="hero small-hero">Il tuo allenamento</h1>
        <Tower bind:bricks {focus} {level} />
        <button class="btn accent wide" onclick={() => go('when')} disabled={!bricks.length}>Avanti</button>
      {:else if stage === 'when'}
        <h1 class="hero">Per quanto tempo?</h1>
        {#each [['once', 'Solo oggi', 'Un solo allenamento', 1, 1], ['week', 'Una settimana', 'I giorni li scegli tu', 7, 7], ['month', 'Un mese', 'Quattro settimane, negli stessi giorni', 7, 28]] as [id, title, sub, cols, n], i (id)}
          <button class="choice" style:animation-delay="{50 + i * 70}ms" onclick={() => pickSpan(id)}>
            <span class="glyph" style:grid-template-columns="repeat({cols}, 7px)" aria-hidden="true">
              {#each Array(n) as _, k (k)}<i></i>{/each}
            </span>
            <span><b>{title}</b><span class="muted">{sub}</span></span>
          </button>
        {/each}
      {:else if stage === 'days'}
        <h1 class="hero">In quali giorni ti alleni?</h1>
        <div class="bigdays" role="group" aria-label="Giorni di allenamento">
          {#each WEEKDAYS_MIN as d, n (n)}
            <button aria-pressed={days.includes(n + 1)} aria-label={WEEKDAYS[n]} onclick={() => toggleDay(n + 1)}>{d}</button>
          {/each}
        </div>
        <div class="card stack g-12">
          <div class="month" aria-hidden="true">
            {#each Array(weeks * 7) as _, k (k)}<i class:on={days.includes((k % 7) + 1)} style:animation-delay="{k * 18}ms"></i>{/each}
          </div>
          <span class="muted">
            {#if days.length}
              {days.length === 1 ? 'Una volta' : `${days.length} volte`} a settimana{weeks > 1 ? `: ${days.length * weeks} allenamenti in un mese.` : '.'}
            {:else}
              Scegli almeno un giorno.
            {/if}
          </span>
        </div>
        <button class="btn accent wide last" onclick={() => go('done')} disabled={!days.length}>Avanti</button>
      {:else}
        <h1 class="hero">È pronto.</h1>
        <div class="card stack g-12">
          <strong class="t-name">{workoutName(bricks)}</strong>
          <span class="muted">
            {totalMinutes(bricks)} minuti{span === 'once' ? ', oggi' : span === 'week' ? `, ${days.length === 1 ? 'una volta' : `${days.length} volte`} questa settimana` : `, ${days.length === 1 ? 'una volta' : `${days.length} volte`} a settimana per un mese`}
          </span>
          <div class="mini">
            {#each bricks as b, i (b.id)}
              <div data-fam={BRICK[b.type].fam} style:height="{Math.max(30, b.minutes * 2.6)}px" style:animation-delay="{i * 110}ms"><b>{BRICK[b.type].name}</b><span>{b.minutes}′</span></div>
            {/each}
          </div>
        </div>
        {#if app.cloud && !returning}
          <label class="toggle">
            <span>Mostra il mio nome al gruppo<br /><span class="small muted">Medaglie, livello, diario e note restano tuoi.</span></span>
            <input type="checkbox" bind:checked={share} />
            <i aria-hidden="true"></i>
          </label>
        {/if}
        <button class="btn accent wide last" onclick={finish}>Andiamo</button>
      {/if}
    </section>
  {/key}
</div>

<style>
  .onb {
    min-height: 100dvh;
    max-width: 560px;
    margin: 0 auto;
    padding: calc(env(safe-area-inset-top) + 18px) var(--gutter) calc(env(safe-area-inset-bottom) + 20px);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    margin: -8px 0 -4px -10px;
  }
  .dots {
    display: flex;
    gap: 6px;
  }
  .dots i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--line-strong);
    transition: all 0.3s;
  }
  .dots i.on {
    width: 22px;
    border-radius: 4px;
    background: var(--accent);
  }
  section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .hero {
    margin: 0;
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
    text-wrap: balance;
  }
  .small-hero {
    font-size: 32px;
  }
  .lead {
    margin: 0;
    font-size: 17px;
  }
  .last {
    margin-top: auto;
  }

  @keyframes up {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
  }

  .choice {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 16px;
    border-radius: 22px;
    background: var(--card);
    box-shadow: 0 5px 0 var(--line-strong);
    text-align: left;
    transition:
      transform 0.12s,
      box-shadow 0.12s;
    animation: up 0.4s both;
  }
  .choice.cur {
    box-shadow:
      inset 0 0 0 2.5px var(--accent),
      0 5px 0 var(--line-strong);
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
  .choice.lvl {
    padding: 12px 16px;
  }
  .choice.col {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .choice.col b {
    font-size: 19px;
  }
  .bars {
    flex: none;
    width: 56px;
    height: 40px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 4px;
  }
  .bars i {
    width: 7px;
    border-radius: 3px;
    background: var(--line-strong);
  }
  .bars i.on {
    background: var(--lv);
  }
  .glyph {
    flex: none;
    width: 76px;
    height: 60px;
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

  .mat {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .mat button {
    position: relative;
    min-height: 76px;
    padding: 10px 14px;
    border-radius: 16px;
    background: var(--f);
    color: var(--f-on);
    font-size: 18px;
    font-weight: 750;
    text-align: left;
    box-shadow: 0 4px 0 var(--f-edge);
    opacity: 0.5;
    animation: up 0.4s both;
    transition:
      opacity 0.15s,
      transform 0.12s,
      box-shadow 0.12s;
  }
  .mat button[aria-pressed='true'] {
    opacity: 1;
  }
  .mat button:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 var(--f-edge);
  }
  .tick {
    position: absolute;
    right: 12px;
    top: 50%;
    translate: 0 -50%;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #fff;
    color: var(--f-edge);
    scale: 0;
    transition: scale 0.18s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .mat button[aria-pressed='true'] .tick {
    scale: 1;
  }

  .own {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 58px;
    border-radius: 999px;
    border: 2px dashed var(--accent);
    color: var(--accent-ink);
    font-size: 17px;
    font-weight: 750;
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
      box-shadow 0.12s,
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
    animation: up 0.4s both;
  }

  .mini {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .mini div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    border-radius: 14px;
    background: var(--f);
    color: var(--f-on);
    box-shadow: 0 4px 0 var(--f-edge);
    animation: up 0.42s both;
  }
  .mini span {
    font-size: 18px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .toggle > span {
    flex: 1;
  }
  .toggle input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .toggle i {
    flex: none;
    width: 52px;
    height: 32px;
    border-radius: 999px;
    background: var(--line-strong);
    position: relative;
    transition: background 0.2s;
  }
  .toggle i::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #fff;
    transition: translate 0.2s var(--ease);
  }
  .toggle input:checked + i {
    background: var(--accent);
  }
  .toggle input:checked + i::after {
    translate: 20px 0;
  }
  .toggle input:focus-visible + i {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .choice,
    .mat button,
    .month i.on,
    .mini div {
      animation: none;
    }
  }
</style>
