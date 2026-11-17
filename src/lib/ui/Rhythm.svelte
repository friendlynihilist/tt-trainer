<script>
  // Il ritmo della settimana: quanti appuntamenti vuoi, in che giorno, con che modello.
  // Più appuntamenti nello stesso giorno vanno bene (per esempio test + allenamento).
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import { app } from '../store/app.svelte.js';
  import { buzz } from '../store/ui.svelte.js';
  import { sortSlots } from '../engine/plan.js';
  import { KIND } from '../data/taxonomy.js';
  import { WEEKDAYS } from '../util/dates.js';
  import { pickWeekday, pickSlotKind } from './pickers.js';

  let { slots, onchange } = $props();

  const trainings = $derived(slots.filter((s) => s.kind === 'training').length);
  const tests = $derived(slots.filter((s) => s.kind === 'test').length);

  function update(id, patch) {
    onchange(sortSlots(slots.map((s) => (s.id === id ? { ...s, ...patch } : s))));
  }
  function remove(id) {
    buzz();
    onchange(slots.filter((s) => s.id !== id));
  }
  function add() {
    buzz();
    const used = new Set(slots.map((s) => s.day));
    const day = [2, 4, 6, 1, 3, 5, 7].find((d) => !used.has(d)) ?? 6;
    const id = `s${Date.now().toString(36)}`;
    onchange(sortSlots([...slots, { id, day, kind: 'training', template: 'completo' }]));
  }
  function chooseDay(s) {
    pickWeekday({ value: s.day, onpick: (day) => day && update(s.id, { day }) });
  }
  function chooseWhat(s) {
    pickSlotKind({
      value: s.kind === 'test' ? 'test' : `training:${s.template}`,
      onpick: (v) => {
        if (!v) return;
        if (v === 'test') update(s.id, { kind: 'test', template: null });
        else update(s.id, { kind: 'training', template: v.split(':')[1] });
      }
    });
  }
  const what = (s) => (s.kind === 'test' ? { name: 'Test', color: KIND.test.color } : app.catalog.template(s.template));
</script>

<div class="stack g-8">
  <div class="card flush list">
    {#each slots as s (s.id)}
      {@const w = what(s)}
      <div class="slot">
        <button class="day" onclick={() => chooseDay(s)}>{WEEKDAYS[s.day - 1]}</button>
        <button class="what" data-color={w.color} onclick={() => chooseWhat(s)}><i class="pip"></i>{w.name}</button>
        <button class="icon-btn" onclick={() => remove(s.id)} aria-label="Togli"><X size={16} /></button>
      </div>
    {:else}
      <p class="empty small muted">Nessun appuntamento fisso: aggiungi tu quando vuoi dal calendario.</p>
    {/each}
  </div>
  <div class="spread">
    <span class="small muted">
      {trainings} {trainings === 1 ? 'allenamento' : 'allenamenti'}{tests ? ` e ${tests} test` : ''} a settimana
    </span>
    <button class="btn ghost small" onclick={add}><Plus size={16} /> Aggiungi</button>
  </div>
</div>

<style>
  .slot {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 6px 6px 14px;
  }
  .day {
    width: 92px;
    flex: none;
    text-align: left;
    font-weight: 540;
    padding: 8px 0;
  }
  .what {
    flex: 1;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--c) 12%, var(--card));
    color: var(--ink);
    font-size: 14px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .icon-btn {
    width: 34px;
    height: 34px;
    flex: none;
  }
  .empty {
    padding: 14px 16px;
  }
</style>
