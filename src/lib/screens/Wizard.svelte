<script>
  // Primo avvio: poche schermate per capire il metodo, scegliere il livello e impostare il piano.
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import { app } from '../store/app.svelte.js';
  import { buzz } from '../store/ui.svelte.js';
  import { createPlan } from '../engine/plan.js';
  import { VERSION } from '../data/changelog.js';
  import { PHASES } from '../data/program.js';
  import { LIBRARY, DEFAULT_LEVEL } from '../data/library.js';
  import { addDays, mondayOf, fmtLong, WEEKDAYS, WEEKDAYS_MIN } from '../util/dates.js';
  import Segmented from '../ui/Segmented.svelte';
  import LevelPicker from '../ui/LevelPicker.svelte';

  const steps = app.cloud ? ['ciao', 'sessione', 'livello', 'quando', 'gruppo'] : ['ciao', 'sessione', 'livello', 'quando'];

  let i = $state(0);
  let dir = $state(1);
  let name = $state(app.name);
  let when = $state('this');
  let weekN = $state(2);
  let days = $state([2, 5]);
  let share = $state(true);
  let level = $state(null);

  const step = $derived(steps[i]);
  const sortedDays = $derived([...days].sort((a, b) => a - b));
  const start = $derived.by(() => {
    const monday = mondayOf(app.today);
    if (when === 'next') return addDays(monday, 7);
    if (when === 'mid') return addDays(monday, -(weekN - 1) * 7);
    return monday;
  });
  const canNext = $derived(step !== 'ciao' || name.trim().length > 0);

  function go(delta) {
    dir = delta;
    i = Math.max(0, Math.min(steps.length - 1, i + delta));
  }

  function toggleDay(d) {
    buzz();
    if (days.includes(d)) {
      if (days.length > 1) days = days.filter((x) => x !== d);
    } else days = [...days, d];
  }

  function finish() {
    const plan = createPlan({ start, days: sortedDays });
    const chosen = level ?? DEFAULT_LEVEL;
    app.patchMeta({
      player: { level: chosen, since: app.today, history: [{ date: app.today, level: chosen, how: level ? 'scelto' : 'predefinito' }], declined: null },
      onboarded: true,
      seenVersion: VERSION,
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
          <p class="lead muted">Tre mesi, quante sessioni vuoi. Ogni volta trovi l’allenamento già pronto.</p>

          {#if !app.user?.name}
            <input class="field" placeholder="Come ti chiami?" bind:value={name} autocomplete="given-name" />
          {/if}

          <ul class="facts">
            <li>
              <b class="mono">3</b>
              <span><strong>mesi</strong><br /><span class="muted">Dritto, rovescio, primi colpi</span></span>
            </li>
            <li>
              <b class="mono">+1</b>
              <span><strong>test a settimana</strong><br /><span class="muted">Allenarsi è una cosa, misurarsi un’altra</span></span>
            </li>
            <li>
              <b class="mono">{LIBRARY.length}</b>
              <span><strong>esercizi</strong><br /><span class="muted">Ognuno con le sue medaglie: bronzo, argento, oro</span></span>
            </li>
          </ul>
        {:else if step === 'sessione'}
          <h1 class="display">Novanta minuti, cinque fasi.</h1>
          <p class="lead muted">Stessa struttura ogni volta. Cambia il contenuto, che segue il mese. Fra una fase e l’altra, 1 minuto di pausa.</p>

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
            <div class="card" data-color="blue"><span class="letter">Allenamento</span><p>Gli esercizi del mese. Su ogni esercizio, quando vuoi, provi a prendere una medaglia.</p></div>
            <div class="card" data-color="orange"><span class="letter">Test</span><p>Un appuntamento a parte, solo per misurarti. L’app ti propone gli esercizi da misurare.</p></div>
          </div>
        {:else if step === 'livello'}
          <h1 class="display">Qual è il tuo livello?</h1>
          <p class="lead muted">Serve solo a proporti esercizi adatti: puoi fare tutto, a qualsiasi livello. Lo cambi quando vuoi.</p>
          <LevelPicker value={level} onchange={(v) => (level = v)} />
          <p class="small muted">Se non sai cosa scegliere, vai avanti: parti da principiante. Quando sarai pronto per il livello dopo, te lo dirà l’app.</p>
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
                {#if on && sortedDays[sortedDays.length - 1] === n + 1}<i>T</i>{/if}
              </button>
            {/each}
          </div>

          <p class="muted">
            {sortedDays.length} {sortedDays.length === 1 ? 'allenamento' : 'allenamenti'} a settimana, il test il {WEEKDAYS[sortedDays[sortedDays.length - 1] - 1]}.
            {when === 'mid' ? 'Il ciclo è cominciato' : 'Si comincia'}
            {fmtLong(start)}. Modelli, giorni e mesi si cambiano quando vuoi.
          </p>
        {:else if step === 'gruppo'}
          <h1 class="display">Ci si allena in due.</h1>
          <p class="lead muted">Chi è nel gruppo vede solo il tuo nome. Medaglie, livello, diario e note restano tuoi.</p>

          <div class="card peek">
            <div class="row g-12">
              <span class="who">{(name.trim()[0] ?? 'T').toUpperCase()}</span>
              <span class="grow"><strong>{name.trim().split(/\s+/)[0] || 'Tu'}</strong></span>
            </div>
          </div>

          <label class="toggle">
            <span>Mostra il mio nome al gruppo</span>
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
  .ab .card {
    border-top: 3px solid var(--c);
  }
  .letter {
    font-family: var(--serif);
    font-size: 22px;
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
