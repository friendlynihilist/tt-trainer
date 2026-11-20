<script>
  // Un allenamento: i suoi blocchi, la durata di ognuno, gli esercizi e gli schemi. Quelli di base e
  // i pacchetti si guardano e si duplicano; i tuoi si modificano. La partitella è sempre l'ultima.
  import Plus from '@lucide/svelte/icons/plus';
  import Minus from '@lucide/svelte/icons/minus';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import X from '@lucide/svelte/icons/x';
  import Copy from '@lucide/svelte/icons/copy';
  import Trash from '@lucide/svelte/icons/trash';
  import Play from '@lucide/svelte/icons/play';
  import Repeat from '@lucide/svelte/icons/repeat-2';
  import Timer from '@lucide/svelte/icons/timer';
  import Coffee from '@lucide/svelte/icons/coffee';
  import { app } from '../store/app.svelte.js';
  import { ui, buzz } from '../store/ui.svelte.js';
  import { startItem, weekOf } from '../store/actions.js';
  import { COLORS, STEP_TYPES, normalizeTemplate, templateMinutes } from '../data/templates.js';
  import { schemeOf, composeSession } from '../engine/compose.js';
  import { sessionBlocks } from '../ui/design.js';
  import Brick from '../ui/Brick.svelte';
  import { pickExercise, pickScheme } from '../ui/pickers.js';
  import Sheet from '../ui/Sheet.svelte';

  let { id = null, draft = null } = $props();

  const source = draft ? normalizeTemplate(draft) : id ? app.catalog.template(id) : null;
  const readonly = Boolean(source && !source.custom && !draft);

  let seq = 0;
  const withKeys = (b) => ({ ...b, key: seq++, items: (b.items ?? []).map((it) => ({ ...it })), schemes: [...(b.schemes ?? [])] });

  let name = $state(source?.name ?? '');
  let color = $state(source?.color ?? 'violet');
  let blocks = $state(
    (source?.blocks ?? [
      { name: 'Riscaldamento', minutes: 10, role: null, items: [] },
      { name: 'Partitella', minutes: 15, role: 'match', items: [] }
    ]).map(withKeys)
  );

  const month = $derived(weekOf(app.today)?.focusBlock ?? app.catalog.block('1'));
  // In lettura: i blocchi come mattoncini, con gli esercizi di adesso e i colori delle famiglie.
  const bricks = $derived.by(() => {
    if (!readonly) return [];
    try {
      return sessionBlocks(composeSession({ week: weekOf(app.today), template: source, catalog: app.catalog, medals: app.medals }), app.catalog);
    } catch {
      return [];
    }
  });
  /** La famiglia (il colore) di un blocco nell'editor: dal ruolo o dal primo esercizio. */
  function blockFam(b) {
    if (b.role === 'warmup') return 'palleggio';
    if (b.role === 'serve') return 'servizio';
    if (b.role === 'match') return 'partita';
    const it = b.items?.[0];
    if (it?.ex) return app.catalog.exercise(it.ex)?.family ?? 'libero';
    if (it?.focus) return app.catalog.exercise(app.catalog.sequence(month.tracks[it.focus - 1] ?? '')[0])?.family ?? 'attacco';
    return 'libero';
  }
  const total = $derived(templateMinutes({ blocks }));
  const usedBy = $derived(id ? (app.plan?.slots ?? []).filter((s) => s.template === id).length : 0);
  const hasMatch = $derived(blocks.some((b) => b.role === 'match'));

  /** Il nome di un esercizio del blocco. */
  function itemLabel(it) {
    if (it.ex) return app.catalog.exercise(it.ex)?.name ?? 'Esercizio non più disponibile';
    if (it.focus) return `${it.focus}° del mese · ${app.catalog.track(month.tracks[it.focus - 1])?.short ?? 'nessuno'}`;
    if (it.track) return app.catalog.track(it.track)?.short ?? 'Percorso';
    if (it.free) return it.name || STEP_TYPES.free.name;
    return '';
  }
  /** Cosa c'è in un blocco, in breve (per la vista in sola lettura). */
  function describe(b) {
    if (b.role === 'warmup') return 'Del mese';
    if (b.role === 'serve') return 'Servizi del mese';
    if (b.role === 'match') return (b.schemes?.length ? b.schemes : month.schemes ?? []).map((x) => schemeOf(x, app.catalog)?.name).filter(Boolean).join(' · ');
    return b.items.map(itemLabel).join(' · ');
  }

  function update(key, patch) {
    blocks = blocks.map((b) => (b.key === key ? { ...b, ...patch } : b));
  }
  function minutes(key, delta) {
    buzz();
    blocks = blocks.map((b) => (b.key === key ? { ...b, minutes: Math.max(1, Math.min(120, (Number(b.minutes) || 0) + delta)) } : b));
  }
  function up(i) {
    if (!i) return;
    const next = [...blocks];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    blocks = next;
  }
  /** Un blocco nuovo va prima della partitella, che resta l'ultima. */
  function addBlock(b) {
    buzz();
    const nb = withKeys(b);
    const at = blocks.findIndex((x) => x.role === 'match');
    blocks = at < 0 ? [...blocks, nb] : [...blocks.slice(0, at), nb, ...blocks.slice(at)];
    return nb;
  }
  function addItem(key) {
    pickExercise({ title: 'Aggiungi un esercizio', onpick: (ex) => ex && update(key, { items: [...blocks.find((b) => b.key === key).items, { ex }] }) });
  }
  function swapItem(key, j) {
    const b = blocks.find((x) => x.key === key);
    const cur = b.items[j];
    pickExercise({
      title: 'Cambia esercizio',
      value: cur.ex ?? null,
      variantsOf: cur.ex ?? null,
      family: cur.ex ? app.catalog.exercise(cur.ex)?.family : null,
      onpick: (ex) => ex && update(key, { items: b.items.map((it, k) => (k === j ? { ex } : it)) })
    });
  }
  function removeItem(key, j) {
    const b = blocks.find((x) => x.key === key);
    update(key, { items: b.items.filter((_, k) => k !== j) });
  }
  function addScheme(key) {
    const b = blocks.find((x) => x.key === key);
    pickScheme({ onpick: (sid) => sid && !b.schemes.includes(sid) && update(key, { schemes: [...b.schemes, sid] }) });
  }

  const valid = $derived(name.trim() && blocks.length && blocks.every((b) => b.role || b.items.length));

  function clean() {
    const list = blocks.map(({ key: _k, ...b }) => {
      const o = { name: (b.name ?? '').trim() || (b.role === 'match' ? STEP_TYPES.match.name : 'Blocco'), minutes: Number(b.minutes) || 10, role: b.role ?? null, items: b.items };
      if (b.text?.trim()) o.text = b.text.trim();
      if (b.role === 'match') {
        o.schemes = b.schemes;
        if (b.level) o.level = b.level;
      }
      if (b.role === 'serve' && b.ex) o.ex = b.ex;
      return o;
    });
    // La partitella è sempre l'ultimo blocco.
    return [...list.filter((b) => b.role !== 'match'), ...list.filter((b) => b.role === 'match')];
  }

  function save() {
    const t = app.saveCustom('templates', {
      id: source?.custom ? source.id : undefined,
      name: name.trim(),
      color,
      blocks: clean()
    });
    ui.close();
    ui.toast(source?.custom ? 'Allenamento aggiornato' : `«${t.name}» è tra i tuoi allenamenti`);
  }

  function duplicate() {
    ui.close();
    ui.open('template', { draft: { name: `${source.name} (mio)`, color: source.color === 'blue' ? 'violet' : source.color, blocks: source.blocks } });
  }

  function remove() {
    ui.open('confirm', {
      title: `Eliminare «${source.name}»?`,
      text: usedBy ? 'È nel ritmo della settimana: lì diventa «Completo». Gli allenamenti fatti restano nel diario.' : 'Gli allenamenti fatti restano nel diario.',
      action: 'Elimina',
      danger: true,
      onconfirm: () => {
        app.removeCustom('templates', source.id);
        ui.close();
        ui.toast('Allenamento eliminato');
      }
    });
  }
</script>

<Sheet title={readonly ? source.name : source?.custom ? 'Modifica allenamento' : 'Nuovo allenamento'} onclose={() => ui.close()} tall sans>
  <div class="stack g-24">
    {#if readonly}
      <div class="ro-head">
        <span class="dur"><Timer size={18} /><b class="t-num">{templateMinutes(source)}</b> min</span>
        {#if bricks.length}
          <span class="segs" aria-hidden="true">{#each bricks as b (b.key)}<i data-fam={b.fam} style:flex-grow={b.minutes}></i>{/each}</span>
        {/if}
      </div>
      {#if source.about}<p class="about">{source.about}</p>{/if}
      <div class="bricks">
        {#each bricks as b, i (b.key)}
          {#if i > 0}<div class="gap"><Coffee size={14} /> 1 min</div>{/if}
          <Brick fam={b.fam} name={b.name} minutes={b.minutes} fams={b.fams} sub={b.steps.length > 1 ? b.steps.map((x) => x.name).join(', ') : b.steps[0].name !== b.name ? b.steps[0].name : ''} />
        {/each}
      </div>
      <p class="note">Gli esercizi sono quelli di adesso: cambiano con il mese e con le tue medaglie.</p>
    {:else}
      <input class="field" placeholder="Nome" bind:value={name} maxlength="60" />

      <div class="colors" role="radiogroup" aria-label="Colore">
        {#each COLORS as c (c)}
          <button class="sw" data-color={c} role="radio" aria-checked={color === c} aria-label={c} onclick={() => (color = c)}></button>
        {/each}
      </div>

      <section class="stack g-8">
        <h3 class="heading">Blocchi · {total} min</h3>
        {#each blocks as b, i (b.key)}
          <div class="step" data-fam={blockFam(b)}>
            <div class="spread">
              {#if b.role}
                <strong class="grow">{b.name}</strong>
              {:else}
                <input class="field bname" value={b.name} placeholder="Nome del blocco" oninput={(e) => update(b.key, { name: e.currentTarget.value })} />
              {/if}
              <span class="mins">
                <button class="icon-btn" onclick={() => minutes(b.key, -1)} aria-label="Meno minuti"><Minus size={14} /></button>
                <b class="mono">{b.minutes}′</b>
                <button class="icon-btn" onclick={() => minutes(b.key, 1)} aria-label="Più minuti"><Plus size={14} /></button>
              </span>
              {#if i && b.role !== 'match'}<button class="icon-btn" onclick={() => up(i)} aria-label="Sposta su"><ArrowUp size={15} /></button>{/if}
              <button class="icon-btn" onclick={() => (blocks = blocks.filter((x) => x.key !== b.key))} aria-label="Togli il blocco"><X size={15} /></button>
            </div>

            {#if b.role === 'warmup' || b.role === 'serve'}
              <span class="small muted">{describe(b)}</span>
            {:else if b.role === 'match'}
              <div class="chips">
                {#each b.schemes as sid (sid)}
                  <button class="tag line" onclick={() => update(b.key, { schemes: b.schemes.filter((x) => x !== sid) })} title="Togli">{schemeOf(sid, app.catalog)?.name ?? sid} ×</button>
                {/each}
                <button class="chip mini" onclick={() => addScheme(b.key)}><Plus size={13} /> Schema</button>
              </div>
            {:else}
              {#each b.items as it, j (j)}
                <div class="item-row">
                  {#if it.free}
                    <input class="field grow" placeholder="Nome dell’esercizio" value={it.name ?? ''} oninput={(e) => update(b.key, { items: b.items.map((x, k) => (k === j ? { ...x, name: e.currentTarget.value } : x)) })} />
                  {:else}
                    <span class="grow">{itemLabel(it)}</span>
                    <button class="icon-btn" onclick={() => swapItem(b.key, j)} aria-label="Cambia esercizio"><Repeat size={15} /></button>
                  {/if}
                  <button class="icon-btn" onclick={() => removeItem(b.key, j)} aria-label="Togli l’esercizio"><X size={15} /></button>
                </div>
              {/each}
              <button class="chip mini self" onclick={() => addItem(b.key)}><Plus size={13} /> Esercizio</button>
            {/if}
          </div>
        {/each}

        <div class="chips add">
          <button class="chip mini" onclick={() => addItem(addBlock({ name: '', minutes: 15, role: null, items: [] }).key)}><Plus size={13} /> Blocco</button>
          <button class="chip mini" onclick={() => addBlock({ name: STEP_TYPES.focus.name, minutes: 20, role: null, items: [{ focus: 1 }] })}><Plus size={13} /> Del mese</button>
          <button class="chip mini" onclick={() => addBlock({ name: STEP_TYPES.serve.name, minutes: 15, role: 'serve', items: [] })}><Plus size={13} /> Servizi</button>
          {#if !hasMatch}
            <button class="chip mini" onclick={() => addBlock({ name: STEP_TYPES.match.name, minutes: 15, role: 'match', items: [] })}><Plus size={13} /> Partitella</button>
          {/if}
        </div>
      </section>
    {/if}

    {#if source?.custom && !draft}
      <button class="btn plain danger del" onclick={remove}><Trash size={16} /> Elimina</button>
    {/if}
  </div>

  {#snippet footer()}
    {#if readonly}
      <div class="row g-8">
        <button class="btn ghost grow" onclick={duplicate}><Copy size={16} /> Duplica</button>
        <button
          class="btn primary grow"
          onclick={() => {
            ui.close();
            startItem(null, { template: source });
          }}><Play size={16} fill="currentColor" /> Inizia ora</button
        >
      </div>
    {:else}
      <div class="row g-8">
        {#if source?.custom && !draft}
          <button class="btn ghost" onclick={duplicate} aria-label="Duplica"><Copy size={16} /></button>
        {/if}
        <button class="btn primary grow" onclick={save} disabled={!valid}>Salva</button>
      </div>
    {/if}
  {/snippet}
</Sheet>

<style>
  strong {
    font-weight: 570;
  }
  .block {
    display: block;
  }
  .ro-head {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .dur {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    flex: none;
    font-size: 14px;
    color: var(--ink-2);
  }
  .dur :global(svg) {
    align-self: center;
    color: var(--ink-3);
  }
  .dur b {
    font-size: 24px;
    font-weight: 700;
    color: var(--ink);
  }
  .segs {
    flex: 1;
    display: flex;
    gap: 3px;
  }
  .segs i {
    flex-basis: 0;
    min-width: 8px;
    height: 10px;
    border-radius: 5px;
    background: var(--f);
  }
  .about {
    margin: -8px 0 0;
    color: var(--ink-2);
  }
  .bricks {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .gap {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-3);
  }
  .note {
    margin: -8px 0 0;
    font-size: 13px;
    color: var(--ink-3);
  }
  .colors {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .sw {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--c);
    transition: transform 0.3s var(--spring);
  }
  .sw[aria-checked='true'] {
    box-shadow:
      0 0 0 3px var(--paper),
      0 0 0 5px var(--c);
    transform: scale(1.05);
  }
  .step {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 8px 12px 14px;
    border-radius: var(--r);
    border: 1px solid var(--line);
    border-left: 5px solid var(--f);
    background: color-mix(in srgb, var(--f) 6%, var(--card));
  }
  .step .spread {
    gap: 4px;
  }
  .step .icon-btn {
    width: 30px;
    height: 30px;
    flex: none;
  }
  .field.bname {
    flex: 1;
    min-width: 0;
    min-height: 40px;
    padding: 8px 10px;
  }
  .item-row {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 15px;
  }
  .item-row .field {
    min-height: 40px;
    padding: 8px 10px;
  }
  .mins {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex: none;
  }
  .mins b {
    width: 34px;
    text-align: center;
    font-size: 14px;
  }
  .chip.mini {
    min-height: 32px;
    padding: 4px 12px;
    font-size: 13px;
  }
  .add {
    margin-top: 4px;
  }
  .self {
    align-self: flex-start;
  }
  .del {
    align-self: center;
  }
</style>
