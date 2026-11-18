<script>
  // Le istruzioni di una fase della sessione. Usato sia in «Oggi» sia nella sessione dal vivo.
  import Target from '@lucide/svelte/icons/target';
  import { partnerExercise } from '../engine/stats.js';
  import { app } from '../store/app.svelte.js';
  import { VALID_ATTEMPT, MATCH_TYPES, SCHEMES, DEFAULT_SCHEME } from '../data/program.js';
  import { matchHalves } from '../engine/compose.js';
  import Avatar from './Avatar.svelte';

  // part: la metà della partitella in corso (1 o 2), solo nella sessione dal vivo.
  // onscheme, onmore: per cambiare lo schema della partitella, solo nella sessione dal vivo.
  let { step, partner = null, big = false, showTest = true, part = null, onscheme = null, onmore = null } = $props();

  const mate = $derived(step.kind === 'exercise' && partner ? partnerExercise(partner, step.track, app.catalog) : null);
</script>

<div class="body" class:big>
  {#if step.kind === 'warmup'}
    <p>{step.text}</p>
    {#if step.maint}
      <div class="aside">
        <span class="tag line">Ultimi {step.maint.minutes}′</span>
        <p>
          <strong>Mantenimento.</strong>
          {step.maint.name}, livello {step.maint.level}: {step.maint.exercise.drill}
        </p>
        {#if step.maint.test && showTest}
          <p class="test"><span class="tag accent">Test</span> {step.maint.exercise.test}</p>
        {/if}
      </div>
    {/if}
  {:else if step.kind === 'serve'}
    <dl>
      <dt>Chi serve</dt>
      <dd>{step.serve.server}</dd>
      <dt>Chi riceve</dt>
      <dd>{step.serve.receiver}</dd>
    </dl>
    {#if step.test && showTest}
      <p class="test"><span class="tag accent">Test</span> {step.serve.test}</p>
    {/if}
  {:else if step.kind === 'exercise'}
    <p>{step.exercise.drill}</p>
    <p class="goal"><Target size={big ? 17 : 15} strokeWidth={1.8} /> <span>{step.exercise.goal}</span></p>
    {#if showTest}
      {#if step.placement}
        <p class="test">
          <span class="tag accent">Test di partenza</span>
          Parti dal livello 1: con almeno {app.rules.up} su 10 provi quello dopo. Il primo che non passi è il tuo.
        </p>
      {:else if step.test}
        <p class="test"><span class="tag accent">Test</span> {step.exercise.test}</p>
      {/if}
    {/if}
    {#if mate}
      <p class="mate">
        <Avatar name={partner.name} photo={partner.photo} size={20} />
        <span>
          <strong>{partner.name.split(/\s+/)[0]}</strong> è al livello {mate.level}: {mate.exercise.drill}
        </span>
      </p>
    {/if}
  {:else if step.kind === 'match'}
    {@const [first, second] = matchHalves(step.minutes)}
    {@const scheme = step.scheme ?? SCHEMES[DEFAULT_SCHEME]}
    {#if step.note}<p>{step.note}</p>{/if}
    <div class="half" class:now={part === 1} class:done={part === 2}>
      <span class="tag line">Prima metà · {first}′</span>
      <p><strong>{MATCH_TYPES.risk.name}.</strong> {MATCH_TYPES.risk.text} {MATCH_TYPES.risk.why}</p>
    </div>
    <div class="half" class:now={part === 2}>
      <span class="tag line">Seconda metà · {second}′</span>
      <p><strong>{MATCH_TYPES.scheme.name}.</strong> {MATCH_TYPES.scheme.text}</p>
      <p class="scheme"><strong>Schema: {scheme.name.toLowerCase()}.</strong> {scheme.text}</p>
      {#if onscheme}
        <div class="chips" role="group" aria-label="Schema">
          {#each step.schemes ?? [] as id (id)}
            <button class="chip" aria-pressed={scheme.id === id} onclick={() => onscheme(id)}>{SCHEMES[id].name}</button>
          {/each}
          {#if onmore}<button class="chip" aria-pressed={!(step.schemes ?? []).includes(scheme.id)} onclick={onmore}>Altri</button>{/if}
        </div>
      {/if}
    </div>
  {:else if step.kind === 'free'}
    {#if step.text}<p>{step.text}</p>{/if}
  {/if}
  {#if big && (step.test || step.placement || step.maint?.test)}
    <p class="small faint">{VALID_ATTEMPT}</p>
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
  .goal {
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
  .test {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
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
  .half .chips {
    margin-top: 4px;
    gap: 6px;
  }
  .half .chip {
    min-height: 34px;
    padding: 4px 12px;
    font-size: 14px;
  }
  .mate {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: var(--r-s);
    background: var(--sunk);
    font-size: 13px;
    color: var(--ink-2);
  }
  .big .mate {
    font-size: 14px;
  }
  .mate :global(.avatar) {
    margin-top: 1px;
  }
</style>
