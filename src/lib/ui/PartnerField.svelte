<script module>
  import { app } from '../store/app.svelte.js';
  import { byTime } from '../engine/events.js';

  /** I compagni con cui ti sei allenato, il più recente prima (solo i nomi, dal tuo diario). */
  export function recentPartners(events) {
    const out = [];
    for (const e of [...events].sort(byTime).reverse()) {
      const name = e.partner?.name?.trim();
      if (name && !out.some((p) => p.name.toLowerCase() === name.toLowerCase())) out.push({ id: e.partner.id ?? null, name });
    }
    return out;
  }

  /**
   * Il compagno da proporre in una sessione nuova: l'ultimo con cui ti sei allenato, altrimenti
   * quello scelto nelle impostazioni della 0.2 (se è ancora nel gruppo).
   */
  export function lastPartner() {
    const mate = app.mates.find((m) => m.id === app.settings.partner);
    return recentPartners(app.events)[0] ?? (mate?.name ? { id: mate.id, name: mate.name } : null);
  }
</script>

<script>
  // Con chi ti sei allenato: solo un nome. Si sceglie fra i compagni del gruppo e quelli già
  // scritti nel diario, oppure se ne scrive uno nuovo. Del compagno non si mostra altro.
  import Users from '@lucide/svelte/icons/users';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { ui } from '../store/ui.svelte.js';

  let { value = null, onchange } = $props();

  function pick() {
    const mates = app.mates.map((m) => ({ id: m.id, name: m.name })).filter((m) => m.name);
    const recent = recentPartners(app.events).filter((p) => !mates.some((m) => m.name.toLowerCase() === p.name.toLowerCase()));
    const all = [...mates, ...recent];
    const key = (p) => (p.id ? `m:${p.id}` : `n:${p.name}`);
    const groups = [];
    if (mates.length) groups.push({ name: 'Il gruppo', options: mates.map((p) => ({ id: key(p), label: p.name })) });
    if (recent.length) groups.push({ name: 'Già nel diario', options: recent.map((p) => ({ id: key(p), label: p.name })) });
    ui.open('pick', {
      title: 'Con chi ti sei allenato?',
      value: value ? key(value) : null,
      clearable: true,
      groups,
      onpick: (id) => onchange?.(id ? (all.find((p) => key(p) === id) ?? null) : null),
      onadd: (name) => onchange?.({ id: null, name: name.trim() })
    });
  }
</script>

<button class="select" class:empty={!value} onclick={pick}>
  <Users size={18} />
  <span class="grow">{value?.name ?? 'Da solo, o non lo indico'}</span>
  <ChevronDown size={18} />
</button>

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
</style>
