<script>
  // Un percorso tuo: una sequenza di esercizi, dal più guidato al più libero. Ogni passo è un
  // esercizio della libreria oppure uno scritto da te, con il suo test su 10 e i suoi gradini.
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import Archive from '@lucide/svelte/icons/archive';
  import { app, newId } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { MAX_LEVELS, CUSTOM_GOALS } from '../data/catalog.js';
  import { pickStroke, pickExercise } from '../ui/pickers.js';
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

  const own = (l = {}) => ({
    key: seq++,
    kind: 'own',
    name: l.name ?? '',
    drill: l.drill ?? '',
    test: l.test ?? '',
    goal: l.goal ?? '',
    goals: { ...CUSTOM_GOALS, ...(l.goals ?? {}) }
  });
  const ref = (ex) => ({ key: seq++, kind: 'ref', ex });

  /** Gli esercizi della sequenza: della libreria (ref) o scritti qui (own). */
  function initialItems() {
    if (!source) return [own(), own(), own()];
    const levels = source.levels ?? [];
    const ids = source.sequence ?? levels.map((l) => l.id);
    return ids.map((exId) => {
      const level = levels.find((l) => l.id === exId);
      return level ? own(level) : ref(exId);
    });
  }
  let items = $state(initialItems());

  const used = $derived(
    Boolean(id) && (app.attempts.some((a) => a.ex.startsWith(`${id}-`)) || app.events.some((e) => (e.tests ?? []).some((t) => t.track === id)))
  );
  const valid = $derived(name.trim() && items.length && items.every((l) => l.kind === 'ref' || l.name.trim() || l.drill.trim()));

  function set(key, patch) {
    items = items.map((l) => (l.key === key ? { ...l, ...patch } : l));
  }
  function setGoal(key, tier, v) {
    items = items.map((l) => (l.key === key ? { ...l, goals: { ...l.goals, [tier]: Math.max(0, Math.min(10, Number(v) || 0)) } } : l));
  }
  function up(i) {
    if (!i) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    items = next;
  }
  function addOwn() {
    if (items.length < MAX_LEVELS * 2) items = [...items, own()];
  }
  function addRef() {
    pickExercise({ title: 'Aggiungi un esercizio', onpick: (ex) => ex && (items = [...items, ref(ex)]) });
  }
  function addStroke() {
    pickStroke({ onpick: (s) => s && !strokes.includes(s) && (strokes = [...strokes, s]) });
  }

  function save() {
    const trackId = editing ? source.id : newId('c');
    const levels = [];
    const sequence = items.map((it) => {
      if (it.kind === 'ref') return it.ex;
      const goals = Object.fromEntries(Object.entries(it.goals).filter(([, v]) => v > 0));
      levels.push({ name: it.name.trim() || `Esercizio ${levels.length + 1}`, drill: it.drill.trim(), test: it.test.trim(), goal: it.goal.trim(), goals });
      return `${trackId}-${levels.length}`;
    });
    const t = app.saveCustom('tracks', {
      id: trackId,
      name: name.trim(),
      short: short.trim() || name.trim(),
      side: side === 'both' ? null : side,
      strokes,
      levels: levels.slice(0, MAX_LEVELS),
      sequence
    });
    ui.close();
    ui.toast(editing ? 'Percorso aggiornato' : `«${t.short}» creato: mettilo in un tema o in un modello`);
  }

  function archive() {
    ui.open('confirm', {
      title: used ? `Archiviare «${source.short}»?` : `Eliminare «${source.short}»?`,
      text: used ? 'Non compare più nelle scelte; le misure già fatte restano nella storia.' : 'Non è mai stato usato.',
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
      <p class="small faint">Quando segni uno di questi colpi da correggere, l’app propone anche i tuoi esercizi.</p>
    </section>

    <section class="stack g-12">
      <h3 class="heading">Esercizi in ordine · {items.length}</h3>
      {#each items as l, i (l.key)}
        <div class="lvl">
          <div class="spread">
            <span class="n mono">{i + 1}</span>
            {#if l.kind === 'ref'}
              <span class="grow ref">{app.catalog.exercise(l.ex)?.name ?? 'Esercizio non più disponibile'}<span class="small muted block">Dalla libreria</span></span>
            {:else}
              <input class="field name" placeholder="Nome dell’esercizio" value={l.name} oninput={(e) => set(l.key, { name: e.currentTarget.value })} />
            {/if}
            {#if i}<button class="icon-btn" onclick={() => up(i)} aria-label="Sposta su"><ArrowUp size={15} /></button>{/if}
            {#if items.length > 1}<button class="icon-btn" onclick={() => (items = items.filter((x) => x.key !== l.key))} aria-label="Togli"><X size={15} /></button>{/if}
          </div>
          {#if l.kind === 'own'}
            <textarea class="field" placeholder="L’esercizio: cosa fa il compagno, cosa fai tu" value={l.drill} oninput={(e) => set(l.key, { drill: e.currentTarget.value })}></textarea>
            <input class="field" placeholder="Il test: 10 tentativi, cosa si conta" value={l.test} oninput={(e) => set(l.key, { test: e.currentTarget.value })} />
            <input class="field" placeholder="La qualità: come deve venire la palla" value={l.goal} oninput={(e) => set(l.key, { goal: e.currentTarget.value })} />
            <div class="goals">
              {#each [['B', 'Bronzo'], ['A', 'Argento'], ['O', 'Oro']] as [t, label] (t)}
                <label data-tier={t}>
                  <span class="small muted">{label}</span>
                  <input class="field" type="number" inputmode="numeric" min="1" max="10" value={l.goals[t]} oninput={(e) => setGoal(l.key, t, e.currentTarget.value)} />
                </label>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
      <div class="row g-8">
        <button class="btn ghost small" onclick={addRef}><Plus size={16} /> Dalla libreria</button>
        {#if items.filter((x) => x.kind === 'own').length < MAX_LEVELS}
          <button class="btn ghost small" onclick={addOwn}><Plus size={16} /> Scritto da te</button>
        {/if}
      </div>
      <p class="small faint">Dal più guidato al punto giocato. Gli esercizi scritti da te si misurano su 10: le soglie sono quelle delle medaglie.</p>
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
  .ref {
    font-weight: 560;
  }
  .block {
    display: block;
    font-weight: 400;
  }
  .goals {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .goals label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .goals label .small {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .goals label .small::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--m);
  }
  .goals .field {
    min-height: 40px;
    padding: 8px 10px;
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
  .del {
    align-self: center;
  }
</style>
