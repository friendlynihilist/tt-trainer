<script>
  // I mattoni di un allenamento in una riga di pillole: il colore, il nome e i minuti di ognuno.
  // solid: pillole piene e chiare, per stare sopra il tavolo blu di Oggi.
  let { bricks = [], solid = false } = $props();
</script>

<span class="pills" class:solid>
  {#each bricks as b, i (i)}
    <span class="pill" data-fam={b.fam}><i></i>{b.name}<b>{b.minutes}′</b></span>
  {/each}
</span>

<style>
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 10px 0 8px;
    border-radius: 9px;
    background: var(--f-soft);
    color: var(--ink);
    font-size: 13px;
    font-weight: 650;
    white-space: nowrap;
  }
  .pill i {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: var(--f);
  }
  .pill b {
    font-weight: 600;
    color: var(--ink-2);
    font-variant-numeric: tabular-nums;
  }
  /* Sul tavolo: piene, così si leggono anche sopra le righe del campo. */
  .solid .pill {
    background: #fff;
    color: #10151d;
    box-shadow: 0 2px 0 rgba(6, 30, 60, 0.35);
  }
  .solid .pill b {
    color: #5a606b;
  }
</style>
