<script>
  // Le istruzioni di una fase della sessione. Usato sia in «Oggi» sia nella sessione dal vivo.
  import Target from '@lucide/svelte/icons/target';
  import { app } from '../store/app.svelte.js';
  import { MATCH_TYPES, SCHEMES, DEFAULT_SCHEME } from '../data/program.js';
  import { matchHalves, schemeOf } from '../engine/compose.js';
  import { nextGoal, goalText } from '../engine/medals.js';
  import Medal from './MedalBadge.svelte';

  // part: la metà della partitella in corso (1 o 2), solo nella sessione dal vivo.
  // onscheme, onmore: per cambiare lo schema della partitella, solo nella sessione dal vivo.
  // showGoal: mostra il prossimo obiettivo dell'esercizio.
  let { step, big = false, showGoal = true, part = null, onscheme = null, onmore = null } = $props();

  const ex = $derived(step.ex ? app.catalog.exercise(step.ex) : null);
  const goal = $derived(ex ? nextGoal(ex, app.medals[ex.id]) : null);
  const maint = $derived(step.maint?.ex ? app.catalog.exercise(step.maint.ex) : null);
</script>

<div class="body" class:big>
  {#if step.kind === 'warmup'}
    <p>{step.text}</p>
    {#if maint}
      <div class="aside">
        <span class="tag line">Ultimi {step.maint.minutes}′</span>
        <p><strong>Mantenimento: {maint.name}.</strong> {maint.text}</p>
      </div>
    {/if}
  {:else if step.kind === 'serve'}
    <dl>
      <dt>Chi serve</dt>
      <dd>{step.serve.server}</dd>
      <dt>Chi riceve</dt>
      <dd>{step.serve.receiver}</dd>
    </dl>
    {#if ex && showGoal}
      <p class="next">
        <Medal tier={goal?.tier ?? 'P'} on={!goal} half={goal?.half} size={big ? 22 : 18} />
        <span><strong>{ex.name}</strong>{goal ? ` · ${goalText(ex, goal)}` : ' · tutte le medaglie prese'}</span>
      </p>
    {/if}
  {:else if step.kind === 'exercise' && ex}
    <p>{ex.text}</p>
    {#if ex.quality}
      <p class="goal"><Target size={big ? 17 : 15} strokeWidth={1.8} /> <span>{ex.quality}</span></p>
    {/if}
    {#if showGoal && goal}
      <p class="next">
        <Medal tier={goal.tier} on={false} half={goal.half} size={big ? 22 : 18} />
        <span>Prossimo obiettivo · {goalText(ex, goal)}</span>
      </p>
    {/if}
  {:else if step.kind === 'match'}
    {@const [first, second] = matchHalves(step.minutes)}
    {@const scheme = step.scheme ?? SCHEMES[DEFAULT_SCHEME]}
    {#if step.note}<p>{step.note}</p>{/if}
    <div class="half" class:now={part === 1} class:done={part === 2}>
      <span class="tag line">Prima metà · {first}′</span>
      <p><strong>{MATCH_TYPES.risk.name}.</strong> {MATCH_TYPES.risk.text} {MATCH_TYPES.risk.why}</p>
      {#if step.variant?.risk}<p class="variant">{step.variant.risk}</p>{/if}
    </div>
    <div class="half" class:now={part === 2}>
      <span class="tag line">Seconda metà · {second}′</span>
      <p><strong>{MATCH_TYPES.scheme.name}.</strong> {MATCH_TYPES.scheme.text}</p>
      <p class="scheme"><strong>Schema: {scheme.name.toLowerCase()}.</strong> {scheme.text}</p>
      {#if step.variant?.scheme}<p class="variant">{step.variant.scheme}</p>{/if}
      {#if onscheme}
        <div class="chips" role="group" aria-label="Schema">
          {#each step.schemes ?? [] as id (id)}
            <button class="chip" aria-pressed={scheme.id === id} onclick={() => onscheme(id)}>{schemeOf(id, app.catalog)?.name ?? id}</button>
          {/each}
          {#if onmore}<button class="chip" aria-pressed={!(step.schemes ?? []).includes(scheme.id)} onclick={onmore}>Altri</button>{/if}
        </div>
      {/if}
    </div>
  {:else if step.kind === 'free'}
    {#if step.text}<p>{step.text}</p>{/if}
  {/if}
</div>

<style>
  .body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--ink-2);
    font-size: 14px;
  }
  .body.big {
    font-size: 17px;
    line-height: 1.42;
    gap: 14px;
    color: var(--ink);
  }
  strong {
    color: var(--ink);
    font-weight: 560;
  }
  dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 14px;
  }
  dt {
    color: var(--ink-3);
    white-space: nowrap;
  }
  .big dt {
    font-size: 14px;
    padding-top: 3px;
  }
  dd {
    margin: 0;
  }
  .goal,
  .next {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    color: var(--ink);
  }
  .goal :global(svg) {
    flex: none;
    margin-top: 2px;
    color: var(--accent);
  }
  .big .goal :global(svg) {
    margin-top: 3px;
  }
  .next {
    color: var(--ink-2);
    align-items: center;
  }
  .aside {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding-top: 2px;
  }
  .half {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .big .half {
    padding: 12px 14px;
    border-radius: var(--r-s);
    border: 1px solid var(--line);
    transition:
      border-color 0.3s var(--ease),
      opacity 0.3s var(--ease);
  }
  .big .half.now {
    border-color: var(--accent);
  }
  .big .half.done {
    opacity: 0.55;
  }
  .scheme {
    color: var(--ink);
  }
  .variant {
    padding-left: 10px;
    border-left: 2px solid var(--accent);
    color: var(--ink);
  }
  .half .chips {
    margin-top: 4px;
    gap: 6px;
  }
  .half .chip {
    min-height: 34px;
    padding: 4px 12px;
    font-size: 14px;
  }
</style>
