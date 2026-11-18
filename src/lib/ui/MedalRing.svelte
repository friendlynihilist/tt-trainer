<script>
  // La medaglia con l'anello: dentro lo scudo più alto preso (se non c'è ancora, quello dopo in
  // grigio; metà oro se c'è solo la metà), intorno l'avanzamento verso il gradino dopo, nel suo
  // colore. L'anello si riempie con una molla.
  import { Spring } from 'svelte/motion';
  import { TIER } from '../data/library.js';
  import { nextGoal, topTier, closeness } from '../engine/medals.js';
  import { reducedMotion } from '../util/motion.js';
  import MedalBadge from './MedalBadge.svelte';

  // pop: la medaglia entra con un rimbalzo (appena presa).
  let { exercise, medals = null, size = 56, pop = false } = $props();

  const top = $derived(topTier(medals));
  const halfOnly = $derived(!top && Boolean(medals?.half));
  const next = $derived(nextGoal(exercise, medals));
  const target = $derived(next ? (next.half ? Math.max(0.5, closeness(exercise, medals)) : closeness(exercise, medals)) : 1);
  const progress = new Spring(0, { stiffness: 0.08, damping: 0.5 });
  $effect(() => {
    progress.set(target, { instant: reducedMotion() });
  });

  const R = 46;
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
  <span class="shield"><MedalBadge tier={halfOnly ? 'O' : (top ?? next?.tier ?? 'B')} on={Boolean(top)} half={halfOnly} size={Math.round(size * 0.64)} {pop} label={false} /></span>
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
    stroke-width: 6;
  }
  .track {
    stroke: color-mix(in srgb, var(--medal-none) 70%, transparent);
  }
  .arc {
    stroke: var(--md);
    stroke-linecap: round;
  }
  .shield {
    position: relative;
    display: grid;
    place-items: center;
    margin-top: 2%;
  }
</style>
