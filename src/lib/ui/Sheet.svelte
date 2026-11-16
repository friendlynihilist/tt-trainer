<script>
  // Foglio: sale dal basso sul telefono, finestra centrata su schermi larghi.
  // Si chiude con lo sfondo, con Esc o trascinandolo giù dalla maniglia.
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import X from '@lucide/svelte/icons/x';

  let { title = '', onclose, children, footer = null, tall = false } = $props();

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
  style:--drag="{drag}px"
  transition:fly|global={{ y: 60, duration: 420, easing: cubicOut }}
>
  <div class="grip" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
    <span></span>
  </div>
  <header>
    <h2 class="title">{title}</h2>
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
    border-radius: 24px 24px 0 0;
    box-shadow: var(--shadow);
    translate: 0 var(--drag);
    transition: translate 0.35s var(--ease-out);
  }
  .sheet.dragging {
    transition: none;
  }
  .sheet.tall {
    height: 92dvh;
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
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--line-strong);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 2px 12px 10px 20px;
    flex: none;
  }
  .body {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 4px 20px 24px;
    flex: 1;
    min-height: 0;
  }
  footer {
    flex: none;
    padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
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
