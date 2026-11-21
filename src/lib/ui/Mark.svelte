<script>
  // Il marchio: il tavolo blu visto dall'alto, con la rete e la palla.
  let { size = 32 } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <rect width="32" height="32" rx="9" fill="var(--court)" />
  <rect x="5" y="5" width="22" height="22" rx="5" stroke="#fff" stroke-opacity="0.5" stroke-width="1.3" />
  <path d="M0 16h32" stroke="#fff" stroke-opacity="0.7" stroke-width="1.6" stroke-dasharray="1.6 1.6" />
  <circle cx="20.5" cy="11" r="5" fill="#fff" fill-opacity="0.2" />
  <circle cx="20.5" cy="11" r="3.2" fill="#fff" />
</svg>
