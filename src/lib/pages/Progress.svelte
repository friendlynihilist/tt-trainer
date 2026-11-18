<script>
  // Progressi: il tuo livello e la strada verso il prossimo, le medaglie, cosa correggere, il ritmo.
  // Le medaglie sono solo un indicatore: non bloccano niente.
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { PLAYER_LEVEL, TIERS, TIER } from '../data/library.js';
  import { FAMILIES } from '../data/taxonomy.js';
  import { totals, weaknesses, weeklyActivity, weekStreak, legacyTests } from '../engine/stats.js';
  import { levelProgress } from '../engine/player.js';
  import { medalCount, nextGoal, goalText, valueText } from '../engine/medals.js';
  import { fmtDay, fmtShort } from '../util/dates.js';
  import PageHead from '../ui/PageHead.svelte';
  import TestBars from '../ui/TestBars.svelte';
  import Avatar from '../ui/Avatar.svelte';
  import Medal from '../ui/Medal.svelte';
  import MedalRow from '../ui/MedalRow.svelte';

  const sum = $derived(totals(app.events, app.attempts));
  const weak = $derived(weaknesses(app.events));
  const weeks = $derived(weeklyActivity(app.events, 12));
  const streak = $derived(weekStreak(app.events));
  const maxWeek = $derived(Math.max(2, ...weeks.map((w) => w.count)));
  const topCount = $derived(weak.strokes[0]?.count ?? 1);

  const progress = $derived(levelProgress({ level: app.player.level, medals: app.medals, attempts: app.attempts, catalog: app.catalog }));
  const count = $derived(medalCount(app.medals));
  const medalsTotal = $derived(TIERS.reduce((n, t) => n + count[t], 0));
  const byFamily = $derived(
    FAMILIES.map((f) => {
      const ids = app.catalog.activeExerciseIds.filter((id) => app.catalog.exercise(id).family === f.id && Object.keys(app.catalog.exercise(id).goals ?? {}).length);
      return { ...f, total: ids.length, won: ids.filter((id) => app.medals[id]?.B).length, gold: ids.filter((id) => app.medals[id]?.O).length };
    }).filter((f) => f.total)
  );
  const recent = $derived(
    Object.entries(app.medals)
      .filter(([id]) => app.catalog.exercise(id))
      .sort(([, a], [, b]) => (a.lastDate < b.lastDate ? 1 : -1))
      .slice(0, 6)
  );
  const stale = $derived(Object.entries(app.medals).filter(([id, m]) => m.stale && app.catalog.exercise(id)));
  const old = $derived(legacyTests(app.events, app.catalog));

  const pct = (have, need) => Math.min(100, need ? (have / need) * 100 : 100);
</script>

<div class="page enter">
  <PageHead eyebrow="Progressi" title={sum.sessions ? `${sum.sessions} attività` : 'Si parte da qui'} />

  <section class="stats">
    <div><b class="mono">{Math.round(sum.minutes / 60)}</b><span class="small muted">ore</span></div>
    <div><b class="mono">{sum.attempts}</b><span class="small muted">misure</span></div>
    <div><b class="mono">{medalsTotal}</b><span class="small muted">medaglie</span></div>
    <div><b class="mono">{streak}</b><span class="small muted">settimane di fila</span></div>
  </section>

  <section class="section">
    <h2 class="heading">Il tuo livello</h2>
    <div class="card stack g-16">
      <button class="spread level" onclick={() => ui.open('level')}>
        <span>
          <strong class="title">{PLAYER_LEVEL[app.player.level].name}</strong>
          <span class="small muted block">{app.player.chosen ? 'Lo cambi quando vuoi' : 'Scegli il tuo livello'}</span>
        </span>
        <ChevronRight size={18} />
      </button>
      {#if progress.next}
        <p class="small muted">Verso {PLAYER_LEVEL[progress.next].name.toLowerCase()}: quando ci sono tutte e tre le condizioni, te lo propone l’app.</p>
        <div class="cond" class:ok={progress.coverage.ok}>
          <div class="spread small"><span>Argento negli esercizi chiave</span><span class="mono">{progress.coverage.have}/{progress.coverage.need}</span></div>
          <span class="meter"><i style:width="{pct(progress.coverage.have, progress.coverage.need)}%"></i></span>
          {#if progress.coverage.missing.length}
            <span class="small muted">Manca un argento in: {progress.coverage.missing.map((f) => FAMILIES.find((x) => x.id === f)?.name.toLowerCase()).join(', ')}</span>
          {/if}
        </div>
        <div class="cond" class:ok={progress.solidity.ok}>
          <div class="spread small"><span>Oro negli esercizi chiave</span><span class="mono">{progress.solidity.have}/{progress.solidity.need}</span></div>
          <span class="meter"><i style:width="{pct(progress.solidity.have, progress.solidity.need)}%"></i></span>
        </div>
        <div class="cond" class:ok={progress.consistency.ok}>
          <div class="spread small"><span>Sedute con un argento, in almeno 14 giorni</span><span class="mono">{progress.consistency.sessions}/{progress.consistency.need}</span></div>
          <span class="meter"><i style:width="{pct(progress.consistency.sessions, progress.consistency.need) * (progress.consistency.span >= progress.consistency.needSpan ? 1 : 0.9)}%"></i></span>
          {#if progress.consistency.sessions > 1}<span class="small muted">Dalla prima all’ultima: {progress.consistency.span} giorni</span>{/if}
        </div>
        <div class="keys">
          {#each progress.slots as slot (slot.ids.join())}
            {@const ex = app.catalog.exercise(slot.ids.find((id) => app.medals[id]?.A) ?? slot.ids[0])}
            <button class="key" onclick={() => ui.open('exercise', { id: ex.id })}>
              <span class="grow clamp">{slot.ids.length > 1 ? slot.ids.map((id) => app.catalog.exercise(id).name).join(' o ') : ex.name}</span>
              <MedalRow exercise={ex} medals={app.medals[ex.id]} size={8} />
            </button>
          {/each}
        </div>
      {:else}
        <p class="small muted">È il livello più alto. Le medaglie continuano a misurare i tuoi record.</p>
      {/if}
    </div>
  </section>

  <section class="section">
    <h2 class="heading">Medaglie</h2>
    <div class="card stack g-16">
      <div class="tiers">
        {#each TIERS as t (t)}
          <span class="tier"><Medal tier={t} on={count[t] > 0} size={18} /><b class="mono">{count[t]}</b><span class="small muted">{TIER[t].name.toLowerCase()}</span></span>
        {/each}
      </div>
      <div class="stack g-10">
        {#each byFamily as f (f.id)}
          <div class="fam" data-color={f.color}>
            <div class="spread small"><span>{f.name}</span><span class="mono muted">{f.won}/{f.total}</span></div>
            <span class="meter c"><i style:width="{(f.won / f.total) * 100}%"></i></span>
          </div>
        {/each}
      </div>
      <p class="small faint">Esercizi con almeno il bronzo, per famiglia.</p>
    </div>
  </section>

  {#if recent.length}
    <section class="section">
      <h2 class="heading">Esercizi recenti</h2>
      <div class="card flush list">
        {#each recent as [id, m] (id)}
          {@const ex = app.catalog.exercise(id)}
          {@const goal = nextGoal(ex, m)}
          <button class="item" onclick={() => ui.open('exercise', { id })}>
            <span class="grow">
              <strong>{ex.name}</strong>
              <span class="small muted block">Record {valueText(ex, m.best)}{goal ? ` · prossimo: ${goalText(ex, goal).toLowerCase()}` : ''}</span>
            </span>
            <MedalRow exercise={ex} medals={m} />
          </button>
        {/each}
      </div>
    </section>
  {/if}

  {#if stale.length}
    <section class="section">
      <h2 class="heading">Da ripassare</h2>
      <div class="card flush list">
        {#each stale as [id, m] (id)}
          <button class="item" onclick={() => ui.open('exercise', { id })}>
            <span class="grow"><strong>{app.catalog.exercise(id).name}</strong><span class="small muted block">Ultima misura {fmtShort(m.lastDate)}</span></span>
            <MedalRow exercise={app.catalog.exercise(id)} medals={m} />
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <section class="section">
    <h2 class="heading">Da correggere</h2>
    {#if weak.strokes.length}
      <div class="card stack g-16">
        {#each weak.strokes.slice(0, 6) as s (s.id)}
          <button class="weak" onclick={() => ui.open('stroke', { id: s.id })}>
            <div class="spread">
              <span>{app.strokeName(s.id)}</span>
              <span class="mono small muted">{s.count}</span>
            </div>
            <span class="meter"><i style:width="{(s.count / topCount) * 100}%"></i></span>
            {#if s.errors.length}
              <span class="small muted">{s.errors.slice(0, 3).map((e) => `${app.errorName(e.id)}${e.count > 1 ? ` ×${e.count}` : ''}`).join(' · ')}</span>
            {/if}
          </button>
        {/each}
      </div>
    {:else}
      <p class="muted">Qui compaiono i colpi che segni più spesso da correggere, con l'errore ricorrente.</p>
    {/if}
  </section>

  <section class="section">
    <h2 class="heading">Ritmo · ultime 12 settimane</h2>
    <div class="card">
      <div class="rhythm" role="img" aria-label="Attività per settimana: {weeks.map((w) => w.count).join(', ')}">
        {#each weeks as w, i (w.monday)}
          <span class="col" title="{fmtDay(w.monday)} · {w.count}">
            <i class:zero={!w.count} style:height="{w.count ? (w.count / maxWeek) * 100 : 4}%" style:animation-delay="{i * 30}ms"></i>
          </span>
        {/each}
      </div>
      <div class="spread small faint axis"><span>{fmtDay(weeks[0].monday)}</span><span>questa settimana</span></div>
    </div>
  </section>

  {#if app.cloud}
    <section class="section">
      <h2 class="heading">Il gruppo</h2>
      {#if app.mates.length}
        <div class="card flush list">
          {#each app.mates as m (m.id)}
            <div class="mate row g-12">
              <Avatar name={m.name} photo={m.photo} size={32} />
              <strong class="grow">{m.name}</strong>
            </div>
          {/each}
        </div>
      {:else}
        <p class="muted">Quando un compagno entra nel gruppo, lo vedi qui.</p>
      {/if}
      <p class="small faint after">Il gruppo vede solo i nomi. Medaglie, livello e diario restano personali.</p>
    </section>
  {/if}

  {#if old.length}
    <section class="section">
      <details class="old">
        <summary class="heading">Percorsi della versione 0.2</summary>
        <p class="small muted">I test di prima, così come li avevi fatti. Valgono anche per le medaglie degli esercizi corrispondenti.</p>
        <div class="tracks">
          {#each old as o (o.track)}
            <button class="card track" onclick={() => ui.open('track', { id: o.track })}>
              <strong>{app.catalog.track(o.track).short}</strong>
              <TestBars history={o.tests} up={8} down={4} height={44} max={10} />
            </button>
          {/each}
        </div>
      </details>
    </section>
  {/if}
</div>

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 24px;
  }
  .stats div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .stats b {
    font-size: 28px;
    font-weight: 500;
    line-height: 1.1;
  }
  .tracks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  @media (max-width: 420px) {
    .tracks {
      grid-template-columns: 1fr;
    }
  }
  .track {
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
    padding: 16px;
    transition: transform 0.2s var(--ease), border-color 0.2s var(--ease);
  }
  .track:active {
    transform: scale(0.98);
  }
  @media (hover: hover) {
    .track:hover {
      border-color: var(--line-strong);
    }
  }
  .track :global(.bars) {
    margin-top: 10px;
  }
  strong {
    font-weight: 580;
  }
  .weak {
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
  }
  .meter {
    height: 6px;
    border-radius: 3px;
    background: var(--sunk);
    overflow: hidden;
  }
  .meter i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--accent);
    transform-origin: left;
    animation: grow 0.7s var(--ease-out) both;
  }
  @keyframes grow {
    from {
      transform: scaleX(0);
    }
  }
  .rhythm {
    display: flex;
    align-items: flex-end;
    gap: 5px;
    height: 72px;
  }
  .col {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }
  .col i {
    width: 100%;
    border-radius: 4px;
    background: var(--ink);
    transform-origin: bottom;
    animation: up 0.6s var(--ease-out) both;
  }
  .col i.zero {
    background: var(--line-strong);
  }
  .col:last-child i:not(.zero) {
    background: var(--accent);
  }
  @keyframes up {
    from {
      transform: scaleY(0);
    }
  }
  .axis {
    margin-top: 8px;
    font-size: 11px;
  }
  .mate {
    padding: 12px 18px;
  }
  .after {
    margin-top: 10px;
  }
  .level {
    width: 100%;
    text-align: left;
  }
  .level :global(svg) {
    color: var(--ink-3);
  }
  .cond {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cond.ok .meter i {
    background: var(--up);
  }
  .keys {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  @media (max-width: 420px) {
    .keys {
      grid-template-columns: 1fr;
    }
  }
  .key {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--r-s);
    background: var(--sunk);
    font-size: 13px;
    text-align: left;
    min-width: 0;
  }
  .clamp {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tiers {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .tier {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .tier b {
    font-size: 22px;
    font-weight: 500;
    line-height: 1.1;
  }
  .g-10 {
    gap: 10px;
  }
  .fam {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .meter.c i {
    background: var(--c);
  }
  .item {
    padding: 12px 18px;
  }
  .old summary {
    cursor: pointer;
  }
  .old > p {
    margin: 8px 0 12px;
  }
  .block {
    display: block;
  }
</style>
