<script>
  // Il livello del giocatore. Si sceglie al primo accesso dopo l'aggiornamento (auto) e si cambia
  // quando si vuole da Impostazioni. Se al primo accesso si chiude senza scegliere: principiante.
  import { onDestroy } from 'svelte';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { DEFAULT_LEVEL } from '../data/library.js';
  import Sheet from '../ui/Sheet.svelte';
  import LevelPicker from '../ui/LevelPicker.svelte';

  let { auto = false } = $props();

  let level = $state(app.player.chosen ? app.player.level : null);
  let saved = false;

  function save() {
    saved = true;
    if (level !== app.player.level || !app.player.chosen) app.setPlayerLevel(level, 'scelto');
    ui.close();
    ui.toast('Livello salvato');
  }

  onDestroy(() => {
    if (auto && !saved && !app.player.chosen) app.setPlayerLevel(DEFAULT_LEVEL, 'predefinito');
  });
</script>

<Sheet title="Il tuo livello" onclose={() => ui.close()} tall>
  <div class="stack g-16">
    <p class="muted">
      {#if auto}Da questa versione scegli tu il tuo livello.{/if}
      Serve solo a proporti esercizi adatti: puoi fare tutto, a qualsiasi livello. Lo cambi quando vuoi.
    </p>
    <LevelPicker value={level} onchange={(v) => (level = v)} />
    {#if auto}<p class="small faint">Se chiudi senza scegliere, parti da principiante.</p>{/if}
  </div>

  {#snippet footer()}
    <button class="btn primary wide" onclick={save} disabled={!level}>Salva</button>
  {/snippet}
</Sheet>
