<script>
  // Barra in basso sul telefono, colonna a sinistra su schermi larghi.
  import Help from '@lucide/svelte/icons/circle-question-mark';
  import Settings from '@lucide/svelte/icons/settings';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { buildNew } from '../store/actions.js';
  import Avatar from './Avatar.svelte';
  import Mark from './Mark.svelte';

  // Le quattro icone sono disegnate per l'app: la casa, il calendario, le barre, i libri.
  const MAIN = [
    { id: 'oggi', label: 'Oggi', d: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
    { id: 'calendario', label: 'Diario', d: 'M6 5h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM8 3v4M16 3v4M3 10h18' },
    { id: 'progressi', label: 'Progressi', d: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { id: 'libreria', label: 'Libreria', d: 'M5 4v16M10 4v16M15 5l4 15' }
  ];

  const current = $derived(ui.route.name);
</script>

{#snippet icon(d, size = 22)}
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path {d} /></svg>
{/snippet}
{#snippet plus(size = 26)}
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
{/snippet}

<nav class="bar" aria-label="Sezioni">
  {#each MAIN.slice(0, 2) as item (item.id)}
    <a href="#/{item.id}" aria-current={current === item.id ? 'page' : undefined}>
      {@render icon(item.d)}
      <span>{item.label}</span>
    </a>
  {/each}
  <button class="add" onclick={buildNew} aria-label="Costruisci un allenamento">{@render plus()}</button>
  {#each MAIN.slice(2) as item (item.id)}
    <a href="#/{item.id}" aria-current={current === item.id ? 'page' : undefined}>
      {@render icon(item.d)}
      <span>{item.label}</span>
    </a>
  {/each}
</nav>

<aside class="rail">
  <a class="brand" href="#/oggi">
    <Mark size={26} />
    <span>Terza palla</span>
  </a>

  <button class="btn accent new" onclick={buildNew}>
    {@render plus(18)} Nuovo allenamento
  </button>

  <div class="links">
    {#each MAIN as item (item.id)}
      <a href="#/{item.id}" class:on={current === item.id}>
        {@render icon(item.d, 19)}
        {item.label}
      </a>
    {/each}
  </div>

  <div class="links bottom">
    <a href="#/guida" class:on={current === 'guida'}><Help size={19} strokeWidth={1.8} /> Guida</a>
    <a href="#/impostazioni" class:on={current === 'impostazioni'}>
      {#if app.photo || app.name}
        <Avatar name={app.name} photo={app.photo} size={22} />
      {:else}
        <Settings size={19} strokeWidth={1.8} />
      {/if}
      <span class="ellipsis">{app.firstName || 'Impostazioni'}</span>
    </a>
  </div>
</aside>

<style>
  .bar {
    position: fixed;
    z-index: 20;
    left: 0;
    right: 0;
    bottom: 0;
    height: calc(var(--tabbar) + env(safe-area-inset-bottom));
    padding: 0 6px calc(10px + env(safe-area-inset-bottom));
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    align-items: center;
    background: var(--card);
    border-top: 1px solid var(--line);
  }
  .bar a {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 0;
    text-decoration: none;
    color: var(--ink-2);
    font-size: 11px;
    font-weight: 650;
    line-height: 1.5;
  }
  .bar a[aria-current='page'] {
    color: var(--accent-ink);
  }
  .add {
    justify-self: center;
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    border-radius: 18px;
    background: var(--accent);
    color: var(--accent-on);
    box-shadow: 0 4px 0 color-mix(in srgb, var(--accent) 65%, #000);
    translate: 0 -4px;
  }
  .add:active {
    translate: 0 0;
    box-shadow: none;
  }

  .rail {
    display: none;
  }

  @media (min-width: 900px) {
    .bar {
      display: none;
    }
    .rail {
      position: fixed;
      z-index: 20;
      top: 0;
      bottom: 0;
      left: 0;
      width: var(--rail);
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 28px 16px 20px;
      border-right: 1px solid var(--line);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 10px;
      text-decoration: none;
      font-size: 19px;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    .new {
      height: 44px;
      justify-content: flex-start;
      padding: 0 16px;
    }
    .links {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .links.bottom {
      margin-top: auto;
    }
    .links a {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 40px;
      padding: 0 12px;
      border-radius: 10px;
      text-decoration: none;
      color: var(--ink-2);
      font-weight: 520;
      transition:
        background 0.2s var(--ease),
        color 0.2s var(--ease);
    }
    .links a:hover {
      background: var(--sunk);
      color: var(--ink);
    }
    .links a.on {
      background: var(--sunk);
      color: var(--ink);
    }
    .ellipsis {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
