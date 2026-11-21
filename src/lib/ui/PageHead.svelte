<script>
  // Intestazione di pagina: il nome della pagina in grande e, sul telefono, il profilo a destra
  // (apre Impostazioni; su schermi larghi sta già nella colonna di sinistra). Le pagine fuori dalla
  // barra in basso (Guida, Impostazioni) hanno al suo posto la freccia per tornare indietro.
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import Avatar from './Avatar.svelte';

  // aside: qualcosa accanto al profilo (in Oggi la fiamma delle settimane di fila).
  let { title, sub = '', back = false, children = null, aside = null } = $props();
</script>

<header class="head">
  <div class="top">
    {#if back}
      <button class="icon-btn back" onclick={() => ui.back()} aria-label="Indietro"><ArrowLeft size={22} /></button>
    {/if}
    <h1 class="t-title big">{title}</h1>
    {#if aside}{@render aside()}{/if}
    {#if !back}
      <a class="me" href="#/impostazioni" aria-label="Impostazioni">
        <Avatar name={app.name} photo={app.photo} size={34} />
      </a>
    {/if}
  </div>
  {#if sub}<p class="sub">{sub}</p>{/if}
  {#if children}{@render children()}{/if}
</header>

<style>
  .top {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
  }
  .t-title.big {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 34px;
  }
  .back {
    width: 44px;
    height: 44px;
    margin-left: -12px;
    color: var(--ink);
  }
  .me {
    display: grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    margin-right: -5px;
    border-radius: 50%;
    text-decoration: none;
    transition: transform 0.2s var(--ease);
  }
  .me:active {
    transform: scale(0.92);
  }
  .sub {
    margin-top: 2px;
    font-size: 15px;
    color: var(--ink-2);
  }
  .sub::first-letter {
    text-transform: uppercase;
  }
  @media (min-width: 900px) {
    .me {
      display: none;
    }
  }
</style>
