<script>
  // Un anello che si riempie fino a `value` (da 0 a 1) con una molla, nel colore `color`.
  // Pieno: l'anello diventa spesso e dentro compare la spunta (lo decide chi lo usa, con `children`).
  import { Spring } from 'svelte/motion';
  import { reducedMotion } from '../util/motion.js';

  let { value = 0, color = 'var(--accent)', size = 76, stroke = 8, label = '', children = null } = $props();

  const p = new Spring(0, { stiffness: 0.06, damping: 0.55 });
  $effect(() => {
    p.set(Math.max(0, Math.min(1, value)), { instant: reducedMotion() });
  });
  const r = $derived((size - stroke) / 2);
  const c = $derived(2 * Math.PI * r);
</script>

<span class="pr" style:width="{size}px" style:height="{size}px" style:--rc={color} role="img" aria-label={label}>
  <svg width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true">
    <circle class="track" cx={size / 2} cy={size / 2} {r} stroke-width={stroke} />
    <circle class="bar" cx={size / 2} cy={size / 2} {r} stroke-width={stroke} stroke-dasharray={c} stroke-dashoffset={c * (1 - p.current)} />
  </svg>
  <span class="center" aria-hidden="true">{#if children}{@render children()}{/if}</span>
</span>

<style>
  .pr {
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
    stroke: color-mix(in srgb, var(--rc) 18%, var(--sunk));
  }
  .bar {
    stroke: var(--rc);
    stroke-linecap: round;
  }
  .center {
    position: relative;
    display: grid;
    place-items: center;
    text-align: center;
  }
</style>
