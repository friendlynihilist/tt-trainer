<script>
  // Progressi, in due viste. «Andamento»: il livello con quello che manca per il livello dopo, le
  // ultime dodici settimane in una linea, e il conto delle medaglie. «Mappa»: gli esercizi di ogni
  // colpo, con le medaglie (ui/BrickMap.svelte). Toccando la scheda del livello si aprono gli
  // esercizi chiave; toccando le medaglie si va alla mappa.
  import Check from '@lucide/svelte/icons/check';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { PLAYER_LEVEL, TIERS } from '../data/library.js';
  import { FAMILIES } from '../data/taxonomy.js';
  import { weeklyActivity, weekStreak } from '../engine/stats.js';
  import { levelProgress } from '../engine/player.js';
  import { medalCount } from '../engine/medals.js';
  import PageHead from '../ui/PageHead.svelte';
  import MedalRing from '../ui/MedalRing.svelte';
  import MedalBadge from '../ui/MedalBadge.svelte';
  import Flame from '../ui/Flame.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import BrickMap from '../ui/BrickMap.svelte';
  import Sheet from '../ui/Sheet.svelte';
  import { BRICK } from '../data/bricks.js';

  // L'indirizzo ricorda la vista: #/progressi/mappa/rovescio apre la mappa del rovescio.
  const view = $derived(ui.route.params[0] === 'mappa' ? 'mappa' : 'andamento');
  const brick = $derived(BRICK[ui.route.params[1]] && !BRICK[ui.route.params[1]].extra ? ui.route.params[1] : (app.meta?.focus?.[0] ?? 'dritto'));

  const weeks = $derived(weeklyActivity(app.events, 12));
  const streak = $derived(weekStreak(app.events));
  const top = $derived(Math.max(3, ...weeks.map((w) => w.count)));
  const X = (i) => 8 + i * (304 / 11);
  const Y = (v) => 96 - (v / top) * 84;
  const line = $derived(weeks.map((w, i) => `${X(i)},${Y(w.count)}`).join(' '));
  /** La settimana scelta nel grafico: si parte dall'ultima. */
  let tip = $state(11);
  const ago = $derived(tip === 11 ? 'Questa settimana' : tip === 10 ? 'Una settimana fa' : `${11 - tip} settimane fa`);

  // ── Il livello ──
  const progress = $derived(levelProgress({ level: app.player.level, medals: app.medals, attempts: app.attempts, catalog: app.catalog }));
  const famName = (id) => FAMILIES.find((x) => x.id === id)?.name.toLowerCase() ?? id;
  const missing = $derived(progress.coverage.missing.map(famName));
  const plural = (n, one, many) => (n === 1 ? one : many.replace('#', n));
  /** Che cosa manca per il livello dopo, in una frase: la prima condizione non ancora raggiunta. */
  const lacking = $derived.by(() => {
    const { coverage: c, solidity: o, consistency: k } = progress;
    if (missing.length) return `Manca un argento in ${missing.length > 1 ? `${missing.slice(0, -1).join(', ')} e ${missing.at(-1)}` : missing[0]}.`;
    if (c.have < c.need) return `Ti ${plural(c.need - c.have, 'manca un argento', 'mancano # argenti')} negli esercizi chiave.`;
    if (o.have < o.need) return `Ti ${plural(o.need - o.have, 'manca un oro', 'mancano # ori')} negli esercizi chiave.`;
    if (k.sessions < k.need) return `Ti ${plural(k.need - k.sessions, 'manca una seduta', 'mancano # sedute')} con un risultato da argento.`;
    if (k.span < k.needSpan) return `Fra la prima e l’ultima seduta da argento devono passare ${k.needSpan} giorni: ne sono passati ${k.span}.`;
    return '';
  });

  const count = $derived(medalCount(app.medals));
  const bars = $derived([
    { name: 'Argento', have: progress.coverage.have, need: progress.coverage.need, color: 'var(--medal-A)' },
    { name: 'Oro', have: progress.solidity.have, need: progress.solidity.need, color: 'var(--medal-O)' }
  ]);

  /** Il foglio del livello: gli esercizi chiave e il cambio di livello. */
  let keys = $state(false);
  function openEx(id) {
    keys = false;
    ui.open('exercise', { id });
  }
</script>

<div class="page enter progress">
  <PageHead title="Progressi" />

  <div class="views">
    <Segmented
      options={[
        { id: 'andamento', label: 'Andamento' },
        { id: 'mappa', label: 'Mappa' }
      ]}
      value={view}
      onchange={(v) => (v === 'mappa' ? ui.go('progressi', 'mappa', brick) : ui.go('progressi'))}
    />
  </div>

  {#if view === 'mappa'}
    <BrickMap {brick} onpick={(id) => ui.go('progressi', 'mappa', id)} />
  {:else}
    <div class="cards">
      <!-- Il livello, e cosa manca per quello dopo. -->
      <button class="card lv" onclick={() => (keys = true)}>
        <span class="row">
          <span class="lv-name grow">{PLAYER_LEVEL[app.player.level].name}</span>
          <span class="muted"><ChevronRight size={18} /></span>
        </span>
        {#if progress.next}
          {#each bars as r (r.name)}
            <div class="barrow" style:--v="{Math.min(100, (r.have / Math.max(1, r.need)) * 100)}%" style:--c={r.color}>
              <span>{r.name}</span><i></i><b>{r.have}/{r.need}</b>
            </div>
          {/each}
        {/if}
        <span class="row">
          <Flame size={30} on={streak > 0} />
          <b class="grow">{streak === 1 ? '1 settimana' : `${streak} settimane`} di fila</b>
          {#if progress.consistency.ok}<span class="ok"><Check size={16} strokeWidth={3.2} /></span>{/if}
        </span>
        {#if progress.next}
          <span class="muted small">
            {#if progress.ready}Ci sei: l’app ti propone il livello {PLAYER_LEVEL[progress.next].name.toLowerCase()}.{:else}{lacking}{/if}
          </span>
        {/if}
      </button>

      <!-- Le ultime dodici settimane: un punto per settimana, si tocca per leggere il numero. -->
      <section class="card">
        <h2 class="t-name">12 settimane</h2>
        <div class="chart">
          <svg viewBox="0 0 320 112" role="img" aria-label="Attività per settimana nelle ultime dodici settimane">
            <path d="M8 96H312M8 54H312M8 12H312" stroke="var(--line)" stroke-width="1" />
            <polygon points="8,96 {line} 312,96" fill="var(--accent)" opacity="0.16" />
            <polyline points={line} fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" />
            {#each weeks as w, i (w.monday)}
              <circle cx={X(i)} cy={Y(w.count)} r={tip === i ? 6 : 4} fill={tip === i ? 'var(--accent)' : 'var(--card)'} stroke="var(--accent)" stroke-width="2.5" />
              <circle class="hit" cx={X(i)} cy={Y(w.count)} r="14" fill="transparent" role="button" tabindex="-1" aria-label="Settimana {i + 1}: {w.count} attività" onclick={() => (tip = i)} onkeydown={() => {}} />
            {/each}
          </svg>
        </div>
        <span class="muted small">{ago}: <b class="ink">{weeks[tip].count} attività</b></span>
      </section>

      <!-- Le medaglie: quante per tipo. Toccando si va alla mappa, dove si vede di quali esercizi. -->
      <button class="card" onclick={() => ui.go('progressi', 'mappa', brick)} aria-label="Le tue medaglie: {count.B} di bronzo, {count.A} d’argento, {count.O} d’oro, {count.P} di platino. Apri la mappa">
        <span class="quad">
          {#each TIERS as t (t)}
            <span><MedalBadge tier={t} on={count[t] > 0} size={44} label={false} /><b>{count[t]}</b></span>
          {/each}
        </span>
      </button>
    </div>
  {/if}
</div>

{#if keys}
  <Sheet title={PLAYER_LEVEL[app.player.level].name} onclose={() => (keys = false)}>
    {#if progress.next}
      <p class="muted lead-s">Per passare al livello {PLAYER_LEVEL[progress.next].name.toLowerCase()} servono l’argento e poi l’oro in questi esercizi, e allenamenti regolari.</p>
      <div class="keys">
        {#each progress.slots as slot (slot.ids.join())}
          {@const ex = app.catalog.exercise(slot.ids.find((id) => app.medals[id]?.A) ?? slot.ids[0])}
          <button class="key" onclick={() => openEx(ex.id)}>
            <span class="grow clamp">{slot.ids.length > 1 ? slot.ids.map((id) => app.catalog.exercise(id).name).join(' o ') : ex.name}</span>
            <MedalRing exercise={ex} medals={app.medals[ex.id]} size={34} />
          </button>
        {/each}
      </div>
    {/if}
    {#snippet footer()}
      <button class="btn ghost wide" onclick={() => { keys = false; ui.open('level'); }}>Cambia livello</button>
    {/snippet}
  </Sheet>
{/if}

<style>
  .views {
    margin: 16px 0 14px;
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    text-align: left;
  }
  h2 {
    margin: 0;
  }
  .lv-name {
    font-size: 24px;
    font-weight: 750;
    letter-spacing: -0.025em;
    line-height: 1.15;
  }
  .barrow {
    display: grid;
    grid-template-columns: 70px 1fr 40px;
    align-items: center;
    gap: 10px;
  }
  .barrow i {
    height: 8px;
    border-radius: 4px;
    background: var(--sunk);
    overflow: hidden;
  }
  .barrow i::after {
    content: '';
    display: block;
    height: 100%;
    width: var(--v);
    border-radius: 4px;
    background: var(--c);
  }
  .barrow b {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .row {
    gap: 10px;
  }
  .ok {
    display: grid;
    color: var(--ok);
  }
  .ink {
    color: var(--ink);
  }
  .chart svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .hit {
    cursor: pointer;
    outline: none;
  }
  .quad {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    text-align: center;
  }
  .quad span {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .quad b {
    font-size: 20px;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
  }
  .lead-s {
    margin: 0 0 12px;
  }
  .keys {
    display: flex;
    flex-direction: column;
  }
  .key {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    padding: 8px 0;
    text-align: left;
    font-weight: 600;
  }
  .key + .key {
    border-top: 1px solid var(--line);
  }
</style>
