<script>
  // Anello di avanzamento. `progress` da 0 a 1; oltre 1 l'anello resta pieno e cambia tono.
  let { progress = 0, size = 240, stroke = 6, over = false, children = null, smooth = true } = $props();

  const r = $derived((size - stroke) / 2);
  const c = $derived(2 * Math.PI * r);
  const p = $derived(Math.max(0, Math.min(1, progress)));
</script>

<div class="ring" style:width="{size}px" style:height="{size}px" class:over>
  <svg width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true">
    <circle class="track" cx={size / 2} cy={size / 2} {r} stroke-width={stroke} />
    <circle
      class="bar"
      class:smooth
      cx={size / 2}
      cy={size / 2}
      {r}
      stroke-width={stroke}
      stroke-dasharray={c}
      stroke-dashoffset={c * (1 - p)}
    />
  </svg>
  <div class="center">
    {#if children}{@render children()}{/if}
  </div>
</div>

<style>
  .ring {
    position: relative;
    display: grid;
    place-items: center;
    flex: none;
  }
  svg {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
  }
  circle {
    fill: none;
  }
  .track {
    stroke: var(--line);
  }
  .bar {
    stroke: var(--ink);
    stroke-linecap: round;
    transition: stroke 0.4s var(--ease);
  }
  .bar.smooth {
    transition:
      stroke-dashoffset 1s linear,
      stroke 0.4s var(--ease);
  }
  .over .bar {
    stroke: var(--accent);
  }
  .center {
    position: relative;
    display: grid;
    place-items: center;
    text-align: center;
  }
</style>
