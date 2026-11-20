<script>
  // La medaglia disegnata: uno scudo per gradino (bronzo, argento, oro, platino), più la fiamma
  // della costanza (F). Presa: a colori. Da prendere: grigia. Metà oro: metà grigia e metà a colori.
  //
  // shine: quando la medaglia entra in vista, un riflesso la attraversa una volta, dall'alto a
  // destra al basso a sinistra, ritagliato sulla forma dello scudo. Argento: un bagliore e un
  // riflesso tenue. Oro: bagliore e riflesso pieno. Platino: bagliore e riflesso arcobaleno.
  // Fiamma: un bagliore caldo. Bronzo: niente. Con «riduci movimento», niente.
  import bronzo from '../../assets/medals/bronzo.svg';
  import argento from '../../assets/medals/argento.svg';
  import oro from '../../assets/medals/oro.svg';
  import platino from '../../assets/medals/platino.svg';
  import fiamma from '../../assets/medals/fiamma.svg';
  import { reducedMotion } from '../util/motion.js';
  import { TIER } from '../data/library.js';

  const SRC = { B: bronzo, A: argento, O: oro, P: platino, F: fiamma };

  // size: la larghezza in px (lo scudo è un po' più alto che largo).
  let { tier, on = true, half = false, size = 40, pop = false, label = true, shine = false, delay = 0 } = $props();

  let el = $state();
  let go = $state(false);
  $effect(() => {
    if (!shine || !on || half || tier === 'B' || !el || reducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          go = true;
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  });
  const text = $derived(`${TIER[tier]?.name ?? ''}${half ? ', metà' : on ? '' : ', da prendere'}`);
</script>

<span
  class="badge"
  class:pop
  bind:this={el}
  style:--s="{size}px"
  role={label ? 'img' : undefined}
  aria-label={label ? text : undefined}
  aria-hidden={label ? undefined : 'true'}
>
  <img src={SRC[tier] ?? SRC.B} alt="" class:off={!on || half} draggable="false" />
  {#if half}<img src={SRC[tier] ?? SRC.O} alt="" class="half" draggable="false" />{/if}
  {#if go}
    <span class="gloss" data-t={tier} style={`--mask: url("${SRC[tier]}"); --delay: ${delay}ms`} aria-hidden="true">
      <i class="sweep"></i>
      <i class="glare"></i>
    </span>
  {/if}
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
  /* ── Il riflesso ── */
  .gloss {
    position: absolute;
    inset: 0;
    pointer-events: none;
    -webkit-mask: var(--mask) center / 100% 100% no-repeat;
    mask: var(--mask) center / 100% 100% no-repeat;
  }
  .gloss i {
    position: absolute;
    inset: 0;
    opacity: 0;
  }
  /* Una fascia di luce obliqua che scende dall'alto a destra al basso a sinistra. */
  .sweep {
    background: linear-gradient(225deg, transparent 38%, rgb(255 255 255 / 0.95) 50%, transparent 62%) no-repeat;
    background-size: 300% 300%;
    animation: sweep 1.2s cubic-bezier(0.45, 0, 0.3, 1) both;
    animation-delay: var(--delay, 0ms);
  }
  /* Il bagliore: una luce che si accende in alto a destra e si spegne. */
  .glare {
    background: radial-gradient(circle at 74% 20%, rgb(255 255 255 / 0.95), transparent 45%);
    animation: glare 0.9s var(--ease) both;
    animation-delay: var(--delay, 0ms);
  }
  [data-t='A'] .sweep {
    --peak: 0.45;
  }
  [data-t='A'] .glare {
    --peak: 0.55;
  }
  [data-t='O'] .sweep {
    --peak: 0.9;
  }
  [data-t='O'] .glare {
    --peak: 0.8;
  }
  [data-t='P'] .sweep {
    --peak: 0.85;
    background-image: linear-gradient(225deg, transparent 30%, #ffe66b 40%, #7dffb0 45%, #6bd5ff 50%, #b98cff 55%, #ff7ac4 60%, transparent 70%);
    animation-duration: 1.5s;
  }
  [data-t='P'] .glare {
    --peak: 0.85;
  }
  [data-t='F'] .sweep {
    display: none;
  }
  [data-t='F'] .glare {
    --peak: 0.7;
    background: radial-gradient(circle at 50% 40%, rgb(255 236 200 / 0.95), transparent 55%);
  }
  @keyframes sweep {
    0% {
      opacity: var(--peak, 0.6);
      background-position: 0% 100%;
    }
    85% {
      opacity: var(--peak, 0.6);
    }
    100% {
      opacity: 0;
      background-position: 100% 0%;
    }
  }
  @keyframes glare {
    0%,
    100% {
      opacity: 0;
    }
    35% {
      opacity: var(--peak, 0.6);
    }
  }

  .pop {
    animation: medal-in 0.75s var(--spring) both;
  }
</style>
