<script>
  // Libreria: i modelli di allenamento, i mesi, i percorsi con i loro livelli e la tassonomia dei
  // colpi. Quelli di base si guardano e si duplicano; quelli tuoi si creano, modificano, importano.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Plus from '@lucide/svelte/icons/plus';
  import Download from '@lucide/svelte/icons/download';
  import { fly } from 'svelte/transition';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { CYCLE_BLOCKS, NEXT_CYCLE } from '../data/program.js';
  import { STEP_TYPES, templateMinutes } from '../data/templates.js';
  import { FAMILIES, BALLS, POINT_PHASES, ERROR_GROUPS } from '../data/taxonomy.js';
  import { weaknesses } from '../engine/stats.js';
  import PageHead from '../ui/PageHead.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Dots from '../ui/Dots.svelte';

  const TABS = ['allenamenti', 'percorsi', 'colpi'];
  let tab = $state(TABS.includes(ui.route.params[0]) ? ui.route.params[0] : 'allenamenti');
  let side = $state('all');

  const counts = $derived(Object.fromEntries(weaknesses(app.events).strokes.map((s) => [s.id, s.count])));
  const families = $derived.by(() => {
    const defs = [...FAMILIES, { id: 'custom', name: 'I tuoi colpi' }];
    return defs
      .map((f) => ({ ...f, strokes: app.strokes.filter((s) => s.family === f.id && (side === 'all' || s.side === side || !s.side)) }))
      .filter((f) => f.strokes.length);
  });

  const templates = $derived(Object.values(app.catalog.templates));
  const blocks = $derived(Object.values(app.catalog.blocks));
  const myTracks = $derived(app.catalog.activeTrackIds.filter((id) => app.catalog.track(id).custom));
  const archived = $derived(app.catalog.trackIds.filter((id) => app.catalog.track(id).archived));

  function summary(t) {
    return t.steps.map((s) => (s.type === 'free' ? s.name : s.type === 'track' ? (app.catalog.track(s.track)?.short ?? '?') : STEP_TYPES[s.type].name)).join(' · ');
  }

  function addStroke() {
    ui.open('pick', {
      title: 'Nuovo colpo',
      groups: [],
      onadd: (name) => app.addCustom('strokes', { name, short: name, family: 'custom' })
    });
  }
</script>

<div class="page enter">
  <PageHead eyebrow="Libreria" title={tab === 'allenamenti' ? 'Allenamenti' : tab === 'percorsi' ? 'Percorsi' : 'Colpi'} />

  <div class="tabs">
    <Segmented
      options={[
        { id: 'allenamenti', label: 'Allenamenti' },
        { id: 'percorsi', label: 'Percorsi' },
        { id: 'colpi', label: 'Colpi' }
      ]}
      value={tab}
      onchange={(v) => (tab = v)}
    />
  </div>

  {#key tab}
    <div in:fly={{ y: 10, duration: 320 }}>
      {#if tab === 'allenamenti'}
        <section class="section">
          <div class="spread head">
            <h2 class="heading">Modelli</h2>
            <button class="btn ghost small" onclick={() => ui.open('template')}><Plus size={16} /> Nuovo</button>
          </div>
          <div class="card flush list">
            {#each templates as t (t.id)}
              <button class="item" data-color={t.color} onclick={() => ui.open('template', { id: t.id })}>
                <span class="bar"></span>
                <span class="grow">
                  <strong>{t.name}</strong>{#if t.custom}<span class="small muted"> · tuo</span>{/if}
                  <span class="small muted block clamp">{templateMinutes(t)} min · {summary(t)}</span>
                </span>
                <ChevronRight size={16} />
              </button>
            {/each}
          </div>
        </section>

        <section class="section">
          <div class="spread head">
            <h2 class="heading">Mesi</h2>
            <button class="btn ghost small" onclick={() => ui.open('block')}><Plus size={16} /> Nuovo</button>
          </div>
          <div class="card flush list">
            {#each blocks as b (b.id)}
              <button class="item" onclick={() => ui.open('block', { id: b.id })}>
                <span class="grow">
                  <strong>{b.custom ? b.theme : `${b.label} · ${b.theme}`}</strong>{#if b.custom}<span class="small muted"> · tuo</span>{/if}
                  <span class="small muted block">{b.tracks.map((id) => app.catalog.track(id)?.short).join(' · ')}</span>
                </span>
                <ChevronRight size={16} />
              </button>
            {/each}
          </div>
          <p class="small faint after">I mesi si mettono in fila quando crei un ciclo, dal piano.</p>
        </section>

        <button class="btn ghost import" onclick={() => ui.open('import')}><Download size={16} /> Importa percorsi, mesi e modelli</button>
      {:else if tab === 'percorsi'}
        {#each CYCLE_BLOCKS as bid (bid)}
          {@const block = app.catalog.block(bid)}
          <section class="section">
            <h2 class="heading">{block.label} · {block.theme}</h2>
            <div class="card flush list">
              {#each block.tracks as id (id)}
                {@const t = app.tracks[id]}
                <button class="item" onclick={() => ui.open('track', { id })}>
                  <span class="grow">
                    <strong>{app.catalog.track(id).name}</strong>
                    <span class="small muted block">{app.catalog.track(id).levels.map((l) => l.name).join(' → ')}</span>
                  </span>
                  <Dots level={t.level} max={t.max} started={t.started} completed={t.completed} />
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
            </div>
          </section>
        {/each}

        <section class="section">
          <div class="spread head">
            <h2 class="heading">I tuoi percorsi</h2>
            <button class="btn ghost small" onclick={() => ui.open('trackedit')}><Plus size={16} /> Nuovo</button>
          </div>
          {#if myTracks.length}
            <div class="card flush list">
              {#each myTracks as id (id)}
                {@const t = app.tracks[id]}
                <button class="item" onclick={() => ui.open('track', { id })}>
                  <span class="grow">
                    <strong>{app.catalog.track(id).name}</strong>
                    <span class="small muted block clamp">{app.catalog.track(id).levels.map((l) => l.name).join(' → ')}</span>
                  </span>
                  <Dots level={t.level} max={t.max} started={t.started} completed={t.completed} />
                  <ChevronRight size={16} />
                </button>
              {/each}
            </div>
          {:else}
            <p class="muted">Un esercizio con i suoi livelli e il suo test: lo crei qui, lo importi, oppure duplichi uno di quelli sopra.</p>
          {/if}
          {#if archived.length}
            <p class="small faint after">Archiviati: {archived.map((id) => app.catalog.track(id).short).join(', ')}</p>
          {/if}
        </section>

        <section class="section">
          <h2 class="heading">Idee per il ciclo successivo</h2>
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
  .head {
    margin-bottom: 12px;
  }
  .head .heading {
    margin: 0;
  }
  .bar {
    flex: none;
    width: 4px;
    align-self: stretch;
    border-radius: 2px;
    background: var(--c);
  }
  .after {
    margin-top: 10px;
  }
  .import {
    margin-top: 28px;
    width: 100%;
  }
</style>
