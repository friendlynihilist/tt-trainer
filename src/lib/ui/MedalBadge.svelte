<script>
  // La medaglia disegnata: uno scudo per gradino (bronzo, argento, oro, platino).
  // Presa: a colori. Da prendere: grigia. Metà oro: metà grigia e metà a colori.
  import bronzo from '../../assets/medals/bronzo.svg';
  import argento from '../../assets/medals/argento.svg';
  import oro from '../../assets/medals/oro.svg';
  import platino from '../../assets/medals/platino.svg';
  import { TIER } from '../data/library.js';

  const SRC = { B: bronzo, A: argento, O: oro, P: platino };

  // size: la larghezza in px (lo scudo è un po' più alto che largo).
  let { tier, on = true, half = false, size = 40, pop = false, label = true } = $props();
  const text = $derived(`${TIER[tier]?.name ?? ''}${half ? ', metà' : on ? '' : ', da prendere'}`);
</script>

<span
  class="badge"
  class:pop
  style:--s="{size}px"
  role={label ? 'img' : undefined}
  aria-label={label ? text : undefined}
  aria-hidden={label ? undefined : 'true'}
>
  <img src={SRC[tier] ?? SRC.B} alt="" class:off={!on || half} draggable="false" />
  {#if half}<img src={SRC[tier] ?? SRC.O} alt="" class="half" draggable="false" />{/if}
</span>

<style>
  .badge {
    position: relative;
    display: inline-block;
    flex: none;
    width: var(--s);
    height: calc(var(--s) * 1.125);
  }
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    user-select: none;
    -webkit-user-drag: none;
  }
  .off {
    filter: grayscale(1) opacity(0.38);
  }
  .half {
    clip-path: inset(0 50% 0 0);
  }
  .pop {
    animation: medal-in 0.75s var(--spring) both;
  }
</style>
