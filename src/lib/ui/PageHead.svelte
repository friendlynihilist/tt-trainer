<script>
  // Intestazione di pagina. Su telefono porta anche guida e profilo, che su schermi larghi
  // stanno già nella colonna di sinistra.
  import Help from '@lucide/svelte/icons/circle-question-mark';
  import { app } from '../store/app.svelte.js';
  import Avatar from './Avatar.svelte';

  let { eyebrow = '', title, sub = '', children = null, actions = true } = $props();
</script>

<header class="head">
  <div class="top">
    <span class="small muted eyebrow">{eyebrow}</span>
    {#if actions}
      <span class="actions">
        <a class="icon-btn" href="#/guida" aria-label="Guida"><Help size={21} strokeWidth={1.7} /></a>
        <a class="me" href="#/impostazioni" aria-label="Impostazioni">
          <Avatar name={app.name} photo={app.photo} size={32} />
        </a>
      </span>
    {/if}
  </div>
  <h1 class="display">{title}</h1>
  {#if sub}<p class="lead muted sub">{sub}</p>{/if}
  {#if children}{@render children()}{/if}
</header>

<style>
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 40px;
    margin-bottom: 4px;
  }
  .eyebrow::first-letter {
    text-transform: uppercase;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-right: -4px;
  }
  .me {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    text-decoration: none;
    transition: transform 0.2s var(--ease);
  }
  .me:active {
    transform: scale(0.92);
  }
  .sub {
    margin-top: 6px;
  }
  @media (min-width: 900px) {
    .actions {
      display: none;
    }
    .top {
      min-height: 0;
      margin-bottom: 8px;
    }
  }
</style>
