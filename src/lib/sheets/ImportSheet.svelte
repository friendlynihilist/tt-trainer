<script>
  // Importa percorsi, mesi e modelli da un testo: per esempio preparato da un assistente con le
  // istruzioni che si copiano da qui. Prima di salvare si vede cosa entra.
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { parseImport, importPrompt } from '../data/importer.js';
  import Sheet from '../ui/Sheet.svelte';

  let text = $state('');
  const result = $derived(text.trim() ? parseImport(text, app.catalog) : null);
  const count = $derived(result ? result.tracks.length + result.blocks.length + result.templates.length : 0);
  const existing = $derived.by(() => {
    const ids = new Set([...(app.meta?.custom?.tracks ?? []), ...(app.meta?.custom?.blocks ?? []), ...(app.meta?.custom?.templates ?? [])].map((x) => x.id));
    return result ? [...result.tracks, ...result.blocks, ...result.templates].filter((x) => ids.has(x.id)).length : 0;
  });

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(importPrompt());
      ui.toast('Istruzioni copiate: incollale a Claude');
    } catch {
      ui.toast('Non riesco a copiare: seleziona il testo a mano', { tone: 'error' });
    }
  }

  function save() {
    app.saveCustomMany({ tracks: result.tracks, blocks: result.blocks, templates: result.templates });
    ui.close();
    ui.toast(`Importati: ${count}`);
  }
</script>

<Sheet title="Importa" onclose={() => ui.close()} tall>
  <div class="stack g-20">
    <div class="card stack g-8 how">
      <strong>Da un assistente</strong>
      <p class="small muted">Copia le istruzioni e incollale in una chat con Claude, insieme alla tua richiesta. Per esempio: «Crea tre esercizi per il flip di dritto e un mese di allenamento dedicato al flip.» Poi incolla qui la risposta.</p>
      <button class="btn ghost small self" onclick={copyPrompt}><ClipboardCopy size={16} /> Copia le istruzioni</button>
    </div>

    <textarea class="field code" placeholder={'{ "percorsi": [ … ], "mesi": [ … ], "allenamenti": [ … ] }'} bind:value={text} spellcheck="false"></textarea>

    {#if result}
      <div class="stack g-8">
        {#each result.errors as e (e)}<p class="small err">{e}</p>{/each}
        {#each result.warnings as w (w)}<p class="small warn">{w}</p>{/each}
        {#if count}
          <div class="card flush list">
            {#each result.tracks as t (t.id)}
              <div class="item"><span class="tag line">percorso</span><span class="grow">{t.name}<span class="small muted block">{t.levels.length} livelli</span></span></div>
            {/each}
            {#each result.blocks as b (b.id)}
              <div class="item"><span class="tag line">mese</span><span class="grow">{b.theme}</span></div>
            {/each}
            {#each result.templates as t (t.id)}
              <div class="item" data-color={t.color}><span class="tag line">modello</span><span class="grow">{t.name}<span class="small muted block">{t.steps.reduce((n, s) => n + s.minutes, 0)} min</span></span><i class="pip"></i></div>
            {/each}
          </div>
          {#if existing}<p class="small muted">{existing} già presenti: verranno aggiornati.</p>{/if}
        {/if}
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <button class="btn primary wide" onclick={save} disabled={!count}>Importa {count || ''}</button>
  {/snippet}
</Sheet>

<style>
  .how {
    background: var(--sunk);
    border-color: transparent;
  }
  strong {
    font-weight: 570;
  }
  .self {
    align-self: flex-start;
  }
  .code {
    font-family: var(--mono);
    font-size: 13px;
    min-height: 160px;
    max-height: 260px;
    overflow-y: auto;
  }
  .err {
    color: var(--down);
  }
  .warn {
    color: var(--stay);
  }
  .block {
    display: block;
  }
  .tag {
    flex: none;
    width: 72px;
    justify-content: center;
  }
</style>
