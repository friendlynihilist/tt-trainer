<script>
  // Barra in basso sul telefono, colonna a sinistra su schermi larghi.
  import Sun from '@lucide/svelte/icons/sun';
  import Calendar from '@lucide/svelte/icons/calendar';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import Library from '@lucide/svelte/icons/library';
  import Plus from '@lucide/svelte/icons/plus';
  import Help from '@lucide/svelte/icons/circle-question-mark';
  import Settings from '@lucide/svelte/icons/settings';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { buildNew } from '../store/actions.js';
  import Avatar from './Avatar.svelte';
  import Mark from './Mark.svelte';

  const MAIN = [
    { id: 'oggi', label: 'Oggi', icon: Sun },
    { id: 'calendario', label: 'Diario', icon: Calendar },
    { id: 'progressi', label: 'Progressi', icon: TrendingUp },
    { id: 'libreria', label: 'Libreria', icon: Library }
  ];

  const current = $derived(ui.route.name);
</script>

<nav class="bar" aria-label="Sezioni">
  {#each MAIN.slice(0, 2) as item (item.id)}
    {@const Icon = item.icon}
    <a href="#/{item.id}" class:on={current === item.id} aria-current={current === item.id ? 'page' : undefined}>
      <Icon size={22} strokeWidth={current === item.id ? 2.2 : 1.7} />
      <span>{item.label}</span>
    </a>
  {/each}
  <button class="add" onclick={buildNew} aria-label="Costruisci un allenamento">
    <Plus size={24} strokeWidth={2.2} />
  </button>
  {#each MAIN.slice(2) as item (item.id)}
    {@const Icon = item.icon}
    <a href="#/{item.id}" class:on={current === item.id} aria-current={current === item.id ? 'page' : undefined}>
      <Icon size={22} strokeWidth={current === item.id ? 2.2 : 1.7} />
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
    <Plus size={18} strokeWidth={2.4} /> Nuovo allenamento
  </button>

  <div class="links">
    {#each MAIN as item (item.id)}
      {@const Icon = item.icon}
      <a href="#/{item.id}" class:on={current === item.id}>
        <Icon size={19} strokeWidth={1.8} />
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
    padding: 0 8px env(safe-area-inset-bottom);
    display: grid;
    grid-template-columns: 1fr 1fr 72px 1fr 1fr;
    align-items: center;
    background: color-mix(in srgb, var(--paper) 86%, transparent);
    backdrop-filter: blur(18px) saturate(1.4);
    -webkit-backdrop-filter: blur(18px) saturate(1.4);
    border-top: 1px solid var(--line);
  }
  .bar a {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 0;
    text-decoration: none;
    color: var(--ink-3);
    font-size: 10.5px;
    font-weight: 540;
    letter-spacing: 0.01em;
    transition:
      color 0.25s var(--ease),
      transform 0.2s var(--ease);
  }
  .bar a:active {
    transform: scale(0.92);
  }
  .bar a.on {
    color: var(--ink);
  }
  .add {
    justify-self: center;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    margin-top: -18px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-on);
    box-shadow:
      0 0 0 5px var(--paper),
      0 8px 20px -6px color-mix(in srgb, var(--accent) 70%, transparent);
    transition: transform 0.4s var(--spring);
  }
  .add:active {
    transform: scale(0.9) rotate(45deg);
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
