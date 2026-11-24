<script>
  // Tutte le note in un posto solo (Diario → Note), dalla più recente. Due gruppi: «Colpi» e
  // «Tornei e altro»; dentro «Colpi» si può restare su un fondamentale. Una nota scritta come nota
  // si apre e si modifica; i testi rimasti in una voce del diario (appunti, da correggere, note
  // tecniche delle versioni di prima) aprono quella voce.
  import Plus from '@lucide/svelte/icons/plus';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { allNotes, NOTE_GROUPS } from '../engine/notes.js';
  import { BRICK, SKILLS, brickOfNote, entryName } from '../data/bricks.js';
  import { describeOld } from './oldNotes.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { fmtRelative } from '../util/dates.js';

  // filter: null (tutte), 'colpi', 'altro' oppure un fondamentale ('dritto', 'servizio'…).
  let { filter = null, onfilter } = $props();

  const all = $derived(
    allNotes(app.notes, app.events, describeOld).map((n) => {
      const brick = n.group === 'colpi' ? brickOfNote(n, app.stroke(n.stroke)) : null;
      const ev = n.eventId ? app.eventById(n.eventId) : null;
      const stroke = n.stroke ? app.strokeName(n.stroke, true) : '';
      const title = n.group === 'colpi' ? (BRICK[brick]?.name ?? (stroke || 'Colpo')) : ev ? entryName(ev, app.catalog) : 'Nota';
      const sub = [n.group === 'colpi' && stroke && stroke !== title ? stroke : null, n.ex && n.source === 'note' ? exerciseLabel(n.ex, app.catalog) : null].filter(Boolean).join(' · ');
      return { ...n, brick, title, sub, fam: BRICK[brick]?.fam ?? null };
    })
  );

  const group = $derived(filter === 'colpi' || BRICK[filter] ? 'colpi' : filter === 'altro' ? 'altro' : null);
  const brick = $derived(BRICK[filter] ? filter : null);
  const shown = $derived(all.filter((n) => (!group || n.group === group) && (!brick || n.brick === brick)));
  const count = (g) => all.filter((n) => n.group === g).length;
  // I fondamentali che hanno almeno una nota, nell'ordine di sempre.
  const bricks = $derived(SKILLS.map((b) => ({ ...b, n: all.filter((x) => x.brick === b.id).length })).filter((b) => b.n));

  function open(n) {
    if (n.source === 'note') ui.open('note', { id: n.id });
    else ui.open('done', { id: n.eventId });
  }
  function write() {
    ui.open('note', { draft: group === 'altro' ? { about: 'altro' } : { brick } });
  }
  const when = (d) => fmtRelative(d).replace(/^(lun|mar|mer|gio|ven|sab|dom) /, '$1 ');
</script>

<div class="chips" role="group" aria-label="Quali note">
  <button class="chip" aria-pressed={!group} onclick={() => onfilter?.(null)}>Tutte{#if all.length}<span class="n">{all.length}</span>{/if}</button>
  {#each NOTE_GROUPS as g (g.id)}
    <button class="chip" aria-pressed={group === g.id} onclick={() => onfilter?.(group === g.id && !brick ? null : g.id)}>{g.name}{#if count(g.id)}<span class="n">{count(g.id)}</span>{/if}</button>
  {/each}
</div>

{#if group === 'colpi' && bricks.length > 1}
  <div class="chips sub" role="group" aria-label="Quale colpo">
    {#each bricks as b (b.id)}
      <button class="chip small" data-fam={b.fam} aria-pressed={brick === b.id} onclick={() => onfilter?.(brick === b.id ? 'colpi' : b.id)}><i class="sq"></i>{b.name}<span class="n">{b.n}</span></button>
    {/each}
  </div>
{/if}

<div class="card flush list notes">
  <button class="add" onclick={write}><Plus size={18} /> Scrivi una nota</button>
  {#each shown as n (n.key)}
    <button class="nrow" data-fam={n.fam} onclick={() => open(n)}>
      <span class="top">
        <i class="sq" class:other={n.group === 'altro'}></i>
        <b class="grow">{n.title}</b>
        <span class="date">{when(n.date)}</span>
      </span>
      {#if n.text}<span class="text">{n.text}</span>{/if}
      {#if n.sub || n.feel}
        <span class="foot">
          {#if n.sub}<span class="grow">{n.sub}</span>{/if}
          {#if n.feel}
            <span class="bars" role="img" aria-label="Sensazione {n.feel} su 5">
              {#each [1, 2, 3, 4, 5] as i (i)}<i class:on={i <= n.feel}></i>{/each}
            </span>
          {/if}
        </span>
      {/if}
    </button>
  {/each}
</div>

{#if !shown.length}
  <p class="muted empty">
    {#if all.length}Nessuna nota qui.{:else}Ancora nessuna nota. Le scrivi alla fine di un allenamento, dopo un torneo, oppure da qui.{/if}
  </p>
{/if}

<style>
  .chips {
    margin-bottom: 12px;
  }
  .chips.sub {
    margin-top: -4px;
  }
  .chip .n {
    margin-left: 2px;
    font-weight: 500;
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }
  .chip.small {
    min-height: 32px;
    padding: 4px 12px;
    font-size: 13px;
  }
  .sq {
    flex: none;
    width: 12px;
    height: 12px;
    border-radius: 4px;
    background: var(--f, var(--ink-3));
  }
  .sq.other {
    border-radius: 50%;
    background: var(--ink-3);
  }
  .nrow {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 14px 16px;
    text-align: left;
  }
  .nrow + .nrow,
  .add + .nrow {
    border-top: 1px solid var(--line);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .top b {
    font-weight: 700;
    min-width: 0;
  }
  .date {
    flex: none;
    font-size: 14px;
    color: var(--ink-2);
  }
  .text {
    color: var(--ink-2);
    white-space: pre-line;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--ink-3);
  }
  .bars {
    display: inline-flex;
    gap: 2px;
    margin-left: auto;
  }
  .bars i {
    width: 10px;
    height: 6px;
    border-radius: 2px;
    background: var(--sunk);
  }
  .bars i.on {
    background: var(--ink);
  }
  .empty {
    margin: 16px 4px 0;
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
    color: var(--accent-ink);
    text-align: left;
  }
</style>
