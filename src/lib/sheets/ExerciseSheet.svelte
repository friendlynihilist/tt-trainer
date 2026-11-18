<script>
  // Un esercizio della libreria (o tuo): cosa si fa, come deve venire, come si misura, le medaglie
  // e le ultime misure. Si può sempre mettere in un test, a qualsiasi livello.
  import Target from '@lucide/svelte/icons/target';
  import Gauge from '@lucide/svelte/icons/gauge';
  import Trash from '@lucide/svelte/icons/trash';
  import Pencil from '@lucide/svelte/icons/pencil';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { startItem } from '../store/actions.js';
  import { PLAYER_LEVEL, MODE, TIERS, TIER, TRIES_PER_DAY } from '../data/library.js';
  import { FAMILY } from '../data/taxonomy.js';
  import { valueText, dayValues, nextGoal } from '../engine/medals.js';
  import { fmtDay, fmtShort } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import Medal from '../ui/Medal.svelte';

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
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);
  });
  const family = $derived(ex?.family ? FAMILY[ex.family] : null);
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
  <Sheet title={ex.name} onclose={() => ui.close()} tall>
    <div class="stack g-24">
      <div class="stack g-12">
        <div class="chips">
          {#if family}<span class="tag fam" data-color={family.color}><i class="pip"></i>{family.name}</span>{/if}
          {#if ex.level}<span class="tag line">{PLAYER_LEVEL[ex.level].name}{ex.level === app.player.level ? ' · il tuo livello' : ''}</span>{/if}
          {#each ex.modes ?? [] as mo (mo)}<span class="tag line">{MODE[mo]?.name}</span>{/each}
          {#if m?.stale}<span class="tag stay">Da ripassare</span>{/if}
        </div>
        {#if ex.text}<p class="lead">{ex.text}</p>{/if}
        {#if ex.quality}<p class="quality"><Target size={16} /> <span>{ex.quality}</span></p>{/if}
        {#if ex.test}<p class="small muted">Test · {ex.test}</p>{/if}
      </div>

      {#if tiers.length}
        <section class="stack g-8">
          <h3 class="heading">Medaglie</h3>
          <div class="card flush list">
            {#each tiers as t (t)}
              {@const got = m?.[t]}
              {@const half = t === 'O' && !got && m?.half}
              <div class="tier" class:got data-tier={t}>
                <Medal tier={t} on={Boolean(got)} {half} size={22} />
                <span class="grow">
                  <strong>{TIER[t].name}</strong>
                  <span class="small muted block">{valueText(ex, ex.goals[t], t)}{t === 'O' ? ', in due sedute' : ''}</span>
                </span>
                <span class="small {got ? '' : 'muted'}">{got ? fmtShort(got) : half ? `metà, ${fmtShort(m.half)}` : goal?.tier === t ? 'prossimo' : ''}</span>
              </div>
            {/each}
          </div>
          <p class="small muted">{measureText(ex)} Le medaglie non si perdono e non bloccano niente.</p>
        </section>
      {:else}
        <p class="small muted">{measureText(ex)}</p>
      {/if}

      {#if days.length}
        <section class="stack g-8">
          <div class="spread">
            <h3 class="heading">Misure</h3>
            {#if m?.best != null}<span class="small muted">Record: {valueText(ex, m.best)}</span>{/if}
          </div>
          <div class="card flush list">
            {#each days as d (d.date + (d.tier ?? ''))}
              <button class="item" onclick={() => d.eventId && ui.open('event', { id: d.eventId })}>
                <span class="small muted when">{fmtDay(d.date)}</span>
                <span class="grow">{valueText(ex, d.value, d.tier)}{d.tier ? ` · ${TIER[d.tier].name.toLowerCase()}` : ''}</span>
              </button>
            {/each}
          </div>
        </section>
      {/if}

      {#if ex.errors?.length}
        <section class="stack g-8">
          <h3 class="heading">Errori comuni</h3>
          <div class="chips">{#each ex.errors as e (e)}<span class="tag line">{app.errorName(e)}</span>{/each}</div>
        </section>
      {/if}

      {#if ex.strokes?.length}
        <section class="stack g-8">
          <h3 class="heading">Colpi che allena</h3>
          <div class="chips">
            {#each ex.strokes.filter((s) => app.stroke(s)) as s (s)}
              <button class="chip mini" onclick={() => ui.open('stroke', { id: s })}>{app.strokeName(s)}</button>
            {/each}
          </div>
        </section>
      {/if}

      {#if ex.source}<p class="small faint">Fonte · {ex.source}</p>{/if}

      <div class="stack g-8">
        {#if ex.measure && tiers.length}
          <button class="btn ghost" onclick={test}><Gauge size={16} /> Misurati ora</button>
        {/if}
        {#if ex.track && app.catalog.track(ex.track)?.custom}
          <button class="btn plain" onclick={() => ui.open('trackedit', { id: ex.track })}><Pencil size={16} /> Modifica il percorso</button>
        {/if}
        {#if imported}
          <button class="btn plain danger" onclick={remove}><Trash size={16} /> Elimina</button>
        {/if}
      </div>
    </div>
  </Sheet>
{/if}

<style>
  strong {
    font-weight: 580;
  }
  .block {
    display: block;
  }
  .fam {
    gap: 6px;
  }
  .quality {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .quality :global(svg) {
    flex: none;
    margin-top: 3px;
    color: var(--accent);
  }
  .tier {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
  }
  .tier.got {
    background: color-mix(in srgb, var(--m) 10%, var(--card));
  }
  .when {
    width: 56px;
  }
  .item {
    padding: 12px 16px;
    font-size: 14px;
  }
  .chip.mini {
    min-height: 30px;
    padding: 4px 12px;
    font-size: 13px;
  }
</style>
