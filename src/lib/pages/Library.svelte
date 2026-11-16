<script>
  // Libreria: tutti gli esercizi del ciclo e la tassonomia dei colpi.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Plus from '@lucide/svelte/icons/plus';
  import { fly } from 'svelte/transition';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { BLOCKS, CYCLE_BLOCKS, TRACKS, NEXT_CYCLE } from '../data/program.js';
  import { FAMILIES, BALLS, POINT_PHASES, ERROR_GROUPS } from '../data/taxonomy.js';
  import { weaknesses } from '../engine/stats.js';
  import PageHead from '../ui/PageHead.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Dots from '../ui/Dots.svelte';

  let tab = $state(ui.route.params[0] === 'colpi' ? 'colpi' : 'esercizi');
  let side = $state('all');

  const counts = $derived(Object.fromEntries(weaknesses(app.events).strokes.map((s) => [s.id, s.count])));
  const families = $derived.by(() => {
    const defs = [...FAMILIES, { id: 'custom', name: 'I tuoi colpi' }];
    return defs
      .map((f) => ({ ...f, strokes: app.strokes.filter((s) => s.family === f.id && (side === 'all' || s.side === side || !s.side)) }))
      .filter((f) => f.strokes.length);
  });

  function addStroke() {
    ui.open('pick', {
      title: 'Nuovo colpo',
      groups: [],
      onadd: (name) => app.addCustom('strokes', { name, short: name, family: 'custom' })
    });
  }
</script>

<div class="page enter">
  <PageHead eyebrow="Libreria" title={tab === 'esercizi' ? 'Esercizi' : 'Colpi'} />

  <div class="tabs">
    <Segmented
      options={[
        { id: 'esercizi', label: 'Esercizi' },
        { id: 'colpi', label: 'Colpi' }
      ]}
      value={tab}
      onchange={(v) => (tab = v)}
    />
  </div>

  {#key tab}
    <div in:fly={{ y: 10, duration: 320 }}>
      {#if tab === 'esercizi'}
        {#each CYCLE_BLOCKS as b (b)}
          {@const block = BLOCKS[b]}
          <section class="section">
            <h2 class="heading">{block.label} · {block.theme}</h2>
            <div class="card flush list">
              {#each block.tracks as id (id)}
                {@const t = app.tracks[id]}
                <button class="item" onclick={() => ui.open('track', { id })}>
                  <span class="grow">
                    <strong>{TRACKS[id].name}</strong>
                    <span class="small muted block">{TRACKS[id].levels.map((l) => l.name).join(' → ')}</span>
                  </span>
                  <Dots level={t.level} started={t.started} completed={t.completed} />
                  <ChevronRight size={16} />
                </button>
              {/each}
              <div class="item static">
                <span class="grow stack g-4">
                  <strong>Servizi e ricezione</strong>
                  <span class="small muted"><em>Chi serve</em> — {block.serve.server}</span>
                  <span class="small muted"><em>Chi riceve</em> — {block.serve.receiver}</span>
                  <span class="small faint">Test · {block.serve.test}</span>
                </span>
              </div>
              <div class="item static">
                <span class="grow stack g-4">
                  <strong>Partitella</strong>
                  <span class="small muted">{block.rule}</span>
                </span>
              </div>
            </div>
          </section>
        {/each}

        <section class="section">
          <h2 class="heading">Per il ciclo successivo</h2>
          <div class="chips">
            {#each NEXT_CYCLE as n (n)}<span class="tag line">{n}</span>{/each}
          </div>
        </section>
      {:else}
        <div class="filter">
          <Segmented
            small
            options={[
              { id: 'all', label: 'Tutti' },
              { id: 'D', label: 'Dritto' },
              { id: 'R', label: 'Rovescio' }
            ]}
            value={side}
            onchange={(v) => (side = v)}
          />
        </div>

        {#each families as f (f.id)}
          <section class="section">
            <h2 class="heading">{f.name}</h2>
            <div class="card flush list">
              {#each f.strokes as s (s.id)}
                <button class="item" onclick={() => ui.open('stroke', { id: s.id })}>
                  <span class="grow">
                    {s.name}
                    {#if s.about}<span class="small muted block clamp">{s.about}</span>{/if}
                  </span>
                  {#if counts[s.id]}<span class="tag down">{counts[s.id]}</span>{/if}
                  <ChevronRight size={16} />
                </button>
              {/each}
            </div>
          </section>
        {/each}

        <button class="btn ghost small add" onclick={addStroke}><Plus size={16} /> Aggiungi un colpo</button>

        <section class="section">
          <h2 class="heading">Le altre voci</h2>
          <div class="card stack g-16">
            <div class="stack g-8">
              <span class="small muted">Fase del punto</span>
              <div class="chips">{#each POINT_PHASES as p (p.id)}<span class="tag line">{p.name}</span>{/each}</div>
            </div>
            <div class="stack g-8">
              <span class="small muted">Palla in arrivo</span>
              <div class="chips">{#each BALLS as p (p.id)}<span class="tag line">{p.name}</span>{/each}</div>
            </div>
            {#each [...ERROR_GROUPS, { id: 'custom', name: 'I tuoi errori' }] as g (g.id)}
              {@const list = app.errors.filter((e) => e.group === g.id)}
              {#if list.length}
                <div class="stack g-8">
                  <span class="small muted">Errore · {g.name.toLowerCase()}</span>
                  <div class="chips">
                    {#each list as e (e.id)}
                      {#if e.custom}
                        <button class="tag line" onclick={() => app.removeCustom('errors', e.id)} title="Tocca per eliminare">{e.name} ×</button>
                      {:else}
                        <span class="tag line">{e.name}</span>
                      {/if}
                    {/each}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {/key}
</div>

<style>
  .tabs {
    margin-top: 20px;
    max-width: 280px;
  }
  .filter {
    margin-top: 24px;
    max-width: 280px;
  }
  .filter + :global(.section) {
    margin-top: 20px;
  }
  .item :global(svg) {
    color: var(--ink-3);
    flex: none;
  }
  .item.static {
    align-items: flex-start;
  }
  strong {
    font-weight: 560;
  }
  em {
    font-style: normal;
    color: var(--ink-3);
  }
  .block {
    display: block;
  }
  .clamp {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .add {
    margin-top: 14px;
  }
</style>
