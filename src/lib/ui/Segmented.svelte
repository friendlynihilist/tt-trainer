<script>
  // Scelta fra poche opzioni, con il cursore che scivola.
  let { options, value, onchange, small = false } = $props();

  const index = $derived(Math.max(0, options.findIndex((o) => o.id === value)));
</script>

<div class="seg" class:small style:--n={options.length} style:--i={index} role="tablist">
  <span class="thumb" aria-hidden="true"></span>
  {#each options as o (o.id)}
    <button type="button" role="tab" aria-selected={o.id === value} class:on={o.id === value} onclick={() => onchange?.(o.id)}>
      {o.label}
    </button>
  {/each}
</div>

<style>
  .seg {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    padding: 3px;
    border-radius: 999px;
    background: var(--sunk);
  }
  .thumb {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 3px;
    width: calc((100% - 6px) / var(--n));
    border-radius: 999px;
    background: var(--card);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--line);
    transform: translateX(calc(var(--i) * 100%));
    transition: transform 0.45s var(--spring);
  }
  button {
    position: relative;
    height: 38px;
    padding: 0 14px;
    font-size: 14px;
    font-weight: 540;
    color: var(--ink-2);
    white-space: nowrap;
    transition: color 0.2s var(--ease);
  }
  .small button {
    height: 30px;
    font-size: 13px;
    padding: 0 10px;
  }
  button.on {
    color: var(--ink);
  }
</style>
