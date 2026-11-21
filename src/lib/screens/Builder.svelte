<script>
  // Il costruttore a tutto schermo: si apre dal tasto + (un allenamento nuovo) e da «Cambia i
  // fondamentali» (uno che c'è già). La torre e i gesti stanno in ui/Tower.svelte.
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import X from '@lucide/svelte/icons/x';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { lockScroll } from '../util/scroll.js';
  import { startTour, coachSkip } from '../ui/tours.js';
  import Tower from '../ui/Tower.svelte';

  let { title = 'Nuovo allenamento', cta = 'Salva', bricks: initial = [], onsave } = $props();

  let bricks = $state(initial.map((b) => ({ ...b, exs: [...b.exs] })));

  function close() {
    if (ui.coach?.tour === 'build') coachSkip();
    ui.builder = null;
  }

  onMount(() => {
    const unlock = lockScroll();
    const release = ui.hold(close);
    // La prima volta, la guida mostra come si fa (dopo che la schermata è entrata).
    const timer = setTimeout(() => startTour('build'), 350);
    return () => {
      clearTimeout(timer);
      unlock();
      release();
    };
  });

  function save() {
    // Le proprietà spariscono con la schermata: la funzione si prende prima di chiudere.
    const done = onsave;
    const list = $state.snapshot(bricks);
    close();
    done?.(list);
  }
</script>

<div class="builder" transition:fly={{ y: 40, duration: 320, easing: cubicOut }} role="dialog" aria-modal="true" aria-label={title}>
  <div class="scroll">
    <header>
      <button class="icon-btn" onclick={close} aria-label="Chiudi senza salvare"><X size={22} /></button>
      <h1 class="t-title">{title}</h1>
    </header>
    <Tower bind:bricks focus={app.meta?.focus ?? []} />
  </div>
  <footer>
    <button class="btn accent wide" onclick={save} disabled={!bricks.length}>{cta}</button>
  </footer>
</div>

<style>
  .builder {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    background: var(--paper);
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    padding: calc(env(safe-area-inset-top) + 12px) var(--gutter) 0;
  }
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: -10px;
  }
  header h1 {
    margin: 0;
  }
  footer {
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    padding: 6px var(--gutter) calc(env(safe-area-inset-bottom) + 14px);
  }
</style>
