<script>
  // Un percorso tuo: un esercizio che cresce per livelli (da 1 a 8), ciascuno con il suo test su 10.
  // Il livello si calcola come per quelli di base: due test di fila sopra soglia e si sale.
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import Archive from '@lucide/svelte/icons/archive';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { MAX_LEVELS } from '../data/catalog.js';
  import { pickStroke } from '../ui/pickers.js';
  import Sheet from '../ui/Sheet.svelte';
  import Segmented from '../ui/Segmented.svelte';

  let { id = null, draft = null } = $props();

  const source = draft ?? (id ? app.catalog.track(id) : null);
  const editing = Boolean(source?.custom && !draft);

  let name = $state(source?.name ?? '');
  let short = $state(source?.short ?? '');
  let side = $state(source?.side ?? 'both');
  let strokes = $state([...(source?.strokes ?? [])]);
  let seq = 0;
  let levels = $state((source?.levels ?? [{}, {}, {}]).map((l) => ({ key: seq++, name: l.name ?? '', drill: l.drill ?? '', test: l.test ?? '', goal: l.goal ?? '' })));

  const used = $derived(id ? app.tracks[id]?.history.length > 0 : false);
  const valid = $derived(name.trim() && levels.length && levels.every((l) => l.name.trim() || l.drill.trim()));

  function set(key, patch) {
    levels = levels.map((l) => (l.key === key ? { ...l, ...patch } : l));
  }
  function addLevel() {
    if (levels.length < MAX_LEVELS) levels = [...levels, { key: seq++, name: '', drill: '', test: '', goal: '' }];
  }
  function up(i) {
    if (!i) return;
    const next = [...levels];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    levels = next;
  }
  function addStroke() {
    pickStroke({ onpick: (s) => s && !strokes.includes(s) && (strokes = [...strokes, s]) });
  }

  function save() {
    const t = app.saveCustom('tracks', {
      id: editing ? source.id : undefined,
      name: name.trim(),
      short: short.trim() || name.trim(),
      side: side === 'both' ? null : side,
      strokes,
      levels: levels.map((l, i) => ({ name: l.name.trim() || `Livello ${i + 1}`, drill: l.drill.trim(), test: l.test.trim(), goal: l.goal.trim() }))
    });
    ui.close();
    ui.toast(editing ? 'Percorso aggiornato' : `«${t.short}» creato: mettilo in un mese o in un modello`);
  }

  function archive() {
    ui.open('confirm', {
      title: used ? `Archiviare «${source.short}»?` : `Eliminare «${source.short}»?`,
      text: used ? 'Non compare più nelle scelte; i test già fatti restano nella storia.' : 'Non è mai stato usato.',
      action: used ? 'Archivia' : 'Elimina',
      danger: !used,
      onconfirm: () => {
        const raw = (app.meta?.custom?.tracks ?? []).find((t) => t.id === source.id);
        if (used) app.saveCustom('tracks', { ...raw, archived: true });
        else app.removeCustom('tracks', source.id);
        ui.closeAll();
      }
    });
  }
</script>

<Sheet title={editing ? 'Modifica percorso' : 'Nuovo percorso'} onclose={() => ui.close()} tall>
  <div class="stack g-24">
    <section class="stack g-8">
      <input class="field" placeholder="Nome (es. Flip di dritto su servizio corto)" bind:value={name} maxlength="80" />
      <input class="field" placeholder="Nome breve (es. Flip di dritto)" bind:value={short} maxlength="40" />
      <Segmented
        small
        options={[
          { id: 'D', label: 'Dritto' },
          { id: 'R', label: 'Rovescio' },
          { id: 'both', label: 'Tutti e due' }
        ]}
        value={side}
        onchange={(v) => (side = v)}
      />
    </section>

    <section class="stack g-8">
      <h3 class="heading">Colpi che allena</h3>
      <div class="chips">
        {#each strokes as s (s)}
          <button class="tag line" onclick={() => (strokes = strokes.filter((x) => x !== s))} title="Togli">{app.strokeName(s)} ×</button>
        {/each}
        <button class="chip mini" onclick={addStroke}><Plus size={13} /> Colpo</button>
      </div>
      <p class="small faint">Quando segni uno di questi colpi da correggere, l’app propone questo percorso.</p>
    </section>

    <section class="stack g-12">
      <h3 class="heading">Livelli · {levels.length}</h3>
      {#each levels as l, i (l.key)}
        <div class="lvl">
          <div class="spread">
            <span class="n mono">{i + 1}</span>
            <input class="field name" placeholder="Nome del livello" value={l.name} oninput={(e) => set(l.key, { name: e.currentTarget.value })} />
            {#if i}<button class="icon-btn" onclick={() => up(i)} aria-label="Sposta su"><ArrowUp size={15} /></button>{/if}
            {#if levels.length > 1}<button class="icon-btn" onclick={() => (levels = levels.filter((x) => x.key !== l.key))} aria-label="Togli"><X size={15} /></button>{/if}
          </div>
          <textarea class="field" placeholder="L’esercizio: cosa fa il compagno, cosa fai tu" value={l.drill} oninput={(e) => set(l.key, { drill: e.currentTarget.value })}></textarea>
          <input class="field" placeholder="Il test: 10 tentativi, cosa si conta" value={l.test} oninput={(e) => set(l.key, { test: e.currentTarget.value })} />
          <input class="field" placeholder="L’obiettivo: come deve venire la palla" value={l.goal} oninput={(e) => set(l.key, { goal: e.currentTarget.value })} />
        </div>
      {/each}
      {#if levels.length < MAX_LEVELS}
        <button class="btn ghost small self" onclick={addLevel}><Plus size={16} /> Livello</button>
      {/if}
      <p class="small faint">Dal più guidato al punto giocato. Si sale con due test di fila da almeno {app.rules.up} su 10.</p>
    </section>

    {#if editing}
      <button class="btn plain danger del" onclick={archive}><Archive size={16} /> {used ? 'Archivia' : 'Elimina'}</button>
    {/if}
  </div>

  {#snippet footer()}
    <button class="btn primary wide" onclick={save} disabled={!valid}>Salva</button>
  {/snippet}
</Sheet>

<style>
  .lvl {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: var(--r);
    border: 1px solid var(--line);
    background: var(--card);
  }
  .lvl .spread {
    gap: 6px;
  }
  .lvl .icon-btn {
    width: 32px;
    height: 32px;
    flex: none;
  }
  .lvl textarea.field {
    min-height: 64px;
  }
  .field.name {
    flex: 1;
    min-width: 0;
  }
  .n {
    width: 22px;
    flex: none;
    color: var(--accent-ink);
    font-weight: 600;
    text-align: center;
  }
  .chip.mini {
    min-height: 30px;
    padding: 4px 12px;
    font-size: 13px;
  }
  .self {
    align-self: flex-start;
  }
  .del {
    align-self: center;
  }
</style>
