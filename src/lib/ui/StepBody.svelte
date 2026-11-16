<script>
  // Le istruzioni di una fase della sessione. Usato sia in «Oggi» sia nella sessione dal vivo.
  import Target from '@lucide/svelte/icons/target';
  import { partnerExercise } from '../engine/stats.js';
  import { VALID_ATTEMPT } from '../data/program.js';
  import Avatar from './Avatar.svelte';

  let { step, partner = null, big = false, showTest = true } = $props();

  const mate = $derived(step.kind === 'exercise' && partner ? partnerExercise(partner, step.track) : null);
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
          Parti dal livello 1: con almeno 8 su 10 provi quello dopo. Il primo che non passi è il tuo.
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
    <p>{step.rule}</p>
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
