<script>
  // Un tuo allenamento: il nome (si cambia scrivendoci sopra), i fondamentali, e tre cose da farci:
  // metterlo in calendario, cambiare i fondamentali, eliminarlo. Il nome scritto a mano resta anche se poi cambi
  // i fondamentali; altrimenti segue quello che l'allenamento contiene.
  import Blocks from '@lucide/svelte/icons/blocks';
  import Trash from '@lucide/svelte/icons/trash-2';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { bricksOf, editableBricks, toTemplate, workoutName } from '../data/bricks.js';
  import { composeSession } from '../engine/compose.js';
  import Sheet from '../ui/Sheet.svelte';
  import BrickStack from '../ui/BrickStack.svelte';

  let { id } = $props();

  const raw = $derived((app.meta?.custom?.templates ?? []).find((t) => t.id === id) ?? null);
  const template = $derived(raw ? app.catalog.template(id) : null);
  const session = $derived(template ? composeSession({ week: app.week, template, catalog: app.catalog, medals: app.medals }) : null);
  const bricks = $derived(template ? bricksOf(template, app.catalog, session) : []);

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

  function schedule() {
    rename();
    ui.open('when', { id });
  }
  function rebuild() {
    rename();
    const mine = { ...raw, name: name.trim() || raw.name, named: Boolean(name.trim()) && (raw.named || name.trim() !== raw.name) };
    ui.close();
    ui.builder = {
      title: 'Cambia i fondamentali',
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
    <BrickStack {bricks} />
    <div class="rows">
      <button class="other" onclick={rebuild}>
        <Blocks size={20} />
        <span class="grow"><strong>Cambia i fondamentali</strong></span>
        <ChevronRight size={18} />
      </button>
      <button class="other danger" onclick={remove}>
        <Trash size={20} />
        <span class="grow"><strong>Elimina</strong></span>
      </button>
    </div>
    {#snippet footer()}
      <button class="btn accent wide" onclick={schedule}>Mettilo in calendario</button>
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
