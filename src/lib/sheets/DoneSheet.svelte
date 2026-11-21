<script>
  // Una voce del diario già fatta, da leggere: che cos'era (per un allenamento, i suoi fondamentali),
  // quanto è durata, i risultati, com'è andata e le note sui colpi scritte quel giorno. Per
  // correggerla c'è «Modifica», che apre il modulo.
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { KIND } from '../data/taxonomy.js';
  import { BRICK, brickOfStroke, eventBricks, eventName } from '../data/bricks.js';
  import { attemptsOf } from '../engine/attempts.js';
  import { shortValue, size } from '../engine/medals.js';
  import { TRIES_PER_DAY } from '../data/library.js';
  import { fmtLong, fmtDuration } from '../util/dates.js';
  import { FEEL } from '../ui/FeelPicker.svelte';
  import Sheet from '../ui/Sheet.svelte';
  import BrickStack from '../ui/BrickStack.svelte';

  let { id } = $props();

  const ev = $derived(app.eventById(id));
  const training = $derived(ev?.kind === 'training');
  const title = $derived(!ev ? '' : training ? eventName(ev, app.catalog) : ev.kind === 'livello' ? 'Livello' : (KIND[ev.kind]?.name ?? 'Attività'));
  const bricks = $derived(training ? eventBricks(ev, app.catalog) : []);
  const facts = $derived(
    !ev ? '' : [fmtLong(ev.date).replace(/^./, (c) => c.toUpperCase()), ev.minutes ? fmtDuration(ev.minutes) : null, ev.partner?.name ? `con ${ev.partner.name}` : null].filter(Boolean).join(' · ')
  );
  // I risultati: per ogni esercizio misurato, il migliore di quel giorno.
  const scores = $derived(
    !ev
      ? []
      : attemptsOf(ev, app.catalog)
          .map((a) => {
            const ex = app.catalog.exercise(a.ex);
            const best = a.tries.slice(0, TRIES_PER_DAY[a.fmt] ?? 1).reduce((b, v) => (size(v) > size(b) ? v : b), a.tries[0]);
            return ex ? { id: ex.id, name: ex.name, value: shortValue(ex, best) } : null;
          })
          .filter(Boolean)
  );
  // Le note sui colpi scritte quel giorno, con il colore del fondamentale.
  const notes = $derived(
    !ev
      ? []
      : app.notes
          .filter((n) => n.date === ev.date && n.text)
          .map((n) => ({ id: n.id, text: n.text, brick: BRICK[brickOfStroke(app.stroke(n.stroke))] ?? null, name: app.strokeName(n.stroke, true) }))
  );

  function edit() {
    ui.close();
    ui.open('event', { id });
  }
</script>

{#if ev}
  <Sheet {title} onclose={() => ui.close()} sans>
    <p class="muted facts">{facts}</p>

    {#if bricks.length}<BrickStack {bricks} />{/if}

    {#if scores.length}
      <div class="group">
        {#each scores as s (s.id)}
          <button class="line" onclick={() => ui.open('exercise', { id: s.id })}>
            <span class="grow">{s.name}</span><b class="num">{s.value}</b>
          </button>
        {/each}
      </div>
    {/if}

    {#if ev.feel || ev.focus?.stroke || ev.note}
      <div class="group">
        {#if ev.feel}<div class="line"><span class="grow muted">Com’è andata</span><b>{FEEL[ev.feel - 1]}</b></div>{/if}
        {#if ev.focus?.stroke}<div class="line"><span class="grow muted">Da correggere</span><b>{app.strokeName(ev.focus.stroke, true)}</b></div>{/if}
        {#if ev.note}<p class="text">{ev.note}</p>{/if}
      </div>
    {/if}

    {#each notes as n (n.id)}
      <span class="note" data-fam={n.brick?.fam ?? 'libero'}><b>{n.brick?.name ?? n.name}</b> {n.text}</span>
    {/each}

    {#snippet footer()}
      <button class="btn ghost wide" onclick={edit}>Modifica</button>
    {/snippet}
  </Sheet>
{/if}

<style>
  .facts {
    margin: -4px 0 14px;
  }
  .group {
    display: flex;
    flex-direction: column;
    margin-top: 14px;
    padding: 2px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    box-shadow: var(--shadow-card);
  }
  .line {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 48px;
    padding: 8px 0;
    text-align: left;
  }
  .line + .line,
  .line + .text {
    border-top: 1px solid var(--line);
  }
  .text {
    margin: 0;
    padding: 12px 0;
    white-space: pre-wrap;
  }
  .note {
    display: block;
    margin-top: 12px;
    padding-left: 10px;
    border-left: 3px solid var(--f);
    font-size: 14px;
  }
</style>
