<script>
  // Libreria: gli allenamenti (modelli, mesi, percorsi), gli esercizi con le loro medaglie e la
  // tassonomia dei colpi. Gli esercizi si mostrano sempre tutti: il livello e il formato sono solo
  // filtri che scegli tu, e di base sono spenti.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Plus from '@lucide/svelte/icons/plus';
  import Download from '@lucide/svelte/icons/download';
  import { fly } from 'svelte/transition';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { normalizeTemplate, templateMinutes } from '../data/templates.js';
  import { packagesOf } from '../data/packages.js';
  import { FAMILIES, BALLS, POINT_PHASES, ERROR_GROUPS } from '../data/taxonomy.js';
  import { PLAYER_LEVELS, PLAYER_LEVEL, LEVEL_IDS, MODES, MODE } from '../data/library.js';
  import { weaknesses } from '../engine/stats.js';
  import { currentInSequence } from '../engine/player.js';
  import PageHead from '../ui/PageHead.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import MedalRow from '../ui/MedalRow.svelte';

  const TABS = ['allenamenti', 'esercizi', 'colpi'];
  const asked = ui.route.params[0] === 'percorsi' ? 'allenamenti' : ui.route.params[0];
  let tab = $state(TABS.includes(asked) ? asked : 'allenamenti');
  let side = $state('all');
  let levelFilter = $state('all');
  let modeFilter = $state('all');

  // Gli esercizi per famiglia, in ordine di livello. I filtri li scegli tu: di base mostrano tutto.
  const exerciseGroups = $derived.by(() => {
    const all = app.catalog.activeExerciseIds
      .map((id) => app.catalog.exercise(id))
      .filter((e) => (levelFilter === 'all' || e.level === levelFilter) && (modeFilter === 'all' || e.modes?.includes(modeFilter)));
    const byLevel = (a, b) => LEVEL_IDS.indexOf(a.level) - LEVEL_IDS.indexOf(b.level);
    const groups = FAMILIES.map((f) => ({ ...f, list: all.filter((e) => e.family === f.id).sort(byLevel) })).filter((g) => g.list.length);
    const mine = all.filter((e) => !FAMILIES.some((f) => f.id === e.family));
    if (mine.length) groups.push({ id: 'mine', name: 'I tuoi esercizi', color: 'slate', list: mine });
    return groups;
  });
  const shownCount = $derived(exerciseGroups.reduce((n, g) => n + g.list.length, 0));
  const baseTracks = $derived(app.catalog.activeTrackIds.filter((id) => !app.catalog.track(id).custom));

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
    return normalizeTemplate(t).blocks.map((b) => b.name).join(' · ');
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
  <PageHead eyebrow="Libreria" title={tab === 'allenamenti' ? 'Allenamenti' : tab === 'esercizi' ? 'Esercizi' : 'Colpi'} />

  <div class="tabs">
    <Segmented
      options={[
        { id: 'allenamenti', label: 'Allenamenti' },
        { id: 'esercizi', label: 'Esercizi' },
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
          <h2 class="heading head">Pacchetti</h2>
          <div class="card flush list">
            {#each PLAYER_LEVELS as l (l.id)}
              <div class="item pk">
                <span class="grow">
                  <strong>{l.name}</strong>{#if l.id === app.player.level}<i class="me" aria-label="il tuo livello"></i>{/if}
                </span>
                {#each packagesOf(l.id) as t (t.id)}
                  <button class="chip mini" data-color={t.color} onclick={() => ui.open('template', { id: t.id })}>{t.minutes}′</button>
                {/each}
              </div>
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
                  <strong>{b.theme}</strong>{#if b.custom}<span class="small muted"> · tuo</span>{/if}
                  <span class="small muted block">{b.tracks.map((id) => app.catalog.track(id)?.short).join(' · ')}</span>
                </span>
                <ChevronRight size={16} />
              </button>
            {/each}
          </div>
          <p class="small faint after">I mesi si mettono in fila nel piano. Ognuno può durare anche meno: un allenamento, una o due settimane.</p>
        </section>

        <section class="section">
          <div class="spread head">
            <h2 class="heading">Percorsi</h2>
            <button class="btn ghost small" onclick={() => ui.open('trackedit')}><Plus size={16} /> Nuovo</button>
          </div>
          <div class="card flush list">
            {#each [...baseTracks, ...myTracks] as id (id)}
              {@const t = app.catalog.track(id)}
              {@const now = currentInSequence(id, app.catalog, app.medals)}
              <button class="item" onclick={() => ui.open('track', { id })}>
                <span class="grow">
                  <strong>{t.name}</strong>{#if t.custom}<span class="small muted"> · tuo</span>{/if}
                  <span class="small muted block clamp">{t.sequence.length} esercizi{now ? ` · ora ${app.catalog.exercise(now)?.name}` : ''}</span>
                </span>
                <ChevronRight size={16} />
              </button>
            {/each}
          </div>
          {#if archived.length}
            <p class="small faint after">Archiviati: {archived.map((id) => app.catalog.track(id).short).join(', ')}</p>
          {/if}
        </section>

        <button class="btn ghost import" onclick={() => ui.open('import')}><Download size={16} /> Importa esercizi, percorsi, mesi e modelli</button>
      {:else if tab === 'esercizi'}
        <div class="filters">
          <div class="chips" role="group" aria-label="Livello">
            <button class="chip mini" aria-pressed={levelFilter === 'all'} onclick={() => (levelFilter = 'all')}>Tutti i livelli</button>
            {#each PLAYER_LEVELS as l (l.id)}
              <button class="chip mini" aria-pressed={levelFilter === l.id} onclick={() => (levelFilter = levelFilter === l.id ? 'all' : l.id)}>
                {l.name}{#if l.id === app.player.level}<i class="me" aria-label="il tuo livello"></i>{/if}
              </button>
            {/each}
          </div>
          <div class="chips" role="group" aria-label="Formato">
            <button class="chip mini" aria-pressed={modeFilter === 'all'} onclick={() => (modeFilter = 'all')}>Ogni formato</button>
            {#each MODES as m (m.id)}
              <button class="chip mini" aria-pressed={modeFilter === m.id} onclick={() => (modeFilter = modeFilter === m.id ? 'all' : m.id)}>{m.name}</button>
            {/each}
          </div>
          <p class="small muted">{shownCount} esercizi. Il livello serve solo a orientarti: puoi fare qualsiasi esercizio.</p>
        </div>

        {#each exerciseGroups as g (g.id)}
          <section class="section">
            <h2 class="heading fam" data-color={g.color}><i class="pip"></i>{g.name}</h2>
            <div class="card flush list">
              {#each g.list as e (e.id)}
                <button class="item" onclick={() => ui.open('exercise', { id: e.id })}>
                  <span class="grow">
                    <strong>{e.name}</strong>
                    <span class="small muted block clamp">{[PLAYER_LEVEL[e.level]?.name, ...(e.modes ?? []).map((m) => MODE[m]?.name.toLowerCase())].filter(Boolean).join(' · ')}</span>
                  </span>
                  {#if app.medals[e.id]?.stale}<span class="tag stay">da ripassare</span>{/if}
                  <MedalRow exercise={e} medals={app.medals[e.id]} />
                  <ChevronRight size={16} />
                </button>
              {/each}
            </div>
          </section>
        {:else}
          <p class="muted empty">Nessun esercizio con questi filtri.</p>
        {/each}
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
  .filters {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .filters .chips {
    gap: 6px;
  }
  .chip.mini {
    min-height: 30px;
    padding: 4px 12px;
    font-size: 13px;
    gap: 6px;
  }
  .pk {
    gap: 8px;
  }
  .pk .me {
    display: inline-block;
    margin-left: 8px;
    vertical-align: middle;
  }
  .me {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
  }
  .fam {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .fam .pip {
    width: 9px;
    height: 9px;
  }
  .empty {
    margin-top: 24px;
  }
  .item :global(svg) {
    color: var(--ink-3);
    flex: none;
  }
  strong {
    font-weight: 560;
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
