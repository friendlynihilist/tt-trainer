<script>
  // La tua metà del tavolo vista dall'alto: tocca dove arriva la palla.
  // In alto la rete, in basso la linea di fondo. Per i mancini i lati si scambiano.
  import { ZONE_DEPTHS } from '../data/taxonomy.js';
  import { buzz } from '../store/ui.svelte.js';

  let { value = null, onchange, lefty = false } = $props();

  const sides = $derived(lefty ? ['d', 'c', 'r'] : ['r', 'c', 'd']);

  function pick(side, depth) {
    buzz();
    const same = value?.side === side && value?.depth === depth;
    onchange?.(same ? null : { side, depth });
  }
</script>

<div class="wrap">
  <div class="table" role="group" aria-label="Zona del tavolo">
    {#each ZONE_DEPTHS as depth (depth.id)}
      {#each sides as side (side)}
        <button
          type="button"
          class:on={value?.side === side && value?.depth === depth.id}
          aria-pressed={value?.side === side && value?.depth === depth.id}
          aria-label="{depth.name}, {side === 'd' ? 'lato dritto' : side === 'r' ? 'lato rovescio' : 'centro'}"
          onclick={() => pick(side, depth.id)}
        >
          <i></i>
        </button>
      {/each}
    {/each}
    <span class="midline" aria-hidden="true"></span>
  </div>
  <div class="legend small faint">
    <span>{lefty ? 'dritto' : 'rovescio'}</span>
    <span>gomito</span>
    <span>{lefty ? 'rovescio' : 'dritto'}</span>
  </div>
</div>

<style>
  .wrap {
    width: min(100%, 260px);
  }
  .table {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: 0.8fr 1fr 1.1fr;
    aspect-ratio: 152 / 137;
    border-radius: 6px;
    background: var(--sunk);
    box-shadow: inset 0 0 0 1.5px var(--line-strong);
    border-top: 4px solid var(--ink);
    overflow: hidden;
  }
  button {
    position: relative;
    display: grid;
    place-items: center;
    box-shadow: inset 0 0 0 0.5px var(--line);
    transition: background 0.25s var(--ease);
  }
  button i {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    transform: scale(0);
    transition: transform 0.45s var(--spring);
  }
  button.on {
    background: var(--accent-soft);
  }
  button.on i {
    transform: scale(1);
  }
  .midline {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1.5px;
    background: var(--line-strong);
    pointer-events: none;
  }
  .legend {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    text-align: center;
    margin-top: 6px;
    font-size: 11px;
  }
</style>
