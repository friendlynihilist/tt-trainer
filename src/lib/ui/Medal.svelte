<script>
  // Una medaglia: piena se presa, mezza per l'oro con una seduta sola, vuota se da prendere.
  import { TIER } from '../data/library.js';

  let { tier, on = true, half = false, size = 14, pop = false, label = true } = $props();
  const text = $derived(`${TIER[tier]?.name ?? ''}${half ? ', metà' : on ? '' : ', da prendere'}`);
</script>

<span
  class="medal"
  class:on={on && !half}
  class:half
  class:pop
  data-tier={tier}
  style:--s="{size}px"
  role={label ? 'img' : undefined}
  aria-label={label ? text : undefined}
  aria-hidden={label ? undefined : 'true'}
></span>

<style>
  .medal {
    display: inline-block;
    flex: none;
    width: var(--s);
    height: var(--s);
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--m) var(--m-empty, 60%), transparent);
    transition:
      background 0.3s var(--ease),
      box-shadow 0.3s var(--ease);
  }
  .medal.on {
    background: radial-gradient(circle at 34% 30%, color-mix(in srgb, #fff 55%, var(--m)), var(--m) 62%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 14%, var(--m));
  }
  .medal.half {
    background: linear-gradient(90deg, var(--m) 50%, transparent 50%);
  }
  .pop {
    animation: medal-in 0.75s var(--spring) both;
  }
</style>
