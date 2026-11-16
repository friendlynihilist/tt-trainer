<script>
  // La regola dei livelli, animata: due test da 8 e il livello sale.
  import { onMount } from 'svelte';
  import Dots from './Dots.svelte';

  let { up = 8 } = $props();

  let phase = $state(0); // 0 vuoto · 1 primo test · 2 secondo test · 3 livello salito
  const HOLD = [700, 1300, 1300, 2600];

  onMount(() => {
    let timer;
    const tick = () => {
      phase = (phase + 1) % 4;
      timer = setTimeout(tick, HOLD[phase]);
    };
    timer = setTimeout(tick, HOLD[0]);
    return () => clearTimeout(timer);
  });
</script>

<div class="demo card" aria-hidden="true">
  {#each [1, 2] as row (row)}
    <div class="test">
      <span class="small muted">Test {row}</span>
      <span class="marks">
        {#each Array(10) as _, n (n)}
          <i class:on={phase >= row && n < up} style:transition-delay="{phase >= row ? n * 45 : 0}ms"></i>
        {/each}
      </span>
      <b class="mono" class:show={phase >= row}>{up}</b>
    </div>
  {/each}
  <hr class="rule" />
  <div class="result">
    <span class="tag" class:up={phase === 3}>{phase === 3 ? 'Sali' : 'Livello'}</span>
    <Dots level={phase === 3 ? 3 : 2} size={10} label={false} />
  </div>
</div>

<style>
  .demo {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .test {
    display: grid;
    grid-template-columns: 48px 1fr 20px;
    align-items: center;
    gap: 10px;
  }
  .marks {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 4px;
  }
  i {
    aspect-ratio: 1;
    max-width: 18px;
    width: 100%;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--line-strong);
    transition:
      background 0.3s var(--ease),
      box-shadow 0.3s var(--ease),
      transform 0.45s var(--spring);
  }
  i.on {
    background: var(--up);
    box-shadow: none;
    transform: scale(1.08);
  }
  b {
    font-size: 15px;
    font-weight: 600;
    opacity: 0;
    transition: opacity 0.3s var(--ease) 0.4s;
  }
  b.show {
    opacity: 1;
  }
  .result {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .tag {
    transition:
      background 0.3s var(--ease),
      color 0.3s var(--ease);
  }
</style>
