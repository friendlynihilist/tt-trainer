<script>
  // Una voce del diario: sessione del ciclo (con i test) o un'altra attività
  // (lezione, servizi da solo, partite, torneo). Serve sia per registrare sia per correggere.
  import Plus from '@lucide/svelte/icons/plus';
  import Trash from '@lucide/svelte/icons/trash';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { weekAt, weekIndex } from '../engine/plan.js';
  import { composeSession } from '../engine/compose.js';
  import { computeTracks } from '../engine/levels.js';
  import { BLOCKS, LEVELS, levelOf, exerciseLabel } from '../data/program.js';
  import { KINDS, KIND, BALL, POINT_PHASE, zoneLabel } from '../data/taxonomy.js';
  import { addDays, fmtLong } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import Score from '../ui/Score.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Dots from '../ui/Dots.svelte';
  import FocusEditor from '../ui/FocusEditor.svelte';

  let { id = null, draft = null } = $props();

  const original = id ? app.events.find((e) => e.id === id) : null;
  const base = original ?? { kind: 'A', date: app.today, ...draft };

  let kind = $state(base.kind);
  let date = $state(base.date);
  let minutes = $state(base.minutes ?? KIND[base.kind]?.minutes ?? 60);
  let note = $state(base.note ?? '');
  let feel = $state(base.feel ?? null);
  let focus = $state(base.focus ?? null);
  let obs = $state(base.obs ?? []);
  let serve = $state(base.serve?.score ?? null);

  // Punteggi dei test e livelli di partenza, per percorso.
  let scores = $state({});
  let starts = $state({});
  let maint = $state(null);
  for (const t of base.tests ?? []) {
    if (t.type === 'set') starts[t.track] = t.level;
    else if (t.type === 'maint') maint = t.score;
    else if (t.type !== 'placement') scores[t.track] = t.score;
  }
  const keptPlacement = (base.tests ?? []).filter((t) => t.type === 'placement');
  const storedLevel = Object.fromEntries((base.tests ?? []).filter((t) => t.level && t.type !== 'placement').map((t) => [t.track, t.level]));

  const cycle = $derived(kind === 'A' || kind === 'B');
  const isLevel = base.kind === 'livello';

  // La sessione com'era quel giorno: livelli calcolati su tutto ciò che viene prima.
  const session = $derived.by(() => {
    if (!cycle) return null;
    const plan = app.plan;
    const w = plan ? weekAt(plan, weekIndex(plan, date)) : null;
    const week = w?.block ? w : { block: BLOCKS[base.block ?? '1'], lastOfBlock: false };
    const tracks = computeTracks(app.events, app.rules, { exclude: base.id, before: addDays(date, 1) });
    return composeSession({ week, slot: kind, tracks });
  });
  const exercises = $derived(session?.steps.filter((s) => s.kind === 'exercise') ?? []);
  const maintStep = $derived(session?.steps[0].maint?.test ? session.steps[0].maint : null);
  const valid = $derived(Boolean(date));

  function save() {
    const out = { ...(original ?? {}), kind, date, minutes, note: note.trim(), feel, focus, obs: $state.snapshot(obs) };
    if (cycle) {
      const tests = [];
      if (maintStep && maint != null) tests.push({ track: maintStep.track, type: 'maint', level: maintStep.level, score: maint });
      for (const s of exercises) {
        const placed = keptPlacement.filter((t) => t.track === s.track);
        tests.push(...placed);
        if (s.placement && !placed.length && starts[s.track]) tests.push({ track: s.track, type: 'set', level: starts[s.track] });
        if (kind === 'B' && !s.placement && scores[s.track] != null) {
          tests.push({ track: s.track, type: 'test', level: storedLevel[s.track] ?? s.level, score: scores[s.track] });
        }
      }
      out.tests = tests;
      out.block = session.block.id;
      out.planId = original?.planId ?? app.plan?.id ?? null;
      out.serve = kind === 'B' && serve != null ? { id: session.block.serve.id, score: serve } : null;
    } else if (!isLevel) {
      out.tests = [];
      out.serve = null;
    }
    app.saveEvent(out);
    ui.close();
    ui.toast(original ? 'Modifiche salvate' : 'Aggiunto al diario');
  }

  function remove() {
    ui.open('confirm', {
      title: 'Eliminare questa voce?',
      text: 'I livelli vengono ricalcolati senza i suoi test.',
      action: 'Elimina',
      danger: true,
      onconfirm: () => {
        app.deleteEvent(original.id);
        ui.close();
        ui.toast('Voce eliminata');
      }
    });
  }

  function editObs(index) {
    ui.open('obs', {
      value: index == null ? null : $state.snapshot(obs[index]),
      onsave: (o) => {
        if (index == null) obs = [...obs, o];
        else obs = obs.map((x, i) => (i === index ? o : x));
      },
      ondelete: index == null ? null : () => (obs = obs.filter((_, i) => i !== index))
    });
  }

  function obsLine(o) {
    return [app.strokeName(o.stroke, true), app.errorName(o.error), BALL[o.ball]?.name, zoneLabel(o.zone), POINT_PHASE[o.phase]?.name]
      .filter(Boolean)
      .join(' · ');
  }

  const FEEL = ['Dura', 'Così così', 'Bene', 'Molto bene', 'Ottima'];
  const title = $derived(isLevel ? 'Livello impostato' : (KIND[kind]?.name ?? 'Attività'));
</script>

<Sheet {title} onclose={() => ui.close()} tall>
  <div class="stack g-24">
    <div class="stack g-12">
      <input class="field" type="date" bind:value={date} aria-label="Data" />
      {#if date}<p class="small muted when">{fmtLong(date)}</p>{/if}
      {#if isLevel}
        {#each base.tests ?? [] as t (t.track)}
          <p class="muted">{exerciseLabel(`${t.track}-${t.level}`)}</p>
        {/each}
      {:else if cycle}
        <Segmented
          options={[
            { id: 'A', label: 'Sessione A' },
            { id: 'B', label: 'Sessione B · test' }
          ]}
          value={kind}
          onchange={(v) => (kind = v)}
        />
      {:else}
        <div class="chips">
          {#each KINDS.filter((k) => !k.cycle) as k (k.id)}
            <button
              class="chip"
              aria-pressed={kind === k.id}
              onclick={() => {
                kind = k.id;
                if (!original) minutes = k.minutes;
              }}>{k.short}</button
            >
          {/each}
        </div>
      {/if}
    </div>

    {#if cycle && session}
      <section class="stack g-16">
        {#if maintStep}
          <div class="stack g-8">
            <div class="spread">
              <span><strong>Mantenimento</strong> <span class="muted">· {maintStep.name} L{maintStep.level}</span></span>
            </div>
            <Score value={maint} up={app.rules.up} down={app.rules.down} level={maintStep.level} onchange={(n) => (maint = n)} />
          </div>
        {/if}

        {#if kind === 'B'}
          <div class="stack g-8">
            <strong>Servizi</strong>
            <Score value={serve} up={app.rules.up} down={-1} onchange={(n) => (serve = n)} />
          </div>
        {/if}

        {#each exercises as s (s.track)}
          {@const level = storedLevel[s.track] ?? s.level}
          {@const placed = keptPlacement.filter((t) => t.track === s.track)}
          <div class="stack g-8">
            <div class="spread">
              <span>
                <strong>{s.name}</strong>
                {#if !s.placement}<span class="muted"> · L{level} {levelOf(s.track, level).name}</span>{/if}
              </span>
              {#if !s.placement}<Dots {level} />{/if}
            </div>
            {#if placed.length}
              <p class="small muted">Test di partenza: {placed.map((t) => `L${t.level} ${t.score}/10`).join(' · ')}</p>
            {:else if s.placement}
              <div class="row g-8 start">
                <span class="small muted grow">Livello di partenza</span>
                {#each Array(LEVELS) as _, n (n)}
                  <button
                    class="lv"
                    class:on={starts[s.track] === n + 1}
                    onclick={() => (starts[s.track] = starts[s.track] === n + 1 ? undefined : n + 1)}
                    aria-label="Livello {n + 1}">{n + 1}</button
                  >
                {/each}
              </div>
            {:else if kind === 'B'}
              <Score value={scores[s.track] ?? null} up={app.rules.up} down={app.rules.down} {level} onchange={(n) => (scores[s.track] = n)} />
            {/if}
          </div>
        {/each}
      </section>
    {/if}

    {#if !isLevel}
      {#if !cycle}
        <section class="stack g-8">
          <h3 class="heading">Durata</h3>
          <div class="chips">
            {#each [30, 45, 60, 90, 120, 180] as m (m)}
              <button class="chip" aria-pressed={minutes === m} onclick={() => (minutes = m)}>{m < 60 ? `${m}′` : `${m / 60} h`.replace('.5', '½')}</button>
            {/each}
          </div>
        </section>
      {/if}

      <section class="stack g-12">
        <h3 class="heading">Da correggere</h3>
        <FocusEditor value={focus} onchange={(v) => (focus = v)} />
      </section>

      <section class="stack g-8">
        <h3 class="heading">Note tecniche</h3>
        {#each obs as o, i (i)}
          <button class="obs" onclick={() => editObs(i)}>
            <span class="grow">
              {obsLine(o) || 'Nota'}
              {#if o.note}<span class="small muted block">{o.note}</span>{/if}
            </span>
            {#if o.score != null}<span class="mono">{o.score}/10</span>{/if}
          </button>
        {/each}
        <button class="btn ghost small add" onclick={() => editObs(null)}><Plus size={16} /> Colpo, palla, zona, errore</button>
      </section>

      <section class="stack g-8">
        <h3 class="heading">Diario</h3>
        <textarea class="field" placeholder="Cosa ha funzionato, cosa no" bind:value={note}></textarea>
        <div class="feel" role="radiogroup" aria-label="Sensazione">
          {#each FEEL as label, i (label)}
            <button
              role="radio"
              aria-checked={feel === i + 1}
              aria-label={label}
              class:on={feel === i + 1}
              class:under={feel != null && i + 1 < feel}
              onclick={() => (feel = feel === i + 1 ? null : i + 1)}
            ></button>
          {/each}
        </div>
        <p class="small muted">{feel ? FEEL[feel - 1] : 'Sensazione'}</p>
      </section>
    {/if}

    {#if original}
      <button class="btn plain danger del" onclick={remove}><Trash size={16} /> Elimina</button>
    {/if}
  </div>

  {#snippet footer()}
    <button class="btn primary wide" onclick={save} disabled={!valid}>Salva</button>
  {/snippet}
</Sheet>

<style>
  strong {
    font-weight: 580;
  }
  .when {
    margin-top: -6px;
  }
  .when::first-letter {
    text-transform: uppercase;
  }
  .block {
    display: block;
  }
  .lv {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--ink-2);
    box-shadow: inset 0 0 0 1px var(--line-strong);
    transition: background 0.2s var(--ease), color 0.2s var(--ease);
  }
  .lv.on {
    background: var(--accent);
    color: #15171a;
    box-shadow: none;
    font-weight: 600;
  }
  .obs {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: var(--r-s);
    background: var(--card);
    border: 1px solid var(--line);
    text-align: left;
    font-size: 14px;
  }
  .add {
    align-self: flex-start;
  }
  .del {
    align-self: center;
  }
  .feel {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin-top: 4px;
  }
  .feel button {
    height: 32px;
    border-radius: 9px;
    background: var(--sunk);
    transition: background 0.25s var(--ease), transform 0.35s var(--spring);
  }
  .feel button.under {
    background: color-mix(in srgb, var(--ink) 35%, var(--sunk));
  }
  .feel button.on {
    background: var(--ink);
  }
  .feel button:active {
    transform: scale(0.92);
  }
</style>
