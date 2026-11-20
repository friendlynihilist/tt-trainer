<script>
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { ui } from '../store/ui.svelte.js';
</script>

<div class="toasts" aria-live="polite">
  {#each ui.toasts as t (t.id)}
    <div class="toast {t.tone}" in:fly={{ y: 16, duration: 320, easing: cubicOut }} out:fly={{ y: 8, duration: 200 }} animate:flip={{ duration: 250 }}>
      <span>{t.text}</span>
      {#if t.action}
        <button
          onclick={() => {
            t.action.run();
            ui.dismiss(t.id);
          }}>{t.action.label}</button
        >
      {/if}
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    z-index: 80;
    left: calc(var(--rail) + 16px);
    right: 16px;
    bottom: calc(var(--tabbar) + env(safe-area-inset-bottom) + 16px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 14px;
    max-width: 440px;
    padding: 12px 18px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    font-size: 14px;
    font-weight: 500;
    box-shadow: var(--shadow);
  }
  .toast.error {
    background: var(--down);
    color: var(--paper);
  }
  button {
    font-weight: 620;
    color: var(--accent);
    white-space: nowrap;
  }
</style>
