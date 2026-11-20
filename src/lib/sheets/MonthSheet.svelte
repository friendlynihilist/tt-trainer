<script>
  // Il mese in corso, quello che in Oggi sta in alto («Dritto»): a che punto sei del ciclo,
  // i percorsi del mese con l'esercizio di adesso, i servizi e la partitella. È il dettaglio:
  // in Oggi resta solo il nome del tema.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import CalendarRange from '@lucide/svelte/icons/calendar-range';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { allWeeks, isPause } from '../engine/plan.js';
  import { currentInSequence } from '../engine/player.js';
  import { SCHEMES } from '../data/program.js';
  import { fmtLong } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import MedalRing from '../ui/MedalRing.svelte';

  const week = $derived(app.week);
  const block = $derived(week?.focusBlock ?? null);
  const weeks = $derived(allWeeks(app.plan, app.catalog));

  // Le settimane del ciclo raggruppate per mese, nell'ordine del piano.
  const groups = $derived.by(() => {
    const out = [];
    for (const w of weeks) {
      const last = out[out.length - 1];
      if (last && last.kind === w.kind) last.weeks.push(w);
      else out.push({ kind: w.kind, name: isPause(w.kind) ? '' : (w.block?.theme ?? ''), weeks: [w] });
    }
    return out;
  });

  // In che settimana del mese sei, e quale mese viene dopo.
  const inBlock = $derived.by(() => {
    if (!week || isPause(week.kind)) return null;
    const mine = weeks.filter((w) => w.kind === week.kind);
    return { n: mine.findIndex((w) => w.idx === week.idx) + 1, of: mine.length };
  });
  const next = $derived(weeks.find((w) => w.idx > (week?.idx ?? -1) && !isPause(w.kind) && w.kind !== week?.kind) ?? null);

  const tracks = $derived(
    [...(block?.tracks ?? []).map((id) => ({ id, maint: false })), ...(block?.maint ? [{ id: block.maint, maint: true }] : [])]
      .map(({ id, maint }) => {
        const track = app.catalog.track(id);
        if (!track) return null;
        const seq = app.catalog.sequence(id);
        const now = currentInSequence(id, app.catalog, app.medals);
        const ex = now ? app.catalog.exercise(now) : null;
        return { id, maint, track, ex, done: seq.filter((x) => app.medals[x]?.A).length, total: seq.length };
      })
      .filter(Boolean)
  );
  const schemes = $derived((block?.schemes ?? []).map((id) => SCHEMES[id]).filter(Boolean));
</script>

<Sheet title={block?.theme ?? 'Il mese'} onclose={() => ui.close()} tall sans>
  {#if block}
    <div class="month">
      <!-- Dove sei: le settimane del ciclo come tacche numerate, raggruppate per mese. La tacca di
           questa settimana è piena; quelle passate tenui. -->
      <p class="where">
        {#if inBlock}Sei alla <b>settimana {inBlock.n}</b> di {inBlock.of} del mese.{:else}Questa è una settimana di pausa.{/if}
      </p>
      <div class="cycle" role="img" aria-label={inBlock ? `Settimana ${inBlock.n} di ${inBlock.of}. Il ciclo ha ${groups.filter((g) => g.name).length} mesi.` : 'Settimana di pausa'}>
        {#each groups as g, gi (gi)}
          <div class="grp" style:flex-grow={g.weeks.length} class:pause={isPause(g.kind)} class:cur={g.kind === week?.kind}>
            <small>{g.name || 'Pausa'}</small>
            <div class="ticks">
              {#each g.weeks as w, wi (w.idx)}
                <i class:past={w.idx < (week?.idx ?? 0)} class:now={w.idx === week?.idx}>{isPause(g.kind) ? '' : wi + 1}</i>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      {#if next}
        <p class="small muted">Poi <strong>{next.block?.theme}</strong>, da {fmtLong(next.monday)}.</p>
      {/if}

      <section class="part">
        <h2 class="t-caps muted">I percorsi del mese</h2>
        <div class="tracks">
          {#each tracks as t (t.id + t.maint)}
            <button class="trk raise neutral" onclick={() => ui.open('track', { id: t.id })}>
              {#if t.ex}<MedalRing exercise={t.ex} medals={app.medals[t.ex.id]} size={52} />{/if}
              <span class="grow">
                {#if t.maint}<span class="t-caps tag">Da mantenere</span>{/if}
                <strong class="t-name">{t.track.short}</strong>
                {#if t.ex}<span class="small block">Adesso: {t.ex.name}</span>{/if}
                <span class="small muted block">{t.done} esercizi su {t.total} con l’argento</span>
              </span>
              <span class="chev"><ChevronRight size={18} /></span>
            </button>
          {/each}
        </div>
      </section>

      {#if block.serve}
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
    <button class="btn ghost wide" onclick={() => ui.open('plan')}><CalendarRange size={18} /> Modifica mesi e giorni</button>
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
  .cycle {
    display: flex;
    gap: 10px;
  }
  .grp {
    flex-basis: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .grp.pause {
    flex-grow: 0.5 !important;
  }
  .grp small {
    font-size: 12px;
    font-weight: 650;
    color: var(--ink-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .grp.cur small {
    color: var(--ink);
    font-weight: 750;
  }
  .ticks {
    display: flex;
    gap: 3px;
  }
  .ticks i {
    flex: 1;
    display: grid;
    place-items: center;
    height: 26px;
    border-radius: 8px;
    background: var(--sunk);
    font-family: var(--mono);
    font-size: 12px;
    font-style: normal;
    font-weight: 600;
    color: var(--ink-3);
  }
  .ticks i.past {
    background: color-mix(in srgb, var(--accent) 30%, var(--sunk));
    color: var(--accent-ink);
  }
  .ticks i.now {
    background: var(--accent);
    color: #fff;
    font-weight: 800;
    box-shadow: 0 0 0 2px var(--paper), 0 0 0 4px var(--ink);
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
  .tag {
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
