<script module>
  import { app } from '../store/app.svelte.js';
  import { normalizePartner, storedPartner, lastPartnerOf } from '../engine/partner.js';

  /**
   * Il compagno da proporre: l'ultima scelta fatta in Oggi; altrimenti l'ultima scritta nel diario;
   * altrimenti quello scelto nelle impostazioni della 0.2 (se è ancora nel gruppo).
   */
  export function currentPartner() {
    const chosen = normalizePartner(app.meta?.with);
    if (chosen) return chosen.kind === 'mate' ? (app.mates.some((m) => m.id === chosen.id) ? chosen : { kind: 'guest', name: chosen.name }) : chosen;
    const mate = app.mates.find((m) => m.id === app.settings.partner);
    return lastPartnerOf(app.events) ?? (mate?.name ? { kind: 'mate', id: mate.id, name: mate.name } : null);
  }

  /** Ricorda la scelta per la prossima volta. */
  export function rememberPartner(p) {
    app.patchMeta({ with: storedPartner(p) ?? { kind: null, id: null, name: null } });
  }
</script>

<script>
  // Con chi ti alleni, in una riga: il nome (o «Da solo», «Con il robot») e un tocco per cambiare.
  // `court`: sopra il tavolo blu di Oggi.
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import User from '@lucide/svelte/icons/user';
  import Users from '@lucide/svelte/icons/users';
  import Bot from '@lucide/svelte/icons/bot';
  import { ui } from '../store/ui.svelte.js';
  import { partnerWith } from '../engine/partner.js';

  let { value = null, onchange, court = false, title = 'Con chi ti alleni?', empty = 'Con chi ti alleni?' } = $props();

  const p = $derived(normalizePartner(value));
</script>

<button class="with" class:on-court={court} class:none={!p} onclick={() => ui.open('partner', { value: p, title, onpick: (v) => onchange?.(normalizePartner(v)) })}>
  <i class="av" class:robot={p?.kind === 'robot'} class:guest={p?.kind === 'guest'} class:line={!p || p.kind === 'solo'}>
    {#if p?.kind === 'mate' || p?.kind === 'guest'}{p.name.charAt(0).toUpperCase()}{:else if p?.kind === 'robot'}<Bot size={16} />{:else if p?.kind === 'solo'}<User size={16} />{:else}<Users size={16} />{/if}
  </i>
  <span class="grow">{p ? partnerWith(p) : empty}</span>
  <ChevronDown size={18} />
</button>

<style>
  .with {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 48px;
    padding: 0 14px 0 8px;
    border-radius: 999px;
    background: var(--sunk);
    font-size: 16px;
    font-weight: 650;
    text-align: left;
  }
  .with.none {
    color: var(--ink-2);
  }
  .with :global(svg) {
    flex: none;
  }
  .av {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-on);
    font-style: normal;
    font-size: 14px;
    font-weight: 800;
  }
  .av.guest {
    background: var(--ink-2);
    color: var(--card);
  }
  .av.robot {
    border-radius: 10px;
    background: var(--fam-controllo);
    color: var(--fam-controllo-on);
  }
  .av.line {
    background: transparent;
    box-shadow: inset 0 0 0 2px var(--line-strong);
    color: var(--ink-2);
  }
  /* Sopra il tavolo blu: bianco velato, come una riga del campo. */
  .with.on-court {
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
  }
  .with.on-court .av {
    background: #fff;
    color: #10151d;
  }
  .with.on-court .av.line {
    background: transparent;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.7);
    color: #fff;
  }
</style>
