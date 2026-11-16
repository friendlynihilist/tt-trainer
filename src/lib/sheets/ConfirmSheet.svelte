<script>
  import { ui } from '../store/ui.svelte.js';
  import Sheet from '../ui/Sheet.svelte';

  let { title, text = '', action = 'Conferma', danger = false, onconfirm } = $props();

  function confirm() {
    ui.close();
    onconfirm?.();
  }
</script>

<Sheet {title} onclose={() => ui.close()}>
  {#if text}<p class="muted">{text}</p>{/if}
  {#snippet footer()}
    <div class="row g-8">
      <button class="btn ghost grow" onclick={() => ui.close()}>Annulla</button>
      <button class="btn primary grow" class:danger onclick={confirm}>{action}</button>
    </div>
  {/snippet}
</Sheet>

<style>
  .btn.primary.danger {
    background: var(--down);
    color: #fff;
  }
</style>
