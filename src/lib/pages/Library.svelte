<script>
  // Libreria: gli allenamenti (modelli, pacchetti, mesi, percorsi), gli esercizi con le loro medaglie
  // e i colpi. Dal generale al particolare: ogni gruppo è una sezione richiudibile con la sua icona e
  // quante voci ha; «Nuovo» è l'ultima riga di ogni elenco, non un pulsante in più. Gli esercizi si
  // cercano per nome; livello e formato sono due filtri che si scelgono in un foglio.
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Plus from '@lucide/svelte/icons/plus';
  import Download from '@lucide/svelte/icons/download';
  import Search from '@lucide/svelte/icons/search';
  import X from '@lucide/svelte/icons/x';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Crosshair from '@lucide/svelte/icons/crosshair';
  import Timer from '@lucide/svelte/icons/timer';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { templateMinutes } from '../data/templates.js';
  import { packagesOf } from '../data/packages.js';
  import { FAMILIES, BALLS, POINT_PHASES, ERROR_GROUPS } from '../data/taxonomy.js';
  import { PLAYER_LEVELS, PLAYER_LEVEL, LEVEL_IDS, MODES, MODE } from '../data/library.js';
  import { weaknesses } from '../engine/stats.js';
  import { currentInSequence } from '../engine/player.js';
  import { composeSession } from '../engine/compose.js';
  import { sessionBlocks, blockFamily } from '../ui/design.js';
  import { dur } from '../util/motion.js';
  import PageHead from '../ui/PageHead.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Collapse from '../ui/Collapse.svelte';
  import FamilyIcon from '../ui/FamilyIcon.svelte';
  import MedalRing from '../ui/MedalRing.svelte';
  import LevelBadge from '../ui/LevelBadge.svelte';
  import Pills from '../ui/Pills.svelte';
  import { SKILLS, bricksOf, brickExercises, proposals, totalMinutes, BRICK } from '../data/bricks.js';
  import { agenda } from '../engine/events.js';
  import { buildNew } from '../store/actions.js';

  const TABS = ['allenamenti', 'esercizi', 'colpi'];
  const asked = ui.route.params[0] === 'percorsi' ? 'allenamenti' : ui.route.params[0];
  let tab = $state(TABS.includes(asked) ? asked : 'allenamenti');

  // ── Allenamenti ──
  // In alto i tuoi, con i loro mattoni; poi i colpi (ognuno apre la sua mappa) e tre idee attorno ai
  // colpi che hai scelto. Modelli di base, pacchetti, mesi e percorsi stanno sotto, chiusi.
  const mine = $derived((app.meta?.custom?.templates ?? []).filter((t) => !t.archived).map((t) => app.catalog.template(t.id)).reverse());
  const todayTemplate = $derived((agenda(app.plan, app.events, app.planned, app.today, app.today, app.catalog).get(app.today)?.todo ?? []).find((x) => x.kind === 'training')?.template ?? null);
  const pillsOf = (t) => bricksOf(t, app.catalog, composeSession({ week: app.week, template: t, catalog: app.catalog, medals: app.medals }));
  const ideas = $derived(proposals(app.meta?.focus ?? [], app.player.level, app.catalog, app.medals));
  const ideaPills = (w) => w.bricks.map((b) => ({ name: BRICK[b.type].name, fam: BRICK[b.type].fam, minutes: b.minutes }));
  const templates = $derived(Object.values(app.catalog.templates).filter((t) => !t.custom));
  const blocks = $derived(Object.values(app.catalog.blocks));
  const tracks = $derived(app.catalog.activeTrackIds);
  const archived = $derived(app.catalog.trackIds.filter((id) => app.catalog.track(id).archived));
  /** I blocchi di un modello come segmenti colorati, con gli esercizi di oggi. */
  function strip(t) {
    try {
      return sessionBlocks(composeSession({ week: app.week, template: t, catalog: app.catalog, medals: app.medals }), app.catalog);
    } catch {
      return [];
    }
  }

  // ── Esercizi ──
  let query = $state('');
  let levelFilter = $state('all');
  let modeFilter = $state('all');
  const filtering = $derived(Boolean(query.trim()) || levelFilter !== 'all' || modeFilter !== 'all');
  const norm = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const exerciseGroups = $derived.by(() => {
    const q = norm(query.trim());
    const all = app.catalog.activeExerciseIds
      .map((id) => app.catalog.exercise(id))
      .filter((e) => (levelFilter === 'all' || e.level === levelFilter) && (modeFilter === 'all' || e.modes?.includes(modeFilter)) && (!q || norm(e.name).includes(q)));
    const byLevel = (a, b) => LEVEL_IDS.indexOf(a.level) - LEVEL_IDS.indexOf(b.level);
    const groups = FAMILIES.map((f) => ({ ...f, list: all.filter((e) => e.family === f.id).sort(byLevel) })).filter((g) => g.list.length);
    const mine = all.filter((e) => !FAMILIES.some((f) => f.id === e.family));
    if (mine.length) groups.push({ id: 'libero', name: 'I tuoi esercizi', list: mine });
    return groups;
  });
  const shownCount = $derived(exerciseGroups.reduce((n, g) => n + g.list.length, 0));
  function pickLevel() {
    ui.open('pick', {
      title: 'Livello',
      value: levelFilter,
      groups: [{ options: [{ id: 'all', label: 'Tutti i livelli' }, ...PLAYER_LEVELS.map((l) => ({ id: l.id, label: l.name, hint: l.id === app.player.level ? 'Il tuo livello' : '' }))] }],
      onpick: (v) => v && (levelFilter = v)
    });
  }
  function pickMode() {
    ui.open('pick', {
      title: 'Formato',
      value: modeFilter,
      groups: [{ options: [{ id: 'all', label: 'Ogni formato' }, ...MODES.map((m) => ({ id: m.id, label: m.name }))] }],
      onpick: (v) => v && (modeFilter = v)
    });
  }
  function clearFilters() {
    query = '';
    levelFilter = 'all';
    modeFilter = 'all';
  }

  // ── Colpi ──
  let side = $state('all');
  const counts = $derived(Object.fromEntries(weaknesses(app.events).strokes.map((s) => [s.id, s.count])));
  const families = $derived.by(() => {
    const defs = [...FAMILIES, { id: 'custom', name: 'I tuoi colpi' }];
    return defs
      .map((f) => ({ ...f, strokes: app.strokes.filter((s) => s.family === f.id && (side === 'all' || s.side === side || !s.side)) }))
      .filter((f) => f.strokes.length);
  });
  /** Un percorso archiviato torna fra quelli da scegliere. */
  function unarchive(id) {
    const raw = (app.meta?.custom?.tracks ?? []).find((t) => t.id === id);
    if (!raw) return;
    app.saveCustom('tracks', { ...raw, archived: false });
    ui.toast(`«${app.catalog.track(id).short}» è di nuovo fra i percorsi`);
  }
  function removeError(e) {
    ui.open('confirm', {
      title: `Eliminare «${e.name}»?`,
      text: 'Nelle voci del diario in cui l’hai già usato non comparirà più.',
      action: 'Elimina',
      danger: true,
      onconfirm: () => app.removeCustom('errors', e.id)
    });
  }
  function addStroke() {
    ui.open('pick', {
      title: 'Nuovo colpo',
      groups: [],
      onadd: (name) => app.addCustom('strokes', { name, short: name, family: 'custom' })
    });
  }
</script>

{#snippet famLead(id)}
  <span class="lead" data-fam={id}><FamilyIcon fam={id} size={20} /></span>
{/snippet}

{#snippet addRow(label, onclick)}
  <button class="add" {onclick}><Plus size={18} />{label}</button>
{/snippet}

<div class="page enter library">
  <PageHead title="Libreria" />

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
    <div in:fly={{ y: 10, duration: dur(280), easing: cubicOut }}>
      {#if tab === 'allenamenti'}
        <!-- I tuoi allenamenti: il nome, la durata e i mattoni. Toccandone uno si apre. -->
        <div class="section">
          <h2 class="t-name sec">I tuoi allenamenti</h2>
          {#if mine.length}
            <div class="card flush list">
              {#each mine as t (t.id)}
                <button class="wk" onclick={() => ui.open('workout', { id: t.id })}>
                  <span class="wk-top">
                    <strong class="grow">{t.name}</strong>
                    {#if t.id === todayTemplate}<span class="tag accent">oggi</span>{/if}
                    <span class="muted">{templateMinutes(t)} min</span>
                    <ChevronRight size={18} />
                  </span>
                  <Pills bricks={pillsOf(t)} />
                </button>
              {/each}
            </div>
          {:else}
            <p class="muted">Ancora nessuno: costruiscine uno con il tasto +.</p>
          {/if}
        </div>

        <!-- I colpi: ognuno apre la sua mappa, in Progressi. -->
        <div class="section">
          <h2 class="t-name sec">I mattoni</h2>
          <div class="mat">
            {#each SKILLS as b (b.id)}
              <button data-fam={b.fam} onclick={() => ui.go('progressi', 'mappa', b.id)}>{b.name}<small>{brickExercises(b.id, app.catalog).length} esercizi</small></button>
            {/each}
          </div>
        </div>

        <!-- Tre idee: un allenamento corto, uno completo e uno lungo. Si aprono nel costruttore. -->
        <div class="section">
          <h2 class="t-name sec">Idee</h2>
          <div class="card flush list">
            {#each ideas as w, i (i)}
              <button class="wk" onclick={() => buildNew(w.bricks)}>
                <span class="wk-top">
                  <strong class="grow">{w.name}</strong>
                  <span class="muted">{totalMinutes(w.bricks)} min</span>
                  <ChevronRight size={18} />
                </span>
                <Pills bricks={ideaPills(w)} />
              </button>
            {/each}
          </div>
        </div>

        <!-- I modelli di base: la scaletta in segmenti colorati, la durata a destra. -->
        <div class="section">
          <Collapse title="Modelli di base" count={templates.length} open={false} key="lib-base">
            <div class="cards">
              {#each templates as t (t.id)}
                {@const segs = strip(t)}
                <button class="tpl" onclick={() => ui.open('template', { id: t.id })}>
                  <span class="tpl-top">
                    <strong>{t.name}</strong>
                    {#if t.custom}<span class="mine">tuo</span>{/if}
                    <span class="tpl-min"><Timer size={14} />{templateMinutes(t)} min</span>
                  </span>
                  {#if segs.length}
                    <span class="segs" aria-hidden="true">
                      {#each segs as b (b.key)}<i data-fam={b.fam} style:flex-grow={b.minutes}></i>{/each}
                    </span>
                    <span class="tpl-blocks">{segs.map((b) => b.name).join(', ')}</span>
                  {/if}
                </button>
              {/each}
            </div>
          </Collapse>
        </div>

        <!-- I pacchetti: per ogni livello un allenamento da 90 e uno da 60 minuti. -->
        <div class="section">
          <Collapse title="Pacchetti per livello" count={PLAYER_LEVELS.length} open={false} key="lib-pacchetti">
            <div class="card flush list">
              {#each PLAYER_LEVELS as l (l.id)}
                <div class="pk">
                  <LevelBadge level={l.id} small />
                  {#if l.id === app.player.level}<span class="yours">il tuo</span>{/if}
                  <span class="grow"></span>
                  {#each packagesOf(l.id) as t (t.id)}
                    <button class="min-btn" onclick={() => ui.open('template', { id: t.id })} aria-label="{l.name}, {t.minutes} minuti">{t.minutes}′</button>
                  {/each}
                </div>
              {/each}
            </div>
          </Collapse>
        </div>

        <!-- I mesi: su cosa lavori, con la famiglia e i percorsi. -->
        <div class="section">
          <Collapse title="Mesi" count={blocks.length} open={false} key="lib-temi">
            <div class="card flush list">
              {#each blocks as b (b.id)}
                {@const fam = blockFamily(b, app.catalog, app.medals, currentInSequence)}
                <button class="item" onclick={() => ui.open('block', { id: b.id })}>
                  <span class="ico" data-fam={fam}><FamilyIcon {fam} size={24} /></span>
                  <span class="grow">
                    <span class="top"><strong>{b.theme}</strong>{#if b.custom}<span class="mine">tuo</span>{/if}</span>
                    <span class="sub">{b.tracks.map((id) => app.catalog.track(id)?.short).filter(Boolean).join(', ')}</span>
                  </span>
                  <ChevronRight size={18} />
                </button>
              {/each}
              {@render addRow('Nuovo mese', () => ui.open('block'))}
            </div>
            <p class="note">Nel piano ogni mese può durare anche meno: un allenamento, una o due settimane.</p>
          </Collapse>
        </div>

        <!-- I percorsi: l'esercizio di adesso e la sua medaglia. -->
        <div class="section">
          <Collapse title="Percorsi" count={tracks.length} open={false} key="lib-percorsi">
            <div class="card flush list">
              {#each tracks as id (id)}
                {@const t = app.catalog.track(id)}
                {@const now = currentInSequence(id, app.catalog, app.medals)}
                {@const ex = now ? app.catalog.exercise(now) : null}
                <button class="item" onclick={() => ui.open('track', { id })}>
                  <span class="grow">
                    <span class="top"><strong>{t.name}</strong>{#if t.custom}<span class="mine">tuo</span>{/if}</span>
                    {#if ex}<span class="sub">Adesso: {ex.name}</span>{/if}
                  </span>
                  {#if ex}<MedalRing exercise={ex} medals={app.medals[ex.id]} size={36} />{/if}
                </button>
              {/each}
              {@render addRow('Nuovo percorso', () => ui.open('trackedit'))}
            </div>
            {#if archived.length}
              <p class="note">Archiviati</p>
              <div class="card flush list arch">
                {#each archived as id (id)}
                  <div class="item">
                    <span class="grow muted">{app.catalog.track(id).short}</span>
                    <button class="btn ghost small" onclick={() => unarchive(id)}>Riprendi</button>
                  </div>
                {/each}
              </div>
            {/if}
          </Collapse>
        </div>

        <button class="import" onclick={() => ui.open('import')}><Download size={18} /> Importa esercizi, percorsi, mesi e modelli</button>
      {:else if tab === 'esercizi'}
        <!-- Cerca e filtra -->
        <div class="find">
          <label class="search">
            <Search size={18} />
            <input type="search" placeholder="Cerca un esercizio" bind:value={query} aria-label="Cerca un esercizio" />
            {#if query}<button class="clear" onclick={() => (query = '')} aria-label="Cancella la ricerca"><X size={16} /></button>{/if}
          </label>
          <div class="pickers">
            <button class="pickr" class:on={levelFilter !== 'all'} onclick={pickLevel}>
              {levelFilter === 'all' ? 'Tutti i livelli' : PLAYER_LEVEL[levelFilter].name}<ChevronDown size={16} />
            </button>
            <button class="pickr" class:on={modeFilter !== 'all'} onclick={pickMode}>
              {modeFilter === 'all' ? 'Ogni formato' : MODE[modeFilter].name}<ChevronDown size={16} />
            </button>
            {#if filtering}<button class="reset" onclick={clearFilters}>Togli i filtri</button>{/if}
          </div>
          <p class="note">{shownCount} {shownCount === 1 ? 'esercizio' : 'esercizi'}. Il livello serve solo a orientarti: puoi fare qualsiasi esercizio.</p>
        </div>

        <!-- Con un filtro le famiglie si aprono; senza, restano chiuse. -->
        {#key filtering}
          {#each exerciseGroups as g (g.id)}
            <div class="section tight">
              <Collapse title={g.name} count={g.list.length} open={filtering}>
                {#snippet lead()}{@render famLead(g.id)}{/snippet}
                <div class="card flush list">
                  {#each g.list as e (e.id)}
                    <button class="item" onclick={() => ui.open('exercise', { id: e.id })}>
                      <span class="grow">
                        <strong class="block">{e.name}</strong>
                        <span class="meta">
                          <span class="lvl" data-level={e.level}><i></i>{PLAYER_LEVEL[e.level]?.name ?? 'Tuo'}</span>
                          {#if e.modes?.length}<span class="modes">{e.modes.map((m) => MODE[m]?.name.toLowerCase()).filter(Boolean).join(', ')}</span>{/if}
                          {#if app.medals[e.id]?.stale}<span class="stale">Da ripassare</span>{/if}
                        </span>
                      </span>
                      <MedalRing exercise={e} medals={app.medals[e.id]} size={36} />
                    </button>
                  {/each}
                </div>
              </Collapse>
            </div>
          {:else}
            <p class="muted empty">Nessun esercizio con questi filtri.</p>
          {/each}
        {/key}
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
          <div class="section tight">
            <Collapse title={f.name} count={f.strokes.length} open={false} key="lib-colpi-{f.id}">
              {#snippet lead()}{@render famLead(f.id === 'custom' ? 'libero' : f.id)}{/snippet}
              <div class="card flush list">
                {#each f.strokes as s (s.id)}
                  <button class="item" onclick={() => ui.open('stroke', { id: s.id })}>
                    <span class="grow">{s.name}</span>
                    {#if counts[s.id]}<span class="fix" aria-label="{counts[s.id]} volte da correggere"><Crosshair size={14} />{counts[s.id]}</span>{/if}
                    <ChevronRight size={18} />
                  </button>
                {/each}
              </div>
            </Collapse>
          </div>
        {/each}

        <div class="card flush list after-list">{@render addRow('Aggiungi un colpo', addStroke)}</div>

        <div class="section">
          <Collapse title="Le altre voci" open={false} key="lib-altre">
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
                          <button class="tag line" onclick={() => removeError(e)} aria-label="Elimina l’errore {e.name}">{e.name} ×</button>
                        {:else}
                          <span class="tag line">{e.name}</span>
                        {/if}
                      {/each}
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </Collapse>
        </div>
      {/if}
    </div>
  {/key}
</div>

<style>
  .sec {
    margin: 0 0 10px;
  }
  .wk {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    padding: 14px 16px;
    text-align: left;
  }
  .wk-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mat {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .mat button {
    min-height: 62px;
    padding: 10px 14px;
    border-radius: 16px;
    background: var(--f);
    color: var(--f-on);
    font-weight: 750;
    text-align: left;
    box-shadow: 0 4px 0 var(--f-edge);
    transition:
      transform var(--dur-fast),
      box-shadow var(--dur-fast);
  }
  .mat button:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 var(--f-edge);
  }
  .mat small {
    display: block;
    font-weight: 500;
    opacity: 0.9;
  }
  .tabs {
    margin-top: 16px;
  }
  .section.tight {
    margin-top: 8px;
  }
  .lead {
    display: grid;
    place-items: center;
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: var(--f);
    color: var(--f-on);
  }
  strong {
    font-weight: 650;
  }
  .block {
    display: block;
  }
  .item :global(.lucide-chevron-right),
  .item > :global(svg) {
    color: var(--ink-3);
    flex: none;
  }
  .top {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .sub {
    display: block;
    margin-top: 2px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .mine {
    height: 20px;
    padding: 0 8px;
    border-radius: 999px;
    background: var(--sunk);
    font-size: 12px;
    font-weight: 650;
    color: var(--ink-2);
  }
  .arch {
    margin-top: 6px;
  }
  .note {
    margin: 10px 4px 0;
    font-size: 13px;
    color: var(--ink-3);
  }
  .add {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 52px;
    padding: 0 18px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
    text-align: left;
  }
  .add :global(svg) {
    color: var(--ink-3);
  }

  /* ── Modelli ── */
  .cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
  }
  .tpl {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
    text-align: left;
    color: var(--ink);
    transition: transform var(--dur-fast) var(--ease);
  }
  .tpl:active {
    transform: scale(0.985);
  }
  .tpl-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .tpl-top strong {
    font-size: 17px;
  }
  .tpl-min {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    font-weight: 650;
    color: var(--ink-2);
  }
  .tpl-min :global(svg) {
    color: var(--ink-3);
  }
  .segs {
    display: flex;
    gap: 3px;
  }
  .segs i {
    flex-basis: 0;
    min-width: 8px;
    height: 10px;
    border-radius: 5px;
    background: var(--f);
  }
  .tpl-blocks {
    font-size: 13px;
    color: var(--ink-3);
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ── Pacchetti ── */
  .pk {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
  }
  .pk + .pk {
    border-top: 1px solid var(--line);
  }
  .yours {
    font-size: 12px;
    font-weight: 650;
    color: var(--accent-ink);
  }
  .min-btn {
    min-width: 52px;
    height: 36px;
    padding: 0 10px;
    border-radius: 12px;
    background: var(--sunk);
    font-variant-numeric: tabular-nums;
    font-size: 14px;
    font-weight: 650;
    color: var(--ink);
  }

  /* ── Mesi ── */
  .ico {
    display: grid;
    place-items: center;
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 13px;
    background: var(--f);
    color: var(--f-on);
  }

  .import {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    margin-top: 28px;
    min-height: 48px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
  }

  /* ── Esercizi ── */
  .find {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 16px 0 6px;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 48px;
    padding: 0 8px 0 14px;
    border-radius: 14px;
    background: var(--card);
    border: 1px solid var(--line);
    color: var(--ink-3);
  }
  .search:focus-within {
    border-color: var(--ink-3);
  }
  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    font: inherit;
    font-size: 16px;
    color: var(--ink);
    outline: none;
  }
  .search input::-webkit-search-cancel-button {
    display: none;
  }
  .clear {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--sunk);
    color: var(--ink-2);
  }
  .pickers {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .pickr {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 10px 0 14px;
    border-radius: 999px;
    background: var(--sunk);
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .pickr.on {
    background: var(--ink);
    color: var(--paper);
  }
  .reset {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-ink);
    padding: 0 6px;
    min-height: 36px;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    margin-top: 4px;
    font-size: 13px;
  }
  .lvl {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 650;
    color: var(--ink-2);
  }
  .lvl i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--lv);
  }
  .modes {
    color: var(--ink-3);
  }
  .stale {
    color: var(--down);
    font-weight: 600;
  }
  .empty {
    margin-top: 24px;
  }

  /* ── Colpi ── */
  .filter {
    margin-top: 16px;
    max-width: 300px;
  }
  .fix {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 700;
    color: var(--down);
  }
  .fix :global(svg) {
    color: var(--down) !important;
  }
  .after-list {
    margin-top: 12px;
  }
</style>
