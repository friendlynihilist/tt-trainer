<div class="splash" aria-label="Caricamento">
  <span class="ball"></span>
  <span class="shadow"></span>
</div>

<style>
  .splash {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0;
  }
  .ball {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent);
    animation: bounce 0.62s cubic-bezier(0.3, 0, 0.7, 1) infinite alternate;
  }
  .shadow {
    width: 22px;
    height: 3px;
    margin-top: 6px;
    border-radius: 50%;
    background: var(--line-strong);
    animation: squash 0.62s cubic-bezier(0.3, 0, 0.7, 1) infinite alternate;
  }
  @keyframes bounce {
    from {
      transform: translateY(-38px);
    }
    to {
      transform: translateY(0) scale(1.08, 0.92);
    }
  }
  @keyframes squash {
    from {
      transform: scaleX(0.5);
      opacity: 0.4;
    }
    to {
      transform: scaleX(1);
      opacity: 1;
    }
  }
</style>
