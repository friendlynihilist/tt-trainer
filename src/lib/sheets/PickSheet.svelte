<script>
  // Scelta da un elenco, con gruppi, ricerca e (se serve) aggiunta di una voce propria.
  // `filters`: righe di filtri facoltativi, [{ key, options: [{ id, label }] }]; ogni opzione
  // dell'elenco porta i suoi valori in `tags` (es. { family, level, modes: [] }). Di base sono spenti.
  import Check from '@lucide/svelte/icons/check';
  import Search from '@lucide/svelte/icons/search';
  import Plus from '@lucide/svelte/icons/plus';
  import { ui } from '../store/ui.svelte.js';
  import Sheet from '../ui/Sheet.svelte';

  let { title = 'Scegli', groups = [], value = null, onpick, onadd = null, clearable = false, filters = [] } = $props();

  let query = $state('');
  let active = $state({});
  const passes = (o) =>
    Object.entries(active).every(([k, v]) => v == null || (Array.isArray(o.tags?.[k]) ? o.tags[k].includes(v) : o.tags?.[k] === v));
  const count = $derived(groups.reduce((n, g) => n + g.options.length, 0));
  const shown = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({ ...g, options: g.options.filter((o) => passes(o) && (!q || `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q))) }))
      .filter((g) => g.options.length);
  });
  const exact = $derived(groups.some((g) => g.options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase())));

  function pick(id) {
    ui.close();
    onpick?.(id);
  }

  function add() {
    const label = query.trim();
    if (!label) return;
    ui.close();
    onadd?.(label);
  }
</script>

<Sheet {title} onclose={() => ui.close()} tall={count > 8}>
  {#if count > 8 || onadd}
    <label class="search">
      <Search size={18} />
      <input placeholder={onadd ? 'Cerca o aggiungi' : 'Cerca'} bind:value={query} />
    </label>
  {/if}

  {#each filters as f (f.key)}
    <div class="filter" role="group" aria-label={f.label}>
      {#each f.options as o (o.id)}
        <button class="chip mini" aria-pressed={active[f.key] === o.id} onclick={() => (active = { ...active, [f.key]: active[f.key] === o.id ? null : o.id })}>{o.label}</button>
      {/each}
    </div>
  {/each}

  {#if clearable && value != null && !query}
    <button class="row-btn clear" onclick={() => pick(null)}>Togli la scelta</button>
  {/if}

  {#each shown as g, n (g.name ?? n)}
    {#if g.name}<p class="heading group">{g.name}</p>{/if}
    <div class="options">
      {#each g.options as o (o.id)}
        <button class="row-btn" class:on={o.id === value} onclick={() => pick(o.id)}>
          <span class="grow">
            {o.label}
            {#if o.hint}<span class="small muted hint">{o.hint}</span>{/if}
          </span>
          {#if o.id === value}<Check size={18} strokeWidth={2.4} />{/if}
        </button>
      {/each}
    </div>
  {/each}

  {#if onadd && query.trim() && !exact}
    <button class="row-btn add" onclick={add}><Plus size={18} /> Aggiungi «{query.trim()}»</button>
  {:else if !shown.length}
    <p class="muted empty">Nessun risultato.</p>
  {/if}
</Sheet>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 46px;
    padding: 0 14px;
    margin-bottom: 8px;
    border-radius: 999px;
    background: var(--sunk);
    color: var(--ink-3);
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    outline: none;
    font-size: 16px;
    color: var(--ink);
  }
  .group {
    margin: 18px 0 4px;
  }
  .filter {
    display: flex;
    gap: 6px;
    margin: 0 -20px 8px;
    padding: 0 20px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .filter::-webkit-scrollbar {
    display: none;
  }
  .filter .chip {
    flex: none;
    min-height: 30px;
    padding: 4px 12px;
    font-size: 13px;
  }
  .row-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 48px;
    padding: 10px 12px;
    margin: 0 -12px;
    width: calc(100% + 24px);
    border-radius: var(--r-s);
    text-align: left;
    font-size: 16px;
    transition: background 0.15s var(--ease);
  }
  .row-btn:active {
    background: var(--sunk);
  }
  @media (hover: hover) {
    .row-btn:hover {
      background: var(--sunk);
    }
  }
  .row-btn.on {
    font-weight: 580;
  }
  .row-btn.on :global(svg) {
    color: var(--accent);
  }
  .hint {
    display: block;
  }
  .clear {
    color: var(--ink-2);
  }
  .add {
    color: var(--accent-ink);
    font-weight: 560;
  }
  .empty {
    padding: 24px 0;
    text-align: center;
  }
</style>
