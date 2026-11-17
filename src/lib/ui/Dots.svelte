<script>
  // I livelli di un percorso: pieni quelli superati, arancione quello attuale.
  import { LEVELS } from '../data/program.js';

  let { level = 1, started = true, completed = false, size = 8, label = true, max = LEVELS } = $props();
</script>

<span
  class="dots"
  style:--s="{size}px"
  role="img"
  aria-label={label ? (started ? `Livello ${level} di ${max}` : 'Da iniziare') : undefined}
>
  {#each Array(max) as _, i (i)}
    <i class:past={started && (i + 1 < level || completed)} class:now={started && !completed && i + 1 === level}></i>
  {/each}
</span>

<style>
  .dots {
    display: inline-flex;
    gap: calc(var(--s) * 0.5);
    align-items: center;
    vertical-align: middle;
  }
  i {
    width: var(--s);
    height: var(--s);
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--line-strong);
    transition:
      background 0.4s var(--ease),
      box-shadow 0.4s var(--ease),
      transform 0.5s var(--spring);
  }
  .past {
    background: var(--ink);
    box-shadow: none;
  }
  .now {
    background: var(--accent);
    box-shadow: none;
    transform: scale(1.25);
  }
</style>
