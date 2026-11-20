<script>
  // Le icone delle famiglie, disegnate apposta (non le icone generiche di Lucide, che confondevano:
  // l'aereo di carta per il servizio, il fulmine per l'attacco). Partono dalla racchetta degli scudi
  // delle medaglie e aggiungono un dettaglio che dice il colpo:
  //   servizio    la palla lanciata in alto sopra la racchetta
  //   ricezione   la palla che arriva verso la racchetta
  //   palleggio   due racchette e la palla che va e viene
  //   attacco     la palla che parte veloce, con le linee di velocità
  //   controllo   la racchetta ferma, dritta, e la palla che torna indietro
  //   taglio      la racchetta aperta sotto la palla, con la rotazione all'indietro
  //   gambe       due impronte di passo
  //   schemi      il percorso del punto, tratteggiato, fino alla palla
  // Tutto in currentColor: il colore lo decide chi usa l'icona.
  let { fam = 'libero', size = 24, label = null } = $props();
</script>

{#snippet paddle(x, y, r = 42, k = 0.36)}
  <g transform="translate({x} {y}) rotate({r}) scale({k})">
    <path d="M 0,-36 C 16,-36 24,-24 24,-9 C 24,2 17,9 10,13 C 7.5,14.5 6.5,15.5 6,17 H -6 C -6.5,15.5 -7.5,14.5 -10,13 C -17,9 -24,2 -24,-9 C -24,-24 -16,-36 0,-36 Z" />
    <path d="M -5.8,20 H 5.8 L 5.3,27 C 5.3,31 7.2,35 7.8,38.5 C 8,40 6.8,41.5 5.2,41.5 H -5.2 C -6.8,41.5 -8,40 -7.8,38.5 C -7.2,35 -5.3,31 -5.3,27 Z" />
  </g>
{/snippet}

<svg
  viewBox="0 0 48 48"
  width={size}
  height={size}
  fill="currentColor"
  stroke="currentColor"
  stroke-width="0"
  role={label ? 'img' : undefined}
  aria-label={label ?? undefined}
  aria-hidden={label ? undefined : 'true'}
>
  {#if fam === 'servizio'}
    {@render paddle(28, 32, 30)}
    <circle cx="14" cy="9" r="4" />
    <path d="M14 16 V 30" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 5.5" />
  {:else if fam === 'ricezione'}
    {@render paddle(31, 26, 35)}
    <circle cx="8" cy="10" r="4" />
    <path d="M10 17 Q 12 26 19 26" fill="none" stroke-width="2.6" stroke-linecap="round" />
    <path d="M15.5 22.5 L 19.5 26 L 15 28.5" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
  {:else if fam === 'palleggio'}
    {@render paddle(12, 30, -30, 0.3)}
    {@render paddle(36, 30, 30, 0.3)}
    <circle cx="24" cy="10" r="3.6" />
    <path d="M13 17 Q 24 2 35 17" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 5" />
  {:else if fam === 'attacco'}
    {@render paddle(16, 30, -40)}
    <circle cx="37" cy="11" r="4.2" />
    <path d="M24 12 H 30 M 22 18 H 29 M 26 6 H 31" fill="none" stroke-width="2.6" stroke-linecap="round" />
  {:else if fam === 'controllo'}
    {@render paddle(32, 23, 0, 0.38)}
    <circle cx="9" cy="14" r="4" />
    <path d="M18 24 H 8 M 12 20 L 8 24 L 12 28" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
  {:else if fam === 'taglio'}
    {@render paddle(20, 34, -75)}
    <circle cx="27" cy="12" r="4.4" />
    <path d="M36 9 A 9.5 9.5 0 1 1 20 19" fill="none" stroke-width="2.4" stroke-linecap="round" />
    <path d="M20 14.5 L 20 19.3 L 24.6 19.6" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
  {:else if fam === 'gambe'}
    <path d="M14 6 C 19 6 21 11 20.5 17 C 20 22 18 25 14.5 25 C 11 25 9 22 8.8 17 C 8.5 11 10 6 14 6 Z" />
    <rect x="9.6" y="27.5" width="9.6" height="6.5" rx="3.2" />
    <path d="M33 14 C 38 14 40 19 39.5 25 C 39 30 37 33 33.5 33 C 30 33 28 30 27.8 25 C 27.5 19 29 14 33 14 Z" />
    <rect x="28.6" y="35.5" width="9.6" height="6.5" rx="3.2" />
  {:else if fam === 'schemi'}
    <circle cx="9" cy="38" r="3.4" />
    <circle cx="38" cy="10" r="4.2" />
    <path d="M12 35 C 22 33 12 22 22 20 C 30 18.5 30 14 33.5 12" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 5.2" />
    <path d="M30 31 L 36 37 M 36 31 L 30 37" fill="none" stroke-width="2.6" stroke-linecap="round" />
  {:else}
    {@render paddle(24, 26, 35)}
    <circle cx="11" cy="11" r="4" />
  {/if}
</svg>
