<script>
  // Progressi, in due viste. «Andamento»: il livello con quello che manca per il livello dopo,
  // l'attività in una linea (l'ultima settimana, l'ultimo mese o gli ultimi tre mesi: si sceglie in alto o allargando
  // e stringendo due dita sul grafico), e il conto delle medaglie. «Mappa»: gli esercizi di ogni
  // colpo, con le medaglie (ui/BrickMap.svelte). Toccando la scheda del livello si aprono gli
  // esercizi chiave; toccando le medaglie si va alla mappa.
  import { fade } from 'svelte/transition';
  import Check from '@lucide/svelte/icons/check';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui, buzz } from '../store/ui.svelte.js';
  import { PLAYER_LEVEL, TIERS } from '../data/library.js';
  import { FAMILIES } from '../data/taxonomy.js';
  import { activity, weekStreak, PERIODS } from '../engine/stats.js';
  import { fmtShort } from '../util/dates.js';
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

  const streak = $derived(weekStreak(app.events));

  // ── Il grafico ──
  // Tre periodi, chiamati per quanto tempo mostrano: una settimana, un mese, tre mesi. Si cambia con
  // i tre nomi sopra il grafico oppure con due dita: allargando si stringe il periodo (verso la
  // settimana), stringendo lo si allarga (verso i tre mesi).
  const NAMES = {
    settimana: { label: 'Settimana', span: 'ultimi 7 giorni', total: 'Ultimi 7 giorni' },
    mese: { label: 'Mese', span: 'ultimi 30 giorni', total: 'Ultimi 30 giorni' },
    'tre-mesi': { label: 'Tre mesi', span: 'ultimi tre mesi, settimana per settimana', total: 'Ultimi tre mesi' }
  };
  const ZOOMS = PERIODS.map((p) => ({ ...p, ...NAMES[p.id] }));
  // Dal più largo al più stretto: è l'ordine in cui si ingrandisce.
  const ORDER = ZOOMS.map((z) => z.id).reverse();
  function stored() {
    try {
      const v = localStorage.getItem('tt-andamento');
      return ORDER.includes(v) ? v : 'mese';
    } catch {
      return 'mese';
    }
  }
  let scale = $state(stored());
  /** Il punto scelto nel grafico: null = l'ultimo. */
  let picked = $state(null);
  function setScale(v) {
    if (!ORDER.includes(v) || v === scale) return;
    scale = v;
    picked = null;
    try {
      localStorage.setItem('tt-andamento', v);
    } catch {
      // Senza memoria del browser si riparte dal mese.
    }
  }
  /** +1 ingrandisce (verso la settimana), -1 rimpicciolisce (verso i tre mesi). */
  function zoom(step) {
    const next = ORDER[ORDER.indexOf(scale) + step];
    if (next) {
      setScale(next);
      buzz();
    }
  }

  const period = $derived(ZOOMS.find((z) => z.id === scale));
  const points = $derived(activity(app.events, period.unit, period.n));
  const last = $derived(points.length - 1);
  const tip = $derived(picked == null ? last : Math.min(picked, last));
  const top = $derived(Math.max(3, ...points.map((p) => p.count)));
  const X = (i) => 8 + i * (304 / Math.max(1, last));
  const Y = (v) => 96 - (v / top) * 84;
  const line = $derived(points.map((p, i) => `${X(i)},${Y(p.count)}`).join(' '));
  const dense = $derived(points.length > 16);

  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  /** Una durata a parole: «45 minuti», «1 ora», «6 ore e 15 minuti». */
  function spell(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hours = h === 1 ? '1 ora' : `${h} ore`;
    const mins = m === 1 ? '1 minuto' : `${m} minuti`;
    return !h ? mins : !m ? hours : `${hours} e ${mins}`;
  }
  // Sotto il grafico: senza un punto scelto, il totale del periodo (quante attività e quante ore,
  // di ogni tipo: allenamenti, lezioni, partite, tornei…); con un punto scelto, quel giorno o
  // quella settimana.
  const sum = $derived({ count: points.reduce((n, p) => n + p.count, 0), minutes: points.reduce((n, p) => n + p.minutes, 0) });
  const when = $derived.by(() => {
    if (picked == null) return period.total;
    const p = points[tip];
    const back = last - tip;
    if (period.unit === 'day') return back === 0 ? 'Oggi' : back === 1 ? 'Ieri' : cap(fmtShort(p.from));
    return back === 0 ? 'Questa settimana' : back === 1 ? 'Una settimana fa' : `${back} settimane fa`;
  });
  const what = $derived.by(() => {
    const p = picked == null ? sum : points[tip];
    if (!p.count) return 'nessuna attività';
    return `${p.count} attività${p.minutes ? `, ${spell(p.minutes)}` : ''}`;
  });

  // Un dito scorre fra i punti; due dita cambiano l'ingrandimento.
  let chart = $state();
  const fingers = new Map();
  let spread = 0;
  const gap = () => {
    const [a, b] = [...fingers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  function pickAt(clientX) {
    const r = chart.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 320;
    picked = Math.max(0, Math.min(last, Math.round(((x - 8) / 304) * last)));
  }
  /** Il punto scelto prima che arrivasse il primo dito: con due dita non si sceglie, si ingrandisce. */
  let before = null;
  function down(e) {
    clearTimeout(release);
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size === 2) {
      spread = gap();
      picked = before;
    } else if (fingers.size === 1) {
      before = picked;
      pickAt(e.clientX);
    }
  }
  function move(e) {
    if (!fingers.has(e.pointerId)) return;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size === 1) pickAt(e.clientX);
    else if (fingers.size === 2 && spread > 0) {
      const now = gap();
      if (now > spread * 1.45) {
        zoom(1);
        spread = now;
      } else if (now < spread / 1.45) {
        zoom(-1);
        spread = now;
      }
    }
  }
  // Tolto il dito, il punto scelto resta qualche secondo e poi torna il totale del periodo.
  let release = null;
  function up(e) {
    if (!fingers.delete(e.pointerId)) return;
    spread = 0;
    clearTimeout(release);
    if (!fingers.size) release = setTimeout(() => (picked = null), 4000);
  }
  /** Sul computer: il gesto delle due dita sul trackpad arriva come rotella con Ctrl. */
  let wheelAt = 0;
  function wheel(e) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (Date.now() - wheelAt < 350 || Math.abs(e.deltaY) < 2) return;
    wheelAt = Date.now();
    zoom(e.deltaY < 0 ? 1 : -1);
  }
  function keys2(e) {
    // La prima freccia sceglie l'ultimo punto (oggi, o questa settimana); Esc torna al totale.
    if (e.key === 'ArrowLeft') picked = picked == null ? last : Math.max(0, tip - 1);
    else if (e.key === 'ArrowRight') picked = picked == null ? last : Math.min(last, tip + 1);
    else if (e.key === 'Escape' && picked != null) picked = null;
    else if (e.key === '+' || e.key === '=') zoom(1);
    else if (e.key === '-') zoom(-1);
    else return;
    e.preventDefault();
  }
  $effect(() => {
    // La rotella va ascoltata «non passiva» per poter fermare lo zoom della pagina.
    const el = chart;
    if (!el) return;
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  });

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

      <!-- L'attività nel tempo: un punto per giorno (settimana e mese) o per settimana (tre mesi). Un dito scorre fra i punti,
           due dita (o i tre nomi) cambiano l'ingrandimento. -->
      <section class="card">
        <Segmented small options={ZOOMS} value={scale} onchange={setScale} />
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
          class="chart"
          bind:this={chart}
          role="group"
          tabindex="0"
          aria-label="Attività, {period.span}. Frecce per scorrere, più e meno per ingrandire"
          onpointerdown={down}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
          onpointerleave={up}
          onkeydown={keys2}
        >
          {#key scale}
            <svg viewBox="0 0 320 112" aria-hidden="true" in:fade={{ duration: 220 }}>
              <path d="M8 96H312M8 54H312M8 12H312" stroke="var(--line)" stroke-width="1" />
              <polygon points="8,96 {line} 312,96" fill="var(--accent)" opacity="0.16" />
              <polyline points={line} fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" />
              {#each points as p, i (p.from)}
                {#if picked != null && tip === i}
                  <circle cx={X(i)} cy={Y(p.count)} r="6" fill="var(--accent)" stroke="var(--accent)" stroke-width="2.5" />
                {:else if !dense || p.count}
                  <circle cx={X(i)} cy={Y(p.count)} r={dense ? 2.5 : 4} fill="var(--card)" stroke="var(--accent)" stroke-width={dense ? 2 : 2.5} />
                {/if}
              {/each}
            </svg>
          {/key}
        </div>
        <span class="muted small" aria-live="polite">{when}: <b class="ink">{what}</b></span>
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
  /* Il grafico tiene per sé i gesti orizzontali e quelli a due dita; in verticale la pagina scorre. */
  .chart {
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
    border-radius: 8px;
  }
  .chart:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
  .chart svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
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
