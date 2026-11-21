<script>
  // Il caricamento: il tavolo dell'app con la palla che rimbalza, e il nome sotto.
  import Court from '../ui/Court.svelte';
</script>

<div class="splash" role="status" aria-label="Caricamento">
  <Court small />
  <strong>Terza palla</strong>
</div>

<style>
  .splash {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: var(--paper);
  }
  strong {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
</style>
