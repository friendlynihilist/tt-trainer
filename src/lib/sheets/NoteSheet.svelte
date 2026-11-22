<script>
  // Una nota: un testo, una data e la cosa a cui è legata. «Su un colpo»: il colpo, come lo senti
  // (da 1 a 5) e, se vuoi, l'esercizio in cui è nata. «Su altro»: un allenamento, un torneo, o niente.
  // Con `quick` (durante la sessione) solo testo e sensazione: colpo, esercizio e data sono già
  // quelli dell'esercizio in corso.
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Trash from '@lucide/svelte/icons/trash';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { isValidNote } from '../engine/notes.js';
  import { exerciseLabel } from '../data/catalog.js';
  import { entryName } from '../data/bricks.js';
  import { fmtLong, fmtShort } from '../util/dates.js';
  import { pickStroke, pickExercise } from '../ui/pickers.js';
  import Sheet from '../ui/Sheet.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import FeelPicker from '../ui/FeelPicker.svelte';

  // draft: { stroke, ex, date, eventId, about, linked }. `about: 'altro'` apre la nota senza colpo;
  // `linked` è il nome della voce a cui è legata, quando la voce non è ancora nel diario.
  let { id = null, draft = null, onsaved = null, quick = false } = $props();

  const original = id ? (app.notes.find((n) => n.id === id) ?? null) : null;
  const base = original ?? { date: app.today, text: '', feel: null, ...draft };

  let about = $state(original ? (original.stroke ? 'colpo' : 'altro') : draft?.about === 'altro' ? 'altro' : 'colpo');
  let stroke = $state(base.stroke ?? null);
  let date = $state(base.date);
  let text = $state(base.text ?? '');
  let feel = $state(base.feel ?? null);
  let ex = $state(base.ex ?? null);

  const onStroke = $derived(about === 'colpo');
  const valid = $derived(isValidNote({ stroke: onStroke ? stroke : null, date, text, feel }) && (!onStroke || Boolean(stroke)));
  // La voce del diario a cui è legata: «Torneo · dom 15 nov».
  const event = base.eventId ? app.eventById(base.eventId) : null;
  const linked = event ? `${entryName(event, app.catalog)} · ${fmtShort(event.date)}` : (draft?.linked ?? '');

  function save() {
    const n = app.saveNote({
      ...(original ?? {}),
      id: original?.id,
      stroke: onStroke ? stroke : null,
      date,
      text,
      feel: onStroke ? feel : null,
      ex: onStroke ? ex : null,
      eventId: base.eventId ?? null
    });
    ui.close();
    // La prima volta si dice dove restano le note.
    const first = !original && !app.meta?.noteTold;
    if (first) app.patchMeta({ noteTold: true });
    ui.toast(original ? 'Nota aggiornata' : first ? 'Nota salvata. Le ritrovi tutte nel Diario, in «Note».' : 'Nota salvata', first ? { ms: 5200 } : undefined);
    onsaved?.(n);
  }

  function remove() {
    ui.open('confirm', {
      title: 'Eliminare questa nota?',
      text: 'Non si può annullare.',
      action: 'Elimina',
      danger: true,
      onconfirm: () => {
        app.deleteNote(original.id);
        ui.closeAll();
        ui.toast('Nota eliminata');
      }
    });
  }
</script>

<Sheet title={quick ? app.strokeName(stroke) : original ? 'Modifica nota' : 'Nuova nota'} onclose={() => ui.close()} tall={!quick}>
  <div class="stack g-16">
    {#if !quick}
      <Segmented
        options={[
          { id: 'colpo', label: 'Su un colpo' },
          { id: 'altro', label: 'Su altro' }
        ]}
        value={about}
        onchange={(v) => (about = v)}
      />
      {#if onStroke}
        <button class="select" class:empty={!stroke} onclick={() => pickStroke({ value: stroke, onpick: (s) => s && (stroke = s) })}>
          <span class="grow">{stroke ? app.strokeName(stroke) : 'Scegli il colpo'}</span>
          <ChevronDown size={18} />
        </button>
      {:else if linked}
        <p class="muted linked">{linked}</p>
      {/if}
    {/if}

    <textarea class="field big" placeholder={onStroke ? 'Come lo senti? Cosa vuoi migliorare?' : 'Cosa ha funzionato, cosa no'} bind:value={text}></textarea>

    {#if onStroke}
      <div class="stack g-8">
        <span class="heading">Come lo senti</span>
        <FeelPicker value={feel} onchange={(v) => (feel = v)} />
      </div>
    {/if}

    {#if !quick}
      {#if onStroke}
        <button class="select" class:empty={!ex} onclick={() => pickExercise({ title: 'Esercizio', value: ex, other: true, onpick: (v) => (ex = v) })}>
          <span class="grow">{ex ? exerciseLabel(ex, app.catalog) : 'Esercizio (facoltativo)'}</span>
          <ChevronDown size={18} />
        </button>
      {/if}

      {#if !base.eventId}
        <div class="stack g-4">
          <input class="field" type="date" bind:value={date} aria-label="Data" />
          {#if date}<p class="small muted when">{fmtLong(date)}</p>{/if}
        </div>
      {/if}
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
  .select {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 48px;
    padding: 0 14px;
    border-radius: var(--r-s);
    border: 1px solid var(--line-strong);
    background: var(--card);
    font-size: 16px;
    text-align: left;
  }
  .select.empty {
    color: var(--ink-3);
  }
  .select :global(svg) {
    color: var(--ink-3);
    flex: none;
  }
  textarea.big {
    min-height: 180px;
  }
  .when::first-letter {
    text-transform: uppercase;
  }
  .del {
    align-self: center;
  }
  .linked {
    margin: 0;
    font-weight: 600;
  }
</style>
