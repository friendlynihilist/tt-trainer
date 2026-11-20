<script>
  // Progressi, dal generale al particolare. In alto il livello: il badge, poi la costanza (la fiamma
  // nell'anello, le settimane di fila) con accanto ore e attività, sotto gli anelli di argento e oro
  // negli esercizi chiave; gli esercizi chiave e le regole si aprono a richiesta. Poi il medagliere: le medaglie per gradino, il filtro per famiglia
  // (che è anche il quadro per famiglia) e la griglia degli esercizi misurati. Poi il ritmo delle
  // settimane. Da correggere, il gruppo e i test di prima sono chiusi di partenza.
  // Le medaglie sono solo un indicatore: non bloccano niente.
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import Check from '@lucide/svelte/icons/check';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { PLAYER_LEVEL, TIERS, TIER } from '../data/library.js';
  import { FAMILIES } from '../data/taxonomy.js';
  import { totals, weaknesses, weeklyActivity, weekStreak, legacyTests } from '../engine/stats.js';
  import { levelProgress } from '../engine/player.js';
  import { medalCount, nextGoal, shortValue } from '../engine/medals.js';
  import { fmtDay } from '../util/dates.js';
  import { reducedMotion } from '../util/motion.js';
  import PageHead from '../ui/PageHead.svelte';
  import TestBars from '../ui/TestBars.svelte';
  import Avatar from '../ui/Avatar.svelte';
  import MedalRing from '../ui/MedalRing.svelte';
  import MedalBadge from '../ui/MedalBadge.svelte';
  import LevelBadge from '../ui/LevelBadge.svelte';
  import ProgressRing from '../ui/ProgressRing.svelte';
  import FamilyIcon from '../ui/FamilyIcon.svelte';
  import Collapse from '../ui/Collapse.svelte';

  const sum = $derived(totals(app.events, app.attempts));
  const weak = $derived(weaknesses(app.events));
  const weeks = $derived(weeklyActivity(app.events, 12));
  const streak = $derived(weekStreak(app.events));
  const maxWeek = $derived(Math.max(2, ...weeks.map((w) => w.count)));
  const topCount = $derived(weak.strokes[0]?.count ?? 1);
  const old = $derived(legacyTests(app.events, app.catalog));

  // ── Il livello ──
  const progress = $derived(levelProgress({ level: app.player.level, medals: app.medals, attempts: app.attempts, catalog: app.catalog }));
  const famName = (id) => FAMILIES.find((x) => x.id === id)?.name.toLowerCase() ?? id;
  const missing = $derived(progress.coverage.missing.map(famName));
  // La costanza ha due condizioni: prima contano le sedute, poi i giorni fra la prima e l'ultima.
  const steady = $derived.by(() => {
    const c = progress.consistency;
    if (c.sessions < c.need) return { have: c.sessions, need: c.need, unit: 'sedute', value: (c.sessions / c.need) * 0.5 };
    return { have: Math.min(c.span, c.needSpan), need: c.needSpan, unit: 'giorni', value: 0.5 + Math.min(1, c.span / c.needSpan) * 0.5 };
  });
  // Argento e oro negli esercizi chiave; la costanza sta in alto, con la fiamma.
  const rings = $derived([
    { id: 'A', name: 'Argento', sub: 'esercizi chiave', have: progress.coverage.have, need: progress.coverage.need, value: progress.coverage.have / Math.max(1, progress.coverage.need), ok: progress.coverage.ok, color: 'var(--medal-A)' },
    { id: 'O', name: 'Oro', sub: 'esercizi chiave', have: progress.solidity.have, need: progress.solidity.need, value: progress.solidity.have / Math.max(1, progress.solidity.need), ok: progress.solidity.ok, color: 'var(--medal-O)' }
  ]);

  // ── Le medaglie ──
  const count = $derived(medalCount(app.medals));
  const medalsTotal = $derived(TIERS.reduce((n, t) => n + count[t], 0));
  const byFamily = $derived(
    FAMILIES.map((f) => {
      const ids = app.catalog.activeExerciseIds.filter((id) => app.catalog.exercise(id).family === f.id && Object.keys(app.catalog.exercise(id).goals ?? {}).length);
      return { ...f, total: ids.length, won: ids.filter((id) => app.medals[id]?.B).length };
    }).filter((f) => f.total)
  );
  let fam = $state(null);
  // Gli esercizi misurati almeno una volta, dal più recente; con il filtro, solo quella famiglia.
  const measured = $derived(
    Object.entries(app.medals)
      .map(([id, m]) => ({ id, m, ex: app.catalog.exercise(id) }))
      .filter((x) => x.ex && (!fam || x.ex.family === fam))
      .sort((a, b) => ((a.m.lastDate ?? '') < (b.m.lastDate ?? '') ? 1 : -1))
  );
  /** Sceglie (o toglie) il filtro e porta la famiglia scelta in vista nella fila che scorre. */
  function pickFam(id, el) {
    fam = fam === id ? null : id;
    el?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  }

  /** «Oro · 9/10», «Tutte prese». */
  function nextShort(ex, m) {
    const g = nextGoal(ex, m);
    return g ? `${TIER[g.tier].name} · ${shortValue(ex, g.goal)}` : 'Tutte prese';
  }

  const motion = (n) => (reducedMotion() ? 0 : n);
</script>

<div class="page enter progress">
  <PageHead eyebrow="Progressi" title="Come stai andando" sans />

  <!-- Il livello: prima la costanza, accanto ore e attività; sotto argento e oro. -->
  <section class="lv card" data-level={app.player.level}>
    <div class="lv-top">
      <LevelBadge level={app.player.level} onclick={() => ui.open('level')} />
    </div>

    <div class="head-row">
      <div class="steady">
        <ProgressRing value={progress.consistency.ok ? 1 : steady.value} color="var(--accent)" size={80} stroke={7} label="Costanza: {streak} settimane di fila">
          <MedalBadge tier="F" on={streak > 0} size={40} label={false} shine />
        </ProgressRing>
        <div class="steady-txt">
          <span class="t-caps cap-label">Costanza</span>
          <span class="streak"><b class="t-num">{streak}</b><span>{streak === 1 ? 'settimana' : 'settimane'} di fila</span></span>
          <span class="cond" class:ok={progress.consistency.ok}>
            {#if progress.consistency.ok}<Check size={14} strokeWidth={3} /> {progress.consistency.need} sedute in {progress.consistency.needSpan} giorni{:else}Per il livello: {steady.have} {steady.unit} su {steady.need}{/if}
          </span>
        </div>
      </div>
      <div class="side">
        <div><b class="t-num">{Math.round(sum.minutes / 60)}</b><span>ore</span></div>
        <div><b class="t-num">{sum.sessions}</b><span>attività</span></div>
      </div>
    </div>

    {#if progress.next}
      <div class="rings">
        {#each rings as r, i (r.id)}
          <div class="rg" in:fly={{ y: 10, duration: motion(320), delay: motion(i * 80), easing: cubicOut }}>
            <ProgressRing value={r.value} color={r.color} size={76} label="{r.name}: {r.have} su {r.need} {r.sub}">
              {#if r.ok}
                <span class="done" style:color={r.color}><Check size={26} strokeWidth={3} /></span>
              {:else}
                <span class="frac t-num"><b>{r.have}</b>/{r.need}</span>
              {/if}
            </ProgressRing>
            <span class="rg-txt">
              <strong>{r.name}</strong>
              <span class="rg-sub">{r.sub}</span>
            </span>
          </div>
        {/each}
      </div>
      <p class="lv-note">
        {#if progress.ready}
          Ci sei: l’app ti propone il livello {PLAYER_LEVEL[progress.next].name.toLowerCase()}.
        {:else if missing.length}
          Manca un argento in {missing.length > 1 ? `${missing.slice(0, -1).join(', ')} e ${missing.at(-1)}` : missing[0]}.
        {:else}
          Quando gli anelli sono pieni, l’app ti propone il livello dopo.
        {/if}
      </p>
      <Collapse title="Esercizi chiave" count={progress.slots.length} open={false} key="progressi-chiave">
        <div class="keys">
          {#each progress.slots as slot (slot.ids.join())}
            {@const ex = app.catalog.exercise(slot.ids.find((id) => app.medals[id]?.A) ?? slot.ids[0])}
            <button class="key" onclick={() => ui.open('exercise', { id: ex.id })}>
              <span class="grow clamp">{slot.ids.length > 1 ? slot.ids.map((id) => app.catalog.exercise(id).name).join(' o ') : ex.name}</span>
              <MedalRing exercise={ex} medals={app.medals[ex.id]} size={34} />
            </button>
          {/each}
        </div>
        <button class="link more" onclick={() => ui.go('guida')}>Come si passa di livello</button>
      </Collapse>
    {:else}
      <p class="lv-note">È il livello più alto. Le medaglie continuano a misurare i tuoi record.</p>
    {/if}
  </section>

  <!-- Il medagliere -->
  <div class="section">
    <Collapse title="Medagliere" key="progressi-medagliere">
      <div class="tiers">
        {#each TIERS as t (t)}
          <span class="tier" class:none={!count[t]}>
            <MedalBadge tier={t} on={count[t] > 0} size={42} label={false} shine delay={TIERS.indexOf(t) * 220} />
            <b class="t-num">{count[t]}</b>
            <small>{TIER[t].name.toLowerCase()}</small>
          </span>
        {/each}
      </div>

      <!-- Le famiglie: quante hanno almeno il bronzo, e toccandole si filtra la griglia. -->
      <div class="fams" role="group" aria-label="Mostra solo una famiglia">
        {#each byFamily as f (f.id)}
          <button class="fam" class:on={fam === f.id} class:dim={fam && fam !== f.id} data-fam={f.id} aria-pressed={fam === f.id} onclick={(e) => pickFam(f.id, e.currentTarget)}>
            <span class="fam-ico"><FamilyIcon fam={f.id} size={22} /></span>
            <span class="fam-name">{f.name}</span>
            <span class="fam-n t-num">{f.won}/{f.total}</span>
          </button>
        {/each}
      </div>

      {#if measured.length}
        <div class="grid">
          {#each measured as x (x.id)}
            <button class="ex" animate:flip={{ duration: motion(260) }} in:fly={{ y: 8, duration: motion(220) }} onclick={() => ui.open('exercise', { id: x.id })}>
              <MedalRing exercise={x.ex} medals={x.m} size={60} />
              <span class="ex-name">{x.ex.name}</span>
              {#if x.m.stale}
                <span class="ex-next stale">Da ripassare</span>
              {:else}
                <span class="ex-next">{nextShort(x.ex, x.m)}</span>
              {/if}
            </button>
          {/each}
        </div>
      {:else}
        <p class="muted small">{fam ? 'Nessun esercizio misurato in questa famiglia.' : 'In sessione tocca «Prova l’obiettivo»: arriva la prima medaglia.'}</p>
      {/if}
    </Collapse>
  </div>

  <!-- Il ritmo -->
  <div class="section">
    <Collapse title="Le ultime 12 settimane" key="progressi-ritmo">
      <div class="card rhythm-card">
        <div class="rhythm" role="img" aria-label="Attività per settimana: {weeks.map((w) => w.count).join(', ')}">
          {#each weeks as w, i (w.monday)}
            <span class="col" title="{fmtDay(w.monday)} · {w.count}">
              {#if w.count}<small class="t-num">{w.count}</small>{/if}
              <i class:zero={!w.count} style:height="{w.count ? (w.count / maxWeek) * 100 : 4}%" style:animation-delay="{i * 30}ms"></i>
            </span>
          {/each}
        </div>
        <div class="axis"><span>{fmtDay(weeks[0].monday)}</span><span>questa settimana</span></div>
      </div>
    </Collapse>
  </div>

  <!-- Da correggere -->
  <div class="section">
    <Collapse title="Da correggere" count={weak.strokes.length || null} open={false} key="progressi-correggere">
      {#if weak.strokes.length}
        <div class="card stack g-16">
          {#each weak.strokes.slice(0, 6) as s (s.id)}
            <button class="weak" onclick={() => ui.open('stroke', { id: s.id })}>
              <span class="spread"><strong>{app.strokeName(s.id)}</strong><span class="t-num small muted">{s.count} {s.count === 1 ? 'volta' : 'volte'}</span></span>
              <span class="meter"><i style:width="{(s.count / topCount) * 100}%"></i></span>
              {#if s.errors.length}
                <span class="small muted">{s.errors.slice(0, 3).map((e) => `${app.errorName(e.id)}${e.count > 1 ? ` ×${e.count}` : ''}`).join(', ')}</span>
              {/if}
            </button>
          {/each}
        </div>
      {:else}
        <p class="muted small">Qui compaiono i colpi che segni più spesso da correggere, con l’errore che torna.</p>
      {/if}
    </Collapse>
  </div>

  {#if app.cloud}
    <div class="section">
      <Collapse title="Il gruppo" count={app.mates.length || null} open={false} key="progressi-gruppo">
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
          <p class="muted small">Quando un compagno entra nel gruppo, lo vedi qui.</p>
        {/if}
        <p class="small faint after">Il gruppo vede solo i nomi. Medaglie, livello e diario restano tuoi.</p>
      </Collapse>
    </div>
  {/if}

  {#if old.length}
    <div class="section">
      <Collapse title="I test della versione 0.2" open={false} key="progressi-v02">
        <p class="small muted">I test di prima, così come li avevi fatti. Valgono anche per le medaglie degli esercizi corrispondenti.</p>
        <div class="tracks">
          {#each old as o (o.track)}
            <button class="card track" onclick={() => ui.open('track', { id: o.track })}>
              <strong>{app.catalog.track(o.track).short}</strong>
              <TestBars history={o.tests} up={8} down={4} height={44} max={10} />
            </button>
          {/each}
        </div>
      </Collapse>
    </div>
  {/if}
</div>

<style>
  /* ── Il livello ── */
  .lv {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 18px 10px;
    background: color-mix(in srgb, var(--lv) 7%, var(--card));
    border-color: color-mix(in srgb, var(--lv) 30%, var(--line));
  }
  .lv-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .head-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .steady {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .steady-txt {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cap-label {
    color: var(--accent-ink);
  }
  .streak {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
    white-space: nowrap;
  }
  .streak b {
    font-size: 30px;
    font-weight: 800;
    line-height: 1.1;
    color: var(--ink);
  }
  .cond {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .cond.ok {
    color: var(--up, var(--ink-2));
  }
  .side {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-left: 12px;
    border-left: 1px solid var(--line);
  }
  .side div {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .side b {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.1;
  }
  .side span {
    font-size: 12px;
    color: var(--ink-3);
  }
  .rings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }
  .rg {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }
  .rg-txt {
    display: flex;
    flex-direction: column;
  }
  .rg strong {
    font-size: 15px;
    font-weight: 700;
  }
  .rg-sub {
    font-size: 12px;
    color: var(--ink-3);
  }
  .frac {
    font-size: 14px;
    color: var(--ink-2);
  }
  .frac b {
    font-size: 20px;
    font-weight: 700;
    color: var(--ink);
  }
  .done {
    display: grid;
  }
  .lv-note {
    margin: 0;
    font-size: 14px;
    color: var(--ink-2);
    text-align: center;
  }
  .keys {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .key {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 4px 6px 4px 12px;
    border-radius: 12px;
    background: var(--sunk);
    font-size: 14px;
    text-align: left;
    color: var(--ink);
  }
  .clamp {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .more {
    display: block;
    margin: 12px auto 6px;
    font-size: 14px;
  }

  /* ── Il medagliere ── */
  .tiers {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 14px 8px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
  }
  .tier {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .tier b {
    margin-top: 4px;
    font-size: 20px;
    font-weight: 700;
  }
  .tier small {
    font-size: 12px;
    color: var(--ink-3);
  }
  .tier.none b {
    color: var(--ink-3);
  }
  .fams {
    display: flex;
    gap: 8px;
    margin: 14px -20px 0;
    padding: 0 20px 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .fams::-webkit-scrollbar {
    display: none;
  }
  .fam {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: none;
    height: 44px;
    padding: 0 12px 0 6px;
    border-radius: 14px;
    background: var(--card);
    border: 1px solid var(--line);
    color: var(--ink);
    transition:
      opacity var(--dur) var(--ease),
      background var(--dur) var(--ease),
      border-color var(--dur) var(--ease);
  }
  .fam.on {
    background: color-mix(in srgb, var(--f) 14%, var(--card));
    border-color: var(--f);
  }
  .fam.dim {
    opacity: 0.5;
  }
  .fam-ico {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: var(--f);
    color: var(--f-on);
  }
  .fam-name {
    font-size: 14px;
    font-weight: 650;
  }
  .fam-n {
    font-size: 13px;
    color: var(--ink-3);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 14px;
  }
  .ex {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 6px 10px;
    border-radius: var(--r-card);
    background: var(--card);
    border: 1px solid var(--line);
    text-align: center;
    color: var(--ink);
    transition: transform var(--dur-fast) var(--ease);
  }
  .ex:active {
    transform: scale(0.96);
  }
  .ex-name {
    font-size: 13px;
    font-weight: 650;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 2.5em;
  }
  .ex-next {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-3);
  }
  .ex-next.stale {
    color: var(--down);
  }

  /* ── Il ritmo ── */
  .rhythm-card {
    padding: 16px 16px 12px;
  }
  .rhythm {
    display: flex;
    align-items: flex-end;
    gap: 5px;
    height: 88px;
  }
  .col {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    gap: 3px;
  }
  .col small {
    font-size: 11px;
    color: var(--ink-3);
  }
  .col i {
    width: 100%;
    border-radius: 5px;
    background: color-mix(in srgb, var(--accent) 45%, var(--sunk));
    transform-origin: bottom;
    animation: up 0.6s var(--ease-out) both;
  }
  .col i.zero {
    background: var(--line);
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
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 12px;
    color: var(--ink-3);
  }

  /* ── Da correggere ── */
  .weak {
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
    color: var(--ink);
  }
  .weak strong {
    font-weight: 650;
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
    background: var(--down);
    transform-origin: left;
    animation: grow 0.7s var(--ease-out) both;
  }
  @keyframes grow {
    from {
      transform: scaleX(0);
    }
  }

  /* ── Gruppo e test di prima ── */
  .mate {
    padding: 12px 18px;
  }
  .after {
    margin-top: 10px;
  }
  .tracks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
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
  }
  .track :global(.bars) {
    margin-top: 10px;
  }
  @media (prefers-reduced-motion: reduce) {
    .col i,
    .meter i {
      animation: none;
    }
  }
</style>
