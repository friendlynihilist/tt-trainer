<script>
  // La fiamma delle settimane di fila: rossa con il cuore chiaro. Spenta (nessuna settimana) è grigia.
  let { size = 30, on = true } = $props();
</script>

<svg class="flame" class:off={!on} width={size} height={size * 1.14} viewBox="0 0 70 80" aria-hidden="true">
  <path class="out" d="M36 2c3 12 14 17 20 28 5 9 7 18 5 27-3 13-14 21-27 21S10 70 7 58c-2-9 1-17 6-23 2 5 4 8 8 9-2-14 3-30 15-42z" />
  <path class="in" d="M35 40c2 7 9 10 11 17 2 8-3 15-11 15s-13-6-12-13c1-4 3-6 5-8 1 3 2 4 4 5-1-6 0-11 3-16z" />
</svg>

<style>
  .flame {
    flex: none;
  }
  .out {
    fill: var(--fire);
  }
  .in {
    fill: var(--fire2);
  }
  .off .out {
    fill: var(--line-strong);
  }
  .off .in {
    fill: var(--card);
  }
</style>
