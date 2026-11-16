<script>
  // Il ciclo a colpo d'occhio: una tacca per settimana, raggruppate per mese.
  import { weekAt } from '../engine/plan.js';

  let { plan, events, current = null } = $props();

  const groups = $derived.by(() => {
    const out = [];
    plan.weeks.forEach((kind, idx) => {
      const w = weekAt(plan, idx);
      let n = 0;
      for (const e of events) {
        if ((e.kind === 'A' || e.kind === 'B') && e.date >= w.monday && e.date <= w.sunday) n++;
      }
      const cell = {
        idx,
        kind,
        state: current == null || idx > current ? 'future' : idx === current ? 'now' : 'past',
        fill: Math.min(2, n)
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
        <span class="{w.state} k{w.kind}" data-fill={w.fill}><i></i></span>
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
    width: 0;
    border-radius: 3px;
    background: var(--ink);
    transition: width 0.7s var(--ease-out);
  }
  [data-fill='1'] i {
    width: 50%;
  }
  [data-fill='2'] i {
    width: 100%;
  }
  .now {
    background: var(--accent-soft);
    box-shadow: 0 0 0 1.5px var(--accent);
  }
  .now i {
    background: var(--accent);
  }
  .kP {
    background: repeating-linear-gradient(90deg, var(--line-strong) 0 3px, transparent 3px 6px);
  }
</style>
