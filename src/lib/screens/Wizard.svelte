<script>
  // Primo avvio: quattro schermate per capire il metodo e impostare il piano.
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import { app } from '../store/app.svelte.js';
  import { buzz } from '../store/ui.svelte.js';
  import { createPlan } from '../engine/plan.js';
  import { BLOCKS, PHASES, TRACKS, LEVELS, CYCLE_BLOCKS, WEEKS_PER_BLOCK } from '../data/program.js';
  import { addDays, mondayOf, fmtLong, WEEKDAYS, WEEKDAYS_MIN } from '../util/dates.js';
  import Dots from '../ui/Dots.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import LevelDemo from '../ui/LevelDemo.svelte';

  const steps = app.cloud ? ['ciao', 'sessione', 'livelli', 'quando', 'gruppo'] : ['ciao', 'sessione', 'livelli', 'quando'];

  let i = $state(0);
  let dir = $state(1);
  let name = $state(app.name);
  let when = $state('this');
  let weekN = $state(2);
  let days = $state([2, 5]);
  let share = $state(true);
  let startLevels = $state({});

  const step = $derived(steps[i]);
  const sortedDays = $derived([...days].sort((a, b) => a - b));
  const start = $derived.by(() => {
    const monday = mondayOf(app.today);
    if (when === 'next') return addDays(monday, 7);
    if (when === 'mid') return addDays(monday, -(weekN - 1) * 7);
    return monday;
  });
  const currentBlock = $derived(when === 'mid' ? Math.ceil(weekN / WEEKS_PER_BLOCK) : 1);
  // Chi è già a metà ciclo dichiara i livelli raggiunti: solo dei mesi già cominciati.
  const knownTracks = $derived(
    when === 'mid' ? CYCLE_BLOCKS.filter((b) => Number(b) <= currentBlock).flatMap((b) => BLOCKS[b].tracks) : []
  );
  const canNext = $derived(step !== 'ciao' || name.trim().length > 0);

  function go(delta) {
    dir = delta;
    i = Math.max(0, Math.min(steps.length - 1, i + delta));
  }

  function toggleDay(d) {
    buzz();
    if (days.includes(d)) return;
    days = [days[1], d]; // sempre due giorni: il nuovo sostituisce il più vecchio
  }

  function setStart(track, level) {
    buzz();
    startLevels = { ...startLevels, [track]: startLevels[track] === level ? undefined : level };
  }

  function finish() {
    const plan = createPlan({ start, days: { A: sortedDays[0], B: sortedDays[1] } });
    const tests = knownTracks.filter((t) => startLevels[t]).map((t) => ({ track: t, type: 'set', level: startLevels[t] }));
    if (tests.length) app.saveEvent({ kind: 'livello', date: addDays(start, -1), tests });
    app.patchMeta({
      onboarded: true,
      profile: { name: name.trim() },
      plan,
      settings: { share }
    });
  }
</script>

<div class="wizard">
  <div class="progress" aria-hidden="true">
    {#each steps as s, n (s)}
      <span class:on={n <= i}></span>
    {/each}
  </div>

  <div class="stage">
    {#key step}
      <section in:fly={{ x: 28 * dir, duration: 420, easing: cubicOut }}>
        {#if step === 'ciao'}
          <h1 class="display">{app.firstName ? `Ciao ${app.firstName}.` : 'Benvenuto.'}</h1>
          <p class="lead muted">Tre mesi, due sessioni a settimana. Ogni volta trovi la sessione già pronta, al tuo livello.</p>

          {#if !app.user?.name}
            <input class="field" placeholder="Come ti chiami?" bind:value={name} autocomplete="given-name" />
          {/if}

          <ul class="facts">
            <li>
              <b class="mono">3</b>
              <span><strong>mesi</strong><br /><span class="muted">Dritto, rovescio, primi colpi</span></span>
            </li>
            <li>
              <b class="mono">2</b>
              <span><strong>sessioni a settimana</strong><br /><span class="muted">A per allenare, B per misurare</span></span>
            </li>
            <li>
              <b class="mono">5</b>
              <span><strong>livelli per esercizio</strong><br /><span class="muted">Dal più guidato al punto giocato</span></span>
            </li>
          </ul>
        {:else if step === 'sessione'}
          <h1 class="display">Novanta minuti, cinque fasi.</h1>
          <p class="lead muted">Stessa struttura ogni volta. Cambia il contenuto, che segue il mese e il tuo livello.</p>

          <div class="bar" role="img" aria-label="Le cinque fasi della sessione">
            {#each PHASES as p, n (p.id)}
              <span style:flex={p.minutes} style:animation-delay="{n * 90}ms" class:hot={p.id.startsWith('ex')}></span>
            {/each}
          </div>
          <ol class="phases">
            {#each PHASES as p (p.id)}
              <li><span class="mono faint">{p.minutes}′</span>{p.name}</li>
            {/each}
          </ol>

          <div class="ab">
            <div class="card"><span class="letter">A</span><p>Ti alleni sugli esercizi del tuo livello.</p></div>
            <div class="card"><span class="letter">B</span><p>Ogni esercizio comincia con un test da 10 tentativi.</p></div>
          </div>
        {:else if step === 'livelli'}
          <h1 class="display">Sali quando lo dice il test.</h1>
          <p class="lead muted">Due test di fila da almeno 8 su 10 e passi al livello dopo. Con 4 o meno torni indietro di uno.</p>
          <LevelDemo />
          <p class="small muted">Un tentativo vale se la palla entra e torni in posizione di attesa. Le soglie si cambiano nelle impostazioni.</p>
        {:else if step === 'quando'}
          <h1 class="display">Quando ti alleni?</h1>

          <div class="stack g-12">
            <Segmented
              options={[
                { id: 'this', label: 'Questa settimana' },
                { id: 'next', label: 'La prossima' },
                { id: 'mid', label: 'Ho già iniziato' }
              ]}
              value={when}
              onchange={(v) => (when = v)}
            />
            {#if when === 'mid'}
              <div class="stepper" in:fly={{ y: -8, duration: 260 }}>
                <span>Sono alla settimana</span>
                <button class="icon-btn" onclick={() => (weekN = Math.max(2, weekN - 1))} aria-label="Meno"><Minus size={18} /></button>
                <b class="mono">{weekN}</b>
                <button class="icon-btn" onclick={() => (weekN = Math.min(12, weekN + 1))} aria-label="Più"><Plus size={18} /></button>
              </div>
            {/if}
          </div>

          <div class="days" role="group" aria-label="Giorni di allenamento">
            {#each WEEKDAYS_MIN as d, n (n)}
              {@const on = days.includes(n + 1)}
              <button class:on aria-pressed={on} aria-label={WEEKDAYS[n]} onclick={() => toggleDay(n + 1)}>
                {d}
                {#if on}<i>{sortedDays[0] === n + 1 ? 'A' : 'B'}</i>{/if}
              </button>
            {/each}
          </div>

          <p class="muted">
            Sessione A il {WEEKDAYS[sortedDays[0] - 1]}, sessione B il {WEEKDAYS[sortedDays[1] - 1]}.
            {when === 'mid' ? 'Il ciclo è cominciato' : 'Si comincia'}
            {fmtLong(start)}.
          </p>

          {#if knownTracks.length}
            <div class="stack g-12" in:fly={{ y: 8, duration: 300 }}>
              <p class="heading">A che livello sei arrivato?</p>
              {#each knownTracks as t (t)}
                <div class="lvl">
                  <span class="grow">{TRACKS[t].short}</span>
                  <span class="picks">
                    {#each Array(LEVELS) as _, n (n)}
                      <button class:on={startLevels[t] === n + 1} onclick={() => setStart(t, n + 1)} aria-label="Livello {n + 1}">{n + 1}</button>
                    {/each}
                  </span>
                </div>
              {/each}
              <p class="small faint">Se non lo sai lascia vuoto: lo stabilisce il test di partenza.</p>
            </div>
          {/if}
        {:else if step === 'gruppo'}
          <h1 class="display">Ci si allena in due.</h1>
          <p class="lead muted">Chi è nel gruppo può vedere a che livello sei, così sa quale esercizio farti fare. Diario, note ed errori restano solo tuoi.</p>

          <div class="card peek">
            <div class="row g-12">
              <span class="who">{(name.trim()[0] ?? 'T').toUpperCase()}</span>
              <span class="grow"><strong>{name.trim().split(/\s+/)[0] || 'Tu'}</strong><br /><span class="small muted">Top di dritto · Diagonale fissa</span></span>
              <Dots level={2} size={7} />
            </div>
          </div>

          <label class="toggle">
            <span>Mostra i miei livelli al gruppo</span>
            <input type="checkbox" bind:checked={share} />
            <i aria-hidden="true"></i>
          </label>
        {/if}
      </section>
    {/key}
  </div>

  <footer>
    {#if i > 0}
      <button class="icon-btn back" onclick={() => go(-1)} aria-label="Indietro"><ArrowLeft size={20} /></button>
    {/if}
    {#if i < steps.length - 1}
      <button class="btn primary grow" onclick={() => go(1)} disabled={!canNext}>Avanti <ArrowRight size={18} /></button>
    {:else}
      <button class="btn accent grow" onclick={finish} disabled={!name.trim()}>Comincia</button>
    {/if}
  </footer>
</div>

<style>
  .wizard {
    min-height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
    padding: calc(env(safe-area-inset-top) + 20px) 24px calc(env(safe-area-inset-bottom) + 20px);
    display: flex;
    flex-direction: column;
  }
  .progress {
    display: flex;
    gap: 6px;
  }
  .progress span {
    flex: 1;
    height: 3px;
    border-radius: 2px;
    background: var(--line);
    transition: background 0.4s var(--ease);
  }
  .progress span.on {
    background: var(--ink);
  }
  .stage {
    flex: 1;
    display: grid;
    padding: 36px 0 24px;
    overflow: hidden;
  }
  section {
    grid-area: 1 / 1;
    display: flex;
    flex-direction: column;
    gap: 22px;
    align-self: start;
  }
  footer {
    display: flex;
    align-items: center;
    gap: 10px;
    position: sticky;
    bottom: calc(env(safe-area-inset-bottom) + 16px);
  }
  .back {
    width: 48px;
    height: 48px;
    box-shadow: inset 0 0 0 1px var(--line-strong);
    background: var(--paper);
  }

  .facts {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .facts li {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 14px 0;
    border-top: 1px solid var(--line);
  }
  .facts b {
    width: 44px;
    font-size: 34px;
    font-weight: 500;
    line-height: 1;
    color: var(--accent);
  }
  strong {
    font-weight: 580;
  }

  .bar {
    display: flex;
    gap: 3px;
    height: 12px;
    margin-top: 4px;
  }
  .bar span {
    border-radius: 4px;
    background: var(--ink);
    transform-origin: left;
    animation: grow 0.6s var(--ease-out) both;
  }
  .bar span.hot {
    background: var(--accent);
  }
  @keyframes grow {
    from {
      transform: scaleX(0);
      opacity: 0;
    }
  }
  .phases {
    list-style: none;
    margin: -8px 0 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .phases li {
    display: flex;
    gap: 12px;
  }
  .phases .mono {
    width: 30px;
    text-align: right;
  }
  .ab {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .ab .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    font-size: 14px;
  }
  .letter {
    font-family: var(--serif);
    font-size: 30px;
    line-height: 1;
    font-weight: 500;
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 6px 6px 16px;
    border-radius: 999px;
    background: var(--sunk);
  }
  .stepper span {
    flex: 1;
  }
  .stepper b {
    width: 28px;
    text-align: center;
    font-size: 18px;
    font-weight: 600;
  }

  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .days button {
    position: relative;
    aspect-ratio: 1;
    border-radius: 50%;
    font-weight: 560;
    color: var(--ink-2);
    box-shadow: inset 0 0 0 1px var(--line-strong);
    transition:
      background 0.25s var(--ease),
      color 0.25s var(--ease),
      transform 0.4s var(--spring);
  }
  .days button:active {
    transform: scale(0.9);
  }
  .days button.on {
    background: var(--ink);
    color: var(--paper);
    box-shadow: none;
  }
  .days i {
    position: absolute;
    top: -4px;
    right: -4px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent);
    color: #15171a;
    font-style: normal;
    font-size: 10px;
    font-weight: 700;
    animation: pop 0.4s var(--spring) both;
  }

  .lvl {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
  }
  .picks {
    display: flex;
    gap: 4px;
  }
  .picks button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--ink-2);
    box-shadow: inset 0 0 0 1px var(--line-strong);
    transition:
      background 0.2s var(--ease),
      color 0.2s var(--ease);
  }
  .picks button.on {
    background: var(--accent);
    color: #15171a;
    box-shadow: none;
    font-weight: 600;
  }

  .peek {
    padding: 14px 16px;
  }
  .who {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--sunk);
    font-weight: 600;
    color: var(--ink-2);
  }

  .toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    cursor: pointer;
    font-weight: 520;
  }
  .toggle input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .toggle i {
    position: relative;
    flex: none;
    width: 48px;
    height: 28px;
    border-radius: 999px;
    background: var(--line-strong);
    transition: background 0.25s var(--ease);
  }
  .toggle i::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.4s var(--spring);
  }
  .toggle input:checked + i {
    background: var(--up);
  }
  .toggle input:checked + i::after {
    transform: translateX(20px);
  }
  .toggle input:focus-visible + i {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
