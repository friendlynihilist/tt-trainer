<script>
  // La torre: l'allenamento come una pila di fondamentali. In basso il vassoio con i fondamentali da
  // aggiungere. Tutto si fa con le dita:
  //   · tocca un fondamentale del vassoio e si aggiunge in fondo (prima della partita); trascinalo su e
  //     lo metti nel punto che vuoi;
  //   · trascina in giù il bordo di un fondamentale e dura di più, cinque minuti alla volta;
  //   · trascina un fondamentale su o giù e cambi l'ordine;
  //   · toccalo e scegli quali esercizi fare.
  // L'altezza di un fondamentale è la sua durata.
  import { tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import Check from '@lucide/svelte/icons/check';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui, buzz } from '../store/ui.svelte.js';
  import { BRICKS, BRICK, LANE, MIN_MINUTES, MAX_MINUTES, STEP_MINUTES, MINUTE_CHOICES, makeBrick, brickExercises, totalMinutes } from '../data/bricks.js';
  import { PLAYER_LEVEL } from '../data/library.js';
  import { coachDid } from './tours.js';
  import Sheet from './Sheet.svelte';

  // bricks: [{ id, type, minutes, exs }]. focus: i colpi scelti al primo avvio, per primi nel vassoio.
  let { bricks = $bindable([]), focus = [], level = app.player.level } = $props();

  const PX = 5; // un minuto in px
  const height = (minutes) => minutes * PX;

  const tray = $derived([...BRICKS].sort((a, b) => focus.includes(b.id) - focus.includes(a.id)));
  const total = $derived(totalMinutes(bricks));
  const names = (b) => b.exs.map((id) => app.catalog.exercise(id)?.name).filter(Boolean).join(', ');

  let tower = $state();
  let trayEl = $state();
  let editing = $state(null);
  let fresh = $state(null);
  /** Il fondamentale che stai trascinando: { id, y } (lo spostamento rispetto al suo posto). */
  let drag = $state(null);
  /** Il fondamentale che stai portando su dal vassoio: { type, x, y }. */
  let ghost = $state(null);
  let g = null;

  const edited = $derived(bricks.find((b) => b.id === editing) ?? null);
  // Con il foglio di un fondamentale aperto la guida aspetta; il tasto «indietro» chiude il foglio.
  $effect(() => {
    if (!editing) return;
    ui.coachBusy = true;
    const release = ui.hold(() => (editing = null));
    return () => {
      ui.coachBusy = false;
      release();
    };
  });
  // La guida sa quanti fondamentali ci sono (al primo passo si va avanti solo aggiungendone uno).
  $effect(() => {
    ui.coachCtx = { count: bricks.length };
  });

  function add(type, at = null) {
    const nb = makeBrick(type, { level, catalog: app.catalog, medals: app.medals });
    const match = bricks.findIndex((b) => BRICK[b.type].match);
    const i = at ?? (!BRICK[type].match && match >= 0 ? match : bricks.length);
    bricks = [...bricks.slice(0, i), nb, ...bricks.slice(i)];
    fresh = nb.id;
    setTimeout(() => fresh === nb.id && (fresh = null), 500);
    buzz(12);
    coachDid('add', ui.coach?.tour === 'build' && ui.coach.i === 0 ? { bid: nb.id } : null);
  }

  function patch(id, change) {
    bricks = bricks.map((b) => (b.id === id ? { ...b, ...change } : b));
  }

  function toggle(exId) {
    const b = edited;
    patch(b.id, { exs: b.exs.includes(exId) ? b.exs.filter((x) => x !== exId) : [...b.exs, exId] });
  }

  function remove() {
    bricks = bricks.filter((b) => b.id !== editing);
    editing = null;
  }

  // ── I gesti ──

  function down(e) {
    if (editing || e.button > 0) return;
    const grip = e.target.closest('[data-grip]');
    const brk = e.target.closest('.brk');
    const tile = e.target.closest('[data-tile]');
    if (brk && grip) {
      const b = bricks.find((x) => x.id === brk.dataset.id);
      g = { kind: 'stretch', id: b.id, y0: e.clientY, m0: b.minutes };
      e.preventDefault();
    } else if (brk) {
      g = { kind: 'brk', id: brk.dataset.id, el: brk, y0: e.clientY, grab: e.clientY - brk.getBoundingClientRect().top, moved: false, order: bricks.map((b) => b.id).join() };
    } else if (tile) {
      g = { kind: 'tile', type: tile.dataset.tile, x0: e.clientX, y0: e.clientY };
    }
  }

  async function move(e) {
    if (!g) return;
    const dy = e.clientY - g.y0;
    if (g.kind === 'stretch') {
      const m = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round((g.m0 * PX + dy) / PX / STEP_MINUTES) * STEP_MINUTES));
      if (m !== bricks.find((b) => b.id === g.id)?.minutes) {
        patch(g.id, { minutes: m });
        buzz();
      }
      ui.coachBusy = true;
    } else if (g.kind === 'brk') {
      if (!g.moved && Math.abs(dy) < 7) return;
      g.moved = true;
      ui.coachBusy = true;
      // Dove sta ora il bordo alto del fondamentale, e il suo posto fra gli altri (per i loro centri).
      const top = e.clientY - g.grab;
      const mid = top + g.el.offsetHeight / 2;
      const others = [...tower.querySelectorAll('.brk')].filter((n) => n !== g.el);
      const at = others.filter((n) => {
        const r = n.getBoundingClientRect();
        return r.top + r.height / 2 < mid;
      }).length;
      const from = bricks.findIndex((b) => b.id === g.id);
      if (at !== from) {
        const rest = bricks.filter((b) => b.id !== g.id);
        bricks = [...rest.slice(0, at), bricks[from], ...rest.slice(at)];
        buzz();
        drag = { id: g.id, y: drag?.y ?? 0 };
        await tick();
        if (!g) return;
      }
      drag = { id: g.id, y: top - (tower.getBoundingClientRect().top + g.el.offsetTop) };
    } else if (g.kind === 'tile') {
      if (!ghost && Math.hypot(e.clientX - g.x0, dy) < 8) return;
      ui.coachBusy = true;
      ghost = { type: g.type, x: e.clientX, y: e.clientY };
    }
  }

  function up(e, cancelled = false) {
    if (!g) return;
    const g0 = g;
    g = null;
    ui.coachBusy = Boolean(editing);
    if (g0.kind === 'stretch') {
      if (bricks.find((b) => b.id === g0.id)?.minutes !== g0.m0) coachDid('stretch');
    } else if (g0.kind === 'brk') {
      drag = null;
      if (!g0.moved) {
        if (cancelled) return;
        editing = g0.id;
        coachDid('edit');
      } else if (g0.order !== bricks.map((b) => b.id).join()) coachDid('order');
    } else if (g0.kind === 'tile') {
      const was = ghost;
      ghost = null;
      if (cancelled) return;
      if (!was) return add(g0.type);
      // Lasciato sopra il vassoio: entra nella torre, nel punto in cui l'hai lasciato.
      if (e.clientY > trayEl.getBoundingClientRect().top) return;
      const list = [...tower.querySelectorAll('.brk')];
      const at = list.findIndex((n) => {
        const r = n.getBoundingClientRect();
        return e.clientY < r.top + r.height / 2;
      });
      add(g0.type, at < 0 ? list.length : at);
    }
  }
</script>

<svelte:window onpointermove={move} onpointerup={(e) => up(e)} onpointercancel={(e) => up(e, true)} />

<div class="head">
  <span class="total">{total}</span>
  <span class="muted unit">minuti{bricks.length > 1 ? ', pause comprese' : ''}</span>
</div>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="tower" id="tower" bind:this={tower} onpointerdown={down}>
  {#each bricks as b (b.id)}
    {@const def = BRICK[b.type]}
    {@const h = height(b.minutes)}
    <div
      class="brk"
      class:new={fresh === b.id}
      class:short={h < 60}
      class:drag={drag?.id === b.id}
      data-id={b.id}
      data-fam={def.fam}
      style:height="{h}px"
      style:transform={drag?.id === b.id ? `translateY(${drag.y}px)` : null}
      animate:flip={{ duration: drag?.id === b.id ? 0 : 180 }}
      role="button"
      tabindex="0"
      aria-label="{def.name}, {b.minutes} minuti. Tocca per scegliere gli esercizi."
      onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), (editing = b.id))}
    >
      <span class="brk-t">
        <b>{def.name}</b>
        <small>{def.match ? 'Metà rischiosa, metà a schema' : names(b) || 'Scegli gli esercizi'}</small>
      </span>
      <span class="brk-m">{b.minutes}′</span>
      <span class="brk-go" aria-hidden="true"><ChevronRight size={18} strokeWidth={2.6} /></span>
      <span class="grip" data-grip aria-hidden="true"></span>
    </div>
  {:else}
    <div class="empty">Qui compaiono i fondamentali<br />che aggiungi</div>
  {/each}
</div>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="tray" id="tray" bind:this={trayEl} onpointerdown={down}>
  {#each tray as t (t.id)}
    <button class="tile" data-tile={t.id} data-fam={t.fam} aria-label="Aggiungi {t.name}">{t.name}</button>
  {/each}
</div>

{#if ghost}
  <div class="ghost" data-fam={BRICK[ghost.type].fam} style:left="{ghost.x}px" style:top="{ghost.y}px">{BRICK[ghost.type].name}</div>
{/if}

{#if edited}
  {@const def = BRICK[edited.type]}
  {@const all = brickExercises(edited.type, app.catalog, app.medals)}
  {@const groups = def.lanes ? def.lanes.map((f) => ({ name: LANE[f], list: all.filter((e) => e.family === f) })).filter((x) => x.list.length) : [{ name: '', list: all }]}
  <Sheet title={def.name} onclose={() => (editing = null)} tall>
    <div class="edit">
      <div class="mins" role="group" aria-label="Minuti">
        {#each [...new Set([...MINUTE_CHOICES, edited.minutes])].sort((a, b) => a - b) as m (m)}
          <button aria-pressed={edited.minutes === m} onclick={() => patch(edited.id, { minutes: m })}>{m}′</button>
        {/each}
      </div>
      {#if def.match}
        <p class="muted">La prima metà si gioca rischiando, la seconda con uno schema.</p>
      {/if}
      {#each groups as gr (gr.name)}
        {#if gr.name}<span class="t-label muted">{gr.name}</span>{/if}
        <div class="opts">
          {#each gr.list as ex (ex.id)}
            {@const on = edited.exs.includes(ex.id)}
            <button class="opt" aria-pressed={on} onclick={() => toggle(ex.id)}>
              <i>{#if on}<Check size={15} strokeWidth={3.2} />{/if}</i>
              <span class="grow">{ex.name}</span>
              {#if ex.level}<span class="lv" data-level={ex.level}>{PLAYER_LEVEL[ex.level].name}</span>{/if}
            </button>
          {/each}
        </div>
      {/each}
    </div>
    {#snippet footer()}
      <div class="stack g-8">
        <button class="btn accent wide" onclick={() => (editing = null)}>Fatto</button>
        <button class="btn plain wide danger-txt" onclick={remove}>Togli questo fondamentale</button>
      </div>
    {/snippet}
  </Sheet>
{/if}

<style>
  .head {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }
  .total {
    font-size: 56px;
    font-weight: 800;
    letter-spacing: -0.05em;
    line-height: 0.9;
    font-variant-numeric: tabular-nums;
  }
  .unit {
    padding-bottom: 4px;
  }

  .tower {
    position: relative;
    flex: 1 0 auto;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-bottom: 12px;
  }
  .empty {
    flex: 1;
    min-height: 180px;
    display: grid;
    place-items: center;
    text-align: center;
    border: 2px dashed var(--line-strong);
    border-radius: 20px;
    color: var(--ink-3);
  }

  .brk {
    position: relative;
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    border-radius: 16px;
    background: var(--f);
    color: var(--f-on);
    box-shadow: 0 4px 0 var(--f-edge);
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: grab;
    transition: transform 0.18s var(--ease);
  }
  .brk.new {
    animation: drop 0.42s cubic-bezier(0.3, 0.7, 0.3, 1) both;
  }
  @keyframes drop {
    from {
      opacity: 0;
      translate: 0 -28px;
    }
  }
  .brk.drag {
    z-index: 5;
    cursor: grabbing;
    scale: 1.03;
    transition: none;
    box-shadow:
      0 4px 0 var(--f-edge),
      0 18px 30px -8px rgba(0, 0, 0, 0.45);
  }
  .brk-t {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .brk-t b {
    font-size: 16px;
    font-weight: 750;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .brk-t small {
    font-size: 13px;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .brk.short .brk-t {
    flex-direction: row;
    align-items: baseline;
    gap: 8px;
  }
  .brk.short .brk-t b {
    flex: none;
  }
  .brk.short small {
    min-width: 0;
  }
  .brk-m {
    flex: none;
    font-size: 20px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  /* La freccia a destra dice che il fondamentale si apre. */
  .brk-go {
    flex: none;
    display: grid;
    margin: 0 -6px 0 -4px;
    opacity: 0.8;
  }
  /* Il bordo da trascinare per allungare il fondamentale. */
  .grip {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -6px;
    height: 22px;
    display: grid;
    place-items: center;
    cursor: ns-resize;
    touch-action: none;
  }
  .grip::before {
    content: '';
    width: 34px;
    height: 4px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--f-on) 75%, transparent);
    translate: 0 -5px;
  }

  .tray {
    position: sticky;
    bottom: 0;
    flex: none;
    display: flex;
    gap: 8px;
    margin: 0 calc(var(--gutter) * -1);
    padding: 8px var(--gutter) 10px;
    overflow-x: auto;
    scrollbar-width: none;
    touch-action: pan-x;
    background: var(--paper);
  }
  .tray::-webkit-scrollbar {
    display: none;
  }
  .tile,
  .ghost {
    flex: none;
    min-height: 52px;
    padding: 0 18px;
    border-radius: 14px;
    background: var(--f);
    color: var(--f-on);
    font-weight: 750;
    box-shadow: 0 4px 0 var(--f-edge);
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
  }
  .tile:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 var(--f-edge);
  }
  .ghost {
    position: fixed;
    z-index: 38;
    display: grid;
    place-items: center;
    translate: -50% -50%;
    scale: 1.06;
    pointer-events: none;
    box-shadow:
      0 4px 0 var(--f-edge),
      0 18px 30px -8px rgba(0, 0, 0, 0.45);
  }

  .edit {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .mins {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .mins button {
    min-width: 54px;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 12px;
    background: var(--sunk);
    font-weight: 750;
    font-variant-numeric: tabular-nums;
  }
  .mins button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--paper);
  }
  .opts {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 52px;
    padding: 8px 14px;
    border-radius: 14px;
    background: var(--card);
    box-shadow: inset 0 0 0 1px var(--line);
    text-align: left;
    font-weight: 600;
  }
  .opt i {
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 7px;
    display: grid;
    place-items: center;
    box-shadow: inset 0 0 0 2px var(--line-strong);
    color: var(--accent-on);
  }
  .opt[aria-pressed='true'] i {
    background: var(--accent);
    box-shadow: none;
  }
  .lv {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-3);
  }
  .lv::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--lv);
  }
  .danger-txt {
    color: var(--down);
  }
  @media (prefers-reduced-motion: reduce) {
    .brk.new {
      animation: none;
    }
  }
</style>
