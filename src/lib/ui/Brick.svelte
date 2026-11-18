<script>
  // Il mattoncino di un blocco: colore pieno della famiglia, icona, nome, durata grande.
  // Con più esercizi, una fila di tacche con i colori di ognuno.
  import { FAMILY_ICON } from './design.js';

  let { fam = 'libero', name, sub = '', minutes, fams = [], onclick = null, children = null } = $props();
  const Icon = $derived(FAMILY_ICON[fam] ?? FAMILY_ICON.libero);
</script>

<svelte:element this={onclick ? 'button' : 'div'} class="brick" class:raise={onclick} data-fam={fam} {onclick} role={onclick ? undefined : 'group'}>
  <span class="ico"><Icon size={22} strokeWidth={2.4} /></span>
  <span class="txt">
    <span class="name">{name}</span>
    {#if sub}<span class="sub">{sub}</span>{/if}
    {#if fams.length > 1}
      <span class="ticks" aria-hidden="true">
        {#each fams as f, i (i)}<i data-fam={f}></i>{/each}
      </span>
    {/if}
  </span>
  <span class="min"><b class="t-num">{minutes}</b><small class="t-caps">min</small></span>
  {#if children}{@render children()}{/if}
</svelte:element>

<style>
  .brick {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 76px;
    padding: 12px 18px 12px 12px;
    border-radius: var(--r-brick);
    background: var(--f);
    color: var(--f-on);
    text-align: left;
  }
  .ico {
    display: grid;
    place-items: center;
    flex: none;
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--f-on) 16%, transparent);
  }
  .txt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .name {
    font-size: 17px;
    font-weight: 750;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }
  .sub {
    font-size: 13px;
    font-weight: 550;
    opacity: 0.85;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ticks {
    display: flex;
    gap: 4px;
    margin-top: 3px;
  }
  .ticks i {
    width: 18px;
    height: 6px;
    border-radius: 3px;
    background: var(--f);
    box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--f-on) 70%, transparent);
  }
  .min {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: none;
    line-height: 1;
  }
  .min b {
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.04em;
  }
  .min small {
    font-size: 10px;
    margin-top: 3px;
    opacity: 0.85;
  }
</style>
