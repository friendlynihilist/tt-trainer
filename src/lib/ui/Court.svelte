<script>
  // Il tavolo visto dall'alto, con la palla che lo attraversa e rimbalza: è l'immagine dell'app
  // (caricamento, accesso, primo avvio). small: il riquadro piccolo della schermata di caricamento.
  let { small = false } = $props();
</script>

<div class="scene" class:small aria-hidden="true"><div class="fly"><i></i></div></div>

<style>
  .scene {
    --ball: 22px;
    position: relative;
    height: 230px;
    border-radius: 26px;
    background: var(--court);
    overflow: hidden;
    flex: none;
  }
  .scene.small {
    --ball: 14px;
    width: 132px;
    height: 132px;
    border-radius: 34px;
  }
  .scene::before {
    content: '';
    position: absolute;
    inset: 10px;
    border: 2px solid rgba(255, 255, 255, 0.5);
    border-radius: 16px;
  }
  .scene.small::before {
    inset: 12px;
    border-radius: 22px;
  }
  .scene::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 4px;
    translate: 0 -50%;
    background: repeating-linear-gradient(90deg, #fff 0 3px, transparent 3px 6px);
    opacity: 0.6;
  }
  .fly {
    position: absolute;
    left: 14%;
    top: 16%;
    width: 72%;
    height: 68%;
    animation: fly-y 2.4s linear infinite alternate;
  }
  .small .fly {
    left: 22%;
    top: 22%;
    width: 56%;
    height: 56%;
    animation-duration: 1.3s;
  }
  .fly i {
    position: absolute;
    left: 0;
    top: 0;
    width: var(--ball);
    height: var(--ball);
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 calc(var(--ball) / 3) rgba(255, 255, 255, 0.2);
    animation: fly-x 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite alternate;
  }
  .small .fly i {
    animation-duration: 0.65s;
  }
  @keyframes fly-y {
    to {
      transform: translateY(100%);
    }
  }
  @keyframes fly-x {
    to {
      left: calc(100% - var(--ball));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .fly,
    .fly i {
      animation: none;
    }
  }
</style>
