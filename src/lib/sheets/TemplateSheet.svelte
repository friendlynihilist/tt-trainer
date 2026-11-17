<script>
  // Un modello di allenamento: la scaletta, passo per passo. Quelli di base si guardano e si
  // duplicano; quelli tuoi si modificano. «Componi tu» lascia fare al suggeritore.
  import Plus from '@lucide/svelte/icons/plus';
  import Minus from '@lucide/svelte/icons/minus';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import X from '@lucide/svelte/icons/x';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Copy from '@lucide/svelte/icons/copy';
  import Trash from '@lucide/svelte/icons/trash';
  import Play from '@lucide/svelte/icons/play';
  import { app } from '../store/app.svelte.js';
  import { ui, buzz } from '../store/ui.svelte.js';
  import { startItem, weekOf } from '../store/actions.js';
  import { COLORS, STEP_TYPES, templateMinutes } from '../data/templates.js';
  import { suggestSession } from '../engine/suggest.js';
  import { pickTrack } from '../ui/pickers.js';
  import Sheet from '../ui/Sheet.svelte';

  let { id = null, draft = null } = $props();

  const source = draft ?? (id ? app.catalog.templates[id] : null);
  const readonly = Boolean(source && !source.custom && !draft);

  let name = $state(source?.name ?? '');
  let color = $state(source?.color ?? 'violet');
  let steps = $state((source?.steps ?? [{ type: 'warmup', minutes: 10 }, { type: 'focus', slot: 1, minutes: 25 }, { type: 'match', minutes: 15 }]).map((s, i) => ({ ...s, key: i })));
  let target = $state(templateMinutes(source) || 90);
  let seq = steps.length;

  const total = $derived(steps.reduce((n, s) => n + (Number(s.minutes) || 0), 0));
  const block = $derived(weekOf(app.today)?.focusBlock ?? app.catalog.block('1'));
  const usedBy = $derived(id ? (app.plan?.slots ?? []).filter((s) => s.template === id).length : 0);

  function describe(s) {
    if (s.type === 'focus') {
      const t = app.catalog.track(block.tracks[(s.slot ?? 1) - 1]);
      return t ? `${s.slot ?? 1}° del mese · ora ${t.short}` : `${s.slot ?? 1}° del mese · questo mese non c’è`;
    }
    if (s.type === 'track') return app.catalog.track(s.track)?.short ?? 'Scegli il percorso';
    if (s.type === 'free') return s.name || 'Esercizio libero';
    return STEP_TYPES[s.type].hint;
  }

  function update(key, patch) {
    steps = steps.map((s) => (s.key === key ? { ...s, ...patch } : s));
  }
  function minutes(key, delta) {
    buzz();
    steps = steps.map((s) => (s.key === key ? { ...s, minutes: Math.max(5, Math.min(120, (Number(s.minutes) || 0) + delta)) } : s));
  }
  function up(i) {
    if (!i) return;
    const next = [...steps];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    steps = next;
  }
  function add(type) {
    buzz();
    const s = { key: seq++, type, minutes: STEP_TYPES[type].minutes };
    if (type === 'focus') s.slot = Math.min(3, steps.filter((x) => x.type === 'focus').length + 1);
    if (type === 'free') s.name = '';
    steps = [...steps, s];
    if (type === 'track') chooseTrack(s.key);
  }
  function chooseTrack(key) {
    pickTrack({ onpick: (track) => track && update(key, { track }) });
  }

  function compose() {
    const s = suggestSession({ week: weekOf(app.today), events: app.events, tracks: app.tracks, catalog: app.catalog, minutes: target });
    steps = s.template.steps.map((x) => ({ ...x, key: seq++ }));
    ui.toast(s.reasons[0] ?? 'Composto sul tuo livello e sul mese in corso');
  }

  const valid = $derived(name.trim() && steps.length && steps.every((s) => s.type !== 'track' || s.track));

  function clean() {
    return steps.map(({ key: _k, ...s }) => {
      const o = { type: s.type, minutes: Number(s.minutes) || STEP_TYPES[s.type].minutes };
      if (s.type === 'focus') o.slot = s.slot ?? 1;
      if (s.type === 'track') o.track = s.track;
      if (s.type === 'free') o.name = (s.name ?? '').trim() || 'Esercizio libero';
      if (s.text?.trim()) o.text = s.text.trim();
      return o;
    });
  }

  function save() {
    const t = app.saveCustom('templates', { id: source?.custom ? source.id : undefined, name: name.trim(), color, steps: clean() });
    ui.close();
    ui.toast(source?.custom ? 'Modello aggiornato' : `«${t.name}» è tra i tuoi modelli`);
  }

  function duplicate() {
    ui.close();
    ui.open('template', { draft: { name: `${source.name} (mio)`, color: source.color === 'blue' ? 'violet' : source.color, steps: source.steps } });
  }

  function remove() {
    ui.open('confirm', {
      title: `Eliminare «${source.name}»?`,
      text: usedBy ? 'È nel ritmo della settimana: lì diventa «Completo». Gli allenamenti già fatti restano nel diario.' : 'Gli allenamenti già fatti restano nel diario.',
      action: 'Elimina',
      danger: true,
      onconfirm: () => {
        app.removeCustom('templates', source.id);
        ui.close();
        ui.toast('Modello eliminato');
      }
    });
  }
</script>

<Sheet title={readonly ? source.name : source?.custom ? 'Modifica modello' : 'Nuovo modello'} onclose={() => ui.close()} tall>
  <div class="stack g-24">
    {#if readonly}
      <p class="muted">{source.about}</p>
      <ol class="steps ro">
        {#each source.steps as s, i (i)}
          <li>
            <span class="mono min">{s.minutes}′</span>
            <span class="grow"><strong>{s.type === 'free' ? s.name : STEP_TYPES[s.type].name}</strong><span class="small muted block">{describe(s)}</span></span>
          </li>
        {/each}
      </ol>
      <p class="small muted">{templateMinutes(source)} minuti. I modelli di base non si modificano: duplicalo e cambia quello che vuoi.</p>
    {:else}
      <input class="field" placeholder="Nome (es. Rovescio 60′)" bind:value={name} maxlength="60" />

      <div class="colors" role="radiogroup" aria-label="Colore">
        {#each COLORS as c (c)}
          <button class="sw" data-color={c} role="radio" aria-checked={color === c} aria-label={c} onclick={() => (color = c)}></button>
        {/each}
      </div>

      <section class="stack g-8">
        <div class="spread">
          <h3 class="heading">Passi · {total} min</h3>
        </div>
        {#each steps as s, i (s.key)}
          <div class="step" data-color={color}>
            <div class="spread">
              <span class="grow"><strong>{s.type === 'free' ? s.name || 'Esercizio libero' : STEP_TYPES[s.type].name}</strong></span>
              {#if i}<button class="icon-btn" onclick={() => up(i)} aria-label="Sposta su"><ArrowUp size={15} /></button>{/if}
              <button class="icon-btn" onclick={() => (steps = steps.filter((x) => x.key !== s.key))} aria-label="Togli"><X size={15} /></button>
            </div>
            <div class="spread">
              <span class="small muted grow">{describe(s)}</span>
              <span class="mins">
                <button class="icon-btn" onclick={() => minutes(s.key, -5)} aria-label="Meno minuti"><Minus size={14} /></button>
                <b class="mono">{s.minutes}′</b>
                <button class="icon-btn" onclick={() => minutes(s.key, 5)} aria-label="Più minuti"><Plus size={14} /></button>
              </span>
            </div>
            {#if s.type === 'focus'}
              <div class="chips">
                {#each [1, 2, 3] as n (n)}
                  <button class="chip mini" aria-pressed={(s.slot ?? 1) === n} onclick={() => update(s.key, { slot: n })}>{n}° del mese</button>
                {/each}
              </div>
            {:else if s.type === 'track'}
              <button class="btn ghost small self" onclick={() => chooseTrack(s.key)}>{s.track ? 'Cambia percorso' : 'Scegli il percorso'}</button>
            {:else if s.type === 'free'}
              <input class="field" placeholder="Nome dell’esercizio" value={s.name ?? ''} oninput={(e) => update(s.key, { name: e.currentTarget.value })} />
              <textarea class="field" placeholder="Cosa si fa" value={s.text ?? ''} oninput={(e) => update(s.key, { text: e.currentTarget.value })}></textarea>
            {:else if s.type === 'match'}
              <input class="field" placeholder="Regola (vuoto = quella del mese)" value={s.text ?? ''} oninput={(e) => update(s.key, { text: e.currentTarget.value })} />
            {/if}
          </div>
        {/each}

        <div class="chips add">
          {#each Object.entries(STEP_TYPES) as [type, t] (type)}
            <button class="chip mini" onclick={() => add(type)}><Plus size={13} /> {t.name}</button>
          {/each}
        </div>
      </section>

      <section class="card stack g-12 auto">
        <span class="row g-8"><Sparkles size={16} /><strong>Componi tu</strong></span>
        <p class="small muted">Il suggeritore riempie i passi dal tuo livello, dal mese in corso e da quello che segni da correggere.</p>
        <div class="row g-8 wrap">
          {#each [45, 60, 90, 120] as m (m)}
            <button class="chip mini" aria-pressed={target === m} onclick={() => (target = m)}>{m} min</button>
          {/each}
          <button class="btn ghost small" onclick={compose}>Componi</button>
        </div>
      </section>
    {/if}

    {#if source?.custom && !draft}
      <button class="btn plain danger del" onclick={remove}><Trash size={16} /> Elimina il modello</button>
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
      <button class="btn primary wide" onclick={save} disabled={!valid}>Salva</button>
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
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .steps li {
    display: flex;
    gap: 14px;
  }
  .min {
    width: 34px;
    color: var(--ink-2);
    font-size: 13px;
    padding-top: 2px;
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
    border-left: 3px solid var(--c);
    background: var(--card);
  }
  .step .icon-btn {
    width: 30px;
    height: 30px;
  }
  .mins {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex: none;
  }
  .mins b {
    width: 36px;
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
  .wrap {
    flex-wrap: wrap;
  }
  .auto {
    background: color-mix(in srgb, var(--c-plum) 7%, var(--card));
  }
  .del {
    align-self: center;
  }
</style>
