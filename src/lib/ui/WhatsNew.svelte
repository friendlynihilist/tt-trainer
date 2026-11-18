<script>
  // Le novità: compaiono una volta sola dopo un aggiornamento, oppure da Impostazioni.
  import { fade } from 'svelte/transition';
  import { cubicOut, backOut } from 'svelte/easing';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Gauge from '@lucide/svelte/icons/gauge';
  import Palette from '@lucide/svelte/icons/palette';
  import LibraryBig from '@lucide/svelte/icons/library-big';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Coffee from '@lucide/svelte/icons/coffee';
  import Swords from '@lucide/svelte/icons/swords';
  import { CHANGELOG, VERSION } from '../data/changelog.js';
  import { fmtLong } from '../util/dates.js';

  let { entries = CHANGELOG.slice(0, 1), history = false, onclose } = $props();

  const ICONS = { calendar: CalendarDays, gauge: Gauge, palette: Palette, library: LibraryBig, sparkles: Sparkles, coffee: Coffee, swords: Swords };
  const list = $derived(history ? CHANGELOG : entries);

  /** Sale e si assesta: un po' di scala, un po' di spostamento. */
  function pop(_node, { duration = 520 } = {}) {
    return {
      duration,
      css: (t) => {
        const e = backOut(t);
        return `opacity:${cubicOut(t)};transform:translateY(${(1 - e) * 28}px) scale(${0.94 + 0.06 * e})`;
      }
    };
  }

  function onkey(e) {
    if (e.key === 'Escape') onclose?.();
  }
</script>

<svelte:window onkeydown={onkey} />

<div class="scrim" transition:fade={{ duration: 220 }} onclick={onclose} role="presentation"></div>
<div class="wrap" role="dialog" aria-modal="true" aria-labelledby="wn-title">
  <div class="modal" in:pop out:fade={{ duration: 160 }}>
    <div class="scroll">
      {#each list as entry, n (entry.version)}
        <section class:older={n > 0}>
          <p class="eyebrow">
            <span class="ver mono">v{entry.version}</span>
            {#if n === 0 && entry.version === VERSION && !history}<span class="new">Novità</span>{/if}
            <span class="faint">{fmtLong(entry.date)}</span>
          </p>
          <h2 id={n === 0 ? 'wn-title' : undefined} class="title">{entry.title}</h2>
          <ul>
            {#each entry.items as item, i (i)}
              {@const Icon = ICONS[item.icon] ?? Sparkles}
              <li style:animation-delay="{180 + i * 70}ms">
                <span class="ic"><Icon size={17} /></span>
                <span>{item.text}</span>
              </li>
            {/each}
          </ul>
          {#if entry.note}<p class="note small" style:animation-delay="{180 + entry.items.length * 70}ms">{entry.note}</p>{/if}
        </section>
      {/each}
    </div>
    <footer>
      <button class="btn primary wide" onclick={onclose}>{history ? 'Chiudi' : 'Andiamo'}</button>
    </footer>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: var(--scrim);
    backdrop-filter: blur(3px);
  }
  .wrap {
    position: fixed;
    inset: 0;
    z-index: 91;
    display: grid;
    place-items: center;
    padding: 20px 16px;
    pointer-events: none;
  }
  .modal {
    pointer-events: auto;
    width: 100%;
    max-width: 420px;
    max-height: min(640px, calc(100dvh - 40px));
    display: flex;
    flex-direction: column;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 24px;
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .scroll {
    overflow-y: auto;
    padding: 26px 24px 8px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  section.older {
    padding-top: 22px;
    border-top: 1px solid var(--line);
    opacity: 0.8;
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  .ver {
    font-weight: 600;
    color: var(--ink-2);
  }
  .new {
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--accent);
    color: #15171a;
    font-weight: 650;
    font-size: 11px;
    animation: pop 0.5s var(--spring) 0.25s both;
  }
  .title {
    margin-top: 8px;
    font-size: 28px;
  }
  ul {
    list-style: none;
    margin: 18px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  li {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    font-size: 15px;
    line-height: 1.4;
    animation: rise 0.5s var(--ease-out) both;
  }
  .ic {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
  .older .ic {
    background: var(--sunk);
    color: var(--ink-2);
  }
  .note {
    margin-top: 18px;
    padding: 10px 12px;
    border-radius: var(--r-s);
    background: var(--sunk);
    color: var(--ink-2);
    animation: rise 0.5s var(--ease-out) both;
  }
  footer {
    padding: 16px 24px 22px;
  }
</style>
