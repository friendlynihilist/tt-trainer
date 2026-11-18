<script module>
  import { nextGoal } from '../engine/medals.js';

  /** Lo stato iniziale di un obiettivo provato in sessione. */
  export function startGoal(exercise, medals) {
    const goal = nextGoal(exercise, medals);
    return { ex: exercise.id, tier: goal?.alt ? goal.tier : null, tries: [], marks: [], score: null, cur: null, parts: [], q: null };
  }

  /** I valori da salvare (vuoto se non c'è ancora niente). */
  export function goalTries(exercise, v) {
    if (!exercise?.measure || !v) return [];
    if (exercise.measure.type === 'su' && !exercise.measure.parts) return v.score != null ? [v.score] : [];
    return v.tries ?? [];
  }
</script>

<script>
  // «Raggiungi l'argento!»: il prossimo gradino non ancora preso di un esercizio, con il conteggio
  // adatto alla misura. È sempre disponibile, con qualsiasi medaglia: serve solo a misurarsi.
  import { onDestroy } from 'svelte';
  import Timer from '@lucide/svelte/icons/timer';
  import { app } from '../store/app.svelte.js';
  import { buzz } from '../store/ui.svelte.js';
  import { TIER, TIERS, TRIES_PER_DAY } from '../data/library.js';
  import { medalsFor, dayValues, valueText, size } from '../engine/medals.js';
  import { chime } from '../util/device.js';
  import Medal from './Medal.svelte';
  import TestPad from './TestPad.svelte';
  import Counter from './Counter.svelte';

  // date: il giorno della sessione (una sessione ripresa può essere di ieri).
  let { exercise, value, onchange, onclose = null, date = app.today } = $props();

  const m = $derived(exercise.measure);
  const before = $derived(app.medals[exercise.id] ?? null);
  const goal = $derived(nextGoal(exercise, before));
  const per = $derived(TRIES_PER_DAY[m.type] ?? 1);
  const tries = $derived(goalTries(exercise, value));
  const pending = $derived(tries.length ? { ex: exercise.id, tier: value.tier, tries, date, createdAt: Number.MAX_SAFE_INTEGER } : null);
  const mine = $derived(app.attempts.filter((a) => a.ex === exercise.id));
  const after = $derived(pending ? medalsFor(exercise, [...mine, pending], date) : before);
  const gained = $derived(TIERS.filter((t) => after?.[t] && !before?.[t]));
  const halfNew = $derived(Boolean(after?.half && !before?.half && !after?.O));
  // Quanto vale la seduta di oggi per questo esercizio (con le regole: prima serie, migliore dei primi tre).
  const today = $derived(pending ? dayValues(exercise, [...mine, pending].filter((a) => (a.tier ?? null) === (value.tier ?? null))).get(date) : null);
  const earlierToday = $derived(mine.some((a) => a.date === date && (a.tier ?? null) === (value.tier ?? null)));

  let celebrated = 0;
  $effect(() => {
    const n = gained.length + (halfNew ? 1 : 0);
    if (n > celebrated) {
      if (app.settings.sound) chime([784, 988, 1318, 1568]);
      if (app.settings.haptics) buzz([30, 60, 30, 60, 80]);
    }
    celebrated = n;
  });

  function set(patch) {
    onchange?.({ ...value, ...patch });
  }

  function addTry() {
    if (value.cur == null) return;
    buzz();
    set({ tries: [...value.tries, value.cur], cur: null });
  }
  function saveParts() {
    if (value.parts.length !== m.parts.length || value.parts.some((x) => x == null)) return;
    buzz();
    set({ tries: [[...value.parts]] });
  }
  function reset() {
    set({ tries: [], marks: [], score: null, cur: null, parts: [] });
  }

  // Il conto alla rovescia dei 30 secondi.
  let left = $state(null);
  let timer = null;
  function go() {
    buzz(20);
    clearInterval(timer);
    left = m.seconds;
    timer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        left = null;
        if (app.settings.sound) chime([880, 1318, 1760]);
        if (app.settings.haptics) buzz([200, 100, 200]);
      }
    }, 1000);
  }
  onDestroy(() => clearInterval(timer));

  const QUALITY = [0, 1, 2, 3, 4, 5];
</script>

<section class="card goal" data-tier={goal?.tier ?? 'O'}>
  <header>
    {#if goal}
      <Medal tier={goal.tier} on={false} half={goal.half} size={26} />
      <div class="grow">
        <strong>Raggiungi {TIER[goal.tier].the}!</strong>
        <p class="small muted">{valueText(exercise, goal.goal, goal.tier)}{goal.half ? '. Ti manca un’altra seduta' : ''}</p>
      </div>
    {:else}
      <Medal tier="P" size={26} />
      <div class="grow">
        <strong>Tutte le medaglie prese</strong>
        <p class="small muted">Misurati lo stesso: il record resta tuo.</p>
      </div>
    {/if}
    {#if onclose}<button class="link" onclick={onclose}>Chiudi</button>{/if}
  </header>

  {#if earlierToday}
    <p class="small muted">Oggi hai già una misura su questo esercizio: {per === 1 ? 'vale la prima serie' : 'valgono i primi tre tentativi'}.</p>
  {/if}

  {#if m.type === 'su' && !m.parts}
    <TestPad n={m.n} marks={value.marks} score={value.score} onchange={(v) => set(v)} />
  {:else if m.type === 'su'}
    {#if value.tries.length}
      <div class="result"><span class="mono big">{value.tries[0].join(' · ')}</span><button class="link" onclick={reset}>Rifai</button></div>
    {:else}
      {#each m.parts as part, i (part)}
        <div class="stack g-6">
          <span class="small muted">Su {m.n}, {part}</span>
          <Counter value={value.parts[i] ?? null} max={m.n} label={part} onchange={(v) => set({ parts: m.parts.map((_, k) => (k === i ? v : (value.parts[k] ?? null))) })} />
        </div>
      {/each}
      <button class="btn primary" onclick={saveParts} disabled={value.parts.length !== m.parts.length || value.parts.some((x) => x == null)}>Registra la serie</button>
    {/if}
  {:else}
    {#if value.tries.length}
      <div class="tries">
        {#each value.tries as t, i (i)}
          <span class="try" class:best={per > 1 && i < per && size(t) === Math.max(...value.tries.slice(0, per).map(size))}><small>{i + 1}°</small> {t}</span>
        {/each}
        <button class="link" onclick={reset}>Rifai</button>
      </div>
    {/if}
    {#if value.tries.length < per}
      {#if m.type === 'tempo'}
        <button class="btn ghost" class:running={left != null} onclick={go}>
          <Timer size={18} />
          {left != null ? `${left} secondi` : `Via! ${m.seconds} secondi`}
        </button>
      {/if}
      <Counter value={value.cur} big label={m.type === 'conta' ? m.what : 'Quante'} onchange={(v) => set({ cur: v })} />
      <button class="btn primary" onclick={addTry} disabled={value.cur == null}>
        {per > 1 ? `Registra il ${value.tries.length + 1}° tentativo` : 'Registra'}
      </button>
      {#if m.type === 'fila'}<p class="small faint">Se sbaglia il compagno, il tentativo non conta: ripetilo.</p>{/if}
    {:else if per > 1}
      <p class="small muted">Tre tentativi fatti: vale il migliore.</p>
    {/if}
  {/if}

  {#if pending}
    <div class="outcome">
      {#each gained as t (t)}
        <div class="won" data-tier={t}>
          <Medal tier={t} size={40} pop />
          <strong>{TIER[t].name}!</strong>
        </div>
      {/each}
      {#if halfNew}
        <div class="won" data-tier="O">
          <Medal tier="O" half size={40} pop />
          <span><strong>Metà oro.</strong> Ti serve un’altra seduta, in un altro giorno.</span>
        </div>
      {/if}
      {#if !gained.length && !halfNew}
        <p class="small muted">
          {#if today != null}Risultato di oggi: {valueText(exercise, today, value.tier)}.{/if}
          {#if goal && today != null}L’obiettivo è {valueText(exercise, goal.goal, goal.tier)}.{/if}
        </p>
      {/if}
    </div>

    <div class="quality">
      <span class="small muted">Qualità del colpo (facoltativa)</span>
      <div class="q" role="radiogroup" aria-label="Qualità da 0 a 5">
        {#each QUALITY as q (q)}
          <button role="radio" aria-checked={value.q === q} class:on={value.q === q} onclick={() => set({ q: value.q === q ? null : q })}>{q}</button>
        {/each}
      </div>
    </div>
  {/if}
</section>

<style>
  .goal {
    display: flex;
    flex-direction: column;
    gap: 14px;
    border-color: color-mix(in srgb, var(--m) 45%, var(--line));
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  header strong {
    font-size: 17px;
    font-weight: 600;
  }
  .result,
  .tries {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .result .link,
  .tries .link {
    margin-left: auto;
  }
  .big {
    font-size: 34px;
    font-weight: 560;
  }
  .try {
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--sunk);
    font-family: var(--mono);
    font-size: 15px;
  }
  .try small {
    color: var(--ink-3);
    font-size: 11px;
  }
  .try.best {
    background: color-mix(in srgb, var(--up) 18%, var(--card));
    color: var(--up);
    font-weight: 600;
  }
  .running {
    border-color: var(--accent);
    color: var(--accent-ink);
    font-family: var(--mono);
  }
  .outcome {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .won {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border-radius: var(--r-s);
    background: color-mix(in srgb, var(--m) 16%, var(--card));
    animation: rise 0.45s var(--ease-out) both;
  }
  .won strong {
    font-size: 20px;
  }
  .quality {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .q {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
  }
  .q button {
    height: 34px;
    border-radius: 10px;
    background: var(--sunk);
    font-family: var(--mono);
    font-size: 14px;
    color: var(--ink-2);
    transition:
      background 0.2s var(--ease),
      transform 0.3s var(--spring);
  }
  .q button.on {
    background: var(--ink);
    color: var(--paper);
  }
  .q button:active {
    transform: scale(0.92);
  }
</style>
