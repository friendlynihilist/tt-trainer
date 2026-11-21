<script>
  // Foglio: sale dal basso sul telefono, finestra centrata su schermi larghi.
  // Si chiude con lo sfondo, con Esc o trascinandolo giù dalla maniglia.
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import X from '@lucide/svelte/icons/x';
  import { lockScroll } from '../util/scroll.js';

  // sans: titolo in Geist, come nelle schermate rifatte (docs/design.md).
  let { title = '', onclose, children, footer = null, tall = false, sans = true } = $props();

  let el = $state();
  // Finché il foglio è aperto la pagina sotto non scorre. Il fuoco della tastiera entra nel foglio
  // e, alla chiusura, torna al pulsante che l'aveva aperto.
  onMount(() => {
    const unlock = lockScroll();
    const before = document.activeElement;
    el?.focus({ preventScroll: true });
    return () => {
      unlock();
      if (before instanceof HTMLElement && document.contains(before)) before.focus({ preventScroll: true });
    };
  });

  /** Tab non esce dal foglio: dall'ultimo elemento torna al primo, e viceversa. */
  function trap(e) {
    if (e.key !== 'Tab' || !el) return;
    const items = [...el.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
    if (!items.length) return e.preventDefault();
    const first = items[0];
    const last = items[items.length - 1];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || at === el)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && at === last) {
      e.preventDefault();
      first.focus();
    }
  }

  let drag = $state(0);
  let dragging = $state(false);
  let startY = 0;
  let startT = 0;

  function down(e) {
    dragging = true;
    startY = e.clientY;
    startT = performance.now();
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (dragging) drag = Math.max(0, e.clientY - startY);
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    const speed = drag / Math.max(1, performance.now() - startT);
    if (drag > 120 || speed > 0.7) onclose?.();
    else drag = 0;
  }
</script>

<div class="scrim" transition:fade|global={{ duration: 220 }} onclick={onclose} aria-hidden="true"></div>

<div
  class="sheet"
  class:tall
  class:dragging
  role="dialog"
  aria-modal="true"
  aria-label={title}
  tabindex="-1"
  bind:this={el}
  onkeydown={trap}
  style:--drag="{drag}px"
  transition:fly|global={{ y: 60, duration: 420, easing: cubicOut }}
>
  <div class="grip" role="presentation" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
    <span></span>
  </div>
  <header>
    <h2 class={sans ? 't-title sheet-sans' : 'title'}>{title}</h2>
    <button class="icon-btn" onclick={onclose} aria-label="Chiudi"><X size={20} /></button>
  </header>
  <div class="body">
    {@render children()}
  </div>
  {#if footer}
    <footer>{@render footer()}</footer>
  {/if}
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: var(--scrim);
    z-index: 40;
  }
  .sheet {
    position: fixed;
    z-index: 41;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 92dvh;
    display: flex;
    flex-direction: column;
    background: var(--paper);
    border-radius: 26px 26px 0 0;
    box-shadow: var(--shadow);
    translate: 0 var(--drag);
    transition: translate 0.35s var(--ease-out);
  }
  .sheet:focus {
    outline: none;
  }
  .sheet.dragging {
    transition: none;
  }
  .sheet.tall {
    height: 92dvh;
  }
  .sheet-sans {
    margin: 0;
    font-size: 24px;
  }
  .grip {
    display: grid;
    place-items: center;
    height: 22px;
    flex: none;
    touch-action: none;
    cursor: grab;
  }
  .grip span {
    width: 38px;
    height: 4px;
    border-radius: 2px;
    background: var(--ink-2);
    opacity: 0.4;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 2px 10px 10px 18px;
    flex: none;
  }
  .body {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 4px 18px 22px;
    flex: 1;
    min-height: 0;
  }
  footer {
    flex: none;
    padding: 12px 18px calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--line);
    background: var(--paper);
  }
  .sheet:not(:has(footer)) .body {
    padding-bottom: calc(24px + env(safe-area-inset-bottom));
  }

  @media (min-width: 700px) {
    .sheet {
      left: 50%;
      right: auto;
      bottom: auto;
      top: 50%;
      width: min(560px, calc(100vw - 48px));
      max-height: min(760px, calc(100dvh - 64px));
      border-radius: 24px;
      translate: -50% calc(-50% + var(--drag));
    }
    .sheet.tall {
      height: min(760px, calc(100dvh - 64px));
    }
    .sheet-sans {
    margin: 0;
    font-size: 24px;
  }
  .grip {
      display: none;
    }
    header {
      padding-top: 18px;
    }
    footer {
      border-radius: 0 0 24px 24px;
    }
  }
</style>
