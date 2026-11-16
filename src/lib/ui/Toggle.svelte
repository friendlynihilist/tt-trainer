<script>
  let { checked = false, onchange, label, hint = '' } = $props();
</script>

<label class="toggle">
  <span class="grow">
    {label}
    {#if hint}<span class="small muted block">{hint}</span>{/if}
  </span>
  <input type="checkbox" {checked} onchange={(e) => onchange?.(e.currentTarget.checked)} />
  <i aria-hidden="true"></i>
</label>

<style>
  .toggle {
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
  }
  .block {
    display: block;
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  i {
    position: relative;
    flex: none;
    width: 48px;
    height: 28px;
    border-radius: 999px;
    background: var(--line-strong);
    transition: background 0.25s var(--ease);
  }
  i::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.4s var(--spring);
  }
  input:checked + i {
    background: var(--up);
  }
  input:checked + i::after {
    transform: translateX(20px);
  }
  input:focus-visible + i {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
