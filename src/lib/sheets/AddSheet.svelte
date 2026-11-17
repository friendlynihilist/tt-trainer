<script>
  // Il «+»: inizia, registra o metti in calendario. Oggi si può iniziare dal vivo; un giorno
  // passato si registra; un giorno futuro si pianifica. Qualsiasi modello, il test, le attività libere.
  import Play from '@lucide/svelte/icons/play';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { FREE_KINDS, KIND } from '../data/taxonomy.js';
  import { templateMinutes } from '../data/templates.js';
  import { suggestSession } from '../engine/suggest.js';
  import { startItem, pendingTest, planOn, weekOf } from '../store/actions.js';
  import { fmtLong } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import Segmented from '../ui/Segmented.svelte';

  let { date = null } = $props();

  const day = date ?? app.today;
  const isToday = day === app.today;
  const future = day > app.today;
  let mode = $state(future ? 'plan' : isToday ? 'live' : 'log');

  const templates = $derived(Object.values(app.catalog.templates));
  const auto = $derived(isToday ? suggestSession({ week: weekOf(day), events: app.events, tracks: app.tracks, catalog: app.catalog, date: day }) : null);
  const testToday = $derived(isToday ? pendingTest(day) : null);

  function pickTraining(t) {
    ui.close();
    if (mode === 'live') startItem(null, { template: t });
    else if (mode === 'plan') planOn(day, 'training', t.id);
    else ui.open('event', { draft: { kind: 'training', template: t.id, date: day } });
  }

  function pickKind(kind) {
    ui.close();
    if (mode === 'live' && kind === 'test') startItem({ kind: 'test' });
    else if (mode === 'plan') planOn(day, kind);
    else ui.open('event', { draft: { kind, date: day } });
  }

  const title = $derived(isToday ? 'Oggi' : fmtLong(day));
</script>

<Sheet {title} onclose={() => ui.close()} tall>
  <div class="stack g-20">
    {#if isToday}
      <Segmented
        options={[
          { id: 'live', label: 'Inizia ora' },
          { id: 'log', label: 'Registra' },
          { id: 'plan', label: 'Più tardi' }
        ]}
        value={mode}
        onchange={(v) => (mode = v)}
      />
    {:else}
      <p class="muted small">{future ? 'Mettilo in calendario: lo ritrovi in Oggi quel giorno.' : 'Registra quello che hai fatto.'}</p>
    {/if}

    <section class="stack g-8">
      <h3 class="heading">Allenamento</h3>
      {#if auto && mode === 'live'}
        <button class="opt hero" onclick={() => pickTraining(auto.template)}>
          <span class="ic"><Sparkles size={18} /></span>
          <span class="grow">
            <strong>Su misura</strong>
            <span class="small block">{auto.reasons[0] ?? 'Composto dal tuo livello e dal mese in corso'}</span>
          </span>
        </button>
      {/if}
      {#each templates as t (t.id)}
        <button class="opt" data-color={t.color} onclick={() => pickTraining(t)}>
          <span class="ic dot">{#if mode === 'live'}<Play size={15} fill="currentColor" />{/if}</span>
          <span class="grow">
            <strong>{t.name}</strong>
            <span class="small muted block">{templateMinutes(t)} min{t.custom ? ' · tuo' : ''}{mode === 'live' && testToday ? ' · con il test di oggi' : ''}</span>
          </span>
        </button>
      {/each}
    </section>

    <section class="stack g-8">
      <h3 class="heading">Altro</h3>
      <div class="kinds">
        {#each [KIND.test, ...FREE_KINDS] as k (k.id)}
          {#if !(mode === 'live' && k.id !== 'test')}
            <button class="opt small-opt" data-color={k.color} onclick={() => pickKind(k.id)}>
              <span class="pip"></span>
              <span class="grow"><strong>{k.short}</strong></span>
            </button>
          {/if}
        {/each}
      </div>
      {#if mode === 'live'}<p class="small faint">Lezioni, partite e tornei si registrano a cose fatte.</p>{/if}
    </section>
  </div>
</Sheet>

<style>
  .opt {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 12px 14px;
    border-radius: var(--r);
    background: var(--card);
    border: 1px solid var(--line);
    text-align: left;
    transition:
      transform 0.2s var(--ease),
      background 0.2s var(--ease);
  }
  .opt:active {
    transform: scale(0.985);
  }
  .opt.hero {
    background: var(--accent);
    border-color: transparent;
    color: #15171a;
  }
  .ic {
    display: grid;
    place-items: center;
    flex: none;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--sunk);
    color: var(--ink-2);
  }
  .ic.dot {
    background: color-mix(in srgb, var(--c) 16%, var(--card));
    box-shadow: inset 0 0 0 1.5px var(--c);
    color: var(--c);
  }
  .hero .ic {
    background: rgba(21, 23, 26, 0.12);
    color: #15171a;
  }
  .kinds {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .small-opt {
    padding: 12px 14px;
    gap: 10px;
  }
  .small-opt .pip {
    width: 10px;
    height: 10px;
  }
  strong {
    font-weight: 560;
  }
  .block {
    display: block;
  }
</style>
