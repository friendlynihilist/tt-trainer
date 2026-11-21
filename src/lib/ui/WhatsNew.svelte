<script>
  // Le novità: compaiono una volta sola dopo un aggiornamento, oppure da Impostazioni. La versione
  // più recente sta sul tavolo blu, come l'allenamento in Oggi; ogni novità ha il suo mattoncino.
  import { fade } from 'svelte/transition';
  import { cubicOut, backOut } from 'svelte/easing';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Gauge from '@lucide/svelte/icons/gauge';
  import Palette from '@lucide/svelte/icons/palette';
  import LibraryBig from '@lucide/svelte/icons/library-big';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import MedalIcon from '@lucide/svelte/icons/medal';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import Users from '@lucide/svelte/icons/users';
  import Repeat from '@lucide/svelte/icons/repeat-2';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Coffee from '@lucide/svelte/icons/coffee';
  import Swords from '@lucide/svelte/icons/swords';
  import Blocks from '@lucide/svelte/icons/blocks';
  import MapIcon from '@lucide/svelte/icons/map';
  import { CHANGELOG, VERSION } from '../data/changelog.js';
  import { fmtLong } from '../util/dates.js';

  let { entries = CHANGELOG.slice(0, 1), history = false, onclose } = $props();

  const FAMS = ['attacco', 'servizio', 'controllo', 'ricezione', 'gambe', 'taglio', 'schemi', 'palleggio'];
  const ICONS = { blocks: Blocks, map: MapIcon, calendar: CalendarDays, gauge: Gauge, palette: Palette, library: LibraryBig, sparkles: Sparkles, coffee: Coffee, swords: Swords, medal: MedalIcon, trending: TrendingUp, users: Users, swap: Repeat, pencil: Pencil };
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
          <div class="head" class:court={n === 0}>
            {#if n === 0}<span class="ball" aria-hidden="true"></span>{/if}
            <p class="eyebrow">
              <span class="ver">v{entry.version}</span>
              {#if n === 0 && entry.version === VERSION && !history}<span class="new">Novità</span>{/if}
              <span class="when">{fmtLong(entry.date)}</span>
            </p>
            <h2 id={n === 0 ? 'wn-title' : undefined} class="title">{entry.title}</h2>
          </div>
          <ul>
            {#each entry.items as item, i (i)}
              {@const Icon = ICONS[item.icon] ?? Sparkles}
              <li style:animation-delay="{180 + i * 70}ms">
                <span class="ic" data-fam={FAMS[i % FAMS.length]}><Icon size={18} strokeWidth={2.2} /></span>
                <span>{item.text}</span>
              </li>
            {/each}
          </ul>
          {#if entry.note}<p class="note small" style:animation-delay="{180 + entry.items.length * 70}ms">{entry.note}</p>{/if}
        </section>
      {/each}
    </div>
    <footer>
      <button class="btn accent wide" onclick={onclose}>{history ? 'Chiudi' : 'Andiamo'}</button>
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
    box-shadow: var(--shadow-card);
    border-radius: 24px;
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .scroll {
    overflow-y: auto;
    padding: 12px 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  section > :not(.court) {
    margin-left: 12px;
    margin-right: 12px;
  }
  /* Il tavolo visto dall'alto, come in Oggi. */
  .court {
    position: relative;
    padding: 20px 18px 18px;
    border-radius: 18px;
    background: var(--court);
    color: #fff;
    overflow: hidden;
  }
  .court::before {
    content: '';
    position: absolute;
    inset: 8px;
    border: 2px solid #fff;
    border-radius: 12px;
    opacity: 0.22;
  }
  .court::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 4px;
    translate: -50% 0;
    background: repeating-linear-gradient(#fff 0 3px, transparent 3px 6px);
    opacity: 0.3;
  }
  .court > * {
    position: relative;
    z-index: 1;
  }
  .ball {
    position: absolute !important;
    right: 22px;
    top: 22px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.2);
  }
  .when {
    opacity: 0.75;
  }
  section.older {
    padding-top: 20px;
    border-top: 1px solid var(--line);
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  .ver {
    font-weight: 700;
  }
  .new {
    padding: 2px 8px;
    border-radius: 999px;
    background: #fff;
    color: #10151d;
    font-weight: 700;
    font-size: 11px;
    animation: pop 0.5s var(--spring) 0.25s both;
  }
  .title {
    margin: 8px 0 0;
    padding-right: 34px;
    font-family: var(--sans);
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    text-wrap: balance;
  }
  .older .title {
    font-size: 20px;
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
    font-size: 15.5px;
    line-height: 1.4;
    animation: rise 0.5s var(--ease-out) both;
  }
  .ic {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 34px;
    border-radius: 11px;
    background: var(--f);
    color: var(--f-on);
    box-shadow: 0 3px 0 var(--f-edge);
  }
  .older .ic {
    background: var(--sunk);
    color: var(--ink-2);
    box-shadow: none;
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
