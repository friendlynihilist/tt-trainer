<script>
  // Aggiungere una voce a un giorno del Diario. La prima cosa che si vede sono i tipi di attività:
  // allenamento, lezione, partite, torneo, servizi, test, altro. Un giorno passato si registra, uno
  // futuro si mette in programma; oggi si può fare l'una o l'altra cosa («Già fatto» o «In
  // programma»). Solo l'allenamento ha un secondo passo: quale. Per cominciare subito un allenamento
  // ci sono «Inizia» in Oggi e il tasto +.
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { KIND } from '../data/taxonomy.js';
  import { templateMinutes } from '../data/templates.js';
  import { packagesOf } from '../data/packages.js';
  import { planOn } from '../store/actions.js';
  import { fmtLong } from '../util/dates.js';
  import Sheet from '../ui/Sheet.svelte';
  import Segmented from '../ui/Segmented.svelte';

  let { date = null } = $props();

  const day = date ?? app.today;
  const isToday = day === app.today;
  const future = day > app.today;
  /** 'log' registra una cosa fatta, 'plan' la mette in programma. */
  let mode = $state(future ? 'plan' : 'log');
  /** 'kind' la scelta del tipo, 'training' la scelta dell'allenamento. */
  let step = $state('kind');

  // L'ordine dell'elenco: prima l'allenamento, poi le attività che non lo sono, il test e il resto.
  const KINDS_ORDER = ['training', 'lezione', 'partite', 'torneo', 'servizi', 'test', 'altro'].map((id) => KIND[id]);
  // Prima i pacchetti del tuo livello, poi i modelli.
  const templates = $derived([...packagesOf(app.player.level), ...Object.values(app.catalog.templates)]);

  function pickKind(kind) {
    if (kind === 'training') {
      step = 'training';
      return;
    }
    ui.close();
    if (mode === 'plan') planOn(day, kind);
    else ui.open('event', { draft: { kind, date: day } });
  }

  function pickTraining(t) {
    ui.close();
    if (mode === 'plan') planOn(day, 'training', t.id);
    else ui.open('event', { draft: { kind: 'training', template: t.id, date: day } });
  }

  const title = $derived(isToday ? 'Oggi' : fmtLong(day).replace(/^./, (c) => c.toUpperCase()));
  const lead = $derived(mode === 'log' ? 'Cosa hai fatto?' : isToday ? 'Cosa farai? Lo ritrovi in Oggi.' : 'Cosa metti in programma? Lo ritrovi in Oggi quel giorno.');
</script>

<Sheet {title} onclose={() => ui.close()} tall>
  <div class="stack g-16">
    {#if step === 'kind'}
      {#if isToday}
        <Segmented
          options={[
            { id: 'log', label: 'Già fatto' },
            { id: 'plan', label: 'In programma' }
          ]}
          value={mode}
          onchange={(v) => (mode = v)}
        />
      {/if}
      <p class="muted lead">{lead}</p>
      <div class="card flush list">
        {#each KINDS_ORDER as k (k.id)}
          <button class="kind" data-color={k.color} onclick={() => pickKind(k.id)}>
            <i class="pip" aria-hidden="true"></i>
            <strong class="grow">{k.name}</strong>
            {#if k.id === 'training'}<span class="go"><ChevronRight size={18} /></span>{/if}
          </button>
        {/each}
      </div>
    {:else}
      <button class="back" onclick={() => (step = 'kind')}><ChevronLeft size={18} /> Tutte le attività</button>
      <p class="muted lead">{mode === 'log' ? 'Quale allenamento hai fatto?' : 'Quale allenamento?'}</p>
      <div class="card flush list">
        {#each templates as t (t.id)}
          <button class="kind" data-color={t.color} onclick={() => pickTraining(t)}>
            <i class="pip" aria-hidden="true"></i>
            <span class="grow">
              <strong>{t.name}</strong>{#if t.custom}<span class="mine">tuo</span>{/if}
              {#if !t.name.includes(String(templateMinutes(t)))}<span class="small muted block">{templateMinutes(t)} min</span>{/if}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</Sheet>

<style>
  .lead {
    margin: 0;
  }
  .kind {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 56px;
    padding: 12px 16px;
    text-align: left;
  }
  .kind + .kind {
    border-top: 1px solid var(--line);
  }
  .kind:active {
    background: var(--sunk);
  }
  .pip {
    flex: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c);
  }
  .go {
    display: grid;
    color: var(--ink-3);
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    align-self: flex-start;
    min-height: 40px;
    margin: -6px 0 -6px -6px;
    padding: 0 10px 0 4px;
    border-radius: 999px;
    font-weight: 600;
    color: var(--accent-ink, var(--accent));
  }
  .mine {
    margin-left: 8px;
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--sunk);
    font-size: 12px;
    font-weight: 650;
    color: var(--ink-2);
  }
  strong {
    font-weight: 600;
  }
  .block {
    display: block;
  }
</style>
