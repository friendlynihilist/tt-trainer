<script>
  // I cinque livelli del giocatore, con cosa sa fare chi si trova lì. Una scelta sola.
  import Check from '@lucide/svelte/icons/check';
  import { PLAYER_LEVELS } from '../data/library.js';
  import { buzz } from '../store/ui.svelte.js';

  let { value = null, onchange } = $props();
</script>

<div class="levels" role="radiogroup" aria-label="Livello">
  {#each PLAYER_LEVELS as l, i (l.id)}
    <button
      class="lvl"
      class:on={value === l.id}
      role="radio"
      aria-checked={value === l.id}
      style:animation-delay="{i * 50}ms"
      onclick={() => {
        buzz();
        onchange?.(l.id);
      }}
    >
      <span class="grow">
        <strong>{l.name}</strong>
        <span class="small muted block">{l.about}</span>
      </span>
      <span class="tick">{#if value === l.id}<Check size={16} strokeWidth={2.6} />{/if}</span>
    </button>
  {/each}
</div>

<style>
  .levels {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lvl {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border-radius: var(--r);
    box-shadow: var(--shadow-card);
    background: var(--card);
    text-align: left;
    animation: rise 0.45s var(--ease-out) both;
    transition:
      border-color 0.2s var(--ease),
      background 0.2s var(--ease),
      transform 0.25s var(--spring);
  }
  .lvl:active {
    transform: scale(0.985);
  }
  .lvl.on {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--card));
  }
  strong {
    font-weight: 600;
  }
  .block {
    display: block;
    margin-top: 2px;
  }
  .tick {
    display: grid;
    place-items: center;
    flex: none;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--line-strong);
    color: #15171a;
    transition: background 0.2s var(--ease);
  }
  .on .tick {
    background: var(--accent);
    box-shadow: none;
  }
</style>
