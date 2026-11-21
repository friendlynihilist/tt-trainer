<script>
  // Una sezione che si apre e si chiude toccando il titolo. Il contenuto scivola, la freccia ruota.
  // `key` ricorda lo stato aperto/chiuso per la volta dopo (solo su questo dispositivo).
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { reducedMotion } from '../util/motion.js';

  // boxed: la sezione è una scheda, con il titolo dentro e le righe sotto (come le schede della Libreria).
  let { title, count = null, open = true, key = null, aside = null, lead = null, boxed = false, children } = $props();

  // La chiave non cambia durante la vita della sezione.
  // svelte-ignore state_referenced_locally
  const storeKey = key ? `tt-trainer:open:${key}` : null;
  let isOpen = $state(read());
  function read() {
    // svelte-ignore state_referenced_locally
    if (!storeKey) return open;
    try {
      const v = localStorage.getItem(storeKey);
      return v == null ? open : v === '1';
    } catch {
      return open;
    }
  }
  function toggle() {
    isOpen = !isOpen;
    if (!storeKey) return;
    try {
      localStorage.setItem(storeKey, isOpen ? '1' : '0');
    } catch {}
  }
  const id = `c${Math.random().toString(36).slice(2, 8)}`;
</script>

<section class="collapse" class:open={isOpen} class:boxed>
  <div class="head">
    <button class="toggle" onclick={toggle} aria-expanded={isOpen} aria-controls={id}>
      {#if lead}{@render lead()}{/if}
      <span class="t-name">{title}</span>
      {#if count != null}<span class="count t-num">{count}</span>{/if}
      <span class="chev"><ChevronDown size={20} strokeWidth={2.4} /></span>
    </button>
    {#if aside}{@render aside()}{/if}
  </div>
  {#if isOpen}
    <div {id} class="body" transition:slide={{ duration: reducedMotion() ? 0 : 280, easing: cubicOut }}>
      {@render children()}
    </div>
  {/if}
</section>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .toggle {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    text-align: left;
    color: var(--ink);
  }
  .count {
    display: grid;
    place-items: center;
    min-width: 24px;
    height: 24px;
    padding: 0 7px;
    border-radius: 999px;
    background: var(--sunk);
    font-size: 13px;
    font-weight: 650;
    color: var(--ink-2);
  }
  .chev {
    display: grid;
    place-items: center;
    margin-left: auto;
    color: var(--ink-3);
    transform: rotate(-90deg);
    transition: transform var(--dur) var(--ease);
  }
  .open .chev {
    transform: rotate(0deg);
  }
  .body {
    padding-top: 8px;
  }
  .boxed {
    padding: 4px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    box-shadow: var(--shadow-card);
  }
  .boxed .toggle {
    min-height: 56px;
  }
  .boxed .body {
    padding: 0 0 12px;
  }
  /* Dentro una scheda le liste non sono schede a loro volta: solo righe, da bordo a bordo. */
  .boxed .body :global(.card) {
    background: none;
    box-shadow: none;
    border-radius: 0;
  }
  .boxed .body :global(.card.flush) {
    margin: 0 -16px;
    border-top: 1px solid var(--line);
  }
</style>
