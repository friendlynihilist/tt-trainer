<script>
  // Con chi ti alleni: da solo, con il robot, con un iscritto del gruppo o con qualcuno fuori
  // dall'app. Un tocco sceglie e chiude. I nomi scritti da te restano in elenco per la volta dopo.
  import Plus from '@lucide/svelte/icons/plus';
  import User from '@lucide/svelte/icons/user';
  import Bot from '@lucide/svelte/icons/bot';
  import { app } from '../store/app.svelte.js';
  import { ui } from '../store/ui.svelte.js';
  import { normalizePartner, samePartner, recentPartners } from '../engine/partner.js';
  import Sheet from '../ui/Sheet.svelte';

  let { value = null, title = 'Con chi ti alleni?', onpick } = $props();

  const mates = app.mates.filter((m) => m.name).map((m) => ({ kind: 'mate', id: m.id, name: m.name }));
  // Gli esterni: i nomi già scritti nel diario (e quello scelto ora), tolti quelli degli iscritti.
  const now = normalizePartner(value);
  const guests = [...(now?.kind === 'guest' ? [now] : []), ...recentPartners(app.events)]
    .filter((p) => !mates.some((m) => m.id === p.id || m.name.toLowerCase() === p.name.toLowerCase()))
    .filter((p, i, all) => all.findIndex((x) => x.name.toLowerCase() === p.name.toLowerCase()) === i)
    .map((p) => ({ kind: 'guest', name: p.name }))
    .slice(0, 8);

  let adding = $state(false);
  let name = $state('');
  let input = $state();

  function pick(p) {
    ui.close();
    onpick?.(p);
  }
  function add() {
    const n = name.trim();
    if (!n) return;
    const mate = mates.find((m) => m.name.toLowerCase() === n.toLowerCase());
    pick(mate ?? { kind: 'guest', name: n });
  }
  const initial = (n) => n.trim().charAt(0).toUpperCase();
</script>

<Sheet {title} onclose={() => ui.close()}>
  <div class="who">
    <button class="tile" aria-pressed={now?.kind === 'solo'} onclick={() => pick({ kind: 'solo' })}>
      <i class="av line"><User size={20} /></i><span>Da solo</span>
    </button>
    <button class="tile" aria-pressed={now?.kind === 'robot'} onclick={() => pick({ kind: 'robot' })}>
      <i class="av robot"><Bot size={20} /></i><span>Robot</span>
    </button>
    {#each mates as m (m.id)}
      <button class="tile" aria-pressed={samePartner(now, m)} onclick={() => pick(m)}>
        <i class="av">{initial(m.name)}</i><span>{m.name}</span>
      </button>
    {/each}
  </div>

  <h3 class="t-label muted">Fuori dall’app</h3>
  <div class="who">
    {#each guests as g (g.name)}
      <button class="tile" aria-pressed={samePartner(now, g)} onclick={() => pick(g)}>
        <i class="av guest">{initial(g.name)}</i><span>{g.name}</span>
      </button>
    {/each}
    {#if !adding}
      <button
        class="tile"
        onclick={() => {
          adding = true;
          setTimeout(() => input?.focus(), 60);
        }}
      >
        <i class="av line"><Plus size={20} /></i><span>Un altro</span>
      </button>
    {/if}
  </div>

  {#if adding}
    <form
      class="new"
      onsubmit={(e) => {
        e.preventDefault();
        add();
      }}
    >
      <input class="field grow" placeholder="Il suo nome" maxlength="40" bind:value={name} bind:this={input} aria-label="Nome del compagno" />
      <button class="btn accent small" type="submit" disabled={!name.trim()}>Scegli</button>
    </form>
  {/if}

  {#if value}
    {#snippet footer()}
      <button class="btn ghost wide" onclick={() => pick(null)}>Non lo indico</button>
    {/snippet}
  {/if}
</Sheet>

<style>
  .who {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
    gap: 8px;
  }
  h3 {
    margin: 18px 0 8px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-height: 84px;
    padding: 10px 4px 8px;
    border-radius: 16px;
    background: var(--sunk);
    font-size: 14px;
    font-weight: 650;
    line-height: 1.2;
    text-align: center;
  }
  .tile span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile[aria-pressed='true'] {
    background: var(--card);
    box-shadow: inset 0 0 0 2.5px var(--accent);
  }
  .av {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-on);
    font-style: normal;
    font-size: 17px;
    font-weight: 800;
  }
  .av.guest {
    background: var(--ink-2);
    color: var(--card);
  }
  .av.robot {
    border-radius: 12px;
    background: var(--fam-controllo);
    color: var(--fam-controllo-on);
  }
  .av.line {
    background: transparent;
    box-shadow: inset 0 0 0 2px var(--line-strong);
    color: var(--ink-2);
  }
  .new {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }
</style>
