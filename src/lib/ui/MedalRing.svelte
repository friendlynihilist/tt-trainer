<script>
  // La medaglia con l'anello: dentro la medaglia più alta presa (grigia se non c'è ancora),
  // intorno l'avanzamento verso il gradino dopo, nel suo colore. L'anello si riempie con una molla.
  import { Spring } from 'svelte/motion';
  import { TIER } from '../data/library.js';
  import { nextGoal, topTier, closeness } from '../engine/medals.js';
  import { reducedMotion } from '../util/motion.js';

  // pop: la medaglia entra con un rimbalzo (appena presa).
  let { exercise, medals = null, size = 56, pop = false } = $props();

  const top = $derived(topTier(medals));
  const next = $derived(nextGoal(exercise, medals));
  const target = $derived(next ? (next.half ? Math.max(0.5, closeness(exercise, medals)) : closeness(exercise, medals)) : 1);
  const progress = new Spring(0, { stiffness: 0.08, damping: 0.5 });
  $effect(() => {
    progress.set(target, { instant: reducedMotion() });
  });

  const R = 44;
  const C = 2 * Math.PI * R;
  const label = $derived(
    [top ? TIER[top].name : 'Nessuna medaglia', next ? `prossima: ${TIER[next.tier].name.toLowerCase()}, ${Math.round(target * 100)}%` : 'tutte prese'].join(', ')
  );
</script>

<span class="ring" style:--s="{size}px" data-medal={next?.tier ?? top ?? 'P'} role="img" aria-label={label}>
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <circle class="track" cx="50" cy="50" r={R} />
    <circle class="arc" cx="50" cy="50" r={R} stroke-dasharray={C} stroke-dashoffset={C * (1 - Math.min(1, Math.max(0, progress.current)))} />
  </svg>
  <span class="disc" class:pop data-medal={top ?? 'none'} class:empty={!top}></span>
</span>

<style>
  .ring {
    position: relative;
    display: inline-grid;
    place-items: center;
    flex: none;
    width: var(--s);
    height: var(--s);
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  circle {
    fill: none;
    stroke-width: 9;
  }
  .track {
    stroke: color-mix(in srgb, var(--medal-none) 70%, transparent);
  }
  .arc {
    stroke: var(--md);
    stroke-linecap: round;
  }
  .disc {
    width: 62%;
    height: 62%;
    border-radius: 50%;
    background: radial-gradient(circle at 34% 30%, color-mix(in srgb, #fff 50%, var(--md)), var(--md) 64%);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, #000 16%, var(--md)),
      0 2px 0 color-mix(in srgb, #000 22%, var(--md));
  }
  .disc.empty {
    background: var(--medal-none);
    box-shadow: none;
  }
  .disc.pop {
    animation: medal-in 0.75s var(--spring) both;
  }
</style>
