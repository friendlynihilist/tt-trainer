<script>
  // Il marchio: una pallina che ha appena superato la rete.
  let { size = 32 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <rect width="32" height="32" rx="9" fill="var(--ink)" />
  <path d="M6 22.5h20" stroke="var(--paper)" stroke-width="1.6" stroke-linecap="round" opacity="0.9" />
  <path d="M16 22.5v-5" stroke="var(--paper)" stroke-width="1.6" stroke-linecap="round" opacity="0.9" />
  <path d="M8 18c2-6.5 6-9 10.5-8.6" stroke="var(--paper)" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="0.1 2.8" opacity="0.6" />
  <circle cx="22" cy="11.5" r="3.6" fill="var(--accent)" />
</svg>
