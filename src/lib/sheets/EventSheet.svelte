<script>
  // Una voce del diario: allenamento (con il suo modello), test, o attività libera. Serve sia per
  // registrare sia per correggere, anche a distanza di tempo.
  //
  // Le misure sono tentativi sugli esercizi: righe indipendenti, una per esercizio. I test sui
  // percorsi salvati con le versioni di prima restano come sono, si vedono in sola lettura e si
  // possono togliere: modificare una voce vecchia non perde nulla.
  import Plus from '@lucide/svelte/icons/plus';
  import Trash from '@lucide/svelte/icons/trash';
  import X from '@lucide/svelte/icons/x';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { weekOf, proposalFor } from '../store/actions.js';
  import { composeSession } from '../engine/compose.js';
  import { serveScore } from '../engine/events.js';
  import { fromLegacyTest, fromLegacyServe, makeAttempt } from '../engine/attempts.js';
  import { valueText, measureLabel } from '../engine/medals.js';
  import { legacyExercise } from '../data/catalog.js';
  import { templateMinutes } from '../data/templates.js';
  import { TRIES_PER_DAY, TIER } from '../data/library.js';
  import { KINDS, KIND, BALL, POINT_PHASE, zoneLabel } from '../data/taxonomy.js';
  import { fmtLong } from '../util/dates.js';
  import { pickExercise } from '../ui/pickers.js';
  import Sheet from '../ui/Sheet.svelte';
  import Counter from '../ui/Counter.svelte';
  import FocusEditor from '../ui/FocusEditor.svelte';
  import PartnerField from '../ui/PartnerField.svelte';
  import FeelPicker from '../ui/FeelPicker.svelte';

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
  let partner = $state(base.partner ?? null);
  let minutesTouched = $state(Boolean(original));

  function defaultMinutes(k, t) {
    if (k === 'training') return templateMinutes(app.catalog.template(t)) || 90;
    return KIND[k]?.minutes ?? 60;
  }

  // ── Misure ──────────────────────────────────────────────────────────────

  let seq = 0;
  const row = (a) => ({ key: seq++, ex: a.ex, tier: a.tier ?? null, tries: [...(a.tries ?? [])], marks: a.marks ?? null, q: a.q ?? null, touched: false });

  /** Le misure salvate, oppure (per un test nuovo) gli esercizi proposti, ancora vuoti. */
  function initialRows() {
    if (base.attempts?.length) return base.attempts.map(row);
    if (!original && base.kind === 'test') return proposalFor(base.date).map((p) => row({ ex: p.ex }));
    return [];
  }
  let rows = $state(initialRows());
  // I test e i servizi delle versioni di prima: non si modificano, si possono togliere.
  let oldTests = $state((base.tests ?? []).filter((t) => t.type !== 'set'));
  let oldServe = $state(serveScore(base));
  const setTests = (base.tests ?? []).filter((t) => t.type === 'set');

  const week = $derived(weekOf(date));
  const measured = $derived(kind === 'training' || kind === 'test');
  const filled = $derived(rows.filter((r) => r.tries.length));
  const dropping = $derived(!measured && !isLevel && (filled.length > 0 || oldTests.length > 0 || oldServe != null));

  function addRow() {
    pickExercise({
      title: 'Quale esercizio hai misurato?',
      onpick: (ex) => ex && (rows = [...rows, row({ ex })])
    });
  }
  function removeRow(key) {
    rows = rows.filter((r) => r.key !== key);
  }
  /** Il valore che si vede e si corregge: per «di fila» e «a tempo» il migliore dei primi tre. */
  function shown(r, ex) {
    if (!r.tries.length) return null;
    const per = TRIES_PER_DAY[ex?.measure?.type] ?? 1;
    const list = r.tries.slice(0, per);
    if (Array.isArray(list[0])) return list[0];
    return Math.max(...list.map(Number));
  }
  function setValue(r, v) {
    rows = rows.map((x) => (x.key === r.key ? { ...x, tries: v == null ? [] : [v], marks: null, touched: true } : x));
  }
  function setPart(r, ex, i, v) {
    const current = Array.isArray(r.tries[0]) ? [...r.tries[0]] : ex.measure.parts.map(() => null);
    current[i] = v;
    rows = rows.map((x) => (x.key === r.key ? { ...x, tries: current.every((n) => n != null) ? [current] : [], partial: current, touched: true } : x));
  }

  function legacyLine(t) {
    const track = app.catalog.track(t.track);
    const type = t.type === 'maint' ? ' · mantenimento' : t.type === 'placement' ? ' · partenza' : '';
    return `${track?.short ?? 'Percorso'} · livello ${t.level}${type} · ${t.score} su 10`;
  }
  function legacyFor(t) {
    const a = fromLegacyTest(t, app.catalog);
    const ex = app.catalog.exercise(a?.ex ?? legacyExercise(t.track, t.level, app.catalog));
    if (!ex) return '';
    return a ? `Vale per «${ex.name}»: ${valueText(ex, a.tries[0])}` : `Non vale per «${ex.name}»: senza i segni non si sa quante di fila`;
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
    if (partner?.name) out.partner = { id: partner.id ?? null, name: partner.name };
    else delete out.partner;

    if (measured) {
      const attempts = filled.map((r) => {
        const ex = app.catalog.exercise(r.ex);
        return makeAttempt({ ex: r.ex, fmt: ex?.measure?.type ?? 'su', tries: r.tries, tier: r.tier, marks: r.touched ? null : r.marks, q: r.q });
      });
      out.attempts = attempts;
      if (original?.tests || oldTests.length) out.tests = [...setTests, ...oldTests];
      if (original?.serve !== undefined || oldServe != null) out.serve = oldServe != null ? (original?.serve ?? null) : null;
      out.block = week?.focusBlock?.id ?? original?.block ?? null;
      out.planId = original?.planId ?? (week ? app.plan.id : null);
      if (kind === 'training') {
        out.template = template;
        // Cosa si è allenato: quello che c'era già, altrimenti il modello applicato a quel giorno.
        if (!original?.trained || original.template !== template) {
          const session = composeSession({ week, template: app.catalog.template(template), catalog: app.catalog, medals: app.medals });
          out.trained = session.trained;
          out.exercises = session.exercises;
        }
        // Le voci di prima tengono il loro «con test» (serve al calendario passato); le nuove non lo usano.
        if (original?.withTest != null) out.withTest = original.withTest && (oldTests.length > 0 || oldServe != null || Boolean(original.legacy));
      } else {
        delete out.template;
        delete out.trained;
        delete out.withTest;
      }
    } else if (!isLevel) {
      out.attempts = [];
      if (original?.tests) out.tests = [];
      if (original?.serve !== undefined) out.serve = null;
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
      text: filled.length || oldTests.length ? 'Le medaglie si ricalcolano senza le sue misure.' : '',
      action: 'Elimina',
      danger: true,
      onconfirm: () => {
        const saved = app.rawEvents.find((e) => e.id === original.id);
        app.deleteEvent(original.id);
        ui.close();
        ui.toast('Voce eliminata', { action: saved ? { label: 'Annulla', run: () => app.saveEvent(saved) } : null });
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

  const title = $derived(isLevel ? 'Livello impostato' : kind === 'training' ? app.catalog.template(template).name : (KIND[kind]?.name ?? 'Attività'));
  // I modelli, più l'allenamento della voce se è un pacchetto.
  const templates = $derived.by(() => {
    const list = Object.values(app.catalog.templates);
    const cur = app.catalog.template(template);
    return list.some((t) => t.id === cur.id) || cur.id === 'auto' ? list : [cur, ...list];
  });
</script>

<Sheet {title} onclose={() => ui.close()} tall>
  <div class="stack g-24">
    <div class="stack g-12">
      <input class="field" type="date" bind:value={date} aria-label="Data" />
      {#if date}<p class="small muted when">{fmtLong(date)}</p>{/if}
      {#if isLevel}
        {#each base.tests ?? [] as t (t.track)}
          <p class="muted">{app.catalog.track(t.track)?.short ?? 'Percorso'} · livello {t.level}</p>
        {/each}
        <p class="small faint">Livello impostato con una versione di prima. Resta nello storico.</p>
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
        <h3 class="heading">{kind === 'test' ? 'Esercizi misurati' : 'Obiettivi provati'}</h3>

        {#each rows as r (r.key)}
          {@const ex = app.catalog.exercise(r.ex)}
          <div class="trow">
            <div class="spread">
              <span class="grow">
                <strong>{ex?.name ?? 'Esercizio non più disponibile'}</strong>
                {#if ex?.measure}<span class="small muted block">{measureLabel(ex)}{r.tier ? ` · ${TIER[r.tier].name.toLowerCase()}` : ''}</span>{/if}
              </span>
              <button class="icon-btn" onclick={() => removeRow(r.key)} aria-label="Togli questa misura"><X size={16} /></button>
            </div>
            {#if ex?.measure?.parts}
              {#each ex.measure.parts as part, i (part)}
                <div class="stack g-6">
                  <span class="small muted">{part}</span>
                  <Counter value={(Array.isArray(r.tries[0]) ? r.tries[0][i] : r.partial?.[i]) ?? null} max={ex.measure.n} label={part} onchange={(v) => setPart(r, ex, i, v)} />
                </div>
              {/each}
            {:else if ex?.measure}
              <Counter value={shown(r, ex)} max={ex.measure.type === 'su' ? ex.measure.n : 999} onchange={(v) => setValue(r, v)} />
              {#if r.tries.length > 1 && !r.touched}<p class="small faint">Tentativi: {r.tries.join(' · ')}</p>{/if}
            {/if}
          </div>
        {/each}

        <button class="btn ghost small add" onclick={addRow}><Plus size={16} /> {rows.length ? 'Un altro esercizio' : 'Aggiungi una misura'}</button>

        {#if oldTests.length || oldServe != null}
          <div class="stack g-8 old">
            <span class="small muted">Test salvati con una versione di prima</span>
            {#each oldTests as t, i (i)}
              <div class="trow">
                <div class="spread">
                  <span class="grow">
                    {legacyLine(t)}
                    <span class="small muted block">{legacyFor(t)}</span>
                  </span>
                  <button class="icon-btn" onclick={() => (oldTests = oldTests.filter((_, k) => k !== i))} aria-label="Togli questo test"><X size={16} /></button>
                </div>
              </div>
            {/each}
            {#if oldServe != null}
              {@const a = fromLegacyServe(base, app.catalog)}
              <div class="trow">
                <div class="spread">
                  <span class="grow">
                    Servizi del mese · {oldServe} su 10
                    {#if a}<span class="small muted block">Vale per «{app.catalog.exercise(a.ex).name}»</span>{/if}
                  </span>
                  <button class="icon-btn" onclick={() => (oldServe = null)} aria-label="Togli i servizi"><X size={16} /></button>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </section>
    {:else if dropping}
      <p class="small warn">Questa voce ha delle misure: salvandola come {KIND[kind].short.toLowerCase()} vengono tolte e le medaglie si ricalcolano.</p>
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

      <section class="stack g-8">
        <h3 class="heading">Con chi ti sei allenato</h3>
        <PartnerField value={partner} onchange={(p) => (partner = p)} />
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
        <h3 class="heading">Note</h3>
        <textarea class="field" placeholder="Cosa ha funzionato, cosa no" bind:value={note}></textarea>
      </section>

      <section class="stack g-8">
        <h3 class="heading">Sensazione</h3>
        <FeelPicker value={feel} onchange={(v) => (feel = v)} />
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
    color: var(--paper);
    box-shadow: inset 0 0 0 1px var(--c);
  }
  .trow {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 10px 14px 16px;
    border-radius: var(--r);
    box-shadow: var(--shadow-card);
    background: var(--card);
  }
  .trow .icon-btn {
    width: 32px;
    height: 32px;
  }
  .old .trow {
    background: var(--sunk);
    border-color: transparent;
    font-size: 14px;
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
    box-shadow: var(--shadow-card);
    text-align: left;
    font-size: 14px;
  }
  .add {
    align-self: flex-start;
  }
  .del {
    align-self: center;
  }
</style>
