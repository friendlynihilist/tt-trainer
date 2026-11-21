<script>
  // Un tuo allenamento: il nome (si cambia scrivendoci sopra), i mattoni, e quattro cose da farci:
  // metterlo a oggi, cambiare i mattoni, eliminarlo. Il nome scritto a mano resta anche se poi cambi
  // i mattoni; altrimenti segue quello che l'allenamento contiene.
  import Blocks from '@lucide/svelte/icons/blocks';
  import Trash from '@lucide/svelte/icons/trash-2';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { putToday } from '../store/actions.js';
  import { bricksOf, editableBricks, toTemplate, workoutName } from '../data/bricks.js';
  import { composeSession } from '../engine/compose.js';
  import Sheet from '../ui/Sheet.svelte';

  let { id } = $props();

  const raw = $derived((app.meta?.custom?.templates ?? []).find((t) => t.id === id) ?? null);
  const template = $derived(raw ? app.catalog.template(id) : null);
  const session = $derived(template ? composeSession({ week: app.week, template, catalog: app.catalog, medals: app.medals }) : null);
  const bricks = $derived(template ? bricksOf(template, app.catalog, session) : []);
  const exName = (x) => app.catalog.exercise(x)?.name ?? '';

  // svelte-ignore state_referenced_locally
  let name = $state(raw?.name ?? '');
  function rename() {
    const next = name.trim();
    if (!raw || next === raw.name) return;
    if (!next) {
      // Senza nome torna a chiamarsi per quello che contiene.
      name = workoutName(bricks.filter((b) => b.type));
      app.saveCustom('templates', { ...raw, name, named: false });
    } else app.saveCustom('templates', { ...raw, name: next, named: true });
  }
  function close() {
    rename();
    ui.close();
  }

  function today() {
    rename();
    putToday(id);
    ui.close();
    ui.go('oggi');
    ui.toast(`«${name.trim() || raw.name}» è l’allenamento di oggi`);
  }
  function rebuild() {
    rename();
    const mine = { ...raw, name: name.trim() || raw.name, named: Boolean(name.trim()) && (raw.named || name.trim() !== raw.name) };
    ui.close();
    ui.builder = {
      title: 'Cambia i mattoni',
      bricks: editableBricks(template, app.catalog, session),
      onsave: (list) => {
        app.saveCustom('templates', { ...mine, ...toTemplate(list, mine.named ? mine.name : null) });
        ui.toast('Salvato');
      }
    };
  }
  function remove() {
    ui.open('confirm', {
      title: `Eliminare «${raw.name}»?`,
      text: 'Gli allenamenti già fatti restano nel diario.',
      action: 'Elimina',
      danger: true,
      onconfirm: () => {
        app.removeCustom('templates', id);
        ui.closeAll();
        ui.toast('Allenamento eliminato');
      }
    });
  }
</script>

{#if raw}
  <Sheet title="Allenamento" onclose={close} tall>
    <input class="field name" bind:value={name} maxlength="40" aria-label="Nome dell’allenamento" onchange={rename} />
    <div class="stack-b">
      {#each bricks as b (b.id)}
        <div class="b" data-fam={b.fam} style:min-height="{Math.max(52, b.minutes * 3)}px">
          <span class="grow">
            <b>{b.name}</b>
            {#if b.exs.length}<small>{b.exs.map(exName).join(', ')}</small>{/if}
          </span>
          <span class="b-m">{b.minutes}′</span>
        </div>
      {/each}
    </div>
    <div class="rows">
      <button class="other" onclick={rebuild}>
        <Blocks size={20} />
        <span class="grow"><strong>Cambia i mattoni</strong></span>
        <ChevronRight size={18} />
      </button>
      <button class="other danger" onclick={remove}>
        <Trash size={20} />
        <span class="grow"><strong>Elimina</strong></span>
      </button>
    </div>
    {#snippet footer()}
      <button class="btn accent wide" onclick={today}>Mettilo oggi</button>
    {/snippet}
  </Sheet>
{/if}

<style>
  .name {
    margin-bottom: 14px;
    font-size: 20px;
    font-weight: 750;
    letter-spacing: -0.02em;
  }
  .stack-b {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .b {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px;
    border-radius: 16px;
    background: var(--f);
    color: var(--f-on);
    box-shadow: 0 4px 0 var(--f-edge);
  }
  .b b {
    display: block;
    font-weight: 750;
  }
  .b small {
    display: block;
    font-size: 13px;
    opacity: 0.9;
  }
  .b-m {
    flex: none;
    font-size: 20px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .rows {
    display: flex;
    flex-direction: column;
    margin-top: 16px;
  }
  .other {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 56px;
    padding: 8px 2px;
    text-align: left;
  }
  .other + .other {
    border-top: 1px solid var(--line);
  }
  .danger {
    color: var(--down);
  }
</style>
