<script>
  // Diario, in due viste. «Giorni»: il calendario, descritto qui sotto. «Note»: tutte le note in un
  // elenco solo (ui/NoteBook.svelte); l'indirizzo ricorda la vista: #/calendario/note/dritto.
  //
  // Giorni. Appena entri: il mese, e sotto oggi se c'è qualcosa. Toccando un giorno si apre quel
  // giorno; l'elenco di tutte le voci del mese è chiuso e si apre a richiesta. Il nome del mese e le
  // frecce stanno in cima al calendario; il mese cambia anche scorrendo il calendario di lato.
  //
  // Sotto ogni data un pallino per attività, del colore del tipo: pieno se fatta, vuoto se in
  // programma. La legenda dei tipi è anche il filtro. I temi del piano fra le settimane si vedono
  // solo se accesi in Impostazioni.
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Plus from '@lucide/svelte/icons/plus';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { agenda, byTime } from '../engine/events.js';
  import { weekAt, weekIndex, weekParts, isPause } from '../engine/plan.js';
  import { KIND } from '../data/taxonomy.js';
  import { monthGrid, monthKey, addMonths, addDays, fmtMonth, fmtLong, WEEKDAYS_MIN } from '../util/dates.js';
  import { dur } from '../util/motion.js';
  import PageHead from '../ui/PageHead.svelte';
  import EventRow from '../ui/EventRow.svelte';
  import PlannedRow from '../ui/PlannedRow.svelte';
  import Collapse from '../ui/Collapse.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import NoteBook from '../ui/NoteBook.svelte';

  const view = $derived(ui.route.params[0] === 'note' ? 'note' : 'giorni');

  // Da Oggi si arriva anche su un giorno preciso: #/calendario/2026-11-20.
  const asked = /^\d{4}-\d{2}-\d{2}$/.test(ui.route.params[0] ?? '') ? ui.route.params[0] : null;
  let month = $state(monthKey(asked ?? app.today));
  let selected = $state(asked ?? app.today);
  // Il filtro per tipo: null = tutto.
  let only = $state(null);
  // Da che parte entra il mese nuovo: 1 da destra, -1 da sinistra.
  let dir = $state(0);

  const grid = $derived(monthGrid(month));
  const days = $derived(agenda(app.plan, app.events, app.planned, grid[0][0], grid[grid.length - 1][6], app.catalog));
  const day = $derived(days.get(selected) ?? { todo: [], done: [] });
  const dayCount = $derived(day.todo.length + day.done.length);
  const keep = (kind) => !only || kind === only;
  const monthEvents = $derived(app.events.filter((e) => e.kind !== 'livello' && !e.planned && monthKey(e.date) === month && keep(e.kind)).sort((a, b) => byTime(b, a)));
  const isNow = $derived(month === monthKey(app.today) && selected === app.today);
  // Oggi si mostra solo se c'è qualcosa (altrimenti resta la riga «Aggiungi a oggi»); un altro
  // giorno si mostra sempre, perché l'hai scelto tu.
  const showDay = $derived(selected !== app.today || dayCount > 0);

  /** I pallini di un giorno: prima il fatto, poi il previsto. Al massimo tre. */
  function pips(d) {
    const v = days.get(d);
    if (!v) return { list: [], more: 0 };
    const list = [
      ...v.done.filter((e) => KIND[e.kind] && keep(e.kind)).map((e) => ({ id: e.id, kind: e.kind, state: 'done' })),
      ...v.todo.filter((x) => keep(x.kind)).map((x) => ({ id: x.key, kind: x.kind, state: d < app.today ? 'missed' : 'todo' }))
    ];
    return { list: list.slice(0, 3), more: Math.max(0, list.length - 3) };
  }

  // I tipi presenti nel mese: legenda e filtro insieme.
  const kinds = $derived.by(() => {
    const seen = new Set();
    for (const v of days.values()) {
      if (monthKey(v.date) !== month) continue;
      for (const e of v.done) seen.add(e.kind);
      for (const x of v.todo) seen.add(x.kind);
    }
    return Object.values(KIND).filter((k) => seen.has(k.id));
  });

  /** Il tema del piano in una settimana: «Dritto», «Rovescio · Primi colpi», «Pausa». */
  function weekTheme(monday) {
    if (!app.plan) return '';
    const w = weekAt(app.plan, weekIndex(app.plan, monday), app.catalog);
    if (!w) return '';
    if (isPause(w.kind)) return 'Pausa';
    return [...new Set(weekParts(w.kind).map((b) => app.catalog.block(b)?.theme).filter(Boolean))].join(' · ');
  }
  const rows = $derived.by(() => {
    if (!app.settings.calThemes) return grid.map((week) => ({ week, theme: '' }));
    let prev = weekTheme(addDays(grid[0][0], -7));
    return grid.map((week, i) => {
      const theme = weekTheme(week[0]);
      const show = theme && (i === 0 || theme !== prev);
      prev = theme;
      return { week, theme: show ? theme : '' };
    });
  });

  function shift(n) {
    dir = n;
    month = addMonths(month, n);
  }
  function goToday() {
    dir = month < monthKey(app.today) ? 1 : month > monthKey(app.today) ? -1 : 0;
    month = monthKey(app.today);
    selected = app.today;
  }

  // Scorrere il calendario di lato cambia mese.
  let x0 = null;
  let y0 = null;
  function down(e) {
    x0 = e.clientX;
    y0 = e.clientY;
  }
  function up(e) {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1);
  }

  const title = $derived(fmtMonth(month).replace(/^./, (c) => c.toUpperCase()));
  const dayTitle = $derived(selected === app.today ? 'Oggi' : fmtLong(selected).replace(/^./, (c) => c.toUpperCase()));
</script>

<div class="page enter diary">
  <!-- «Aggiungi» sta in cima, sempre in vista: la riga sotto il giorno, sul telefono, finisce sotto il calendario. -->
  <PageHead title="Diario">
    {#snippet aside()}
      {#if view !== 'note'}
        <button class="btn ghost small add-top" onclick={() => ui.open('add', { date: selected })} aria-label="Aggiungi un’attività a {selected === app.today ? 'oggi' : fmtLong(selected)}">
          <Plus size={16} /> Aggiungi
        </button>
      {/if}
    {/snippet}
  </PageHead>

  <div class="views">
    <Segmented
      options={[
        { id: 'giorni', label: 'Giorni' },
        { id: 'note', label: 'Note' }
      ]}
      value={view}
      onchange={(v) => (v === 'note' ? ui.go('calendario', 'note') : ui.go('calendario'))}
    />
  </div>

  {#if view === 'note'}
    <NoteBook filter={ui.route.params[1] ?? null} onfilter={(f) => (f ? ui.go('calendario', 'note', f) : ui.go('calendario', 'note'))} />
  {:else}
  <!-- Il mese -->
  <section class="cal" role="group" aria-label="Calendario del mese" onpointerdown={down} onpointerup={up} onpointercancel={() => (x0 = null)}>
    <div class="cal-head">
      <h2 class="t-name month" aria-live="polite">{title}</h2>
      {#if !isNow}
        <button class="today-btn" onclick={goToday} transition:fade={{ duration: dur(160) }}>Oggi</button>
      {/if}
      <button class="icon-btn" onclick={() => shift(-1)} aria-label="Mese precedente"><ChevronLeft size={22} /></button>
      <button class="icon-btn" onclick={() => shift(1)} aria-label="Mese successivo"><ChevronRight size={22} /></button>
    </div>
    <div class="dow" aria-hidden="true">
      {#each WEEKDAYS_MIN as d, i (i)}<span>{d}</span>{/each}
    </div>
    {#key month}
      <div class="grid" in:fly={{ x: 36 * dir, duration: dur(260), easing: cubicOut }}>
        {#each rows as r (r.week[0])}
          {#if r.theme}<span class="theme t-label">{r.theme}</span>{/if}
          {#each r.week as d (d)}
            {@const p = pips(d)}
            <button
              class="day"
              class:out={monthKey(d) !== month}
              class:today={d === app.today}
              class:sel={d === selected}
              class:past={d < app.today}
              onclick={() => (selected = d)}
              aria-label="{fmtLong(d)}{p.list.length ? `: ${p.list.map((x) => `${KIND[x.kind]?.short} ${x.state === 'done' ? 'fatto' : 'in programma'}`).join(', ')}` : ''}"
              aria-pressed={d === selected}
            >
              <span class="n t-num">{Number(d.slice(8))}</span>
              <span class="marks" aria-hidden="true">
                {#each p.list as x (x.id)}<i class="pip {x.state}" data-color={KIND[x.kind]?.color}></i>{/each}
                {#if p.more}<b class="more">+</b>{/if}
              </span>
            </button>
          {/each}
        {/each}
      </div>
    {/key}

    <!-- Legenda: i tipi del mese (toccandoli si filtra) e cosa vuol dire pieno o vuoto. -->
    {#if kinds.length}
      <div class="legend">
        <div class="kinds" role="group" aria-label="Mostra solo un tipo">
          {#each kinds as k (k.id)}
            <button class="kind" class:on={only === k.id} class:dim={only && only !== k.id} aria-pressed={only === k.id} data-color={k.color} onclick={() => (only = only === k.id ? null : k.id)}>
              <i class="pip"></i>{k.short}
            </button>
          {/each}
        </div>
        <div class="states">
          <span><i class="pip" data-color="slate"></i>fatto</span>
          <span><i class="pip todo" data-color="slate"></i>in programma</span>
        </div>
      </div>
    {/if}
  </section>

  <!-- Il giorno scelto: oggi solo se c'è qualcosa. -->
  {#if showDay}
    <div class="section" transition:fade={{ duration: dur(180) }}>
      <Collapse title={dayTitle} count={dayCount || null} boxed>
        {#key selected}
          <div in:fly={{ y: 8, duration: dur(220), easing: cubicOut }}>
            <div class="card flush list">
              {#each day.todo as item (item.key)}<PlannedRow {item} />{/each}
              {#each day.done as e (e.id)}<EventRow event={e} showDate={false} />{/each}
              <button class="add" onclick={() => ui.open('add', { date: selected })}>
                <Plus size={18} />
                {selected > app.today ? 'Metti in programma' : 'Aggiungi a questo giorno'}
              </button>
            </div>
          </div>
        {/key}
      </Collapse>
    </div>
  {:else}
    <!-- Oggi non c'è niente: resta solo la riga per aggiungere. -->
    <div class="section" transition:fade={{ duration: dur(180) }}>
      <div class="card flush list">
        <button class="add" onclick={() => ui.open('add', { date: app.today })}>
          <Plus size={18} />
          Aggiungi a oggi
        </button>
      </div>
    </div>
  {/if}

  <!-- Tutte le voci del mese: chiuso di partenza. -->
  {#if monthEvents.length}
    <div class="section">
      <Collapse title={only ? `${KIND[only].name} nel mese` : 'Nel mese'} count={monthEvents.length} open={false} key="diario-mese" boxed>
        <div class="card flush list">
          {#each monthEvents as e (e.id)}<EventRow event={e} />{/each}
        </div>
      </Collapse>
    </div>
  {/if}
  {/if}
</div>

<style>
  .views {
    margin: 16px 0 14px;
  }
  .cal-head {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 44px;
    margin: 0 -2px 8px 8px;
  }
  .month {
    flex: 1;
    min-width: 0;
    margin: 0;
  }
  .cal-head .icon-btn {
    width: 44px;
    height: 44px;
    color: var(--ink);
  }
  .today-btn {
    height: 36px;
    padding: 0 14px;
    margin-right: 4px;
    border-radius: 999px;
    background: var(--sunk);
    font-size: 13px;
    font-weight: 650;
    color: var(--ink);
  }
  .cal {
    margin-top: 16px;
    padding: 8px 10px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    box-shadow: var(--shadow-card);
    touch-action: pan-y;
    overflow: hidden;
  }
  .dow,
  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }
  .dow span {
    text-align: center;
    font-size: 12px;
    font-weight: 650;
    color: var(--ink-3);
    padding-bottom: 6px;
  }
  .grid {
    row-gap: 2px;
  }
  .theme {
    grid-column: 1 / -1;
    margin: 8px 6px 2px;
    padding-top: 8px;
    border-top: 1px dashed var(--line-strong);
    color: var(--accent-ink);
    font-size: 11px;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    min-height: 48px;
    padding: 3px 0 5px;
  }
  .n {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    font-size: 14px;
    font-weight: 560;
    transition:
      background var(--dur) var(--ease),
      color var(--dur) var(--ease),
      transform var(--dur) var(--spring);
  }
  .day:active .n {
    transform: scale(0.9);
  }
  .day.past .n {
    color: var(--ink-2);
  }
  .day.out {
    opacity: 0.35;
  }
  .day.today .n {
    box-shadow: inset 0 0 0 2px var(--accent);
    color: var(--accent-ink);
    font-weight: 750;
  }
  .day.sel .n {
    background: var(--ink);
    color: var(--paper);
    box-shadow: none;
    font-weight: 750;
  }
  .day.sel.today .n {
    background: var(--accent);
    color: var(--accent-on);
  }
  .marks {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 7px;
  }
  .marks .pip {
    width: 7px;
    height: 7px;
  }
  .pip.todo,
  .pip.missed {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--c);
  }
  .pip.missed {
    opacity: 0.45;
  }
  .more {
    font-size: 10px;
    line-height: 1;
    color: var(--ink-3);
  }

  .legend {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }
  .kinds {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px 4px;
  }
  .kind {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 0 10px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
    transition:
      opacity var(--dur) var(--ease),
      background var(--dur) var(--ease);
  }
  .kind.on {
    background: color-mix(in srgb, var(--c) 14%, var(--card));
    color: var(--ink);
  }
  .kind.dim {
    opacity: 0.45;
  }
  .kind .pip,
  .states .pip {
    width: 8px;
    height: 8px;
  }
  .states {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--ink-3);
  }
  .states span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .states .pip.todo {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--c);
  }

  .add {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 52px;
    padding: 0 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
    text-align: left;
  }
  .add :global(svg) {
    color: var(--ink-3);
  }
</style>
