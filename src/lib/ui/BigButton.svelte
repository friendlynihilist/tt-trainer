<script>
  // Il pulsante grande: tutta la larghezza, arancione con il bordo in rilievo. Un verbo grande
  // («Inizia», «Riprendi») e sotto cosa parte. A destra, se c'è, la durata.
  import Play from '@lucide/svelte/icons/play';

  let { verb, sub = '', minutes = null, icon: Icon = Play, onclick, label = undefined } = $props();
</script>

<button class="big raise" {onclick} aria-label={label}>
  <span class="ico"><Icon size={26} fill="currentColor" strokeWidth={0} /></span>
  <span class="txt">
    <span class="verb">{verb}</span>
    {#if sub}<span class="sub">{sub}</span>{/if}
  </span>
  {#if minutes != null}
    <span class="min"><b class="t-num">{minutes}</b><small class="t-caps">min</small></span>
  {/if}
</button>

<style>
  .big {
    --edge-c: color-mix(in srgb, var(--accent) 62%, #000);
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-height: 92px;
    padding: 16px 20px 16px 16px;
    border-radius: var(--r-brick);
    background: var(--accent);
    color: #fff;
    text-align: left;
  }
  .ico {
    display: grid;
    place-items: center;
    flex: none;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #fff;
    color: var(--accent);
  }
  .ico :global(svg) {
    margin-left: 3px;
  }
  .txt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .verb {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.05;
  }
  .sub {
    font-size: 15px;
    font-weight: 600;
    opacity: 0.92;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .min {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: none;
    line-height: 1;
  }
  .min b {
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.04em;
  }
  .min small {
    font-size: 11px;
    opacity: 0.85;
    margin-top: 3px;
  }
</style>
