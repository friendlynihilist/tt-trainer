<script>
  import { app } from '../store/app.svelte.js';

  let busy = $state(false);

  async function enter() {
    busy = true;
    await app.signIn();
    busy = false;
  }

  const TEST_USERS = [
    { email: 'carlo@example.com', name: 'Carlo Prova' },
    { email: 'marco@example.com', name: 'Marco Prova' },
    { email: 'giulia@example.com', name: 'Giulia Prova' }
  ];
</script>

<div class="login">
  <div class="scene" aria-hidden="true">
    <span class="ball"></span>
    <span class="net"></span>
    <span class="table"></span>
  </div>

  <div class="copy enter">
    <h1 class="display">Terza palla</h1>
    <p class="lead muted">Il quaderno di allenamento che sa a che livello sei.</p>
  </div>

  <div class="actions enter">
    {#if app.cloud}
      <button class="btn primary wide" onclick={enter} disabled={busy}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
        Accedi con Google
      </button>
      {#if app.emulator}
        <div class="dev">
          <span class="small faint">Emulatore · utenti di prova</span>
          {#each TEST_USERS as u (u.email)}
            <button class="btn ghost small" onclick={() => app.devSignIn(u.email, u.name)}>{u.name}</button>
          {/each}
        </div>
      {/if}
    {:else}
      <button class="btn primary wide" onclick={enter}>Comincia</button>
      <p class="small faint note">Modalità locale: i dati restano su questo dispositivo.</p>
    {/if}
  </div>
</div>

<style>
  .login {
    min-height: 100dvh;
    max-width: 420px;
    margin: 0 auto;
    padding: 0 28px calc(env(safe-area-inset-bottom) + 36px);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 36px;
  }
  .copy {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation-delay: 120ms;
  }
  .note {
    text-align: center;
  }
  .dev {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }
  .dev span {
    width: 100%;
  }

  /* La pallina attraversa il tavolo: un rimbalzo di qua, la rete, un rimbalzo di là. */
  .scene {
    position: relative;
    height: 150px;
    margin: auto 0 0;
  }
  .table {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 20px;
    height: 2px;
    border-radius: 1px;
    background: var(--ink);
  }
  .net {
    position: absolute;
    left: 50%;
    bottom: 22px;
    width: 2px;
    height: 20px;
    margin-left: -1px;
    background: var(--ink);
    opacity: 0.5;
  }
  .ball {
    position: absolute;
    left: 0;
    bottom: 22px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    animation:
      travel 3.2s linear infinite,
      hop 3.2s infinite;
  }
  @keyframes travel {
    0% { left: -4%; }
    100% { left: 100%; }
  }
  @keyframes hop {
    0% { transform: translateY(-70px); animation-timing-function: cubic-bezier(0.4, 0, 0.9, 0.6); }
    22% { transform: translateY(0); animation-timing-function: cubic-bezier(0.1, 0.5, 0.5, 1); }
    50% { transform: translateY(-84px); animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5); }
    78% { transform: translateY(0); animation-timing-function: cubic-bezier(0.1, 0.5, 0.5, 1); }
    100% { transform: translateY(-60px); }
  }
  @media (min-width: 700px) {
    .login {
      justify-content: center;
    }
    .scene {
      margin: 0;
    }
  }
</style>
