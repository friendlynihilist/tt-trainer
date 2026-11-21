<script>
  // La guida a fuoco: tutto scuro tranne la zona di cui si parla, e un fumetto che la spiega.
  // Fuori dalla zona illuminata non si tocca niente. Le zone si rimisurano a ogni fotogramma, così
  // seguono le pagine che entrano, lo scorrimento e i fondamentali che si allungano.
  import { onMount } from 'svelte';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { TOURS, coachNext, coachSkip } from './tours.js';
  import MedalBadge from './MedalBadge.svelte';

  const steps = $derived(ui.coach ? TOURS[ui.coach.tour] : []);
  const step = $derived(ui.coach ? steps[ui.coach.i] : null);
  // Con un foglio o la sessione aperti sopra, e durante un trascinamento, la guida non si vede.
  const hidden = $derived(ui.coachBusy || ui.sheets.length > 0 || Boolean(ui.live) || Boolean(ui.news));
  const blocked = $derived(Boolean(step?.need) && !step.need());

  let path = $state('');
  let rings = $state([]);
  let tipTop = $state(-1);
  let tip = $state();

  function rectOf(hole) {
    const sel = typeof hole === 'function' ? hole() : hole;
    const els = sel.all ? [...document.querySelectorAll(sel.all)] : [document.querySelector(sel)].filter(Boolean);
    if (!els.length) return null;
    const rs = els.map((e) => e.getBoundingClientRect());
    return { left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)), right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)) };
  }

  function layout() {
    if (!step) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    // La barra in basso resta scura: le zone si fermano sopra.
    const bar = document.querySelector('nav.bar');
    const floor = bar && getComputedStyle(bar).display !== 'none' && !document.querySelector('.builder') ? bar.getBoundingClientRect().top - 6 : H - 6;
    let d = `M0 0H${W}V${H}H0Z`;
    let top = H;
    let bottom = 0;
    const next = [];
    for (const hole of step.holes) {
      const r = rectOf(hole);
      if (!r) continue;
      const x = Math.max(6, r.left - 6);
      const y = Math.max(6, r.top - 6 - (step.up ?? 0));
      const w = Math.min(W - 6, r.right + 6) - x;
      const h = Math.min(floor, r.bottom + 6) - y;
      if (w < 20 || h < 20) continue;
      const q = Math.min(18, h / 2);
      d += `M${x + q} ${y}h${w - 2 * q}a${q} ${q} 0 0 1 ${q} ${q}v${h - 2 * q}a${q} ${q} 0 0 1 ${-q} ${q}h${-(w - 2 * q)}a${q} ${q} 0 0 1 ${-q} ${-q}v${-(h - 2 * q)}a${q} ${q} 0 0 1 ${q} ${-q}Z`;
      next.push({ x, y, w, h, q });
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + h);
    }
    if (d !== path) {
      path = d;
      rings = next;
    }
    const th = tip?.offsetHeight ?? 150;
    const above = top >= H - bottom;
    const t = Math.round(Math.max(10, Math.min(H - th - 10, next.length ? (above ? top - th - 14 : bottom + 14) : (H - th) / 2)));
    if (t !== tipTop) tipTop = t;
  }

  onMount(() => {
    let raf = requestAnimationFrame(function loop() {
      layout();
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  });

  // Un passo può chiedere di portare la sua zona al centro (una casella in fondo alla mappa).
  $effect(() => {
    if (!step?.scroll || hidden) return;
    const timer = setTimeout(() => {
      const sel = typeof step.holes[0] === 'function' ? step.holes[0]() : step.holes[0];
      document.querySelector(sel.all ?? sel)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 450);
    return () => clearTimeout(timer);
  });
</script>

{#if step && !hidden}
  {#key `${ui.coach.tour}-${ui.coach.i}`}
    <div class="coach">
      <div class="dim" style:clip-path={path ? `path(evenodd, "${path}")` : null}></div>
      {#if step.look}<div class="block"></div>{/if}
      {#each rings as r, i (i)}
        <i class="ring" style:left="{r.x}px" style:top="{r.y}px" style:width="{r.w}px" style:height="{r.h}px" style:border-radius="{r.q}px"></i>
      {/each}
      <div class="tip" role="dialog" aria-label={step.title} bind:this={tip} style:top="{tipTop}px" style:visibility={tipTop < 0 ? 'hidden' : null}>
        <b class="t-name title">{step.title}</b>
        {#if step.medals}
          <span class="three">
            {#each ['B', 'A', 'O'] as t (t)}<MedalBadge tier={t} size={40} />{/each}
          </span>
        {/if}
        <span class="text">{step.text}</span>
        <span class="foot">
          <button class="skip" onclick={coachSkip}>Salta la guida</button>
          <span class="dots" aria-hidden="true">
            {#each steps as _, k (k)}<i class:on={k === ui.coach.i}></i>{/each}
          </span>
          {#if blocked}
            <span class="spacer"></span>
          {:else}
            <button class="next" onclick={coachNext}>{ui.coach.i === steps.length - 1 ? 'Ho capito' : 'Avanti'}</button>
          {/if}
        </span>
      </div>
    </div>
  {/key}
{/if}

<style>
  .coach {
    position: fixed;
    inset: 0;
    z-index: 36;
    pointer-events: none;
    animation: in 0.3s 0.3s backwards;
  }
  @keyframes in {
    from {
      opacity: 0;
    }
  }
  .dim {
    position: absolute;
    inset: 0;
    background: rgba(9, 11, 18, 0.68);
    pointer-events: auto;
  }
  .block {
    position: absolute;
    inset: 0;
    pointer-events: auto;
  }
  .ring {
    position: absolute;
    box-shadow:
      0 0 0 3px #fff,
      0 0 0 6px color-mix(in srgb, var(--accent) 70%, transparent);
    animation: ring 1.8s ease-in-out infinite;
  }
  @keyframes ring {
    50% {
      box-shadow:
        0 0 0 3px #fff,
        0 0 0 12px transparent;
    }
  }
  .tip {
    position: absolute;
    left: 50%;
    translate: -50% 0;
    width: min(420px, 100vw - 28px);
    padding: 16px 16px 8px;
    border-radius: 22px;
    background: var(--card);
    color: var(--ink);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: auto;
  }
  .title {
    font-size: 20px;
  }
  .text {
    line-height: 1.4;
  }
  .three {
    display: flex;
    gap: 16px;
    padding: 2px 0;
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .skip {
    min-height: 44px;
    color: var(--ink-3);
    font-weight: 600;
  }
  .dots {
    flex: 1;
    display: flex;
    justify-content: center;
    gap: 5px;
  }
  .dots i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--line-strong);
  }
  .dots i.on {
    width: 20px;
    border-radius: 4px;
    background: var(--accent);
  }
  .next {
    min-height: 44px;
    padding: 0 22px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-on);
    font-weight: 700;
  }
  .spacer {
    width: 44px;
  }
  @media (prefers-reduced-motion: reduce) {
    .coach,
    .ring {
      animation: none;
    }
  }
</style>
