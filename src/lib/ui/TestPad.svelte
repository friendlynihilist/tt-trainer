<script>
  // Una serie di n tentativi (10 o 20): un tocco per ogni palla, dentro o fuori.
  // Chi ha contato a mente può scrivere direttamente il numero.
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import Undo from '@lucide/svelte/icons/undo-2';
  import { buzz } from '../store/ui.svelte.js';
  import Counter from './Counter.svelte';

  let { n = 10, marks = [], score = null, onchange } = $props();

  let manual = $state(false);
  const hits = $derived(marks.reduce((a, b) => a + b, 0));
  const done = $derived(score != null);

  function mark(v) {
    if (marks.length >= n) return;
    buzz(v ? 12 : [8, 50, 8]);
    const next = [...marks, v];
    const total = next.reduce((a, b) => a + b, 0);
    onchange?.({ marks: next, score: next.length >= n ? total : null });
  }
  function undo() {
    onchange?.({ marks: marks.slice(0, -1), score: null });
  }
  function reset() {
    manual = false;
    onchange?.({ marks: [], score: null });
  }
</script>

<div class="pad" class:done>
  {#if manual && !done}
    <Counter value={null} max={n} big label="Palle buone su {n}" onchange={(v) => v != null && onchange?.({ marks: [], score: v })} />
  {:else if !manual}
    <div class="marks" style:--cols={Math.min(n, 10)} role="img" aria-label="{hits} buone su {marks.length}">
      {#each Array(n) as _, i (i)}
        <i class:hit={marks[i] === 1} class:miss={marks[i] === 0} class:next={i === marks.length && !done}></i>
      {/each}
    </div>
  {/if}

  {#if done}
    <div class="result">
      <span class="big mono">{score}<small>/{n}</small></span>
      <button class="link" onclick={reset}>Rifai</button>
    </div>
  {:else if !manual}
    <div class="keys">
      <button class="key miss" onclick={() => mark(0)} aria-label="Fuori"><X size={30} strokeWidth={2.2} /></button>
      <button class="key hit" onclick={() => mark(1)} aria-label="Buona"><Check size={32} strokeWidth={2.4} /></button>
    </div>
    <div class="foot">
      <span class="mono count">{hits}<small>/{marks.length}</small></span>
      <span class="row g-12">
        {#if marks.length}
          <button class="link row g-4" onclick={undo}><Undo size={14} /> Annulla</button>
        {/if}
        <button class="link" onclick={() => (manual = true)}>Scrivi il numero</button>
      </span>
    </div>
  {:else}
    <div class="foot">
      <span class="small muted">Quante buone su {n}?</span>
      <button class="link" onclick={() => (manual = false)}>Conta palla per palla</button>
    </div>
  {/if}
</div>

<style>
  .pad {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .marks {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 6px;
  }
  i {
    aspect-ratio: 1;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--line-strong);
    transition:
      background 0.25s var(--ease),
      box-shadow 0.25s var(--ease),
      transform 0.5s var(--spring);
  }
  i.next {
    box-shadow: inset 0 0 0 1.5px var(--ink);
    transform: scale(1.12);
  }
  i.hit {
    background: var(--up);
    box-shadow: none;
    animation: pop 0.45s var(--spring);
  }
  i.miss {
    background: var(--down-soft);
    box-shadow: inset 0 0 0 1.5px var(--down);
    animation: pop 0.45s var(--spring);
  }
  .keys {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 10px;
  }
  .key {
    display: grid;
    place-items: center;
    height: 84px;
    border-radius: 22px;
    transition:
      transform 0.25s var(--spring),
      background 0.2s var(--ease);
  }
  .key:active {
    transform: scale(0.94);
  }
  .key.hit {
    background: var(--up);
    color: var(--paper);
  }
  .key.miss {
    background: var(--sunk);
    color: var(--ink-2);
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 24px;
  }
  .count {
    font-size: 20px;
    font-weight: 560;
  }
  small {
    font-size: 0.6em;
    color: var(--ink-3);
    font-weight: 500;
  }
  .result {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .big {
    font-size: 40px;
    font-weight: 560;
    line-height: 1;
    animation: pop 0.5s var(--spring) both;
  }
  .result .link {
    margin-left: auto;
  }
</style>
