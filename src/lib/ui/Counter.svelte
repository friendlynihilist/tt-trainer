<script>
  // Un numero da contare: meno, il valore (si può anche scrivere), più.
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import { buzz } from '../store/ui.svelte.js';

  let { value = null, min = 0, max = 999, onchange, label = 'Quante', big = false } = $props();

  const clamp = (v) => Math.max(min, Math.min(max, Math.round(v)));

  function step(d) {
    buzz();
    onchange?.(clamp((value ?? 0) + d));
  }
  function typed(e) {
    const raw = e.currentTarget.value;
    onchange?.(raw === '' ? null : clamp(Number(raw)));
  }
</script>

<div class="counter" class:big>
  <button type="button" onclick={() => step(-1)} disabled={(value ?? 0) <= min} aria-label="Meno"><Minus size={big ? 24 : 18} /></button>
  <input type="number" inputmode="numeric" {min} {max} value={value ?? ''} placeholder="0" aria-label={label} oninput={typed} />
  <button type="button" onclick={() => step(1)} disabled={value != null && value >= max} aria-label="Più"><Plus size={big ? 24 : 18} /></button>
</div>

<style>
  .counter {
    display: grid;
    grid-template-columns: 52px 1fr 52px;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border-radius: 16px;
    background: var(--sunk);
  }
  .counter.big {
    grid-template-columns: 72px 1fr 72px;
  }
  button {
    display: grid;
    place-items: center;
    height: 44px;
    border-radius: 12px;
    background: var(--card);
    color: var(--ink);
    transition: transform 0.25s var(--spring);
  }
  .big button {
    height: 64px;
    border-radius: 14px;
  }
  button:active:not(:disabled) {
    transform: scale(0.92);
  }
  button:disabled {
    opacity: 0.35;
  }
  input {
    width: 100%;
    min-width: 0;
    border: 0;
    background: transparent;
    text-align: center;
    font-family: var(--mono);
    font-size: 22px;
    font-weight: 560;
    color: var(--ink);
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .big input {
    font-size: 34px;
  }
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input:focus {
    outline: none;
  }
</style>
