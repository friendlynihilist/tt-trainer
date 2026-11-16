<script>
  // Progressi: livelli dei percorsi, cosa correggere, ritmo, e i compagni.
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { BLOCKS, CYCLE_BLOCKS, TRACKS, TRACK_IDS, levelOf } from '../data/program.js';
  import { testsToClimb } from '../engine/levels.js';
  import { totals, weaknesses, weeklyActivity, weekStreak } from '../engine/stats.js';
  import { fmtDay, fmtRelative } from '../util/dates.js';
  import PageHead from '../ui/PageHead.svelte';
  import Dots from '../ui/Dots.svelte';
  import TestBars from '../ui/TestBars.svelte';
  import Avatar from '../ui/Avatar.svelte';

  const sum = $derived(totals(app.events));
  const weak = $derived(weaknesses(app.events));
  const weeks = $derived(weeklyActivity(app.events, 12));
  const streak = $derived(weekStreak(app.events));
  const maxWeek = $derived(Math.max(2, ...weeks.map((w) => w.count)));
  const topCount = $derived(weak.strokes[0]?.count ?? 1);

  function hint(t) {
    if (!t.started) return 'Da iniziare';
    if (t.completed) return 'Completato';
    return testsToClimb(t) === 1 ? `Un test da ${app.rules.up} e sali` : levelOf(t.id, t.level).name;
  }
</script>

<div class="page enter">
  <PageHead eyebrow="Progressi" title={sum.sessions ? `${sum.sessions} attività` : 'Si parte da qui'} />

  <section class="stats">
    <div><b class="mono">{Math.round(sum.minutes / 60)}</b><span class="small muted">ore</span></div>
    <div><b class="mono">{sum.tests}</b><span class="small muted">test</span></div>
    <div><b class="mono">{sum.average == null ? '–' : sum.average.toFixed(1).replace('.', ',')}</b><span class="small muted">media</span></div>
    <div><b class="mono">{streak}</b><span class="small muted">settimane di fila</span></div>
  </section>

  {#each CYCLE_BLOCKS as b (b)}
    <section class="section">
      <h2 class="heading">{BLOCKS[b].label} · {BLOCKS[b].theme}</h2>
      <div class="tracks">
        {#each BLOCKS[b].tracks as id (id)}
          {@const t = app.tracks[id]}
          <button class="card track" onclick={() => ui.open('track', { id })}>
            <div class="spread">
              <strong>{TRACKS[id].short}</strong>
              <Dots level={t.level} started={t.started} completed={t.completed} />
            </div>
            <p class="small muted">{hint(t)}</p>
            {#if t.history.some((h) => h.score != null)}
              <TestBars history={t.history} up={app.rules.up} down={app.rules.down} height={44} max={10} />
            {:else}
              <div class="empty-bars"></div>
            {/if}
          </button>
        {/each}
      </div>
    </section>
  {/each}

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
            <div class="mate">
              <div class="row g-12">
                <Avatar name={m.name} photo={m.photo} size={36} />
                <span class="grow">
                  <strong>{m.name}</strong>
                  <span class="small muted block">
                    {m.week ? `Settimana ${m.week}` : 'Ciclo non iniziato'}{m.lastDate ? ` · ultima sessione ${fmtRelative(m.lastDate, app.today)}` : ''}
                  </span>
                </span>
              </div>
              <div class="levels">
                {#each TRACK_IDS.filter((id) => m.levels?.[id]) as id (id)}
                  <span class="lv"><span class="small muted">{TRACKS[id].short}</span><Dots level={m.levels[id]} size={6} /></span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="muted">Quando un compagno entra e condivide i livelli, lo vedi qui.</p>
      {/if}
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
  .empty-bars {
    height: 44px;
    margin-top: 10px;
    margin-bottom: 16px;
    border-bottom: 1px dashed var(--line-strong);
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
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 18px;
  }
  .levels {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
  }
  .lv {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .block {
    display: block;
  }
</style>
