<script>
  // Il badge del livello: il colore del livello, cinque tacche (piene fino al livello) e il nome.
  // Il colore non è mai l'unica informazione: ci sono anche le tacche e il nome.
  import { PLAYER_LEVEL } from '../data/library.js';

  let { level, onclick = null, small = false } = $props();
  const info = $derived(PLAYER_LEVEL[level] ?? PLAYER_LEVEL.principiante);
</script>

<svelte:element
  this={onclick ? 'button' : 'span'}
  class="lv"
  class:small
  data-level={info.id}
  {onclick}
  role={onclick ? 'button' : 'img'}
  aria-label="Livello {info.name.toLowerCase()}, {info.n} su 5{onclick ? '. Cambia' : ''}"
>
  <span class="ticks" aria-hidden="true">
    {#each [1, 2, 3, 4, 5] as n (n)}<i class:on={n <= info.n}></i>{/each}
  </span>
  <span class="t-caps" aria-hidden="true">{info.name}</span>
</svelte:element>

<style>
  .lv {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 30px;
    padding: 0 12px 0 10px;
    border-radius: 999px;
    background: var(--lv);
    color: var(--lv-on);
    flex: none;
  }
  .lv.small {
    height: 24px;
    padding: 0 9px 0 8px;
    gap: 6px;
  }
  .small .t-caps {
    font-size: 10.5px;
  }
  .ticks {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 12px;
  }
  .ticks i {
    width: 3px;
    border-radius: 1px;
    background: color-mix(in srgb, var(--lv-on) 35%, transparent);
  }
  .ticks i:nth-child(1) { height: 5px; }
  .ticks i:nth-child(2) { height: 7px; }
  .ticks i:nth-child(3) { height: 9px; }
  .ticks i:nth-child(4) { height: 11px; }
  .ticks i:nth-child(5) { height: 12px; }
  .ticks i.on {
    background: var(--lv-on);
  }
  button.lv:active {
    transform: scale(0.96);
  }
  button.lv {
    transition: transform var(--dur-fast) var(--ease);
  }
</style>
