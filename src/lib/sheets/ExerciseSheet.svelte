<script>
  // Un esercizio della libreria (o tuo). In alto chi è: la famiglia con la sua icona, i formati, il
  // livello, come si misura. Poi cosa si fa e come deve venire; le medaglie come scudi in fila; le
  // misure in un grafico. Il resto (come si conta, note, errori, colpi) si apre a richiesta.
  // In fondo «Misurati ora»: si può sempre mettere in un test, a qualsiasi livello.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Gauge from '@lucide/svelte/icons/gauge';
  import Trash from '@lucide/svelte/icons/trash';
  import Pencil from '@lucide/svelte/icons/pencil';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { startItem } from '../store/actions.js';
  import { PLAYER_LEVEL, MODE, TIERS, TIER, TRIES_PER_DAY } from '../data/library.js';
  import { FAMILY } from '../data/taxonomy.js';
  import { valueText, dayValues, nextGoal, shortValue, measureLabel } from '../engine/medals.js';
  import { fmtShort } from '../util/dates.js';
  import { MEASURE_ICON } from '../ui/design.js';
  import Sheet from '../ui/Sheet.svelte';
  import MedalBadge from '../ui/MedalBadge.svelte';
  import FamilyIcon from '../ui/FamilyIcon.svelte';
  import LevelBadge from '../ui/LevelBadge.svelte';
  import Collapse from '../ui/Collapse.svelte';
  import MeasureChart from '../ui/MeasureChart.svelte';
  import NoteRow from '../ui/NoteRow.svelte';
  import { notesForExercise } from '../engine/notes.js';

  let { id } = $props();

  const ex = $derived(app.catalog.exercise(id));
  const m = $derived(app.medals[id] ?? null);
  const goal = $derived(ex ? nextGoal(ex, m) : null);
  const tiers = $derived(ex ? TIERS.filter((t) => ex.goals?.[t] != null) : []);
  const mine = $derived(app.attempts.filter((a) => a.ex === id));
  // Una riga per seduta, la più recente prima, con il valore che conta per le medaglie.
  const days = $derived.by(() => {
    if (!ex?.measure) return [];
    const rows = [];
    for (const tier of [null, ...Object.keys(ex.alt ?? {})]) {
      const list = mine.filter((a) => (a.tier ?? null) === tier);
      for (const [date, value] of dayValues(ex, list)) rows.push({ date, value, tier, eventId: list.find((a) => a.date === date)?.eventId });
    }
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12);
  });
  const family = $derived(ex?.family ? FAMILY[ex.family] : null);
  const notes = $derived(ex ? notesForExercise(app.notes, ex) : []);
  const imported = $derived(Boolean(ex?.custom && !ex.track && (app.meta?.custom?.exercises ?? []).some((e) => e.id === id)));

  function measureText(e) {
    const ms = e.measure;
    if (!ms) return 'Senza misura: è un esercizio di riscaldamento.';
    const per = TRIES_PER_DAY[ms.type];
    if (ms.type === 'su') return `Una serie da ${ms.n} tentativi. In una seduta vale la prima serie.`;
    if (ms.type === 'fila') return `Quante di fila. In una seduta vale il migliore dei primi ${per} tentativi.`;
    if (ms.type === 'tempo') return `Quanti in ${ms.seconds} secondi. In una seduta vale il migliore dei primi ${per} tentativi.`;
    return `Un conteggio per seduta: ${ms.what}.`;
  }

  function test() {
    ui.closeAll();
    startItem({ kind: 'test' }, { exercises: [id] });
  }

  function remove() {
    ui.open('confirm', {
      title: `Eliminare «${ex.name}»?`,
      text: mine.length ? 'Le misure già fatte restano nel diario.' : 'Non è mai stato usato.',
      action: 'Elimina',
      danger: true,
      onconfirm: () => {
        app.removeCustom('exercises', id);
        ui.closeAll();
      }
    });
  }
</script>

{#if ex}
  <Sheet title={ex.name} onclose={() => ui.close()} tall sans>
    <div class="ex" data-fam={ex.family ?? 'libero'}>
      <!-- Chi è: famiglia, livello, formati, come si misura. Ogni cosa con il suo stile. -->
      <div class="who">
        <span class="fam-ico"><FamilyIcon fam={ex.family ?? 'libero'} size={28} /></span>
        <span class="who-txt">
          <span class="fam-name">{family?.name ?? 'Esercizio tuo'}</span>
          {#if ex.modes?.length}<span class="modes">{ex.modes.map((mo) => MODE[mo]?.name).filter(Boolean).join(', ')}</span>{/if}
        </span>
        {#if ex.level}<LevelBadge level={ex.level} small />{/if}
      </div>
      {#if ex.measure}
        {@const MIcon = MEASURE_ICON[ex.measure.type]}
        <p class="param">{#if MIcon}<MIcon size={16} />{/if}Si misura: <b>{measureLabel(ex).startsWith('di fila') ? `colpi ${measureLabel(ex)}` : measureLabel(ex)}</b></p>
      {/if}

      {#if ex.text}<p class="lead">{ex.text}</p>{/if}
      {#if ex.quality}
        <div class="quality">
          <span class="t-label">Come deve venire</span>
          <p>{ex.quality}</p>
        </div>
      {/if}
      {#if ex.test}<p class="small muted">Test · {ex.test}</p>{/if}

      <!-- Le medaglie: gli scudi in fila, con la soglia e quando sono arrivate. -->
      {#if tiers.length}
        <section class="part">
          <h3 class="t-label muted">Medaglie</h3>
          <div class="medals">
            {#each tiers as t, i (t)}
              {@const got = m?.[t]}
              {@const half = t === 'O' && !got && m?.half}
              <div class="md" class:got class:next={!got && goal?.tier === t}>
                <MedalBadge tier={t} on={Boolean(got)} half={Boolean(half)} size={44} label={false} shine delay={i * 200} />
                <strong>{TIER[t].name}</strong>
                <span class="md-goal t-num">{shortValue(ex, ex.goals[t])}</span>
                <span class="md-when">{got ? fmtShort(got) : half ? 'metà' : goal?.tier === t ? 'prossima' : ''}</span>
              </div>
            {/each}
          </div>
          {#if m?.stale}<p class="stale">Da ripassare: l’ultima misura è di {fmtShort(m.lastDate)}.</p>{/if}
        </section>
      {/if}

      <!-- Le misure: un grafico, una barra per seduta. -->
      {#if days.length}
        <section class="part">
          <div class="spread">
            <h3 class="t-label muted">Le tue misure</h3>
            {#if m?.best != null}<span class="small muted">Record <b class="rec">{valueText(ex, m.best)}</b></span>{/if}
          </div>
          <MeasureChart exercise={ex} rows={days} {goal} />
        </section>
      {/if}

      <div class="more">
        <Collapse title="Come si misura" open={false} key="ex-misura">
          <p class="small muted">{measureText(ex)} Le medaglie non si perdono e non bloccano niente.</p>
        </Collapse>
        {#if notes.length}
          <Collapse title="Note sui colpi" count={notes.length} open={false} key="ex-note">
            <div class="card flush list">
              {#each notes as n (n.id)}<NoteRow note={n} showStroke onclick={() => ui.open('stroke', { id: n.stroke })} />{/each}
            </div>
          </Collapse>
        {/if}
        {#if ex.errors?.length}
          <Collapse title="Errori comuni" count={ex.errors.length} open={false} key="ex-errori">
            <div class="chips">{#each ex.errors as e (e)}<span class="tag line">{app.errorName(e)}</span>{/each}</div>
          </Collapse>
        {/if}
        {#if ex.strokes?.length}
          <Collapse title="Colpi che allena" count={ex.strokes.filter((s) => app.stroke(s)).length} open={false} key="ex-colpi">
            <div class="card flush list">
              {#each ex.strokes.filter((s) => app.stroke(s)) as s (s)}
                <button class="item" onclick={() => ui.open('stroke', { id: s })}><span class="grow">{app.strokeName(s)}</span><ChevronRight size={18} /></button>
              {/each}
            </div>
          </Collapse>
        {/if}
      </div>

      {#if ex.source}<p class="small faint">Fonte · {ex.source}</p>{/if}

      {#if (ex.track && app.catalog.track(ex.track)?.custom) || imported}
        <div class="card flush list">
          {#if ex.track && app.catalog.track(ex.track)?.custom}
            <button class="item" onclick={() => ui.open('trackedit', { id: ex.track })}><Pencil size={18} /><span class="grow">Modifica il percorso</span></button>
          {/if}
          {#if imported}
            <button class="item danger" onclick={remove}><Trash size={18} /><span class="grow">Elimina l’esercizio</span></button>
          {/if}
        </div>
      {/if}
    </div>

    {#snippet footer()}
      {#if ex.measure && tiers.length}
        <button class="btn accent wide" onclick={test}><Gauge size={18} /> Misurati ora</button>
      {:else}
        <button class="btn ghost wide" onclick={() => ui.close()}>Chiudi</button>
      {/if}
    {/snippet}
  </Sheet>
{/if}

<style>
  .ex {
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
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .fam-name {
    font-weight: 700;
    color: var(--f-ink);
  }
  .modes {
    font-size: 13px;
    color: var(--ink-3);
  }
  .param {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 14px;
    color: var(--ink-2);
  }
  .param :global(svg) {
    color: var(--ink-3);
  }
  .param b {
    color: var(--ink);
  }
  .lead {
    margin: 0;
  }
  .quality {
    padding: 12px 14px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--f) 9%, var(--card));
    border-left: 4px solid var(--f);
  }
  .quality .t-label {
    color: var(--f-ink);
  }
  .quality p {
    margin: 4px 0 0;
  }
  .part {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 6px;
  }
  .part h3 {
    margin: 0;
  }
  .medals {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    padding: 14px 6px 12px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
  }
  .md {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    text-align: center;
  }
  .md strong {
    margin-top: 6px;
    font-size: 13px;
    font-weight: 700;
  }
  .md-goal {
    font-size: 14px;
    font-weight: 650;
    color: var(--ink-2);
  }
  .md-when {
    min-height: 16px;
    font-size: 12px;
    color: var(--ink-3);
  }
  .md.next .md-when {
    color: var(--accent-ink);
    font-weight: 650;
  }
  .stale {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--down);
  }
  .rec {
    color: var(--ink);
  }
  .more {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
