<script>
  // Un mese: il tema, i suoi percorsi (fino a tre), il mantenimento, i servizi, la partitella.
  // I mesi di base si guardano e si duplicano; i tuoi si modificano e si mettono nel piano.
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import Copy from '@lucide/svelte/icons/copy';
  import Trash from '@lucide/svelte/icons/trash';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { SERVES } from '../data/catalog.js';
  import { SCHEMES, DEFAULT_SCHEME, MATCH_TYPES } from '../data/program.js';
  import { pickTrack } from '../ui/pickers.js';
  import Sheet from '../ui/Sheet.svelte';

  let { id = null, draft = null } = $props();

  const source = draft ?? (id ? app.catalog.block(id) : null);
  const readonly = Boolean(source && !source.custom && !draft);
  const raw = id ? (app.meta?.custom?.blocks ?? []).find((b) => b.id === id) : null;

  let theme = $state(source?.theme ?? '');
  let tracks = $state([...(source?.tracks ?? [])]);
  let maint = $state(source?.maint ?? null);
  let serve = $state(raw?.serve ?? draft?.serve ?? source?.serveId ?? (source?.serve?.id && SERVES[source.serve.id] ? source.serve.id : '1-S'));
  let scheme = $state(SCHEMES[draft?.scheme] ? draft.scheme : (source?.schemes?.[0] ?? DEFAULT_SCHEME));

  const inPlan = $derived(id ? (app.plan?.weeks ?? []).includes(id) : false);
  const valid = $derived(theme.trim() && tracks.length);

  function addTrack() {
    pickTrack({ exclude: tracks, onpick: (t) => t && (tracks = [...tracks, t].slice(0, 3)) });
  }
  function chooseMaint() {
    pickTrack({ title: 'Mantenimento', exclude: tracks, value: maint, onpick: (t) => (maint = t) });
  }
  function chooseServe() {
    ui.open('pick', {
      title: 'Servizi e ricezione',
      value: serve,
      groups: [{ options: Object.entries(SERVES).map(([sid, s]) => ({ id: sid, label: s.label, hint: s.server })) }],
      onpick: (v) => v && (serve = v)
    });
  }

  function chooseScheme() {
    ui.open('pick', {
      title: 'Schema della partitella',
      value: scheme,
      groups: [{ options: Object.values(SCHEMES).map((x) => ({ id: x.id, label: x.name, hint: x.text })) }],
      onpick: (v) => v && (scheme = v)
    });
  }

  function save() {
    app.saveCustom('blocks', { id: source?.custom ? source.id : undefined, theme: theme.trim(), tracks, maint, serve, scheme });
    ui.close();
    ui.toast(source?.custom ? 'Mese aggiornato' : 'Mese creato: lo trovi quando crei un ciclo');
  }

  function duplicate() {
    ui.close();
    ui.open('block', { draft: { theme: `${source.theme} (mio)`, tracks: source.tracks, maint: source.maint, serve: source.serve?.id ?? '1-S', scheme: source.schemes?.[0] } });
  }

  function remove() {
    ui.open('confirm', {
      title: `Eliminare «${source.theme}»?`,
      text: inPlan ? 'È nel piano in corso: quelle settimane useranno il mese più vicino.' : 'Il diario non cambia.',
      action: 'Elimina',
      danger: true,
      onconfirm: () => {
        app.removeCustom('blocks', source.id);
        ui.close();
      }
    });
  }
</script>

<Sheet title={readonly ? `${source.label} · ${source.theme}` : source?.custom ? 'Modifica mese' : 'Nuovo mese'} onclose={() => ui.close()} tall>
  <div class="stack g-24">
    {#if !readonly}
      <input class="field" placeholder="Tema (es. Gioco corto)" bind:value={theme} maxlength="60" />
    {/if}

    <section class="stack g-8">
      <h3 class="heading">Percorsi del mese</h3>
      <div class="card flush list">
        {#each tracks as t, i (t)}
          <div class="row-i">
            <span class="n mono">{i + 1}°</span>
            <span class="grow">{app.catalog.track(t)?.name ?? 'Percorso non disponibile'}</span>
            {#if !readonly}<button class="icon-btn" onclick={() => (tracks = tracks.filter((x) => x !== t))} aria-label="Togli"><X size={16} /></button>{/if}
          </div>
        {/each}
      </div>
      {#if !readonly && tracks.length < 3}
        <button class="btn ghost small self" onclick={addTrack}><Plus size={16} /> Percorso</button>
      {/if}
      <p class="small faint">Nei modelli, «1° del mese» è il primo di questa lista, e così via.</p>
    </section>

    <section class="stack g-8">
      <h3 class="heading">Mantenimento</h3>
      {#if readonly}
        <p>{maint ? app.catalog.track(maint).name : 'Nessuno'}</p>
      {:else}
        <div class="row g-8">
          <button class="btn ghost small" onclick={chooseMaint}>{maint ? app.catalog.track(maint)?.short : 'Nessuno'}</button>
          {#if maint}<button class="link" onclick={() => (maint = null)}>Togli</button>{/if}
        </div>
      {/if}
      <p class="small faint">Gli ultimi 5 minuti del riscaldamento, per non perdere quello che hai già.</p>
    </section>

    <section class="stack g-8">
      <h3 class="heading">Servizi e ricezione</h3>
      {#if readonly}
        <p>{source.serve.server}</p>
        <p class="small muted">{source.serve.receiver}</p>
      {:else}
        <button class="select" onclick={chooseServe}>
          <span class="grow">{SERVES[serve]?.label}</span>
        </button>
        <p class="small muted">{SERVES[serve]?.server}</p>
      {/if}
    </section>

    <section class="stack g-8">
      <h3 class="heading">Partitella</h3>
      <p class="small muted">Metà tempo {MATCH_TYPES.risk.name.toLowerCase()}, metà {MATCH_TYPES.scheme.name.toLowerCase()}.</p>
      {#if readonly}
        {#each source.schemes as x (x)}
          <p><strong>{SCHEMES[x].name}.</strong> <span class="muted">{SCHEMES[x].text}</span></p>
        {/each}
      {:else}
        <button class="select" onclick={chooseScheme}>
          <span class="grow">{SCHEMES[scheme]?.name}</span>
        </button>
        <p class="small muted">{SCHEMES[scheme]?.text}</p>
      {/if}
    </section>

    {#if source?.custom && !draft}
      <button class="btn plain danger del" onclick={remove}><Trash size={16} /> Elimina il mese</button>
    {/if}
  </div>

  {#snippet footer()}
    {#if readonly}
      <button class="btn ghost wide" onclick={duplicate}><Copy size={16} /> Duplica e modifica</button>
    {:else}
      <button class="btn primary wide" onclick={save} disabled={!valid}>Salva</button>
    {/if}
  {/snippet}
</Sheet>

<style>
  .row-i {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 6px 6px 6px 16px;
  }
  .row-i .icon-btn {
    width: 34px;
    height: 34px;
  }
  .n {
    width: 24px;
    color: var(--accent-ink);
    font-weight: 600;
  }
  .self {
    align-self: flex-start;
  }
  .select {
    display: flex;
    align-items: center;
    min-height: 48px;
    padding: 12px 14px;
    border-radius: var(--r-s);
    border: 1px solid var(--line-strong);
    background: var(--card);
    text-align: left;
  }
  .del {
    align-self: center;
  }
</style>
