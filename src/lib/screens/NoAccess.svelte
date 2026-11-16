<script>
  // Chi entra con Google ma non è ancora nel gruppo: può chiedere di entrare.
  import { app } from '../store/app.svelte.js';
  import Avatar from '../ui/Avatar.svelte';

  let busy = $state(false);

  async function ask() {
    busy = true;
    await app.requestAccess();
    busy = false;
  }
</script>

<div class="wrap enter">
  <Avatar name={app.user?.name} photo={app.user?.photo} size={56} />
  <div class="stack g-8">
    <h1 class="title">{app.requested ? 'Richiesta inviata' : 'Gruppo su invito'}</h1>
    <p class="muted">
      {#if app.requested}
        Appena un amministratore la approva puoi entrare.
      {:else}
        Questo spazio è riservato a un piccolo gruppo. Chiedi di entrare con <strong>{app.user?.email}</strong>.
      {/if}
    </p>
  </div>
  <div class="stack g-8">
    {#if app.requested}
      <button class="btn primary wide" onclick={() => app.retryAccess()}>Riprova</button>
    {:else}
      <button class="btn primary wide" onclick={ask} disabled={busy}>Chiedi di entrare</button>
    {/if}
    <button class="btn plain wide" onclick={() => app.signOut()}>Esci</button>
  </div>
</div>

<style>
  .wrap {
    min-height: 100dvh;
    max-width: 380px;
    margin: 0 auto;
    padding: 28px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 24px;
  }
  strong {
    color: var(--ink);
    font-weight: 560;
  }
</style>
