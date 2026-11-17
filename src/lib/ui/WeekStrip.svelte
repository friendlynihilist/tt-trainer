<script>
  // Il ciclo a colpo d'occhio: una tacca per settimana, raggruppate per mese. La tacca si
  // riempie con gli allenamenti fatti rispetto a quelli previsti dal ritmo.
  import { app } from '../store/app.svelte.js';
  import { weekAt, weekOccurrences } from '../engine/plan.js';

  let { plan, events, current = null } = $props();

  const groups = $derived.by(() => {
    const out = [];
    plan.weeks.forEach((kind, idx) => {
      const w = weekAt(plan, idx, app.catalog);
      const planned = weekOccurrences(plan, w).filter((o) => o.kind === 'training').length;
      let n = 0;
      for (const e of events) if (e.kind === 'training' && e.date >= w.monday && e.date <= w.sunday) n++;
      const cell = {
        idx,
        kind,
        state: current == null || idx > current ? 'future' : idx === current ? 'now' : 'past',
        fill: planned ? Math.min(1, n / planned) : n ? 1 : 0
      };
      const last = out[out.length - 1];
      if (last && last.kind === kind) last.weeks.push(cell);
      else out.push({ kind, weeks: [cell] });
    });
    return out;
  });
</script>

<div class="strip" role="img" aria-label="Avanzamento del ciclo">
  {#each groups as g, n (n)}
    <div class="group" style:flex={g.weeks.length}>
      {#each g.weeks as w (w.idx)}
        <span class="{w.state}" class:pause={w.kind === 'P'}><i style:width="{w.fill * 100}%"></i></span>
      {/each}
    </div>
  {/each}
</div>

<style>
  .strip {
    display: flex;
    gap: 10px;
  }
  .group {
    display: flex;
    gap: 3px;
  }
  span {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--line);
    overflow: hidden;
  }
  i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--ink);
    transition: width 0.7s var(--ease-out);
  }
  .now {
    background: var(--accent-soft);
    box-shadow: 0 0 0 1.5px var(--accent);
  }
  .now i {
    background: var(--accent);
  }
  .pause {
    background: repeating-linear-gradient(90deg, var(--line-strong) 0 3px, transparent 3px 6px);
  }
</style>
