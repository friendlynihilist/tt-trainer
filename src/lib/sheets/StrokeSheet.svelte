<script>
  // Un colpo. In alto chi è (famiglia con l'icona, lato, fasi del punto) e cos'è; poi come lo senti
  // (l'ultima nota in cinque tacche); poi le tue note, dove lo alleni e cosa correggere, in sezioni
  // richiudibili.
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { FAMILIES, FAMILY, POINT_PHASE } from '../data/taxonomy.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { drillsFor, weaknesses } from '../engine/stats.js';
  import Sheet from '../ui/Sheet.svelte';
  import MedalRing from '../ui/MedalRing.svelte';
  import FamilyIcon from '../ui/FamilyIcon.svelte';
  import Collapse from '../ui/Collapse.svelte';
  import Crosshair from '@lucide/svelte/icons/crosshair';
  import Trash from '@lucide/svelte/icons/trash-2';
  import NoteRow from '../ui/NoteRow.svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import { notesOf, feelSummary, fmtFeel } from '../engine/notes.js';

  let { id } = $props();

  const stroke = $derived(app.stroke(id));
  const family = $derived(FAMILIES.find((f) => f.id === stroke?.family)?.name ?? 'I tuoi colpi');
  const drills = $derived(drillsFor(id, app.catalog, app.player.level));
  const stat = $derived(weaknesses(app.events).strokes.find((s) => s.id === id));
  const notes = $derived(notesOf(app.notes, id));
  const feel = $derived(feelSummary(app.notes, id));
  const FEEL = ['Dura', 'Così così', 'Bene', 'Molto bene', 'Ottima'];

  function remove() {
    app.removeCustom('strokes', id);
    ui.close();
  }
</script>

{#if stroke}
  <Sheet title={stroke.name} onclose={() => ui.close()} tall sans>
    <div class="st" data-fam={stroke.family in FAMILY ? stroke.family : 'libero'}>
      <!-- Chi è: famiglia, lato, fasi del punto. -->
      <div class="who">
        <span class="fam-ico"><FamilyIcon fam={stroke.family in FAMILY ? stroke.family : 'libero'} size={28} /></span>
        <span class="who-txt">
          <span class="fam-name">{family}</span>
          <span class="meta">
            {#if stroke.side}<span>{stroke.side === 'D' ? 'Dritto' : 'Rovescio'}</span>{/if}
            {#if stroke.phases?.length}<span class="phases">{stroke.phases.map((p) => POINT_PHASE[p].name.toLowerCase()).join(', ')}</span>{/if}
          </span>
        </span>
      </div>
      {#if stroke.about}<p class="lead">{stroke.about}</p>{/if}

      <!-- Come lo senti: l'ultima nota in cinque tacche, la media accanto. -->
      {#if feel}
        <section class="feel">
          <span class="t-caps muted">Come lo senti</span>
          <div class="feel-row">
            <span class="ticks" role="img" aria-label="Ultima nota: {FEEL[feel.last - 1]}">
              {#each [1, 2, 3, 4, 5] as n (n)}<i class:on={n <= feel.last} style:--h="{30 + n * 14}%"></i>{/each}
            </span>
            <span class="feel-txt">
              <strong>{FEEL[feel.last - 1]}</strong>
              <span class="small muted">l’ultima volta</span>
              {#if feel.count > 1}<span class="small avg">In media <b>{fmtFeel(feel.avg)} su 5</b>, nelle ultime {feel.count} note</span>{/if}
            </span>
          </div>
        </section>
      {/if}

      <div class="more">
        <Collapse title="Le tue note" count={notes.length || null} open={notes.length > 0}>
          <div class="card flush list">
            {#each notes as n (n.id)}<NoteRow note={n} onclick={() => ui.open('note', { id: n.id })} />{/each}
            <button class="add" onclick={() => ui.open('note', { draft: { stroke: id } })}><Plus size={18} />Aggiungi una nota</button>
          </div>
        </Collapse>

        {#if drills.length}
          <Collapse title="Dove lo alleni" count={drills.length} key="colpo-esercizi">
            <div class="card flush list">
              {#each drills as d (d)}
                <button class="item" onclick={() => ui.open('exercise', { id: d })}>
                  <span class="grow">{exerciseLabel(d, app.catalog)}</span>
                  <MedalRing exercise={app.catalog.exercise(d)} medals={app.medals[d]} size={34} />
                </button>
              {/each}
            </div>
          </Collapse>
        {/if}

        <Collapse title="Da correggere" count={stat?.count || null} open={false} key="colpo-correggere">
          {#if stat}
            <p class="fix"><Crosshair size={16} /> Segnato <b>{stat.count}</b> {stat.count === 1 ? 'volta' : 'volte'} nel diario.</p>
            {#if stat.errors.length}
              <div class="card flush list">
                {#each stat.errors as e (e.id)}
                  <div class="err"><span class="grow">{app.errorName(e.id)}</span><span class="t-num muted">{e.count}</span></div>
                {/each}
              </div>
            {/if}
          {:else}
            <p class="muted small">Mai segnato da correggere.</p>
          {/if}
        </Collapse>
      </div>

      {#if stroke.custom}
        <div class="card flush list">
          <button class="item danger" onclick={remove}><Trash size={18} /><span class="grow">Elimina questo colpo</span></button>
        </div>
      {/if}
    </div>
  </Sheet>
{/if}

<style>
  .st {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 8px;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .fam-ico {
    display: grid;
    place-items: center;
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 15px;
    background: var(--f);
    color: var(--f-on);
    box-shadow: 0 3px 0 var(--f-edge);
  }
  .who-txt {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .fam-name {
    font-weight: 700;
    color: var(--f-ink);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    font-size: 13px;
    color: var(--ink-2);
  }
  .phases {
    color: var(--ink-3);
  }
  .lead {
    margin: 0;
  }
  .feel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
  }
  .feel-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .ticks {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 34px;
  }
  .ticks i {
    width: 12px;
    height: var(--h);
    border-radius: 3px;
    background: var(--sunk);
  }
  .ticks i.on {
    background: var(--f);
  }
  .feel-txt {
    display: flex;
    flex-direction: column;
  }
  .feel-txt strong {
    font-weight: 700;
  }
  .avg {
    margin-top: 4px;
    color: var(--ink-2);
  }
  .more {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
  .fix {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px;
  }
  .fix :global(svg) {
    color: var(--down);
  }
  .err {
    display: flex;
    align-items: center;
    padding: 12px 16px;
  }
  .item :global(svg) {
    color: var(--ink-3);
    flex: none;
  }
  .item.danger,
  .item.danger :global(svg) {
    color: var(--down);
  }
</style>
