<script>
  // La tappa in corso, quella che in Oggi sta in alto («Questo mese · Dritto»): a che punto sei,
  // le tappe del piano, i percorsi con l'esercizio di adesso, i servizi e la partitella. È il
  // dettaglio: in Oggi restano il nome e una riga.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Check from '@lucide/svelte/icons/check';
  import Coffee from '@lucide/svelte/icons/coffee';
  import CalendarRange from '@lucide/svelte/icons/calendar-range';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { stageInfo, stageLength, stagePeriod } from '../engine/plan.js';
  import { currentInSequence } from '../engine/player.js';
  import { SCHEMES } from '../data/program.js';
  import { fmtLong, fmtShort } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import MedalRing from '../ui/MedalRing.svelte';
  import StageProgress from '../ui/StageProgress.svelte';

  const info = $derived(stageInfo(app.plan, app.today, app.catalog));
  const now = $derived(info.stages[info.current] ?? null);
  const p = $derived(info.progress);
  // Il tema da mostrare: quello della tappa in corso o, in pausa, quello di oggi del piano.
  const block = $derived(now?.block ?? app.week?.focusBlock ?? null);
  const next = $derived(info.stages.find((st) => st.i > info.current && st.b !== 'P') ?? null);
  const period = $derived(stagePeriod(now, { isToday: now?.start === app.today }));
  const pauseNext = $derived(info.stages[info.current + 1]?.b === 'P');

  const tracks = $derived(
    [...(block?.tracks ?? []).map((id) => ({ id, maint: false })), ...(block?.maint ? [{ id: block.maint, maint: true }] : [])]
      .map(({ id, maint }) => {
        const track = app.catalog.track(id);
        if (!track) return null;
        const seq = app.catalog.sequence(id);
        const cur = currentInSequence(id, app.catalog, app.medals);
        const ex = cur ? app.catalog.exercise(cur) : null;
        return { id, maint, track, ex, done: seq.filter((x) => app.medals[x]?.A).length, total: seq.length };
      })
      .filter(Boolean)
  );
  const schemes = $derived((block?.schemes ?? []).map((id) => SCHEMES[id]).filter(Boolean));

  const name = (st) => (st.b === 'P' ? 'Pausa' : (st.block?.theme ?? 'Mese cancellato'));
  const when = (st) => (!st.start ? '' : st.u === 's' && st.n === 1 ? fmtShort(st.start) : `dal ${fmtShort(st.start)}`);
</script>

<Sheet title={now?.b === 'P' ? 'Pausa' : (block?.theme ?? 'Il piano')} onclose={() => ui.close()} tall sans>
  {#if app.plan && now}
    <div class="month">
      <!-- Dove sei nella tappa: pallini per gli allenamenti, tacche numerate per le settimane. -->
      <p class="where">
        {#if now.b === 'P'}
          Settimana di pausa.
        {:else if p.unit === 's' && p.of === 1}
          {now.start === app.today ? 'Solo per l’allenamento di oggi.' : `Un allenamento solo, ${fmtLong(now.start)}.`}
        {:else if p.unit === 's'}
          Sei all’<b>allenamento {p.pos}</b> di {p.of}.
        {:else if p.pos === 0}
          Comincia {fmtLong(p.startsOn)}. Questa settimana fai un allenamento in anticipo.
        {:else}
          Sei alla <b>settimana {p.pos}</b> di {p.of}.
        {/if}
      </p>
      {#if now.b !== 'P'}<StageProgress unit={p.unit} pos={p.pos} of={p.of} />{/if}
      {#if next}
        <p class="small muted">{pauseNext ? 'Poi una pausa, e dopo' : 'Poi'} <strong>{name(next)}</strong>, {next.u === 's' && next.n === 1 ? '' : 'da '}{fmtLong(next.start)}.</p>
      {/if}

      <!-- Il piano: tutte le tappe, una riga ciascuna. -->
      <section class="part">
        <h2 class="t-caps muted">Il piano</h2>
        <ol class="card plan">
          {#each info.stages as st (st.i)}
            <li class={st.state}>
              <span class="mark">
                {#if st.state === 'past'}<Check size={14} strokeWidth={3} />{:else if st.b === 'P'}<Coffee size={14} />{/if}
              </span>
              <span class="grow">
                <strong>{name(st)}</strong>
                <span class="small muted"> · {stageLength(st)}</span>
              </span>
              <span class="small muted when">{when(st)}</span>
            </li>
          {/each}
        </ol>
      </section>

      {#if tracks.length}
      <section class="part">
        <h2 class="t-caps muted">I percorsi {period.of}</h2>
        <div class="tracks">
          {#each tracks as t (t.id + t.maint)}
            <button class="trk raise neutral" onclick={() => ui.open('track', { id: t.id })}>
              {#if t.ex}<MedalRing exercise={t.ex} medals={app.medals[t.ex.id]} size={52} />{/if}
              <span class="grow">
                {#if t.maint}<span class="t-caps maint">Da mantenere</span>{/if}
                <strong class="t-name">{t.track.short}</strong>
                {#if t.ex}<span class="small block">Adesso: {t.ex.name}</span>{/if}
                <span class="small muted block">{t.done} {t.done === 1 ? 'esercizio' : 'esercizi'} su {t.total} con l’argento</span>
              </span>
              <span class="chev"><ChevronRight size={18} /></span>
            </button>
          {/each}
        </div>
      </section>
      {/if}

      {#if block?.serve}
        <section class="part">
          <h2 class="t-caps muted">Servizi e ricezione</h2>
          <div class="card text">
            <p><span class="who">Chi serve</span>{block.serve.server}</p>
            <p><span class="who">Chi riceve</span>{block.serve.receiver}</p>
          </div>
        </section>
      {/if}

      {#if schemes.length}
        <section class="part">
          <h2 class="t-caps muted">Schemi della partitella</h2>
          <div class="card text">
            {#each schemes as s (s.id)}
              <p><span class="who">{s.name}</span>{s.text}</p>
            {/each}
          </div>
        </section>
      {/if}
    </div>
  {:else}
    <p class="muted">Non hai ancora un piano.</p>
  {/if}

  {#snippet footer()}
    <button class="btn ghost wide" onclick={() => ui.open('plan')}><CalendarRange size={18} /> Modifica il piano</button>
  {/snippet}
</Sheet>

<style>
  .month {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-bottom: 8px;
  }
  .where {
    margin: 0;
    font-size: 16px;
    color: var(--ink-2);
  }
  .where b {
    color: var(--ink);
  }
  .plan {
    list-style: none;
    margin: 0;
    padding: 6px 0;
  }
  .plan li {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 44px;
    padding: 6px 16px;
  }
  .plan li.past {
    opacity: 0.55;
  }
  .plan li.now {
    background: color-mix(in srgb, var(--accent) 12%, var(--card));
  }
  .plan strong {
    font-weight: 650;
  }
  .mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px var(--line-strong);
    color: var(--ink-2);
  }
  .past .mark {
    box-shadow: none;
    background: var(--sunk);
  }
  .now .mark {
    box-shadow: none;
    background: var(--accent);
    color: var(--accent-on);
  }
  .when {
    flex: none;
  }
  .part {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 14px;
  }
  .part h2 {
    margin: 0;
  }
  .tracks {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .trk {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 14px 14px 12px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
    text-align: left;
    color: var(--ink);
  }
  .chev {
    display: grid;
    color: var(--ink-3);
    flex: none;
  }
  .trk .t-name {
    display: block;
    margin-bottom: 2px;
  }
  .maint {
    display: block;
    color: var(--accent-ink);
    margin-bottom: 2px;
  }
  .block {
    display: block;
    margin-top: 2px;
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
  }
  .text p {
    margin: 0;
    line-height: 1.45;
  }
  .who {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
  }
</style>
