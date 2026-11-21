<script>
  // Il piano: le tappe in ordine (un tema per un allenamento, una, due o quattro settimane, oppure
  // una pausa) e il ritmo della settimana. Di base: i tre temi del programma, quattro settimane l'uno.
  // A piano iniziato le tappe passate restano com'erano; di quella in corso si cambia la durata.
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import X from '@lucide/svelte/icons/x';
  import Plus from '@lucide/svelte/icons/plus';
  import Coffee from '@lucide/svelte/icons/coffee';
  import Check from '@lucide/svelte/icons/check';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { createPlan, defaultSlots, withSlots, withStages, insertWeek, stagesOf, stageInfo, layout, STAGE_LENGTHS, stageLength, DEFAULT_DAYS } from '../engine/plan.js';
  import { CYCLE_BLOCKS, WEEKS_PER_BLOCK } from '../data/program.js';
  import { addDays, mondayOf, fmtLong } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Rhythm from '../ui/Rhythm.svelte';

  let { fresh = false } = $props();

  const BASE_STAGES = CYCLE_BLOCKS.map((b) => ({ b, n: WEEKS_PER_BLOCK, u: 'w' }));
  const creating = fresh || !app.plan;
  let when = $state('this');
  let draft = $state(BASE_STAGES.map((x) => ({ ...x })));
  // Il nuovo piano riparte dal ritmo di quello in corso.
  let slots = $state(app.plan?.slots?.length ? app.plan.slots.map((s) => ({ ...s })) : defaultSlots(DEFAULT_DAYS));

  const start = $derived(when === 'next' ? addDays(mondayOf(app.today), 7) : mondayOf(app.today));
  // Le tappe che si vedono: quelle della bozza (piano nuovo) o quelle del piano in corso.
  const stages = $derived(creating ? draft : stagesOf(app.plan));
  const info = $derived(creating ? null : stageInfo(app.plan, app.today, app.catalog));
  const stateOf = (i) => info?.stages[i]?.state ?? 'next';
  const preview = $derived(creating ? createPlan({ start, slots: $state.snapshot(slots), stages: $state.snapshot(draft) }) : app.plan);
  const weeksTotal = $derived(layout(preview).weeks.length);

  const name = (st) => (st.b === 'P' ? 'Pausa' : (app.catalog.block(st.b)?.theme ?? 'Mese cancellato'));
  const lengthId = (st) => STAGE_LENGTHS.find((l) => l.n === st.n && l.u === st.u)?.id ?? null;

  /** Applica le tappe nuove: alla bozza o al piano in corso. */
  function set(next) {
    if (creating) draft = next;
    else app.setPlan(withStages(app.plan, next));
  }
  const copy = () => stages.map((x) => ({ ...x }));

  function pickTheme(onpick, value = null) {
    const blocks = Object.values(app.catalog.blocks);
    const hint = (b) => b.tracks.map((t) => app.catalog.track(t)?.short).filter(Boolean).join(' · ');
    ui.open('pick', {
      title: 'Su cosa lavori',
      value,
      groups: [
        { name: 'Programma', options: blocks.filter((b) => !b.custom).map((b) => ({ id: b.id, label: b.theme, hint: hint(b) })) },
        { name: 'I tuoi mesi', options: blocks.filter((b) => b.custom).map((b) => ({ id: b.id, label: b.theme, hint: hint(b) })) }
      ].filter((g) => g.options.length),
      onpick
    });
  }
  function changeTheme(i) {
    pickTheme((id) => {
      if (!id) return;
      const next = copy();
      next[i].b = id;
      set(next);
    }, stages[i].b);
  }
  function setLength(i, l) {
    const next = copy();
    next[i] = { ...next[i], n: l.n, u: l.u };
    set(next);
  }
  function moveUp(i) {
    const next = copy();
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    set(next);
  }
  function remove(i) {
    set(copy().filter((_, j) => j !== i));
  }
  function addTheme() {
    pickTheme((id) => id && set([...copy(), { b: id, n: WEEKS_PER_BLOCK, u: 'w' }]));
  }
  function addPause() {
    // A piano iniziato la pausa comincia da questa settimana, e il resto slitta in avanti.
    if (creating || app.weekIdx == null || app.weekIdx < 0) set([...copy(), { b: 'P', n: 1, u: 'w' }]);
    else app.setPlan(insertWeek(app.plan, app.weekIdx, 'P'));
  }

  function setSlots(next) {
    slots = next;
    if (!creating) app.setPlan(withSlots(app.plan, next, app.today));
  }

  function create() {
    const plan = createPlan({ start, slots: $state.snapshot(slots), stages: $state.snapshot(draft) });
    if (app.plan) app.startNewCycle(plan);
    else app.setPlan(plan);
    ui.close();
    ui.toast('Piano creato');
  }
</script>

<Sheet title={creating ? 'Nuovo piano' : 'Il piano'} onclose={() => ui.close()} tall sans>
  <div class="stack g-24">
    {#if creating}
      <Segmented
        options={[
          { id: 'this', label: 'Da questa settimana' },
          { id: 'next', label: 'Dalla prossima' }
        ]}
        value={when}
        onchange={(v) => (when = v)}
      />
    {/if}

    <section class="stack g-8">
      <h3 class="heading">Le tappe, in ordine</h3>
      <p class="small muted">Ogni tappa è su cosa lavori (dritto, rovescio…) per un allenamento o per una, due o quattro settimane.</p>
      <div class="stages">
        {#each stages as st, i (i)}
          {@const s = stateOf(i)}
          {@const lid = lengthId(st)}
          <div class="stage" class:past={s === 'past'} class:now={s === 'now'} class:pause={st.b === 'P'}>
            <div class="top">
              <span class="n mono">{#if s === 'past'}<Check size={14} strokeWidth={3} />{:else if st.b === 'P'}<Coffee size={14} />{:else}{i + 1}{/if}</span>
              {#if s === 'next' && st.b !== 'P'}
                <button class="grow theme" onclick={() => changeTheme(i)}>{name(st)}</button>
              {:else}
                <span class="grow theme">{name(st)}</span>
              {/if}
              {#if s === 'now'}<span class="tag">In corso</span>{/if}
              {#if s === 'next'}
                {#if i > 0 && stateOf(i - 1) === 'next'}
                  <button class="icon-btn" onclick={() => moveUp(i)} aria-label="Sposta {name(st)} prima"><ArrowUp size={16} /></button>
                {/if}
                {#if stages.length > 1}
                  <button class="icon-btn" onclick={() => remove(i)} aria-label="Togli {name(st)}"><X size={16} /></button>
                {/if}
              {/if}
            </div>
            {#if s === 'past'}
              <span class="small muted done">{stageLength(st)}</span>
            {:else}
              <div class="lengths" role="group" aria-label="Durata di {name(st)}">
                {#each STAGE_LENGTHS.filter((l) => st.b !== 'P' || l.u === 'w') as l (l.id)}
                  <button aria-pressed={lid === l.id} class:on={lid === l.id} onclick={() => setLength(i, l)}>{l.short}</button>
                {/each}
                {#if !lid}<button aria-pressed="true" class="on">{stageLength(st)}</button>{/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
      <div class="row g-8">
        <button class="btn ghost small" onclick={addTheme}><Plus size={16} /> Tappa</button>
        <button class="btn ghost small" onclick={addPause}><Coffee size={16} /> {creating ? 'Pausa' : 'Pausa da questa settimana'}</button>
      </div>
      <p class="small muted">
        {weeksTotal === 1 ? '1 settimana' : `${weeksTotal} settimane`}, da {fmtLong(preview.start)} a {fmtLong(addDays(preview.start, weeksTotal * 7 - 1))}. I livelli e le medaglie restano.
        {#if creating && JSON.stringify(draft) !== JSON.stringify(BASE_STAGES)}
          <button class="link" onclick={() => (draft = BASE_STAGES.map((x) => ({ ...x })))}>Torna al programma di base</button>
        {/if}
      </p>
    </section>

    <section class="stack g-8">
      <h3 class="heading">La settimana</h3>
      <Rhythm {slots} onchange={setSlots} />
      <p class="small faint">Quando il test capita nello stesso giorno di un allenamento, lo fai all’inizio di ogni esercizio.</p>
    </section>

    {#if !creating}
      <button
        class="btn ghost"
        onclick={() => {
          ui.close();
          ui.open('plan', { fresh: true });
        }}>Ricomincia con un piano nuovo</button
      >
    {/if}
  </div>

  {#snippet footer()}
    {#if creating}
      <button class="btn primary wide" onclick={create} disabled={!draft.length}>Crea il piano</button>
    {:else}
      <button class="btn primary wide" onclick={() => ui.close()}>Fatto</button>
    {/if}
  {/snippet}
</Sheet>

<style>
  .stages {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .stage {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 10px 12px 14px;
    border-radius: var(--r-card);
    background: var(--card);
    box-shadow: var(--shadow-card);
  }
  .stage.now {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--line));
    background: color-mix(in srgb, var(--accent) 8%, var(--card));
  }
  .stage.past {
    opacity: 0.6;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 36px;
  }
  .n {
    display: grid;
    place-items: center;
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--sunk);
    color: var(--ink-2);
    font-size: 13px;
    font-weight: 650;
  }
  .now .n {
    background: var(--accent);
    color: var(--accent-on);
  }
  .theme {
    text-align: left;
    font-size: 16px;
    font-weight: 700;
    padding: 6px 0;
    color: var(--ink);
  }
  button.theme {
    text-decoration: underline;
    text-decoration-color: var(--line-strong);
    text-underline-offset: 4px;
  }
  .tag {
    font-size: 12px;
    font-weight: 700;
    color: var(--accent-ink);
  }
  .icon-btn {
    width: 44px;
    height: 44px;
  }
  .done {
    margin-left: 34px;
  }
  .lengths {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-left: 34px;
  }
  .lengths button {
    height: 40px;
    padding: 0 12px;
    border-radius: 999px;
    background: var(--sunk);
    font-size: 13px;
    font-weight: 650;
    color: var(--ink-2);
  }
  .lengths button.on {
    background: var(--ink);
    color: var(--paper);
  }
</style>
