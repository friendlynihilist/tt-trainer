<script>
  // Una voce del diario già fatta, da leggere: che cos'era (per un allenamento, i suoi fondamentali),
  // quanto è durata, con chi, i risultati, com'è andata e le sue note: quelle legate alla voce e i
  // testi rimasti dentro la voce dalle versioni di prima. Per correggerla c'è «Modifica».
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
  import { allNotes } from '../engine/notes.js';
  import { partnerWith } from '../engine/partner.js';
  import { describeOld } from '../ui/oldNotes.js';

  let { id } = $props();

  const ev = $derived(app.eventById(id));
  const training = $derived(ev?.kind === 'training');
  const title = $derived(!ev ? '' : training ? eventName(ev, app.catalog) : ev.kind === 'livello' ? 'Livello' : (KIND[ev.kind]?.name ?? 'Attività'));
  const bricks = $derived(training ? eventBricks(ev, app.catalog) : []);
  const facts = $derived(
    !ev ? '' : [fmtLong(ev.date).replace(/^./, (c) => c.toUpperCase()), ev.minutes ? fmtDuration(ev.minutes) : null, partnerWith(ev.partner).replace(/^./, (c) => c.toLowerCase()) || null].filter(Boolean).join(' · ')
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
  // Le note della voce: quelle legate a lei (o, per le note di prima, scritte quel giorno) e i testi
  // rimasti dentro la voce. Quelle sui colpi hanno il colore del fondamentale.
  const notes = $derived(
    !ev
      ? []
      : allNotes(
          app.notes.filter((n) => (n.eventId ? n.eventId === ev.id : n.stroke && n.date === ev.date)),
          [ev],
          describeOld
        )
          .filter((n) => n.text || n.stroke)
          .reverse()
          .map((n) => ({ ...n, brick: BRICK[brickOfStroke(app.stroke(n.stroke))] ?? null, name: n.stroke ? app.strokeName(n.stroke, true) : '' }))
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

    {#if ev.feel}
      <div class="group">
        <div class="line"><span class="grow muted">Com’è andata</span><b>{FEEL[ev.feel - 1]}</b></div>
      </div>
    {/if}

    {#each notes as n (n.key)}
      {#if n.source === 'note'}
        <button class="note" data-fam={n.brick?.fam ?? 'libero'} onclick={() => ui.open('note', { id: n.id })}>
          {#if n.stroke}<b>{n.brick?.name ?? n.name}</b>{/if}
          {n.text}
        </button>
      {:else}
        <span class="note" data-fam={n.brick?.fam ?? 'libero'}>
          {#if n.stroke}<b>{n.brick?.name ?? n.name}</b>{/if}
          {n.text}
        </span>
      {/if}
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
  .line + .line {
    border-top: 1px solid var(--line);
  }
  .note {
    display: block;
    width: 100%;
    text-align: left;
    white-space: pre-line;
    margin-top: 12px;
    padding-left: 10px;
    border-left: 3px solid var(--f);
    font-size: 14px;
  }
</style>
