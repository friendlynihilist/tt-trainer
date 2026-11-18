<script>
  // Una voce del diario: allenamento (con il suo modello), test, o attività libera. Serve sia per
  // registrare sia per correggere, anche a distanza di tempo.
  //
  // I test sono righe indipendenti, una per percorso: si aggiungono, si tolgono, si cambia il
  // livello o il punteggio. Quelli già salvati si ricaricano tali e quali, così modificare una
  // voce vecchia non perde nulla (nemmeno i tentativi del test di partenza).
  import Plus from '@lucide/svelte/icons/plus';
  import Trash from '@lucide/svelte/icons/trash';
  import X from '@lucide/svelte/icons/x';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { weekOf } from '../store/actions.js';
  import { composeSession } from '../engine/compose.js';
  import { computeTracks } from '../engine/levels.js';
  import { testPlan } from '../engine/suggest.js';
  import { serveScore } from '../engine/events.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { templateMinutes } from '../data/templates.js';
  import { KINDS, KIND, BALL, POINT_PHASE, zoneLabel } from '../data/taxonomy.js';
  import { addDays, fmtLong } from '../util/dates.js';
  import { pickTrack } from '../ui/pickers.js';
  import Sheet from '../ui/Sheet.svelte';
  import Score from '../ui/Score.svelte';
  import FocusEditor from '../ui/FocusEditor.svelte';

  let { id = null, draft = null } = $props();

  const found = id ? app.eventById(id) : null;
  // Una voce prevista che si apre per registrarla diventa la voce fatta (stesso id).
  const original = found && !found.planned ? found : null;
  const fromPlanned = found?.planned ? found.id : (draft?.fromPlanned ?? null);
  const base = original ?? { kind: 'training', date: app.today, ...(found ?? {}), ...draft };
  const isLevel = base.kind === 'livello';

  let kind = $state(base.kind);
  let template = $state(base.template ?? 'completo');
  let date = $state(base.date);
  let minutes = $state(base.minutes ?? defaultMinutes(base.kind, base.template));
  let note = $state(base.note ?? '');
  let feel = $state(base.feel ?? null);
  let focus = $state(base.focus ?? null);
  let obs = $state(base.obs ?? []);
  let serve = $state(serveScore(base));
  // In un allenamento i servizi si misurano solo se lo chiedi; nei test fanno parte del test.
  let askServe = $state(serveScore(base) != null);
  let minutesTouched = $state(Boolean(original));

  function defaultMinutes(k, t) {
    if (k === 'training') return templateMinutes(app.catalog.template(t)) || 90;
    return KIND[k]?.minutes ?? 60;
  }

  // ── Test ────────────────────────────────────────────────────────────────

  /** Le righe salvate, raggruppate per percorso e nell'ordine originale. */
  function rowsFrom(tests) {
    const rows = [];
    for (const t of tests ?? []) {
      if (t.type === 'placement') {
        const r = rows.find((x) => x.track === t.track && x.type === 'placement');
        if (r) r.attempts.push(t);
        else rows.push({ key: `${t.track}-p`, track: t.track, type: 'placement', attempts: [t] });
      } else {
        rows.push({ key: `${t.track}-${t.type}-${rows.length}`, track: t.track, type: t.type ?? 'test', level: t.level ?? null, score: t.score ?? null, marks: t.marks });
      }
    }
    return rows;
  }

  // Il livello di ogni percorso com'era quel giorno, senza questa voce.
  const tracksAt = $derived(computeTracks(app.events, app.rules, { exclude: original?.id, before: addDays(date, 1) }, app.catalog));
  const week = $derived(weekOf(date));

  function newRow(trackId) {
    const st = tracksAt[trackId];
    if (!st?.started) return { key: `${trackId}-${Date.now()}`, track: trackId, type: 'set', level: null };
    return { key: `${trackId}-${Date.now()}`, track: trackId, type: 'test', level: st.level, score: null };
  }

  function initialRows() {
    if (base.tests?.length && !isLevel) return rowsFrom(base.tests);
    if (original) return [];
    if (base.kind === 'test' || (base.kind === 'training' && base.withTest)) {
      const { trackIds } = testPlan({ week: weekOf(base.date), events: app.events, tracks: app.tracks, catalog: app.catalog, date: base.date });
      return trackIds.map(newRow);
    }
    return [];
  }
  let rows = $state(initialRows());

  const measured = $derived(kind === 'training' || kind === 'test');
  const dropping = $derived(!measured && !isLevel && (rows.length > 0 || serve != null));

  function addRow() {
    pickTrack({
      title: 'Quale percorso hai misurato?',
      exclude: rows.filter((r) => r.type !== 'maint').map((r) => r.track),
      onpick: (trackId) => trackId && (rows = [...rows, newRow(trackId)])
    });
  }
  function removeRow(key) {
    rows = rows.filter((r) => r.key !== key);
  }
  function pickLevel(row) {
    const t = app.catalog.track(row.track);
    ui.open('pick', {
      title: row.type === 'set' ? 'Livello di partenza' : 'Livello del test',
      value: row.level,
      groups: [{ options: t.levels.map((l) => ({ id: l.n, label: `Livello ${l.n}`, hint: l.name })) }],
      onpick: (level) => (rows = rows.map((r) => (r.key === row.key ? { ...r, level } : r)))
    });
  }
  function setScore(row, score) {
    rows = rows.map((r) => (r.key === row.key ? { ...r, score } : r));
  }
  function setStart(row, level) {
    rows = rows.map((r) => (r.key === row.key ? { ...r, level: r.level === level ? null : level } : r));
  }

  function testsOut() {
    const out = [];
    for (const r of rows) {
      if (r.type === 'placement') out.push(...r.attempts);
      else if (r.type === 'set') {
        if (r.level) out.push({ track: r.track, type: 'set', level: r.level });
      } else if (r.score != null && r.level) {
        const t = { track: r.track, type: r.type, level: r.level, score: r.score };
        if (r.marks) t.marks = r.marks;
        out.push(t);
      }
    }
    return out;
  }

  // ── Salvataggio ─────────────────────────────────────────────────────────

  function save() {
    const out = { ...(original ?? (found?.planned ? found : {})), kind, date, minutes, note: note.trim(), feel, focus, obs: $state.snapshot(obs) };
    delete out.planned;
    if (fromPlanned) {
      out.id = fromPlanned;
      out.adhoc = true;
    }
    if (draft?.occ && !out.occ) out.occ = draft.occ;

    if (measured) {
      const tests = testsOut();
      out.tests = tests;
      out.block = week?.focusBlock?.id ?? original?.block ?? null;
      out.planId = original?.planId ?? (week ? app.plan.id : null);
      out.serve = serve != null ? { id: original?.serve?.id ?? week?.focusBlock?.serve?.id ?? null, score: serve } : null;
      if (kind === 'training') {
        out.template = template;
        // Cosa si è allenato: quello che c'era già, altrimenti il modello applicato a quel giorno.
        if (!original?.trained || original.template !== template) {
          out.trained = composeSession({ week, template: app.catalog.template(template), tracks: tracksAt, catalog: app.catalog }).trained;
        }
        // Le vecchie sessioni A/B tengono il loro significato (B = con test); le altre valgono
        // «con test» se dentro c'è una misura.
        out.withTest = original?.legacy
          ? Boolean(original.withTest) || tests.some((t) => t.type === 'test' || t.type === 'maint')
          : tests.some((t) => t.type !== 'set') || serve != null;
      } else {
        delete out.template;
        delete out.trained;
        delete out.withTest;
      }
    } else if (!isLevel) {
      out.tests = [];
      out.serve = null;
      delete out.template;
      delete out.trained;
      delete out.withTest;
    }
    app.saveEvent(out);
    ui.close();
    ui.toast(original ? 'Modifiche salvate' : 'Aggiunto al diario');
  }

  function remove() {
    ui.open('confirm', {
      title: 'Eliminare questa voce?',
      text: rows.length ? 'I livelli vengono ricalcolati senza i suoi test.' : 'Non si può annullare.',
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

  function chooseKind(k) {
    kind = k;
    if (!minutesTouched) minutes = defaultMinutes(k, template);
  }
  function chooseTemplate(t) {
    template = t;
    if (!minutesTouched) minutes = defaultMinutes('training', t);
  }

  const FEEL = ['Dura', 'Così così', 'Bene', 'Molto bene', 'Ottima'];
  const title = $derived(isLevel ? 'Livello impostato' : kind === 'training' ? app.catalog.template(template).name : (KIND[kind]?.name ?? 'Attività'));
  const templates = $derived(Object.values(app.catalog.templates));
</script>

<Sheet {title} onclose={() => ui.close()} tall>
  <div class="stack g-24">
    <div class="stack g-12">
      <input class="field" type="date" bind:value={date} aria-label="Data" />
      {#if date}<p class="small muted when">{fmtLong(date)}</p>{/if}
      {#if isLevel}
        {#each base.tests ?? [] as t (t.track)}
          <p class="muted">{exerciseLabel(`${t.track}-${t.level}`, app.catalog)}</p>
        {/each}
      {:else}
        <div class="chips">
          {#each KINDS as k (k.id)}
            <button class="chip kind" data-color={k.id === 'training' ? app.catalog.template(template).color : k.color} aria-pressed={kind === k.id} onclick={() => chooseKind(k.id)}>
              <i class="pip"></i>{k.short}
            </button>
          {/each}
        </div>
        {#if kind === 'training'}
          <div class="chips">
            {#each templates as t (t.id)}
              <button class="chip tpl" data-color={t.color} aria-pressed={template === t.id} onclick={() => chooseTemplate(t.id)}>{t.name}</button>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    {#if measured}
      <section class="stack g-12">
        <div class="spread">
          <h3 class="heading">{kind === 'test' ? 'Percorsi misurati' : 'Test fatti in questo allenamento'}</h3>
        </div>

        {#each rows as r (r.key)}
          {@const t = app.catalog.track(r.track)}
          <div class="trow">
            <div class="spread">
              <span class="grow">
                <strong>{t?.short ?? 'Percorso non più disponibile'}</strong>
                {#if r.type === 'maint'}<span class="small muted"> · mantenimento</span>{/if}
                {#if r.type === 'placement'}<span class="small muted"> · test di partenza</span>{/if}
              </span>
              {#if t && (r.type === 'test' || r.type === 'maint')}
                <button class="lv-chip" onclick={() => pickLevel(r)} aria-label="Cambia livello">L{r.level}</button>
              {/if}
              <button class="icon-btn" onclick={() => removeRow(r.key)} aria-label="Togli questo test"><X size={16} /></button>
            </div>
            {#if r.type === 'placement'}
              <p class="small muted">{r.attempts.map((a) => `L${a.level} ${a.score}/10`).join(' · ')}</p>
            {:else if r.type === 'set'}
              <div class="row g-8 start">
                <span class="small muted grow">Livello di partenza</span>
                {#each Array(app.catalog.maxLevel(r.track)) as _, n (n)}
                  <button class="lv" class:on={r.level === n + 1} onclick={() => setStart(r, n + 1)} aria-label="Livello {n + 1}">{n + 1}</button>
                {/each}
              </div>
            {:else if t}
              <p class="small muted">{app.catalog.level(r.track, r.level)?.test}</p>
              <Score value={r.score} up={app.rules.up} down={app.rules.down} level={r.level} onchange={(n) => setScore(r, n)} />
            {/if}
          </div>
        {/each}

        <button class="btn ghost small add" onclick={addRow}><Plus size={16} /> {rows.length ? 'Un altro percorso' : 'Aggiungi un test'}</button>

        {#if kind === 'test' || askServe}
          <div class="trow">
            <div class="spread">
              <strong class="grow">Servizi del mese</strong>
              {#if kind !== 'test'}
                <button
                  class="icon-btn"
                  onclick={() => {
                    serve = null;
                    askServe = false;
                  }}
                  aria-label="Togli i servizi"><X size={16} /></button
                >
              {/if}
            </div>
            {#if week?.focusBlock?.serve?.test}<p class="small muted">{week.focusBlock.serve.test}</p>{/if}
            <Score value={serve} up={app.rules.up} down={-1} onchange={(n) => (serve = n)} />
          </div>
        {:else}
          <button class="btn ghost small add" onclick={() => (askServe = true)}><Plus size={16} /> Misura i servizi</button>
        {/if}
      </section>
    {:else if dropping}
      <p class="small warn">Questa voce aveva dei test: salvandola come {KIND[kind].short.toLowerCase()} vengono tolti e i livelli si ricalcolano.</p>
    {/if}

    {#if !isLevel}
      <section class="stack g-8">
        <h3 class="heading">Durata</h3>
        <div class="chips">
          {#each [20, 30, 45, 60, 75, 90, 120, 180] as m (m)}
            <button
              class="chip"
              aria-pressed={minutes === m}
              onclick={() => {
                minutes = m;
                minutesTouched = true;
              }}>{m < 60 ? `${m}′` : `${m / 60} h`.replace('.5', '½').replace('1.25', '1¼')}</button
            >
          {/each}
        </div>
      </section>

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
    <button class="btn primary wide" onclick={save} disabled={!date}>Salva</button>
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
  .chip.kind {
    gap: 8px;
  }
  .chip.kind[aria-pressed='true'] .pip {
    box-shadow: 0 0 0 1.5px var(--paper);
  }
  .chip.tpl[aria-pressed='true'] {
    background: var(--c);
    color: #fff;
    box-shadow: inset 0 0 0 1px var(--c);
  }
  .trow {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 10px 14px 16px;
    border-radius: var(--r);
    border: 1px solid var(--line);
    background: var(--card);
  }
  .trow .icon-btn {
    width: 32px;
    height: 32px;
  }
  .lv-chip {
    height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 600;
    background: var(--sunk);
    color: var(--ink-2);
  }
  .lv {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--ink-2);
    box-shadow: inset 0 0 0 1px var(--line-strong);
    transition:
      background 0.2s var(--ease),
      color 0.2s var(--ease);
  }
  .lv.on {
    background: var(--accent);
    color: #15171a;
    box-shadow: none;
    font-weight: 600;
  }
  .start {
    flex-wrap: wrap;
  }
  .warn {
    color: var(--stay);
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
    transition:
      background 0.25s var(--ease),
      transform 0.35s var(--spring);
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
