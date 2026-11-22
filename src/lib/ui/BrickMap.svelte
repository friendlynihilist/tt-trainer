<script>
  // La mappa di un colpo: ogni casella è un esercizio, con la medaglia più alta che hai preso. Le
  // righe seguono i livelli (la barra a sinistra dice quale), le file sono le famiglie in Dritto e
  // Rovescio. La pallina salta sull'esercizio da fare adesso in ogni fila. Sopra la mappa, le note
  // che hai scritto su quel colpo.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import NotebookPen from '@lucide/svelte/icons/notebook-pen';
  import Target from '@lucide/svelte/icons/target';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { startItem } from '../store/actions.js';
  import { SKILLS, BRICK, brickMap, brickOfStroke, medalRank } from '../data/bricks.js';
  import { PLAYER_LEVELS, TIER } from '../data/library.js';
  import { topTier, valueText } from '../engine/medals.js';
  import { allNotes } from '../engine/notes.js';
  import { coachDid } from './tours.js';
  import MedalBadge from './MedalBadge.svelte';
  import Sheet from './Sheet.svelte';

  let { brick = 'dritto', onpick } = $props();

  const X = [74, 182, 290]; // il centro delle tre file, su 336
  // Fra una riga e l'altra resta posto per la pallina che rimbalza sopra l'esercizio di adesso.
  const ROW = 134;

  const map = $derived(brickMap(brick, app.catalog, app.medals));
  const top = $derived(map.heads ? 46 : 16);
  const y = (row) => top + 8 + row * ROW;
  const height = $derived(map.nodes.length ? y(Math.max(...map.nodes.map((n) => n.row))) + 110 : 0);
  const has = (i) => medalRank(app.medals[map.nodes[i].ex.id]) > 0;
  const lines = $derived(
    map.edges.map(([a, b]) => ({
      x: X[map.nodes[a].col],
      y1: y(map.nodes[a].row) + 30,
      y2: y(map.nodes[b].row) + 30,
      done: has(a) && (has(b) || map.nodes[b].now)
    }))
  );
  // Per ogni livello, dalla prima all'ultima riga delle sue caselle.
  const bands = $derived.by(() => {
    const out = [];
    for (const n of map.nodes) {
      const b = out.find((x) => x.lv === n.lv);
      if (b) b.to = Math.max(b.to, n.row);
      else out.push({ lv: n.lv, from: n.row, to: n.row });
    }
    return out;
  });

  // Quante note ha il colpo: si leggono tutte nel Diario, in «Note», già filtrate.
  const notes = $derived(allNotes(app.notes, app.events).filter((n) => n.stroke && brickOfStroke(app.stroke(n.stroke)) === brick).length);
  let picked = $state(null);
  $effect(() => {
    if (picked) return ui.hold(() => (picked = null));
  });

  function open(ex) {
    picked = ex;
    coachDid('node');
  }
  function measure() {
    const id = picked.id;
    picked = null;
    startItem({ kind: 'test' }, { exercises: [id] });
  }
  function sheetOf(id) {
    picked = null;
    ui.open('exercise', { id });
  }
</script>

<div class="bricks" role="group" aria-label="Colpi">
  {#each SKILLS as b (b.id)}
    <button data-fam={b.fam} aria-pressed={brick === b.id} onclick={() => onpick?.(b.id)}>{b.name}</button>
  {/each}
</div>

<button class="notes" onclick={() => ui.go('calendario', 'note', brick)}>
  <span class="n-ico"><NotebookPen size={22} /></span>
  <span class="grow"><b>Le tue note</b>{#if notes}<span class="muted count">{notes}</span>{/if}</span>
  <span class="muted"><ChevronRight size={18} /></span>
</button>

{#key brick}
  <div class="map" id="map" style:height="{height}px">
    {#if map.heads}
      {#each map.heads as h, i (h)}<span class="lh" style:left="{(X[map.cols[i]] / 336) * 100}%">{h}</span>{/each}
    {/if}
    {#each bands as b (b.lv)}
      <div class="band" data-level={PLAYER_LEVELS[b.lv].id} style:top="{y(b.from) - 4}px" style:height="{y(b.to) - y(b.from) + 100}px"><span>{PLAYER_LEVELS[b.lv].name}</span></div>
    {/each}
    <svg viewBox="0 0 336 {height}" preserveAspectRatio="none" aria-hidden="true">
      {#each lines as l, i (i)}
        <path class={l.done ? 'done' : 'todo'} d="M{l.x} {l.y1}V{l.y2}" pathLength={l.done ? 1 : undefined} />
      {/each}
    </svg>
    {#each map.nodes as n, i (n.ex.id)}
      {@const tier = topTier(app.medals[n.ex.id])}
      <button
        class="nd"
        class:now={n.now}
        class:empty={!tier}
        style:left="{(X[n.col] / 336) * 100}%"
        style:top="{y(n.row)}px"
        style:animation-delay="{Math.min(n.row, 8) * 50}ms"
        aria-label="{n.ex.name}{tier ? `, ${TIER[tier].name.toLowerCase()}` : ''}{n.now ? ', da fare adesso' : ''}"
        onclick={() => open(n.ex)}
      >
        <i><MedalBadge tier={tier ?? 'B'} on={Boolean(tier)} size={38} label={false} /></i>
        <span>{n.ex.name}</span>
      </button>
    {/each}
  </div>
{/key}

{#if picked}
  {@const m = app.medals[picked.id]}
  <Sheet title={picked.name} onclose={() => (picked = null)}>
    {#if picked.goals?.B != null}
      <div class="steps3">
        {#each ['B', 'A', 'O'] as t (t)}
          <span><MedalBadge tier={t} on={Boolean(m?.[t])} size={40} label={false} /><b>{TIER[t].name}</b><small>{valueText(picked, picked.goals[t], t)}</small></span>
        {/each}
      </div>
    {:else}
      <p class="muted">Questo esercizio non ha medaglie: serve a scaldarsi.</p>
    {/if}
    <button class="row-btn" onclick={() => sheetOf(picked.id)}>
      <span class="grow"><strong>Come si fa</strong></span><ChevronRight size={18} />
    </button>
    {#snippet footer()}
      {#if picked.goals?.B != null}
        <button class="btn accent wide" onclick={measure}><Target size={18} /> Misurati</button>
      {/if}
    {/snippet}
  </Sheet>
{/if}

<style>
  .bricks {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    margin: 0 calc(var(--gutter) * -1);
    padding: 4px var(--gutter) 10px;
    scrollbar-width: none;
  }
  .bricks::-webkit-scrollbar {
    display: none;
  }
  .bricks button {
    flex: none;
    height: 44px;
    padding: 0 14px;
    border-radius: 13px;
    background: var(--f-soft);
    font-weight: 700;
    color: var(--ink);
    transition: translate var(--dur-fast);
  }
  .bricks button[aria-pressed='true'] {
    background: var(--f);
    color: var(--f-on);
    box-shadow: 0 4px 0 var(--f-edge);
    translate: 0 -2px;
  }

  .notes {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    margin-bottom: 16px;
    border-radius: var(--r-card);
    background: var(--card);
    box-shadow: var(--shadow);
    text-align: left;
  }
  .count {
    margin-left: 6px;
  }
  .n-ico {
    display: grid;
    color: var(--accent-ink);
  }

  .map {
    position: relative;
    width: 100%;
    max-width: 380px;
    margin: 0 auto;
  }
  .map svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .map path {
    fill: none;
    stroke-width: 6;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }
  .map path.done {
    stroke: var(--accent);
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: draw 0.7s ease-out forwards;
  }
  .map path.todo {
    stroke: var(--line-strong);
    stroke-dasharray: 2 12;
  }
  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes up {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
  }
  @keyframes hop {
    50% {
      translate: 0 -7px;
    }
  }
  .lh {
    position: absolute;
    top: 0;
    translate: -50% 0;
    width: 104px;
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-3);
  }
  .band {
    position: absolute;
    left: 0;
    width: 18px;
    border-left: 4px solid var(--lv);
    border-radius: 2px;
  }
  .band span {
    position: absolute;
    left: 6px;
    top: 0;
    writing-mode: vertical-rl;
    rotate: 180deg;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .nd {
    position: absolute;
    width: 106px;
    translate: -50% 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    text-align: center;
    animation: up 0.4s both;
  }
  .nd i {
    position: relative;
    display: grid;
    place-items: center;
    width: 64px;
    height: 60px;
    border-radius: 20px;
    background: var(--card);
    box-shadow: 0 5px 0 var(--line);
    transition:
      transform 0.12s,
      box-shadow 0.12s;
  }
  .nd:active i {
    transform: translateY(4px);
    box-shadow: 0 1px 0 var(--line);
  }
  .nd.now i {
    background: var(--accent);
    box-shadow:
      0 5px 0 color-mix(in srgb, var(--accent) 65%, #000),
      0 0 0 6px color-mix(in srgb, var(--accent) 22%, transparent);
  }
  /* Sul blu, la medaglia ancora da prendere si schiarisce. */
  .nd.now.empty i > :global(*) {
    filter: grayscale(1) brightness(3);
    opacity: 0.55;
  }
  /* La pallina sull'esercizio da fare adesso. */
  .nd.now i::after {
    content: '';
    position: absolute;
    top: -15px;
    right: -6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 3px var(--accent);
    animation: hop 0.9s ease-in-out infinite;
  }
  .nd span {
    padding: 1px 4px;
    border-radius: 6px;
    background: var(--paper);
    font-size: 11.5px;
    font-weight: 650;
    line-height: 1.2;
  }

  .steps3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    text-align: center;
  }
  .steps3 span {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .steps3 small {
    font-size: 13px;
    color: var(--ink-2);
    line-height: 1.25;
  }
  .row-btn {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 52px;
    margin-top: 12px;
    border-top: 1px solid var(--line);
    text-align: left;
  }
  @media (prefers-reduced-motion: reduce) {
    .nd,
    .nd.now i::after,
    .map path.done {
      animation: none;
    }
    .map path.done {
      stroke-dashoffset: 0;
    }
  }
</style>
