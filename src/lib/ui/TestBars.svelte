<script>
  // I punteggi dei test nel tempo: una barra per test. Verde sopra la soglia per salire,
  // rosso sotto quella per scendere. Le due soglie sono tracciate come linee.
  let { history = [], up = 8, down = 4, height = 56, max = 16 } = $props();

  const tests = $derived(history.filter((h) => h.score != null).slice(-max));
  const tone = (h) => (h.score >= up ? 'up' : h.score <= down && h.level > 1 ? 'down' : '');
</script>

<div class="bars" style:height="{height}px" role="img" aria-label="Punteggi dei test: {tests.map((t) => t.score).join(', ')}">
  <span class="line" style:bottom="{up * 10}%"></span>
  <span class="line low" style:bottom="{down * 10}%"></span>
  {#each tests as t, i (i)}
    <span class="col" title="L{t.level} · {t.score}/10">
      <i class={tone(t)} style:height="{Math.max(4, t.score * 10)}%" style:animation-delay="{i * 35}ms"></i>
      {#if i === 0 || tests[i - 1].level !== t.level}<b class="mono">L{t.level}</b>{/if}
    </span>
  {/each}
</div>

<style>
  .bars {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: 4px;
    margin-bottom: 16px;
  }
  .line {
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    border-top: 1px dashed var(--line-strong);
  }
  .line.low {
    opacity: 0.6;
  }
  .col {
    position: relative;
    flex: 1;
    max-width: 22px;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }
  i {
    width: 100%;
    border-radius: 4px 4px 2px 2px;
    background: var(--ink-3);
    transform-origin: bottom;
    animation: up 0.6s var(--ease-out) both;
  }
  i.up {
    background: var(--up);
  }
  i.down {
    background: var(--down);
  }
  b {
    position: absolute;
    bottom: -16px;
    left: 0;
    font-size: 10px;
    font-weight: 500;
    color: var(--ink-3);
  }
  @keyframes up {
    from {
      transform: scaleY(0);
    }
  }
</style>
